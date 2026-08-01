import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/services/firebase";

export type Product = {
  id: string;
  size: string;
  use: string;
  emoji: string;
  price: number;
  stock: number;
  isActive: boolean;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CartItem = Product & { quantity: number };

export type DeliveryAddress = {
  mapLabel: string;
  latitude?: number;
  longitude?: number;
  houseNo: string;
  landmark?: string;
  label: "Home" | "Work" | "Other";
};

export type OrganizationLocation = {
  latitude: number;
  longitude: number;
  address: string;
  placeId?: string;
};

export type Organization = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstNumber?: string;
  location?: OrganizationLocation | null;
  pricing?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
};

export type Order = {
  id: string;
  items: CartItem[];
  total: number;
  customer: {
    name: string;
    phone: string;
    address: DeliveryAddress;
  };
  organizationId?: string;
  organizationName?: string;
  fullCansLoaded?: number;
  emptyCansReturned?: number;
  deliveredBy?: string;
  status: "Confirmed" | "Pending Payment" | "Order Sent" | "Delivered" | "Cancelled";
  paymentMethod: string;
  paymentStatus?: "Pending Verification" | "Verified" | "Rejected";
  utr?: string;
  createdAt: string;
  updatedAt?: string;
};

export type AdminNotification = {
  id: string;
  orderId: string;
  title: string;
  message: string;
  customerName: string;
  customerPhone: string;
  total: number;
  read: boolean;
  type: "NEW_ORDER" | "ORDER_STATUS";
  createdAt: string;
};

export type Plant = {
  id: string;
  name: string;
  location: string;
  inventory?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
};

export type DeliverySchedule = {
  id: string;
  organizationId: string;
  organizationName: string;
  scheduledDate: string; // "YYYY-MM-DD"
  notes?: string;
  status: "Pending" | "Completed";
  order: number;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt?: string;
};

export type DeliveryRecord = {
  id: string;
  organizationId?: string;
  organizationName: string;
  plantId?: string;
  plantName?: string;
  plantLocation?: string;
  fullCansLoaded: number;
  emptyCansReturned: number;
  cases200mlDelivered?: number;
  cases500mlDelivered?: number;
  cases1lDelivered?: number;
  deliveredBy: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  editedAt?: string;
  editedBy?: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  isCustom?: boolean;
  createdAt?: string;
};

export type Expense = {
  id: string;
  expenseName: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  expenseDate: string;
  paymentMethod: "Cash" | "Bank Transfer" | "UPI" | "Credit Card" | "Debit Card" | "Other";
  description?: string;
  receiptUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
};

const CART_KEY = "krio_cart";
const ORDERS_KEY = "krio_orders";
const PRODUCTS_KEY = "krio_products";
const ORGANIZATIONS_KEY = "krio_organizations";
const NOTIFICATIONS_KEY = "krio_admin_notifications";
const DELIVERIES_KEY = "krio_deliveries";
const SCHEDULES_KEY = "krio_delivery_schedules";
const PLANTS_KEY = "krio_plants";
const EXPENSES_KEY = "krio_expenses";
const EXPENSE_CATEGORIES_KEY = "krio_expense_categories";

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "rent", name: "Rent", isCustom: false },
  { id: "salary", name: "Salary/Salary Advance", isCustom: false },
  { id: "water-can-caps", name: "Water can caps", isCustom: false },
  { id: "diesel", name: "Diesel", isCustom: false },
  { id: "digital-marketing", name: "Digital Marketing", isCustom: false },
  { id: "wifi-bills", name: "Wifi Bills", isCustom: false },
  { id: "road-tax", name: "Road Tax", isCustom: false },
];

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "200ml", size: "200 ml Bottle", use: "On-the-go sip", emoji: "🧴", price: 10, stock: 0, isActive: true },
  { id: "500ml", size: "500 ml Bottle", use: "Everyday carry", emoji: "🍶", price: 20, stock: 0, isActive: true },
  { id: "1l", size: "1 Litre Bottle", use: "Desk & travel", emoji: "🫙", price: 30, stock: 0, isActive: true },
  { id: "20l", size: "20 L Can", use: "Home & office dispenser", emoji: "🪣", price: 90, stock: 0, isActive: true },
];

export const DEFAULT_PLANTS: Plant[] = [
  {
    id: "plant-main",
    name: "Main Processing Plant",
    location: "Industrial Zone, Block A",
    inventory: {
      "200ml": 0,
      "500ml": 0,
      "1l": 0,
      "20l": 0,
    },
  },
];

