import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius, Typography, CategoryColors, CategoryBackgrounds, RainbowButtonColors } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import type { Expense, FamilyMember } from "@shared/types";
import { ScrollableHeader } from "@/components/ScrollableHeader";
import { MemberAvatar } from "@/components/MemberAvatar";

const EXPENSE_CATEGORIES = ["home", "groceries", "school", "transport", "leisure", "other"] as const;
type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  home: "#FF6B6B",
  groceries: "#4ECDC4",
  school: "#45B7D1",
  transport: "#96CEB4",
  leisure: "#FFEAA7",
  other: "#A29BFE",
};

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useI18n();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<ExpenseCategory>("other");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<ExpenseCategory>("other");
  const [editDate, setEditDate] = useState("");

  const colors = isDark ? Colors.dark : Colors.light;
  const screenWidth = Dimensions.get("window").width;

  const currentMonth = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    };
  }, []);

  const { data: members } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family/members"],
    enabled: isAuthenticated,
  });

  const getMemberName = useCallback((userId: string | null | undefined) => {
    if (!userId) return "-";
    if (user && userId === user.id) return t.family.you;
    const member = members?.find((m) => m.id === userId);
    return member?.displayName || member?.username || "-";
  }, [members, user, t]);

  const getMember = useCallback((userId: string | null | undefined) => {
    if (!userId) return null;
    return members?.find((m) => m.id === userId) || null;
  }, [members]);

  const {
    data: expenses,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", { from: currentMonth.from, to: currentMonth.to }],
    enabled: isAuthenticated,
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: { amount: number; description: string; category: string; date: string }) => {
      return apiRequest("POST", "/api/expenses", {
        ...data,
        paidBy: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      resetForm();
      setShowAddModal(false);
    },
    onError: (error: Error) => {
      Alert.alert(t.common.error, error.message);
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error: Error) => {
      Alert.alert(t.common.error, error.message);
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, amount, description, category, date }: { id: string; amount: number; description: string; category: string; date: string }) => {
      return apiRequest("PUT", `/api/expenses/${id}`, { amount, description, category, date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setSelectedExpense(null);
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Alert.alert(t.common.error, error.message);
    },
  });

  const resetForm = () => {
    setNewAmount("");
    setNewDescription("");
    setNewCategory("other");
    setNewDate(new Date().toISOString().split("T")[0]);
  };

  const handleAddExpense = () => {
    const amount = parseFloat(newAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t.common.error, t.budget.amountPositive);
      return;
    }
    if (!newDescription.trim()) {
      Alert.alert(t.common.error, t.budget.descriptionRequired);
      return;
    }
    createExpenseMutation.mutate({
      amount,
      description: newDescription.trim(),
      category: newCategory,
      date: new Date(newDate).toISOString(),
    });
  };

  const handleDeleteExpense = (id: string) => {
    Alert.alert(
      t.budget.deleteExpense,
      t.budget.deleteConfirm,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete,
          style: "destructive",
          onPress: () => deleteExpenseMutation.mutate(id),
        },
      ]
    );
  };

  const monthlyTotal = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const categoryBreakdown = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || "other";
      totals[cat] = (totals[cat] || 0) + e.amount;
    });
    return Object.entries(totals)
      .map(([category, amount]) => ({
        category: category as ExpenseCategory,
        amount,
        percentage: monthlyTotal > 0 ? (amount / monthlyTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, monthlyTotal]);

  const recentExpenses = useMemo(() => {
    if (!expenses) return [];
    return [...expenses].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, 10);
  }, [expenses]);

  const getCategoryLabel = (cat: string) => {
    const key = cat as keyof typeof t.budget.categories;
    return t.budget.categories[key] || t.budget.categories.other;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === "it" ? "it-IT" : "en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "it" ? "it-IT" : "en-US", {
      day: "numeric",
      month: "short",
    });
  };

  const canDelete = user?.role === "admin" || user?.role === "member";

  const handleOpenExpenseModal = useCallback((expense: Expense) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedExpense(expense);
    setEditAmount(String(expense.amount));
    setEditDescription(expense.description);
    setEditCategory((expense.category as ExpenseCategory) || "other");
    setEditDate(new Date(expense.date).toISOString().split("T")[0]);
    setIsEditing(false);
  }, []);

  const handleCloseExpenseModal = useCallback(() => {
    setSelectedExpense(null);
    setIsEditing(false);
  }, []);

  const handleSaveExpense = useCallback(() => {
    if (!selectedExpense) return;
    const amount = parseFloat(editAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t.common.error, t.budget.amountPositive);
      return;
    }
    if (!editDescription.trim()) {
      Alert.alert(t.common.error, t.budget.descriptionRequired);
      return;
    }
    updateExpenseMutation.mutate({
      id: selectedExpense.id,
      amount,
      description: editDescription.trim(),
      category: editCategory,
      date: new Date(editDate).toISOString(),
    });
  }, [selectedExpense, editAmount, editDescription, editCategory, editDate, updateExpenseMutation, t]);

  const handleDeleteFromModal = useCallback(() => {
    if (!selectedExpense) return;
    handleDeleteExpense(selectedExpense.id);
    setSelectedExpense(null);
  }, [selectedExpense, handleDeleteExpense]);

  const renderExpenseItem = useCallback(({ item }: { item: Expense }) => {
    const tapGesture = Gesture.Tap()
      .onEnd(() => {
        scheduleOnRN(handleOpenExpenseModal, item);
      });

    const panGesture = Gesture.Pan()
      .activeOffsetX(-50)
      .onEnd((event) => {
        if (event.translationX < -100 && canDelete) {
          scheduleOnRN(handleDeleteExpense, item.id);
        }
      });

    const composedGestures = Gesture.Race(tapGesture, panGesture);

    return (
      <GestureDetector gesture={composedGestures}>
        <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
          <Card style={styles.expenseItem}>
            <View style={styles.expenseLeft}>
              <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[item.category as ExpenseCategory] || CATEGORY_COLORS.other }]} />
              <View style={styles.expenseInfo}>
                <ThemedText style={styles.expenseDescription}>{item.description}</ThemedText>
                <View style={styles.expenseMetaRow}>
                  <ThemedText style={[styles.expenseSubtext, { color: colors.textSecondary }]}>
                    {getCategoryLabel(item.category || "other")}
                  </ThemedText>
                  <ThemedText style={[styles.expenseSubtext, { color: colors.textSecondary }]}> • </ThemedText>
                  <MemberAvatar 
                    avatarUrl={getMember(item.paidBy)?.avatarUrl}
                    displayName={getMember(item.paidBy)?.displayName}
                    username={getMember(item.paidBy)?.username}
                    size={14}
                    showName={true}
                    color={colors.textSecondary}
                  />
                </View>
              </View>
            </View>
            <View style={styles.expenseRight}>
              <ThemedText style={[styles.expenseAmount, { color: colors.error }]}>
                -{formatCurrency(item.amount)}
              </ThemedText>
              <ThemedText style={[styles.expenseDate, { color: colors.textSecondary }]}>
                {formatDate(item.date)}
              </ThemedText>
            </View>
          </Card>
        </Animated.View>
      </GestureDetector>
    );
  }, [colors, canDelete, t, language, members, handleOpenExpenseModal]);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={CategoryColors.budget} />
      </ThemedView>
    );
  }

  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleDateString(
    language === "it" ? "it-IT" : "en-US",
    { month: "long", year: "numeric" }
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? CategoryBackgrounds.dark.budget : CategoryBackgrounds.light.budget }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.md,
          paddingBottom: tabBarHeight + Spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScrollableHeader />
        <View style={{ paddingHorizontal: Spacing.screenPadding }}>
        <Card style={styles.summaryCard}>
          <ThemedText style={[styles.monthLabel, { color: colors.textSecondary }]}>
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
          </ThemedText>
          <ThemedText style={[styles.totalAmount, { color: colors.text }]}>
            {formatCurrency(monthlyTotal)}
          </ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            {t.budget.monthlySpent}
          </ThemedText>
        </Card>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t.budget.breakdown}</ThemedText>
          {categoryBreakdown.length > 0 ? (
            <Card style={styles.breakdownCard}>
              {categoryBreakdown.map((item, index) => (
                <View key={item.category} style={[styles.breakdownItem, index > 0 && styles.breakdownItemBorder]}>
                  <View style={styles.breakdownHeader}>
                    <View style={styles.breakdownLeft}>
                      <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[item.category] }]} />
                      <ThemedText style={styles.breakdownLabel}>
                        {getCategoryLabel(item.category)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.breakdownAmount}>
                      {formatCurrency(item.amount)}
                    </ThemedText>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: colors.backgroundTertiary }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: CATEGORY_COLORS[item.category],
                          width: `${Math.min(item.percentage, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={[styles.breakdownPercentage, { color: colors.textSecondary }]}>
                    {item.percentage.toFixed(1)}%
                  </ThemedText>
                </View>
              ))}
            </Card>
          ) : (
            <Card style={styles.emptyCard}>
              <ThemedText style={{ color: colors.textSecondary }}>{t.budget.noData}</ThemedText>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t.budget.recentExpenses}</ThemedText>
          {recentExpenses.length > 0 ? (
            recentExpenses.map((expense) => (
              <React.Fragment key={expense.id}>
                {renderExpenseItem({ item: expense })}
              </React.Fragment>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Feather name="inbox" size={32} color={colors.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t.budget.noExpenses}
              </ThemedText>
            </Card>
          )}
        </View>
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: CategoryColors.budget }]}
        onPress={() => setShowAddModal(true)}
        accessibilityLabel={t.budget.addExpense}
        accessibilityRole="button"
      >
        <Feather name="plus" size={24} color={colors.buttonText} />
      </Pressable>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{t.budget.addExpense}</ThemedText>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>{t.budget.amount}</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                value={newAmount}
                onChangeText={setNewAmount}
                placeholder={t.budget.amountPlaceholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>{t.budget.description}</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder={t.budget.descriptionPlaceholder}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>{t.budget.category}</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: newCategory === cat ? CATEGORY_COLORS[cat] : colors.backgroundSecondary,
                        borderColor: CATEGORY_COLORS[cat],
                      },
                    ]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <ThemedText
                      style={[
                        styles.categoryChipText,
                        { color: newCategory === cat ? colors.buttonText : colors.text },
                      ]}
                    >
                      {getCategoryLabel(cat)}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>{t.budget.date}</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                value={newDate}
                onChangeText={setNewDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <Pressable
              style={[styles.submitButton, { backgroundColor: CategoryColors.budget }]}
              onPress={handleAddExpense}
              disabled={createExpenseMutation.isPending}
            >
              {createExpenseMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <ThemedText style={[styles.submitButtonText, { color: colors.buttonText }]}>{t.common.save}</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedExpense !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseExpenseModal}
      >
        <View style={styles.expenseModalOverlay}>
          <View style={[styles.expenseModalContent, { backgroundColor: colors.backgroundDefault }]}>
            <View style={styles.expenseModalHeader}>
              <ThemedText style={styles.expenseModalTitle}>
                {isEditing ? "Modifica spesa" : "Dettagli spesa"}
              </ThemedText>
              <Pressable onPress={handleCloseExpenseModal}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>

            {selectedExpense ? (
              isEditing ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Importo</ThemedText>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={editAmount}
                      onChangeText={setEditAmount}
                      placeholder={t.budget.amountPlaceholder}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>{t.budget.description}</ThemedText>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      placeholder={t.budget.descriptionPlaceholder}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Categoria</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: editCategory === cat ? CATEGORY_COLORS[cat] : colors.backgroundSecondary,
                              borderColor: CATEGORY_COLORS[cat],
                            },
                          ]}
                          onPress={() => setEditCategory(cat)}
                        >
                          <ThemedText
                            style={[
                              styles.categoryChipText,
                              { color: editCategory === cat ? colors.buttonText : colors.text },
                            ]}
                          >
                            {getCategoryLabel(cat)}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Data</ThemedText>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={editDate}
                      onChangeText={setEditDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.expenseModalButtons}>
                    <Pressable
                      style={[styles.modalButton, { backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => setIsEditing(false)}
                    >
                      <ThemedText style={{ color: colors.text }}>{t.common.cancel}</ThemedText>
                    </Pressable>
                    <Pressable
                      style={[styles.modalButton, { backgroundColor: CategoryColors.budget }]}
                      onPress={handleSaveExpense}
                      disabled={updateExpenseMutation.isPending}
                    >
                      {updateExpenseMutation.isPending ? (
                        <ActivityIndicator size="small" color={colors.buttonText} />
                      ) : (
                        <ThemedText style={{ color: colors.buttonText }}>{t.common.save}</ThemedText>
                      )}
                    </Pressable>
                  </View>
                </ScrollView>
              ) : (
                <View>
                  <View style={styles.expenseDetailRow}>
                    <ThemedText style={[styles.expenseDetailLabel, { color: colors.textSecondary }]}>
                      {t.budget.description}
                    </ThemedText>
                    <ThemedText style={styles.expenseDetailValue}>
                      {selectedExpense.description}
                    </ThemedText>
                  </View>

                  <View style={styles.expenseDetailRow}>
                    <ThemedText style={[styles.expenseDetailLabel, { color: colors.textSecondary }]}>
                      Importo
                    </ThemedText>
                    <ThemedText style={[styles.expenseDetailValue, { color: colors.error }]}>
                      -{formatCurrency(selectedExpense.amount)}
                    </ThemedText>
                  </View>

                  <View style={styles.expenseDetailRow}>
                    <ThemedText style={[styles.expenseDetailLabel, { color: colors.textSecondary }]}>
                      Categoria
                    </ThemedText>
                    <View style={styles.expenseDetailCategoryRow}>
                      <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[selectedExpense.category as ExpenseCategory] || CATEGORY_COLORS.other }]} />
                      <ThemedText style={styles.expenseDetailValue}>
                        {getCategoryLabel(selectedExpense.category || "other")}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.expenseDetailRow}>
                    <ThemedText style={[styles.expenseDetailLabel, { color: colors.textSecondary }]}>
                      Data
                    </ThemedText>
                    <ThemedText style={styles.expenseDetailValue}>
                      {formatDate(selectedExpense.date)}
                    </ThemedText>
                  </View>

                  <View style={styles.expenseDetailRow}>
                    <ThemedText style={[styles.expenseDetailLabel, { color: colors.textSecondary }]}>
                      Pagato da
                    </ThemedText>
                    <MemberAvatar 
                      avatarUrl={getMember(selectedExpense.paidBy)?.avatarUrl}
                      displayName={getMember(selectedExpense.paidBy)?.displayName}
                      username={getMember(selectedExpense.paidBy)?.username}
                      size={20}
                      showName={true}
                      color={colors.text}
                    />
                  </View>

                  <View style={styles.expenseModalButtons}>
                    <Pressable
                      style={[styles.modalButton, { backgroundColor: CategoryColors.budget }]}
                      onPress={() => setIsEditing(true)}
                    >
                      <Feather name="edit-2" size={16} color={colors.buttonText} style={{ marginRight: Spacing.xs }} />
                      <ThemedText style={{ color: colors.buttonText }}>{t.common.edit}</ThemedText>
                    </Pressable>
                    {canDelete ? (
                      <Pressable
                        style={[styles.modalButton, { backgroundColor: colors.error }]}
                        onPress={handleDeleteFromModal}
                      >
                        <Feather name="trash-2" size={16} color={colors.buttonText} style={{ marginRight: Spacing.xs }} />
                        <ThemedText style={{ color: colors.buttonText }}>{t.common.delete}</ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              )
            ) : null}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  monthLabel: {
    ...Typography.caption,
    textTransform: "capitalize",
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: "700",
    marginVertical: Spacing.sm,
  },
  summaryLabel: {
    ...Typography.small,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.subtitle,
    marginBottom: Spacing.md,
  },
  breakdownCard: {
    padding: Spacing.md,
  },
  breakdownItem: {
    paddingVertical: Spacing.sm,
  },
  breakdownItemBorder: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  breakdownLabel: {
    ...Typography.body,
  },
  breakdownAmount: {
    ...Typography.body,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  breakdownPercentage: {
    ...Typography.small,
    marginTop: Spacing.xs,
    textAlign: "right",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...Typography.body,
    marginTop: Spacing.sm,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  expenseLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    ...Typography.body,
    fontWeight: "500",
  },
  expenseSubtext: {
    ...Typography.small,
    marginTop: 2,
  },
  expenseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  expenseRight: {
    alignItems: "flex-end",
  },
  expenseAmount: {
    ...Typography.body,
    fontWeight: "600",
  },
  expenseDate: {
    ...Typography.small,
    marginTop: 2,
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5DED4",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.subtitle,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  categoryScroll: {
    flexDirection: "row",
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    borderWidth: 1,
  },
  categoryChipText: {
    ...Typography.caption,
    fontWeight: "500",
  },
  submitButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  expenseModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  expenseModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  expenseModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  expenseModalTitle: {
    ...Typography.subtitle,
    fontWeight: "600",
  },
  expenseDetailRow: {
    marginBottom: Spacing.lg,
  },
  expenseDetailLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  expenseDetailValue: {
    fontSize: 18,
    fontWeight: "500",
  },
  expenseDetailCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  expenseModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
});
