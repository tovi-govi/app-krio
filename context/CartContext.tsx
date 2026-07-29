import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
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

export type Organization = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
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
  razorpayPaymentLinkId?: string;
  razorpayPaymentId?: string;
  paymentReferenceId?: string;
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
  createdAt?: string;
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
};

const CART_KEY = "krio_cart";
const ORDERS_KEY = "krio_orders";
const PRODUCTS_KEY = "krio_products";
const ORGANIZATIONS_KEY = "krio_organizations";
const NOTIFICATIONS_KEY = "krio_admin_notifications";
const DELIVERIES_KEY = "krio_deliveries";
const PLANTS_KEY = "krio_plants";

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "200ml", size: "200 ml Bottle", use: "On-the-go sip", emoji: "🧴", price: 10, stock: 100, isActive: true },
  { id: "500ml", size: "500 ml Bottle", use: "Everyday carry", emoji: "🍶", price: 20, stock: 100, isActive: true },
  { id: "1l", size: "1 Litre Bottle", use: "Desk & travel", emoji: "🫙", price: 30, stock: 100, isActive: true },
  { id: "20l", size: "20 L Can", use: "Home & office dispenser", emoji: "🪣", price: 90, stock: 40, isActive: true },
];

export const DEFAULT_PLANTS: Plant[] = [
  { id: "plant-main", name: "Main Processing Plant", location: "Industrial Zone, Block A" },
];

type CartContextValue = {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  deliveries: DeliveryRecord[];
  organizations: Organization[];
  plants: Plant[];
  firebaseReady: boolean;
  totalItems: number;
  total: number;
  addToCart: (product: Product) => boolean;
  increaseQuantity: (id: string) => boolean;
  decreaseQuantity: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  addOrder: (order: Order) => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveOrganization: (organization: Organization) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  savePlant: (plant: Plant) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;
  addDeliveryRecord: (delivery: DeliveryRecord) => Promise<void>;
  updateOrderStatus: (id: string, status: Order["status"], paymentStatus?: Order["paymentStatus"], deliveryData?: { fullCansLoaded?: number; emptyCansReturned?: number }) => Promise<void>;
  adminNotifications: AdminNotification[];
  unreadAdminNotifications: number;
  markAdminNotificationRead: (id: string) => Promise<void>;
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
    stock: Number(data.stock ?? 0),
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
    razorpayPaymentLinkId: data.razorpayPaymentLinkId,
    razorpayPaymentId: data.razorpayPaymentId,
    paymentReferenceId: data.paymentReferenceId,
    createdAt,
    updatedAt: data.updatedAt,
  };
}

