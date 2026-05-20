import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, Target } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";

const MISSION_POINTS = [
  "Provide safe and pure drinking water",
  "Maintain high-quality standards",
  "Ensure reliable, timely supply",
  "Promote eco-friendly practices",
];

export default function AboutScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.header}
        >
          <Text style={styles.headerLabel}>ABOUT US</Text>
          <Text style={styles.headerTitle}>
            A simple promise:{"\n"}
            <Text style={{ color: "rgba(255,255,255,0.65)" }}>
              water you can trust.
            </Text>
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Intro */}
          <View style={styles.introCard}>
            <Text style={styles.introText}>
              Krio-H₂O is committed to delivering safe, high-quality drinking
              water with a focus on reliability, hygiene and sustainability. We
              pair advanced multi-stage purification with strict quality
              standards — so every drop that reaches you stays pure and
              refreshing.
            </Text>
          </View>

          {/* Vision */}
          <View style={styles.pillar}>
            <View style={[styles.pillarIcon, { backgroundColor: Colors.secondary }]}>
              <Eye size={20} color={Colors.white} />
            </View>
            <View style={styles.pillarContent}>
              <Text style={styles.pillarTitle}>Our Vision</Text>
              <Text style={styles.pillarBody}>
                To become a trusted leader in drinking water solutions across
                Telangana and beyond.
              </Text>
            </View>
          </View>

          {/* Mission */}
          <View style={styles.pillar}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryGlow]}
              style={styles.pillarIcon}
            >
              <Target size={20} color={Colors.white} />
            </LinearGradient>
            <View style={styles.pillarContent}>
              <Text style={styles.pillarTitle}>Our Mission</Text>
              {MISSION_POINTS.map((m) => (
                <View key={m} style={styles.missionRow}>
                  <View style={styles.missionDot} />
                  <Text style={styles.missionText}>{m}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Values strip */}
          <View style={styles.valuesRow}>
            {["Purity", "Reliability", "Sustainability", "Trust"].map((v) => (
              <View key={v} style={styles.valueChip}>
                <Text style={styles.valueChipText}>{v}</Text>
              </View>
            ))}
          </View>
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
    fontSize: 30,
    fontWeight: "800",
    color: Colors.white,
    lineHeight: 38,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  introCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  introText: {
    fontSize: 15,
    color: Colors.muted,
    lineHeight: 24,
  },
  pillar: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 18,
    flexDirection: "row",
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  pillarIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pillarContent: { flex: 1 },
  pillarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.foreground,
    marginBottom: 6,
  },
  pillarBody: {
    fontSize: 14,
    color: Colors.muted,
    lineHeight: 21,
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 6,
  },
  missionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  missionText: {
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 20,
    flex: 1,
  },
  valuesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  valueChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary + "12",
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  valueChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
});
