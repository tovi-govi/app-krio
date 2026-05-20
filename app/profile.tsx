import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { User, Phone, Mail, LogOut, ArrowLeft, Shield } from "lucide-react-native";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userSub}>{user.role === "admin" ? "Krio-H₂O Admin" : "Krio-H₂O Customer"}</Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Info card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Details</Text>
            <InfoRow icon={<User size={16} color={Colors.primary} />} label="Name" value={user.name} />
            <InfoRow icon={<Phone size={16} color={Colors.primary} />} label="Phone" value={user.phone} />
            {user.email && (
              <InfoRow icon={<Mail size={16} color={Colors.primary} />} label="Email" value={user.email} />
            )}
            <InfoRow icon={<Shield size={16} color={Colors.primary} />} label="Role" value={user.role} />
          </View>

          {user.role === "admin" && (
            <TouchableOpacity style={styles.adminBtn} onPress={() => router.push("/admin")}>
              <Shield size={18} color={Colors.white} />
              <Text style={styles.adminBtnText}>Open Admin Panel</Text>
            </TouchableOpacity>
          )}

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={18} color={Colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    alignItems: "center",
  },
  backBtn: {
    alignSelf: "flex-start",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 4,
  },
  userSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  content: {
    padding: 20,
    gap: 14,
    marginTop: -20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.soft,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.foreground,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    color: Colors.foreground,
    fontWeight: "600",
    marginTop: 1,
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  adminBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.white,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.error + "40",
    backgroundColor: Colors.error + "08",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.error,
  },
});
