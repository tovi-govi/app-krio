import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Download, X, Calendar, Building2, Check, Mail } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { Organization, DeliveryRecord, useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { aggregateMonthlyDeliveries, getMonthName } from "@/utils/invoiceAggregator";
import { generateAndDownloadExcelInvoice, emailExcelInvoice } from "@/utils/excelInvoiceGenerator";
import Toast, { ToastMessage } from "@/components/UI/Toast";

type DownloadInvoiceModalProps = {
  visible: boolean;
  onClose: () => void;
  organizations: Organization[];
  deliveries: DeliveryRecord[];
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: getMonthName(i + 1),
}));

const currentYear = new Date().getFullYear();
const YEARS = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

export default function DownloadInvoiceModal({
  visible,
  onClose,
  organizations,
  deliveries,
}: DownloadInvoiceModalProps) {
  const { user } = useAuth();
  const { products } = useCart();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("ALL");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingMode, setGeneratingMode] = useState<"DOWNLOAD" | "EMAIL" | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  const recipientEmail = user?.email || "admin@krioh2o.com";

  const handleEmailExcel = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGeneratingMode("EMAIL");

    try {
      const result = aggregateMonthlyDeliveries({
        deliveries,
        month: selectedMonth,
        year: selectedYear,
        organizationId: selectedOrgId,
        organizations,
        products,
      });

      if (!result.hasData || result.rows.length === 0) {
        setToast({
          id: Date.now().toString(),
          type: "warning",
          title: "No Data Found",
          message: `No delivery records found for ${result.monthName} ${result.year}. Cannot email an empty report.`,
        });
        return;
      }

      const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
      const orgFilterName = selectedOrgId === "ALL" ? "ALL" : selectedOrg?.name;

      await emailExcelInvoice({
        result,
        organizationNameFilter: orgFilterName,
        recipientEmail,
      });

      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Email Ready",
        message: `Excel report composer opened for ${recipientEmail}.`,
      });

      onClose();
    } catch (error: any) {
      console.error("Failed to email Excel invoice:", error);
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Email Failed",
        message: error.message || "Could not launch email composer for Excel report.",
      });
    } finally {
      setIsGenerating(false);
      setGeneratingMode(null);
    }
  };

  const handleDownloadExcel = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGeneratingMode("DOWNLOAD");

    try {
      const result = aggregateMonthlyDeliveries({
        deliveries,
        month: selectedMonth,
        year: selectedYear,
        organizationId: selectedOrgId,
        organizations,
        products,
      });

      if (!result.hasData || result.rows.length === 0) {
        setToast({
          id: Date.now().toString(),
          type: "warning",
          title: "No Data Found",
          message: `No delivery records found for ${result.monthName} ${result.year}. Cannot export an empty spreadsheet.`,
        });
        return;
      }

      const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
      const orgFilterName = selectedOrgId === "ALL" ? "ALL" : selectedOrg?.name;

      await generateAndDownloadExcelInvoice({
        result,
        organizationNameFilter: orgFilterName,
      });

      onClose();
    } catch (error: any) {
      console.error("Failed to generate Excel invoice:", error);
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Excel Export Failed",
        message: error.message || "Could not generate Excel spreadsheet.",
      });
    } finally {
      setIsGenerating(false);
      setGeneratingMode(null);
    }
  };

  const selectedMonthLabel = getMonthName(selectedMonth);
  const selectedOrgLabel =
    selectedOrgId === "ALL"
      ? "All Organizations"
      : organizations.find((o) => o.id === selectedOrgId)?.name || "Select Organization";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <Download size={22} color={Colors.primary} />
              <Text style={styles.modalTitle}>Export Monthly Report</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={isGenerating}>
              <X size={20} color={Colors.muted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSub}>
            Generate and email your monthly Excel (.xlsx) report directly to your registered email address.
          </Text>

          {/* Registered Email Badge */}
          <View style={styles.emailBadgeBox}>
            <Mail size={16} color={Colors.primary} />
            <Text style={styles.emailBadgeLabel}>Registered Email: </Text>
            <Text style={styles.emailBadgeValue}>{recipientEmail}</Text>
          </View>

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {/* Month Selection */}
            <Text style={styles.fieldLabel}>Select Month</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => {
                setShowMonthDropdown((prev) => !prev);
                setShowYearDropdown(false);
                setShowOrgDropdown(false);
              }}
              disabled={isGenerating}
            >
              <Calendar size={18} color={Colors.primary} />
              <Text style={styles.dropdownBtnText}>{selectedMonthLabel}</Text>
            </TouchableOpacity>
            {showMonthDropdown && (
              <View style={styles.dropdownMenu}>
                {MONTHS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setSelectedMonth(m.value);
                      setShowMonthDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedMonth === m.value && styles.optionTextSelected,
                      ]}
                    >
                      {m.label}
                    </Text>
                    {selectedMonth === m.value && <Check size={16} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Year Selection */}
            <Text style={styles.fieldLabel}>Select Year</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => {
                setShowYearDropdown((prev) => !prev);
                setShowMonthDropdown(false);
                setShowOrgDropdown(false);
              }}
              disabled={isGenerating}
            >
              <Calendar size={18} color={Colors.primary} />
              <Text style={styles.dropdownBtnText}>{selectedYear}</Text>
            </TouchableOpacity>
            {showYearDropdown && (
              <View style={styles.dropdownMenu}>
                {YEARS.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setSelectedYear(y);
                      setShowYearDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedYear === y && styles.optionTextSelected,
                      ]}
                    >
                      {y}
                    </Text>
                    {selectedYear === y && <Check size={16} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Organization Selection */}
            <Text style={styles.fieldLabel}>Organization Filter</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => {
                setShowOrgDropdown((prev) => !prev);
                setShowMonthDropdown(false);
                setShowYearDropdown(false);
              }}
              disabled={isGenerating}
            >
              <Building2 size={18} color={Colors.primary} />
              <Text style={styles.dropdownBtnText}>{selectedOrgLabel}</Text>
            </TouchableOpacity>
            {showOrgDropdown && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    setSelectedOrgId("ALL");
                    setShowOrgDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedOrgId === "ALL" && styles.optionTextSelected,
                    ]}
                  >
                    All Organizations
                  </Text>
                  {selectedOrgId === "ALL" && <Check size={16} color={Colors.primary} />}
                </TouchableOpacity>

                {organizations.map((org) => (
                  <TouchableOpacity
                    key={org.id}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setSelectedOrgId(org.id);
                      setShowOrgDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedOrgId === org.id && styles.optionTextSelected,
                      ]}
                    >
                      {org.name}
                    </Text>
                    {selectedOrgId === org.id && <Check size={16} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.downloadSubmitBtn, styles.emailBtn, isGenerating && styles.disabledBtn]}
              onPress={handleEmailExcel}
              disabled={isGenerating}
            >
              {isGenerating && generatingMode === "EMAIL" ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Mail size={18} color={Colors.white} />
                  <Text style={styles.downloadSubmitText}>Email XLSX Report</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.downloadSubmitBtn, styles.excelBtn, isGenerating && styles.disabledBtn]}
              onPress={handleDownloadExcel}
              disabled={isGenerating}
            >
              {isGenerating && generatingMode === "DOWNLOAD" ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Download size={18} color={Colors.white} />
                  <Text style={styles.downloadSubmitText}>Download XLSX</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.soft,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.foreground,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.mutedBg,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSub: {
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 18,
  },
  emailBadgeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.mutedBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  emailBadgeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.muted,
  },
  emailBadgeValue: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.primary,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.foreground,
    marginTop: 8,
    marginBottom: 4,
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.foreground,
  },
  dropdownMenu: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionText: {
    fontSize: 13,
    color: Colors.foreground,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  downloadSubmitBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emailBtn: {
    backgroundColor: Colors.primary,
  },
  excelBtn: {
    backgroundColor: "#10B981",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  downloadSubmitText: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: 13,
  },
});
