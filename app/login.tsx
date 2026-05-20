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
import { ArrowLeft, Lock, Mail, Phone, Shield, User } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { Colors, Radius, Shadow } from "@/constants/theme";

type Mode = "customer" | "admin";
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || process.env.EXPO_PUBLIC_PAYMENT_API_BASE || "";

export default function LoginScreen() {
  const { loginCustomer, loginAdmin } = useAuth();
  const [mode, setMode] = useState<Mode>("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [loading, setLoading] = useState(false);

  const getCustomerDetails = () => {
    const customerName = name.trim();
    const cleanPhone = phone.replace(/\D/g, "");

    if (!customerName) {
      Alert.alert("Missing name", "Enter your name to continue.");
      return;
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit mobile number.");
      return;
    }

    return { customerName, cleanPhone, phoneNumber: `+91${cleanPhone}` };
  };

  const clearOtpSession = () => {
    setOtpRequestId("");
    setOtp("");
  };

  const sendCustomerOtp = async () => {
    const details = getCustomerDetails();
    if (!details) return;

    if (!API_BASE) {
      Alert.alert("OTP backend missing", "Add EXPO_PUBLIC_API_BASE or EXPO_PUBLIC_PAYMENT_API_BASE in .env.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: details.cleanPhone }),
      });
      const data = await response.json();
      if (!response.ok || !data.requestId) {
        throw new Error(data.error || "Could not send OTP.");
      }
      setOtpRequestId(data.requestId);
      setOtp("");
      Alert.alert("OTP sent", `Enter the OTP sent to ${details.phoneNumber}.`);
    } catch (error: any) {
      Alert.alert("OTP failed", error.message || "Could not send OTP right now.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCustomerOtp = async () => {
    const details = getCustomerDetails();
    if (!details) return;

    if (!otpRequestId) {
      Alert.alert("Send OTP first", "Request an OTP before verifying.");
      return;
    }

    const cleanOtp = otp.replace(/\D/g, "");
    if (!/^\d{6}$/.test(cleanOtp)) {
      Alert.alert("Invalid OTP", "Enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: otpRequestId, otp: cleanOtp, phone: details.cleanPhone }),
      });
      const data = await response.json();
      if (!response.ok || !data.verified) {
        throw new Error(data.error || "Invalid or expired OTP.");
      }
      await loginCustomer({
        name: details.customerName,
        phone: details.cleanPhone,
        email: email.trim() || undefined,
      });
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Verification failed", error.message || "Could not verify OTP right now.");
    } finally {
      setLoading(false);
    }
  };

  const submitAdmin = async () => {
    if (!adminUser.trim() || !adminPass) {
      Alert.alert("Missing admin login", "Enter the admin email and password from Firebase Authentication.");
      return;
    }

    try {
      setLoading(true);
      const ok = await loginAdmin(adminUser, adminPass);
      if (!ok) {
        Alert.alert(
          "Admin access not enabled",
          "This Firebase user is not listed in the admins collection."
        );
        return;
      }
      router.replace("/admin");
    } catch (error: any) {
      Alert.alert("Admin login failed", error.message || "Could not login as admin right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.topSection}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.logoArea}>
              <Text style={styles.logoText}>💧</Text>
              <Text style={styles.appName}>Krio<Text style={{ color: Colors.secondaryLight }}>-H₂O</Text></Text>
              <Text style={styles.tagline}>Login to order, track, and manage water deliveries</Text>
            </View>
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.toggle}>
              <TouchableOpacity style={[styles.toggleBtn, mode === "customer" && styles.toggleActive]} onPress={() => setMode("customer")}>
                <Text style={[styles.toggleText, mode === "customer" && styles.toggleActiveText]}>Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, mode === "admin" && styles.toggleActive]} onPress={() => setMode("admin")}>
                <Text style={[styles.toggleText, mode === "admin" && styles.toggleActiveText]}>Admin</Text>
              </TouchableOpacity>
            </View>

            {mode === "customer" ? (
              <>
                <Text style={styles.formTitle}>Phone login</Text>
                <Text style={styles.formSub}>Verify your mobile number with OTP before accessing Krio-H2O.</Text>
                <Input icon={<User size={16} color={Colors.muted} />} placeholder="Name" value={name} onChangeText={setName} editable={!otpRequestId} />
                <Input icon={<Phone size={16} color={Colors.muted} />} placeholder="10-digit phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} editable={!otpRequestId} />
                <Input icon={<Mail size={16} color={Colors.muted} />} placeholder="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!otpRequestId} />
                {otpRequestId ? (
                  <>
                    <Input icon={<Lock size={16} color={Colors.muted} />} placeholder="6-digit OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
                    <MainButton label={loading ? "Verifying..." : "Verify OTP & Continue"} onPress={verifyCustomerOtp} disabled={loading} />
                    <TouchableOpacity disabled={loading} onPress={clearOtpSession}>
                      <Text style={styles.linkText}>Change number</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <MainButton label={loading ? "Sending OTP..." : "Send OTP"} onPress={sendCustomerOtp} disabled={loading} />
                )}
              </>
            ) : (
              <>
                <Text style={styles.formTitle}>Admin login</Text>
                <Text style={styles.formSub}>Sign in with a Firebase admin account to manage inventory, prices, visibility and stock.</Text>
                <Input icon={<Shield size={16} color={Colors.muted} />} placeholder="Admin email" value={adminUser} onChangeText={setAdminUser} keyboardType="email-address" autoCapitalize="none" />
                <Input icon={<Lock size={16} color={Colors.muted} />} placeholder="Password" value={adminPass} onChangeText={setAdminPass} secureTextEntry />
                <MainButton label={loading ? "Checking admin..." : "Open Admin Panel"} onPress={submitAdmin} disabled={loading} />
                <Text style={styles.adminHint}>Create the admin in Firebase Authentication, then add their UID or email as a document in Firestore admins.</Text>
              </>
            )}
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
  topSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  logoArea: { alignItems: "center" },
  logoText: { fontSize: 40, marginBottom: 8 },
  appName: { fontSize: 28, fontWeight: "800", color: Colors.white, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4, textAlign: "center" },
  formCard: { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, padding: 24, flex: 1, ...Shadow.soft },
  toggle: { flexDirection: "row", backgroundColor: Colors.mutedBg, borderRadius: Radius.full, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: Radius.full, alignItems: "center" },
  toggleActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: 13, fontWeight: "700", color: Colors.muted },
  toggleActiveText: { color: Colors.white },
  formTitle: { fontSize: 24, fontWeight: "900", color: Colors.foreground },
  formSub: { fontSize: 13, color: Colors.muted, lineHeight: 19, marginTop: 6, marginBottom: 18 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.mutedBg, borderRadius: Radius.md, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 14, color: Colors.foreground },
  submitBtn: { marginTop: 8, borderRadius: Radius.full, overflow: "hidden" },
  submitGrad: { paddingVertical: 14, alignItems: "center" },
  submitText: { color: Colors.white, fontSize: 15, fontWeight: "900" },
  linkText: { color: Colors.primary, fontWeight: "800", textAlign: "center", marginTop: 16 },
  adminHint: { color: Colors.muted, fontSize: 12, textAlign: "center", marginTop: 12 },
});
