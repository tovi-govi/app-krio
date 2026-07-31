import { DeliveryRecord, Organization, Product, getOrganizationProductPrice } from "@/context/CartContext";

export type OrganizationInvoiceRow = {
  organizationId?: string;
  organizationName: string;
  cansDelivered: number;
  emptyCansPickedUp: number;
  cases200ml: number;
  cases500ml: number;
  cases1l: number;
  amount: number;
};

export type InvoiceAggregationParams = {
  deliveries: DeliveryRecord[];
  month: number; // 1-12
  year: number; // e.g. 2026
  organizationId?: string; // "ALL" or specific org ID
  organizations?: Organization[];
  products?: Product[];
};

export type InvoiceAggregationResult = {
  month: number;
  monthName: string;
  year: number;
  selectedOrgId: string;
  rows: OrganizationInvoiceRow[];
  totalCansDelivered: number;
  totalEmptyCansPickedUp: number;
  totalCases200ml: number;
  totalCases500ml: number;
  totalCases1l: number;
  totalAmount: number;
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
 * Standard default fallback unit prices (per bottle / per can):
 * 20L Can: ₹90 (1 unit)
 * 200ml Bottle: ₹10 (35 bottles per pack = ₹350)
 * 500ml Bottle: ₹20 (24 bottles per case = ₹480)
 * 1L Bottle: ₹30 (12 bottles per case = ₹360)
 */
const DEFAULT_CAN_20L_PRICE = 90;
const DEFAULT_200ML_PRICE = 10;
const DEFAULT_500ML_PRICE = 20;
const DEFAULT_1L_PRICE = 30;

export function calculateDeliveryRowAmount(
  cans: number,
  c200: number,
  c500: number,
  c1l: number,
  org?: Organization | null,
  products?: Product[]
): number {
  const safeCans = Math.max(0, Number(cans) || 0);
  const safeC200 = Math.max(0, Number(c200) || 0);
  const safeC500 = Math.max(0, Number(c500) || 0);
  const safeC1l = Math.max(0, Number(c1l) || 0);

  // Retrieve organization product prices or default fallback prices
  const p20lProd = products?.find((p) => p.id === "20l" || p.size.toLowerCase().includes("20l"));
  const p200Prod = products?.find((p) => p.id === "200ml" || p.size.toLowerCase().includes("200ml"));
  const p500Prod = products?.find((p) => p.id === "500ml" || p.size.toLowerCase().includes("500ml"));
  const p1lProd = products?.find((p) => p.id === "1l" || p.size.toLowerCase().includes("1l") || p.size.toLowerCase().includes("litre"));

  const p20lPrice = getOrganizationProductPrice(org, p20lProd || "20l", DEFAULT_CAN_20L_PRICE);
  const p200Price = getOrganizationProductPrice(org, p200Prod || "200ml", DEFAULT_200ML_PRICE);
  const p500Price = getOrganizationProductPrice(org, p500Prod || "500ml", DEFAULT_500ML_PRICE);
  const p1lPrice = getOrganizationProductPrice(org, p1lProd || "1l", DEFAULT_1L_PRICE);

  const canAmount = safeCans * p20lPrice;
  const c200Amount = safeC200 * (35 * p200Price); // 35 bottles per pack
  const c500Amount = safeC500 * (24 * p500Price); // 24 bottles per case
  const c1lAmount = safeC1l * (12 * p1lPrice);    // 12 bottles per case

  return canAmount + c200Amount + c500Amount + c1lAmount;
}

/**
 * Filters delivery records by month, year, and optional organization,
 * then aggregates totals per organization using organization-specific product prices.
 */
export function aggregateMonthlyDeliveries(
  params: InvoiceAggregationParams
): InvoiceAggregationResult {
  const { deliveries, month, year, organizationId, organizations, products } = params;
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

  // Helper map to find organization by ID or Name
  const findOrgForDelivery = (d: DeliveryRecord): Organization | undefined => {
    if (!organizations || organizations.length === 0) return undefined;
    if (d.organizationId) {
      const match = organizations.find((o) => o.id === d.organizationId);
      if (match) return match;
    }
    if (d.organizationName) {
      const matchName = d.organizationName.trim().toLowerCase();
      return organizations.find((o) => o.name.trim().toLowerCase() === matchName);
    }
    return undefined;
  };

  // 2. Group by Organization Name
  const orgMap = new Map<string, OrganizationInvoiceRow>();

  for (const delivery of filteredDeliveries) {
    const orgName = delivery.organizationName.trim() || "General Delivery";
    const existing = orgMap.get(orgName);

    const fullCans = Number(delivery.fullCansLoaded) || 0;
    const emptyCans = Number(delivery.emptyCansReturned) || 0;
    const c200 = Number(delivery.cases200mlDelivered) || 0;
    const c500 = Number(delivery.cases500mlDelivered) || 0;
    const c1l = Number(delivery.cases1lDelivered) || 0;

    const org = findOrgForDelivery(delivery);

    if (existing) {
      existing.cansDelivered += fullCans;
      existing.emptyCansPickedUp += emptyCans;
      existing.cases200ml += c200;
      existing.cases500ml += c500;
      existing.cases1l += c1l;
      existing.amount = calculateDeliveryRowAmount(
        existing.cansDelivered,
        existing.cases200ml,
        existing.cases500ml,
        existing.cases1l,
        org,
        products
      );
    } else {
      orgMap.set(orgName, {
        organizationId: delivery.organizationId,
        organizationName: orgName,
        cansDelivered: fullCans,
        emptyCansPickedUp: emptyCans,
        cases200ml: c200,
        cases500ml: c500,
        cases1l: c1l,
        amount: calculateDeliveryRowAmount(fullCans, c200, c500, c1l, org, products),
      });
    }
  }

  const rows = Array.from(orgMap.values()).sort((a, b) =>
    a.organizationName.localeCompare(b.organizationName)
  );

  const totalCansDelivered = rows.reduce((sum, row) => sum + row.cansDelivered, 0);
  const totalEmptyCansPickedUp = rows.reduce((sum, row) => sum + row.emptyCansPickedUp, 0);
  const totalCases200ml = rows.reduce((sum, row) => sum + row.cases200ml, 0);
  const totalCases500ml = rows.reduce((sum, row) => sum + row.cases500ml, 0);
  const totalCases1l = rows.reduce((sum, row) => sum + row.cases1l, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);

  return {
    month,
    monthName,
    year,
    selectedOrgId: targetOrgId,
    rows,
    totalCansDelivered,
    totalEmptyCansPickedUp,
    totalCases200ml,
    totalCases500ml,
    totalCases1l,
    totalAmount,
    hasData: rows.length > 0,
  };
}
