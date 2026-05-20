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

export type Order = {
  id: string;
  items: CartItem[];
  total: number;
  customer: {
    name: string;
    phone: string;
    address: DeliveryAddress;
  };
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

const CART_KEY = "krio_cart";
const ORDERS_KEY = "krio_orders";
const PRODUCTS_KEY = "krio_products";
const NOTIFICATIONS_KEY = "krio_admin_notifications";

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "200ml", size: "200 ml", use: "On-the-go sip", emoji: "🧴", price: 10, stock: 100, isActive: true },
  { id: "500ml", size: "500 ml", use: "Everyday carry", emoji: "🍶", price: 20, stock: 100, isActive: true },
  { id: "1l", size: "1 Litre", use: "Desk & travel", emoji: "🫙", price: 30, stock: 100, isActive: true },
  { id: "2l", size: "2 Litre", use: "Family table", emoji: "🧃", price: 45, stock: 100, isActive: true },
  { id: "20l", size: "20 L Jar", use: "Home & office", emoji: "🪣", price: 90, stock: 40, isActive: true },
];

type CartContextValue = {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
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
  updateOrderStatus: (id: string, status: Order["status"], paymentStatus?: Order["paymentStatus"]) => Promise<void>;
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
  return {
    id,
    items: Array.isArray(data.items) ? data.items : [],
    total: Number(data.total ?? 0),
    customer: data.customer,
    status: data.status ?? "Confirmed",
    paymentMethod: data.paymentMethod ?? "UPI",
    paymentStatus: data.paymentStatus ?? "Pending Verification",
    utr: data.utr,
    razorpayPaymentLinkId: data.razorpayPaymentLinkId,
    razorpayPaymentId: data.razorpayPaymentId,
    paymentReferenceId: data.paymentReferenceId,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt,
  };
}

function normalizeAdminNotification(id: string, data: any): AdminNotification {
  return {
    id,
    orderId: String(data.orderId ?? id),
    title: String(data.title ?? "New order received"),
    message: String(data.message ?? "A new order was placed."),
    customerName: String(data.customerName ?? "Customer"),
    customerPhone: String(data.customerPhone ?? ""),
    total: Number(data.total ?? 0),
    read: Boolean(data.read ?? false),
    type: data.type ?? "NEW_ORDER",
    createdAt: data.createdAt ?? new Date().toISOString(),
  };
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
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);

  useEffect(() => {
    async function loadSavedData() {
      const savedCart = await AsyncStorage.getItem(CART_KEY);
      const savedOrders = await AsyncStorage.getItem(ORDERS_KEY);
      const savedProducts = await AsyncStorage.getItem(PRODUCTS_KEY);
      const savedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (savedProducts) setProducts(JSON.parse(savedProducts));
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedOrders) setOrders(JSON.parse(savedOrders));
      if (savedNotifications) setAdminNotifications(JSON.parse(savedNotifications));
    }
    loadSavedData();
  }, []);

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
    });

    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      const nextOrders = snapshot.docs
        .map((item) => normalizeOrder(item.id, item.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(nextOrders);
    });

    const unsubNotifications = onSnapshot(collection(db, "adminNotifications"), (snapshot) => {
      const nextNotifications = snapshot.docs
        .map((item) => normalizeAdminNotification(item.id, item.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAdminNotifications(nextNotifications);
    });

    return () => {
      unsubProducts();
      unsubOrders();
      unsubNotifications();
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(adminNotifications));
  }, [adminNotifications]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const getProductStock = (id: string) => products.find((p) => p.id === id)?.stock ?? 0;

  const value = useMemo<CartContextValue>(() => ({
    products,
    cart,
    orders,
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
          for (const item of order.items) {
            const productRef = doc(db!, "products", item.id);
            const productSnap = await transaction.get(productRef);
            if (!productSnap.exists()) throw new Error(`${item.size} is no longer available.`);
            const currentStock = Number(productSnap.data().stock ?? 0);
            if (currentStock < item.quantity) {
              throw new Error(`Only ${currentStock} ${item.size} left in stock.`);
            }
            transaction.update(productRef, {
              stock: currentStock - item.quantity,
              updatedAt: serverTimestamp(),
            });
          }

          const orderRef = doc(db!, "orders", order.id);
          transaction.set(orderRef, {
            ...order,
            paymentStatus: order.paymentStatus ?? "Verified",
            createdAt: order.createdAt,
            updatedAt: serverTimestamp(),
          });

          const notificationRef = doc(db!, "adminNotifications", order.id);
          transaction.set(notificationRef, {
            orderId: order.id,
            title: "New order received",
            message: `${order.customer.name} placed an order for ₹${order.total}. Payment is verified. Send the order.`,
            customerName: order.customer.name,
            customerPhone: order.customer.phone,
            total: order.total,
            read: false,
            type: "NEW_ORDER",
            createdAt: order.createdAt,
            updatedAt: serverTimestamp(),
          });

          const userPhoneId = order.customer.phone.replace(/\D/g, "") || order.customer.phone;
          const userRef = doc(db!, "users", userPhoneId);
          transaction.set(userRef, {
            name: order.customer.name,
            phone: order.customer.phone,
            role: "customer",
            addresses: arrayUnion(order.customer.address),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
      } else {
        setOrders((current) => [order, ...current]);
        setAdminNotifications((current) => [{
          id: order.id,
          orderId: order.id,
          title: "New order received",
          message: `${order.customer.name} placed an order for ₹${order.total}. Payment is verified. Send the order.`,
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
    deleteProduct: async (id) => {
      if (firebaseReady && db) {
        await deleteDoc(doc(db, "products", id));
      } else {
        setProducts((current) => current.filter((p) => p.id !== id));
      }
      setCart((current) => current.filter((item) => item.id !== id));
    },
    updateOrderStatus: async (id, status, paymentStatus) => {
      if (firebaseReady && db) {
        await setDoc(doc(db, "orders", id), {
          status,
          ...(paymentStatus ? { paymentStatus } : {}),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        await setDoc(doc(db, "adminNotifications", id), { read: true, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        setOrders((current) => current.map((order) => order.id === id ? { ...order, status, paymentStatus: paymentStatus ?? order.paymentStatus } : order));
        setAdminNotifications((current) => current.map((item) => item.orderId === id ? { ...item, read: true } : item));
      }
    },
    markAdminNotificationRead: async (id) => {
      if (firebaseReady && db) {
        await setDoc(doc(db, "adminNotifications", id), { read: true, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        setAdminNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
      }
    },
  }), [cart, orders, products, adminNotifications, totalItems, total]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
