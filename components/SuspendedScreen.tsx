import { useEffect } from "react";
import { View, Text, StyleSheet, Image, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import { AlertOctagon, Lock } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";

export default function SuspendedScreen() {
  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        SplashScreen.hideAsync().catch(() => {});
      } catch (e) {}
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.gradient}>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/logos/krio-logo.png")}
              style={{ width: 180, height: 60 }}
              resizeMode="contain"
            />
          </View>

          <View style={styles.iconBadge}>
            <AlertOctagon size={48} color="#EF4444" />
          </View>

          <Text style={styles.title}>Service Suspended</Text>
          <Text style={styles.subtitle}>
            Access to this application service has been temporarily disabled.
          </Text>

          <View style={styles.infoBox}>
            <Lock size={18} color="#F59E0B" style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              Please contact your application developer or administrator to resolve pending account requirements and restore full access.
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    ...Shadow.soft,
  },
  logoContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 28,
  },
  iconBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#FCD34D",
    lineHeight: 18,
  },
});
