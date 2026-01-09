import React, { useCallback } from "react";
import { View, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/lib/i18n";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { queryClient, apiRequest } from "@/lib/query-client";

interface Notification {
  id: string;
  type: string;
  category: string;
  titleKey: string;
  titleParams: Record<string, string> | null;
  messageKey: string;
  messageParams: Record<string, string> | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  read: boolean;
  createdAt: string;
}

const categoryIcons: Record<string, keyof typeof Feather.glyphMap> = {
  calendar: "calendar",
  tasks: "check-square",
  shopping: "shopping-cart",
  budget: "dollar-sign",
  ai: "cpu",
};

export default function NotificationCenterScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { t } = useI18n();

  const colors = isDark ? Colors.dark : Colors.light;

  const { data: notifications = [], isLoading, refetch, isRefetching } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PUT", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t.notifications.justNow;
    if (diffMins < 60) return t.notifications.minutesAgo.replace("{count}", String(diffMins));
    if (diffHours < 24) return t.notifications.hoursAgo.replace("{count}", String(diffHours));
    return t.notifications.daysAgo.replace("{count}", String(diffDays));
  }, [t]);

  const getNotificationText = useCallback((notification: Notification) => {
    const titleKey = notification.type as keyof typeof t.notifications;
    const msgKey = `${notification.type}_msg` as keyof typeof t.notifications;
    
    let title = (t.notifications[titleKey] as string) || notification.titleKey;
    let message = (t.notifications[msgKey] as string) || notification.messageKey;
    
    if (notification.titleParams) {
      Object.entries(notification.titleParams).forEach(([key, value]) => {
        title = title.replace(`{${key}}`, value);
      });
    }
    if (notification.messageParams) {
      Object.entries(notification.messageParams).forEach(([key, value]) => {
        message = message.replace(`{${key}}`, value);
      });
    }
    
    return { title, message };
  }, [t]);

  const handleNotificationPress = useCallback((notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
    
    if (notification.relatedEntityType && notification.relatedEntityId) {
      switch (notification.relatedEntityType) {
        case "event":
          (navigation as any).navigate("CalendarTab");
          break;
        case "task":
          (navigation as any).navigate("ListsTab", { tab: "tasks" });
          break;
        case "shopping":
          (navigation as any).navigate("ListsTab", { tab: "shopping" });
          break;
        case "expense":
          (navigation as any).navigate("BudgetTab");
          break;
      }
    }
  }, [navigation, markReadMutation]);

  const handleMarkAllRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleDelete = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    deleteNotificationMutation.mutate(id);
  }, [deleteNotificationMutation]);

  const renderNotification = ({ item }: { item: Notification }) => {
    const { title, message } = getNotificationText(item);
    const icon = categoryIcons[item.category] || "bell";
    
    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        testID={`notification-${item.id}`}
      >
        <Card style={{
          ...styles.notificationCard,
          ...(!item.read ? { borderLeftWidth: 3, borderLeftColor: colors.primary } : {}),
        }}>
          <View style={styles.notificationRow}>
            <View style={[styles.iconContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <Feather name={icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.contentContainer}>
              <View style={styles.headerRow}>
                <ThemedText style={[styles.title, { color: colors.text }, !item.read && styles.unreadTitle]}>
                  {title}
                </ThemedText>
                <ThemedText style={[styles.time, { color: colors.textSecondary }]}>
                  {formatTimeAgo(item.createdAt)}
                </ThemedText>
              </View>
              <ThemedText style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
                {message}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => handleDelete(item.id)}
              hitSlop={8}
              style={styles.deleteButton}
              testID={`delete-notification-${item.id}`}
            >
              <Feather name="x" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </Card>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="bell-off" size={48} color={colors.textSecondary} />
      <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
        {t.notifications.noNotifications}
      </ThemedText>
    </View>
  );

  const hasUnread = notifications.some(n => !n.read);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {hasUnread ? (
        <View style={[styles.actionBar, { paddingTop: headerHeight }]}>
          <Pressable
            onPress={handleMarkAllRead}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.backgroundSecondary, opacity: pressed ? 0.7 : 1 }
            ]}
            testID="button-mark-all-read"
          >
            <Feather name="check-circle" size={16} color={colors.primary} />
            <ThemedText style={[styles.actionText, { color: colors.primary }]}>
              {t.notifications.markAllRead}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: hasUnread ? Spacing.md : headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      />
    </View>
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
  actionBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actionText: {
    ...Typography.caption,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  notificationCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.body,
    fontWeight: "500",
    flex: 1,
  },
  unreadTitle: {
    fontWeight: "700",
  },
  time: {
    ...Typography.caption,
    marginLeft: Spacing.sm,
  },
  message: {
    ...Typography.caption,
  },
  deleteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    ...Typography.body,
    marginTop: Spacing.md,
  },
});
