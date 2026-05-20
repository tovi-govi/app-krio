import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Phone, Globe, MessageCircle } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";

const CONTACTS = [
  { icon: MapPin, label: "Hayathnagar, Hyderabad", href: null },
  { icon: Phone, label: "9666 049 292", href: "tel:9666049292" },
  { icon: Phone, label: "9666 049 898", href: "tel:9666049898" },
  { icon: Globe, label: "krioh2o.com", href: "https://krioh2o.com" },
];

export default function ContactScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.header}
        >
          <Text style={styles.headerLabel}>GET IN TOUCH</Text>
          <Text style={styles.headerTitle}>
            Order water,{"\n"}
            <Text style={{ color: "rgba(255,255,255,0.65)" }}>
              any size, anytime.
            </Text>
          </Text>
          <Text style={styles.headerSub}>
            Call us to schedule a one-time delivery or set up a regular
            subscription for your home, office or event.
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Contact rows */}
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
                <Icon size={18} color={Colors.white} />
              </LinearGradient>
              <Text style={[styles.contactLabel, href && { color: Colors.primary }]}>
                {label}
              </Text>
              {href && <Text style={styles.contactArrow}>→</Text>}
            </TouchableOpacity>
          ))}

          {/* Action buttons */}
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
              <Phone size={18} color={Colors.white} />
              <Text style={styles.callBtnText}>Call to Order</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={() =>
              Linking.openURL("https://wa.me/919666049292")
            }
          >
            <MessageCircle size={18} color={Colors.secondary} />
            <Text style={styles.whatsappBtnText}>WhatsApp Us</Text>
          </TouchableOpacity>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Working Hours</Text>
            <Text style={styles.infoText}>Monday – Saturday: 8 AM – 8 PM</Text>
            <Text style={styles.infoText}>Sunday: 9 AM – 5 PM</Text>
            <View style={styles.infoDivider} />
            <Text style={styles.infoTitle}>Service Area</Text>
            <Text style={styles.infoText}>
              Hayathnagar, Hyderabad and surrounding areas across Telangana.
            </Text>
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
    marginBottom: 10,
  },
  headerSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 21,
  },
  content: { padding: 20, gap: 12 },
  contactRow: {
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
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  contactLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.foreground,
  },
  contactArrow: {
    fontSize: 18,
    color: Colors.primary,
  },
  callBtn: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginTop: 4,
    ...Shadow.soft,
  },
  callBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  callBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },
  whatsappBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.secondary,
    backgroundColor: Colors.white,
  },
  whatsappBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.secondary,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.foreground,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 20,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
});
