import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Linking,
  Modal,
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
import {
  LogOut,
  User,
  Search,
  Check,
  Truck,
  Calendar as CalendarIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  ArrowRight,
  Plus,
  Minus,
  X,
  Factory,
  ChevronDown,
  Navigation,
  Compass,
} from "lucide-react-native";
import KrioLogo from "@/assets/logos/krio-logo.svg";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { DeliveryRecord, DeliverySchedule, Organization, useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { SkeletonList } from "@/components/UI/Skeleton";
import { optimizeDeliveryRoute } from "@/utils/routeOptimizer";
import ConfirmModal from "@/components/UI/ConfirmModal";
import Toast, { ToastMessage } from "@/components/UI/Toast";

export default function DeliveryScreen() {
  const { user, isLoading, logout } = useAuth();
  const {
    products,
    organizations,
    deliveries,
    deliverySchedules,
    plants,
    addDeliveryRecord,
    updateDeliveryRecord,
    markScheduleCompleted,
  } = useCart();

  const scrollY = useRef(new Animated.Value(0)).current;

  // Header animation interpolation
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [0, -40],
    extrapolate: "clamp",
  });

  const prod20l = useMemo(() => products.find((p) => p.id === "20l"), [products]);
  const prod200ml = useMemo(() => products.find((p) => p.id === "200ml"), [products]);
  const prod500ml = useMemo(() => products.find((p) => p.id === "500ml"), [products]);
  const prod1l = useMemo(() => products.find((p) => p.id === "1l"), [products]);

  const max20lCans = prod20l ? prod20l.stock : 999999;
  const max200mlPacks = prod200ml ? Math.floor(prod200ml.stock / 35) : 999999;
  const max500mlCases = prod500ml ? Math.floor(prod500ml.stock / 24) : 999999;
  const max1lCases = prod1l ? Math.floor(prod1l.stock / 12) : 999999;

  // Format today's date YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    const d = now.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Formatted date string for display (e.g. Thursday, 30 July)
  const formattedTodayDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  // Filter today's schedules
  const todaySchedules = useMemo(() => {
    return deliverySchedules.filter((s) => s.scheduledDate === todayStr);
  }, [deliverySchedules, todayStr]);

  // Search Query for filtering today's deliveries
  const [searchQuery, setSearchQuery] = useState("");

  // Search filtered schedules
  const filteredSchedules = useMemo(() => {
    if (!searchQuery.trim()) return todaySchedules;
    const query = searchQuery.toLowerCase();
    return todaySchedules.filter((s) => {
      const org = organizations.find((o) => o.id === s.organizationId);
      const nameMatch = s.organizationName.toLowerCase().includes(query);
      const addressMatch = org?.address.toLowerCase().includes(query) ?? false;
      const notesMatch = s.notes?.toLowerCase().includes(query) ?? false;
      return nameMatch || addressMatch || notesMatch;
    });
  }, [todaySchedules, organizations, searchQuery]);

  // Partition into Pending and Completed lists
  const pendingSchedules = useMemo(() => {
    return filteredSchedules.filter((s) => s.status !== "Completed");
  }, [filteredSchedules]);

  const completedSchedules = useMemo(() => {
    return filteredSchedules.filter((s) => s.status === "Completed");
  }, [filteredSchedules]);

  // Route Optimization for today's deliveries
  const todayOptimizedRoute = useMemo(() => {
    return optimizeDeliveryRoute(todaySchedules, organizations);
  }, [todaySchedules, organizations]);

  const nextPendingStop = useMemo(() => {
    return todayOptimizedRoute.stops.find((s) => s.status !== "Completed") || null;
  }, [todayOptimizedRoute]);

  const handleNavigateToNextStop = () => {
    if (!nextPendingStop) return;
    const org = organizations.find((o) => o.id === nextPendingStop.organizationId);
    let query = "";
    if (org?.location?.latitude && org?.location?.longitude) {
      query = `${org.location.latitude},${org.location.longitude}`;
    } else if (org?.address && org.address.trim()) {
      query = encodeURIComponent(org.address.trim());
    } else if (nextPendingStop.organizationName) {
      query = encodeURIComponent(nextPendingStop.organizationName.trim());
    }

    if (query) {
      const mapsUrl = Platform.OS === "android"
        ? `google.navigation:q=${query}`
        : `https://www.google.com/maps/dir/?api=1&destination=${query}`;

      Linking.openURL(mapsUrl).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
      });
    } else {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Location Unavailable",
        message: "No address or GPS coordinates saved for this organization.",
      });
    }
  };

  // Stats calculation
  const totalCount = todaySchedules.length;
  const completedCount = todaySchedules.filter((s) => s.status === "Completed").length;
  const remainingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Delivery Modal State (when recording delivery for a selected card)
  const [activeSchedule, setActiveSchedule] = useState<DeliverySchedule | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [editingDeliveryRecord, setEditingDeliveryRecord] = useState<DeliveryRecord | null>(null);

  const [fullCansLoaded, setFullCansLoaded] = useState("");
  const [emptyCansReturned, setEmptyCansReturned] = useState("");
  const [cases200ml, setCases200ml] = useState("");
  const [cases500ml, setCases500ml] = useState("");
  const [cases1l, setCases1l] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Set default plant if none selected
  useEffect(() => {
    if (!selectedPlantId && plants.length > 0) {
      setSelectedPlantId(plants[0].id);
    }
  }, [plants, selectedPlantId]);

  const activeOrg = useMemo(() => {
    if (!activeSchedule) return null;
    return organizations.find((o) => o.id === activeSchedule.organizationId) ?? null;
  }, [activeSchedule, organizations]);

  const selectedPlant = useMemo(
    () => plants.find((p) => p.id === selectedPlantId) ?? null,
    [plants, selectedPlantId]
  );

  const openInGoogleMaps = (org?: Organization | null, fallbackName?: string) => {
    let query = "";
    if (org?.location?.latitude && org?.location?.longitude) {
      query = `${org.location.latitude},${org.location.longitude}`;
    } else if (org?.address && org.address.trim()) {
      query = encodeURIComponent(org.address.trim());
    } else if (fallbackName && fallbackName.trim()) {
      query = encodeURIComponent(fallbackName.trim());
    }

    if (query) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
      Linking.openURL(mapsUrl).catch((err) => {
        console.error("Failed to open Google Maps:", err);
      });
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role !== "delivery") {
      router.replace("/admin");
    }
  }, [user, isLoading]);

  if (isLoading || !user || user.role !== "delivery") {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  const handleLogout = async () => {
    await logout();
  };

  // Open Log Delivery modal for a specific schedule
  const handleOpenDeliveryModal = (schedule: DeliverySchedule) => {
    setActiveSchedule(schedule);
    const existing = deliveries.find(
      (d) =>
        (d.organizationId && d.organizationId === schedule.organizationId) ||
        (d.organizationName && d.organizationName.toLowerCase() === schedule.organizationName.toLowerCase())
    );

    if (existing && schedule.status === "Completed") {
      setEditingDeliveryRecord(existing);
      setFullCansLoaded(existing.fullCansLoaded ? String(existing.fullCansLoaded) : "");
      setEmptyCansReturned(existing.emptyCansReturned ? String(existing.emptyCansReturned) : "");
      setCases200ml(existing.cases200mlDelivered ? String(existing.cases200mlDelivered) : "");
      setCases500ml(existing.cases500mlDelivered ? String(existing.cases500mlDelivered) : "");
      setCases1l(existing.cases1lDelivered ? String(existing.cases1lDelivered) : "");
      if (existing.plantId) setSelectedPlantId(existing.plantId);
    } else {
      setEditingDeliveryRecord(null);
      setFullCansLoaded("");
      setEmptyCansReturned("");
      setCases200ml("");
      setCases500ml("");
      setCases1l("");
    }
  };

  const handleFullCansTextChange = (text: string) => {
    const num = Number(text) || 0;
    if (num > max20lCans) {
      setFullCansLoaded(String(max20lCans));
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Stock Limit Exceeded",
        message: `Clamped to maximum available stock: ${max20lCans} 20L cans.`,
      });
      return;
    }
    setFullCansLoaded(text);
  };

  const handle200mlTextChange = (text: string) => {
    const num = Number(text) || 0;
    if (num > max200mlPacks) {
      setCases200ml(String(max200mlPacks));
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Stock Limit Exceeded",
        message: `Clamped to maximum available stock: ${max200mlPacks} packs.`,
      });
      return;
    }
    setCases200ml(text);
  };

  const handle500mlTextChange = (text: string) => {
    const num = Number(text) || 0;
    if (num > max500mlCases) {
      setCases500ml(String(max500mlCases));
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Stock Limit Exceeded",
        message: `Clamped to maximum available stock: ${max500mlCases} cases.`,
      });
      return;
    }
    setCases500ml(text);
  };

  const handle1lTextChange = (text: string) => {
    const num = Number(text) || 0;
    if (num > max1lCases) {
      setCases1l(String(max1lCases));
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Stock Limit Exceeded",
        message: `Clamped to maximum available stock: ${max1lCases} cases.`,
      });
      return;
    }
    setCases1l(text);
  };

  const handleAddFullCans = (amount: number) => {
    const current = Number(fullCansLoaded) || 0;
    if (amount > 0 && current >= max20lCans) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Stock Limit Reached",
        message: `Only ${max20lCans} 20L cans available in stock.`,
      });
      return;
    }
    const next = Math.min(max20lCans, Math.max(0, current + amount));
    setFullCansLoaded(next === 0 ? "" : String(next));
  };

  const handleAddEmptyCans = (amount: number) => {
    const current = Math.max(0, (Number(emptyCansReturned) || 0) + amount);
    setEmptyCansReturned(current === 0 ? "" : String(current));
  };

  const handleAdd200ml = (amount: number) => {
    const current = Number(cases200ml) || 0;
    if (amount > 0 && current >= max200mlPacks) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Stock Limit Reached",
        message: `Only ${max200mlPacks} packs available in stock.`,
      });
      return;
    }
    const next = Math.min(max200mlPacks, Math.max(0, current + amount));
    setCases200ml(next === 0 ? "" : String(next));
  };

  const handleAdd500ml = (amount: number) => {
    const current = Number(cases500ml) || 0;
    if (amount > 0 && current >= max500mlCases) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Stock Limit Reached",
        message: `Only ${max500mlCases} cases available in stock.`,
      });
      return;
    }
    const next = Math.min(max500mlCases, Math.max(0, current + amount));
    setCases500ml(next === 0 ? "" : String(next));
  };

  const handleAdd1l = (amount: number) => {
    const current = Number(cases1l) || 0;
    if (amount > 0 && current >= max1lCases) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Stock Limit Reached",
        message: `Only ${max1lCases} cases available in stock.`,
      });
      return;
    }
    const next = Math.min(max1lCases, Math.max(0, current + amount));
    setCases1l(next === 0 ? "" : String(next));
  };

  const openConfirmation = () => {
    if (!activeSchedule) return;

    const loaded = Number(fullCansLoaded) || 0;
    const emptyReturned = Number(emptyCansReturned) || 0;
    const c200 = Number(cases200ml) || 0;
    const c500 = Number(cases500ml) || 0;
    const c1l = Number(cases1l) || 0;

    if (loaded <= 0 && emptyReturned <= 0 && c200 <= 0 && c500 <= 0 && c1l <= 0) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Enter Quantities",
        message: "Please enter quantities for 20L cans or packaged bottle cases.",
      });
      return;
    }

    if (loaded > max20lCans) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Exceeds Available Stock",
        message: `Cannot deliver ${loaded} 20L cans. Only ${max20lCans} remaining in inventory.`,
      });
      return;
    }

    if (c200 > max200mlPacks) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Exceeds Available Stock",
        message: `Cannot deliver ${c200} packs of 200ml. Only ${max200mlPacks} packs remaining in inventory.`,
      });
      return;
    }

    if (c500 > max500mlCases) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Exceeds Available Stock",
        message: `Cannot deliver ${c500} cases of 500ml. Only ${max500mlCases} cases remaining in inventory.`,
      });
      return;
    }

    if (c1l > max1lCases) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Exceeds Available Stock",
        message: `Cannot deliver ${c1l} cases of 1L. Only ${max1lCases} cases remaining in inventory.`,
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmDelivery = async () => {
    if (isSubmitting || !activeSchedule) return;
    setIsSubmitting(true);

    try {
      const loaded = Number(fullCansLoaded) || 0;
      const emptyReturned = Number(emptyCansReturned) || 0;
      const c200 = Number(cases200ml) || 0;
      const c500 = Number(cases500ml) || 0;
      const c1l = Number(cases1l) || 0;
      const deliveryId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      if (editingDeliveryRecord) {
        await updateDeliveryRecord(
          editingDeliveryRecord.id,
          {
            fullCansLoaded: loaded,
            emptyCansReturned: emptyReturned,
            cases200mlDelivered: c200,
            cases500mlDelivered: c500,
            cases1lDelivered: c1l,
            plantId: selectedPlant?.id,
            plantName: selectedPlant?.name || "Main Plant",
            plantLocation: selectedPlant?.location || "",
          },
          user.name
        );

        setShowConfirmModal(false);
        setActiveSchedule(null);
        setEditingDeliveryRecord(null);

        setToast({
          id: Date.now().toString(),
          type: "success",
          title: "Delivery Record Updated!",
          message: `Updated delivery run for ${activeSchedule.organizationName}. Marked as Edited.`,
        });
      } else {
        const payload = {
          id: deliveryId,
          organizationId: activeSchedule.organizationId,
          organizationName: activeSchedule.organizationName,
          plantId: selectedPlant?.id,
          plantName: selectedPlant?.name || "Main Plant",
          plantLocation: selectedPlant?.location || "",
          fullCansLoaded: loaded,
          emptyCansReturned: emptyReturned,
          cases200mlDelivered: c200,
          cases500mlDelivered: c500,
          cases1lDelivered: c1l,
          deliveredBy: user.name,
          createdAt: new Date().toISOString(),
        };

        // 1. Add delivery log to Firestore
        await addDeliveryRecord(payload);

        // 2. Mark schedule as Completed in Firestore
        await markScheduleCompleted(activeSchedule.id, user.name);

        setShowConfirmModal(false);
        setActiveSchedule(null);
        setEditingDeliveryRecord(null);

        setToast({
          id: Date.now().toString(),
          type: "success",
          title: "Delivery Completed!",
          message: `Logged delivery for ${activeSchedule.organizationName}. Stock updated automatically!`,
        });
      }
    } catch (error: any) {
      console.error("Failed to save delivery:", error);
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Submission Failed",
        message: error.message || "Unable to save delivery record right now.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        {/* Top Header Card */}
        <Animated.View style={{ transform: [{ translateY: headerTranslateY }] }}>
          <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.logoContainer}>
                <View style={styles.whiteLogoBadge}>
                  <Image
                    source={require("@/assets/logos/krio-logo.png")}
                    style={{ width: 120, height: 36 }}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.headerLabel}>DELIVERY</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.driverProfile}>
              <View style={styles.driverAvatar}>
                <User size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{user.name}</Text>
                <Text style={styles.driverDate}>{formattedTodayDate}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Progress & Summary Dashboard Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <View>
              <Text style={styles.progressTitle}>Today's Deliveries</Text>
              <Text style={styles.progressSubtitle}>
                {completedCount} of {totalCount} Completed ({progressPercent}%)
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Truck size={18} color={Colors.primary} />
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Stats Chips Row */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipNumber}>{totalCount}</Text>
              <Text style={styles.statChipLabel}>Scheduled</Text>
            </View>
            <View style={styles.statChipDivider} />
            <View style={styles.statChip}>
              <Text style={[styles.statChipNumber, { color: Colors.success }]}>{completedCount}</Text>
              <Text style={styles.statChipLabel}>Completed</Text>
            </View>
            <View style={styles.statChipDivider} />
            <View style={styles.statChip}>
              <Text style={[styles.statChipNumber, { color: Colors.info }]}>{remainingCount}</Text>
              <Text style={styles.statChipLabel}>Remaining</Text>
            </View>
          </View>
        </View>

        {/* ONE-TAP NEXT STOP NAVIGATION BANNER */}
        {nextPendingStop ? (
          <View style={styles.navBannerCard}>
            <View style={styles.navBannerHeader}>
              <Compass size={20} color={Colors.white} />
              <Text style={styles.navBannerTitle}>Next Stop #{nextPendingStop.stopNumber} (Optimized)</Text>
              <View style={styles.navBannerBadge}>
                <Text style={styles.navBannerBadgeText}>Pending Run</Text>
              </View>
            </View>

            <Text style={styles.navOrgName}>{nextPendingStop.organizationName}</Text>
            {nextPendingStop.address ? (
              <Text style={styles.navAddress} numberOfLines={1}>📍 {nextPendingStop.address}</Text>
            ) : null}

            {nextPendingStop.estimatedArrival ? (
              <Text style={styles.navMeta}>
                Est. Arrival: {nextPendingStop.estimatedArrival} {nextPendingStop.distanceToNextKm ? `• Dist to Next: ${nextPendingStop.distanceToNextKm} km` : ""}
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.navActionBtn}
              onPress={handleNavigateToNextStop}
              activeOpacity={0.85}
            >
              <Navigation size={18} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.navActionBtnText}>Navigate to Next Stop (Google Maps)</Text>
            </TouchableOpacity>
          </View>
        ) : todaySchedules.length > 0 && remainingCount === 0 ? (
          <View style={styles.completedBannerCard}>
            <CheckCircle2 size={24} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.completedBannerTitle}>All Route Stops Completed!</Text>
              <Text style={styles.completedBannerSub}>All scheduled partner organization deliveries for today have been completed.</Text>
            </View>
          </View>
        ) : null}

        {/* Search Bar */}
        {totalCount > 0 && (
          <View style={styles.searchContainer}>
            <Search size={18} color={Colors.muted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by organization or address..."
              placeholderTextColor={Colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={18} color={Colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* SKELETON LOADER */}
        {isLoading ? (
          <SkeletonList count={3} />
        ) : totalCount === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <CalendarIcon size={36} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No deliveries scheduled for today.</Text>
            <Text style={styles.emptySub}>
              Your route is clear for today! Check back later or contact your administrator for schedule updates.
            </Text>
          </View>
        ) : null}

        {/* PENDING DELIVERIES SECTION */}
        {pendingSchedules.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Pending Deliveries</Text>
              <View style={styles.badgePendingCount}>
                <Text style={styles.badgePendingCountText}>{pendingSchedules.length}</Text>
              </View>
            </View>

            {pendingSchedules.map((schedule) => {
              const org = organizations.find((o) => o.id === schedule.organizationId);
              return (
                <View key={schedule.id} style={styles.deliveryCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardOrgName}>{schedule.organizationName}</Text>
                      {org?.address ? (
                        <View style={styles.cardMetaRow}>
                          <MapPin size={13} color={Colors.muted} />
                          <Text style={styles.cardMetaText} numberOfLines={1}>
                            {org.address}
                          </Text>
                        </View>
                      ) : null}
                      {org?.phone ? (
                        <View style={styles.cardMetaRow}>
                          <Phone size={13} color={Colors.muted} />
                          <Text style={styles.cardMetaText}>{org.phone}</Text>
                        </View>
                      ) : null}
                      <TouchableOpacity
                        style={styles.openMapsBtn}
                        onPress={() => openInGoogleMaps(org, schedule.organizationName)}
                        activeOpacity={0.8}
                      >
                        <Navigation size={13} color={Colors.primary} />
                        <Text style={styles.openMapsBtnText}>Open in Google Maps</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.pendingStatusBadge}>
                      <Text style={styles.pendingStatusText}>Pending</Text>
                    </View>
                  </View>

                  {/* Delivery Notes Callout */}
                  {schedule.notes ? (
                    <View style={styles.notesBox}>
                      <FileText size={14} color={Colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.notesText}>{schedule.notes}</Text>
                    </View>
                  ) : null}

                  {/* Action Button */}
                  <TouchableOpacity
                    style={styles.recordBtn}
                    onPress={() => handleOpenDeliveryModal(schedule)}
                    activeOpacity={0.85}
                  >
                    <Truck size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.recordBtnText}>Record Delivery</Text>
                    <ArrowRight size={18} color="#FFF" style={{ marginLeft: "auto" }} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* COMPLETED DELIVERIES SECTION */}
        {completedSchedules.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleCompleted}>Completed Today</Text>
              <View style={styles.badgeCompletedCount}>
                <Text style={styles.badgeCompletedCountText}>{completedSchedules.length}</Text>
              </View>
            </View>

            {completedSchedules.map((schedule) => {
              const org = organizations.find((o) => o.id === schedule.organizationId);
              const deliveryRec = deliveries.find(
                (d) =>
                  (d.organizationId && d.organizationId === schedule.organizationId) ||
                  (d.organizationName && d.organizationName.toLowerCase() === schedule.organizationName.toLowerCase())
              );
              return (
                <View key={schedule.id} style={[styles.deliveryCard, styles.deliveryCardCompleted]}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardOrgNameCompleted}>{schedule.organizationName}</Text>
                      {org?.address ? (
                        <View style={styles.cardMetaRow}>
                          <MapPin size={13} color={Colors.muted} />
                          <Text style={styles.cardMetaText} numberOfLines={1}>
                            {org.address}
                          </Text>
                        </View>
                      ) : null}
                      <TouchableOpacity
                        style={styles.openMapsBtn}
                        onPress={() => openInGoogleMaps(org, schedule.organizationName)}
                        activeOpacity={0.8}
                      >
                        <Navigation size={13} color={Colors.primary} />
                        <Text style={styles.openMapsBtnText}>Open in Google Maps</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View style={styles.completedStatusBadge}>
                        <CheckCircle2 size={14} color="#065F46" style={{ marginRight: 4 }} />
                        <Text style={styles.completedStatusText}>Completed</Text>
                      </View>
                      {deliveryRec?.isEdited ? (
                        <View style={styles.editedBadge}>
                          <Text style={styles.editedBadgeText}>✏️ Edited by {deliveryRec.editedBy || "Staff"}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Completed info */}
                  {schedule.completedBy ? (
                    <Text style={styles.completedMetaText}>
                      Completed by {schedule.completedBy} {deliveryRec ? `(${deliveryRec.fullCansLoaded} cans loaded)` : ""}
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    style={styles.completedUpdateBtn}
                    onPress={() => handleOpenDeliveryModal(schedule)}
                  >
                    <Text style={styles.completedUpdateBtnText}>Edit Delivery Quantities</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </Animated.ScrollView>

      {/* RECORD DELIVERY MODAL */}
      {activeSchedule && (
        <Modal
          visible={!!activeSchedule}
          animationType="slide"
          transparent
          onRequestClose={() => setActiveSchedule(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetSubTitle}>Record Delivery Run</Text>
                  <Text style={styles.sheetTitle}>{activeSchedule.organizationName}</Text>
                  <TouchableOpacity
                    style={styles.openMapsBtn}
                    onPress={() => openInGoogleMaps(activeOrg, activeSchedule.organizationName)}
                    activeOpacity={0.8}
                  >
                    <Navigation size={13} color={Colors.primary} />
                    <Text style={styles.openMapsBtnText}>Open Location in Google Maps</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setActiveSchedule(null)} style={styles.closeBtn}>
                  <X size={20} color={Colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
                {/* Delivery Notes preview */}
                {activeSchedule.notes ? (
                  <View style={styles.sheetNotesBox}>
                    <FileText size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.sheetNotesText}>{activeSchedule.notes}</Text>
                  </View>
                ) : null}

                {/* Step 1: Water Source Plant */}
                <Text style={styles.inputLabel}>1. Water Source Plant</Text>
                <View style={styles.plantSelector}>
                  {plants.map((plant) => (
                    <TouchableOpacity
                      key={plant.id}
                      style={[
                        styles.plantChip,
                        selectedPlantId === plant.id && styles.plantChipSelected,
                      ]}
                      onPress={() => setSelectedPlantId(plant.id)}
                    >
                      <Factory
                        size={14}
                        color={selectedPlantId === plant.id ? Colors.white : Colors.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.plantChipText,
                          selectedPlantId === plant.id && styles.plantChipTextSelected,
                        ]}
                      >
                        {plant.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Step 2: 20L Water Cans */}
                <Text style={styles.inputLabel}>2. 20L Water Cans</Text>
                <View style={styles.qtyCard}>
                  <View style={styles.qtyRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.qtyLabel}>Full Cans Loaded (Delivered)</Text>
                      <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 2 }}>
                        Stock available: {max20lCans} cans
                      </Text>
                    </View>
                    <View style={styles.counterRow}>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => handleAddFullCans(-1)}>
                        <Minus size={16} color={Colors.foreground} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="number-pad"
                        value={fullCansLoaded}
                        onChangeText={handleFullCansTextChange}
                        placeholder="0"
                      />
                      <TouchableOpacity style={styles.counterBtn} onPress={() => handleAddFullCans(1)}>
                        <Plus size={16} color={Colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.qtyCard}>
                  <View style={styles.qtyRow}>
                    <Text style={styles.qtyLabel}>Empty Cans Returned</Text>
                    <View style={styles.counterRow}>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => handleAddEmptyCans(-1)}>
                        <Minus size={16} color={Colors.foreground} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="number-pad"
                        value={emptyCansReturned}
                        onChangeText={(txt) => setEmptyCansReturned(txt)}
                        placeholder="0"
                      />
                      <TouchableOpacity style={styles.counterBtn} onPress={() => handleAddEmptyCans(1)}>
                        <Plus size={16} color={Colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Step 3: Bottle Cases */}
                <Text style={styles.inputLabel}>3. Packaged Bottle Cases (Optional)</Text>
                <View style={styles.qtyCard}>
                  <View style={styles.qtyRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.qtyLabel}>200ml Packs (35 btls/pack)</Text>
                      <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 2 }}>
                        Stock available: {max200mlPacks} packs
                      </Text>
                    </View>
                    <View style={styles.counterRow}>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => handleAdd200ml(-1)}>
                        <Minus size={16} color={Colors.foreground} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="number-pad"
                        value={cases200ml}
                        onChangeText={handle200mlTextChange}
                        placeholder="0"
                      />
                      <TouchableOpacity style={styles.counterBtn} onPress={() => handleAdd200ml(1)}>
                        <Plus size={16} color={Colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.qtyCard}>
                  <View style={styles.qtyRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.qtyLabel}>500ml Cases (24 btls/case)</Text>
                      <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 2 }}>
                        Stock available: {max500mlCases} cases
                      </Text>
                    </View>
                    <View style={styles.counterRow}>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => handleAdd500ml(-1)}>
                        <Minus size={16} color={Colors.foreground} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="number-pad"
                        value={cases500ml}
                        onChangeText={handle500mlTextChange}
                        placeholder="0"
                      />
                      <TouchableOpacity style={styles.counterBtn} onPress={() => handleAdd500ml(1)}>
                        <Plus size={16} color={Colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.qtyCard}>
                  <View style={styles.qtyRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.qtyLabel}>1 Litre Cases (12 btls/case)</Text>
                      <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 2 }}>
                        Stock available: {max1lCases} cases
                      </Text>
                    </View>
                    <View style={styles.counterRow}>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => handleAdd1l(-1)}>
                        <Minus size={16} color={Colors.foreground} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="number-pad"
                        value={cases1l}
                        onChangeText={handle1lTextChange}
                        placeholder="0"
                      />
                      <TouchableOpacity style={styles.counterBtn} onPress={() => handleAdd1l(1)}>
                        <Plus size={16} color={Colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Footer Submit Button */}
              <View style={styles.sheetFooter}>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={openConfirmation}
                  activeOpacity={0.85}
                >
                  <CheckCircle2 size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Confirm & Log Delivery</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* CONFIRMATION DIALOG */}
      {showConfirmModal && (
        <ConfirmModal
          visible={showConfirmModal}
          title="Confirm Water Delivery"
          message={`Are you sure you want to log this delivery for ${activeSchedule?.organizationName}? Stock counts will update automatically.`}
          confirmLabel="Confirm Log"
          type="primary"
          onConfirm={handleConfirmDelivery}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* TOAST NOTIFICATIONS */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Header
  header: {
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
    ...Shadow.glow,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  whiteLogoBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: Colors.white,
  },
  logoutBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  driverProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
  },
  driverDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
  },

  // Progress & Summary Dashboard Card
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.foreground,
  },
  progressSubtitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
    fontWeight: "600",
  },
  progressBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: `${Colors.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarTrack: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.mutedBg,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.md,
    paddingVertical: 10,
  },
  statChip: {
    alignItems: "center",
    flex: 1,
  },
  statChipNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.foreground,
  },
  statChipLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.muted,
    marginTop: 1,
  },
  statChipDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },

  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.foreground,
  },

  // Empty State Card
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.primary}12`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.foreground,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 320,
  },

  // Section Layout
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.foreground,
  },
  sectionTitleCompleted: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.muted,
  },
  badgePendingCount: {
    backgroundColor: `${Colors.info}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgePendingCountText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.info,
  },
  badgeCompletedCount: {
    backgroundColor: `${Colors.success}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeCompletedCountText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.success,
  },

  // Delivery Cards
  deliveryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  deliveryCardCompleted: {
    opacity: 0.75,
    backgroundColor: "#F8FAFC",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  cardOrgName: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.foreground,
  },
  cardOrgNameCompleted: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.muted,
    textDecorationLine: "line-through",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  cardMetaText: {
    fontSize: 12,
    color: Colors.muted,
  },
  pendingStatusBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  pendingStatusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1E40AF",
  },
  completedStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  completedStatusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#065F46",
  },
  notesBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    flex: 1,
  },
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    ...Shadow.card,
  },
  recordBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFF",
  },
  completedMetaText: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 4,
    marginBottom: 8,
  },
  completedUpdateBtn: {
    paddingVertical: 8,
    alignItems: "center",
  },
  completedUpdateBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },

  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "88%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    ...Shadow.glow,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetSubTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.muted,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.foreground,
  },
  closeBtn: {
    padding: 6,
  },
  sheetBody: {
    padding: 18,
  },
  sheetNotesBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 16,
  },
  sheetNotesText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400E",
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.foreground,
    marginTop: 12,
    marginBottom: 8,
  },
  plantSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  plantChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.mutedBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  plantChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  plantChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.foreground,
  },
  plantChipTextSelected: {
    color: "#FFF",
  },
  qtyCard: {
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qtyLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.foreground,
    flex: 1,
    marginRight: 8,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyInput: {
    width: 50,
    height: 36,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: Colors.foreground,
  },
  quickAddRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    justifyContent: "flex-end",
  },
  quickAddBtn: {
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickAddText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  openMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.primary}12`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  openMapsBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  editedBadge: {
    backgroundColor: `${Colors.warning}18`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: `${Colors.warning}40`,
  },
  editedBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
  },
  sheetFooter: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    minHeight: 52,
    ...Shadow.glow,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
  },
  navBannerCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 16,
    gap: 8,
    ...Shadow.glow,
  },
  navBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.white,
    flex: 1,
  },
  navBannerBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  navBannerBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.white,
  },
  navOrgName: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.white,
  },
  navAddress: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
  },
  navMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
  navActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    marginTop: 4,
  },
  navActionBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.primary,
  },
  completedBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#D1FAE5",
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  completedBannerTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#065F46",
  },
  completedBannerSub: {
    fontSize: 12,
    color: "#047857",
    marginTop: 2,
  },
});
