import React from "react";
import { View, Pressable, StyleSheet, Alert, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { queryClient } from "@/lib/query-client";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user, logout, isLoading, isAuthenticated } = useAuth();

  const colors = isDark ? Colors.dark : Colors.light;

  const performLogout = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    queryClient.clear();
    await logout();
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to logout?")) {
        performLogout();
      }
    } else {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Logout",
            style: "destructive",
            onPress: performLogout,
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={{ color: colors.textSecondary }}>Please log in</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <ThemedText style={styles.avatarText}>
            {(user.displayName || user.username).charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <ThemedText style={[styles.displayName, { color: colors.text }]}>
          {user.displayName || user.username}
        </ThemedText>
        <ThemedText style={[styles.username, { color: colors.textSecondary }]}>
          @{user.username}
        </ThemedText>
      </View>

      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Feather name="user" size={20} color={colors.textSecondary} />
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>
              User ID
            </ThemedText>
            <ThemedText style={[styles.infoValue, { color: colors.text }]}>
              {user.id}
            </ThemedText>
          </View>
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />
        
        <View style={styles.infoRow}>
          <Feather name="users" size={20} color={colors.textSecondary} />
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Family ID
            </ThemedText>
            <ThemedText style={[styles.infoValue, { color: colors.text }]}>
              {user.familyId || "None"}
            </ThemedText>
          </View>
        </View>
      </Card>

      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          { backgroundColor: colors.error, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={handleLogout}
        testID="button-logout"
      >
        <Feather name="log-out" size={20} color="#FFFFFF" />
        <ThemedText style={styles.logoutText}>Logout</ThemedText>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  displayName: {
    ...Typography.title,
    marginBottom: Spacing.xs,
  },
  username: {
    ...Typography.body,
  },
  infoCard: {
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  infoContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  infoLabel: {
    ...Typography.caption,
  },
  infoValue: {
    ...Typography.body,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  logoutButton: {
    flexDirection: "row",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoutText: {
    color: "#FFFFFF",
    ...Typography.body,
    fontWeight: "600",
  },
});
