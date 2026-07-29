import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastMessage = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type ToastProps = {
  toast: ToastMessage | null;
  onDismiss: () => void;
};

export default function Toast({ toast, onDismiss }: ToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        dismiss();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [toast]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!toast) return null;

  const renderIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle2 size={20} color={Colors.success} />;
      case "error":
        return <XCircle size={20} color={Colors.error} />;
      case "warning":
        return <AlertCircle size={20} color={Colors.warning} />;
      default:
        return <Info size={20} color={Colors.info} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.contentRow}>
        <View style={styles.iconBox}>{renderIcon()}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{toast.title}</Text>
          {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    maxWidth: 500,
    alignSelf: "center",
    width: "100%",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 9999,
    ...Shadow.glow,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.foreground,
  },
  message: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
    lineHeight: 18,
  },
});
