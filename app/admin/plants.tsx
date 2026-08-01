import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Factory, MapPin, Edit2, Trash2, Plus, Minus, Save, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Plant, useCart, getPlantProductStock } from "@/context/CartContext";
import { SkeletonList } from "@/components/UI/Skeleton";
import ConfirmModal from "@/components/UI/ConfirmModal";
import Toast, { ToastMessage } from "@/components/UI/Toast";

const emptyPlant = (): Plant => ({
  id: `plant-${Date.now()}`,
  name: "",
  location: "",
});

export default function AdminPlantsScreen() {
  const { plants, products, savePlant, deletePlant, updatePlantInventory, firebaseReady } = useCart();
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const [plantForm, setPlantForm] = useState<Plant>(emptyPlant());
  const [isEditingFacility, setIsEditingFacility] = useState(false);

  // Local draft state for editing plant stock quantities
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [isSavingStock, setIsSavingStock] = useState(false);

  const [isSubmittingFacility, setIsSubmittingFacility] = useState(false);
  const [deletingPlantId, setDeletingPlantId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Set default selected plant if available
  useEffect(() => {
    if (plants.length > 0 && (!selectedPlantId || !plants.some((p) => p.id === selectedPlantId))) {
      setSelectedPlantId(plants[0].id);
    }
  }, [plants]);

  const activePlant = useMemo(() => {
    return plants.find((p) => p.id === selectedPlantId) || plants[0] || null;
  }, [plants, selectedPlantId]);

  // Sync draft state whenever activePlant or products change
  useEffect(() => {
    if (activePlant) {
      const draft: Record<string, string> = {};
      products.forEach((prod) => {
        const val = getPlantProductStock(activePlant, prod.id, prod.stock);
        draft[prod.id] = String(val);
      });
      setStockDraft(draft);
    }
  }, [activePlant, products]);

  const handleStockChange = (productId: string, val: string) => {
    setStockDraft((prev) => ({ ...prev, [productId]: val }));
  };

  const handleAdjustStock = (productId: string, delta: number) => {
    const currentVal = Number(stockDraft[productId] || "0");
    const nextVal = Math.max(0, currentVal + delta);
    setStockDraft((prev) => ({ ...prev, [productId]: String(nextVal) }));
  };

  const handleSavePlantStock = async () => {
    if (!activePlant || isSavingStock) return;

    const sanitizedInventory: Record<string, number> = {};
    for (const prod of products) {
      const inputStr = stockDraft[prod.id] ?? "0";
      const num = Number(inputStr);
      if (isNaN(num) || num < 0) {
        setToast({
          id: Date.now().toString(),
          type: "warning",
          title: "Invalid Stock Input",
          message: `Please enter a valid non-negative number for ${prod.size}.`,
        });
        return;
      }
      sanitizedInventory[prod.id] = num;
    }

    setIsSavingStock(true);

    try {
      await updatePlantInventory(activePlant.id, sanitizedInventory);
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Inventory Updated",
        message: `Stock levels for ${activePlant.name} saved successfully.`,
      });
    } catch (error: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Update Failed",
        message: error.message || "Could not update plant inventory.",
      });
    } finally {
      setIsSavingStock(false);
    }
  };

  const handleSavePlantFacility = async () => {
    if (isSubmittingFacility) return;

    if (!plantForm.name.trim()) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Missing Name",
        message: "Please enter a plant name.",
      });
      return;
    }

    if (!plantForm.location.trim()) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Missing Location",
        message: "Please enter a plant location.",
      });
      return;
    }

    setIsSubmittingFacility(true);

    try {
      await savePlant({
        ...plantForm,
        name: plantForm.name.trim(),
        location: plantForm.location.trim(),
      });

      setToast({
        id: Date.now().toString(),
        type: "success",
        title: isEditingFacility ? "Facility Updated" : "Facility Saved",
        message: `${plantForm.name} record saved.`,
      });

      setPlantForm(emptyPlant());
      setIsEditingFacility(false);
    } catch (error: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Save Failed",
        message: error.message || "Could not save plant facility.",
      });
    } finally {
      setIsSubmittingFacility(false);
    }
  };

  const startEditFacility = (targetPlant: Plant) => {
    setPlantForm(targetPlant);
    setIsEditingFacility(true);
  };

  const cancelEditFacility = () => {
    setPlantForm(emptyPlant());
    setIsEditingFacility(false);
  };

  const confirmDeleteFacility = async () => {
    if (!deletingPlantId) return;
    try {
      const plantToDelete = plants.find((p) => p.id === deletingPlantId);
      await deletePlant(deletingPlantId);
      setToast({
        id: Date.now().toString(),
        type: "info",
        title: "Plant Removed",
        message: `${plantToDelete?.name || "Plant"} deleted.`,
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

      {/* Header Banner */}
      <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
        <View style={styles.headerTop}>
          <Factory size={24} color={Colors.white} />
          <Text style={styles.headerTitle}>Bottling Plant Facilities</Text>
        </View>
        <Text style={styles.headerSub}>
          Select a bottling plant to view and adjust its individual stock levels. Changes saved here immediately update the database.
        </Text>
      </LinearGradient>

      {/* Plant Facility Selector Dropdown Bar */}
      <View style={styles.selectorCard}>
        <Text style={styles.selectorTitle}>Select Bottling Facility</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plantSelectorRow}>
          {plants.map((p) => {
            const isSelected = p.id === activePlant?.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.plantPill, isSelected && styles.plantPillSelected]}
                onPress={() => setSelectedPlantId(p.id)}
              >
                <Factory size={14} color={isSelected ? Colors.white : Colors.primary} />
                <Text style={[styles.plantPillText, isSelected && styles.plantPillTextSelected]}>{p.name}</Text>
                {isSelected && <CheckCircle2 size={14} color={Colors.white} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected Plant Inventory Stock Management Table */}
      {!firebaseReady && plants.length === 0 ? (
        <SkeletonList count={2} />
      ) : activePlant ? (
        <View style={styles.stockCard}>
          <View style={styles.stockHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stockPlantName}>{activePlant.name}</Text>
              <Text style={styles.stockPlantLoc}>{activePlant.location}</Text>
            </View>
          </View>

          <Text style={styles.tableTitle}>Plant Product Inventory Stock</Text>

          {products.map((prod) => {
            const draftVal = stockDraft[prod.id] ?? "0";

            return (
              <View key={prod.id} style={styles.stockRow}>
                <Text style={styles.emojiText}>{prod.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prodTitle}>{prod.size}</Text>
                  <Text style={styles.prodSub}>{prod.use}</Text>
                </View>

                {/* Stock Controls (+ / - / Input) */}
                <View style={styles.controlGroup}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleAdjustStock(prod.id, -10)}>
                    <Minus size={14} color={Colors.foreground} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.stockInput}
                    value={draftVal}
                    onChangeText={(v) => handleStockChange(prod.id, v)}
                    keyboardType="numeric"
                    placeholder="0"
                  />

                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleAdjustStock(prod.id, 10)}>
                    <Plus size={14} color={Colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.saveStockBtn, isSavingStock && { opacity: 0.6 }]}
            onPress={handleSavePlantStock}
            disabled={isSavingStock}
          >
            <Save size={18} color={Colors.white} />
            <Text style={styles.saveStockText}>
              {isSavingStock ? "Saving Plant Stock..." : `Save ${activePlant.name} Stock`}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Facility Directory & Add/Edit Facility Section */}
      <View style={styles.facilitySection}>
        <Text style={styles.sectionTitle}>Plant Facility Settings & Directory</Text>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{isEditingFacility ? "Edit Plant Facility" : "Add New Bottling Plant Facility"}</Text>
          <TextInput
            style={styles.input}
            placeholder="Plant Facility Name *"
            placeholderTextColor={Colors.muted}
            value={plantForm.name}
            onChangeText={(name) => setPlantForm((state) => ({ ...state, name }))}
          />
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Plant Location Address *"
            placeholderTextColor={Colors.muted}
            value={plantForm.location}
            onChangeText={(location) => setPlantForm((state) => ({ ...state, location }))}
            multiline
          />
          <View style={styles.formActionRow}>
            {isEditingFacility && (
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelEditFacility}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, { flex: 1 }, isSubmittingFacility && { opacity: 0.6 }]}
              onPress={handleSavePlantFacility}
              disabled={isSubmittingFacility}
            >
              <Text style={styles.saveText}>
                {isSubmittingFacility ? "Saving..." : isEditingFacility ? "Update Plant Record" : "Add Plant Facility"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {plants.map((p) => (
          <View key={p.id} style={styles.facilityCard}>
            <View style={styles.plantIconBox}>
              <Factory size={20} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.facilityName}>{p.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={12} color={Colors.muted} style={{ marginTop: 2 }} />
                <Text style={styles.facilityLoc}>{p.location}</Text>
              </View>
            </View>
            <View style={styles.facilityActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => startEditFacility(p)}>
                <Edit2 size={16} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtnDanger} onPress={() => setDeletingPlantId(p.id)}>
                <Trash2 size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <ConfirmModal
        visible={!!deletingPlantId}
        title="Delete Plant Location?"
        message="Are you sure you want to delete this plant facility record?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        type="danger"
        onConfirm={confirmDeleteFacility}
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
  selectorCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.soft,
  },
  selectorTitle: { fontSize: 14, fontWeight: "900", color: Colors.foreground },
  plantSelectorRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  plantPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.mutedBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  plantPillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  plantPillText: { fontSize: 13, fontWeight: "800", color: Colors.foreground },
  plantPillTextSelected: { color: Colors.white },
  stockCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.soft,
  },
  stockHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stockPlantName: { fontSize: 18, fontWeight: "900", color: Colors.primary },
  stockPlantLoc: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: Colors.primary + "12" },
  refreshBtnText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  tableTitle: { fontSize: 14, fontWeight: "900", color: Colors.foreground },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "50",
  },
  emojiText: { fontSize: 24 },
  prodTitle: { fontSize: 14, fontWeight: "900", color: Colors.foreground },
  prodSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  controlGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.mutedBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stockInput: {
    width: 70,
    height: 36,
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.md,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "900",
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  saveStockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    marginTop: 8,
    ...Shadow.card,
  },
  saveStockText: { fontSize: 14, fontWeight: "900", color: Colors.white },
  facilitySection: { gap: 12, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: Colors.foreground },
  formCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 18, gap: 12, borderWidth: 1, borderColor: Colors.border },
  formTitle: { fontSize: 14, fontWeight: "900", color: Colors.foreground },
  input: { backgroundColor: Colors.mutedBg, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.foreground, borderWidth: 1, borderColor: Colors.border },
  multilineInput: { minHeight: 60, textAlignVertical: "top" },
  formActionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  saveText: { color: Colors.white, fontWeight: "900", fontSize: 13 },
  cancelBtn: { backgroundColor: Colors.mutedBg, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  cancelText: { color: Colors.muted, fontWeight: "800", fontSize: 13 },
  facilityCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.border },
  plantIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  facilityName: { fontSize: 14, fontWeight: "900", color: Colors.foreground },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 4, marginTop: 2 },
  facilityLoc: { fontSize: 12, color: Colors.muted, flex: 1 },
  facilityActions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.mutedBg, alignItems: "center", justifyContent: "center" },
  iconBtnDanger: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.error + "15", alignItems: "center", justifyContent: "center" },
});
