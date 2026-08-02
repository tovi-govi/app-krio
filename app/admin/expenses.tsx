import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import {
  ArrowDownUp,
  Calendar as CalendarIcon,
  CheckCircle,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Plus,
  Receipt,
  Trash2,
  User as UserIcon,
  X,
  Edit,
  Tag,
  UploadCloud,
  Paperclip,
  Trash,
} from "lucide-react-native";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import * as DocumentPicker from "expo-document-picker";
import { storage } from "@/services/firebase";
import { Colors, Radius, Shadow } from "@/constants/theme";

const AppColors = {
  ...Colors,
  navy: Colors.primary,
  navyLight: Colors.primaryLight,
  coral: Colors.error,
  textDark: Colors.foreground,
  textMuted: Colors.muted,
  surface: Colors.card,
  accentGreen: Colors.success,
  accentSky: Colors.secondary,
};
import { Expense, ExpenseCategory, useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import SearchInput from "@/components/UI/SearchInput";
import { SkeletonList } from "@/components/UI/Skeleton";
import {
  exportExpensesToExcel,
  exportExpensesToPDF,
  formatINR,
} from "@/utils/expenseExporter";

type DateFilterType = "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM";
type SortOption = "NEWEST" | "OLDEST" | "HIGHEST" | "LOWEST";
type PaymentMethodType = "Cash" | "Bank Transfer" | "UPI" | "Credit Card" | "Debit Card" | "Other";

const PAYMENT_METHODS: PaymentMethodType[] = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Other",
];

