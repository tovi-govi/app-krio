import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Bell } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { useCart } from "@/context/CartContext";

export default function AdminNotificationsScreen() {
  const { adminNotifications, markAdminNotificationRead } = useCart();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSub}>Review admin notifications and mark items as read once handled.</Text>
      </View>

      {adminNotifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No notifications found.</Text>
        </View>
      ) : (
        adminNotifications.map((notification) => (
          <View key={notification.id} style={[styles.notificationCard, !notification.read && styles.notificationUnread]}>
            <View style={styles.notificationIcon}>
              <Bell size={18} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationBody}>{(notification as any).message2 || notification.message}</Text>
              <Text style={styles.notificationMeta}>Order {notification.orderId ?? "—"} • ₹{notification.total ?? 0}</Text>
            </View>
            {!notification.read ? (
              <TouchableOpacity style={styles.markReadBtn} onPress={() => markAdminNotificationRead(notification.id)}>
                <Text style={styles.markReadText}>Mark read</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 140, gap: 16, maxWidth: 960, width: "100%", alignSelf: "center" },
  header: { borderRadius: Radius.xl, padding: 24, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft },
  headerTitle: { color: Colors.foreground, fontSize: 24, fontWeight: "900" },
  headerSub: { color: Colors.muted, fontSize: 13, marginTop: 6, lineHeight: 20 },
  emptyCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 24, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft, alignItems: "center" },
  emptyText: { color: Colors.muted, fontSize: 13 },
  notificationCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft },
  notificationUnread: { borderColor: Colors.primary + "66", backgroundColor: Colors.primary + "08" },
  notificationIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  notificationTitle: { fontSize: 15, fontWeight: "900", color: Colors.foreground },
  notificationBody: { color: Colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  notificationMeta: { color: Colors.secondary, fontSize: 12, fontWeight: "700", marginTop: 8 },
  markReadBtn: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  markReadText: { color: Colors.white, fontWeight: "900", fontSize: 13 },
});
