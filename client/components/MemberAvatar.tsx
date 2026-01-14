import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Typography } from "@/constants/theme";

interface MemberAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string;
  size?: number;
  showName?: boolean;
  color?: string;
}

export function MemberAvatar({ 
  avatarUrl, 
  displayName, 
  username, 
  size = 20, 
  showName = true,
  color,
}: MemberAvatarProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const name = displayName || username || "";
  const initials = name.charAt(0).toUpperCase();
  const primaryColor = color || colors.primary;

  return (
    <View style={styles.container}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.placeholder, { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: primaryColor + "20",
        }]}>
          <ThemedText style={[styles.initials, { 
            color: primaryColor,
            fontSize: size * 0.45,
          }]}>
            {initials}
          </ThemedText>
        </View>
      )}
      {showName ? (
        <ThemedText style={[styles.name, { color: color || theme.textSecondary }]} numberOfLines={1}>
          {name}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    backgroundColor: "#ddd",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    fontWeight: "600",
  },
  name: {
    ...Typography.caption,
  },
});
