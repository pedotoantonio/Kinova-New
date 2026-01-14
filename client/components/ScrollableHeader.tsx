import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Spacing, Typography, Colors } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";

interface ScrollableHeaderProps {
  style?: any;
  onAvatarPress?: () => void;
}

export function ScrollableHeader({ style, onAvatarPress }: ScrollableHeaderProps) {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const colors = isDark ? Colors.dark : Colors.light;

  const displayName = user?.displayName || user?.username || "";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require("../../assets/images/kinova-text-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.spacer} />
      {user ? (
        <Pressable 
          style={styles.userSection} 
          onPress={onAvatarPress}
          hitSlop={8}
        >
          <ThemedText style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
            {displayName}
          </ThemedText>
          {user.avatarUrl ? (
            <ExpoImage
              source={{ uri: user.avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + "20" }]}>
              <ThemedText style={[styles.avatarText, { color: colors.primary }]}>
                {initials}
              </ThemedText>
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  logo: {
    width: 120,
    height: 36,
  },
  spacer: {
    flex: 1,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  userName: {
    ...Typography.caption,
    fontWeight: "500",
    maxWidth: 100,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    ...Typography.caption,
    fontWeight: "600",
  },
});
