import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View, ViewStyle } from "react-native";
import { Search, X } from "lucide-react-native";
import { Colors, Radius } from "@/constants/theme";

type SearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
};

export default function SearchInput({
  value,
  onChangeText,
  placeholder = "Search...",
  style,
}: SearchInputProps) {
  return (
    <View style={[styles.container, style]}>
      <Search size={18} color={Colors.muted} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.muted}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
      />
      {value ? (
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => onChangeText("")}
          accessibilityLabel="Clear search text"
        >
          <X size={16} color={Colors.muted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.foreground,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
});
