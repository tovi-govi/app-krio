import { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { LogOut, Truck, FileText, Table, Receipt, Edit3 } from "lucide-react-native";
import KrioLogo from "@/assets/logos/krio-logo.svg";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { useCart, DeliveryRecord } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { SkeletonList } from "@/components/UI/Skeleton";
import DownloadInvoiceModal from "../components/DownloadInvoiceModal";
import AdminEditDeliveryModal from "@/components/AdminEditDeliveryModal";
import { aggregateMonthlyDeliveries } from "@/utils/invoiceAggregator";
import SearchInput from "@/components/UI/SearchInput";

export default function AdminHomeScreen() {
  const { user, isLoading, logout } = useAuth();
  const {
    products,
    orders,
    deliveries,
    organizations,
    plants,
    expenses,
    firebaseReady,
    updateDeliveryRecord,
    deleteDeliveryRecord,
  } = useCart();
  const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState("");
  const [showInvoiceMenu, setShowInvoiceMenu] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [deliverySearchText, setDeliverySearchText] = useState("");
  const [visibleDeliveryCount, setVisibleDeliveryCount] = useState(25);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const invoiceMonthKeys = useMemo(() => {
    const orderKeys = orders.map((order) => {
      const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
      return `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
    });

    const deliveryKeys = deliveries.map((delivery) => {
      const createdAt = delivery.createdAt ? new Date(delivery.createdAt) : new Date();
      return `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
    });

    const keys = Array.from(new Set([...orderKeys, ...deliveryKeys].filter(Boolean))).sort((a, b) => b.localeCompare(a));
    return keys.length ? keys : [new Date().toISOString().slice(0, 7)];
  }, [orders, deliveries]);

  useEffect(() => {
    if (!selectedInvoiceMonth && invoiceMonthKeys.length) {
      setSelectedInvoiceMonth(invoiceMonthKeys[0]);
    }
  }, [invoiceMonthKeys, selectedInvoiceMonth]);

  const homeStats = useMemo(() => {
    const fullFromOrders = orders.reduce(
      (total, order) => total + order.items.reduce((quantity, item) => quantity + item.quantity, 0),
      0
    );
    const fullFromDeliveries = deliveries.reduce((total, d) => total + d.fullCansLoaded, 0);
    const emptyFromDeliveries = deliveries.reduce((total, d) => total + d.emptyCansReturned, 0);
    const emptyFromOrders = orders.reduce((total, order) => total + (order.emptyCansReturned ?? 0), 0);

    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const monthlyExpensesTotal = expenses
      .filter((e) => e.expenseDate >= currentMonthStart)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalDeliveries: deliveries.length,
      totalCansDelivered: fullFromOrders + fullFromDeliveries,
      totalPlants: plants.length,
      fullWaterCans: fullFromOrders + fullFromDeliveries,
      emptyWaterCans: emptyFromDeliveries + emptyFromOrders,
      monthlyExpensesTotal,
    };
  }, [orders, deliveries, products.length, plants.length, expenses]);

  const formattedMonthLabel = (monthKey: string) => {
    if (!monthKey) return "";
    const [year, month] = monthKey.split("-");
    return new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "long", year: "numeric" });
  };

  const filteredDeliveries = useMemo(() => {
    if (!deliverySearchText.trim()) return deliveries;
    const query = deliverySearchText.toLowerCase();
    return deliveries.filter(
      (d) =>
        d.organizationName.toLowerCase().includes(query) ||
        d.deliveredBy.toLowerCase().includes(query) ||
        (d.plantName && d.plantName.toLowerCase().includes(query)) ||
        (d.plantLocation && d.plantLocation.toLowerCase().includes(query))
    );
  }, [deliveries, deliverySearchText]);

  const visibleDeliveries = useMemo(() => {
    return filteredDeliveries.slice(0, visibleDeliveryCount);
  }, [filteredDeliveries, visibleDeliveryCount]);

  const selectedMonthData = useMemo(() => {
    if (!selectedInvoiceMonth) return null;
    const [yearStr, monthStr] = selectedInvoiceMonth.split("-");
    const year = Number(yearStr) || new Date().getFullYear();
    const month = Number(monthStr) || new Date().getMonth() + 1;

    return aggregateMonthlyDeliveries({
      deliveries,
      month,
      year,
      organizationId: "ALL",
      organizations,
      products,
    });
  }, [deliveries, organizations, products, selectedInvoiceMonth]);

  if (isLoading || !user || user.role !== "admin") {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.logoContainer}>
              <View style={styles.whiteLogoBadge}>
                <Image
                  source={require("@/assets/logos/krio-logo.png")}
                  style={{ width: 120, height: 36 }}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.headerLabel}>ADMIN</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Inventory & Dispatch Home</Text>
          <Text style={styles.headerSub}>This is your admin home page. View real-time orders, recorded deliveries, and monthly reports.</Text>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <Stat label="Products" value={String(homeStats.totalProducts)} />
          <Stat label="Orders" value={String(homeStats.totalOrders)} />
          <Stat label="Cans Delivered" value={homeStats.totalCansDelivered.toLocaleString("en-IN")} />
          <Stat label="Expenses (Month)" value={`₹${homeStats.monthlyExpensesTotal.toLocaleString("en-IN")}`} onPress={() => router.push("/admin/expenses")} />
        </View>

        {/* MONTHLY INVOICE & EXCEL SPREADSHEET TAB */}
        <View style={styles.invoicePanel}>
          <View style={styles.panelHeaderRow}>
            <Table size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Monthly Invoice & Sheet</Text>
          </View>

          <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowInvoiceMenu((visible) => !visible)}>
            <Text style={styles.dropdownButtonText}>{selectedInvoiceMonth ? formattedMonthLabel(selectedInvoiceMonth) : "Select month"}</Text>
          </TouchableOpacity>
          {showInvoiceMenu && (
            <View style={styles.dropdownMenu}>
              {invoiceMonthKeys.map((monthKey) => (
                <TouchableOpacity key={monthKey} style={styles.dropdownMenuItem} onPress={() => { setSelectedInvoiceMonth(monthKey); setShowInvoiceMenu(false); }}>
                  <Text style={styles.dropdownMenuText}>{formattedMonthLabel(monthKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* EXCEL SHEET GRID DISPLAY */}
          <View style={styles.scrollHintRow}>
            <Text style={styles.scrollHintText}>↔️ Swipe horizontally to view full spreadsheet</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ width: "100%" }}>
            <View style={styles.excelGridCard}>
              <View style={styles.excelGridBanner}>
                <Table size={16} color={Colors.white} />
                <Text style={styles.excelBannerTitle}>
                  MONTHLY DELIVERY REPORT — {selectedInvoiceMonth ? formattedMonthLabel(selectedInvoiceMonth).toUpperCase() : ""}
                </Text>
              </View>

              {/* Table Column Headers */}
              <View style={styles.excelHeaderRow}>
                <Text style={[styles.excelHeaderCell, styles.colOrg]}>Partner Organization</Text>
                <Text style={[styles.excelHeaderCell, styles.colGst]}>GST Number</Text>
                <Text style={[styles.excelHeaderCell, styles.colCans]}>20L Cans</Text>
                <Text style={[styles.excelHeaderCell, styles.colEmpty]}>Empty 20L</Text>
                <Text style={[styles.excelHeaderCell, styles.col200ml]}>200ml Packs</Text>
                <Text style={[styles.excelHeaderCell, styles.col500ml]}>500ml Cases</Text>
                <Text style={[styles.excelHeaderCell, styles.col1l]}>1L Cases</Text>
                <Text style={[styles.excelHeaderCell, styles.colAmount]}>Amount</Text>
              </View>

              {/* Table Rows */}
              {!selectedMonthData || !selectedMonthData.hasData ? (
                <View style={styles.excelEmptyRow}>
                  <Text style={styles.excelEmptyText}>No delivery runs recorded for this month.</Text>
                </View>
              ) : (
                selectedMonthData.rows.map((row, idx) => (
                  <View key={row.organizationName} style={[styles.excelDataRow, idx % 2 === 0 && styles.excelZebraRow]}>
                    <Text style={[styles.excelCellText, styles.colOrg, styles.excelOrgText]} numberOfLines={1}>
                      {row.organizationName}
                    </Text>

                    <Text style={[styles.excelCellText, styles.colGst, { fontSize: 12, color: Colors.muted }]} numberOfLines={1}>
                      {row.gstNumber || "N/A"}
                    </Text>

                    <View style={[styles.colCans, styles.cellCenter]}>
                      <Text style={[styles.cellBadge, row.cansDelivered > 0 ? styles.badgeActive : styles.badgeMuted]}>
                        {row.cansDelivered ? `${row.cansDelivered} cans` : "0"}
                      </Text>
                    </View>

                    <View style={[styles.colEmpty, styles.cellCenter]}>
                      <Text style={[styles.cellBadge, row.emptyCansPickedUp > 0 ? styles.badgeWarning : styles.badgeMuted]}>
                        {row.emptyCansPickedUp ? `${row.emptyCansPickedUp} cans` : "0"}
                      </Text>
                    </View>

                    <View style={[styles.col200ml, styles.cellCenter]}>
                      <Text style={[styles.cellBadge, row.cases200ml > 0 ? styles.badgeActive : styles.badgeMuted]}>
                        {row.cases200ml ? `${row.cases200ml} packs` : "0"}
                      </Text>
                    </View>

                    <View style={[styles.col500ml, styles.cellCenter]}>
                      <Text style={[styles.cellBadge, row.cases500ml > 0 ? styles.badgeActive : styles.badgeMuted]}>
                        {row.cases500ml ? `${row.cases500ml} cases` : "0"}
                      </Text>
                    </View>

                    <View style={[styles.col1l, styles.cellCenter]}>
                      <Text style={[styles.cellBadge, row.cases1l > 0 ? styles.badgeActive : styles.badgeMuted]}>
                        {row.cases1l ? `${row.cases1l} cases` : "0"}
                      </Text>
                    </View>

                    <Text style={[styles.excelCellText, styles.colAmount, styles.cellTextCenter, { color: Colors.muted }]}>
                      {row.amount ? `₹${row.amount}` : "—"}
                    </Text>
                  </View>
                ))
              )}

              {/* Totals Row */}
              <View style={styles.excelTotalRow}>
                <Text style={[styles.excelTotalText, styles.colOrg]}>TOTAL SUMMARY</Text>
                <Text style={[styles.excelTotalText, styles.colGst]}>—</Text>
                <Text style={[styles.excelTotalText, styles.colCans, styles.cellTextCenter]}>
                  {selectedMonthData ? `${selectedMonthData.totalCansDelivered} cans` : "0"}
                </Text>
                <Text style={[styles.excelTotalText, styles.colEmpty, styles.cellTextCenter]}>
                  {selectedMonthData ? `${selectedMonthData.totalEmptyCansPickedUp} cans` : "0"}
                </Text>
                <Text style={[styles.excelTotalText, styles.col200ml, styles.cellTextCenter]}>
                  {selectedMonthData ? `${selectedMonthData.totalCases200ml || 0} packs` : "0"}
                </Text>
                <Text style={[styles.excelTotalText, styles.col500ml, styles.cellTextCenter]}>
                  {selectedMonthData ? `${selectedMonthData.totalCases500ml || 0} cases` : "0"}
                </Text>
                <Text style={[styles.excelTotalText, styles.col1l, styles.cellTextCenter]}>
                  {selectedMonthData ? `${selectedMonthData.totalCases1l || 0} cases` : "0"}
                </Text>
                <Text style={[styles.excelTotalText, styles.colAmount, styles.cellTextCenter]}>
                  {selectedMonthData?.totalAmount ? `₹${selectedMonthData.totalAmount}` : "—"}
                </Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.downloadBtn} onPress={() => setShowDownloadModal(true)}>
            <FileText size={18} color={Colors.white} />
            <Text style={styles.downloadText}>Download Monthly Invoice (PDF / Excel)</Text>
          </TouchableOpacity>
        </View>

        {/* RECORDED DELIVERIES SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recorded Deliveries</Text>
          <Text style={styles.sectionSub}>Deliveries submitted by staff from the delivery panel.</Text>
        </View>

        <SearchInput
          value={deliverySearchText}
          onChangeText={setDeliverySearchText}
          placeholder="Filter deliveries by organization or staff..."
          style={{ marginBottom: 4 }}
        />

        {!firebaseReady && deliveries.length === 0 ? (
          <SkeletonList count={3} />
        ) : visibleDeliveries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Truck size={32} color={Colors.muted} />
            <Text style={styles.emptyTitle}>
              {deliverySearchText ? "No matching deliveries found" : "No deliveries recorded yet"}
            </Text>
            <Text style={styles.emptyText}>
              {deliverySearchText ? "Try adjusting your search criteria." : "Deliveries submitted from the Delivery Panel will appear here live."}
            </Text>
          </View>
        ) : (
          <>
            {visibleDeliveries.map((delivery) => (
              <View key={delivery.id} style={styles.deliveryCard}>
                <View style={styles.deliveryCardHeader}>
                  <View style={styles.deliveryIconBox}>
                    <Truck size={20} color={Colors.white} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.deliveryOrgName}>{delivery.organizationName || "General Delivery"}</Text>
                    <Text style={styles.deliveryMetaText}>
                      By {delivery.deliveredBy || "Delivery Staff"} • {delivery.createdAt ? new Date(delivery.createdAt).toLocaleString() : ""}
                    </Text>
                    {delivery.plantName ? (
                      <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: "800", marginTop: 3 }}>
                        Shipped from: {delivery.plantName}{delivery.plantLocation ? ` (${delivery.plantLocation})` : ""}
                      </Text>
                    ) : null}
                    {delivery.isEdited ? (
                      <Text style={styles.editedAuditText}>
                        Edited by {delivery.editedBy || "Admin"}{delivery.editedAt ? ` on ${new Date(delivery.editedAt).toLocaleDateString()}` : ""}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.editDeliveryBtn}
                    onPress={() => {
                      setEditingDelivery(delivery);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit3 size={14} color={Colors.primary} />
                    <Text style={styles.editDeliveryBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.deliveryStatsRow}>
                  <View style={styles.deliveryStatBadge}>
                    <Text style={styles.deliveryStatLabel}>Full Cans Loaded</Text>
                    <Text style={styles.deliveryStatValue}>{delivery.fullCansLoaded} cans</Text>
                  </View>
                  <View style={styles.deliveryStatBadge}>
                    <Text style={styles.deliveryStatLabel}>Empty Returned</Text>
                    <Text style={styles.deliveryStatValue}>{delivery.emptyCansReturned} cans</Text>
                  </View>
                </View>
              </View>
            ))}

            {visibleDeliveryCount < filteredDeliveries.length && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => setVisibleDeliveryCount((prev) => prev + 50)}
              >
                <Text style={styles.loadMoreText}>
                  Load More Records (Showing {visibleDeliveries.length} of {filteredDeliveries.length})
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <DownloadInvoiceModal
        visible={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        organizations={organizations}
        deliveries={deliveries}
      />

      <AdminEditDeliveryModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingDelivery(null);
        }}
        delivery={editingDelivery}
        organizations={organizations}
        plants={plants}
        currentUserName={user?.name || "Admin"}
        onSave={updateDeliveryRecord}
        onDelete={async (deliveryId) => {
          await deleteDeliveryRecord(deliveryId, user?.name || "Admin");
        }}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  if (onPress) {
    return (
      <TouchableOpacity style={styles.statCard} onPress={onPress}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 140, gap: 16, maxWidth: 960, width: "100%", alignSelf: "center" },
  header: { borderRadius: Radius.xl, padding: 24, gap: 14, marginBottom: 12 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logoContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  whiteLogoBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadge: { backgroundColor: "rgba(255, 255, 255, 0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.3)" },
  headerLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: Colors.white },
  headerTitle: { fontSize: 28, fontWeight: "900", color: Colors.white },
  headerSub: { fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.82)" },
  logoutBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  statCard: { flex: 1, minWidth: 130, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  statValue: { fontSize: 22, fontWeight: "900", color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.muted, marginTop: 4 },
  sectionHeader: { marginTop: 8 },
  panelHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: Colors.foreground },
  sectionSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  invoicePanel: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 20, gap: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft },
  dropdownButton: { backgroundColor: Colors.mutedBg, borderRadius: Radius.full, minHeight: 44, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: Colors.border, justifyContent: "center" },
  dropdownButtonText: { color: Colors.foreground, fontWeight: "700" },
  dropdownMenu: { backgroundColor: Colors.card, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  dropdownMenuItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownMenuText: { color: Colors.foreground, fontSize: 14 },
  scrollHintRow: { backgroundColor: Colors.mutedBg, paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full, alignSelf: "center", marginBottom: 2 },
  scrollHintText: { fontSize: 11, fontWeight: "700", color: Colors.muted },
  excelGridCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", ...Shadow.card, marginTop: 4, minWidth: 810 },
  excelGridBanner: { backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  excelBannerTitle: { color: Colors.white, fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  excelHeaderRow: { flexDirection: "row", backgroundColor: "#0F2D6B", paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  excelHeaderCell: { color: Colors.white, fontSize: 11, fontWeight: "800", textTransform: "uppercase", paddingHorizontal: 4 },
  excelDataRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: "center" },
  excelZebraRow: { backgroundColor: "#F8FAFC" },
  excelCellText: { fontSize: 13, color: Colors.foreground, paddingHorizontal: 4 },
  excelOrgText: { fontWeight: "700" },
  colOrg: { width: 190 },
  colGst: { width: 140 },
  colCans: { width: 100 },
  colEmpty: { width: 100 },
  col200ml: { width: 110 },
  col500ml: { width: 110 },
  col1l: { width: 100 },
  colAmount: { width: 100 },
  cellCenter: { alignItems: "center", justifyContent: "center" },
  cellTextCenter: { textAlign: "center" },
  cellBadge: { fontSize: 11, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, overflow: "hidden", textAlign: "center" },
  badgeActive: { color: Colors.primary, backgroundColor: "#E0E7FF" },
  badgeWarning: { color: "#D97706", backgroundColor: "#FEF3C7" },
  badgeMuted: { color: Colors.muted, backgroundColor: Colors.mutedBg },
  excelEmptyRow: { padding: 24, alignItems: "center" },
  excelEmptyText: { color: Colors.muted, fontSize: 13, fontStyle: "italic" },
  excelTotalRow: { flexDirection: "row", backgroundColor: "#E2E8F0", paddingVertical: 12, paddingHorizontal: 12, borderTopWidth: 2, borderTopColor: Colors.primary, borderBottomWidth: 2, borderBottomColor: Colors.primary, alignItems: "center" },
  excelTotalText: { fontSize: 12, fontWeight: "900", color: Colors.primary, paddingHorizontal: 4 },
  downloadBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, minHeight: 44, paddingVertical: 12, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, ...Shadow.card },
  downloadText: { color: Colors.white, fontWeight: "900", fontSize: 14 },
  emptyCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 24, borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 8, ...Shadow.soft },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: Colors.foreground },
  emptyText: { fontSize: 12, color: Colors.muted, textAlign: "center" },
  deliveryCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft },
  deliveryCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  deliveryIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  deliveryOrgName: { fontSize: 16, fontWeight: "900", color: Colors.foreground },
  deliveryMetaText: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  editedAuditText: { fontSize: 11, fontWeight: "800", color: Colors.primary, marginTop: 3 },
  editDeliveryBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.primary + "15", paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + "30" },
  editDeliveryBtnText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  deliveryStatsRow: { flexDirection: "row", gap: 12 },
  deliveryStatBadge: { flex: 1, backgroundColor: Colors.mutedBg, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border },
  deliveryStatLabel: { fontSize: 11, color: Colors.muted, fontWeight: "700" },
  deliveryStatValue: { fontSize: 15, fontWeight: "900", color: Colors.primary, marginTop: 2 },
  loadMoreBtn: { backgroundColor: Colors.card, borderRadius: Radius.full, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border, marginTop: 8, ...Shadow.soft },
  loadMoreText: { fontSize: 13, fontWeight: "900", color: Colors.primary },
});
