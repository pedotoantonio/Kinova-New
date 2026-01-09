import React, { useLayoutEffect } from "react";
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight, HeaderButton } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { WeatherWidget } from "@/components/WeatherWidget";
import type { Event, Task, ShoppingItem, Expense } from "@shared/types";

interface Family {
  id: string;
  name: string;
  city?: string | null;
  cityLat?: string | null;
  cityLon?: string | null;
  createdAt: string;
}

function formatEventTime(event: Event): string {
  if (event.allDay) {
    return "";
  }
  const start = new Date(event.startDate);
  return start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isEventOnToday(event: Event): boolean {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : start;
  
  if (event.allDay) {
    const eventDayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const eventDayEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return todayStart >= eventDayStart && todayStart < eventDayEnd;
  }
  
  return start <= todayEnd && end >= todayStart;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useI18n();
  const navigation = useNavigation();

  const colors = isDark ? Colors.dark : Colors.light;

  const queryClient = useQueryClient();

  const { data: family, isLoading: familyLoading } = useQuery<Family>({
    queryKey: ["/api/family"],
    enabled: isAuthenticated,
  });

  const { data: unreadCount = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/count"],
    enabled: isAuthenticated,
  });

  const navigateToNotifications = () => {
    (navigation as any).navigate("Notifications");
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <HeaderButton onPress={navigateToNotifications}>
            <View>
              <Feather name="bell" size={22} color={colors.text} />
              {unreadCount.count > 0 ? (
                <View style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  backgroundColor: colors.error,
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: "center",
                  alignItems: "center",
                }}>
                  <ThemedText style={{ color: colors.buttonText, fontSize: 10, fontWeight: "700" }}>
                    {unreadCount.count > 9 ? "9+" : unreadCount.count}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </HeaderButton>
          <HeaderButton onPress={navigateToProfile}>
            <Feather name="user" size={22} color={colors.text} />
          </HeaderButton>
        </View>
      ),
    });
  }, [navigation, colors.text, colors.error, colors.buttonText, unreadCount.count]);

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const { data: todayEvents } = useQuery<Event[]>({
    queryKey: ["/api/events", { from: todayStart.toISOString(), to: todayEnd.toISOString() }],
    enabled: isAuthenticated,
  });

  const { data: shoppingItems } = useQuery<ShoppingItem[]>({
    queryKey: ["/api/shopping"],
    enabled: isAuthenticated,
  });

  const { data: tasksData } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  const currentMonth = React.useMemo(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    };
  }, []);

  const { data: monthlyExpenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", { from: currentMonth.from, to: currentMonth.to }],
    enabled: isAuthenticated,
  });

  const monthlyTotal = React.useMemo(() => {
    if (!monthlyExpenses) return 0;
    return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  const pendingShoppingItems = React.useMemo(() => {
    if (!shoppingItems) return [];
    return shoppingItems.filter((i) => !i.purchased).slice(0, 5);
  }, [shoppingItems]);

  const pendingTasks = React.useMemo(() => {
    if (!tasksData) return [];
    return tasksData.filter((t) => !t.completed).slice(0, 5);
  }, [tasksData]);

  const overdueTasks = React.useMemo(() => {
    if (!tasksData) return [];
    const now = new Date();
    return tasksData.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) < now);
  }, [tasksData]);

  const filteredTodayEvents = React.useMemo(() => {
    if (!todayEvents) return [];
    return todayEvents
      .filter(isEventOnToday)
      .sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      })
      .slice(0, 3);
  }, [todayEvents]);

  const navigateToCalendar = () => {
    (navigation as any).navigate("CalendarTab");
  };

  const navigateToLists = (tab?: "shopping" | "tasks") => {
    (navigation as any).navigate("ListsTab");
  };

  const navigateToProfile = () => {
    (navigation as any).navigate("ProfileTab");
  };

  const navigateToBudget = () => {
    (navigation as any).navigate("BudgetTab");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === "it" ? "it-IT" : "en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <ThemedText style={[styles.welcomeText, { color: colors.textSecondary }]}>
        {t.home.welcomeTo}
      </ThemedText>
      <ThemedText style={[styles.familyName, { color: colors.text }]}>
        {family?.name || t.home.yourFamily}
      </ThemedText>

      <WeatherWidget
        city={family?.city}
        cityLat={family?.cityLat ? parseFloat(family.cityLat) : null}
        cityLon={family?.cityLon ? parseFloat(family.cityLon) : null}
        onSetCity={navigateToProfile}
      />

      <View style={styles.todaySection}>
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            {t.home.todayEvents}
          </ThemedText>
          <Pressable onPress={navigateToCalendar} hitSlop={8}>
            <ThemedText style={[styles.viewAllLink, { color: colors.primary }]}>
              {t.home.viewCalendar}
            </ThemedText>
          </Pressable>
        </View>

        {filteredTodayEvents.length === 0 ? (
          <Card style={styles.emptyTodayCard}>
            <Feather name="calendar" size={24} color={colors.textSecondary} />
            <ThemedText style={[styles.emptyTodayText, { color: colors.textSecondary }]}>
              {t.home.noEventsToday}
            </ThemedText>
          </Card>
        ) : (
          filteredTodayEvents.map((event) => (
            <Pressable key={event.id} onPress={navigateToCalendar} testID={`today-event-${event.id}`}>
              <Card style={styles.todayEventCard}>
                <View
                  style={[
                    styles.eventColorBar,
                    { backgroundColor: event.color || colors.primary },
                  ]}
                />
                <View style={styles.eventContent}>
                  <ThemedText style={[styles.eventTitle, { color: colors.text }]}>
                    {event.title}
                  </ThemedText>
                  <ThemedText style={[styles.eventTime, { color: colors.textSecondary }]}>
                    {event.allDay ? t.calendar.allDay : formatEventTime(event)}
                  </ThemedText>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.todaySection}>
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            {t.home.shoppingList}
          </ThemedText>
          <Pressable onPress={() => navigateToLists("shopping")} hitSlop={8}>
            <ThemedText style={[styles.viewAllLink, { color: colors.primary }]}>
              {t.home.viewShopping}
            </ThemedText>
          </Pressable>
        </View>

        {pendingShoppingItems.length === 0 ? (
          <Card style={styles.emptyTodayCard}>
            <Feather name="shopping-cart" size={24} color={colors.textSecondary} />
            <ThemedText style={[styles.emptyTodayText, { color: colors.textSecondary }]}>
              {t.home.nothingToBuy}
            </ThemedText>
          </Card>
        ) : (
          pendingShoppingItems.map((item) => (
            <Pressable key={item.id} onPress={() => navigateToLists("shopping")} testID={`home-shopping-${item.id}`}>
              <Card style={styles.listItemCard}>
                <View style={[styles.listItemDot, { backgroundColor: colors.primary }]} />
                <ThemedText style={[styles.listItemText, { color: colors.text }]}>
                  {item.name}
                </ThemedText>
                {item.quantity > 1 ? (
                  <ThemedText style={[styles.listItemMeta, { color: colors.textSecondary }]}>
                    x{item.quantity}
                  </ThemedText>
                ) : null}
              </Card>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.todaySection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              {t.home.pendingTasks}
            </ThemedText>
            {overdueTasks.length > 0 ? (
              <View style={[styles.overdueBadge, { backgroundColor: colors.error }]}>
                <ThemedText style={[styles.overdueBadgeText, { color: colors.buttonText }]}>
                  {overdueTasks.length} {t.home.overdue}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <Pressable onPress={() => navigateToLists("tasks")} hitSlop={8}>
            <ThemedText style={[styles.viewAllLink, { color: colors.primary }]}>
              {t.home.viewTasks}
            </ThemedText>
          </Pressable>
        </View>

        {pendingTasks.length === 0 ? (
          <Card style={styles.emptyTodayCard}>
            <Feather name="check-square" size={24} color={colors.textSecondary} />
            <ThemedText style={[styles.emptyTodayText, { color: colors.textSecondary }]}>
              {t.home.noTasksPending}
            </ThemedText>
          </Card>
        ) : (
          pendingTasks.map((task) => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
            return (
              <Pressable key={task.id} onPress={() => navigateToLists("tasks")} testID={`home-task-${task.id}`}>
                <Card style={styles.listItemCard}>
                  <View
                    style={[
                      styles.listItemDot,
                      {
                        backgroundColor: isOverdue
                          ? colors.error
                          : task.priority === "high"
                          ? colors.error
                          : task.priority === "medium"
                          ? colors.warning
                          : colors.success,
                      },
                    ]}
                  />
                  <ThemedText style={[styles.listItemText, { color: colors.text }]}>
                    {task.title}
                  </ThemedText>
                  {task.dueDate ? (
                    <ThemedText
                      style={[
                        styles.listItemMeta,
                        { color: isOverdue ? colors.error : colors.textSecondary },
                      ]}
                    >
                      {new Date(task.dueDate).toLocaleDateString()}
                    </ThemedText>
                  ) : null}
                </Card>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.todaySection}>
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            {t.home.monthlyBudget}
          </ThemedText>
          <Pressable onPress={navigateToBudget} hitSlop={8}>
            <ThemedText style={[styles.viewAllLink, { color: colors.primary }]}>
              {t.home.viewBudget}
            </ThemedText>
          </Pressable>
        </View>

        <Pressable onPress={navigateToBudget} testID="home-budget-widget">
          <Card style={styles.budgetCard}>
            <Feather name="dollar-sign" size={24} color={colors.primary} />
            <View style={styles.budgetInfo}>
              <ThemedText style={[styles.budgetAmount, { color: colors.text }]}>
                {formatCurrency(monthlyTotal)}
              </ThemedText>
              <ThemedText style={[styles.budgetLabel, { color: colors.textSecondary }]}>
                {t.budget.monthlySpent}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </Card>
        </Pressable>
      </View>

    </View>
  );

  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={{ color: colors.textSecondary }}>{t.auth.pleaseLogin}</ThemedText>
      </ThemedView>
    );
  }

  if (familyLoading) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/family"] });
    queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    queryClient.invalidateQueries({ queryKey: ["/api/shopping"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ queryKey: ["weather"] });
    queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      testID="home-scroll"
    >
      {renderHeader()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    marginBottom: Spacing.xl,
  },
  welcomeText: {
    ...Typography.body,
  },
  familyName: {
    ...Typography.title,
    marginBottom: Spacing.xl,
  },
  todaySection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.subtitle,
  },
  viewAllLink: {
    ...Typography.caption,
    fontWeight: "600",
  },
  emptyTodayCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  emptyTodayText: {
    ...Typography.body,
  },
  todayEventCard: {
    flexDirection: "row",
    padding: 0,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  eventColorBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: Spacing.md,
  },
  eventTitle: {
    ...Typography.body,
    fontWeight: "600",
  },
  eventTime: {
    ...Typography.small,
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  overdueBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  overdueBadgeText: {
    ...Typography.small,
    fontWeight: "600",
  },
  listItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  listItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  listItemText: {
    flex: 1,
    ...Typography.body,
  },
  listItemMeta: {
    ...Typography.small,
  },
  budgetCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetAmount: {
    ...Typography.subtitle,
    fontWeight: "700",
  },
  budgetLabel: {
    ...Typography.small,
    marginTop: 2,
  },
});
