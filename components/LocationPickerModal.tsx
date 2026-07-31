import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MapPin, Search, Navigation, Check, X, Trash2, Globe } from "lucide-react-native";
import * as Location from "expo-location";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { OrganizationLocation } from "@/context/CartContext";

export type LocationPickerModalProps = {
  visible: boolean;
  initialLocation?: OrganizationLocation | null;
  initialAddress?: string;
  onSave: (location: OrganizationLocation | null) => void;
  onCancel: () => void;
};

// Default fallback coordinates (e.g. Cochin / Kerala region)
const DEFAULT_LAT = 9.9312;
const DEFAULT_LNG = 76.2673;

export default function LocationPickerModal({
  visible,
  initialLocation,
  initialAddress,
  onSave,
  onCancel,
}: LocationPickerModalProps) {
  const [latitude, setLatitude] = useState<number>(initialLocation?.latitude ?? DEFAULT_LAT);
  const [longitude, setLongitude] = useState<number>(initialLocation?.longitude ?? DEFAULT_LNG);
  const [addressText, setAddressText] = useState<string>(
    initialLocation?.address || initialAddress || ""
  );
  const [placeId, setPlaceId] = useState<string | undefined>(initialLocation?.placeId);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string; place_id?: string }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      if (initialLocation?.latitude && initialLocation?.longitude) {
        setLatitude(initialLocation.latitude);
        setLongitude(initialLocation.longitude);
        setAddressText(initialLocation.address);
        setPlaceId(initialLocation.placeId);
      } else {
        setLatitude(DEFAULT_LAT);
        setLongitude(DEFAULT_LNG);
        setAddressText(initialAddress || "");
        setPlaceId(undefined);
      }
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [visible, initialLocation, initialAddress]);

  // Geocode Search using OpenStreetMap Nominatim / Google Places fallback
  const handleSearchPlaces = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5`,
        {
          headers: {
            "User-Agent": "KrioH2O-DeliveryApp/1.0",
          },
        }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchResults(data);
      }
    } catch (error) {
      console.warn("Location search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: { display_name: string; lat: string; lon: string; place_id?: string }) => {
    const newLat = parseFloat(item.lat);
    const newLng = parseFloat(item.lon);
    if (!isNaN(newLat) && !isNaN(newLng)) {
      setLatitude(newLat);
      setLongitude(newLng);
      setAddressText(item.display_name);
      if (item.place_id) setPlaceId(String(item.place_id));
      setSearchResults([]);
      setSearchQuery("");
    }
  };

  // Get current device location via expo-location
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to use your current GPS position."
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude: gpsLat, longitude: gpsLng } = loc.coords;
      setLatitude(gpsLat);
      setLongitude(gpsLng);

      // Reverse geocode
      try {
        const reverseRes = await Location.reverseGeocodeAsync({ latitude: gpsLat, longitude: gpsLng });
        if (reverseRes && reverseRes.length > 0) {
          const r = reverseRes[0];
          const formatted = [r.name, r.street, r.district, r.city, r.region, r.postalCode]
            .filter(Boolean)
            .join(", ");
          if (formatted) setAddressText(formatted);
        }
      } catch (e) {
        console.warn("Reverse geocode warning:", e);
      }
    } catch (error: any) {
      Alert.alert("GPS Error", error.message || "Unable to acquire current GPS location.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = () => {
    if (isNaN(latitude) || isNaN(longitude)) {
      Alert.alert("Invalid Coordinates", "Please select a valid location on the map.");
      return;
    }

    onSave({
      latitude,
      longitude,
      address: addressText.trim() || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      placeId,
    });
  };

  const handleClearLocation = () => {
    onSave(null);
  };

  if (!visible) return null;

  const mapEmbedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleBox}>
              <MapPin size={20} color={Colors.primary} />
              <Text style={styles.modalTitle}>Set Partner Location</Text>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
              <X size={20} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Search size={16} color={Colors.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search Google Maps address..."
                placeholderTextColor={Colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchPlaces}
                returnKeyType="search"
              />
              {isSearching ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <TouchableOpacity onPress={handleSearchPlaces} style={styles.searchSubmitBtn}>
                  <Text style={styles.searchSubmitText}>Search</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search Suggestions Dropdown */}
            {searchResults.length > 0 && (
              <ScrollView style={[styles.resultsList, { maxHeight: 140 }]} nestedScrollEnabled>
                {searchResults.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.resultItem}
                    onPress={() => handleSelectSearchResult(item)}
                  >
                    <MapPin size={14} color={Colors.primary} style={{ marginRight: 6, marginTop: 2 }} />
                    <Text style={styles.resultText} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Map Preview */}
          <View style={styles.mapContainer}>
            {Platform.OS === "web" ? (
              // Web iframe Google Maps View
              <iframe
                title="Google Maps Location Picker"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: Radius.lg }}
                loading="lazy"
                src={mapEmbedUrl}
              />
            ) : (
              // Mobile Fallback / Map View representation
              <View style={styles.mobileMapBox}>
                <Globe size={40} color={Colors.primary} />
                <Text style={styles.mobileMapText}>Pinned Coordinates</Text>
                <Text style={styles.mobileCoordsText}>
                  Lat: {latitude.toFixed(5)} • Lng: {longitude.toFixed(5)}
                </Text>
              </View>
            )}

            {/* Floating GPS Button */}
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleUseCurrentLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Navigation size={16} color={Colors.white} style={{ marginRight: 4 }} />
                  <Text style={styles.gpsBtnText}>Use My Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Location Summary Box */}
          <View style={styles.locationDetailsCard}>
            <Text style={styles.detailsLabel}>Selected Address & Coordinates:</Text>
            <TextInput
              style={styles.addressInput}
              value={addressText}
              onChangeText={setAddressText}
              placeholder="Address / Landmark description..."
              placeholderTextColor={Colors.muted}
              multiline
            />
            <Text style={styles.coordsLabel}>
              📍 Latitude: {latitude.toFixed(6)} | Longitude: {longitude.toFixed(6)}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            {initialLocation && (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearLocation}>
                <Trash2 size={16} color={Colors.error} />
                <Text style={styles.clearText}>Clear Location</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Check size={16} color={Colors.white} />
              <Text style={styles.saveText}>Save Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "90%",
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.foreground,
  },
  closeBtn: {
    padding: 4,
  },
  searchSection: {
    gap: 6,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.foreground,
  },
  searchSubmitBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  searchSubmitText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.white,
  },
  resultsList: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 6,
    ...Shadow.soft,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultText: {
    flex: 1,
    fontSize: 12,
    color: Colors.foreground,
    lineHeight: 16,
  },
  mapContainer: {
    height: 220,
    borderRadius: Radius.lg,
    overflow: "hidden",
    backgroundColor: Colors.mutedBg,
    position: "relative",
  },
  mobileMapBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  mobileMapText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.foreground,
  },
  mobileCoordsText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  gpsBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    ...Shadow.soft,
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.white,
  },
  locationDetailsCard: {
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.lg,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.muted,
  },
  addressInput: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.foreground,
    minHeight: 36,
  },
  coordsLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.error + "15",
  },
  clearText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.error,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.mutedBg,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.muted,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  saveText: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.white,
  },
});
