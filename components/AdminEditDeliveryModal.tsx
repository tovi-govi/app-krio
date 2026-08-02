import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { X, AlertTriangle, Check, Factory, Building2, User, FileText, Trash2, Edit3 } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { DeliveryRecord, Organization, Plant } from "@/context/CartContext";

type Props = {
  visible: boolean;
  onClose: () => void;
  delivery: DeliveryRecord | null;
  organizations: Organization[];
  plants: Plant[];
  currentUserName: string;
  onSave: (
    deliveryId: string,
    updatedData: Partial<DeliveryRecord>,
    editedBy: string,
    editReason?: string
  ) => Promise<void>;
  onDelete?: (deliveryId: string) => Promise<void>;
};

export default function AdminEditDeliveryModal({
  visible,
  onClose,
  delivery,
  organizations,
  plants,
  currentUserName,
  onSave,
  onDelete,
}: Props) {
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedPlantId, setSelectedPlantId] = useState("");
  const [fullCansLoaded, setFullCansLoaded] = useState("0");
  const [emptyCansReturned, setEmptyCansReturned] = useState("0");
  const [cases200ml, setCases200ml] = useState("0");
  const [cases500ml, setCases500ml] = useState("0");
  const [cases1l, setCases1l] = useState("0");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [editReason, setEditReason] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (delivery) {
      setSelectedOrgId(delivery.organizationId || "");
      setSelectedPlantId(delivery.plantId || "");
      setFullCansLoaded(String(delivery.fullCansLoaded ?? 0));
      setEmptyCansReturned(String(delivery.emptyCansReturned ?? 0));
      setCases200ml(String(delivery.cases200mlDelivered ?? 0));
      setCases500ml(String(delivery.cases500mlDelivered ?? 0));
      setCases1l(String(delivery.cases1lDelivered ?? 0));
      setDeliveredBy(delivery.deliveredBy || "");
      setEditReason("");
      setErrorMessage(null);
    }
  }, [delivery, visible]);

  if (!delivery) return null;

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
  const selectedPlant = plants.find((p) => p.id === selectedPlantId);

  const handleValidateAndPrompt = () => {
    setErrorMessage(null);

    const loaded = Number(fullCansLoaded);
    const empty = Number(emptyCansReturned);
    const c200 = Number(cases200ml);
    const c500 = Number(cases500ml);
    const c1l = Number(cases1l);

    if (isNaN(loaded) || loaded < 0) {
      setErrorMessage("Full Cans Loaded must be a valid non-negative number.");
      return;
    }
    if (isNaN(empty) || empty < 0) {
      setErrorMessage("Empty Cans Returned must be a valid non-negative number.");
      return;
    }
    if (isNaN(c200) || c200 < 0) {
      setErrorMessage("200ml Cases must be a valid non-negative number.");
      return;
    }
    if (isNaN(c500) || c500 < 0) {
      setErrorMessage("500ml Cases must be a valid non-negative number.");
      return;
    }
    if (isNaN(c1l) || c1l < 0) {
      setErrorMessage("1L Cases must be a valid non-negative number.");
      return;
    }

    if (!selectedPlantId && !delivery.plantId) {
      setErrorMessage("Please select a target bottling plant facility.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    if (isSubmitting || !delivery) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const loaded = Math.max(0, Number(fullCansLoaded) || 0);
      const empty = Math.max(0, Number(emptyCansReturned) || 0);
      const c200 = Math.max(0, Number(cases200ml) || 0);
      const c500 = Math.max(0, Number(cases500ml) || 0);
      const c1l = Math.max(0, Number(cases1l) || 0);

      const updatedPayload: Partial<DeliveryRecord> = {
        organizationId: selectedOrgId || delivery.organizationId,
        organizationName: selectedOrg?.name || delivery.organizationName,
        plantId: selectedPlantId || delivery.plantId,
        plantName: selectedPlant?.name || delivery.plantName || "Main Plant",
        plantLocation: selectedPlant?.location || delivery.plantLocation || "",
        fullCansLoaded: loaded,
        emptyCansReturned: empty,
        cases200mlDelivered: c200,
        cases500mlDelivered: c500,
        cases1lDelivered: c1l,
        deliveredBy: deliveredBy.trim() || delivery.deliveredBy || currentUserName,
      };

      await onSave(
        delivery.id,
        updatedPayload,
        currentUserName || "Admin",
        editReason.trim() || "Admin inventory adjustment"
      );

      setShowConfirmModal(false);
      onClose();
    } catch (err: any) {
      console.error("Admin delivery edit error:", err);
      setErrorMessage(err.message || "Failed to update delivery record.");
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || !delivery || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDelete(delivery.id);
      setShowDeleteModal(false);
      onClose();
    } catch (err: any) {
      console.error("Failed to delete delivery:", err);
      setErrorMessage(err.message || "Failed to delete delivery record.");
      setShowDeleteModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Edit3 size={20} color={Colors.primary} />
              <Text style={styles.headerTitle}>Edit Delivery Log</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Immutable Metadata */}
            <View style={styles.metaBox}>
              <Text style={styles.metaTitle}>Document Ref: {delivery.id}</Text>
              <Text style={styles.metaSub}>
                Created: {delivery.createdAt ? new Date(delivery.createdAt).toLocaleString() : "N/A"}
              </Text>
              {delivery.isEdited && delivery.editedBy && (
                <Text style={styles.editedBadgeText}>
                  Last edited by {delivery.editedBy} on{" "}
                  {delivery.editedAt ? new Date(delivery.editedAt).toLocaleString() : ""}
                </Text>
              )}
            </View>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <AlertTriangle size={16} color="#DC2626" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Organization Selector */}
            <Text style={styles.fieldLabel}>Organization Partner</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {organizations.map((org) => {
                const isSelected = (selectedOrgId || delivery.organizationId) === org.id;
                return (
                  <TouchableOpacity
                    key={org.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedOrgId(org.id)}
                  >
                    <Building2 size={14} color={isSelected ? Colors.white : Colors.primary} />
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {org.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Bottling Plant Selector */}
            <Text style={styles.fieldLabel}>Source Bottling Plant</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {plants.map((plant) => {
                const isSelected = (selectedPlantId || delivery.plantId) === plant.id;
                return (
                  <TouchableOpacity
                    key={plant.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedPlantId(plant.id)}
                  >
                    <Factory size={14} color={isSelected ? Colors.white : Colors.primary} />
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {plant.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Delivered Quantities */}
            <Text style={styles.sectionHeaderTitle}>Inventory Quantities</Text>

            <View style={styles.inputGrid}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Full 20L Cans</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  value={fullCansLoaded}
                  onChangeText={setFullCansLoaded}
                  placeholder="0"
                />
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Empty Cans Returned</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  value={emptyCansReturned}
                  onChangeText={setEmptyCansReturned}
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.inputGrid}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>200ml Packs (35s)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  value={cases200ml}
                  onChangeText={setCases200ml}
                  placeholder="0"
                />
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>500ml Cases (24s)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  value={cases500ml}
                  onChangeText={setCases500ml}
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.inputColFull}>
              <Text style={styles.inputLabel}>1 Litre Cases (12s)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="number-pad"
                value={cases1l}
                onChangeText={setCases1l}
                placeholder="0"
              />
            </View>

            {/* Delivered By & Reason */}
            <Text style={styles.fieldLabel}>Delivered By (Driver Name)</Text>
            <TextInput
              style={styles.textInputFull}
              value={deliveredBy}
              onChangeText={setDeliveredBy}
              placeholder="Driver / Staff name"
            />

            <Text style={styles.fieldLabel}>Reason for Edit (Audit Log)</Text>
            <TextInput
              style={styles.textInputFull}
              value={editReason}
              onChangeText={setEditReason}
              placeholder="e.g. Corrected count entered by driver"
            />

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            {onDelete ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => setShowDeleteModal(true)}
                disabled={isSubmitting}
              >
                <Trash2 size={16} color="#DC2626" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleValidateAndPrompt}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <AlertTriangle size={32} color={Colors.primary} />
            <Text style={styles.confirmTitle}>Confirm Admin Edit?</Text>
            <Text style={styles.confirmText}>
              Editing this delivery will atomically update plant inventory, financial reports, invoices, and schedule records. Continue?
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmOkBtn}
                onPress={handleConfirmSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmOkText}>Confirm & Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Trash2 size={32} color="#DC2626" />
            <Text style={styles.confirmTitle}>Delete Delivery Record?</Text>
            <Text style={styles.confirmText}>
              This will restore full stock back to the source plant and permanently delete this record.
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowDeleteModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmOkBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleConfirmDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmOkText}>Delete Record</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "88%",
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.foreground,
  },
  closeBtn: {
    padding: 4,
  },
  formScroll: {
    maxHeight: 480,
  },
  metaBox: {
    backgroundColor: Colors.mutedBg,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.foreground,
  },
  metaSub: {
    fontSize: 11,
    color: Colors.muted,
  },
  editedBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.foreground,
    marginTop: 10,
    marginBottom: 6,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.primary,
    marginTop: 14,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.mutedBg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.foreground,
  },
  chipTextSelected: {
    color: Colors.white,
  },
  inputGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  inputCol: {
    flex: 1,
  },
  inputColFull: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.muted,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "800",
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textInputFull: {
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.mutedBg,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.foreground,
  },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.white,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 24,
    alignItems: "center",
    gap: 12,
    maxWidth: 360,
    width: "100%",
    ...Shadow.card,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.foreground,
    textAlign: "center",
  },
  confirmText: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 8,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.mutedBg,
    alignItems: "center",
  },
  confirmCancelText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.foreground,
  },
  confirmOkBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  confirmOkText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.white,
  },
});
