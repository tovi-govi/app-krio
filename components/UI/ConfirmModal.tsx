import React from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AlertCircle, CheckCircle } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  type?: "primary" | "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isConfirming = false,
  type = "primary",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const getButtonColor = () => {
    switch (type) {
      case "danger":
        return Colors.error;
      case "success":
        return Colors.success;
      default:
        return Colors.primary;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            {type === "danger" ? (
              <AlertCircle size={24} color={Colors.error} />
            ) : (
              <CheckCircle size={24} color={Colors.primary} />
            )}
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={isConfirming}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: getButtonColor() }, isConfirming && styles.disabledBtn]}
              onPress={onConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
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
  card: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "90%",
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.glow,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.foreground,
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: Colors.muted,
    lineHeight: 22,
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
  },
  cancelBtn: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.mutedBg,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.muted,
  },
  confirmBtn: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.full,
    minWidth: 108,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.card,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.white,
  },
});
