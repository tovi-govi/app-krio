import { View, Text, ScrollView, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Radius, Shadow } from "@/constants/theme";

const CUSTOMERS = [
  { name: "HDFC Bank", domain: "hdfcbank.com" },
  { name: "Equitas Small Finance Bank", domain: "equitasbank.com" },
  { name: "Bajaj Home Finance", domain: "bajajfinserv.in" },
  { name: "Digit Insurance", domain: "godigit.com" },
  { name: "LIC of India", domain: "licindia.in" },
  { name: "DP Chocolates", domain: null },
  { name: "Associated Projects Infra Pvt. Ltd.", domain: null },
];

const STATS = [
  { v: "10+", l: "Trusted brands" },
  { v: "5", l: "Pack sizes" },
  { v: "100%", l: "BIS compliant" },
  { v: "24/7", l: "Customer care" },
];

export default function CustomersScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.header}
        >
          <Text style={styles.headerLabel}>OUR KEY CUSTOMERS</Text>
          <Text style={styles.headerTitle}>
            Serving trusted organisations{"\n"}
            <Text style={{ color: "rgba(255,255,255,0.65)" }}>
              across Telangana.
            </Text>
          </Text>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((s, i) => (
            <View key={s.l} style={[styles.statItem, i < 3 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Who trusts us</Text>
          {CUSTOMERS.map((c) => (
            <View key={c.name} style={styles.customerCard}>
              <View style={styles.customerLogo}>
                {c.domain ? (
                  <Image
                    source={{
                      uri: `https://img.logo.dev/${c.domain}?token=pk_X-1ZO13GSgeOoUrIuJ6BeQ`,
                    }}
                    style={styles.logoImg}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.logoFallback}>🏢</Text>
                )}
              </View>
              <Text style={styles.customerName}>{c.name}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
    lineHeight: 36,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadow.card,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.muted,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  content: { padding: 20, gap: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.foreground,
    marginBottom: 4,
  },
  customerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  customerLogo: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.mutedBg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: {
    width: 44,
    height: 44,
  },
  logoFallback: { fontSize: 24 },
  customerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.foreground,
    lineHeight: 20,
  },
});
