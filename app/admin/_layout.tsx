import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { Building2, Calendar, Factory, Home, Package, Receipt } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import Dock from "../components/Dock";
import { Colors, Shadow } from "@/constants/theme";

export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role !== "admin") {
      router.replace("/delivery");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "admin") {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  const dockItems = [
    { icon: <Home size={18} color={Colors.white} />, label: "Home", onClick: () => router.push("/admin") },
    { icon: <Calendar size={18} color={Colors.white} />, label: "Schedule", onClick: () => router.push("/admin/schedule") },
    { icon: <Building2 size={18} color={Colors.white} />, label: "Partners", onClick: () => router.push("/admin/organizations") },
    { icon: <Factory size={18} color={Colors.white} />, label: "Plants", onClick: () => router.push("/admin/plants") },
    { icon: <Package size={18} color={Colors.white} />, label: "Inventory", onClick: () => router.push("/admin/inventory") },
    { icon: <Receipt size={18} color={Colors.white} />, label: "Expenses", onClick: () => router.push("/admin/expenses") },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageContent}>
        <Slot />
      </View>
      <View style={styles.footer} pointerEvents="box-none">
        <Dock items={dockItems} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pageContent: {
    flex: 1,
    paddingBottom: 110,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 18,
    paddingTop: 8,
    backgroundColor: `${Colors.background}ee`,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    ...Shadow.card,
  },
});