type CartContextValue = {
  products: Product[];
  orders: Order[];
  deliveries: DeliveryRecord[];
  deliverySchedules: DeliverySchedule[];
  organizations: Organization[];
  plants: Plant[];
  firebaseReady: boolean;
  addOrder: (order: Order) => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  saveOrganization: (organization: Organization) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  savePlant: (plant: Plant) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;
  updatePlantInventory: (plantId: string, inventory: Record<string, number>) => Promise<void>;
  addDeliveryRecord: (delivery: DeliveryRecord) => Promise<void>;
  updateDeliveryRecord: (deliveryId: string, updatedData: Partial<DeliveryRecord>, editedBy: string) => Promise<void>;
  addOrUpdateSchedule: (data: Partial<DeliverySchedule> & { organizationId: string; organizationName: string; scheduledDate: string }) => Promise<string>;
  rescheduleOrganization: (scheduleId: string, newDate: string, newOrder?: number) => Promise<void>;
  deleteSchedule: (scheduleId: string) => Promise<void>;
  markScheduleCompleted: (scheduleId: string, completedBy: string) => Promise<void>;
  adminNotifications: AdminNotification[];
  markAdminNotificationRead: (id: string) => Promise<void>;
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  addExpense: (expense: Omit<Expense, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addExpenseCategory: (categoryName: string) => Promise<ExpenseCategory>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const firebaseReady = isFirebaseConfigured && !!db;

function normalizeProduct(id: string, data: any): Product {
  return {
    id,
    size: String(data.size ?? ""),
    use: String(data.use ?? ""),
    emoji: String(data.emoji ?? "💧"),
    price: Number(data.price ?? 0),
    stock: Math.max(0, Number(data.stock ?? 0)),
    isActive: Boolean(data.isActive ?? true),
    imageUrl: data.imageUrl || undefined,
  };
}

function normalizeOrder(id: string, data: any): Order {
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw.toISOString()
      : createdAtRaw && typeof createdAtRaw.toMillis === "function"
        ? new Date(createdAtRaw.toMillis()).toISOString()
        : String(createdAtRaw ?? new Date().toISOString());

  const addressData = data.customer?.address ?? {};
  const customer = {
    name: String(data.customer?.name ?? ""),
    phone: String(data.customer?.phone ?? ""),
    address: {
      mapLabel: String(addressData.mapLabel ?? ""),
      latitude: typeof addressData.latitude === "number" ? addressData.latitude : undefined,
      longitude: typeof addressData.longitude === "number" ? addressData.longitude : undefined,
      houseNo: String(addressData.houseNo ?? ""),
      landmark: addressData.landmark ? String(addressData.landmark) : undefined,
      label:
        addressData.label === "Work" || addressData.label === "Other"
          ? addressData.label
          : "Home",
    },
  };

  return {
    id,
    items: Array.isArray(data.items) ? data.items : [],
    total: Number(data.total ?? 0),
    customer,
    organizationId: data.organizationId || undefined,
    organizationName: String(data.organizationName ?? ""),
    status: data.status ?? "Confirmed",
    paymentMethod: data.paymentMethod ?? "UPI",
    paymentStatus: data.paymentStatus ?? "Pending Verification",
    utr: data.utr,
    createdAt,
    updatedAt: data.updatedAt,
  };
}

export function getOrganizationProductPrice(
  org: Organization | null | undefined,
  product: Product | string,
  defaultPrice?: number
): number {
  const prodId = typeof product === "string" ? product : product?.id;
  const prodSize = typeof product === "object" && product ? product.size : undefined;
  const fallback = typeof product === "object" && product ? product.price : (defaultPrice ?? 0);

  if (!org || !org.pricing || typeof org.pricing !== "object") {
    return fallback ?? 0;
  }

  if (prodId && org.pricing[prodId] !== undefined) {
    const val = Number(org.pricing[prodId]);
    if (!isNaN(val) && val >= 0) return val;
  }

  if (prodSize && org.pricing[prodSize] !== undefined) {
    const val = Number(org.pricing[prodSize]);
    if (!isNaN(val) && val >= 0) return val;
  }

  if (prodId) {
    const idLower = prodId.toLowerCase();
    const sizeLower = prodSize ? prodSize.toLowerCase() : "";
    for (const [key, val] of Object.entries(org.pricing)) {
      const keyLower = key.toLowerCase();
      if (keyLower === idLower || (sizeLower && keyLower === sizeLower)) {
        const numVal = Number(val);
        if (!isNaN(numVal) && numVal >= 0) return numVal;
      }
    }
  }

  return fallback ?? 0;
}

function normalizeOrganization(id: string, data: any): Organization {
  const loc = data.location;
  const location: OrganizationLocation | null =
    loc &&
    typeof loc.latitude === "number" &&
    typeof loc.longitude === "number" &&
    !isNaN(loc.latitude) &&
    !isNaN(loc.longitude)
      ? {
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: String(loc.address ?? data.address ?? ""),
          placeId: loc.placeId ? String(loc.placeId) : undefined,
        }
      : null;

  const rawPricing = data.pricing && typeof data.pricing === "object" ? data.pricing : {};
  const pricing: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawPricing)) {
    const num = Number(v);
    if (!isNaN(num) && num >= 0) {
      pricing[k] = num;
    }
  }

  return {
    id,
    name: String(data.name ?? ""),
    phone: String(data.phone ?? ""),
    email: String(data.email ?? ""),
    address: String(data.address ?? ""),
    gstNumber: String(data.gstNumber ?? data.gst ?? ""),
    location,
    pricing,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt,
  };
}

function normalizeAdminNotification(id: string, data: any): AdminNotification {
  return {
    id,
    orderId: String(data.orderId ?? id),
    title: String(data.title ?? "New order received"),
    message: String(data.message2 ?? data.message ?? "A new order was placed."),
    customerName: String(data.customerName ?? "Customer"),
    customerPhone: String(data.customerPhone ?? ""),
    total: Number(data.total ?? 0),
    read: Boolean(data.read ?? false),
    type: data.type ?? "NEW_ORDER",
    createdAt: data.createdAt ?? new Date().toISOString(),
  };
}

export function getPlantProductStock(
  plant: Plant | null | undefined,
  productId: string,
  defaultStock: number = 0
): number {
  if (!plant || !plant.inventory || typeof plant.inventory !== "object") {
    return defaultStock;
  }
  const stockVal = plant.inventory[productId];
  if (stockVal !== undefined && stockVal !== null) {
    const num = Number(stockVal);
    if (!isNaN(num) && num >= 0) return num;
  }
  return defaultStock;
}

