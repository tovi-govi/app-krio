import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Package, Eye, EyeOff, Factory, Layers } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Product, useCart, getProductTotalStockAcrossPlants, getPlantProductStock } from "@/context/CartContext";
import { SkeletonList } from "@/components/UI/Skeleton";
import Toast, { ToastMessage } from "@/components/UI/Toast";

export default function AdminInventoryScreen() {
  const { products, plants, saveProduct, firebaseReady } = useCart();
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Compute overall inventory metrics across all plants
  const inventorySummary = useMemo(() => {
    let totalStockAllPlants = 0;

    const productSummaries = products.map((prod) => {
      const combinedStock = getProductTotalStockAcrossPlants(prod.id, plants, prod.stock);
      totalStockAllPlants += combinedStock;

      const plantBreakdown = plants.map((plant) => ({
        plantId: plant.id,
        plantName: plant.name,
        stock: getPlantProductStock(plant, prod.id, prod.stock),
      }));

      return {
        ...prod,
        combinedStock,
        plantBreakdown,
      };
    });

    return {
      totalPlants: plants.length,
      totalProducts: products.length,
      totalStockAllPlants,
      productSummaries,
    };
  }, [products, plants]);

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

      {/* Header Banner */}
      <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
        <View style={styles.headerTop}>
          <Package size={24} color={Colors.white} />
          <Text style={styles.headerTitle}>Combined Inventory Dashboard</Text>
        </View>
        <Text style={styles.headerSub}>
          Real-time total stock aggregated across all bottling plant facilities. Quantities update automatically as deliveries are recorded.
        </Text>
      </LinearGradient>

      {/* Quick Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconBox}>
            <Factory size={18} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.summaryValue}>{inventorySummary.totalPlants}</Text>
            <Text style={styles.summaryLabel}>Total Plants</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIconBox}>
            <Layers size={18} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.summaryValue}>{inventorySummary.totalProducts}</Text>
            <Text style={styles.summaryLabel}>Product Sizes</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIconBox}>
            <Package size={18} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.summaryValue}>{inventorySummary.totalStockAllPlants}</Text>
            <Text style={styles.summaryLabel}>Combined Total Stock</Text>
          </View>
        </View>
      </View>

      {/* Product Inventory List */}
      <Text style={styles.sectionTitle}>Product Stock Across Facilities</Text>

      {products.length === 0 && !firebaseReady ? (
        <SkeletonList count={3} />
      ) : inventorySummary.productSummaries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Package size={32} color={Colors.muted} />
          <Text style={styles.emptyTitle}>No inventory products found</Text>
          <Text style={styles.emptyText}>Default products will automatically seed on startup.</Text>
        </View>
      ) : (
        inventorySummary.productSummaries.map((product) => (
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

            {/* Combined Stock Metric */}
            <View style={styles.cardMetricsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>Total Combined Stock</Text>
                <Text style={styles.stockValueDisplay}>{product.combinedStock} units</Text>
              </View>
            </View>

            {/* Per-Plant Stock Breakdown */}
            <View style={styles.plantBreakdownBox}>
              <Text style={styles.plantBreakdownTitle}>Stock Breakdown By Bottling Plant</Text>
              <View style={styles.plantChipsContainer}>
                {product.plantBreakdown.map((pb) => (
                  <View key={pb.plantId} style={styles.plantChip}>
                    <Factory size={12} color={Colors.primary} />
                    <Text style={styles.plantChipName}>{pb.plantName}:</Text>
                    <Text style={styles.plantChipStock}>{pb.stock} units</Text>
                  </View>
                ))}
              </View>
            </View>
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
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { color: Colors.white, fontSize: 24, fontWeight: "900" },
  headerSub: { color: Colors.white, fontSize: 13, lineHeight: 20, opacity: 0.9 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: { fontSize: 18, fontWeight: "900", color: Colors.primary },
  summaryLabel: { fontSize: 11, color: Colors.muted, marginTop: 2, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: Colors.foreground, marginTop: 8 },
  productCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.soft,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emojiText: { fontSize: 28 },
  productTitle: { fontSize: 16, fontWeight: "900", color: Colors.foreground },
  productSub: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badgeActive: { backgroundColor: Colors.primary + "10", borderColor: Colors.primary + "30" },
  badgeHidden: { backgroundColor: Colors.mutedBg, borderColor: Colors.border },
  statusBadgeText: { fontSize: 11, fontWeight: "800" },
  badgeTextActive: { color: Colors.primary },
  badgeTextHidden: { color: Colors.muted },
  cardMetricsRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stockLevelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  stockLevelText: {
    fontSize: 12,
    fontWeight: "900",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 11, color: Colors.muted, fontWeight: "700" },
  stockValueDisplay: { fontSize: 18, fontWeight: "900", color: Colors.primary, marginTop: 4 },
  plantBreakdownBox: {
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.lg,
    padding: 12,
    gap: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  plantBreakdownTitle: { fontSize: 12, fontWeight: "800", color: Colors.foreground },
  plantChipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  plantChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  plantChipName: { fontSize: 12, color: Colors.muted, fontWeight: "700" },
  plantChipStock: { fontSize: 12, color: Colors.primary, fontWeight: "900" },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.soft,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: Colors.foreground },
  emptyText: { color: Colors.muted, fontSize: 12 },
});
