import React from "react";
import { View, FlatList, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useTheme } from "@/hooks/useTheme";
import { useAuth, UserRole } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import type { Event } from "@shared/types";

interface FamilyMember {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

interface Family {
  id: string;
  name: string;
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

  const roleLabels: Record<UserRole, string> = {
    admin: t.family.admin,
    member: t.family.member,
    child: t.family.child,
  };

  const roleColors: Record<UserRole, string> = {
    admin: "#2F7F6D",
    member: "#6FB7A8",
    child: "#A8D8CC",
  };

  const { data: family, isLoading: familyLoading } = useQuery<Family>({
    queryKey: ["/api/family"],
    enabled: isAuthenticated,
  });

  const {
    data: members,
    isLoading: membersLoading,
    refetch: refetchMembers,
    isRefetching,
  } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family/members"],
    enabled: isAuthenticated,
  });

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const { data: todayEvents } = useQuery<Event[]>({
    queryKey: ["/api/events", todayStart.toISOString(), todayEnd.toISOString()],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/events?from=${todayStart.toISOString()}&to=${todayEnd.toISOString()}`
      ) as Response;
      return response.json();
    },
    enabled: isAuthenticated,
  });

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

  const renderMember = ({ item }: { item: FamilyMember }) => (
    <Card style={styles.memberCard}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <ThemedText style={styles.avatarText}>
          {(item.displayName || item.username).charAt(0).toUpperCase()}
        </ThemedText>
      </View>
      <View style={styles.memberInfo}>
        <ThemedText style={[styles.memberName, { color: colors.text }]}>
          {item.displayName || item.username}
        </ThemedText>
        <ThemedText style={[styles.memberUsername, { color: colors.textSecondary }]}>
          @{item.username}
        </ThemedText>
      </View>
      <View style={styles.badges}>
        <View style={[styles.roleBadge, { backgroundColor: roleColors[item.role] }]}>
          <ThemedText style={styles.roleBadgeText}>{roleLabels[item.role]}</ThemedText>
        </View>
        {item.id === user?.id ? (
          <View style={[styles.youBadge, { backgroundColor: colors.secondary }]}>
            <ThemedText style={styles.youBadgeText}>{t.family.you}</ThemedText>
          </View>
        ) : null}
      </View>
    </Card>
  );

  const navigateToCalendar = () => {
    (navigation as any).navigate("CalendarTab");
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <ThemedText style={[styles.welcomeText, { color: colors.textSecondary }]}>
        {t.home.welcomeTo}
      </ThemedText>
      <ThemedText style={[styles.familyName, { color: colors.text }]}>
        {family?.name || t.home.yourFamily}
      </ThemedText>

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

      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          {t.home.familyMembers}
        </ThemedText>
        <ThemedText style={[styles.memberCount, { color: colors.textSecondary }]}>
          {members?.length || 0} {(members?.length || 0) !== 1 ? t.home.members : t.home.member}
        </ThemedText>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Feather name="users" size={48} color={colors.textSecondary} />
      <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
        {t.home.noFamilyMembers}
      </ThemedText>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={{ color: colors.textSecondary }}>{t.auth.pleaseLogin}</ThemedText>
      </ThemedView>
    );
  }

  if (familyLoading || membersLoading) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={members || []}
      keyExtractor={(item) => item.id}
      renderItem={renderMember}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      refreshing={isRefetching}
      onRefresh={refetchMembers}
      testID="list-members"
    />
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
  memberCount: {
    ...Typography.caption,
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
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    ...Typography.subtitle,
    fontWeight: "700",
  },
  memberInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  memberName: {
    ...Typography.body,
    fontWeight: "600",
  },
  memberUsername: {
    ...Typography.caption,
  },
  badges: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  roleBadgeText: {
    color: "#FFFFFF",
    ...Typography.small,
    fontWeight: "600",
  },
  youBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  youBadgeText: {
    color: "#FFFFFF",
    ...Typography.small,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    ...Typography.body,
    marginTop: Spacing.lg,
  },
});
