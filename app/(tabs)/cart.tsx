import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { Minus, Plus, Trash2, ShoppingCart, CreditCard, MapPin, Home, Briefcase, Navigation, ExternalLink, RefreshCw } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { DeliveryAddress, Order, useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";

const PAYMENT_API_BASE = process.env.EXPO_PUBLIC_API_BASE || process.env.EXPO_PUBLIC_PAYMENT_API_BASE || "";

type AddressLabel = "Home" | "Work" | "Other";

type RazorpayPaymentSession = {
  appOrderId: string;
  paymentLinkId: string;
  paymentLinkUrl: string;
  referenceId: string;
  amount: number;
};

type PickedLocation = {
  latitude: number;
  longitude: number;
};

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function buildMapLabel(address: Location.LocationGeocodedAddress | undefined, location: PickedLocation) {
  const parts = [
    address?.name,
    address?.street,
    address?.district,
    address?.city,
    address?.region,
    address?.postalCode,
  ].filter(Boolean);
  const label = parts.length > 0 ? parts.join(", ") : "Current GPS location";
  return `${label} (${formatCoordinate(location.latitude)}, ${formatCoordinate(location.longitude)})`;
}

export default function CartScreen() {
  const { user } = useAuth();
  const { cart, orders, totalItems, total, increaseQuantity, decreaseQuantity, removeFromCart, addOrder } = useCart();
  const displayedOrders = user?.role === "customer" ? orders.filter((order) => order.customer?.phone?.replace(/\D/g, "") === user.phone.replace(/\D/g, "")) : orders;

  const [name, setName] = useState(user?.role === "customer" ? user.name : "");
  const [phone, setPhone] = useState(user?.role === "customer" ? user.phone : "");
  const [mapPicked, setMapPicked] = useState(false);
  const [mapLabel, setMapLabel] = useState("");
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [houseNo, setHouseNo] = useState("");
  const [landmark, setLandmark] = useState("");
  const [addressLabel, setAddressLabel] = useState<AddressLabel>("Home");
  const [paymentSession, setPaymentSession] = useState<RazorpayPaymentSession | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const cartSignature = useMemo(() => cart.map((item) => `${item.id}:${item.quantity}:${item.price}`).join("|"), [cart]);

  useEffect(() => {
    if (paymentSession) setPaymentSession(null);
  }, [cartSignature, total]);

  const pickAddressOnMap = async () => {
    setLocationLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location permission needed", "Allow location access so we can pin the delivery address.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const location = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      let reverseAddress: Location.LocationGeocodedAddress | undefined;
      try {
        reverseAddress = (await Location.reverseGeocodeAsync(location))[0];
      } catch {}

      setPickedLocation(location);
      setMapPicked(true);
      setMapLabel(buildMapLabel(reverseAddress, location));

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
      await Linking.openURL(mapsUrl).catch(() => undefined);
      Alert.alert("Location pinned", "We saved your GPS pin. Now add the flat/house number and landmark.");
    } catch (error: any) {
      Alert.alert("Location failed", error.message || "Could not get your current location.");
    } finally {
      setLocationLoading(false);
    }
  };

  const getAddress = (): DeliveryAddress => ({
    mapLabel: mapLabel.trim(),
    latitude: pickedLocation?.latitude,
    longitude: pickedLocation?.longitude,
    houseNo: houseNo.trim(),
    landmark: landmark.trim() || undefined,
    label: addressLabel,
  });

  const validateDetails = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cart.length === 0) return "Add products before checkout.";
    if (!user || user.role !== "customer") return "Please login with your phone number before placing an order.";
    if (!name.trim() || !/^\d{10}$/.test(cleanPhone)) return "Enter customer name and a valid 10-digit phone number.";
    if (!mapPicked || !mapLabel.trim()) return "Pick the delivery location on map first.";
    if (!houseNo.trim()) return "Enter flat/house number after choosing the map location.";
    return "";
  };

  const createRazorpayPayment = async () => {
    const error = validateDetails();
    if (error) {
      Alert.alert("Checkout incomplete", error);
      if (error.includes("login")) router.push("/login");
      return;
    }

    if (!PAYMENT_API_BASE) {
      Alert.alert(
        "Payment backend missing",
        "Add EXPO_PUBLIC_PAYMENT_API_BASE in .env and deploy the /api/razorpay backend before accepting payments."
      );
      return;
    }

    setPaymentLoading(true);
    try {
      const appOrderId = `KRIO-${Date.now()}`;
      const cleanPhone = phone.replace(/\D/g, "");
      const response = await fetch(`${PAYMENT_API_BASE}/api/razorpay/create-payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appOrderId,
          amount: total,
          customer: { name: name.trim(), phone: cleanPhone },
          address: getAddress(),
          items: cart.map((item) => ({
            id: item.id,
            size: item.size,
            price: item.price,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.paymentLinkUrl) {
        throw new Error(data.error || "Could not create Razorpay payment link.");
      }

      const session: RazorpayPaymentSession = {
        appOrderId,
        paymentLinkId: data.paymentLinkId,
        paymentLinkUrl: data.paymentLinkUrl,
        referenceId: data.referenceId,
        amount: total,
      };
      setPaymentSession(session);
      await Linking.openURL(data.paymentLinkUrl);
    } catch (error: any) {
      Alert.alert("Payment failed", error.message || "Could not start Razorpay payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const checkPaymentAndPlaceOrder = async () => {
    const error = validateDetails();
    if (error) {
      Alert.alert("Checkout incomplete", error);
      return;
    }

    if (!paymentSession) {
      Alert.alert("Pay first", "Create and complete the Razorpay payment first.");
      return;
    }

    if (paymentSession.amount !== total) {
      setPaymentSession(null);
      Alert.alert("Cart changed", "Create a fresh Razorpay payment link for the updated cart total.");
      return;
    }

    if (!PAYMENT_API_BASE) {
      Alert.alert("Payment backend missing", "EXPO_PUBLIC_PAYMENT_API_BASE is not configured.");
      return;
    }

    setCheckingPayment(true);
    try {
      const response = await fetch(`${PAYMENT_API_BASE}/api/razorpay/check-payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentLinkId: paymentSession.paymentLinkId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not verify payment.");

      if (!data.verified) {
        Alert.alert(
          "Payment not verified yet",
          `Razorpay status: ${data.status || "pending"}. Complete payment, then tap Check Payment again.`
        );
        return;
      }

      const order: Order = {
        id: paymentSession.appOrderId,
        items: cart,
        total,
        customer: { name: name.trim(), phone: phone.replace(/\D/g, ""), address: getAddress() },
        status: "Confirmed",
        paymentStatus: "Verified",
        paymentMethod: "Razorpay",
        utr: data.paymentId || paymentSession.paymentLinkId,
        razorpayPaymentLinkId: paymentSession.paymentLinkId,
        razorpayPaymentId: data.paymentId,
        paymentReferenceId: paymentSession.referenceId,
        createdAt: new Date().toISOString(),
      };

      await addOrder(order);
      setMapPicked(false);
      setMapLabel("");
      setPickedLocation(null);
      setHouseNo("");
      setLandmark("");
      setPaymentSession(null);
      Alert.alert("Order placed", `Payment verified. Order ${order.id} has been sent to admin.`);
    } catch (error: any) {
      Alert.alert("Order failed", error.message || "Could not verify payment or place order.");
    } finally {
      setCheckingPayment(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
          <Text style={styles.headerLabel}>CART & PAYMENT</Text>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerSub}>Map address → Razorpay payment → automatic verification → order confirmation</Text>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Cart Items</Text>
          {cart.length === 0 ? (
            <View style={styles.emptyCard}>
              <ShoppingCart size={34} color={Colors.primary} />
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptyText}>Go to Products and add bottles or jars.</Text>
            </View>
          ) : cart.map((item) => (
            <View key={item.id} style={styles.cartCard}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.size}</Text>
                <Text style={styles.itemUse}>{item.use}</Text>
                <Text style={styles.itemPrice}>₹{item.price} × {item.quantity}</Text>
              </View>
              <View style={styles.qtyBox}>
                <Pressable onPress={() => decreaseQuantity(item.id)} style={styles.qtyButton}><Minus size={14} color={Colors.primary} /></Pressable>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <Pressable onPress={() => {
                  const ok = increaseQuantity(item.id);
                  if (!ok) Alert.alert("Stock limit", "No more stock available for this item.");
                }} style={styles.qtyButton}><Plus size={14} color={Colors.primary} /></Pressable>
              </View>
              <Pressable onPress={() => removeFromCart(item.id)} style={styles.deleteButton}><Trash2 size={17} color={Colors.error} /></Pressable>
            </View>
          ))}

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Items</Text><Text style={styles.summaryValue}>{totalItems}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.totalLabel}>Grand Total</Text><Text style={styles.totalValue}>₹{total}</Text></View>
          </View>

          <Text style={styles.sectionTitle}>Customer Details</Text>
          <View style={styles.formCard}>
            <TextInput value={name} onChangeText={setName} placeholder="Customer name" placeholderTextColor={Colors.muted} style={styles.input} />
            <TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={Colors.muted} keyboardType="phone-pad" maxLength={10} style={styles.input} />
          </View>

          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.formCard}>
            <TouchableOpacity style={styles.mapCard} onPress={pickAddressOnMap} disabled={locationLoading}>
              <View style={styles.mapPin}><MapPin size={24} color={Colors.white} /></View>
              <Text style={styles.mapTitle}>{locationLoading ? "Finding your location..." : mapPicked ? "Location pinned" : "Pin current location"}</Text>
              <Text style={styles.mapText}>{mapPicked ? mapLabel : "Tap to capture your GPS pin and preview it in Google Maps."}</Text>
              <View style={styles.mapButton}><Navigation size={14} color={Colors.primary} /><Text style={styles.mapButtonText}>{locationLoading ? "Getting GPS" : mapPicked ? "Preview Map" : "Use GPS"}</Text></View>
            </TouchableOpacity>
            <TextInput value={houseNo} onChangeText={setHouseNo} placeholder="Flat / house no / floor / building" placeholderTextColor={Colors.muted} style={styles.input} />
            <TextInput value={landmark} onChangeText={setLandmark} placeholder="Landmark (optional)" placeholderTextColor={Colors.muted} style={styles.input} />
            <View style={styles.labelRow}>
              {(["Home", "Work", "Other"] as AddressLabel[]).map((label) => (
                <TouchableOpacity key={label} style={[styles.labelChip, addressLabel === label && styles.labelChipActive]} onPress={() => setAddressLabel(label)}>
                  {label === "Home" ? <Home size={14} color={addressLabel === label ? Colors.white : Colors.primary} /> : <Briefcase size={14} color={addressLabel === label ? Colors.white : Colors.primary} />}
                  <Text style={[styles.labelChipText, addressLabel === label && styles.labelChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.paymentCard}>
            <CreditCard size={34} color={Colors.primary} />
            <Text style={styles.bankTitle}>Secure Razorpay Checkout</Text>
            <Text style={styles.paymentHint}>Order is created only after Razorpay confirms the payment. No UTR entry or manual admin trust needed.</Text>
            {paymentSession ? (
              <View style={styles.bankDetailsBox}>
                <View style={styles.bankRow}><Text style={styles.bankLabel}>Payment Link</Text><Text style={styles.bankVal}>Created</Text></View>
                <View style={styles.bankRow}><Text style={styles.bankLabel}>Reference</Text><Text style={styles.bankVal}>{paymentSession.referenceId}</Text></View>
                <View style={styles.bankRow}><Text style={styles.bankLabel}>Amount</Text><Text style={styles.bankVal}>₹{paymentSession.amount}</Text></View>
              </View>
            ) : null}

            <TouchableOpacity style={[styles.payButton, (cart.length === 0 || paymentLoading) && styles.disabledButton]} onPress={createRazorpayPayment} disabled={cart.length === 0 || paymentLoading}>
              <ExternalLink size={18} color={Colors.white} />
              <Text style={styles.payButtonText}>{paymentLoading ? "Creating payment..." : paymentSession ? "Open Razorpay Again" : `Pay ₹${total} with Razorpay`}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.confirmButton, (!paymentSession || checkingPayment || cart.length === 0) && styles.disabledButton]} onPress={checkPaymentAndPlaceOrder} disabled={!paymentSession || checkingPayment || cart.length === 0}>
              <RefreshCw size={18} color={Colors.white} />
              <Text style={styles.payButtonText}>{checkingPayment ? "Checking payment..." : "Check Payment & Place Order"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Order History</Text>
          {displayedOrders.length === 0 ? <Text style={styles.noOrders}>No previous orders yet.</Text> : displayedOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <Text style={styles.orderId}>{order.id}</Text>
                <View style={styles.confirmedPill}><Text style={styles.confirmedText}>{order.status}</Text></View>
              </View>
              <Text style={styles.orderText}>{new Date(order.createdAt).toLocaleString()} • ₹{order.total} • {order.paymentMethod}</Text>
              <Text style={styles.orderText}>Payment: {order.paymentStatus || "Pending"} • Ref: {order.utr || order.razorpayPaymentLinkId || "Not added"}</Text>
              <Text style={styles.orderText}>{order.items.map((item) => `${item.size}×${item.quantity}`).join(", ")}</Text>
              <Text style={styles.orderText}>{order.customer.address.label}: {order.customer.address.houseNo}, {order.customer.address.mapLabel}{order.customer.address.landmark ? `, near ${order.customer.address.landmark}` : ""}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 34 },
  headerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 2, color: "rgba(255,255,255,0.7)", marginBottom: 10 },
  headerTitle: { fontSize: 30, fontWeight: "800", color: Colors.white },
  headerSub: { marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 20 },
  content: { padding: 20, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: Colors.foreground, marginTop: 8 },
  emptyCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 22, alignItems: "center", borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: Colors.foreground, marginTop: 10 },
  emptyText: { fontSize: 13, color: Colors.muted, marginTop: 4 },
  cartCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  itemEmoji: { fontSize: 26 }, itemName: { fontSize: 15, fontWeight: "800", color: Colors.foreground }, itemUse: { fontSize: 12, color: Colors.muted, marginTop: 2 }, itemPrice: { fontSize: 13, fontWeight: "800", color: Colors.secondary, marginTop: 5 },
  qtyBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.mutedBg, borderRadius: Radius.full, padding: 4, gap: 7 },
  qtyButton: { width: 26, height: 26, borderRadius: Radius.full, alignItems: "center", justifyContent: "center", backgroundColor: Colors.white },
  qtyText: { minWidth: 14, textAlign: "center", fontWeight: "800", color: Colors.foreground }, deleteButton: { padding: 5 },
  summaryCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10, ...Shadow.card },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, summaryLabel: { color: Colors.muted, fontSize: 14 }, summaryValue: { color: Colors.foreground, fontSize: 15, fontWeight: "800" }, totalLabel: { color: Colors.foreground, fontSize: 17, fontWeight: "800" }, totalValue: { color: Colors.secondary, fontSize: 22, fontWeight: "900" },
  formCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  input: { backgroundColor: Colors.mutedBg, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.foreground },
  mapCard: { backgroundColor: Colors.mutedBg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 18, alignItems: "center" },
  mapPin: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  mapTitle: { fontSize: 16, fontWeight: "900", color: Colors.foreground }, mapText: { fontSize: 12, color: Colors.muted, textAlign: "center", marginTop: 5 },
  mapButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.white, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 }, mapButtonText: { color: Colors.primary, fontWeight: "900", fontSize: 12 },
  labelRow: { flexDirection: "row", gap: 8 }, labelChip: { flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, paddingVertical: 10 }, labelChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary }, labelChipText: { color: Colors.primary, fontWeight: "800", fontSize: 12 }, labelChipTextActive: { color: Colors.white },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, methodCard: { width: "47%", backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, alignItems: "center", gap: 6, borderWidth: 2, borderColor: Colors.border, position: "relative", ...Shadow.card }, methodCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary }, methodEmoji: { fontSize: 22 }, methodLabel: { fontSize: 12, fontWeight: "700", color: Colors.foreground, textAlign: "center" }, methodLabelActive: { color: Colors.white }, methodCheck: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 8, padding: 2 },
  paymentCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, alignItems: "center", borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  paymentHint: { marginTop: 8, fontSize: 12, color: Colors.muted, textAlign: "center", lineHeight: 18 }, appPayIcon: { fontSize: 48, marginBottom: 4 }, bankTitle: { fontSize: 16, fontWeight: "800", color: Colors.foreground, marginBottom: 12 }, bankDetailsBox: { width: "100%", backgroundColor: Colors.mutedBg, borderRadius: Radius.md, padding: 14, gap: 8 }, bankRow: { flexDirection: "row", justifyContent: "space-between" }, bankLabel: { fontSize: 12, color: Colors.muted, fontWeight: "500" }, bankVal: { fontSize: 13, fontWeight: "800", color: Colors.foreground },
  payButton: { marginTop: 14, backgroundColor: Colors.secondary, borderRadius: Radius.full, paddingVertical: 13, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }, confirmButton: { marginTop: 10, backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 13, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }, disabledButton: { opacity: 0.5 }, payButtonText: { color: Colors.white, fontSize: 14, fontWeight: "900" }, utrInput: { width: "100%", marginTop: 12 },
  noOrders: { color: Colors.muted, fontSize: 13, marginBottom: 6 }, orderCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, ...Shadow.card }, orderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, orderId: { fontSize: 14, fontWeight: "900", color: Colors.foreground }, confirmedPill: { backgroundColor: Colors.secondary + "18", borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 4 }, confirmedText: { fontSize: 11, fontWeight: "900", color: Colors.secondary }, orderText: { fontSize: 12, color: Colors.muted, marginTop: 3, lineHeight: 17 },
});
