import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ClipboardList, PackageCheck, Truck, Tag } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { useCart, getOrganizationProductPrice } from "@/context/CartContext";
import { calculateDeliveryRowAmount } from "@/utils/invoiceAggregator";
import { useAuth } from "@/context/AuthContext";
import SearchInput from "@/components/UI/SearchInput";

export default function OrganizationOrdersScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { products, orders, deliveries, organizations } = useCart();
  const [deliverySearchText, setDeliverySearchText] = useState("");

  const organization = useMemo(
    () => (id ? organizations.find((org) => org.id === id) : undefined),
    [organizations, id]
  );

  const organizationOrders = useMemo(() => {
    if (!id) return [];
    const orgName = organization?.name?.toLowerCase() || "";
    return orders.filter(
      (order) =>
        order.organizationId === id ||
        (orgName && order.organizationName?.toLowerCase() === orgName)
    );
  }, [orders, id, organization?.name]);

  const organizationDeliveries = useMemo(() => {
    if (!id) return [];
    const orgName = organization?.name?.toLowerCase() || "";
    return deliveries.filter(
      (delivery) =>
        delivery.organizationId === id ||
        (orgName && delivery.organizationName?.toLowerCase() === orgName)
    );
  }, [deliveries, id, organization?.name]);

  const [visibleDeliveryCount, setVisibleDeliveryCount] = useState(25);

  const filteredDeliveries = useMemo(() => {
    if (!deliverySearchText.trim()) return organizationDeliveries;
    const query = deliverySearchText.toLowerCase();
    return organizationDeliveries.filter(
      (d) =>
        d.deliveredBy.toLowerCase().includes(query) ||
        (d.createdAt && new Date(d.createdAt).toLocaleDateString().includes(query))
    );
  }, [organizationDeliveries, deliverySearchText]);

  const visibleDeliveries = useMemo(() => {
    return filteredDeliveries.slice(0, visibleDeliveryCount);
  }, [filteredDeliveries, visibleDeliveryCount]);

  const orgStats = useMemo(() => {
    const fullFromDeliveries = organizationDeliveries.reduce((sum, d) => sum + d.fullCansLoaded, 0);
    const emptyFromDeliveries = organizationDeliveries.reduce((sum, d) => sum + d.emptyCansReturned, 0);
    const fullFromOrders = organizationOrders.reduce((sum, o) => sum + o.items.reduce((q, i) => q + i.quantity, 0), 0);
    const emptyFromOrders = organizationOrders.reduce((sum, o) => sum + (o.emptyCansReturned ?? 0), 0);

    const totalDeliveryValue = organizationDeliveries.reduce((sum, d) => {
      return (
        sum +
        calculateDeliveryRowAmount(
          d.fullCansLoaded,
          d.cases200mlDelivered || 0,
          d.cases500mlDelivered || 0,
          d.cases1lDelivered || 0,
          organization,
          products
        )
      );
    }, 0);

    return {
      totalDeliveries: organizationDeliveries.length,
      totalOrders: organizationOrders.length,
      fullCans: fullFromDeliveries + fullFromOrders,
      emptyCans: emptyFromDeliveries + emptyFromOrders,
      totalValue: totalDeliveryValue,
    };
  }, [organizationDeliveries, organizationOrders, organization, products]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role !== "admin") {
      router.replace("/delivery");
    }
  }, [user, isLoading]);

  if (isLoading || !user || user.role !== "admin") {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  if (!organization) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Organization not found</Text>
          <Text style={styles.emptyText}>Return to the admin dashboard and select a valid organization.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/admin")}>
            <Text style={styles.backText}>Back to Admin</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/admin")}>
              <ArrowLeft size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.headerLabel}>ORGANIZATION HISTORY</Text>
          <Text style={styles.headerTitle}>{organization.name}</Text>
          <Text style={styles.headerSub}>A complete view of recorded deliveries, order activity, custom rates, and can balances for this organization.</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.orgCard}>
            <Text style={styles.orgName}>{organization.name}</Text>
            <Text style={styles.orgInfo}>{organization.email ? organization.email : "No email"} • {organization.phone ? organization.phone : "No phone"}</Text>
            {organization.address ? <Text style={styles.orgInfo}>{organization.address}</Text> : null}
            {organization.gstNumber ? <Text style={[styles.orgInfo, { fontWeight: "700", color: Colors.primary }]}>GSTIN: {organization.gstNumber}</Text> : null}

            {/* Custom Pricing Summary */}
            <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Tag size={13} color={Colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: "900", color: Colors.foreground }}>Organization Pricing Rates:</Text>
              </View>
              <Text style={{ fontSize: 12, color: Colors.muted, marginLeft: 19 }}>
                {products.map((p) => `${p.size}: ₹${getOrganizationProductPrice(organization, p)}`).join(" • ")}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <Text style={styles.statLabel}>Deliveries</Text>
                <Text style={styles.statValue}>{orgStats.totalDeliveries}</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statLabel}>Full Cans</Text>
                <Text style={styles.statValue}>{orgStats.fullCans}</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statLabel}>Total Billed</Text>
                <Text style={[styles.statValue, { color: Colors.success }]}>₹{orgStats.totalValue}</Text>
              </View>
            </View>
          </View>

          {/* RECORDED DELIVERIES SECTION */}
          <Text style={styles.sectionTitle}>Recorded Deliveries ({filteredDeliveries.length})</Text>
          <SearchInput
            value={deliverySearchText}
            onChangeText={setDeliverySearchText}
            placeholder="Search deliveries by staff name or date..."
            style={{ marginBottom: 4 }}
          />

          {visibleDeliveries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Truck size={34} color={Colors.primary} />
              <Text style={styles.emptyTitle}>
                {deliverySearchText ? "No matching deliveries found" : "No deliveries recorded yet."}
              </Text>
              <Text style={styles.emptyText}>
                {deliverySearchText ? "Try adjusting your search criteria." : "Deliveries submitted by staff from the Delivery Panel will appear here."}
              </Text>
            </View>
          ) : (
            <>
              {visibleDeliveries.map((delivery) => {
                const deliveryVal = calculateDeliveryRowAmount(
                  delivery.fullCansLoaded,
                  delivery.cases200mlDelivered || 0,
                  delivery.cases500mlDelivered || 0,
                  delivery.cases1lDelivered || 0,
                  organization,
                  products
                );

                return (
                  <View key={delivery.id} style={styles.orderCard}>
                    <View style={styles.deliveryIconBox}>
                      <Truck size={20} color={Colors.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderId}>Delivery Log</Text>
                      <Text style={styles.orderText}>Full Cans Loaded: {delivery.fullCansLoaded} cans</Text>
                      {delivery.cases200mlDelivered ? <Text style={styles.orderText}>200ml Packs Delivered: {delivery.cases200mlDelivered} packs</Text> : null}
                      {delivery.cases500mlDelivered ? <Text style={styles.orderText}>500ml Cases Delivered: {delivery.cases500mlDelivered} cases</Text> : null}
                      {delivery.cases1lDelivered ? <Text style={styles.orderText}>1L Cases Delivered: {delivery.cases1lDelivered} cases</Text> : null}
                      <Text style={styles.orderText}>Empty Cans Picked Up: {delivery.emptyCansReturned} cans</Text>
                      <Text style={styles.orderText}>Delivered by: {delivery.deliveredBy || "Staff"}</Text>
                      {delivery.plantName ? (
                        <Text style={[styles.orderText, { color: Colors.primary, fontWeight: "800", marginTop: 2 }]}>
                          Plant: {delivery.plantName}{delivery.plantLocation ? ` (${delivery.plantLocation})` : ""}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.orderMeta}>
                      <Text style={{ fontSize: 13, fontWeight: "900", color: Colors.primary, marginBottom: 4 }}>
                        ₹{deliveryVal}
                      </Text>
                      <Text style={styles.orderMetaText}>
                        {delivery.createdAt ? new Date(delivery.createdAt).toLocaleDateString() : ""}
                      </Text>
                      {delivery.isEdited ? (
                        <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full, marginTop: 4, borderWidth: 1, borderColor: "#F59E0B" }}>
                          <Text style={{ fontSize: 10, fontWeight: "800", color: "#B45309" }}>
                            ✏️ Edited by {delivery.editedBy || "Staff"}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}

              {visibleDeliveryCount < filteredDeliveries.length && (
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.card,
                    borderRadius: Radius.full,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: Colors.border,
                    marginTop: 6,
                    marginBottom: 12,
                    ...Shadow.soft,
                  }}
                  onPress={() => setVisibleDeliveryCount((prev) => prev + 50)}
                >
                  <Text style={{ fontSize: 13, fontWeight: "900", color: Colors.primary }}>
                    Load More (Showing {visibleDeliveries.length} of {filteredDeliveries.length})
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* CUSTOMER ORDERS SECTION */}
          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Customer Orders ({organizationOrders.length})</Text>
          {organizationOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <ClipboardList size={34} color={Colors.primary} />
              <Text style={styles.emptyTitle}>No customer orders placed yet.</Text>
              <Text style={styles.emptyText}>Direct customer orders associated with this organization will appear here.</Text>
            </View>
          ) : (
            organizationOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Text style={styles.orderStatus}>{order.status}</Text>
                  <Text style={styles.orderText}>Total: ₹{order.total}</Text>
                  <Text style={styles.orderText}>Payment: {order.paymentStatus || "Pending"}</Text>
                  <Text style={styles.orderText}>Customer: {order.customer?.name || "Unknown"} • {order.customer?.phone || "N/A"}</Text>
                  <Text style={styles.orderText}>{Array.isArray(order.items) ? order.items.map((item) => `${item.size}×${item.quantity}`).join(", ") : "No items recorded"}</Text>
                </View>
                <View style={styles.orderMeta}>
                  <PackageCheck size={18} color={Colors.primary} />
                  <Text style={styles.orderMetaText}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "Date unavailable"}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 },
  headerTop: { flexDirection: "row", justifyContent: "flex-start", alignItems: "center", marginBottom: 16, maxWidth: 960, width: "100%", alignSelf: "center" },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  headerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 2, color: "rgba(255,255,255,0.82)", marginBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: Colors.white, marginBottom: 8 },
  headerSub: { fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.82)" },
  content: { padding: 16, gap: 16, paddingBottom: 32, maxWidth: 960, width: "100%", alignSelf: "center" },
  orgCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 20, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  orgName: { fontSize: 18, fontWeight: "900", color: Colors.foreground },
  orgInfo: { color: Colors.muted, fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  statBadge: { flex: 1, backgroundColor: Colors.mutedBg, borderRadius: Radius.md, padding: 12, alignItems: "center" },
  statLabel: { fontSize: 11, color: Colors.muted },
  statValue: { fontSize: 15, fontWeight: "900", color: Colors.primary, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: Colors.foreground, marginTop: 8, marginBottom: 4 },
  deliveryIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  emptyCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 24, alignItems: "center", borderWidth: 1, borderColor: Colors.border, ...Shadow.card, gap: 8 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: Colors.foreground, textAlign: "center" },
  emptyText: { color: Colors.muted, fontSize: 13, marginTop: 4, textAlign: "center" },
  backButton: { marginTop: 16, backgroundColor: Colors.primary, borderRadius: Radius.full, minHeight: 44, paddingVertical: 12, paddingHorizontal: 20, justifyContent: "center" },
  backText: { color: Colors.white, fontWeight: "900" },
  orderCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 16, ...Shadow.card },
  orderId: { fontSize: 14, fontWeight: "900", color: Colors.foreground, marginBottom: 4 },
  orderStatus: { fontSize: 12, fontWeight: "800", color: Colors.primary, marginBottom: 6 },
  orderText: { color: Colors.muted, fontSize: 12, marginTop: 2 },
  orderMeta: { alignItems: "flex-end" },
  orderMetaText: { color: Colors.muted, fontSize: 11, fontWeight: "600" },
});
