import type { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export type DockItemData = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
};

type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: { mass: number; stiffness: number; damping: number };
};

export default function Dock(props: DockProps) {
  const { items } = props;
  return (
    <View style={styles.wrapper}>
      {items.map((item, index) => (
        <TouchableOpacity key={index} style={styles.button} onPress={item.onClick}>
          <View style={styles.iconContainer}>{item.icon}</View>
          <Text style={styles.label}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(18,15,23,0.96)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
    marginBottom: 8,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  iconContainer: {
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
});
