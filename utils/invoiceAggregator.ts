import { DeliveryRecord } from "@/context/CartContext";

export type OrganizationInvoiceRow = {
  organizationId?: string;
  organizationName: string;
  cansDelivered: number;
  emptyCansPickedUp: number;
  amount: number;
};

export type InvoiceAggregationParams = {
  deliveries: DeliveryRecord[];
  month: number; // 1-12
  year: number; // e.g. 2026
  organizationId?: string; // "ALL" or specific org ID
};

export type InvoiceAggregationResult = {
  month: number;
  monthName: string;
  year: number;
  selectedOrgId: string;
  rows: OrganizationInvoiceRow[];
  totalCansDelivered: number;
  totalEmptyCansPickedUp: number;
  hasData: boolean;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function getMonthName(monthNumber: number): string {
  if (monthNumber < 1 || monthNumber > 12) return "January";
  return MONTH_NAMES[monthNumber - 1];
}

/**
 * Filters delivery records by month, year, and optional organization,
 * then aggregates totals per organization.
 */
export function aggregateMonthlyDeliveries(
  params: InvoiceAggregationParams
): InvoiceAggregationResult {
  const { deliveries, month, year, organizationId } = params;
  const monthName = getMonthName(month);
  const targetOrgId = organizationId || "ALL";

  // 1. Filter deliveries matching selected month, year, and organization
  const filteredDeliveries = deliveries.filter((delivery) => {
    if (!delivery.createdAt) return false;
    const date = new Date(delivery.createdAt);
    if (isNaN(date.getTime())) return false;

    const deliveryMonth = date.getMonth() + 1; // 1-indexed
    const deliveryYear = date.getFullYear();

    const matchesDate = deliveryMonth === month && deliveryYear === year;
    if (!matchesDate) return false;

    if (targetOrgId !== "ALL" && targetOrgId !== "") {
      const matchesOrgId = delivery.organizationId === targetOrgId;
      const matchesOrgName = delivery.organizationName === targetOrgId;
      return matchesOrgId || matchesOrgName;
    }

    return true;
  });

  // 2. Group by Organization Name
  const orgMap = new Map<string, OrganizationInvoiceRow>();

  for (const delivery of filteredDeliveries) {
    const orgName = delivery.organizationName.trim() || "General Delivery";
    const existing = orgMap.get(orgName);

    const fullCans = Number(delivery.fullCansLoaded) || 0;
    const emptyCans = Number(delivery.emptyCansReturned) || 0;

    if (existing) {
      existing.cansDelivered += fullCans;
      existing.emptyCansPickedUp += emptyCans;
    } else {
      orgMap.set(orgName, {
        organizationId: delivery.organizationId,
        organizationName: orgName,
        cansDelivered: fullCans,
        emptyCansPickedUp: emptyCans,
        amount: 0,
      });
    }
  }

  const rows = Array.from(orgMap.values()).sort((a, b) =>
    a.organizationName.localeCompare(b.organizationName)
  );

  const totalCansDelivered = rows.reduce((sum, row) => sum + row.cansDelivered, 0);
  const totalEmptyCansPickedUp = rows.reduce((sum, row) => sum + row.emptyCansPickedUp, 0);

  return {
    month,
    monthName,
    year,
    selectedOrgId: targetOrgId,
    rows,
    totalCansDelivered,
    totalEmptyCansPickedUp,
    hasData: rows.length > 0,
  };
}
