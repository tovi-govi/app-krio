import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Package, Eye, EyeOff, Edit2, Check } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Product, useCart } from "@/context/CartContext";
import Toast, { ToastMessage } from "@/components/UI/Toast";

export default function AdminInventoryScreen() {
  const { products, saveProduct } = useCart();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editStock, setEditStock] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const startEditing = (p: Product) => {
    setEditingProductId(p.id);
    setEditPrice(String(p.price));
    setEditStock(String(p.stock));
  };

  const cancelEditing = () => {
    setEditingProductId(null);
    setEditPrice("");
    setEditStock("");
  };

  const handleSaveProductEdit = async (p: Product) => {
    if (isSubmitting) return;

    const newPrice = Number(editPrice);
    const newStock = Number(editStock);

    if (isNaN(newPrice) || newPrice < 0) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Invalid Price",
        message: "Please enter a valid price.",
      });
      return;
    }

    if (isNaN(newStock) || newStock < 0) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Invalid Stock",
        message: "Please enter a valid stock quantity.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await saveProduct({
        ...p,
        price: newPrice,
        stock: newStock,
      });

      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Inventory Updated",
        message: `${p.size} updated: ₹${newPrice} • Stock: ${newStock}`,
      });
      cancelEditing();
    } catch (error: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Update Failed",
        message: error.message || "Could not update product.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (p: Product) => {
    const nextActive = !p.isActive;
    try {
      await saveProduct({
        ...p,
        isActive: nextActive,
      });
      setToast({
        id: Date.now().toString(),
        type: "info",
        title: nextActive ? "Product Live" : "Product Hidden",
        message: `${p.size} is now ${nextActive ? "visible to staff" : "hidden from store"}.`,
      });
    } catch (error: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Status Update Failed",
        message: error.message || "Could not toggle product visibility.",
      });
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
        <View style={styles.headerTop}>
          <Package size={24} color={Colors.white} />
          <Text style={styles.headerTitle}>Inventory Management</Text>
        </View>
        <Text style={styles.headerSub}>Manage plant stock levels, update pricing, and control product availability in real-time.</Text>
      </LinearGradient>

      {products.length === 0 ? (
        <View style={styles.emptyCard}>
          <Package size={32} color={Colors.muted} />
          <Text style={styles.emptyTitle}>No inventory products found</Text>
          <Text style={styles.emptyText}>Default products will automatically seed on startup.</Text>
        </View>
      ) : (
        products.map((product) => {
          const isEditingThis = editingProductId === product.id;

          return (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.emojiText}>{product.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productTitle}>{product.size}</Text>
                  <Text style={styles.productSub}>{product.use}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.statusBadge, product.isActive ? styles.badgeActive : styles.badgeHidden]}
                  onPress={() => handleToggleActive(product)}
                  accessibilityLabel="Toggle Visibility"
                >
                  {product.isActive ? <Eye size={12} color={Colors.primary} /> : <EyeOff size={12} color={Colors.muted} />}
                  <Text style={[styles.statusBadgeText, product.isActive ? styles.badgeTextActive : styles.badgeTextHidden]}>
                    {product.isActive ? "Live" : "Hidden"}
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditingThis ? (
                /* Inline Edit Form */
                <View style={styles.editCard}>
                  <Text style={styles.editSectionTitle}>Edit Pricing & Stock</Text>
                  <View style={styles.editInputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Price (₹)</Text>
                      <TextInput
                        style={styles.input}
                        value={editPrice}
                        onChangeText={setEditPrice}
                        keyboardType="numeric"
                        placeholder="Price"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Stock Quantity</Text>
                      <TextInput
                        style={styles.input}
                        value={editStock}
                        onChangeText={setEditStock}
                        keyboardType="numeric"
                        placeholder="Stock"
                      />
                    </View>
                  </View>
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelEditing}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={() => handleSaveProductEdit(product)}>
                      <Check size={16} color={Colors.white} />
                      <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Standard Display Row */
                <View style={styles.cardDetailsRow}>
                  <View style={styles.priceBox}>
                    <Text style={styles.priceLabel}>Price</Text>
                    <Text style={styles.priceValue}>₹{product.price}</Text>
                  </View>

                  <View style={styles.stockBox}>
                    <Text style={styles.priceLabel}>Available Stock</Text>
                    <Text style={styles.stockValueDisplay}>{product.stock} units</Text>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => startEditing(product)} accessibilityLabel="Edit Product">
                      <Edit2 size={16} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 140, gap: 16, maxWidth: 960, width: "100%", alignSelf: "center" },
  header: { borderRadius: Radius.xl, padding: 24, gap: 12, marginBottom: 4 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { color: Colors.white, fontSize: 24, fontWeight: "900" },
  headerSub: { color: Colors.white, fontSize: 13, lineHeight: 20, opacity: 0.9 },
  productCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 18, gap: 14, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emojiText: { fontSize: 28 },
  productTitle: { fontSize: 16, fontWeight: "900", color: Colors.foreground },
  productSub: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  badgeActive: { backgroundColor: Colors.primary + "10", borderColor: Colors.primary + "30" },
  badgeHidden: { backgroundColor: Colors.mutedBg, borderColor: Colors.border },
  statusBadgeText: { fontSize: 11, fontWeight: "800" },
  badgeTextActive: { color: Colors.primary },
  badgeTextHidden: { color: Colors.muted },
  cardDetailsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  priceBox: { minWidth: 70 },
  priceLabel: { fontSize: 11, color: Colors.muted, fontWeight: "700" },
  priceValue: { fontSize: 16, fontWeight: "900", color: Colors.secondary, marginTop: 4 },
  stockBox: { flex: 1, gap: 4 },
  stockValueDisplay: { fontSize: 16, fontWeight: "900", color: Colors.foreground, marginTop: 4 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary + "12", alignItems: "center", justifyContent: "center" },
  editCard: { backgroundColor: Colors.mutedBg, borderRadius: Radius.lg, padding: 14, gap: 12, marginTop: 4, borderWidth: 1, borderColor: Colors.border },
  editSectionTitle: { fontSize: 13, fontWeight: "800", color: Colors.foreground },
  editInputRow: { flexDirection: "row", gap: 12 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: Colors.muted, marginBottom: 4 },
  input: { backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontWeight: "800", color: Colors.foreground, borderWidth: 1, borderColor: Colors.border },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontSize: 12, fontWeight: "800", color: Colors.muted },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.primary },
  saveText: { fontSize: 12, fontWeight: "900", color: Colors.white },
  emptyCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 24, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: Colors.foreground },
  emptyText: { color: Colors.muted, fontSize: 12 },
});
