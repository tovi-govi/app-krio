import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Lock, Shield } from "lucide-react-native";
import KrioLogo from "@/assets/logos/krio-logo.svg";
import { useAuth } from "@/context/AuthContext";
import { Colors, Radius, Shadow } from "@/constants/theme";

export default function LoginScreen() {
  const { loginAdmin } = useAuth();
  const [staffUser, setStaffUser] = useState("");
  const [staffPass, setStaffPass] = useState("");
  const [loading, setLoading] = useState(false);

  const submitLogin = async () => {
    if (!staffUser.trim() || !staffPass) {
      Alert.alert("Missing login details", "Enter your email and password to continue.");
      return;
    }

    try {
      setLoading(true);
      const role = await loginAdmin(staffUser, staffPass);
      if (!role) {
        Alert.alert("Access not enabled", "This account is not approved for staff access.");
        return;
      }
      router.replace(role === "delivery" ? "/delivery" : "/admin");
    } catch (error: any) {
      Alert.alert("Login failed", error.message || "Could not sign in right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.topSection}>
            <View style={styles.logoArea}>
              <View style={styles.logoContainer}>
                <KrioLogo width={220} height={75} />
              </View>
              <Text style={styles.tagline}>Secure staff login for admin and delivery operations</Text>
            </View>
          </LinearGradient>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Staff Login</Text>
            <Text style={styles.formSub}>Sign in with your Firebase staff account to access the dashboard for your role.</Text>
            <Input icon={<Shield size={16} color={Colors.muted} />} placeholder="Staff email" value={staffUser} onChangeText={setStaffUser} keyboardType="email-address" autoCapitalize="none" />
            <Input icon={<Lock size={16} color={Colors.muted} />} placeholder="Password" value={staffPass} onChangeText={setStaffPass} secureTextEntry />
            <MainButton label={loading ? "Signing in..." : "Login"} onPress={submitLogin} disabled={loading} />
            <Text style={styles.adminHint}>Create the staff account in Firebase Authentication, then add their UID or email as a document in Firestore admins.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Input({ icon, ...props }: any) {
  return (
    <View style={styles.inputRow}>
      <View style={styles.inputIcon}>{icon}</View>
      <TextInput style={styles.input} placeholderTextColor={Colors.muted} {...props} />
    </View>
  );
}

function MainButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity style={[styles.submitBtn, disabled && { opacity: 0.65 }]} onPress={onPress} disabled={disabled}>
      <LinearGradient colors={[Colors.primary, Colors.primaryGlow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGrad}>
        <Text style={styles.submitText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 64,
    alignItems: "center",
  },
  logoArea: { alignItems: "center", maxWidth: 520, width: "100%" },
  logoContainer: { marginVertical: 8, alignItems: "center", justifyContent: "center" },
  tagline: { fontSize: 13, color: "rgba(255,255,255,0.78)", marginTop: 6, textAlign: "center", lineHeight: 20 },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 32,
    marginTop: -32,
    padding: 24,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.soft,
  },
  formTitle: { fontSize: 24, fontWeight: "900", color: Colors.foreground },
  formSub: { fontSize: 14, color: Colors.muted, lineHeight: 20, marginTop: 8, marginBottom: 24 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    marginBottom: 16,
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, minHeight: 48, fontSize: 15, color: Colors.foreground },
  submitBtn: { marginTop: 8, borderRadius: Radius.full, overflow: "hidden", minHeight: 48 },
  submitGrad: { minHeight: 48, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  submitText: { color: Colors.white, fontSize: 15, fontWeight: "900" },
  adminHint: { color: Colors.muted, fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 18 },
});