export function getProductTotalStockAcrossPlants(
  productId: string,
  plants: Plant[],
  defaultStock: number = 0
): number {
  if (!plants || plants.length === 0) return defaultStock;
  let hasPlantStock = false;
  let totalSum = 0;

  for (const plant of plants) {
    if (plant.inventory && typeof plant.inventory === "object" && plant.inventory[productId] !== undefined) {
      hasPlantStock = true;
      const val = Number(plant.inventory[productId]);
      if (!isNaN(val) && val >= 0) {
        totalSum += val;
      }
    }
  }

  return hasPlantStock ? totalSum : defaultStock;
}

function normalizePlant(id: string, data: any): Plant {
  let inventory: Record<string, number> | undefined = undefined;
  if (data.inventory && typeof data.inventory === "object") {
    inventory = {};
    for (const [k, v] of Object.entries(data.inventory)) {
      const num = Number(v);
      if (!isNaN(num) && num >= 0) {
        inventory[k] = num;
      }
    }
  }

  return {
    id,
    name: String(data.name ?? ""),
    location: String(data.location ?? ""),
    inventory,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt,
  };
}

function normalizeDeliveryRecord(id: string, data: any): DeliveryRecord {
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw.toISOString()
      : createdAtRaw && typeof createdAtRaw.toMillis === "function"
      ? new Date(createdAtRaw.toMillis()).toISOString()
      : String(createdAtRaw ?? new Date().toISOString());

  return {
    id,
    organizationId: data.organizationId || undefined,
    organizationName: String(data.organizationName ?? ""),
    plantId: data.plantId || undefined,
    plantName: data.plantName || undefined,
    plantLocation: data.plantLocation || undefined,
    fullCansLoaded: Number(data.fullCansLoaded ?? 0),
    emptyCansReturned: Number(data.emptyCansReturned ?? 0),
    cases200mlDelivered: Number(data.cases200mlDelivered ?? 0),
    cases500mlDelivered: Number(data.cases500mlDelivered ?? 0),
    cases1lDelivered: Number(data.cases1lDelivered ?? 0),
    deliveredBy: String(data.deliveredBy ?? ""),
    createdAt,
    updatedAt: data.updatedAt,
    isEdited: Boolean(data.isEdited ?? false),
    editedAt: data.editedAt ? String(data.editedAt) : undefined,
    editedBy: data.editedBy ? String(data.editedBy) : undefined,
  };
}

function normalizeDeliverySchedule(id: string, data: any): DeliverySchedule {
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw.toISOString()
      : createdAtRaw && typeof createdAtRaw.toMillis === "function"
      ? new Date(createdAtRaw.toMillis()).toISOString()
      : String(createdAtRaw ?? new Date().toISOString());

  return {
    id,
    organizationId: String(data.organizationId ?? ""),
    organizationName: String(data.organizationName ?? ""),
    scheduledDate: String(data.scheduledDate ?? ""),
    notes: data.notes ? String(data.notes) : undefined,
    status: data.status === "Completed" ? "Completed" : "Pending",
    order: Number(data.order ?? 0),
    completedAt: data.completedAt ? String(data.completedAt) : undefined,
    completedBy: data.completedBy ? String(data.completedBy) : undefined,
    createdAt,
    updatedAt: data.updatedAt,
  };
}

function normalizeExpenseCategory(id: string, data: any): ExpenseCategory {
  return {
    id,
    name: String(data.name ?? ""),
    isCustom: Boolean(data.isCustom ?? false),
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
  };
}

function normalizeExpense(id: string, data: any): Expense {
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw.toISOString()
      : createdAtRaw && typeof createdAtRaw.toMillis === "function"
      ? new Date(createdAtRaw.toMillis()).toISOString()
      : String(createdAtRaw ?? new Date().toISOString());

  return {
    id,
    expenseName: String(data.expenseName ?? ""),
    categoryId: String(data.categoryId ?? "misc"),
    categoryName: String(data.categoryName ?? "Miscellaneous"),
    amount: Number(data.amount ?? 0),
    expenseDate: String(data.expenseDate ?? new Date().toISOString().slice(0, 10)),
    paymentMethod: (String(data.paymentMethod ?? "Cash") as any),
    description: data.description ? String(data.description) : undefined,
    receiptUrl: data.receiptUrl ? String(data.receiptUrl) : undefined,
    createdBy: String(data.createdBy ?? "Admin"),
    createdAt,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

function cleanFirestoreData<T>(value: T, seen = new WeakSet<object>(), depth = 0): T {
  if (depth > 12) return value;
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (seen.has(value as object)) return value;

  const tag = Object.prototype.toString.call(value);
  if (tag !== "[object Object]" && tag !== "[object Array]") {
    return value;
  }

  if (value.constructor && value.constructor.name !== "Object" && value.constructor.name !== "Array") {
    return value;
  }

  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => cleanFirestoreData(item, seen, depth + 1)) as any;
  }

  return Object.entries(value).reduce((result, [key, entryValue]) => {
    if (entryValue === undefined) return result;
    const cleanedValue = cleanFirestoreData(entryValue, seen, depth + 1);
    if (cleanedValue !== undefined) {
      (result as any)[key] = cleanedValue;
    }
    return result;
  }, {} as Record<string, unknown>) as any;
}

