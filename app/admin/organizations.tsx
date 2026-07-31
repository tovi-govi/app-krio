import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Building2, Edit2, Trash2, ChevronRight, MapPin, Tag } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Organization, OrganizationLocation, getOrganizationProductPrice, useCart } from "@/context/CartContext";
import SearchInput from "@/components/UI/SearchInput";
import ConfirmModal from "@/components/UI/ConfirmModal";
import Toast, { ToastMessage } from "@/components/UI/Toast";
import LocationPickerModal from "@/components/LocationPickerModal";

const emptyOrganization = (): Organization => ({
  id: `org-${Date.now()}`,
  name: "",
  phone: "",
  email: "",
  address: "",
  location: null,
  pricing: {},
});

export default function AdminOrganizationsScreen() {
  const { products, organizations, deliveries, saveOrganization, deleteOrganization } = useCart();
  const [organization, setOrganization] = useState<Organization>(emptyOrganization());
  const [productPrices, setProductPrices] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Sync initial product prices state whenever products change or form resets
  useEffect(() => {
    if (!isEditing && Object.keys(productPrices).length === 0 && products.length > 0) {
      const initial: Record<string, string> = {};
      products.forEach((p) => {
        initial[p.id] = String(getOrganizationProductPrice(organization, p));
      });
      setProductPrices(initial);
    }
  }, [products, isEditing]);

  const filteredOrganizations = useMemo(() => {
    if (!searchText.trim()) return organizations;
    const query = searchText.toLowerCase();
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(query) ||
        org.phone.toLowerCase().includes(query) ||
        org.email.toLowerCase().includes(query) ||
        org.address.toLowerCase().includes(query)
    );
  }, [organizations, searchText]);

  const resetForm = () => {
    setOrganization(emptyOrganization());
    const initial: Record<string, string> = {};
    products.forEach((p) => {
      initial[p.id] = String(p.price);
    });
    setProductPrices(initial);
    setIsEditing(false);
  };

  const saveOrganizationRecord = async () => {
    if (isSubmitting) return;

    if (!organization.name.trim()) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Missing Name",
        message: "Please enter an organization name.",
      });
      return;
    }

    if (!organization.phone.trim()) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Missing Phone",
        message: "Please enter a contact phone number.",
      });
      return;
    }

    if (!organization.email.trim()) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Missing Email",
        message: "Please enter a contact email address.",
      });
      return;
    }

    if (!organization.address.trim()) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Missing Address",
        message: "Please enter a delivery address.",
      });
      return;
    }

    // Validate product pricing for all products
    const newPricing: Record<string, number> = {};
    for (const prod of products) {
      const priceStr = productPrices[prod.id];
      if (priceStr === undefined || priceStr === null || priceStr.trim() === "") {
        setToast({
          id: Date.now().toString(),
          type: "warning",
          title: "Missing Product Price",
          message: `Please enter a price for ${prod.size}.`,
        });
        return;
      }

      const numPrice = Number(priceStr);
      if (isNaN(numPrice) || numPrice < 0) {
        setToast({
          id: Date.now().toString(),
          type: "warning",
          title: "Invalid Product Price",
          message: `Price for ${prod.size} must be a non-negative number.`,
        });
        return;
      }

      newPricing[prod.id] = numPrice;
      newPricing[prod.size] = numPrice; // Alias key for maximum lookup compatibility
    }

    setIsSubmitting(true);

    try {
      await saveOrganization({
        ...organization,
        name: organization.name.trim(),
        phone: organization.phone.trim(),
        email: organization.email.trim(),
        address: organization.address.trim(),
        pricing: newPricing,
      });

      setToast({
        id: Date.now().toString(),
        type: "success",
        title: isEditing ? "Organization Updated" : "Organization Saved",
        message: `${organization.name} record has been saved successfully with custom pricing.`,
      });

      resetForm();
    } catch (error: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Save Failed",
        message: error.message || "Could not save organization record.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const editOrganization = (org: Organization) => {
    setOrganization(org);
    const existingPrices: Record<string, string> = {};
    products.forEach((p) => {
      existingPrices[p.id] = String(getOrganizationProductPrice(org, p));
    });
    setProductPrices(existingPrices);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    resetForm();
  };

  const confirmDeleteOrg = async () => {
    if (!deletingOrgId) return;
    try {
      const orgToDelete = organizations.find((o) => o.id === deletingOrgId);
      await deleteOrganization(deletingOrgId);
      setToast({
        id: Date.now().toString(),
        type: "info",
        title: "Organization Removed",
        message: `${orgToDelete?.name || "Organization"} has been deleted.`,
      });
    } catch (error: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Delete Failed",
        message: error.message || "Could not delete organization.",
      });
    } finally {
      setDeletingOrgId(null);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
        <View style={styles.headerTop}>
          <Building2 size={24} color={Colors.white} />
          <Text style={styles.headerTitle}>Partner Directory</Text>
        </View>
        <Text style={styles.headerSub}>Manage organization profiles, set custom product pricing, and tap any partner to view real-time delivery activity.</Text>
      </LinearGradient>

      {/* Form Card */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{isEditing ? "Edit Organization Profile" : "Add New Partner Organization"}</Text>
        <TextInput
          style={styles.input}
          placeholder="Organization Name *"
          placeholderTextColor={Colors.muted}
          value={organization.name}
          onChangeText={(name) => setOrganization((state) => ({ ...state, name }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Contact Phone *"
          placeholderTextColor={Colors.muted}
          value={organization.phone}
          onChangeText={(phone) => setOrganization((state) => ({ ...state, phone }))}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Contact Email *"
          placeholderTextColor={Colors.muted}
          value={organization.email}
          onChangeText={(email) => setOrganization((state) => ({ ...state, email }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Delivery Address *"
          placeholderTextColor={Colors.muted}
          value={organization.address}
          onChangeText={(address) => setOrganization((state) => ({ ...state, address }))}
          multiline
        />

        {/* Location Section */}
        <View style={styles.locationSection}>
          <Text style={styles.locationSectionTitle}>Google Maps Pin Location</Text>
          {organization.location ? (
            <View style={styles.savedLocationBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.savedLocationText} numberOfLines={2}>
                  📍 {organization.location.address}
                </Text>
                <Text style={styles.coordsText}>
                  Lat: {organization.location.latitude.toFixed(5)} • Lng: {organization.location.longitude.toFixed(5)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeLocBtn}
                onPress={() => setShowLocationPicker(true)}
              >
                <Text style={styles.changeLocText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectLocationBtn}
              onPress={() => setShowLocationPicker(true)}
            >
              <MapPin size={16} color={Colors.primary} />
              <Text style={styles.selectLocationText}>Select Location on Map</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Product Pricing Section */}
        <View style={styles.pricingSection}>
          <View style={styles.pricingHeaderRow}>
            <Tag size={18} color={Colors.primary} />
            <Text style={styles.pricingSectionTitle}>Product Pricing</Text>
          </View>
          <Text style={styles.pricingSectionSub}>Set custom unit prices for this organization. All rates are editable.</Text>

          <View style={styles.pricingList}>
            {products.map((product) => {
              const val = productPrices[product.id] ?? String(product.price);
              const numVal = Number(val);
              const isError = val.trim() === "" || isNaN(numVal) || numVal < 0;

              return (
                <View key={product.id} style={[styles.pricingRow, isError && styles.pricingRowError]}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productEmoji}>{product.emoji}</Text>
                    <Text style={styles.productName}>{product.size}</Text>
                  </View>

                  <View style={[styles.priceInputBox, isError && styles.priceInputBoxError]}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      placeholderTextColor={Colors.muted}
                      value={val}
                      onChangeText={(text) =>
                        setProductPrices((prev) => ({ ...prev, [product.id]: text }))
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.formActionRow}>
          {isEditing && (
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelEditing}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, { flex: 1 }, isSubmitting && { opacity: 0.6 }]}
            onPress={saveOrganizationRecord}
            disabled={isSubmitting}
          >
            <Text style={styles.saveText}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Profile" : "Save Partner Organization"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Organizations Directory List */}
      <View style={styles.directoryHeaderRow}>
        <Text style={styles.sectionTitle}>Partner Directory ({filteredOrganizations.length})</Text>
      </View>

      <SearchInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Filter by name, phone, or address..."
        style={{ marginBottom: 4 }}
      />

      {filteredOrganizations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Building2 size={32} color={Colors.muted} />
          <Text style={styles.emptyTitle}>
            {searchText ? "No matching partners found" : "No partner organizations added yet"}
          </Text>
          <Text style={styles.emptyText}>
            {searchText ? "Try clearing your search term." : "Use the form above to add your first client organization."}
          </Text>
        </View>
      ) : (
        filteredOrganizations.map((org) => {
          const orgDeliveries = deliveries.filter(
            (d) => d.organizationId === org.id || d.organizationName?.toLowerCase() === org.name.toLowerCase()
          );
          const totalFullCans = orgDeliveries.reduce((sum, d) => sum + d.fullCansLoaded, 0);
          const hasLocation = !!org.location?.latitude && !!org.location?.longitude;

          // Format pricing summary for card display
          const priceSummary = products
            .map((p) => `${p.size.replace(" Bottle", "").replace(" Can", "")}: ₹${getOrganizationProductPrice(org, p)}`)
            .join(" • ");

          return (
            <Pressable
              key={org.id}
              style={styles.productCard}
              android_ripple={{ color: "rgba(0,0,0,0.05)" }}
              onPress={() => router.push(`/organization/${org.id}`)}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.productTitle}>{org.name}</Text>
                  <View style={[styles.locBadge, hasLocation ? styles.locBadgeAdded : styles.locBadgeNone]}>
                    <Text style={[styles.locBadgeText, hasLocation ? styles.locBadgeTextAdded : styles.locBadgeTextNone]}>
                      {hasLocation ? "📍 Location Added" : "⚪ No Location"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.productSub}>{org.email ? org.email : "No email"} • {org.phone ? org.phone : "No phone"}</Text>
                {org.address ? <Text style={styles.productMeta}>{org.address}</Text> : null}
                
                {/* Pricing Summary Badge */}
                <View style={styles.pricingSummaryBox}>
                  <Tag size={12} color={Colors.primary} />
                  <Text style={styles.pricingSummaryText} numberOfLines={1}>
                    Rates: {priceSummary}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <Text style={styles.deliveryBadgeText}>
                    {orgDeliveries.length} delivery record(s) • {totalFullCans} full cans loaded
                  </Text>
                </View>
                <View style={styles.linkHintRow}>
                  <Text style={styles.linkHint}>View Full Delivery History</Text>
                  <ChevronRight size={14} color={Colors.primary} />
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => editOrganization(org)} accessibilityLabel="Edit Organization">
                  <Edit2 size={16} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeletingOrgId(org.id)} accessibilityLabel="Delete Organization">
                  <Trash2 size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </Pressable>
          );
        })
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        visible={!!deletingOrgId}
        title="Delete Organization?"
        message="Are you sure you want to delete this partner organization record? Recorded delivery history will remain intact."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        type="danger"
        onConfirm={confirmDeleteOrg}
        onCancel={() => setDeletingOrgId(null)}
      />

      {/* Google Maps Location Picker Modal */}
      <LocationPickerModal
        visible={showLocationPicker}
        initialLocation={organization.location}
        initialAddress={organization.address}
        onSave={(newLoc) => {
          setOrganization((state) => ({
            ...state,
            location: newLoc,
            address: state.address || newLoc?.address || "",
          }));
          setShowLocationPicker(false);
          setToast({
            id: Date.now().toString(),
            type: "info",
            title: newLoc ? "Location Pinned" : "Location Cleared",
            message: newLoc ? "Map location coordinates attached." : "Location removed.",
          });
        }}
        onCancel={() => setShowLocationPicker(false)}
      />
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
  formCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 20, gap: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft },
  formTitle: { fontSize: 16, fontWeight: "900", color: Colors.foreground, marginBottom: 4 },
  input: { backgroundColor: Colors.mutedBg, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 14, minHeight: 48, fontSize: 14, color: Colors.foreground, borderWidth: 1, borderColor: Colors.border },
  multilineInput: { minHeight: 80, textAlignVertical: "top" },
  locationSection: { gap: 6, marginTop: 4 },
  locationSectionTitle: { fontSize: 12, fontWeight: "800", color: Colors.muted },
  selectLocationBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: `${Colors.primary}12`, borderRadius: Radius.md, minHeight: 44, paddingHorizontal: 16, borderWidth: 1, borderColor: `${Colors.primary}30` },
  selectLocationText: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  savedLocationBox: { flexDirection: "row", alignItems: "center", backgroundColor: `${Colors.success}10`, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: `${Colors.success}30`, gap: 12 },
  savedLocationText: { fontSize: 13, fontWeight: "800", color: Colors.foreground },
  coordsText: { fontSize: 11, fontWeight: "700", color: Colors.success, marginTop: 2 },
  changeLocBtn: { backgroundColor: Colors.card, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  changeLocText: { fontSize: 11, fontWeight: "800", color: Colors.primary },
  pricingSection: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  pricingHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pricingSectionTitle: { fontSize: 15, fontWeight: "900", color: Colors.foreground },
  pricingSectionSub: { fontSize: 12, color: Colors.muted, marginBottom: 4 },
  pricingList: { gap: 8 },
  pricingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.mutedBg, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  pricingRowError: { borderColor: Colors.error, backgroundColor: `${Colors.error}08` },
  productInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  productEmoji: { fontSize: 18 },
  productName: { fontSize: 14, fontWeight: "800", color: Colors.foreground },
  priceInputBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, width: 110, height: 42 },
  priceInputBoxError: { borderColor: Colors.error },
  currencyPrefix: { fontSize: 14, fontWeight: "900", color: Colors.primary, marginRight: 4 },
  priceInput: { flex: 1, fontSize: 14, fontWeight: "800", color: Colors.foreground, paddingVertical: 0 },
  pricingSummaryBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${Colors.primary}10`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.md, marginTop: 8 },
  pricingSummaryText: { fontSize: 11, fontWeight: "800", color: Colors.primary, flex: 1 },
  formActionRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, minHeight: 44, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", ...Shadow.card },
  saveText: { color: Colors.white, fontWeight: "900", fontSize: 14 },
  cancelBtn: { backgroundColor: Colors.mutedBg, borderRadius: Radius.full, minHeight: 44, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  cancelText: { color: Colors.muted, fontWeight: "800", fontSize: 14 },
  directoryHeaderRow: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: Colors.foreground },
  emptyCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 24, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: Colors.foreground },
  emptyText: { color: Colors.muted, fontSize: 12, textAlign: "center" },
  productCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  productTitle: { fontSize: 16, fontWeight: "900", color: Colors.foreground },
  locBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  locBadgeAdded: { backgroundColor: `${Colors.success}15`, borderColor: `${Colors.success}30` },
  locBadgeNone: { backgroundColor: Colors.mutedBg, borderColor: Colors.border },
  locBadgeText: { fontSize: 11, fontWeight: "800" },
  locBadgeTextAdded: { color: Colors.success },
  locBadgeTextNone: { color: Colors.muted },
  productSub: { fontSize: 13, color: Colors.muted, marginTop: 4 },
  productMeta: { fontSize: 13, color: Colors.muted, marginTop: 4 },
  badgeRow: { marginTop: 8 },
  deliveryBadgeText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  linkHintRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  linkHint: { color: Colors.primary, fontSize: 13, fontWeight: "800" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.mutedBg, alignItems: "center", justifyContent: "center" },
  deleteBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.error + "15", alignItems: "center", justifyContent: "center" },
});
