import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Building2, Edit2, Trash2, ChevronRight } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Organization, useCart } from "@/context/CartContext";
import SearchInput from "@/components/UI/SearchInput";
import ConfirmModal from "@/components/UI/ConfirmModal";
import Toast, { ToastMessage } from "@/components/UI/Toast";

const emptyOrganization = (): Organization => ({
  id: `org-${Date.now()}`,
  name: "",
  phone: "",
  email: "",
  address: "",
});

export default function AdminOrganizationsScreen() {
  const { organizations, deliveries, saveOrganization, deleteOrganization } = useCart();
  const [organization, setOrganization] = useState<Organization>(emptyOrganization());
  const [isEditing, setIsEditing] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

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

  const saveOrganizationRecord = async () => {
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

    try {
      await saveOrganization({
        ...organization,
        name: organization.name.trim(),
        phone: organization.phone.trim(),
        email: organization.email.trim(),
        address: organization.address.trim(),
      });

      setToast({
        id: Date.now().toString(),
        type: "success",
        title: isEditing ? "Organization Updated" : "Organization Saved",
        message: `${organization.name} record has been saved successfully.`,
      });

      setOrganization(emptyOrganization());
      setIsEditing(false);
    } catch (error: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Save Failed",
        message: error.message || "Could not save organization record.",
      });
    }
  };

  const editOrganization = (org: Organization) => {
    setOrganization(org);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setOrganization(emptyOrganization());
    setIsEditing(false);
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
        <Text style={styles.headerSub}>Manage organization profiles and tap any partner to view real-time delivery activity and balance.</Text>
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
        <View style={styles.formActionRow}>
          {isEditing && (
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelEditing}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={saveOrganizationRecord}>
            <Text style={styles.saveText}>{isEditing ? "Update Profile" : "Save Partner Organization"}</Text>
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

          return (
            <Pressable
              key={org.id}
              style={styles.productCard}
              android_ripple={{ color: "rgba(0,0,0,0.05)" }}
              onPress={() => router.push(`/organization/${org.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.productTitle}>{org.name}</Text>
                <Text style={styles.productSub}>{org.email ? org.email : "No email"} • {org.phone ? org.phone : "No phone"}</Text>
                {org.address ? <Text style={styles.productMeta}>{org.address}</Text> : null}
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
  productTitle: { fontSize: 16, fontWeight: "900", color: Colors.foreground },
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
