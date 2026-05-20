import { View, Text, ScrollView, StyleSheet, Pressable, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Droplets, ShieldCheck, Leaf, Plus, Minus } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { useCart } from "@/context/CartContext";

const BADGES = [
  { label: "BIS Compliant", icon: ShieldCheck },
  { label: "Advanced Purification", icon: Droplets },
  { label: "Eco Packaging", icon: Leaf },
];

const WHY = [
  { title: "Pure & Mineral Balanced", body: "Multi-stage purification keeps essential minerals intact for great taste.", color: Colors.primary },
  { title: "Hygienic & Safe", body: "Sealed in a sanitised environment — safety you can see and taste.", color: Colors.secondary },
  { title: "Consistent Quality", body: "Every batch meets strict BIS standards. No surprises, just clean water.", color: Colors.primaryGlow },
  { title: "Reliable Service", body: "On-time delivery and friendly support across Telangana.", color: Colors.secondary },
];

export default function ProductsScreen() {
  const { products, addToCart, cart, increaseQuantity, decreaseQuantity } = useCart();
  const visibleProducts = products.filter((product) => product.isActive);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.header}
        >
          <Text style={styles.headerLabel}>OUR PRODUCT RANGE</Text>
          <Text style={styles.headerTitle}>
            One source.{"\n"}
            <Text style={{ color: "rgba(255,255,255,0.65)" }}>
              Five thoughtful sizes.
            </Text>
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Pack Sizes</Text>
          {visibleProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No products available</Text>
              <Text style={styles.emptyText}>Please check back soon.</Text>
            </View>
          ) : visibleProducts.map((s, i) => {
            const cartItem = cart.find((item) => item.id === s.id);
            const qty = cartItem ? cartItem.quantity : 0;
            const outOfStock = s.stock <= 0;
            const maxed = qty >= s.stock;
            return (
              <View key={s.id} style={styles.sizeCard}>
                <View style={styles.sizeNumber}>
                  <Text style={styles.sizeNumberText}>0{i + 1}</Text>
                </View>
                {s.imageUrl ? <Image source={{ uri: s.imageUrl }} style={styles.sizeImage} /> : <Text style={styles.sizeEmoji}>{s.emoji}</Text>}
                <View style={{ flex: 1 }}>
                  <Text style={styles.sizeName}>{s.size}</Text>
                  <Text style={styles.sizeUse}>{s.use}</Text>
                  <Text style={styles.priceText}>₹{s.price}</Text>
                  <Text style={[styles.stockText, outOfStock && styles.outStockText]}>
                    {outOfStock ? "Out of stock" : `${s.stock} in stock`}
                  </Text>
                </View>
                {qty === 0 ? (
                  <Pressable
                    style={[styles.addButton, outOfStock && styles.disabledButton]}
                    disabled={outOfStock}
                    onPress={() => {
                      const ok = addToCart(s);
                      Alert.alert(ok ? "Added to cart" : "Out of stock", ok ? `${s.size} has been added.` : "This product is not available right now.");
                    }}
                  >
                    <Plus size={15} color={Colors.white} />
                    <Text style={styles.addButtonText}>{outOfStock ? "Sold" : "Add"}</Text>
                  </Pressable>
                ) : (
                  <View style={styles.qtyControl}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => decreaseQuantity(s.id)}
                    >
                      <Minus size={14} color={Colors.primary} />
                    </Pressable>
                    <Text style={styles.qtyNum}>{qty}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => {
                        const ok = increaseQuantity(s.id);
                        if (!ok) Alert.alert("Stock limit", "You have added all available stock for this item.");
                      }}
                    >
                      <Plus size={14} color={Colors.primary} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          <View style={styles.badgesRow}>
            {BADGES.map(({ label, icon: Icon }) => (
              <View key={label} style={styles.badge}>
                <Icon size={16} color={Colors.secondary} />
                <Text style={styles.badgeText}>{label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Why Krio-H₂O</Text>
          <View style={styles.whyGrid}>
            {WHY.map((w) => (
              <View key={w.title} style={styles.whyCard}>
                <View style={[styles.whyDot, { backgroundColor: w.color }]} />
                <Text style={styles.whyTitle}>{w.title}</Text>
                <Text style={styles.whyBody}>{w.body}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.white,
    lineHeight: 38,
  },
  content: { padding: 20, gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.foreground,
    marginTop: 8,
    marginBottom: 4,
  },
  sizeCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  sizeNumber: {
    width: 32,
    alignItems: "center",
  },
  sizeNumberText: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.border,
  },
  sizeImage: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.mutedBg },
  sizeEmoji: { fontSize: 26 },
  emptyCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 18, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: Colors.foreground },
  emptyText: { fontSize: 13, color: Colors.muted, marginTop: 4 },
  sizeName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.foreground,
  },
  sizeUse: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.secondary,
    marginTop: 6,
  },
  stockText: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 3,
  },
  outStockText: {
    color: Colors.error,
    fontWeight: "800",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  disabledButton: { opacity: 0.5 },
  addButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.white,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.full,
    padding: 4,
    gap: 6,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qtyNum: {
    minWidth: 18,
    textAlign: "center",
    fontWeight: "800",
    fontSize: 14,
    color: Colors.foreground,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginVertical: 4,
  },
  badge: {
    flex: 1,
    minWidth: "30%",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.foreground,
    textAlign: "center",
  },
  whyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  whyCard: {
    width: "48%",
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  whyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  whyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.foreground,
    marginBottom: 6,
  },
  whyBody: {
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 18,
  },
});
