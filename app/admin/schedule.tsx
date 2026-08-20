import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Trash2,
  X,
  Plus,
  Building2,
  Search,
  FileText,
  AlertCircle,
  Navigation,
  Compass,
} from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { DeliverySchedule, Organization, useCart } from "@/context/CartContext";
import { optimizeDeliveryRoute } from "@/utils/routeOptimizer";
import { SkeletonList } from "@/components/UI/Skeleton";
import ConfirmModal from "@/components/UI/ConfirmModal";
import Toast, { ToastMessage } from "@/components/UI/Toast";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateKey(year: number, month: number, day: number): string {
  const y = year.toString();
  const m = (month + 1).toString().padStart(2, "0");
  const d = day.toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayKey(): string {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export default function ScheduleScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { organizations, deliverySchedules, addOrUpdateSchedule, rescheduleOrganization, deleteSchedule, firebaseReady } = useCart();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getTodayKey());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"calendar" | "partners">("calendar");

  const selectedDateRoute = useMemo(() => {
    const daySchedules = deliverySchedules.filter((s) => s.scheduledDate === selectedDateKey);
    return optimizeDeliveryRoute(daySchedules, organizations);
  }, [deliverySchedules, selectedDateKey, organizations]);

  // Edit Modal state
  const [editSchedule, setEditSchedule] = useState<DeliverySchedule | null>(null);
  const [editNotes, setEditNotes] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");

  // Direct Assign Modal state (for tap-to-schedule fallback)
  const [assignOrg, setAssignOrg] = useState<Organization | null>(null);
  const [assignDate, setAssignDate] = useState<string>(getTodayKey());
  const [assignNotes, setAssignNotes] = useState<string>("");

  // Confirmation & Toast state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    org: Organization;
    dateKey: string;
    existingSched: DeliverySchedule;
  } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Web drag over highlight state
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const todayKey = getTodayKey();

  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const pDay = prevMonthDays - i;
      const pMonth = month === 0 ? 11 : month - 1;
      const pYear = month === 0 ? year - 1 : year;
      const dateKey = formatDateKey(pYear, pMonth, pDay);
      days.push({
        dateKey,
        dayNumber: pDay,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      days.push({
        dateKey,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
      });
    }

    // Next month padding to complete grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nMonth = month === 11 ? 0 : month + 1;
      const nYear = month === 11 ? year + 1 : year;
      const dateKey = formatDateKey(nYear, nMonth, i);
      days.push({
        dateKey,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
      });
    }

    return days;
  }, [year, month, todayKey]);

  // Group schedules by dateKey
  const schedulesByDate = useMemo(() => {
    const map: Record<string, DeliverySchedule[]> = {};
    deliverySchedules.forEach((sched) => {
      if (!map[sched.scheduledDate]) {
        map[sched.scheduledDate] = [];
      }
      map[sched.scheduledDate].push(sched);
    });
    // Sort schedules within date by order
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
    return map;
  }, [deliverySchedules]);

  // Filter unscheduled or all organizations
  const filteredOrganizations = useMemo(() => {
    let list = organizations;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (org) =>
          org.name.toLowerCase().includes(query) ||
          org.phone.toLowerCase().includes(query) ||
          org.address.toLowerCase().includes(query)
      );
    }
    return list;
  }, [organizations, searchQuery]);

  // Navigation actions
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const goToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(todayKey);
  };

  // Schedule an Organization onto a Date
  const handleScheduleOrgToDate = async (org: Organization, dateKey: string) => {
    // Prevent scheduling on past dates
    if (dateKey < todayKey) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Past Date Not Allowed",
        message: "Deliveries can only be scheduled for today or future dates.",
      });
      return;
    }

    // Check duplicate
    const existingOnDate = (schedulesByDate[dateKey] || []).find((s) => s.organizationId === org.id);
    if (existingOnDate) {
      setDuplicateWarning({ org, dateKey, existingSched: existingOnDate });
      return;
    }

    try {
      const currentCount = (schedulesByDate[dateKey] || []).length;
      await addOrUpdateSchedule({
        organizationId: org.id,
        organizationName: org.name,
        scheduledDate: dateKey,
        status: "Pending",
        order: currentCount,
      });
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Delivery Scheduled",
        message: `Scheduled ${org.name} for ${dateKey}`,
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Scheduling Failed",
        message: err.message || "Failed to schedule delivery",
      });
    }
  };

  // HTML5 Drag & Drop handlers for Web
  const handleWebDragStart = (e: any, payload: { type: "UNSCHEDULED" | "SCHEDULED"; orgId: string; orgName: string; scheduleId?: string; sourceDate?: string }) => {
    if (Platform.OS === "web" && e.dataTransfer) {
      const jsonStr = JSON.stringify(payload);
      e.dataTransfer.setData("text/plain", jsonStr);
      e.dataTransfer.setData("application/json", jsonStr);
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleWebDropOnDate = async (e: any, targetDateKey: string) => {
    if (Platform.OS === "web") {
      e.preventDefault();
      setDragOverDate(null);

      if (targetDateKey < todayKey) {
        setToast({
          id: Date.now().toString(),
          type: "warning",
          title: "Past Date Not Allowed",
          message: "Deliveries can only be scheduled for today or future dates.",
        });
        return;
      }

      if (targetDateKey < todayKey) {
        setToast({
          id: Date.now().toString(),
          type: "warning",
          title: "Past Date Not Allowed",
          message: "Deliveries can only be scheduled for today or future dates.",
        });
        return;
      }

      try {
        const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
        if (!raw) return;
        const data = JSON.parse(raw);

        if (data.type === "UNSCHEDULED") {
          const org = organizations.find((o) => o.id === data.orgId);
          if (org) {
            await handleScheduleOrgToDate(org, targetDateKey);
          }
        } else if (data.type === "SCHEDULED" && data.scheduleId) {
          if (data.sourceDate === targetDateKey) return; // Same date, no-op
          await rescheduleOrganization(data.scheduleId, targetDateKey);
          setToast({
            id: Date.now().toString(),
            type: "success",
            title: "Delivery Rescheduled",
            message: `Rescheduled ${data.orgName} to ${targetDateKey}`,
          });
        }
      } catch (err: any) {
        setToast({
          id: Date.now().toString(),
          type: "error",
          title: "Drag & Drop Failed",
          message: "Could not process drag & drop action",
        });
      }
    }
  };

  // Edit Schedule Modal submit
  const handleSaveEditSchedule = async () => {
    if (!editSchedule) return;
    if (editDate < todayKey) {
      setToast({
        id: Date.now().toString(),
        type: "warning",
        title: "Past Date Not Allowed",
        message: "Deliveries can only be scheduled for today or future dates.",
      });
      return;
    }
    try {
      await addOrUpdateSchedule({
        ...editSchedule,
        notes: editNotes.trim(),
        scheduledDate: editDate,
      });
      setEditSchedule(null);
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Schedule Updated",
        message: "Schedule details saved successfully",
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update schedule",
      });
    }
  };

  // Delete Schedule action
  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      await deleteSchedule(scheduleId);
      setConfirmDeleteId(null);
      setEditSchedule(null);
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Schedule Removed",
        message: "Delivery schedule removed successfully",
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Removal Failed",
        message: "Failed to remove schedule",
      });
    }
  };

  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectedDaySchedules = schedulesByDate[selectedDateKey] || [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Bar */}
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconBox}>
              <CalendarIcon size={24} color="#FFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Delivery Scheduling</Text>
              <Text style={styles.headerSubtitle}>Drag organizations to calendar dates to assign deliveries</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Main Workspace Layout */}
        <View style={[styles.workspace, isMobile && styles.workspaceMobile]}>
          {/* Calendar Section (Left / Top) */}
          <View style={[styles.calendarCard, isMobile && styles.calendarCardMobile]}>
            {/* Calendar Controls */}
            <View style={styles.calendarHeader}>
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.iconBtn}>
                  <ChevronLeft size={20} color={Colors.foreground} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{monthLabel}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.iconBtn}>
                  <ChevronRight size={20} color={Colors.foreground} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.todayBtn} onPress={goToToday}>
                <Clock size={14} color={Colors.primary} />
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>
            </View>

            {/* Days of Week Header */}
            <View style={styles.daysHeader}>
              {DAYS_OF_WEEK.map((day) => (
                <Text key={day} style={styles.dayHeaderText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((cell) => {
                const daySchedules = schedulesByDate[cell.dateKey] || [];
                const isSelected = cell.dateKey === selectedDateKey;
                const isDragTarget = dragOverDate === cell.dateKey;

                // Web Drag & Drop attributes
                const webProps = Platform.OS === "web" ? {
                  onDragOver: (e: any) => {
                    e.preventDefault();
                    if (dragOverDate !== cell.dateKey) setDragOverDate(cell.dateKey);
                  },
                  onDragLeave: () => setDragOverDate(null),
                  onDrop: (e: any) => handleWebDropOnDate(e, cell.dateKey),
                } : {};

                return (
                  <TouchableOpacity
                    key={cell.dateKey}
                    style={[
                      styles.dayCell,
                      !cell.isCurrentMonth && styles.dayCellOutside,
                      cell.isToday && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
                      isDragTarget && styles.dayCellDragOver,
                    ]}
                    onPress={() => setSelectedDateKey(cell.dateKey)}
                    activeOpacity={0.8}
                    {...(webProps as any)}
                  >
                    <View style={styles.dayCellHeader}>
                      <Text
                        style={[
                          styles.dayNumberText,
                          !cell.isCurrentMonth && styles.dayNumberOutside,
                          cell.isToday && styles.dayNumberToday,
                        ]}
                      >
                        {cell.dayNumber}
                      </Text>
                      {cell.isToday && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>TODAY</Text>
                        </View>
                      )}
                    </View>

                    {/* Status Dot Indicators (Sleek on Mobile) */}
                    {daySchedules.length > 0 && (
                      <View style={styles.dotRow}>
                        {daySchedules.slice(0, 3).map((sched) => (
                          <View
                            key={sched.id}
                            style={[
                              styles.statusDot,
                              sched.status === "Completed" ? styles.dotCompleted : styles.dotPending,
                            ]}
                          />
                        ))}
                        {daySchedules.length > 3 && (
                          <Text style={styles.dotMoreText}>+{daySchedules.length - 3}</Text>
                        )}
                      </View>
                    )}

                    {/* Scheduled Items Badges inside Day Cell (Web/Desktop) */}
                    {Platform.OS === "web" && (
                      <ScrollView style={styles.dayCellScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {daySchedules.map((sched) => {
                          const isCompleted = sched.status === "Completed";
                          const webItemProps = {
                            draggable: true,
                            onDragStart: (e: any) =>
                              handleWebDragStart(e, {
                                type: "SCHEDULED",
                                orgId: sched.organizationId,
                                orgName: sched.organizationName,
                                scheduleId: sched.id,
                                sourceDate: cell.dateKey,
                              }),
                          };

                          return (
                            <TouchableOpacity
                              key={sched.id}
                              style={[
                                styles.scheduleBadge,
                                isCompleted ? styles.scheduleBadgeCompleted : styles.scheduleBadgePending,
                              ]}
                              onPress={() => {
                                setEditSchedule(sched);
                                setEditNotes(sched.notes || "");
                                setEditDate(sched.scheduledDate);
                              }}
                              {...(webItemProps as any)}
                            >
                              {isCompleted ? (
                                <CheckCircle2 size={10} color={Colors.success} style={{ marginRight: 2 }} />
                              ) : (
                                <Clock size={10} color={Colors.info} style={{ marginRight: 2 }} />
                              )}
                              <Text
                                style={[
                                  styles.scheduleBadgeText,
                                  isCompleted && styles.scheduleBadgeTextCompleted,
                                ]}
                                numberOfLines={1}
                              >
                                {sched.organizationName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Unscheduled / Organizations Panel (Right / Bottom) */}
          <View style={[styles.sidebarCard, isMobile && styles.sidebarCardMobile]}>
            <View style={styles.sidebarHeader}>
              <Building2 size={18} color={Colors.primary} />
              <Text style={styles.sidebarTitle}>Partner Organizations</Text>
            </View>
            <Text style={styles.sidebarSubtitle}>
              Drag an organization onto any calendar date or tap to assign.
            </Text>

            {/* Search Input */}
            <View style={styles.searchBox}>
              <Search size={16} color={Colors.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search organizations..."
                placeholderTextColor={Colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={16} color={Colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* List of Organizations */}
            <ScrollView
              style={styles.orgList}
              contentContainerStyle={styles.orgListContent}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {filteredOrganizations.length === 0 ? (
                <View style={styles.emptyState}>
                  <Building2 size={32} color={Colors.muted} />
                  <Text style={styles.emptyText}>No organizations found</Text>
                </View>
              ) : (
                filteredOrganizations.map((org) => {
                  // Check if org is scheduled on the selectedDateKey
                  const isScheduledOnSelected = (schedulesByDate[selectedDateKey] || []).some(
                    (s) => s.organizationId === org.id
                  );
                  const isPastSelected = selectedDateKey < todayKey;

                  const webOrgProps = Platform.OS === "web" && !isMobile ? {
                    draggable: true,
                    onDragStart: (e: any) =>
                      handleWebDragStart(e, {
                        type: "UNSCHEDULED",
                        orgId: org.id,
                        orgName: org.name,
                      }),
                  } : {};

                  return (
                    <View key={org.id} style={styles.orgCard} {...(webOrgProps as any)}>
                      <View style={styles.orgInfo}>
                        <Text style={styles.orgName}>{org.name}</Text>
                        <Text style={styles.orgDetail} numberOfLines={1}>
                          {org.address || org.phone || "Partner Client"}
                        </Text>
                      </View>

                      <View style={styles.orgActions}>
                        <TouchableOpacity
                          style={[
                            styles.assignBtn,
                            isScheduledOnSelected && styles.assignBtnActive,
                            isPastSelected && { opacity: 0.5 },
                          ]}
                          onPress={() => {
                            handleScheduleOrgToDate(org, selectedDateKey);
                          }}
                        >
                          <Plus size={14} color={isScheduledOnSelected ? Colors.white : Colors.primary} />
                          <Text
                            style={[
                              styles.assignBtnText,
                              isScheduledOnSelected && styles.assignBtnTextActive,
                            ]}
                          >
                            {isScheduledOnSelected
                              ? "Scheduled"
                              : isPastSelected
                                ? "Past Date Selected"
                                : `+ Schedule (${selectedDateKey.slice(8)})`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>

        {/* Selected Date Summary Section */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <CalendarIcon size={18} color={Colors.primary} />
            <Text style={styles.summaryTitle}>
              Deliveries Scheduled for {selectedDateKey === todayKey ? "Today (" + selectedDateKey + ")" : selectedDateKey}
            </Text>
          </View>

          {/* Route Optimization Summary Header */}
          {selectedDateRoute.stops.length > 0 ? (
            <View style={styles.routeHeaderCard}>
              <View style={styles.routeHeaderRow}>
                <Compass size={18} color={Colors.primary} />
                <Text style={styles.routeHeaderTitle}>
                  {selectedDateRoute.isOptimized ? "Optimized Delivery Route Order" : "Scheduled Delivery Route"}
                </Text>
                <View style={styles.routeBadge}>
                  <Text style={styles.routeBadgeText}>
                    {selectedDateRoute.isOptimized ? "⚡ Optimized Heuristic" : "Manual Order"}
                  </Text>
                </View>
              </View>

              <Text style={styles.routeHeaderMetrics}>
                Total Est. Distance: {selectedDateRoute.totalDistanceKm} km • Total Est. Travel & Stop Time: {selectedDateRoute.totalTimeMins} mins
              </Text>
            </View>
          ) : null}

          {!firebaseReady && deliverySchedules.length === 0 ? (
            <SkeletonList count={2} />
          ) : selectedDateRoute.stops.length === 0 ? (
            <View style={styles.summaryEmpty}>
              <AlertCircle size={24} color={Colors.muted} />
              <Text style={styles.summaryEmptyText}>No deliveries scheduled for this date.</Text>
              <Text style={styles.summaryEmptySub}>
                Drag an organization from the right panel onto this date to add a delivery.
              </Text>
            </View>
          ) : (
            <View style={styles.summaryList}>
              {selectedDateRoute.stops.map((sched) => (
                <View key={sched.id} style={styles.summaryItem}>
                  <View style={styles.summaryBadgeNumber}>
                    <Text style={styles.summaryBadgeText}>Stop #{sched.stopNumber}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryOrgName}>{sched.organizationName}</Text>
                    {sched.address ? (
                      <Text style={styles.summaryNotes} numberOfLines={1}>📍 {sched.address}</Text>
                    ) : null}
                    {sched.estimatedArrival ? (
                      <Text style={styles.summaryNotes}>Est. Arrival: {sched.estimatedArrival} {sched.distanceToNextKm ? `(Next stop: ${sched.distanceToNextKm} km)` : ""}</Text>
                    ) : null}
                  </View>
                  <View style={styles.statusPillContainer}>
                    <View
                      style={[
                        styles.statusPill,
                        sched.status === "Completed" ? styles.statusPillCompleted : styles.statusPillPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          sched.status === "Completed" ? styles.statusTextCompleted : styles.statusTextPending,
                        ]}
                      >
                        {sched.status}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.summaryEditBtn}
                    onPress={() => {
                      setEditSchedule(sched);
                      setEditNotes(sched.notes || "");
                      setEditDate(sched.scheduledDate);
                    }}
                  >
                    <FileText size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* EDIT SCHEDULE MODAL */}
      {editSchedule && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setEditSchedule(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manage Delivery Schedule</Text>
                <TouchableOpacity onPress={() => setEditSchedule(null)}>
                  <X size={20} color={Colors.foreground} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalOrgTitle}>{editSchedule.organizationName}</Text>
                <View style={styles.modalStatusRow}>
                  <Text style={styles.fieldLabel}>Status:</Text>
                  <View
                    style={[
                      styles.statusPill,
                      editSchedule.status === "Completed" ? styles.statusPillCompleted : styles.statusPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        editSchedule.status === "Completed" ? styles.statusTextCompleted : styles.statusTextPending,
                      ]}
                    >
                      {editSchedule.status}
                    </Text>
                  </View>
                </View>

                {/* Scheduled Date Field */}
                <Text style={styles.fieldLabel}>Scheduled Date (YYYY-MM-DD):</Text>
                <TextInput
                  style={styles.textInput}
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.muted}
                />

                {/* Delivery Notes Field */}
                <Text style={styles.fieldLabel}>Delivery Notes (Optional):</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="e.g. Gate 2 entry, deliver 20L cans to 3rd floor..."
                  placeholderTextColor={Colors.muted}
                  multiline
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.deleteModalBtn}
                  onPress={() => setConfirmDeleteId(editSchedule.id)}
                >
                  <Trash2 size={16} color={Colors.error} />
                  <Text style={styles.deleteModalBtnText}>Remove</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditSchedule(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEditSchedule}>
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* DIRECT ASSIGN MODAL (Tap to Assign) */}
      {assignOrg && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setAssignOrg(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Schedule Delivery</Text>
                <TouchableOpacity onPress={() => setAssignOrg(null)}>
                  <X size={20} color={Colors.foreground} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalOrgTitle}>{assignOrg.name}</Text>

                <Text style={styles.fieldLabel}>Scheduled Date (YYYY-MM-DD):</Text>
                <TextInput
                  style={styles.textInput}
                  value={assignDate}
                  onChangeText={setAssignDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.muted}
                />

                <Text style={styles.fieldLabel}>Delivery Notes (Optional):</Text>
                <TextInput
                  style={[styles.textInput, { height: 75, textAlignVertical: "top" }]}
                  value={assignNotes}
                  onChangeText={setAssignNotes}
                  placeholder="Special instructions for delivery team..."
                  placeholderTextColor={Colors.muted}
                  multiline
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAssignOrg(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={async () => {
                    if (!assignDate.trim()) return;
                    await handleScheduleOrgToDate(assignOrg, assignDate.trim());
                    setAssignOrg(null);
                  }}
                >
                  <Text style={styles.saveBtnText}>Confirm Schedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {confirmDeleteId && (
        <ConfirmModal
          visible={!!confirmDeleteId}
          title="Remove Schedule"
          message="Are you sure you want to remove this delivery from the schedule?"
          confirmLabel="Remove"
          type="danger"
          onConfirm={() => handleDeleteSchedule(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {/* DUPLICATE WARNING MODAL */}
      {duplicateWarning && (
        <ConfirmModal
          visible={!!duplicateWarning}
          title="Already Scheduled"
          message={`${duplicateWarning.org.name} is already scheduled for ${duplicateWarning.dateKey}. Would you like to edit the existing schedule?`}
          confirmLabel="Edit Existing"
          type="primary"
          onConfirm={() => {
            const existing = duplicateWarning.existingSched;
            setDuplicateWarning(null);
            setEditSchedule(existing);
            setEditNotes(existing.notes || "");
            setEditDate(existing.scheduledDate);
          }}
          onCancel={() => setDuplicateWarning(null)}
        />
      )}

      {/* TOAST NOTIFICATION */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 16,
    ...Shadow.glow,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  workspace: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  workspaceMobile: {
    flexDirection: "column",
  },
  calendarCard: {
    flex: 3,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  calendarCardMobile: {
    flex: undefined,
    width: "100%",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.foreground,
    minWidth: 140,
    textAlign: "center",
  },
  iconBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.mutedBg,
  },
  todayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: `${Colors.primary}15`,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  daysHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: Colors.muted,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    minHeight: Platform.OS === "web" ? 85 : 56,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Platform.OS === "web" ? 4 : 6,
    backgroundColor: Colors.card,
  },
  dayCellOutside: {
    backgroundColor: "#F8FAFC",
    opacity: 0.5,
  },
  dayCellToday: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  dayCellSelected: {
    backgroundColor: `${Colors.secondaryLight}15`,
    borderColor: Colors.secondary,
  },
  dayCellDragOver: {
    backgroundColor: `${Colors.primaryGlow}25`,
    borderColor: Colors.primaryGlow,
    borderStyle: "dashed",
  },
  dayCellHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  dayNumberText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.foreground,
  },
  dayNumberOutside: {
    color: Colors.muted,
  },
  dayNumberToday: {
    color: Colors.primary,
    fontWeight: "800",
  },
  todayBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  todayBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#FFF",
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotPending: {
    backgroundColor: Colors.info,
  },
  dotCompleted: {
    backgroundColor: Colors.success,
  },
  dotMoreText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.muted,
    marginLeft: 1,
  },
  dayCellScroll: {
    maxHeight: 65,
  },
  scheduleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 3,
  },
  scheduleBadgePending: {
    backgroundColor: "#E0F2FE",
    borderLeftWidth: 2,
    borderLeftColor: Colors.info,
  },
  scheduleBadgeCompleted: {
    backgroundColor: "#D1FAE5",
    borderLeftWidth: 2,
    borderLeftColor: Colors.success,
  },
  scheduleBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.foreground,
  },
  scheduleBadgeTextCompleted: {
    color: "#065F46",
    textDecorationLine: "line-through",
  },

  // Sidebar Organizations Card
  sidebarCard: {
    flex: 1.4,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  sidebarCardMobile: {
    flex: undefined,
    width: "100%",
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.foreground,
  },
  sidebarSubtitle: {
    fontSize: 11,
    color: Colors.muted,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.foreground,
  },
  orgList: {
    maxHeight: 450,
    ...(Platform.OS === "web"
      ? ({
          overflowY: "auto",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
        } as any)
      : {}),
  },
  orgListContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.muted,
  },
  orgCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    ...(Platform.OS === "web"
      ? ({
          touchAction: "pan-y",
        } as any)
      : {}),
  },
  orgInfo: {
    flex: 1,
    marginRight: 8,
  },
  orgName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.foreground,
  },
  orgDetail: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },
  orgActions: {},
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.card,
    ...(Platform.OS === "web"
      ? ({
          touchAction: "manipulation",
        } as any)
      : {}),
  },
  assignBtnActive: {
    backgroundColor: Colors.primary,
  },
  assignBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
  },
  assignBtnTextActive: {
    color: Colors.white,
  },

  // Selected Date Summary Section
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.foreground,
  },
  summaryEmpty: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  summaryEmptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.foreground,
    marginTop: 6,
  },
  summaryEmptySub: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
    textAlign: "center",
  },
  summaryList: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.md,
    padding: 10,
    gap: 12,
  },
  summaryBadgeNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  summaryOrgName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.foreground,
  },
  summaryNotes: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },
  statusPillContainer: {},
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusPillPending: {
    backgroundColor: "#DBEAFE",
  },
  statusPillCompleted: {
    backgroundColor: "#D1FAE5",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextPending: {
    color: "#1E40AF",
  },
  statusTextCompleted: {
    color: "#065F46",
  },
  summaryEditBtn: {
    padding: 6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 20,
    ...Shadow.glow,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.foreground,
  },
  modalBody: {
    marginBottom: 16,
  },
  modalOrgTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 12,
  },
  modalStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.muted,
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: Colors.mutedBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.foreground,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deleteModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteModalBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.error,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.mutedBg,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.foreground,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
  },
  routeHeaderCard: {
    backgroundColor: `${Colors.primary}0D`,
    borderRadius: Radius.lg,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: `${Colors.primary}25`,
  },
  routeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeHeaderTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.foreground,
    flex: 1,
  },
  routeBadge: {
    backgroundColor: `${Colors.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  routeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
  },
  routeHeaderMetrics: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.muted,
  },
});
