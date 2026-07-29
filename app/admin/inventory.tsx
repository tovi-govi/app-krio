import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { useCart } from "@/context/CartContext";

export default function AdminInventoryScreen() {
  const { products, deleteProduct } = useCart();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <Text style={styles.headerSub}>Review stock, pricing, and product availability for the delivery hub.</Text>
      </LinearGradient>

      {products.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No inventory products have been added yet.</Text>
        </View>
      ) : (
        products.map((product) => (
          <View key={product.id} style={styles.productCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productTitle}>{product.size}</Text>
              <Text style={styles.productSub}>{product.use}</Text>
              <Text style={styles.productMeta}>₹{product.price} • Stock {product.stock} • {product.isActive ? "Live" : "Hidden"}</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteProduct(product.id)}>
              <Trash2 size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 140, gap: 16, maxWidth: 960, width: "100%", alignSelf: "center" },
  header: { borderRadius: Radius.xl, padding: 24, gap: 12, marginBottom: 4 },
  headerTitle: { color: Colors.white, fontSize: 24, fontWeight: "900" },
  headerSub: { color: Colors.white, fontSize: 13, lineHeight: 20 },
  productCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft },
  productTitle: { fontSize: 16, fontWeight: "900", color: Colors.foreground },
  productSub: { fontSize: 13, color: Colors.muted, marginTop: 4 },
  productMeta: { fontSize: 13, color: Colors.secondary, fontWeight: "700", marginTop: 8 },
  deleteBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.error + "15", alignItems: "center", justifyContent: "center" },
  emptyCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 24, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft, alignItems: "center" },
  emptyText: { color: Colors.muted, fontSize: 13 },
});
