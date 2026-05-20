import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft, Bell, PackagePlus, Save, Trash2 } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Product, useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const emptyProduct = (): Product => ({
  id: `product-${Date.now()}`,
  size: "",
  use: "",
  emoji: "💧",
  price: 0,
  stock: 0,
  isActive: true,
  imageUrl: "",
});

export default function AdminScreen() {
  const { user, isLoading } = useAuth();
  const { products, saveProduct, deleteProduct, orders, updateOrderStatus, firebaseReady, adminNotifications, unreadAdminNotifications, markAdminNotificationRead } = useCart();
  const [draft, setDraft] = useState<Product>(emptyProduct());

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.replace("/login");
    }
  }, [isLoading, user]);

  if (isLoading || !user || user.role !== "admin") {
    return null;
  }

  const editProduct = (product: Product) => setDraft({ ...product });

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  const saveDraft = async () => {
    if (!draft.size.trim() || !draft.use.trim()) {
      Alert.alert("Missing details", "Enter product size/name and description.");
      return;
    }
    if (Number.isNaN(Number(draft.price)) || Number(draft.price) <= 0) {
      Alert.alert("Invalid price", "Enter a valid price.");
      return;
    }
    await saveProduct({
      ...draft,
  emoji: draft.emoji || "💧",
      price: Number(draft.price),
      stock: Math.max(0, Number(draft.stock)),
      imageUrl: draft.imageUrl?.trim() || undefined,
    });
    setDraft(emptyProduct());
    Alert.alert("Saved", "Inventory updated.");
  };

  const removeProduct = (id: string) => {
    Alert.alert("Delete product", "Remove this product from inventory?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteProduct(id) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <ArrowLeft size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>ADMIN PANEL</Text>
          <Text style={styles.headerTitle}>Inventory Manager</Text>
          <Text style={styles.headerSub}>Add inventory, receive new order alerts, verify payment and send orders.</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <Stat label="Products" value={String(products.length)} />
            <Stat label="Orders" value={String(orders.length)} />
            <Stat label="Unread" value={String(unreadAdminNotifications)} />
          </View>

          <View style={styles.firebaseBox}>
            <Text style={styles.firebaseText}>{firebaseReady ? "Firebase connected: products, orders and admin alerts sync live." : "Firebase not configured yet: using local storage fallback."}</Text>
          </View>


          <Text style={styles.sectionTitle}>Admin Notifications</Text>
          {adminNotifications.length === 0 ? (
            <View style={styles.formCard}><Text style={styles.emptyText}>No new order notifications yet.</Text></View>
          ) : adminNotifications.slice(0, 10).map((note) => (
            <View key={note.id} style={[styles.notificationCard, !note.read && styles.notificationUnread]}>
              <View style={styles.notificationIcon}>
                <Bell size={18} color={Colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productTitle}>{note.title}</Text>
                <Text style={styles.productSub}>{(note as any).message2 || note.message}</Text>
                <Text style={styles.productMeta}>Order: {note.orderId} • ₹{note.total}</Text>
              </View>
              {!note.read ? (
                <TouchableOpacity style={styles.editBtn} onPress={() => markAdminNotificationRead(note.id)}>
                  <Text style={styles.editText}>Read</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          <Text style={styles.sectionTitle}>{products.some((p) => p.id === draft.id) ? "Edit Product" : "Add Product"}</Text>
          <View style={styles.formCard}>
            <TextInput style={styles.input} placeholder="Product size / name e.g. 500 ml" placeholderTextColor={Colors.muted} value={draft.size} onChangeText={(size) => setDraft((d) => ({ ...d, size }))} />
            <TextInput style={styles.input} placeholder="Use / subtitle e.g. Everyday carry" placeholderTextColor={Colors.muted} value={draft.use} onChangeText={(use) => setDraft((d) => ({ ...d, use }))} />
            <View style={styles.twoCols}>
              <TextInput style={[styles.input, styles.colInput]} placeholder="Price" placeholderTextColor={Colors.muted} keyboardType="numeric" value={String(draft.price || "")} onChangeText={(price) => setDraft((d) => ({ ...d, price: Number(price) || 0 }))} />
              <TextInput style={[styles.input, styles.colInput]} placeholder="Stock" placeholderTextColor={Colors.muted} keyboardType="numeric" value={String(draft.stock || "")} onChangeText={(stock) => setDraft((d) => ({ ...d, stock: Number(stock) || 0 }))} />
            </View>
            <TextInput style={styles.input} placeholder="Image URL (optional)" placeholderTextColor={Colors.muted} value={draft.imageUrl || ""} onChangeText={(imageUrl) => setDraft((d) => ({ ...d, imageUrl }))} keyboardType="url" autoCapitalize="none" />
            {draft.imageUrl?.trim() ? <Image source={{ uri: draft.imageUrl.trim() }} style={styles.previewImage} /> : null}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchText}>Visible to customers</Text>
                <Text style={styles.switchHint}>{draft.isActive ? "Customers can add this product." : "Hidden from the Products screen."}</Text>
              </View>
              <Switch
                value={draft.isActive}
                onValueChange={(isActive) => setDraft((d) => ({ ...d, isActive }))}
                trackColor={{ false: Colors.border, true: Colors.primary + "66" }}
                thumbColor={draft.isActive ? Colors.primary : Colors.muted}
              />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveDraft}>
              <Save size={17} color={Colors.white} />
              <Text style={styles.saveText}>Save Product</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={() => setDraft(emptyProduct())}>
              <PackagePlus size={16} color={Colors.primary} />
              <Text style={styles.resetText}>Clear / Add New</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Current Inventory</Text>
          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.productImage} /> : <Text style={styles.productEmoji}>{product.emoji}</Text>}
              <View style={{ flex: 1 }}>
                <Text style={styles.productTitle}>{product.size}</Text>
                <Text style={styles.productSub}>{product.use}</Text>
                <Text style={styles.productMeta}>₹{product.price} • Stock {product.stock} • {product.isActive ? "Visible" : "Hidden"}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => editProduct(product)}><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => removeProduct(product.id)}><Trash2 size={16} color={Colors.error} /></TouchableOpacity>
              </View>
            </View>
          ))}


          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {orders.length === 0 ? (
            <View style={styles.formCard}><Text style={styles.emptyText}>No orders yet.</Text></View>
          ) : orders.slice(0, 20).map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productTitle}>{order.id}</Text>
                <Text style={styles.productSub}>{order.customer?.name} • {order.customer?.phone}</Text>
                <Text style={styles.productMeta}>₹{order.total} • {order.status} • {order.paymentStatus || "Pending Verification"}</Text>
                <Text style={styles.productSub}>UTR: {order.utr || "Not added"}</Text>
                <Text style={styles.productSub}>{order.items.map((item) => `${item.size}×${item.quantity}`).join(", ")}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => updateOrderStatus(order.id, "Confirmed", "Verified")}>
                  <Text style={styles.editText}>Verify</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => updateOrderStatus(order.id, "Order Sent", "Verified")}>
                  <Text style={styles.editText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => updateOrderStatus(order.id, "Delivered", "Verified")}>
                  <Text style={styles.editText}>Delivered</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => updateOrderStatus(order.id, "Cancelled", "Rejected")}>
                  <Text style={styles.rejectText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 34 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  headerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 2, color: "rgba(255,255,255,0.7)", marginBottom: 10 },
  headerTitle: { fontSize: 30, fontWeight: "900", color: Colors.white },
  headerSub: { marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 20 },
  content: { padding: 20, gap: 12 },
  statsGrid: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  statValue: { fontSize: 22, fontWeight: "900", color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: Colors.foreground, marginTop: 10 },
  formCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  input: { backgroundColor: Colors.mutedBg, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.foreground },
  twoCols: { flexDirection: "row", gap: 10 },
  colInput: { flex: 1 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  switchText: { fontWeight: "800", color: Colors.foreground },
  switchHint: { color: Colors.muted, fontSize: 12, marginTop: 3 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  saveText: { color: Colors.white, fontWeight: "900" },
  resetBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  resetText: { color: Colors.primary, fontWeight: "900" },
  firebaseBox: { backgroundColor: Colors.primary + "12", borderRadius: Radius.lg, padding: 12, borderWidth: 1, borderColor: Colors.primary + "22" },
  firebaseText: { color: Colors.primary, fontWeight: "800", fontSize: 12, lineHeight: 17 },
  emptyText: { color: Colors.muted, fontSize: 13 },
  notificationCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  notificationUnread: { borderColor: Colors.primary + "66", backgroundColor: Colors.primary + "08" },
  notificationIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  productCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  previewImage: { width: "100%", height: 150, borderRadius: Radius.md, backgroundColor: Colors.mutedBg },
  productImage: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.mutedBg },
  productEmoji: { fontSize: 28 },
  productTitle: { fontSize: 16, fontWeight: "900", color: Colors.foreground },
  productSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  productMeta: { fontSize: 12, fontWeight: "800", color: Colors.secondary, marginTop: 6 },
  orderCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  actions: { alignItems: "center", gap: 8 },
  editBtn: { backgroundColor: Colors.mutedBg, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 8 },
  editText: { color: Colors.primary, fontWeight: "900", fontSize: 12 },
  deleteBtn: { padding: 8 },
  rejectText: { color: Colors.error, fontWeight: "900", fontSize: 12 },
});
