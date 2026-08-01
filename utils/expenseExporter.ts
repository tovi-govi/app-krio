import { Platform } from "react-native";
import ExcelJS from "exceljs";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Expense } from "@/context/CartContext";

export type ExportExpenseSummary = {
  totalExpenses: number;
  totalEntries: number;
  averageExpense: number;
  periodLabel: string;
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
 * Download helper for Web browser runtimes.
 */
function downloadBlobWeb(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Formats a currency amount into INR (₹)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Exports expenses to Excel (.xlsx) file.
 */
export async function exportExpensesToExcel(
  expenses: Expense[],
  summary: ExportExpenseSummary
): Promise<void> {
  if (!expenses || expenses.length === 0) {
    throw new Error("No expenses to export.");
  }

  const fileName = `Krio_Expenses_${Date.now()}.xlsx`;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Krio-H2O Admin System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Expenses Report", {
    views: [{ state: "frozen", ySplit: 6 }],
  });

  const DARK_BLUE_HEX = "0F2D6B";
  const LIGHT_BLUE_HEX = "F0F4FA";

  // Title Row
  worksheet.mergeCells("A1:G1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "Krio-H₂O Business Expenses Report";
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${DARK_BLUE_HEX}` } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };

  // Subtitle / Period
  worksheet.mergeCells("A2:G2");
  const subCell = worksheet.getCell("A2");
  subCell.value = `Period: ${summary.periodLabel} | Generated: ${new Date().toLocaleDateString("en-IN")}`;
  subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF555555" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };

  // Summary Row
  worksheet.mergeCells("A4:B4");
  worksheet.getCell("A4").value = `Total Expenses: ${formatINR(summary.totalExpenses)}`;
  worksheet.getCell("A4").font = { bold: true };

  worksheet.mergeCells("C4:D4");
  worksheet.getCell("C4").value = `Total Entries: ${summary.totalEntries}`;
  worksheet.getCell("C4").font = { bold: true };

  worksheet.mergeCells("E4:G4");
  worksheet.getCell("E4").value = `Average Expense: ${formatINR(summary.averageExpense)}`;
  worksheet.getCell("E4").font = { bold: true };

  // Table Headers
  const headers = ["Date", "Expense Name", "Category", "Amount (₹)", "Payment Method", "Added By", "Notes"];
  const headerRow = worksheet.getRow(6);
  headerRow.values = headers;
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${DARK_BLUE_HEX}` } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Data Rows
  expenses.forEach((item, index) => {
    const row = worksheet.addRow([
      item.expenseDate,
      item.expenseName,
      item.categoryName,
      item.amount,
      item.paymentMethod,
      item.createdBy,
      item.description || "-",
    ]);

    row.height = 20;
    const isEven = index % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFFFFFFF" : `FF${LIGHT_BLUE_HEX}` },
      };

      if (colNumber === 4) {
        cell.numFmt = "₹#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if (colNumber === 1) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });
  });

  // Set Column Widths
  worksheet.columns = [
    { width: 14 }, // Date
    { width: 26 }, // Name
    { width: 22 }, // Category
    { width: 16 }, // Amount
    { width: 18 }, // Payment Method
    { width: 20 }, // Added By
    { width: 30 }, // Notes
  ];

  const buffer = await workbook.xlsx.writeBuffer();

  if (Platform.OS === "web") {
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    downloadBlobWeb(blob, fileName);
  } else {
    const base64Data = arrayBufferToBase64(buffer);
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Export Expenses Excel",
      });
    }
  }
}

/**
 * Exports expenses to PDF document.
 */
export async function exportExpensesToPDF(
  expenses: Expense[],
  summary: ExportExpenseSummary
): Promise<void> {
  if (!expenses || expenses.length === 0) {
    throw new Error("No expenses to export.");
  }

  const rowsHTML = expenses
    .map(
      (item, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.expenseDate}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${item.expenseName}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #475569;">${item.categoryName}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f2d6b;">${formatINR(item.amount)}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.paymentMethod}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${item.createdBy}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 11px;">${item.description || "-"}</td>
    </tr>
  `
    )
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Krio-H2O Expenses Report</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f2d6b; padding-bottom: 12px; margin-bottom: 20px; }
          .brand { font-size: 24px; font-weight: 800; color: #0f2d6b; margin: 0; }
          .brand span { color: #0284c7; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .kpi-container { display: flex; gap: 12px; margin-bottom: 24px; }
          .kpi-card { flex: 1; background: #f0f4fa; border-radius: 8px; padding: 12px; border: 1px solid #cbd5e1; }
          .kpi-title { font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; }
          .kpi-value { font-size: 18px; font-weight: 800; color: #0f2d6b; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th { background-color: #0f2d6b; color: #ffffff; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="brand">Krio-H<span>₂</span>O</h1>
            <div class="subtitle">Business Expenses Report</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div><strong>Period:</strong> ${summary.periodLabel}</div>
            <div><strong>Generated:</strong> ${new Date().toLocaleString("en-IN")}</div>
          </div>
        </div>

        <div class="kpi-container">
          <div class="kpi-card">
            <div class="kpi-title">Total Expenses</div>
            <div class="kpi-value">${formatINR(summary.totalExpenses)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Total Entries</div>
            <div class="kpi-value">${summary.totalEntries}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Average Expense</div>
            <div class="kpi-value">${formatINR(summary.averageExpense)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: center;">Date</th>
              <th>Expense Name</th>
              <th>Category</th>
              <th style="text-align: right;">Amount</th>
              <th style="text-align: center;">Payment Method</th>
              <th>Added By</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>

        <div class="footer">
          Generated automatically by Krio-H₂O Management System
        </div>
      </body>
    </html>
  `;

  if (Platform.OS === "web") {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  } else {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Export Expenses PDF",
      });
    }
  }
}