async function seedDefaultProductsIfEmpty() {
  if (!db) return;
  const snap = await getDocs(collection(db, "products"));
  if (!snap.empty) return;

  await Promise.all(
    DEFAULT_PRODUCTS.map((product) =>
      setDoc(doc(db!, "products", product.id), {
        ...product,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [deliverySchedules, setDeliverySchedules] = useState<DeliverySchedule[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [plants, setPlants] = useState<Plant[]>(DEFAULT_PLANTS);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(DEFAULT_EXPENSE_CATEGORIES);

  useEffect(() => {
    async function loadSavedData() {
      const savedCart = await AsyncStorage.getItem(CART_KEY);
      const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
      const savedDeliveries = await AsyncStorage.getItem(DELIVERIES_KEY);
      const savedSchedules = await AsyncStorage.getItem(SCHEDULES_KEY);
      const savedProducts = await AsyncStorage.getItem(PRODUCTS_KEY);
      const savedOrganizations = await AsyncStorage.getItem(ORGANIZATIONS_KEY);
      const savedPlants = await AsyncStorage.getItem(PLANTS_KEY);
      const savedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (savedProducts) setProducts(JSON.parse(savedProducts));
      if (savedCart) setCart(JSON.parse(savedCart));
      if (!firebaseReady && savedOrders) setOrders(JSON.parse(savedOrders));
      if (!firebaseReady && savedDeliveries) setDeliveries(JSON.parse(savedDeliveries));
      if (savedSchedules) setDeliverySchedules(JSON.parse(savedSchedules));
      if (savedOrganizations) setOrganizations(JSON.parse(savedOrganizations));
      if (savedPlants) setPlants(JSON.parse(savedPlants));
      if (savedNotifications) setAdminNotifications(JSON.parse(savedNotifications));
    }
    loadSavedData();
  }, [firebaseReady]);

  useEffect(() => {
    if (!firebaseReady || !db) return;

    seedDefaultProductsIfEmpty().catch((error) => {
      console.warn("Could not seed products", error);
    });

    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const nextProducts = snapshot.docs
        .map((item) => normalizeProduct(item.id, item.data()))
        .sort((a, b) => a.size.localeCompare(b.size));
      if (nextProducts.length > 0) setProducts(nextProducts);
    }, (error) => {
      console.warn("[CartContext] Firestore products listener error:", error);
    });

    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      const nextOrders = snapshot.docs
        .map((item) => normalizeOrder(item.id, item.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(nextOrders);
    }, (error) => {
      console.warn("[CartContext] Firestore orders listener error:", error);
    });

    const unsubDeliveries = onSnapshot(query(collection(db, "deliveries"), limit(200)), (snapshot) => {
      const nextDeliveries = snapshot.docs
        .map((item) => normalizeDeliveryRecord(item.id, item.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      console.log(`[CartContext] Received real-time deliveries update: ${nextDeliveries.length} record(s)`);
      setDeliveries(nextDeliveries);
    }, (error) => {
      console.warn("[CartContext] Firestore deliveries listener error:", error);
    });

    const unsubSchedules = onSnapshot(collection(db, "deliverySchedules"), (snapshot) => {
      const nextSchedules = snapshot.docs
        .map((item) => normalizeDeliverySchedule(item.id, item.data()))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      console.log(`[CartContext] Received real-time deliverySchedules update: ${nextSchedules.length} record(s)`);
      setDeliverySchedules(nextSchedules);
    }, (error) => {
      console.warn("[CartContext] Firestore deliverySchedules listener error:", error);
    });

    const unsubNotifications = onSnapshot(query(collection(db, "adminNotifications"), limit(100)), (snapshot) => {
      const nextNotifications = snapshot.docs
        .map((item) => normalizeAdminNotification(item.id, item.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAdminNotifications(nextNotifications);
    }, (error) => {
      console.warn("[CartContext] Firestore notifications listener error:", error);
    });

    const unsubOrganizations = onSnapshot(collection(db, "organizations"), (snapshot) => {
      const nextOrganizations = snapshot.docs
        .map((item) => normalizeOrganization(item.id, item.data()))
        .sort((a, b) => a.name.localeCompare(b.name));
      setOrganizations(nextOrganizations);
    }, (error) => {
      console.warn("[CartContext] Firestore organizations listener error:", error);
    });

    const unsubPlants = onSnapshot(collection(db, "plants"), (snapshot) => {
      const nextPlants = snapshot.docs
        .map((item) => normalizePlant(item.id, item.data()))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (nextPlants.length > 0) setPlants(nextPlants);
    }, (error) => {
      console.warn("[CartContext] Firestore plants listener error:", error);
    });

    const unsubExpenses = onSnapshot(collection(db, "expenses"), (snapshot) => {
      const nextExpenses = snapshot.docs
        .map((item) => normalizeExpense(item.id, item.data()))
        .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
      setExpenses(nextExpenses);
    }, (error) => {
      console.warn("[CartContext] Firestore expenses listener error:", error);
    });

    const unsubExpenseCategories = onSnapshot(collection(db, "expenseCategories"), (snapshot) => {
      const customCats = snapshot.docs.map((item) => normalizeExpenseCategory(item.id, item.data()));
      const combined = [...DEFAULT_EXPENSE_CATEGORIES];
      customCats.forEach((c) => {
        if (!combined.some((item) => item.id === c.id)) {
          combined.push(c);
        }
      });
      setExpenseCategories(combined);
    }, (error) => {
      console.warn("[CartContext] Firestore expenseCategories listener error:", error);
    });

    return () => {
      unsubProducts();
      unsubOrders();
      unsubDeliveries();
      unsubSchedules();
      unsubNotifications();
      unsubOrganizations();
      unsubPlants();
      unsubExpenses();
      unsubExpenseCategories();
    };
  }, [firebaseReady]);

  useEffect(() => {
    AsyncStorage.setItem(CART_KEY, JSON.stringify(cart)).catch((e) => console.warn("Cart storage error:", e));
  }, [cart]);

  useEffect(() => {
    AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders)).catch((e) => console.warn("Orders storage error:", e));
  }, [orders]);

  useEffect(() => {
    AsyncStorage.setItem(DELIVERIES_KEY, JSON.stringify(deliveries)).catch((e) => console.warn("Deliveries storage error:", e));
  }, [deliveries]);

  useEffect(() => {
    AsyncStorage.setItem(SCHEDULES_KEY, JSON.stringify(deliverySchedules)).catch((e) => console.warn("Schedules storage error:", e));
  }, [deliverySchedules]);

  useEffect(() => {
    AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products)).catch((e) => console.warn("Products storage error:", e));
  }, [products]);

  useEffect(() => {
    AsyncStorage.setItem(ORGANIZATIONS_KEY, JSON.stringify(organizations)).catch((e) => console.warn("Organizations storage error:", e));
  }, [organizations]);

  useEffect(() => {
    AsyncStorage.setItem(PLANTS_KEY, JSON.stringify(plants)).catch((e) => console.warn("Plants storage error:", e));
  }, [plants]);

  useEffect(() => {
    AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(adminNotifications)).catch((e) => console.warn("Notifications storage error:", e));
  }, [adminNotifications]);

  const value = useMemo<CartContextValue>(() => ({
    products,
    orders,
    deliveries,
    organizations,
    plants,
    firebaseReady,
    adminNotifications,
    addOrder: async (order) => {
      if (firebaseReady && db) {
        await runTransaction(db, async (transaction) => {
          const productRefs = order.items.map((item) => doc(db!, "products", item.id));
          const productSnaps = await Promise.all(productRefs.map((productRef) => transaction.get(productRef)));

          const stockUpdates = order.items.map((item, index) => {
            const productSnap = productSnaps[index];
            if (!productSnap.exists()) {
              throw new Error(`${item.size} is no longer available.`);
            }
            const currentStock = Number(productSnap.data().stock ?? 0);
            if (currentStock < item.quantity) {
              throw new Error(`Only ${currentStock} ${item.size} left in stock.`);
            }
            return { productRef: productRefs[index], newStock: currentStock - item.quantity };
          });

          for (const update of stockUpdates) {
            transaction.update(update.productRef, {
              stock: update.newStock,
              updatedAt: serverTimestamp(),
            });
          }

          const orderRef = doc(db!, "orders", order.id);
          transaction.set(
            orderRef,
            cleanFirestoreData({
              ...order,
              paymentStatus: order.paymentStatus ?? "Verified",
              createdAt: order.createdAt,
              updatedAt: serverTimestamp(),
            })
          );

          const notificationRef = doc(db!, "adminNotifications", order.id);
          transaction.set(
            notificationRef,
            cleanFirestoreData({
              orderId: order.id,
              title: "New order received",
              message: `${order.customer.name} placed an order for ₹${order.total}. Payment is verified. Send the order.`,
              message2: `${order.customer.name} placed an order for Rs. ${order.total}. Payment status: ${order.paymentStatus ?? "Pending Verification"}.`,
              customerName: order.customer.name,
              customerPhone: order.customer.phone,
              total: order.total,
              read: false,
              type: "NEW_ORDER",
              createdAt: order.createdAt,
              updatedAt: serverTimestamp(),
            })
          );

          const userPhoneId = order.customer.phone.replace(/\D/g, "") || order.customer.phone;
          const userRef = doc(db!, "users", userPhoneId);
          transaction.set(
            userRef,
            cleanFirestoreData({
              name: order.customer.name,
              phone: order.customer.phone,
              role: "customer",
              addresses: arrayUnion(cleanFirestoreData(order.customer.address)),
              updatedAt: serverTimestamp(),
            }),
            { merge: true }
          );
        });
      } else {
        setOrders((current) => [order, ...current]);
        setAdminNotifications((current) => [{
          id: order.id,
          orderId: order.id,
          title: "New order received",
          message: `${order.customer.name} placed an order for ₹${order.total}. Payment is verified. Send the order.`,
          message2: `${order.customer.name} placed an order for Rs. ${order.total}. Payment status: ${order.paymentStatus ?? "Pending Verification"}.`,
          customerName: order.customer.name,
          customerPhone: order.customer.phone,
          total: order.total,
          read: false,
          type: "NEW_ORDER",
          createdAt: order.createdAt,
        }, ...current]);
        setProducts((current) =>
          current.map((product) => {
            const ordered = order.items.find((item) => item.id === product.id);
            if (!ordered) return product;
            return { ...product, stock: Math.max(0, product.stock - ordered.quantity) };
          })
        );
      }
      setCart([]);
    },
    addDeliveryRecord: async (delivery) => {
      console.log(`[CartContext] Saving delivery record:`, delivery);
      const cleanDelivery: DeliveryRecord = {
        id: delivery.id,
        organizationId: delivery.organizationId || undefined,
        organizationName: delivery.organizationName || "",
        plantId: delivery.plantId || undefined,
        plantName: delivery.plantName || "",
        plantLocation: delivery.plantLocation || "",
        fullCansLoaded: Number(delivery.fullCansLoaded) || 0,
        emptyCansReturned: Number(delivery.emptyCansReturned) || 0,
        cases200mlDelivered: Number(delivery.cases200mlDelivered) || 0,
        cases500mlDelivered: Number(delivery.cases500mlDelivered) || 0,
        cases1lDelivered: Number(delivery.cases1lDelivered) || 0,
        deliveredBy: delivery.deliveredBy || "",
        createdAt: delivery.createdAt || new Date().toISOString(),
      };

      if (!cleanDelivery.plantId) {
        throw new Error("Please select a plant facility for this delivery.");
      }

      const targetPlant = plants.find((p) => p.id === cleanDelivery.plantId);
      if (!targetPlant) {
        throw new Error("Selected plant facility could not be found.");
      }

      // Required stock deductions per product
      const deductions: { [prodId: string]: { size: string; count: number } } = {
        "20l": { size: "20L Can", count: cleanDelivery.fullCansLoaded },
        "200ml": { size: "200ml Pack", count: (cleanDelivery.cases200mlDelivered || 0) * 35 },
        "500ml": { size: "500ml Case", count: (cleanDelivery.cases500mlDelivered || 0) * 24 },
        "1l": { size: "1L Case", count: (cleanDelivery.cases1lDelivered || 0) * 12 },
      };

      // Validate stock availability at selected plant
      for (const [prodId, info] of Object.entries(deductions)) {
        if (info.count > 0) {
          const prodObj = products.find((p) => p.id === prodId);
          const currentStock = getPlantProductStock(targetPlant, prodId, prodObj?.stock ?? 0);
          if (currentStock < info.count) {
            throw new Error(
              `Insufficient stock at ${targetPlant.name} for ${info.size}. Available: ${currentStock}, Required: ${info.count}`
            );
          }
        }
      }

      // Compute updated inventory map for selected plant
      const updatedPlantInventory: Record<string, number> = { ...(targetPlant.inventory || {}) };
      for (const [prodId, info] of Object.entries(deductions)) {
        if (info.count > 0) {
          const prodObj = products.find((p) => p.id === prodId);
          const currentStock = getPlantProductStock(targetPlant, prodId, prodObj?.stock ?? 0);
          updatedPlantInventory[prodId] = Math.max(0, currentStock - info.count);
        }
      }

      if (firebaseReady && db) {
        await runTransaction(db, async (transaction) => {
          const plantRef = doc(db!, "plants", targetPlant.id);
          const plantSnap = await transaction.get(plantRef);
          if (!plantSnap.exists()) {
            throw new Error(`Selected plant facility ${targetPlant.name} not found.`);
          }

          const currentPlantData = plantSnap.data();
          const currentInv: Record<string, number> = currentPlantData.inventory || {};
          const updatedInv: Record<string, number> = { ...currentInv };

          // Validate and compute plant inventory inside transaction
          for (const [prodId, info] of Object.entries(deductions)) {
            if (info.count > 0) {
              const avail = Number(currentInv[prodId] ?? 0);
              if (avail < info.count) {
                throw new Error(
                  `Insufficient stock at ${targetPlant.name} for ${info.size}. Available: ${avail}, Required: ${info.count}`
                );
              }
              updatedInv[prodId] = avail - info.count;
            }
          }

          const deliveryRef = doc(db!, "deliveries", delivery.id);
          transaction.set(
            deliveryRef,
            {
              ...cleanFirestoreData(cleanDelivery),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          transaction.update(plantRef, {
            inventory: updatedInv,
            updatedAt: serverTimestamp(),
          });

          const notificationRef = doc(db!, "adminNotifications", `delivery-${delivery.id}`);
          const notificationMsg = `${delivery.deliveredBy} recorded delivery for ${delivery.organizationName || "Organization"} from ${targetPlant.name}.`;
          transaction.set(
            notificationRef,
            {
              ...cleanFirestoreData({
                orderId: delivery.id,
                title: "New Delivery Recorded",
                message: notificationMsg,
                customerName: delivery.organizationName || "Organization",
                customerPhone: "",
                total: 0,
                read: false,
                type: "NEW_ORDER",
                createdAt: delivery.createdAt || new Date().toISOString(),
              }),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        });
      } else {
        setDeliveries((current) => [cleanDelivery, ...current]);
        setPlants((current) =>
          current.map((p) => (p.id === targetPlant.id ? { ...p, inventory: updatedPlantInventory } : p))
        );
      }
    },
    updateDeliveryRecord: async (deliveryId, updatedData, editedBy) => {
      const existingDelivery = deliveries.find((d) => d.id === deliveryId);
      if (!existingDelivery) {
        throw new Error("Original delivery record not found or was removed in another session.");
      }

      const plantId = updatedData.plantId || existingDelivery.plantId;
      if (!plantId) {
        throw new Error("Target plant facility is missing.");
      }

      const targetPlant = plants.find((p) => p.id === plantId);
      if (!targetPlant) {
        throw new Error("Selected plant facility could not be found.");
      }

      const oldCounts: Record<string, number> = {
        "20l": Number(existingDelivery.fullCansLoaded || 0),
        "200ml": Number(existingDelivery.cases200mlDelivered || 0) * 35,
        "500ml": Number(existingDelivery.cases500mlDelivered || 0) * 24,
        "1l": Number(existingDelivery.cases1lDelivered || 0) * 12,
      };

      const newFullCans = updatedData.fullCansLoaded !== undefined ? Number(updatedData.fullCansLoaded) : existingDelivery.fullCansLoaded;
      const newCases200 = updatedData.cases200mlDelivered !== undefined ? Number(updatedData.cases200mlDelivered) : (existingDelivery.cases200mlDelivered || 0);
      const newCases500 = updatedData.cases500mlDelivered !== undefined ? Number(updatedData.cases500mlDelivered) : (existingDelivery.cases500mlDelivered || 0);
      const newCases1l = updatedData.cases1lDelivered !== undefined ? Number(updatedData.cases1lDelivered) : (existingDelivery.cases1lDelivered || 0);

      const newCounts: Record<string, number> = {
        "20l": newFullCans,
        "200ml": newCases200 * 35,
        "500ml": newCases500 * 24,
        "1l": newCases1l * 12,
      };

      const editedAt = new Date().toISOString();
      const updatedDelivery: DeliveryRecord = {
        ...existingDelivery,
        ...updatedData,
        fullCansLoaded: newFullCans,
        emptyCansReturned: updatedData.emptyCansReturned !== undefined ? Number(updatedData.emptyCansReturned) : existingDelivery.emptyCansReturned,
        cases200mlDelivered: newCases200,
        cases500mlDelivered: newCases500,
        cases1lDelivered: newCases1l,
        isEdited: true,
        editedAt,
        editedBy,
      };

      if (firebaseReady && db) {
        await runTransaction(db, async (transaction) => {
          const plantRef = doc(db!, "plants", targetPlant.id);
          const plantSnap = await transaction.get(plantRef);
          if (!plantSnap.exists()) {
            throw new Error(`Plant facility ${targetPlant.name} not found.`);
          }

          const currentPlantData = plantSnap.data();
          const currentInv: Record<string, number> = currentPlantData.inventory || {};
          const updatedInv: Record<string, number> = { ...currentInv };

          const prodInfo: Record<string, string> = { "20l": "20L Can", "200ml": "200ml Pack", "500ml": "500ml Case", "1l": "1L Case" };
          for (const [prodId, newDeduction] of Object.entries(newCounts)) {
            const oldDeduction = oldCounts[prodId] || 0;
            const diff = newDeduction - oldDeduction;
            const currentStock = Number(currentInv[prodId] ?? 0);

            if (diff > 0 && currentStock < diff) {
              throw new Error(
                `Insufficient stock at ${targetPlant.name} for ${prodInfo[prodId]}. Available: ${currentStock}, Additional needed: ${diff}`
              );
            }
            updatedInv[prodId] = Math.max(0, currentStock - diff);
          }

          const deliveryRef = doc(db!, "deliveries", deliveryId);
          transaction.set(
            deliveryRef,
            {
              ...cleanFirestoreData(updatedDelivery),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          transaction.update(plantRef, {
            inventory: updatedInv,
            updatedAt: serverTimestamp(),
          });

          const notificationRef = doc(db!, "adminNotifications", `delivery-edit-${deliveryId}-${Date.now()}`);
          const notificationMsg = `${editedBy} edited delivery for ${updatedDelivery.organizationName || "Organization"} (Cans: ${existingDelivery.fullCansLoaded} ➔ ${newFullCans}).`;
          transaction.set(
            notificationRef,
            {
              ...cleanFirestoreData({
                orderId: deliveryId,
                title: "Delivery Record Edited ✏️",
                message: notificationMsg,
                customerName: updatedDelivery.organizationName || "Organization",
                customerPhone: "",
                total: 0,
                read: false,
                type: "NEW_ORDER",
                createdAt: editedAt,
              }),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        });
      } else {
        setDeliveries((current) => current.map((d) => (d.id === deliveryId ? updatedDelivery : d)));
      }
    },
    saveOrganization: async (organization) => {
      const cleanOrganization: Organization = {
        ...organization,
        name: organization.name.trim(),
        phone: organization.phone.trim(),
        email: organization.email.trim(),
        address: organization.address.trim(),
        gstNumber: (organization.gstNumber || "").trim(),
      };

      if (
        !cleanOrganization.name ||
        !cleanOrganization.phone ||
        !cleanOrganization.email ||
        !cleanOrganization.address
      ) {
        throw new Error("Organization Name, Phone, Email, and Address are required.");
      }

      if (firebaseReady && db) {
        await setDoc(doc(db, "organizations", cleanOrganization.id), {
          ...cleanFirestoreData(cleanOrganization),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        setOrganizations((current) => {
          const exists = current.some((org) => org.id === cleanOrganization.id);
          if (exists) return current.map((org) => (org.id === cleanOrganization.id ? cleanOrganization : org));
          return [cleanOrganization, ...current];
        });
      }
    },
    deleteOrganization: async (id) => {
      if (firebaseReady && db) {
        await deleteDoc(doc(db, "organizations", id));
      } else {
        setOrganizations((current) => current.filter((org) => org.id !== id));
      }
    },
    savePlant: async (plant) => {
      const cleanPlant: Plant = {
        ...plant,
        name: plant.name.trim(),
        location: plant.location.trim(),
      };

      if (!cleanPlant.name || !cleanPlant.location) {
        throw new Error("All fields (Plant Name and Plant Location) are required.");
      }

      if (firebaseReady && db) {
        await setDoc(doc(db, "plants", cleanPlant.id), {
          ...cleanFirestoreData(cleanPlant),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        setPlants((current) => {
          const exists = current.some((p) => p.id === cleanPlant.id);
          if (exists) return current.map((p) => (p.id === cleanPlant.id ? cleanPlant : p));
          return [cleanPlant, ...current];
        });
      }
    },
    updatePlantInventory: async (plantId, newInventory) => {
      const targetPlant = plants.find((p) => p.id === plantId);
      if (!targetPlant) throw new Error("Plant facility not found.");

      const sanitizedInventory: Record<string, number> = {};
      for (const [k, v] of Object.entries(newInventory)) {
        const num = Math.max(0, Number(v) || 0);
        sanitizedInventory[k] = num;
      }

      if (firebaseReady && db) {
        await setDoc(
          doc(db, "plants", plantId),
          {
            inventory: sanitizedInventory,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        setPlants((current) =>
          current.map((p) => (p.id === plantId ? { ...p, inventory: sanitizedInventory } : p))
        );
      }
    },
    deletePlant: async (id) => {
      if (firebaseReady && db) {
        await deleteDoc(doc(db, "plants", id));
      } else {
        setPlants((current) => current.filter((p) => p.id !== id));
      }
    },
    saveProduct: async (product) => {
      const sanitizedProduct: Product = {
        ...product,
        stock: Math.max(0, Number(product.stock) || 0),
        price: Math.max(0, Number(product.price) || 0),
      };
      if (firebaseReady && db) {
        await setDoc(
          doc(db, "products", sanitizedProduct.id),
          {
            ...cleanFirestoreData(sanitizedProduct),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        setProducts((current) => {
          const exists = current.some((p) => p.id === sanitizedProduct.id);
          if (exists) return current.map((p) => (p.id === sanitizedProduct.id ? sanitizedProduct : p));
          return [...current, sanitizedProduct];
        });
      }
    },
    markAdminNotificationRead: async (id) => {
      if (firebaseReady && db) {
        await setDoc(doc(db, "adminNotifications", id), { read: true, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        setAdminNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
      }
    },
    deliverySchedules,
    addOrUpdateSchedule: async (data) => {
      const id = data.id || `sched_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const schedule: DeliverySchedule = {
        id,
        organizationId: data.organizationId,
        organizationName: data.organizationName,
        scheduledDate: data.scheduledDate,
        notes: data.notes ?? "",
        status: data.status ?? "Pending",
        order: data.order ?? 0,
        completedAt: data.completedAt,
        completedBy: data.completedBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (firebaseReady && db) {
        await setDoc(
          doc(db, "deliverySchedules", id),
          {
            ...cleanFirestoreData(schedule),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        setDeliverySchedules((current) => {
          const exists = current.some((s) => s.id === id);
          if (exists) return current.map((s) => (s.id === id ? schedule : s));
          return [schedule, ...current];
        });
      }
      return id;
    },
    rescheduleOrganization: async (scheduleId, newDate, newOrder) => {
      if (firebaseReady && db) {
        await setDoc(
          doc(db, "deliverySchedules", scheduleId),
          {
            scheduledDate: newDate,
            ...(newOrder !== undefined ? { order: newOrder } : {}),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        setDeliverySchedules((current) =>
          current.map((s) =>
            s.id === scheduleId
              ? { ...s, scheduledDate: newDate, ...(newOrder !== undefined ? { order: newOrder } : {}) }
              : s
          )
        );
      }
    },
    deleteSchedule: async (scheduleId) => {
      if (firebaseReady && db) {
        await deleteDoc(doc(db, "deliverySchedules", scheduleId));
      } else {
        setDeliverySchedules((current) => current.filter((s) => s.id !== scheduleId));
      }
    },
    markScheduleCompleted: async (scheduleId, completedBy) => {
      const completedAt = new Date().toISOString();
      if (firebaseReady && db) {
        await setDoc(
          doc(db, "deliverySchedules", scheduleId),
          {
            status: "Completed",
            completedAt,
            completedBy,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        setDeliverySchedules((current) =>
          current.map((s) =>
            s.id === scheduleId ? { ...s, status: "Completed", completedAt, completedBy } : s
          )
        );
      }
    },
    expenses,
    expenseCategories,
    addExpense: async (expenseData) => {
      const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const newExpense: Expense = {
        ...expenseData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (firebaseReady && db) {
        await setDoc(doc(db, "expenses", id), {
          ...cleanFirestoreData(newExpense),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        setExpenses((prev) => [newExpense, ...prev]);
      }
      return id;
    },
    updateExpense: async (id, updatedData) => {
      if (firebaseReady && db) {
        await setDoc(
          doc(db, "expenses", id),
          {
            ...cleanFirestoreData(updatedData),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        setExpenses((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...updatedData, updatedAt: new Date().toISOString() } : item))
        );
      }
    },
    deleteExpense: async (id) => {
      if (firebaseReady && db) {
        await deleteDoc(doc(db, "expenses", id));
      } else {
        setExpenses((prev) => prev.filter((item) => item.id !== id));
      }
    },
    addExpenseCategory: async (categoryName: string) => {
      const sanitizedName = categoryName.trim();
      const id = `cat_${sanitizedName.toLowerCase().replace(/\s+/g, "-")}_${Date.now().toString(36)}`;
      const newCategory: ExpenseCategory = {
        id,
        name: sanitizedName,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };

      if (firebaseReady && db) {
        await setDoc(doc(db, "expenseCategories", id), {
          ...cleanFirestoreData(newCategory),
          createdAt: serverTimestamp(),
        });
      } else {
        setExpenseCategories((prev) => [...prev, newCategory]);
      }
      return newCategory;
    },
  }), [orders, deliveries, deliverySchedules, products, organizations, plants, adminNotifications, expenses, expenseCategories]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