export default function ExpensesScreen() {
  const { user } = useAuth();
  const { expenses, expenseCategories, addExpense, updateExpense, deleteExpense, addExpenseCategory, firebaseReady } =
    useCart();

  // Search, Filter & Sort State
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("ALL");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("NEWEST");
  const [viewMode, setViewMode] = useState<"CARD" | "TABLE">("CARD");
  const [visibleCount, setVisibleCount] = useState(20);

  // Toast / Alert State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal States
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Form Fields for Add/Edit
  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethodType>("Cash");
  const [formDescription, setFormDescription] = useState("");
  const [formReceiptUrl, setFormReceiptUrl] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const handlePickAndUploadInvoice = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const pickedFile = result.assets[0];
      if (!pickedFile || !pickedFile.uri) {
        showToast("Invalid file selection. Please select a valid document or photo.");
        return;
      }

      setIsUploadingReceipt(true);

      if (storage) {
        const response = await fetch(pickedFile.uri);
        const blob = await response.blob();
        const rawName = pickedFile.name || `invoice_${Date.now()}`;
        const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storageRef = ref(storage, `expenses/receipts/${Date.now()}_${cleanName}`);

        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);

        setFormReceiptUrl(downloadUrl);
        showToast("Invoice uploaded to Cloud Storage!");
      } else {
        const response = await fetch(pickedFile.uri);
        const blob = await response.blob();

        if (blob.size > 500 * 1024) {
          showToast("Attachment too large for offline mode (>500KB). Please connect to storage or select a smaller file.");
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Uri = reader.result as string;
          if (base64Uri) {
            setFormReceiptUrl(base64Uri);
            showToast("Invoice document attached!");
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch (err: any) {
      console.error("Invoice upload error:", err);
      showToast(`Upload failed: ${err.message || "Could not attach file"}`);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Helper date calculators
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const monthStartStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }, []);

  const yearStartStr = useMemo(() => `${new Date().getFullYear()}-01-01`, []);

  // Summary Metrics calculation
  const summaryMetrics = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const year = now.getFullYear();
    const month = now.getMonth();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const weekStartStr = startOfWeek.toISOString().slice(0, 10);

    let todayTotal = 0;
    let monthTotal = 0;
    let yearTotal = 0;

    expenses.forEach((e) => {
      const eAmt = Number(e.amount || 0);
      const eDate = e.expenseDate || "";

      if (eDate === today) todayTotal += eAmt;
      if (eDate >= monthStartStr) monthTotal += eAmt;
      if (eDate >= yearStartStr) yearTotal += eAmt;
    });

    return {
      todayTotal,
      monthTotal,
      yearTotal,
      totalEntries: expenses.length,
    };
  }, [expenses, todayStr, monthStartStr, yearStartStr]);

  // Filtered & Sorted Expenses List
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((item) => {
        // Text Search Filter
        if (searchText.trim()) {
          const q = searchText.toLowerCase();
          const matchesName = item.expenseName.toLowerCase().includes(q);
          const matchesCat = item.categoryName.toLowerCase().includes(q);
          const matchesNotes = (item.description || "").toLowerCase().includes(q);
          const matchesUser = item.createdBy.toLowerCase().includes(q);
          if (!matchesName && !matchesCat && !matchesNotes && !matchesUser) return false;
        }

        // Category Filter
        if (selectedCategory !== "ALL" && item.categoryId !== selectedCategory) {
          return false;
        }

        // Date Filter
        if (dateFilter === "TODAY") {
          if (item.expenseDate !== todayStr) return false;
        } else if (dateFilter === "THIS_WEEK") {
          const now = new Date();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          const weekStartStr = startOfWeek.toISOString().slice(0, 10);
          if (item.expenseDate < weekStartStr) return false;
        } else if (dateFilter === "THIS_MONTH") {
          if (item.expenseDate < monthStartStr) return false;
        } else if (dateFilter === "CUSTOM") {
          if (customFromDate && item.expenseDate < customFromDate) return false;
          if (customToDate && item.expenseDate > customToDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "NEWEST") {
          return new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime();
        }
        if (sortOption === "OLDEST") {
          return new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime();
        }
        if (sortOption === "HIGHEST") {
          return b.amount - a.amount;
        }
        if (sortOption === "LOWEST") {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [
    expenses,
    searchText,
    selectedCategory,
    dateFilter,
    customFromDate,
    customToDate,
    sortOption,
    todayStr,
    monthStartStr,
  ]);

  const visibleExpenses = useMemo(() => {
    return filteredExpenses.slice(0, visibleCount);
  }, [filteredExpenses, visibleCount]);

  // Report Metrics for filtered view
  const filteredMetrics = useMemo(() => {
    const total = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    const count = filteredExpenses.length;
    const avg = count > 0 ? total / count : 0;
    let periodLabel = "All Time";
    if (dateFilter === "TODAY") periodLabel = "Today";
    else if (dateFilter === "THIS_WEEK") periodLabel = "This Week";
    else if (dateFilter === "THIS_MONTH") periodLabel = "This Month";
    else if (dateFilter === "CUSTOM") periodLabel = `${customFromDate || "Start"} to ${customToDate || "End"}`;

    return {
      totalExpenses: total,
      totalEntries: count,
      averageExpense: avg,
      periodLabel,
    };
  }, [filteredExpenses, dateFilter, customFromDate, customToDate]);

  // Modal Action Handlers
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormName("");
    setFormCategoryId(expenseCategories[0]?.id || "fuel");
    setFormAmount("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormPaymentMethod("Cash");
    setFormDescription("");
    setFormReceiptUrl("");
    setFormErrors({});
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormName(expense.expenseName);
    setFormCategoryId(expense.categoryId);
    setFormAmount(String(expense.amount));
    setFormDate(expense.expenseDate);
    setFormPaymentMethod(expense.paymentMethod);
    setFormDescription(expense.description || "");
    setFormReceiptUrl(expense.receiptUrl || "");
    setFormErrors({});
    setShowAddEditModal(true);
  };

  const handleSaveExpense = async () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = "Expense title is required.";
    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) errors.amount = "Enter a valid amount greater than 0.";
    if (!formDate) errors.date = "Expense date is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = expenseCategories.find((c) => c.id === formCategoryId);
      const categoryName = selectedCat ? selectedCat.name : "Miscellaneous";
      const createdBy = user?.name || user?.email || "Admin";

      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          expenseName: formName.trim(),
          categoryId: formCategoryId,
          categoryName,
          amount: parsedAmount,
          expenseDate: formDate,
          paymentMethod: formPaymentMethod,
          description: formDescription.trim() || undefined,
          receiptUrl: formReceiptUrl.trim() || undefined,
        });
        showToast("Expense updated successfully!");
      } else {
        await addExpense({
          expenseName: formName.trim(),
          categoryId: formCategoryId,
          categoryName,
          amount: parsedAmount,
          expenseDate: formDate,
          paymentMethod: formPaymentMethod,
          description: formDescription.trim() || undefined,
          receiptUrl: formReceiptUrl.trim() || undefined,
          createdBy,
        });
        showToast("Expense added successfully!");
      }
      setShowAddEditModal(false);
    } catch (err: any) {
      showToast(`Failed to save expense: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpenseId) return;
    try {
      await deleteExpense(deletingExpenseId);
      showToast("Expense deleted successfully!");
    } catch (err: any) {
      showToast(`Could not delete expense: ${err.message}`);
    } finally {
      setShowDeleteModal(false);
      setDeletingExpenseId(null);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const created = await addExpenseCategory(newCategoryName.trim());
      setFormCategoryId(created.id);
      setNewCategoryName("");
      setShowCategoryModal(false);
      showToast(`Category "${created.name}" created!`);
    } catch (err: any) {
      showToast(`Could not create category: ${err.message}`);
    }
  };

  const handleExport = async (type: "EXCEL" | "PDF") => {
    setShowExportMenu(false);
    if (filteredExpenses.length === 0) {
      showToast("No expense entries available to export.");
      return;
    }

    setIsExporting(true);
    try {
      if (type === "EXCEL") {
        await exportExpensesToExcel(filteredExpenses, filteredMetrics);
        showToast("Excel spreadsheet exported successfully!");
      } else if (type === "PDF") {
        await exportExpensesToPDF(filteredExpenses, filteredMetrics);
        showToast("PDF report generated successfully!");
      }
    } catch (err: any) {
      console.error("Export error:", err);
      showToast(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Banner Header */}
      <LinearGradient colors={[AppColors.navy, AppColors.navyLight]} style={styles.headerBanner}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Business Expenses</Text>
            <Text style={styles.headerSubtitle}>Accounting & Operational Expense Tracker</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExportMenu(!showExportMenu)}>
              <Download size={16} color={AppColors.white} />
              <Text style={styles.exportBtnText}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal}>
              <Plus size={18} color={AppColors.white} />
              <Text style={styles.addBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating Export Menu Dropdown */}
        {showExportMenu && (
          <View style={styles.exportMenuPopover}>
            <TouchableOpacity style={styles.exportMenuItem} onPress={() => handleExport("EXCEL")}>
              <FileSpreadsheet size={16} color={AppColors.accentGreen} />
              <Text style={styles.exportMenuText}>Export as Excel (.xlsx)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportMenuItem} onPress={() => handleExport("PDF")}>
              <Receipt size={16} color={AppColors.coral} />
              <Text style={styles.exportMenuText}>Export as PDF Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Metric Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Today's Expenses</Text>
            <Text style={styles.summaryValue}>{formatINR(summaryMetrics.todayTotal)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>{formatINR(summaryMetrics.monthTotal)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total This Year</Text>
            <Text style={styles.summaryValue}>{formatINR(summaryMetrics.yearTotal)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Entries</Text>
            <Text style={styles.summaryValue}>{summaryMetrics.totalEntries}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Container */}
      <View style={styles.container}>
        {/* Search Bar & Filters */}
        <View style={styles.filterSection}>
          <SearchInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by expense title, category, notes, or user..."
          />

          {/* Date Filter & Category Horizontal Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsContainer}>
            <TouchableOpacity
              style={[styles.pill, dateFilter === "ALL" && styles.activePill]}
              onPress={() => setDateFilter("ALL")}
            >
              <Text style={[styles.pillText, dateFilter === "ALL" && styles.activePillText]}>All Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, dateFilter === "TODAY" && styles.activePill]}
              onPress={() => setDateFilter("TODAY")}
            >
              <Text style={[styles.pillText, dateFilter === "TODAY" && styles.activePillText]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, dateFilter === "THIS_WEEK" && styles.activePill]}
              onPress={() => setDateFilter("THIS_WEEK")}
            >
              <Text style={[styles.pillText, dateFilter === "THIS_WEEK" && styles.activePillText]}>This Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, dateFilter === "THIS_MONTH" && styles.activePill]}
              onPress={() => setDateFilter("THIS_MONTH")}
            >
              <Text style={[styles.pillText, dateFilter === "THIS_MONTH" && styles.activePillText]}>This Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, dateFilter === "CUSTOM" && styles.activePill]}
              onPress={() => setDateFilter("CUSTOM")}
            >
              <Text style={[styles.pillText, dateFilter === "CUSTOM" && styles.activePillText]}>Custom Date</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Custom Date Inputs if CUSTOM filter selected */}
          {dateFilter === "CUSTOM" && (
            <View style={styles.customDateRow}>
              <View style={styles.dateInputCol}>
                <Text style={styles.inputMiniLabel}>From Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.miniTextInput}
                  value={customFromDate}
                  onChangeText={setCustomFromDate}
                  placeholder="2026-08-01"
                />
              </View>
              <View style={styles.dateInputCol}>
                <Text style={styles.inputMiniLabel}>To Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.miniTextInput}
                  value={customToDate}
                  onChangeText={setCustomToDate}
                  placeholder="2026-08-31"
                />
              </View>
            </View>
          )}

          {/* Category Filter & Sort Options Selector */}
          <View style={styles.controlsRow}>
            {/* Category Dropdown Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <TouchableOpacity
                style={[styles.catFilterBadge, selectedCategory === "ALL" && styles.activeCatFilterBadge]}
                onPress={() => setSelectedCategory("ALL")}
              >
                <Tag size={12} color={selectedCategory === "ALL" ? AppColors.white : AppColors.navy} />
                <Text style={[styles.catFilterText, selectedCategory === "ALL" && styles.activeCatFilterText]}>
                  All Categories
                </Text>
              </TouchableOpacity>

              {expenseCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catFilterBadge, selectedCategory === cat.id && styles.activeCatFilterBadge]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={[styles.catFilterText, selectedCategory === cat.id && styles.activeCatFilterText]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.manageCatBtn}
              onPress={() => setShowCategoryModal(true)}
            >
              <Plus size={14} color={AppColors.navy} />
              <Text style={styles.manageCatBtnText}>Category</Text>
            </TouchableOpacity>

            {/* Sort Toggle */}
            <TouchableOpacity
              style={styles.sortToggleBtn}
              onPress={() => {
                const options: SortOption[] = ["NEWEST", "OLDEST", "HIGHEST", "LOWEST"];
                const nextIdx = (options.indexOf(sortOption) + 1) % options.length;
                setSortOption(options[nextIdx]);
              }}
            >
              <ArrowDownUp size={14} color={AppColors.navy} />
              <Text style={styles.sortToggleText}>
                {sortOption === "NEWEST" && "Newest"}
                {sortOption === "OLDEST" && "Oldest"}
                {sortOption === "HIGHEST" && "Highest"}
                {sortOption === "LOWEST" && "Lowest"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List Results Count Header */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCountText}>
            Showing {visibleExpenses.length} of {filteredExpenses.length} entries
          </Text>

          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === "CARD" && styles.activeViewModeBtn]}
              onPress={() => setViewMode("CARD")}
            >
              <Text style={[styles.viewModeText, viewMode === "CARD" && styles.activeViewModeText]}>Cards</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === "TABLE" && styles.activeViewModeBtn]}
              onPress={() => setViewMode("TABLE")}
            >
              <Text style={[styles.viewModeText, viewMode === "TABLE" && styles.activeViewModeText]}>Table</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Expenses List */}
        <FlatList
          data={visibleExpenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Receipt size={48} color={AppColors.textMuted} />
              <Text style={styles.emptyTitle}>No Expenses Found</Text>
              <Text style={styles.emptySubtitle}>
                {expenses.length === 0
                  ? "No expenses have been recorded yet. Click '+ Add Expense' to get started."
                  : "No expense entries match your selected search or filters."}
              </Text>
              <TouchableOpacity style={styles.addBtnEmpty} onPress={handleOpenAddModal}>
                <Plus size={16} color={AppColors.white} />
                <Text style={styles.addBtnText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            if (viewMode === "TABLE") {
              return (
                <TouchableOpacity
                  style={styles.tableRow}
                  onPress={() => {
                    setViewingExpense(item);
                    setShowDetailModal(true);
                  }}
                >
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tableNameText} numberOfLines={1}>
                      {item.expenseName}
                    </Text>
                    <Text style={styles.tableSubText}>{item.categoryName}</Text>
                  </View>

                  <View style={{ flex: 1.5, alignItems: "center" }}>
                    <Text style={styles.tableDateText}>{item.expenseDate}</Text>
                    <Text style={styles.tableSubText}>{item.paymentMethod}</Text>
                  </View>

                  <View style={{ flex: 1.5, alignItems: "flex-end" }}>
                    <Text style={styles.tableAmountText}>{formatINR(item.amount)}</Text>
                  </View>

                  <View style={styles.tableActionGroup}>
                    <TouchableOpacity
                      style={styles.iconActionBtn}
                      onPress={() => handleOpenEditModal(item)}
                    >
                      <Edit size={14} color={AppColors.navy} />
                    </TouchableOpacity>
                    {user?.role === "admin" && (
                      <TouchableOpacity
                        style={styles.iconActionBtnDanger}
                        onPress={() => {
                          setDeletingExpenseId(item.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 size={14} color={AppColors.coral} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleCol}>
                    <Text style={styles.cardTitle}>{item.expenseName}</Text>
                    <View style={styles.badgeRow}>
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{item.categoryName}</Text>
                      </View>
                      <View style={styles.paymentBadge}>
                        <CreditCard size={11} color={AppColors.navy} />
                        <Text style={styles.paymentBadgeText}>{item.paymentMethod}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.cardAmount}>{formatINR(item.amount)}</Text>
                </View>

                {item.description ? (
                  <Text style={styles.cardNotes} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.metaRow}>
                    <CalendarIcon size={12} color={AppColors.textMuted} />
                    <Text style={styles.metaText}>{item.expenseDate}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <UserIcon size={12} color={AppColors.textMuted} />
                    <Text style={styles.metaText}>{item.createdBy}</Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionBtnOutline}
                      onPress={() => {
                        setViewingExpense(item);
                        setShowDetailModal(true);
                      }}
                    >
                      <Eye size={13} color={AppColors.navy} />
                      <Text style={styles.actionBtnText}>View</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtnOutline} onPress={() => handleOpenEditModal(item)}>
                      <Edit size={13} color={AppColors.navy} />
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>

                    {user?.role === "admin" && (
                      <TouchableOpacity
                        style={styles.actionBtnDanger}
                        onPress={() => {
                          setDeletingExpenseId(item.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 size={13} color={AppColors.coral} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          onEndReached={() => {
            if (visibleCount < filteredExpenses.length) {
              setVisibleCount((prev) => prev + 20);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      </View>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <CheckCircle size={18} color={AppColors.white} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Floating Add Expense Button */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAddModal}>
        <Plus size={24} color={AppColors.white} />
      </TouchableOpacity>

      {/* MODAL 1: Add / Edit Expense */}
      <Modal visible={showAddEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingExpense ? "Edit Expense" : "Add New Expense"}</Text>
              <TouchableOpacity onPress={() => setShowAddEditModal(false)}>
                <X size={20} color={AppColors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Expense Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Expense Name *</Text>
                <TextInput
                  style={[styles.formInput, !!formErrors.name && styles.inputError]}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g. Diesel for Delivery Truck #2"
                />
                {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
              </View>

              {/* Expense Category */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelWithAction}>
                  <Text style={styles.fieldLabel}>Expense Category *</Text>
                  <TouchableOpacity onPress={() => setShowCategoryModal(true)}>
                    <Text style={styles.actionText}>+ New Category</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelectScroll}>
                  {expenseCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catSelectChip, formCategoryId === cat.id && styles.activeCatSelectChip]}
                      onPress={() => setFormCategoryId(cat.id)}
                    >
                      <Text
                        style={[
                          styles.catSelectChipText,
                          formCategoryId === cat.id && styles.activeCatSelectChipText,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Amount & Date Row */}
              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.fieldLabel}>Amount (₹) *</Text>
                  <TextInput
                    style={[styles.formInput, !!formErrors.amount && styles.inputError]}
                    value={formAmount}
                    onChangeText={setFormAmount}
                    keyboardType="numeric"
                    placeholder="2500"
                  />
                  {formErrors.amount && <Text style={styles.errorText}>{formErrors.amount}</Text>}
                </View>

                <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.fieldLabel}>Expense Date *</Text>
                  <TextInput
                    style={[styles.formInput, !!formErrors.date && styles.inputError]}
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder="YYYY-MM-DD"
                  />
                  {formErrors.date && <Text style={styles.errorText}>{formErrors.date}</Text>}
                </View>
              </View>

              {/* Payment Method */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Payment Method *</Text>
                <View style={styles.paymentMethodRow}>
                  {PAYMENT_METHODS.map((pm) => (
                    <TouchableOpacity
                      key={pm}
                      style={[styles.pmChip, formPaymentMethod === pm && styles.activePmChip]}
                      onPress={() => setFormPaymentMethod(pm)}
                    >
                      <Text style={[styles.pmChipText, formPaymentMethod === pm && styles.activePmChipText]}>
                        {pm}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description / Notes */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description / Notes (Optional)</Text>
                <TextInput
                  style={[styles.formInput, { height: 72, textAlignVertical: "top" }]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                  placeholder="Enter details, invoice reference, or payment remarks..."
                />
              </View>

              {/* Upload Invoice / Receipt Section */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Upload Invoice / Receipt Document</Text>
                
                {isUploadingReceipt ? (
                  <View style={styles.uploadingBox}>
                    <ActivityIndicator size="small" color={AppColors.navy} />
                    <Text style={styles.uploadingText}>Uploading invoice to Cloud Storage...</Text>
                  </View>
                ) : formReceiptUrl ? (
                  <View style={styles.receiptPreviewBox}>
                    {formReceiptUrl.startsWith("data:image") || formReceiptUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || formReceiptUrl.includes("firebasestorage") ? (
                      <Image source={{ uri: formReceiptUrl }} style={styles.receiptPreviewThumb} resizeMode="cover" />
                    ) : (
                      <View style={styles.pdfIconBadge}>
                        <Paperclip size={24} color={AppColors.navy} />
                        <Text style={styles.pdfBadgeText}>Document Attached</Text>
                      </View>
                    )}
                    
                    <View style={styles.receiptMetaCol}>
                      <Text style={styles.receiptSuccessText} numberOfLines={1}>
                        Invoice Attached Successfully
                      </Text>
                      <TouchableOpacity
                        style={styles.removeReceiptBtn}
                        onPress={() => setFormReceiptUrl("")}
                      >
                        <Trash size={12} color={AppColors.coral} />
                        <Text style={styles.removeReceiptText}>Remove Invoice</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadTriggerContainer}>
                    <TouchableOpacity
                      style={styles.nativeUploadBtn}
                      onPress={handlePickAndUploadInvoice}
                    >
                      <UploadCloud size={20} color={AppColors.white} />
                      <Text style={styles.nativeUploadBtnText}>Upload Invoice (Photo / PDF)</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddEditModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveExpense} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color={AppColors.white} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>{editingExpense ? "Update Expense" : "Save Expense"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: View Expense Details */}
      <Modal visible={showDetailModal && !!viewingExpense} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Expense Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={20} color={AppColors.textDark} />
              </TouchableOpacity>
            </View>

            {viewingExpense && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailCardBanner}>
                  <Text style={styles.detailName}>{viewingExpense.expenseName}</Text>
                  <Text style={styles.detailAmount}>{formatINR(viewingExpense.amount)}</Text>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailVal}>{viewingExpense.categoryName}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Expense Date</Text>
                    <Text style={styles.detailVal}>{viewingExpense.expenseDate}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Payment Method</Text>
                    <Text style={styles.detailVal}>{viewingExpense.paymentMethod}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Added By</Text>
                    <Text style={styles.detailVal}>{viewingExpense.createdBy}</Text>
                  </View>
                </View>

                {viewingExpense.description ? (
                  <View style={styles.detailNotesSection}>
                    <Text style={styles.detailLabel}>Description / Notes</Text>
                    <Text style={styles.detailNotesText}>{viewingExpense.description}</Text>
                  </View>
                ) : null}

                {viewingExpense.receiptUrl ? (
                  <View style={styles.receiptPreviewSection}>
                    <Text style={styles.detailLabel}>Receipt Preview</Text>
                    <Image
                      source={{ uri: viewingExpense.receiptUrl }}
                      style={styles.receiptImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDetailModal(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>

              {viewingExpense && (
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => {
                    setShowDetailModal(false);
                    handleOpenEditModal(viewingExpense);
                  }}
                >
                  <Text style={styles.submitBtnText}>Edit Expense</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Manage / Add Custom Category */}
      <Modal visible={showCategoryModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 420 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={20} color={AppColors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Category Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="e.g. Legal Fees, Marketing, Insurance"
                />
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Existing Categories ({expenseCategories.length}):</Text>
              <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 6 }}>
                  {expenseCategories.map((c) => (
                    <View key={c.id} style={styles.catChipReadOnly}>
                      <Text style={styles.catChipReadOnlyText}>{c.name}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddCategory}>
                <Text style={styles.submitBtnText}>Create Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Delete Confirmation */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: 340 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Expense</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <X size={20} color={AppColors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.deleteConfirmText}>
                Are you sure you want to delete this expense record? This action cannot be undone.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={handleDeleteExpense}>
                <Text style={styles.deleteConfirmBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  headerBanner: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: AppColors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#93c5fd",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${AppColors.white}20`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: `${AppColors.white}30`,
  },
  exportBtnText: {
    color: AppColors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AppColors.accentSky,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  addBtnText: {
    color: AppColors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  exportMenuPopover: {
    position: "absolute",
    top: 50,
    right: 16,
    backgroundColor: AppColors.white,
    borderRadius: Radius.md,
    paddingVertical: 6,
    zIndex: 99,
    width: 210,
    ...Shadow.card,
  },
  exportMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  exportMenuText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.textDark,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: "23%",
    backgroundColor: `${AppColors.white}15`,
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: `${AppColors.white}20`,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#bfdbfe",
    textTransform: "uppercase",
    fontWeight: "700",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "800",
    color: AppColors.white,
    marginTop: 4,
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  filterSection: {
    marginBottom: 10,
    gap: 8,
  },
  pillsContainer: {
    flexDirection: "row",
    marginVertical: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginRight: 6,
  },
  activePill: {
    backgroundColor: AppColors.navy,
    borderColor: AppColors.navy,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.textMuted,
  },
  activePillText: {
    color: AppColors.white,
  },
  customDateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  dateInputCol: {
    flex: 1,
  },
  inputMiniLabel: {
    fontSize: 10,
    color: AppColors.textMuted,
    marginBottom: 2,
    fontWeight: "600",
  },
  miniTextInput: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: AppColors.textDark,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  catFilterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  activeCatFilterBadge: {
    backgroundColor: AppColors.navy,
    borderColor: AppColors.navy,
  },
  catFilterText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.navy,
  },
  activeCatFilterText: {
    color: AppColors.white,
  },
  manageCatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${AppColors.navy}10`,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  manageCatBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: AppColors.navy,
  },
  sortToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.navy,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  resultsCountText: {
    fontSize: 12,
    color: AppColors.textMuted,
    fontWeight: "600",
  },
  viewModeToggle: {
    flexDirection: "row",
    backgroundColor: AppColors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  viewModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeViewModeBtn: {
    backgroundColor: AppColors.navy,
    borderRadius: Radius.sm - 1,
  },
  viewModeText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.textMuted,
  },
  activeViewModeText: {
    color: AppColors.white,
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppColors.border,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.textDark,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  catBadge: {
    backgroundColor: `${AppColors.navy}10`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: AppColors.navy,
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: AppColors.textDark,
  },
  cardAmount: {
    fontSize: 17,
    fontWeight: "800",
    color: AppColors.navy,
  },
  cardNotes: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginTop: 8,
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: AppColors.textMuted,
  },
  metaDot: {
    color: AppColors.textMuted,
    fontSize: 10,
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: AppColors.surface,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.navy,
  },
  actionBtnDanger: {
    borderWidth: 1,
    borderColor: `${AppColors.coral}40`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: `${AppColors.coral}10`,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.surface,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  tableNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.textDark,
  },
  tableSubText: {
    fontSize: 10,
    color: AppColors.textMuted,
  },
  tableDateText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.textDark,
  },
  tableAmountText: {
    fontSize: 14,
    fontWeight: "800",
    color: AppColors.navy,
  },
  tableActionGroup: {
    flexDirection: "row",
    gap: 4,
    marginLeft: 8,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: "#f1f5f9",
  },
  iconActionBtnDanger: {
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: `${AppColors.coral}15`,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.textDark,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: AppColors.textMuted,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  addBtnEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AppColors.navy,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    marginTop: 16,
  },
  toastContainer: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: AppColors.navy,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 999,
    ...Shadow.card,
  },
  toastText: {
    color: AppColors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 95,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.navy,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.card,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    backgroundColor: AppColors.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.card,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: AppColors.textDark,
  },
  modalBody: {
    padding: 18,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldRow: {
    flexDirection: "row",
  },
  labelWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: AppColors.textDark,
    marginBottom: 6,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "700",
    color: AppColors.navy,
  },
  formInput: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: AppColors.textDark,
  },
  inputError: {
    borderColor: AppColors.coral,
  },
  errorText: {
    fontSize: 10,
    color: AppColors.coral,
    marginTop: 4,
    fontWeight: "600",
  },
  categorySelectScroll: {
    flexDirection: "row",
  },
  catSelectChip: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginRight: 6,
  },
  activeCatSelectChip: {
    backgroundColor: AppColors.navy,
    borderColor: AppColors.navy,
  },
  catSelectChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.textDark,
  },
  activeCatSelectChipText: {
    color: AppColors.white,
  },
  paymentMethodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pmChip: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  activePmChip: {
    backgroundColor: AppColors.navy,
    borderColor: AppColors.navy,
  },
  pmChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.textDark,
  },
  activePmChipText: {
    color: AppColors.white,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    backgroundColor: "#f8fafc",
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.white,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.textDark,
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: AppColors.navy,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.white,
  },
  deleteConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: AppColors.coral,
  },
  deleteConfirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.white,
  },
  detailCardBanner: {
    backgroundColor: `${AppColors.navy}10`,
    padding: 16,
    borderRadius: Radius.md,
    marginBottom: 16,
    alignItems: "center",
  },
  detailName: {
    fontSize: 18,
    fontWeight: "800",
    color: AppColors.textDark,
    textAlign: "center",
  },
  detailAmount: {
    fontSize: 24,
    fontWeight: "900",
    color: AppColors.navy,
    marginTop: 4,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    width: "47%",
    backgroundColor: AppColors.surface,
    padding: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  detailLabel: {
    fontSize: 10,
    color: AppColors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailVal: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.textDark,
    marginTop: 2,
  },
  detailNotesSection: {
    backgroundColor: AppColors.surface,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: 16,
  },
  detailNotesText: {
    fontSize: 12,
    color: AppColors.textDark,
    marginTop: 4,
  },
  receiptPreviewSection: {
    marginBottom: 16,
  },
  receiptImage: {
    width: "100%",
    height: 180,
    borderRadius: Radius.md,
    marginTop: 6,
    backgroundColor: "#000",
  },
  catChipReadOnly: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  catChipReadOnlyText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.textDark,
  },
  deleteConfirmText: {
    fontSize: 13,
    color: AppColors.textDark,
    lineHeight: 18,
  },
  uploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${AppColors.navy}10`,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${AppColors.navy}20`,
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.navy,
  },
  receiptPreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: AppColors.surface,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  receiptPreviewThumb: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
    backgroundColor: "#000",
  },
  pdfIconBadge: {
    width: 50,
    height: 50,
    borderRadius: Radius.sm,
    backgroundColor: `${AppColors.navy}10`,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: AppColors.navy,
    textAlign: "center",
  },
  receiptMetaCol: {
    flex: 1,
  },
  receiptSuccessText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppColors.textDark,
  },
  removeReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  removeReceiptText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.coral,
  },
  uploadTriggerContainer: {
    width: "100%",
  },
  webUploadLabel: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AppColors.navy,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    cursor: "pointer",
  },
  webUploadLabelText: {
    color: AppColors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  nativeUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AppColors.navy,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
  },
  nativeUploadBtnText: {
    color: AppColors.white,
    fontSize: 13,
    fontWeight: "700",
  },
});
