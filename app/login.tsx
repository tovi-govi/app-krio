import { useState } from "react";
import {
  Alert,
  Image,
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
import { useAuth } from "@/context/AuthContext";
import { Colors, Radius, Shadow } from "@/constants/theme";

export default function LoginScreen() {
  const { loginAdmin } = useAuth();
  const [staffUser, setStaffUser] = useState("");
  const [staffPass, setStaffPass] = useState("");
  const [loading, setLoading] = useState(false);

  const submitLogin = async () => {
    if (!staffUser.trim() || !staffPass.trim()) {
      Alert.alert("Missing Details", "Please enter your staff email and password.");
      return;
    }
    setLoading(true);
    try {
      const role = await loginAdmin(staffUser.trim(), staffPass.trim());
      if (role) {
        if (role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/delivery");
        }
      } else {
        Alert.alert("Login Failed", "Invalid staff credentials or unauthorized account.");
      }
    } catch (err: any) {
      Alert.alert("Login Error", err.message || "An unexpected error occurred during login.");
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
                <Image
                  source={require("@/assets/logos/krio-logo.png")}
                  style={{ width: 220, height: 75 }}
                  resizeMode="contain"
                />
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
  logoContainer: {
    marginVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
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
