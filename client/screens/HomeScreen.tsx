import React from "react";
import { View, FlatList, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";

interface FamilyMember {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface Family {
  id: string;
  name: string;
  createdAt: string;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();

  const colors = isDark ? Colors.dark : Colors.light;

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
      {item.id === user?.id && (
        <View style={[styles.youBadge, { backgroundColor: colors.secondary }]}>
          <ThemedText style={styles.youBadgeText}>You</ThemedText>
        </View>
      )}
    </Card>
  );

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <ThemedText style={[styles.welcomeText, { color: colors.textSecondary }]}>
        Welcome to
      </ThemedText>
      <ThemedText style={[styles.familyName, { color: colors.text }]}>
        {family?.name || "Your Family"}
      </ThemedText>
      
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          Family Members
        </ThemedText>
        <ThemedText style={[styles.memberCount, { color: colors.textSecondary }]}>
          {members?.length || 0} member{(members?.length || 0) !== 1 ? "s" : ""}
        </ThemedText>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Feather name="users" size={48} color={colors.textSecondary} />
      <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
        No family members yet
      </ThemedText>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={{ color: colors.textSecondary }}>Please log in</ThemedText>
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    ...Typography.subtitle,
  },
  memberCount: {
    ...Typography.caption,
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
