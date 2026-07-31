import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Factory, MapPin, Edit2, Trash2 } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Plant, useCart } from "@/context/CartContext";
import SearchInput from "@/components/UI/SearchInput";
import ConfirmModal from "@/components/UI/ConfirmModal";
import Toast, { ToastMessage } from "@/components/UI/Toast";

const emptyPlant = (): Plant => ({
  id: `plant-${Date.now()}`,
  name: "",
  location: "",
});

export default function AdminPlantsScreen() {
  const { plants, savePlant, deletePlant } = useCart();
  const [plant, setPlant] = useState<Plant>(emptyPlant());
  const [isEditing, setIsEditing] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingPlantId, setDeletingPlantId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const filteredPlants = useMemo(() => {
    if (!searchText.trim()) return plants;
    const query = searchText.toLowerCase();
    return plants.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query)
    );
  }, [plants, searchText]);

  const handleSavePlant = async () => {
    if (isSubmitting) return;

    if (!plant.name.trim()) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Missing Name",
        message: "Please enter a plant name.",
      });
      return;
    }

    if (!plant.location.trim()) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Missing Location",
        message: "Please enter a plant location.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await savePlant({
        ...plant,
        name: plant.name.trim(),
        location: plant.location.trim(),
      });

      setToast({
        id: Date.now().toString(),
        type: "success",
        title: isEditing ? "Plant Updated" : "Plant Saved",
        message: `${plant.name} record has been saved successfully.`,
      });

      setPlant(emptyPlant());
      setIsEditing(false);
    } catch (error: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Save Failed",
        message: error.message || "Could not save plant record.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const editPlant = (targetPlant: Plant) => {
    setPlant(targetPlant);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setPlant(emptyPlant());
    setIsEditing(false);
  };

  const confirmDeletePlant = async () => {
    if (!deletingPlantId) return;
    try {
      const plantToDelete = plants.find((p) => p.id === deletingPlantId);
      await deletePlant(deletingPlantId);
      setToast({
        id: Date.now().toString(),
        type: "info",
        title: "Plant Removed",
        message: `${plantToDelete?.name || "Plant"} has been deleted.`,
      });
    } catch (error: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Delete Failed",
        message: error.message || "Could not delete plant.",
      });
    } finally {
      setDeletingPlantId(null);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
        <View style={styles.headerTop}>
          <Factory size={24} color={Colors.white} />
          <Text style={styles.headerTitle}>Plant Locations</Text>
        </View>
        <Text style={styles.headerSub}>
          Manage water processing and bottling plant facilities used for dispatching orders.
        </Text>
      </LinearGradient>

      {/* Form Card */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{isEditing ? "Edit Plant Location" : "Add New Plant Facility"}</Text>
        <TextInput
          style={styles.input}
          placeholder="Plant Name *"
          placeholderTextColor={Colors.muted}
          value={plant.name}
          onChangeText={(name) => setPlant((state) => ({ ...state, name }))}
        />
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Plant Location Address *"
          placeholderTextColor={Colors.muted}
          value={plant.location}
          onChangeText={(location) => setPlant((state) => ({ ...state, location }))}
          multiline
        />
        <View style={styles.formActionRow}>
          {isEditing && (
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelEditing}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, { flex: 1 }, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSavePlant}
            disabled={isSubmitting}
          >
            <Text style={styles.saveText}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Plant" : "Save Plant Facility"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Plants Directory List */}
      <View style={styles.directoryHeaderRow}>
        <Text style={styles.sectionTitle}>Plant Facilities ({filteredPlants.length})</Text>
      </View>

      <SearchInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Filter by plant name or location..."
        style={{ marginBottom: 4 }}
      />

      {filteredPlants.length === 0 ? (
        <View style={styles.emptyCard}>
          <Factory size={32} color={Colors.muted} />
          <Text style={styles.emptyTitle}>
            {searchText ? "No matching plants found" : "No plant locations added yet"}
          </Text>
          <Text style={styles.emptyText}>
            {searchText ? "Try clearing your search term." : "Use the form above to add your first bottling plant facility."}
          </Text>
        </View>
      ) : (
        filteredPlants.map((p) => (
          <View key={p.id} style={styles.productCard}>
            <View style={styles.plantIconBox}>
              <Factory size={22} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.productTitle}>{p.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={14} color={Colors.muted} style={{ marginTop: 2 }} />
                <Text style={styles.productSub}>{p.location}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => editPlant(p)} accessibilityLabel="Edit Plant">
                <Edit2 size={16} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeletingPlantId(p.id)} accessibilityLabel="Delete Plant">
                <Trash2 size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        visible={!!deletingPlantId}
        title="Delete Plant Location?"
        message="Are you sure you want to delete this plant facility record?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        type="danger"
        onConfirm={confirmDeletePlant}
        onCancel={() => setDeletingPlantId(null)}
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
  multilineInput: { minHeight: 75, textAlignVertical: "top" },
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
  plantIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  productTitle: { fontSize: 16, fontWeight: "900", color: Colors.foreground },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 4, marginTop: 4 },
  productSub: { fontSize: 13, color: Colors.muted, flex: 1, lineHeight: 18 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.mutedBg, alignItems: "center", justifyContent: "center" },
  deleteBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.error + "15", alignItems: "center", justifyContent: "center" },
});
