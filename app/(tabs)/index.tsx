import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ShieldCheck,
  Leaf,
  ArrowRight,
  Phone,
  MapPin,
  Globe,
  MessageCircle,
} from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

// SVG logos imported as React components via react-native-svg-transformer
import HdfcLogo from "@/assets/logos/hdfc.svg";
import BajajLogo from "@/assets/logos/bajaj.svg";
import DigitLogo from "@/assets/logos/digit.svg";
import LicLogo from "@/assets/logos/lic.svg";

const { width } = Dimensions.get("window");

const CONTACTS = [
  { icon: MapPin, label: "Hayathnagar, Hyderabad", href: null },
  { icon: Phone, label: "9666 049 292", href: "tel:9666049292" },
  { icon: Phone, label: "9666 049 898", href: "tel:9666049898" },
  { icon: Globe, label: "krioh2o.com", href: "https://krioh2o.com" },
];

// Each customer: either an SVG component, a raster require, or an emoji fallback
type Customer =
  | { name: string; type: "svg"; Logo: React.FC<{ width: number; height: number }> }
  | { name: string; type: "img"; source: any }
  | { name: string; type: "emoji"; emoji: string };

const CUSTOMERS: Customer[] = [
  { name: "HDFC Bank", type: "svg", Logo: HdfcLogo as any },
  { name: "Equitas Small Finance Bank", type: "img", source: require("@/assets/logos/equitas.jpg") },
  { name: "Bajaj Home Finance", type: "svg", Logo: BajajLogo as any },
  { name: "Digit Insurance", type: "svg", Logo: DigitLogo as any },
  { name: "LIC of India", type: "svg", Logo: LicLogo as any },
  { name: "DP Chocolates", type: "emoji", emoji: "🍫" },
  { name: "Associated Projects Infra", type: "img", source: require("@/assets/logos/associate.webp") },
];

