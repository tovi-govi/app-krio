import { Platform } from "react-native";
import ExcelJS from "exceljs";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";
import { InvoiceAggregationResult } from "./invoiceAggregator";

export type DownloadInvoiceOptions = {
  result: InvoiceAggregationResult;
  organizationNameFilter?: string;
  recipientEmail?: string;
};

/**
 * Converts an ArrayBuffer to a Base64 string safely across JS runtimes.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  if (typeof globalThis !== "undefined" && typeof (globalThis as any).btoa === "function") {
    return (globalThis as any).btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

/**
 * Generates an ExcelJS workbook buffer and writes it to cache storage, returning the file URI.
 */
async function generateAndSaveExcelBuffer(options: DownloadInvoiceOptions): Promise<{ buffer: ArrayBuffer; fileUri: string; fileName: string }> {
  const { result, organizationNameFilter } = options;
  const { monthName, year, rows, totalCansDelivered, totalEmptyCansPickedUp, totalAmount, hasData } = result;

  if (!hasData || !rows || rows.length === 0) {
    console.warn(`[ExcelExport] Export aborted: No data found for ${monthName} ${year}`);
    throw new Error(`No delivery records found for ${monthName} ${year}. Cannot export an empty spreadsheet.`);
  }

  const fileName = `Invoices_${monthName}_${year}.xlsx`;
  console.log(`[ExcelExport] Generating workbook for ${rows.length} record(s) -> ${fileName}`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Krio-H2O Admin System";
  workbook.lastModifiedBy = "Krio-H2O Admin System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Monthly Invoice", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const DARK_BLUE_HEX = "0F2D6B";
  const WHITE_HEX = "FFFFFF";
  const ZEBRA_LIGHT_BG = "F4F7FC";
  const TOTALS_BG = "E5E9F0";
  const BORDER_GRAY = "D3D3D3";

  // Title Block
  worksheet.mergeCells("A1:G2");
  const titleCell = worksheet.getCell("A1");
  const orgSubtitle = organizationNameFilter && organizationNameFilter !== "ALL"
    ? `\nOrganization: ${organizationNameFilter}`
    : "";

  titleCell.value = `MONTHLY DELIVERY REPORT\n${monthName.toUpperCase()} ${year}${orgSubtitle}`;
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: WHITE_HEX } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_BLUE_HEX } };
  titleCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  worksheet.getRow(3).height = 10;

  // Header Row
  const headerRow = worksheet.getRow(4);
  headerRow.height = 28;
  headerRow.values = [
    "Organization Name",
    "20L Cans",
    "Empty 20L",
    "200ml Packs",
    "500ml Cases",
    "1L Cases",
    "Amount (₹)",
  ];
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE_HEX } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_BLUE_HEX } };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER_GRAY } },
      left: { style: "thin", color: { argb: BORDER_GRAY } },
      bottom: { style: "medium", color: { argb: DARK_BLUE_HEX } },
      right: { style: "thin", color: { argb: BORDER_GRAY } },
    };
    if (colNumber === 1) cell.alignment = { vertical: "middle", horizontal: "left" };
    else if (colNumber >= 2 && colNumber <= 6) cell.alignment = { vertical: "middle", horizontal: "right" };
    else cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  let currentRowIndex = 5;
  const sortedRows = [...rows].sort((a, b) => a.organizationName.localeCompare(b.organizationName));

  sortedRows.forEach((row, index) => {
    const dataRow = worksheet.getRow(currentRowIndex);
    dataRow.height = 22;
    dataRow.values = [
      row.organizationName || "Unknown Organization",
      row.cansDelivered || 0,
      row.emptyCansPickedUp || 0,
      row.cases200ml || 0,
      row.cases500ml || 0,
      row.cases1l || 0,
      row.amount ? row.amount : 0,
    ];

    const isEven = index % 2 === 0;
    const rowBgColor = isEven ? ZEBRA_LIGHT_BG : WHITE_HEX;

    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Calibri", size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColor } };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER_GRAY } },
        left: { style: "thin", color: { argb: BORDER_GRAY } },
        bottom: { style: "thin", color: { argb: BORDER_GRAY } },
        right: { style: "thin", color: { argb: BORDER_GRAY } },
      };
      if (colNumber === 1) cell.alignment = { vertical: "middle", horizontal: "left" };
      else if (colNumber >= 2 && colNumber <= 7) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = colNumber === 7 ? "₹#,##0" : "#,##0";
      } else cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    currentRowIndex++;
  });

  // Totals Row
  const totalsRow = worksheet.getRow(currentRowIndex);
  totalsRow.height = 26;
  totalsRow.values = [
    "TOTAL",
    totalCansDelivered,
    totalEmptyCansPickedUp,
    result.totalCases200ml || 0,
    result.totalCases500ml || 0,
    result.totalCases1l || 0,
    totalAmount || 0,
  ];
  totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: DARK_BLUE_HEX } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTALS_BG } };
    cell.border = {
      top: { style: "thin", color: { argb: DARK_BLUE_HEX } },
      left: { style: "thin", color: { argb: BORDER_GRAY } },
      bottom: { style: "double", color: { argb: DARK_BLUE_HEX } },
      right: { style: "thin", color: { argb: BORDER_GRAY } },
    };
    if (colNumber === 1) cell.alignment = { vertical: "middle", horizontal: "left" };
    else if (colNumber >= 2 && colNumber <= 7) {
      cell.alignment = { vertical: "middle", horizontal: "right" };
      cell.numFmt = colNumber === 7 ? "₹#,##0" : "#,##0";
    } else cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  worksheet.columns.forEach((column, colIndex) => {
    let maxLength = 15;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellValue = cell.value ? cell.value.toString() : "";
      if (cellValue.length > maxLength) maxLength = cellValue.length;
    });

    if (colIndex === 0) column.width = Math.max(maxLength + 4, 25);
    else if (colIndex === 1) column.width = Math.max(maxLength + 4, 15);
    else if (colIndex === 2) column.width = Math.max(maxLength + 4, 15);
    else if (colIndex >= 3 && colIndex <= 5) column.width = Math.max(maxLength + 4, 16);
    else column.width = Math.max(maxLength + 4, 15);
  });

  const rawBuffer = await workbook.xlsx.writeBuffer();
  const buffer = rawBuffer as ArrayBuffer;

  if (Platform.OS === "web") {
    return { buffer, fileUri: "", fileName };
  }

  const base64 = arrayBufferToBase64(buffer);
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { buffer, fileUri, fileName };
}