function normalizeOrganization(id: string, data: any): Organization {
  return {
    id,
    name: String(data.name ?? ""),
    phone: String(data.phone ?? ""),
    email: String(data.email ?? ""),
    address: String(data.address ?? ""),
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

function normalizePlant(id: string, data: any): Plant {
  return {
    id,
    name: String(data.name ?? ""),
    location: String(data.location ?? ""),
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
    deliveredBy: String(data.deliveredBy ?? ""),
    createdAt,
    updatedAt: data.updatedAt,
  };
}

function cleanFirestoreData<T>(value: T, seen = new WeakSet<object>()): T {
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
    return value.map((item) => cleanFirestoreData(item, seen)) as any;
  }

  return Object.entries(value).reduce((result, [key, entryValue]) => {
    if (entryValue === undefined) return result;
    const cleanedValue = cleanFirestoreData(entryValue, seen);
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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [plants, setPlants] = useState<Plant[]>(DEFAULT_PLANTS);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);

  useEffect(() => {
    async function loadSavedData() {
      const savedCart = await AsyncStorage.getItem(CART_KEY);
      const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
      const savedDeliveries = await AsyncStorage.getItem(DELIVERIES_KEY);
      const savedProducts = await AsyncStorage.getItem(PRODUCTS_KEY);
      const savedOrganizations = await AsyncStorage.getItem(ORGANIZATIONS_KEY);
      const savedPlants = await AsyncStorage.getItem(PLANTS_KEY);
      const savedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (savedProducts) setProducts(JSON.parse(savedProducts));
      if (savedCart) setCart(JSON.parse(savedCart));
      if (!firebaseReady && savedOrders) setOrders(JSON.parse(savedOrders));
      if (!firebaseReady && savedDeliveries) setDeliveries(JSON.parse(savedDeliveries));
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

    const unsubDeliveries = onSnapshot(collection(db, "deliveries"), (snapshot) => {
      const nextDeliveries = snapshot.docs
        .map((item) => normalizeDeliveryRecord(item.id, item.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      console.log(`[CartContext] Received real-time deliveries update: ${nextDeliveries.length} record(s)`);
      setDeliveries(nextDeliveries);
    }, (error) => {
      console.warn("[CartContext] Firestore deliveries listener error:", error);
    });

    const unsubNotifications = onSnapshot(collection(db, "adminNotifications"), (snapshot) => {
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

    return () => {
      unsubProducts();
      unsubOrders();
      unsubDeliveries();
      unsubNotifications();
      unsubOrganizations();
      unsubPlants();
    };
  }, []);

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

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const getProductStock = (id: string) => products.find((p) => p.id === id)?.stock ?? 0;

  const value = useMemo<CartContextValue>(() => ({
    products,
    cart,
    orders,
    deliveries,
    organizations,
    plants,
    firebaseReady,
    totalItems,
    total,
    adminNotifications,
    unreadAdminNotifications: adminNotifications.filter((item) => !item.read).length,
    addToCart: (product) => {
      const freshProduct = products.find((p) => p.id === product.id) ?? product;
      const currentQty = cart.find((item) => item.id === freshProduct.id)?.quantity ?? 0;
      if (!freshProduct.isActive || freshProduct.stock <= currentQty) return false;
      setCart((current) => {
        const existing = current.find((item) => item.id === freshProduct.id);
        if (existing) {
          return current.map((item) =>
            item.id === freshProduct.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [...current, { ...freshProduct, quantity: 1 }];
      });
      return true;
    },
    increaseQuantity: (id) => {
      const currentQty = cart.find((item) => item.id === id)?.quantity ?? 0;
      if (getProductStock(id) <= currentQty) return false;
      setCart((current) =>
        current.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      return true;
    },
    decreaseQuantity: (id) => {
      setCart((current) =>
        current
          .map((item) =>
            item.id === id ? { ...item, quantity: item.quantity - 1 } : item
          )
          .filter((item) => item.quantity > 0)
      );
    },
    removeFromCart: (id) => {
      setCart((current) => current.filter((item) => item.id !== id));
    },
    clearCart: () => setCart([]),
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
              role: "admin",
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
    saveProduct: async (product) => {
      const cleanProduct: Product = {
        ...product,
        price: Number(product.price) || 0,
        stock: Math.max(0, Number(product.stock) || 0),
        isActive: Boolean(product.isActive),
        imageUrl: product.imageUrl?.trim() || undefined,
      };

      if (firebaseReady && db) {
        await setDoc(doc(db, "products", cleanProduct.id), {
          ...cleanProduct,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        setProducts((current) => {
          const exists = current.some((p) => p.id === cleanProduct.id);
          if (exists) return current.map((p) => (p.id === cleanProduct.id ? cleanProduct : p));
          return [cleanProduct, ...current];
        });
      }
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

      if (firebaseReady && db) {
        const cleanedDeliveryPayload = cleanFirestoreData(cleanDelivery);
        await setDoc(
          doc(db, "deliveries", delivery.id),
          {
            ...cleanedDeliveryPayload,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        const notificationRef = doc(db, "adminNotifications", `delivery-${delivery.id}`);
        const notificationMsg = `${delivery.deliveredBy} recorded delivery for ${delivery.organizationName || "Organization"}.`;
        const cleanedNotificationPayload = cleanFirestoreData({
          orderId: delivery.id,
          title: "New Delivery Recorded",
          message: notificationMsg,
          customerName: delivery.organizationName || "Organization",
          customerPhone: "",
          total: 0,
          read: false,
          type: "NEW_ORDER",
          createdAt: delivery.createdAt || new Date().toISOString(),
        });

        await setDoc(
          notificationRef,
          {
            ...cleanedNotificationPayload,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        setDeliveries((current) => [cleanDelivery, ...current]);
      }

      // Automatically update Inventory Stock in memory and Cloud Firestore
      const stockDeductions: { [productId: string]: number } = {
        "20l": cleanDelivery.fullCansLoaded,
        "200ml": (cleanDelivery.cases200mlDelivered || 0) * 35, // 1 pack = 35 bottles
        "500ml": (cleanDelivery.cases500mlDelivered || 0) * 24, // 1 case = 24 bottles
        "1l": (cleanDelivery.cases1lDelivered || 0) * 12,       // 1 case = 12 bottles
      };

      setProducts((prevProducts) =>
        prevProducts.map((prod) => {
          const deduct = stockDeductions[prod.id] || 0;
          if (deduct > 0) {
            const newStock = Math.max(0, prod.stock - deduct);
            if (firebaseReady && db) {
              setDoc(doc(db, "products", prod.id), { stock: newStock, updatedAt: serverTimestamp() }, { merge: true }).catch(console.warn);
            }
            return { ...prod, stock: newStock };
          }
          return prod;
        })
      );
    },
    saveOrganization: async (organization) => {
      const cleanOrganization: Organization = {
        ...organization,
        name: organization.name.trim(),
        phone: organization.phone.trim(),
        email: organization.email.trim(),
        address: organization.address.trim(),
      };

      if (!cleanOrganization.name || !cleanOrganization.phone || !cleanOrganization.email || !cleanOrganization.address) {
        throw new Error("All fields (Organization Name, Phone, Email, and Address) are required.");
      }

      if (firebaseReady && db) {
        await setDoc(doc(db, "organizations", cleanOrganization.id), {
          ...cleanOrganization,
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
          ...cleanPlant,
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
    deletePlant: async (id) => {
      if (firebaseReady && db) {
        await deleteDoc(doc(db, "plants", id));
      } else {
        setPlants((current) => current.filter((p) => p.id !== id));
      }
    },
    deleteProduct: async (id) => {
      if (firebaseReady && db) {
        await deleteDoc(doc(db, "products", id));
      } else {
        setProducts((current) => current.filter((p) => p.id !== id));
      }
      setCart((current) => current.filter((item) => item.id !== id));
    },
    updateOrderStatus: async (id, status, paymentStatus, deliveryData) => {
      if (firebaseReady && db) {
        await setDoc(doc(db, "orders", id), {
          status,
          ...(paymentStatus ? { paymentStatus } : {}),
          ...deliveryData,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        await setDoc(doc(db, "adminNotifications", id), { read: true, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        setOrders((current) =>
          current.map((order) =>
            order.id === id
              ? { ...order, status, paymentStatus: paymentStatus ?? order.paymentStatus, ...deliveryData }
              : order
          )
        );
        setAdminNotifications((current) => current.map((item) => (item.orderId === id ? { ...item, read: true } : item)));
      }
    },
    markAdminNotificationRead: async (id) => {
      if (firebaseReady && db) {
        await setDoc(doc(db, "adminNotifications", id), { read: true, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        setAdminNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
      }
    },
  }), [cart, orders, deliveries, products, organizations, plants, adminNotifications, totalItems, total]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
