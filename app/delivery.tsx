import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { LogOut, User, Search, Check, Truck } from "lucide-react-native";
import KrioLogo from "@/assets/logos/krio-logo.svg";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import ConfirmModal from "@/components/UI/ConfirmModal";
import Toast, { ToastMessage } from "@/components/UI/Toast";

export default function DeliveryScreen() {
  const { user, isLoading, logout } = useAuth();
  const { products, organizations, deliveries, plants, addDeliveryRecord } = useCart();
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [0, -50],
    extrapolate: "clamp",
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [1, 0.88],
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

  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [orgSearchText, setOrgSearchText] = useState("");

  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [showPlantMenu, setShowPlantMenu] = useState(false);
  const [plantSearchText, setPlantSearchText] = useState("");

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

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId]
  );

  const selectedPlant = useMemo(
    () => plants.find((p) => p.id === selectedPlantId) ?? null,
    [plants, selectedPlantId]
  );

  const filteredOrganizations = useMemo(() => {
    if (!orgSearchText.trim()) return organizations;
    const query = orgSearchText.toLowerCase();
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(query) ||
        org.phone.toLowerCase().includes(query) ||
        org.address.toLowerCase().includes(query)
    );
  }, [organizations, orgSearchText]);

  const filteredPlants = useMemo(() => {
    if (!plantSearchText.trim()) return plants;
    const query = plantSearchText.toLowerCase();
    return plants.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query)
    );
  }, [plants, plantSearchText]);

  const todayDeliveriesCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return deliveries.filter((d) => {
      const dDate = d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 10) : "";
      return dDate === todayStr && d.deliveredBy === user?.name;
    }).length;
  }, [deliveries, user?.name]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "delivery")) {
      router.replace("/login");
    }
  }, [isLoading, user]);

  if (isLoading || !user || user.role !== "delivery") {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  const handleLogout = async () => {
    router.replace("/login");
    await logout();
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
        message: `Only ${max200mlPacks} packs (${prod200ml?.stock ?? 0} bottles) available in stock.`,
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
        message: `Only ${max500mlCases} cases (${prod500ml?.stock ?? 0} bottles) available in stock.`,
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
        message: `Only ${max1lCases} cases (${prod1l?.stock ?? 0} bottles) available in stock.`,
      });
      return;
    }
    const next = Math.min(max1lCases, Math.max(0, current + amount));
    setCases1l(next === 0 ? "" : String(next));
  };

  const openConfirmation = () => {
    if (!selectedOrganizationId) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Select Partner Organization",
        message: "Please choose which partner organization is receiving this delivery.",
      });
      return;
    }

    if (!selectedPlantId && plants.length > 0) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Select Water Source",
        message: "Please choose which plant the water cans were loaded from.",
      });
      return;
    }

    const loaded = Number(fullCansLoaded) || 0;
    const emptyReturned = Number(emptyCansReturned) || 0;
    const c200 = Number(cases200ml) || 0;
    const c500 = Number(cases500ml) || 0;
    const c1l = Number(cases1l) || 0;

    if (loaded <= 0 && emptyReturned <= 0 && c200 <= 0 && c500 <= 0 && c1l <= 0) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Enter Quantity",
        message: "Please enter quantities for 20L cans or packaged bottle cases.",
      });
      return;
    }

    if (loaded > max20lCans) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Exceeds Stock",
        message: `Cannot load ${loaded} 20L cans. Only ${max20lCans} remaining in inventory.`,
      });
      return;
    }

    if (c200 > max200mlPacks) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Exceeds Stock",
        message: `Cannot load ${c200} packs of 200ml. Only ${max200mlPacks} packs (${prod200ml?.stock ?? 0} bottles) remaining in inventory.`,
      });
      return;
    }

    if (c500 > max500mlCases) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Exceeds Stock",
        message: `Cannot load ${c500} cases of 500ml. Only ${max500mlCases} cases (${prod500ml?.stock ?? 0} bottles) remaining in inventory.`,
      });
      return;
    }

    if (c1l > max1lCases) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Exceeds Stock",
        message: `Cannot load ${c1l} cases of 1L. Only ${max1lCases} cases (${prod1l?.stock ?? 0} bottles) remaining in inventory.`,
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmDelivery = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const loaded = Number(fullCansLoaded) || 0;
      const emptyReturned = Number(emptyCansReturned) || 0;
      const c200 = Number(cases200ml) || 0;
      const c500 = Number(cases500ml) || 0;
      const c1l = Number(cases1l) || 0;
      const deliveryId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const payload = {
        id: deliveryId,
        organizationId: selectedOrganization?.id,
        organizationName: selectedOrganization?.name || "",
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

      await addDeliveryRecord(payload);

      setShowConfirmModal(false);
      setFullCansLoaded("");
      setEmptyCansReturned("");
      setCases200ml("");
      setCases500ml("");
      setCases1l("");

      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Delivery & Inventory Logged",
        message: `Saved delivery for ${selectedOrganization?.name}. Stock updated automatically!`,
      });
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

  const myShiftDeliveries = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return deliveries.filter((d) => {
      const dDate = d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 10) : "";
      return dDate === todayStr && d.deliveredBy === user?.name;
    });
  }, [deliveries, user?.name]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        <Animated.View style={{ transform: [{ translateY: headerTranslateY }], opacity: headerOpacity }}>
          <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
            <View style={styles.headerTop}>
              <KrioLogo width={120} height={36} />
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} accessibilityLabel="Logout">
                <LogOut size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <Text style={styles.headerLabel}>DRIVER DISPATCH PANEL</Text>
            <Text style={styles.headerTitle}>Delivery Dashboard</Text>
            <Text style={styles.headerSub}>Record water cans & bottle cases. Inventory updates automatically on submit.</Text>

            <View style={styles.profileCard}>
              <View style={styles.profileIcon}>
                <User size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{user.name}</Text>
                <Text style={styles.profileRole}>Verified Delivery Executive</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.content}>
        {/* Shift Summary Badges */}
        <Text style={styles.sectionTitle}>Today's Shift Summary</Text>
        <View style={styles.cardGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Completed Runs</Text>
            <Text style={styles.statValue}>{todayDeliveriesCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Partners</Text>
            <Text style={styles.statValue}>{organizations.length}</Text>
          </View>
        </View>

        {/* Dispatch Form Card */}
        <Text style={styles.sectionTitle}>Record Water Delivery</Text>
        <View style={styles.formCard}>
          {/* Step 1: Organization Select */}
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
            <Text style={styles.formHeading}>Select Partner Organization</Text>
          </View>

          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowOrgMenu((value) => !value)}
            accessibilityRole="combobox"
          >
            <Text style={[styles.dropdownButtonText, selectedOrganization && { color: Colors.primary, fontWeight: "900" }]}>
              {selectedOrganization?.name || "👇 Tap to choose Organization"}
            </Text>
          </TouchableOpacity>

          {showOrgMenu && (
            <View style={styles.dropdownMenu}>
              <View style={styles.searchBox}>
                <Search size={18} color={Colors.muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search organization name..."
                  placeholderTextColor={Colors.muted}
                  value={orgSearchText}
                  onChangeText={setOrgSearchText}
                />
              </View>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {filteredOrganizations.length === 0 ? (
                  <Text style={styles.dropdownEmpty}>No matching organizations found.</Text>
                ) : (
                  filteredOrganizations.map((org) => (
                    <TouchableOpacity
                      key={org.id}
                      style={styles.dropdownMenuItem}
                      onPress={() => {
                        setSelectedOrganizationId(org.id);
                        setShowOrgMenu(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.dropdownMenuText,
                            selectedOrganizationId === org.id && styles.dropdownMenuTextSelected,
                          ]}
                        >
                          {org.name}
                        </Text>
                        {org.address ? <Text style={styles.subDetailText}>{org.address}</Text> : null}
                      </View>
                      {selectedOrganizationId === org.id && <Check size={20} color={Colors.primary} />}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* Step 2: Dispatch Water Source */}
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
            <Text style={styles.formHeading}>Water Source Plant</Text>
          </View>

          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowPlantMenu((value) => !value)}
            accessibilityRole="combobox"
          >
            <Text style={styles.dropdownButtonText}>
              {selectedPlant ? `📍 ${selectedPlant.name}` : "Tap to select water plant"}
            </Text>
          </TouchableOpacity>

          {showPlantMenu && (
            <View style={styles.dropdownMenu}>
              <View style={styles.searchBox}>
                <Search size={18} color={Colors.muted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search plant..."
                  placeholderTextColor={Colors.muted}
                  value={plantSearchText}
                  onChangeText={setPlantSearchText}
                />
              </View>
              <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                {filteredPlants.length === 0 ? (
                  <Text style={styles.dropdownEmpty}>No matching plants found.</Text>
                ) : (
                  filteredPlants.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.dropdownMenuItem}
                      onPress={() => {
                        setSelectedPlantId(p.id);
                        setShowPlantMenu(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.dropdownMenuText,
                            selectedPlantId === p.id && styles.dropdownMenuTextSelected,
                          ]}
                        >
                          {p.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>{p.location}</Text>
                      </View>
                      {selectedPlantId === p.id && <Check size={20} color={Colors.primary} />}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* Step 3: 20L Water Cans */}
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
            <Text style={styles.formHeading}>20 L Water Cans</Text>
          </View>

          <View style={styles.bottleRowHeader}>
            <Text style={styles.subFieldLabel}>Full 20L Cans Loaded</Text>
            <Text style={styles.stockAvailBadge}>Available: {max20lCans} cans</Text>
          </View>
          <View style={styles.stepperContainer}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAddFullCans(-1)}>
              <Text style={styles.stepperBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.stepperInput}
              placeholder="0"
              placeholderTextColor={Colors.muted}
              keyboardType="numeric"
              value={fullCansLoaded}
              onChangeText={(text) => {
                const val = Number(text) || 0;
                if (val > max20lCans) {
                  setToast({
                    id: Date.now().toString(),
                    type: "warning",
                    title: "Exceeds Stock",
                    message: `Only ${max20lCans} 20L cans available in inventory.`,
                  });
                  setFullCansLoaded(String(max20lCans));
                  return;
                }
                setFullCansLoaded(text);
              }}
            />
            <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAddFullCans(1)}>
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subFieldLabel}>Empty 20L Cans Collected</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAddEmptyCans(-1)}>
              <Text style={styles.stepperBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.stepperInput}
              placeholder="0"
              placeholderTextColor={Colors.muted}
              keyboardType="numeric"
              value={emptyCansReturned}
              onChangeText={setEmptyCansReturned}
            />
            <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAddEmptyCans(1)}>
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Step 4: Packaged Bottle Cases */}
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>4</Text></View>
            <Text style={styles.formHeading}>Packaged Bottle Cases</Text>
          </View>

          {/* 200ml Pack (35 bottles) */}
          <View style={styles.bottleRowHeader}>
            <Text style={styles.subFieldLabel}>200 ml Packs (1 Pack = 35 Bottles)</Text>
            <Text style={styles.stockAvailBadge}>Available: {max200mlPacks} packs</Text>
          </View>
          <View style={styles.stepperContainer}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdd200ml(-1)}>
              <Text style={styles.stepperBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.stepperInput}
              placeholder="0 packs"
              placeholderTextColor={Colors.muted}
              keyboardType="numeric"
              value={cases200ml}
              onChangeText={(text) => {
                const val = Number(text) || 0;
                if (val > max200mlPacks) {
                  setToast({
                    id: Date.now().toString(),
                    type: "warning",
                    title: "Exceeds Stock",
                    message: `Only ${max200mlPacks} packs available in inventory.`,
                  });
                  setCases200ml(String(max200mlPacks));
                  return;
                }
                setCases200ml(text);
              }}
            />
            <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdd200ml(1)}>
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* 500ml Case (24 bottles) */}
          <View style={styles.bottleRowHeader}>
            <Text style={styles.subFieldLabel}>500 ml Cases (1 Case = 24 Bottles)</Text>
            <Text style={styles.stockAvailBadge}>Available: {max500mlCases} cases</Text>
          </View>
          <View style={styles.stepperContainer}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdd500ml(-1)}>
              <Text style={styles.stepperBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.stepperInput}
              placeholder="0 cases"
              placeholderTextColor={Colors.muted}
              keyboardType="numeric"
              value={cases500ml}
              onChangeText={(text) => {
                const val = Number(text) || 0;
                if (val > max500mlCases) {
                  setToast({
                    id: Date.now().toString(),
                    type: "warning",
                    title: "Exceeds Stock",
                    message: `Only ${max500mlCases} cases available in inventory.`,
                  });
                  setCases500ml(String(max500mlCases));
                  return;
                }
                setCases500ml(text);
              }}
            />
            <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdd500ml(1)}>
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* 1 Litre Case (12 bottles) */}
          <View style={styles.bottleRowHeader}>
            <Text style={styles.subFieldLabel}>1 Litre Cases (1 Case = 12 Bottles)</Text>
            <Text style={styles.stockAvailBadge}>Available: {max1lCases} cases</Text>
          </View>
          <View style={styles.stepperContainer}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdd1l(-1)}>
              <Text style={styles.stepperBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.stepperInput}
              placeholder="0 cases"
              placeholderTextColor={Colors.muted}
              keyboardType="numeric"
              value={cases1l}
              onChangeText={(text) => {
                const val = Number(text) || 0;
                if (val > max1lCases) {
                  setToast({
                    id: Date.now().toString(),
                    type: "warning",
                    title: "Exceeds Stock",
                    message: `Only ${max1lCases} cases available in inventory.`,
                  });
                  setCases1l(String(max1lCases));
                  return;
                }
                setCases1l(text);
              }}
            />
            <TouchableOpacity style={styles.stepperBtn} onPress={() => handleAdd1l(1)}>
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Prominent High-Contrast Action Button */}
          <TouchableOpacity
            style={[styles.confirmButton, isSubmitting && { opacity: 0.65 }]}
            onPress={openConfirmation}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            <Truck size={22} color={Colors.white} style={{ marginRight: 10 }} />
            <Text style={styles.confirmButtonText}>
              {isSubmitting ? "Logging Delivery..." : "RECORD DELIVERY RUN"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Shift History Section */}
        <Text style={styles.sectionTitle}>Today's Logged Runs ({myShiftDeliveries.length})</Text>
        {myShiftDeliveries.length === 0 ? (
          <View style={styles.emptyShiftCard}>
            <Truck size={32} color={Colors.muted} />
            <Text style={styles.emptyShiftTitle}>No runs logged yet today</Text>
            <Text style={styles.emptyShiftText}>Deliveries you submit above will appear here immediately.</Text>
          </View>
        ) : (
          myShiftDeliveries.map((item) => (
            <View key={item.id} style={styles.shiftRunCard}>
              <View style={styles.shiftRunIconBox}>
                <Check size={20} color={Colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shiftRunOrg}>{item.organizationName}</Text>
                <Text style={styles.shiftRunMeta}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                  {item.plantName ? ` • ${item.plantName}` : ""}
                </Text>
                <Text style={styles.shiftRunCounts}>
                  💧 {item.fullCansLoaded} Full 20L | 🪣 {item.emptyCansReturned} Empty
                  {item.cases200mlDelivered ? ` | 🧴 ${item.cases200mlDelivered}p (200ml)` : ""}
                  {item.cases500mlDelivered ? ` | 🍶 ${item.cases500mlDelivered}c (500ml)` : ""}
                  {item.cases1lDelivered ? ` | 🫙 ${item.cases1lDelivered}c (1L)` : ""}
                </Text>
              </View>
            </View>
          ))
        )}
        </View>
      </Animated.ScrollView>

      {/* Confirmation Modal before saving */}
      <ConfirmModal
        visible={showConfirmModal}
        title="Confirm Delivery Run"
        message={`Save delivery for ${selectedOrganization?.name}? Stock will update automatically.`}
        confirmLabel="Save Delivery"
        cancelLabel="Make Changes"
        isConfirming={isSubmitting}
        onConfirm={handleConfirmDelivery}
        onCancel={() => setShowConfirmModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logoutBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  headerLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: "rgba(255,255,255,0.9)", marginBottom: 6 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: Colors.white, marginBottom: 4 },
  headerSub: { fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.85)", marginBottom: 16 },
  profileCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, flexDirection: "row", alignItems: "center", padding: 18, gap: 16, maxWidth: 800, width: "100%", alignSelf: "center", ...Shadow.soft },
  profileIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.mutedBg, alignItems: "center", justifyContent: "center" },
  profileName: { fontSize: 18, fontWeight: "900", color: Colors.foreground },
  profileRole: { fontSize: 13, color: Colors.primary, fontWeight: "800", marginTop: 2 },
  content: { padding: 16, gap: 16, paddingBottom: 40, maxWidth: 800, width: "100%", alignSelf: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: Colors.foreground, marginTop: 4 },
  cardGrid: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 18, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft },
  statLabel: { fontSize: 12, color: Colors.muted, fontWeight: "700", marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: "900", color: Colors.primary },
  formCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 20, gap: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft },
  stepHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  stepBadgeText: { color: Colors.white, fontWeight: "900", fontSize: 13 },
  formHeading: { fontSize: 15, fontWeight: "900", color: Colors.foreground },
  subFieldLabel: { fontSize: 13, fontWeight: "800", color: Colors.foreground, marginTop: 4 },
  bottleRowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bottleTotalBadge: { fontSize: 12, fontWeight: "900", color: Colors.primary, backgroundColor: Colors.mutedBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  stockAvailBadge: { fontSize: 12, fontWeight: "800", color: Colors.primary, backgroundColor: Colors.mutedBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  dropdownButton: { backgroundColor: Colors.mutedBg, borderRadius: Radius.lg, minHeight: 52, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1.5, borderColor: Colors.border, justifyContent: "center" },
  dropdownButtonText: { color: Colors.foreground, fontWeight: "800", fontSize: 15 },
  dropdownMenu: { backgroundColor: Colors.card, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", ...Shadow.soft },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.mutedBg, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchInput: { flex: 1, fontSize: 15, color: Colors.foreground, paddingVertical: 0 },
  dropdownMenuItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownMenuText: { color: Colors.foreground, fontSize: 15, fontWeight: "700" },
  dropdownMenuTextSelected: { color: Colors.primary, fontWeight: "900" },
  subDetailText: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  dropdownEmpty: { color: Colors.muted, padding: 16, fontSize: 14, textAlign: "center" },
  stepperContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperBtn: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", ...Shadow.card },
  stepperBtnText: { fontSize: 28, fontWeight: "900", color: Colors.white, lineHeight: 30 },
  stepperInput: { flex: 1, minHeight: 52, backgroundColor: Colors.mutedBg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, fontSize: 18, fontWeight: "900", color: Colors.foreground, textAlign: "center" },
  confirmButton: { marginTop: 12, flexDirection: "row", backgroundColor: Colors.primary, borderRadius: Radius.full, minHeight: 56, paddingVertical: 16, alignItems: "center", justifyContent: "center", ...Shadow.card },
  confirmButtonText: { color: Colors.white, fontWeight: "900", fontSize: 16, letterSpacing: 0.5 },
  emptyShiftCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 24, borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 8, ...Shadow.soft },
  emptyShiftTitle: { fontSize: 15, fontWeight: "800", color: Colors.foreground },
  emptyShiftText: { fontSize: 13, color: Colors.muted, textAlign: "center" },
  shiftRunCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: Colors.border, ...Shadow.soft },
  shiftRunIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center" },
  shiftRunOrg: { fontSize: 16, fontWeight: "900", color: Colors.foreground },
  shiftRunMeta: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  shiftRunCounts: { fontSize: 13, color: Colors.primary, fontWeight: "800", marginTop: 4 },
});