function CustomerLogo({ customer }: { customer: Customer }) {
  if (customer.type === "emoji") {
    return <Text style={{ fontSize: 24 }}>{customer.emoji}</Text>;
  }
  if (customer.type === "img") {
    return (
      <Image
        source={customer.source}
        style={styles.customerLogoImg}
        resizeMode="contain"
      />
    );
  }
  // SVG component from transformer
  const Logo = customer.Logo;
  return <Logo width={60} height={36} />;
}

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── HERO ── */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight, Colors.primaryGlow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.headerRow}>
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoIconText}>💧</Text>
              </View>
              <Text style={styles.logoText}>
                Krio<Text style={{ color: Colors.secondaryLight }}>-H₂O</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.accountBtn}
              onPress={() => router.push(user ? "/profile" : "/login")}
            >
              <Text style={styles.accountBtnText}>
                {user ? user.name.split(" ")[0] : "Login"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>WELLNESS IN EVERY DROP</Text>
          </View>

          <Text style={styles.headline}>
            Pure water.{"\n"}
            <Text style={{ color: Colors.secondaryLight }}>Honest promise.</Text>
          </Text>

          <Text style={styles.subtext}>
            Krio-H₂O delivers clean, mineral-balanced drinking water across
            Telangana — from a 200 ml bottle to a 20 L home jar.
          </Text>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() => Linking.openURL("tel:9666049292")}
            >
              <Phone size={16} color={Colors.white} />
              <Text style={styles.ctaPrimaryText}>Order Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={() => router.push("/(tabs)/products")}
            >
              <Text style={styles.ctaSecondaryText}>Explore Range</Text>
              <ArrowRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <ShieldCheck size={14} color={Colors.secondaryLight} />
              <Text style={styles.trustText}>BIS Compliant</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Leaf size={14} color={Colors.secondaryLight} />
              <Text style={styles.trustText}>Eco Packaging</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Text style={[styles.trustText, { color: Colors.secondaryLight }]}>✓</Text>
              <Text style={styles.trustText}>Trusted by HDFC & more</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── STATS BAR ── */}
        <View style={styles.statsBar}>
          {[
            { v: "10+", l: "Brands" },
            { v: "5", l: "Pack sizes" },
            { v: "100%", l: "BIS" },
            { v: "24/7", l: "Support" },
          ].map((s, i) => (
            <View key={s.l} style={[styles.statItem, i < 3 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            <QuickCard emoji="📦" label="Products" onPress={() => router.push("/(tabs)/products")} />
            <QuickCard emoji="🏢" label="About Us" onPress={() => router.push("/(tabs)/about")} />
            <QuickCard emoji="🛒" label="Cart" onPress={() => router.push("/(tabs)/cart")} />
            <QuickCard emoji="📞" label="Call Us" onPress={() => Linking.openURL("tel:9666049292")} />
          </View>
        </View>

        {/* ── CUSTOMERS ── */}
        <View style={styles.customersBg}>
          <View style={styles.customersHeader}>
            <Text style={styles.customersLabel}>OUR KEY CUSTOMERS</Text>
            <Text style={styles.customersTitle}>Trusted by leading organisations</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.customersScroll}
          >
            {CUSTOMERS.map((c) => (
              <View key={c.name} style={styles.customerChip}>
                <View style={styles.customerLogoBox}>
                  <CustomerLogo customer={c} />
                </View>
                <Text style={styles.customerChipName} numberOfLines={2}>
                  {c.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── CONTACT ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <Text style={styles.contactSub}>
            Call us to schedule a delivery or set up a subscription for your home or office.
          </Text>

          {CONTACTS.map(({ icon: Icon, label, href }) => (
            <TouchableOpacity
              key={label}
              style={styles.contactRow}
              onPress={() => href && Linking.openURL(href)}
              disabled={!href}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryGlow]}
                style={styles.contactIcon}
              >
                <Icon size={16} color={Colors.white} />
              </LinearGradient>
              <Text style={[styles.contactLabel, !!href && { color: Colors.primary }]}>
                {label}
              </Text>
              {href && <Text style={styles.contactArrow}>→</Text>}
            </TouchableOpacity>
          ))}

          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL("tel:9666049292")}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryGlow]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.callBtnGrad}
              >
                <Phone size={16} color={Colors.white} />
                <Text style={styles.callBtnText}>Call to Order</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={() => Linking.openURL("https://wa.me/919666049292")}
            >
              <MessageCircle size={16} color={Colors.secondary} />
              <Text style={styles.whatsappBtnText}>WhatsApp Us</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hoursCard}>
            <Text style={styles.hoursTitle}>Working Hours</Text>
            <Text style={styles.hoursText}>Monday – Saturday: 8 AM – 8 PM</Text>
            <Text style={styles.hoursText}>Sunday: 9 AM – 5 PM</Text>
            <View style={styles.hoursDivider} />
            <Text style={styles.hoursTitle}>Service Area</Text>
            <Text style={styles.hoursText}>
              Hayathnagar, Hyderabad and surrounding areas across Telangana.
            </Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickCard({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickCard} onPress={onPress}>
      <Text style={styles.quickEmoji}>{emoji}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  logoIconText: { fontSize: 18 },
  logoText: { fontSize: 22, fontWeight: "800", color: Colors.white, letterSpacing: -0.5 },
  accountBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  accountBtnText: { color: Colors.white, fontWeight: "600", fontSize: 13 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, marginBottom: 16 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.secondaryLight },
  badgeText: { color: "rgba(255,255,255,0.9)", fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  headline: { fontSize: 38, fontWeight: "800", color: Colors.white, lineHeight: 46, letterSpacing: -1, marginBottom: 14 },
  subtext: { fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 22, marginBottom: 28 },
  ctaRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  ctaPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.secondary, paddingVertical: 14, borderRadius: Radius.lg },
  ctaPrimaryText: { color: Colors.white, fontWeight: "700", fontSize: 15 },
  ctaSecondary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.white, paddingVertical: 14, borderRadius: Radius.lg },
  ctaSecondaryText: { color: Colors.primary, fontWeight: "700", fontSize: 15 },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  trustText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "500" },
  trustDivider: { width: 1, height: 12, backgroundColor: "rgba(255,255,255,0.25)" },
  statsBar: { flexDirection: "row", backgroundColor: Colors.white, ...Shadow.card },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statBorder: { borderRightWidth: 1, borderRightColor: Colors.border },
  statValue: { fontSize: 20, fontWeight: "800", color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.muted, fontWeight: "500", marginTop: 2 },
  section: { padding: 20, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: Colors.foreground, marginBottom: 4 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: { width: (width - 50) / 2, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 20, alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  quickEmoji: { fontSize: 28 },
  quickLabel: { fontSize: 14, fontWeight: "600", color: Colors.foreground },
  customersBg: { backgroundColor: Colors.mutedBg, paddingVertical: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  customersHeader: { paddingHorizontal: 20, marginBottom: 14 },
  customersLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, color: Colors.muted, marginBottom: 4 },
  customersTitle: { fontSize: 17, fontWeight: "800", color: Colors.foreground },
  customersScroll: { paddingHorizontal: 20, gap: 10, flexDirection: "row" },
  customerChip: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, alignItems: "center", width: 110, gap: 8, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  customerLogoBox: { width: 60, height: 40, alignItems: "center", justifyContent: "center" },
  customerLogoImg: { width: 60, height: 40 },
  customerChipName: { fontSize: 10, fontWeight: "600", color: Colors.foreground, textAlign: "center", lineHeight: 14 },
  contactSub: { fontSize: 13, color: Colors.muted, lineHeight: 19, marginTop: -4, marginBottom: 4 },
  contactRow: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  contactIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  contactLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: Colors.foreground },
  contactArrow: { fontSize: 16, color: Colors.primary },
  contactButtons: { gap: 10, marginTop: 4 },
  callBtn: { borderRadius: Radius.lg, overflow: "hidden", ...Shadow.soft },
  callBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14 },
  callBtnText: { fontSize: 15, fontWeight: "700", color: Colors.white },
  whatsappBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 13, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.secondary, backgroundColor: Colors.white },
  whatsappBtnText: { fontSize: 15, fontWeight: "700", color: Colors.secondary },
  hoursCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.card, gap: 4 },
  hoursTitle: { fontSize: 13, fontWeight: "700", color: Colors.foreground, marginBottom: 2, marginTop: 4 },
  hoursText: { fontSize: 13, color: Colors.muted, lineHeight: 19 },
  hoursDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
});
