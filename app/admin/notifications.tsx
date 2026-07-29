import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Bell } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { AdminNotification, useCart } from "@/context/CartContext";

export default function AdminNotificationsScreen() {
  const { adminNotifications, markAdminNotificationRead } = useCart();

  const renderNotificationItem = ({ item }: { item: AdminNotification }) => (
    <View style={[styles.notificationCard, !item.read && styles.notificationUnread]}>
      <View style={styles.notificationIcon}>
        <Bell size={18} color={Colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody}>{item.message}</Text>
        <Text style={styles.notificationMeta}>
          Order {item.orderId ?? "—"} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
        </Text>
      </View>
      {!item.read ? (
        <TouchableOpacity style={styles.markReadBtn} onPress={() => markAdminNotificationRead(item.id)}>
          <Text style={styles.markReadText}>Mark read</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <FlatList<AdminNotification>
      data={adminNotifications}
      renderItem={renderNotificationItem}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications ({adminNotifications.length})</Text>
          <Text style={styles.headerSub}>Review admin notifications and mark items as read once handled.</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No notifications found.</Text>
        </View>
      }
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={Platform.OS === "android"}
    />
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