/**
 * Generates and downloads the Excel file locally.
 */
export async function generateAndDownloadExcelInvoice(options: DownloadInvoiceOptions): Promise<string> {
  const { buffer, fileUri, fileName } = await generateAndSaveExcelBuffer(options);

  if (Platform.OS === "web" && typeof document !== "undefined") {
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return fileName;
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: `Export ${fileName}`,
      UTI: "com.microsoft.excel.xlsx",
    });
  }

  return fileUri;
}

/**
 * Generates the Excel file and emails it to the registered user's email address using MailComposer / Sharing.
 */
export async function emailExcelInvoice(options: DownloadInvoiceOptions): Promise<void> {
  const { result, recipientEmail } = options;
  const { monthName, year, totalCansDelivered, totalEmptyCansPickedUp } = result;

  const { fileUri, fileName } = await generateAndSaveExcelBuffer(options);

  const isMailAvailable = await MailComposer.isAvailableAsync();
  if (isMailAvailable) {
    console.log(`[ExcelExport] Emailing ${fileName} to ${recipientEmail || "registered email"}...`);
    await MailComposer.composeAsync({
      recipients: recipientEmail ? [recipientEmail] : [],
      subject: `Krio H2O: Monthly Excel Invoice Report - ${monthName} ${year}`,
      body: `Hello,\n\nPlease find attached the monthly Excel invoice report (.xlsx) for ${monthName} ${year}.\n\nReport Summary:\n• Month: ${monthName} ${year}\n• Total Cans Delivered: ${totalCansDelivered}\n• Total Empty Cans Picked Up: ${totalEmptyCansPickedUp}\n\nBest regards,\nKrio H2O Management System`,
      attachments: Platform.OS !== "web" ? [fileUri] : [],
    });
  } else {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: `Email ${fileName} to ${recipientEmail || "Registered Email"}`,
        UTI: "com.microsoft.excel.xlsx",
      });
    }
  }
}
