import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/hooks/useTheme";
import { Shadows, BorderRadius, Colors, DepthEffects } from "@/constants/theme";

type ElevationLevel = 0 | 1 | 2 | 3 | 4;

interface ElevatedViewProps {
  children: React.ReactNode;
  elevation?: ElevationLevel;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  glassEffect?: boolean;
}

export function ElevatedView({
  children,
  elevation = 2,
  style,
  borderRadius = BorderRadius.lg,
  glassEffect = false,
}: ElevatedViewProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const getShadowStyle = () => {
    switch (elevation) {
      case 0:
        return {};
      case 1:
        return Shadows.sm;
      case 2:
        return Shadows.card;
      case 3:
        return Shadows.xl;
      case 4:
        return Shadows.floating;
      default:
        return Shadows.card;
    }
  };

  const containerStyle: ViewStyle[] = [
    styles.container,
    {
      borderRadius,
      backgroundColor: colors.surface,
      borderColor: isDark ? DepthEffects.card.borderHighlight : colors.borderLight,
    },
    getShadowStyle(),
  ];

  if (glassEffect) {
    return (
      <View style={[containerStyle, style]}>
        <LinearGradient
          colors={[
            isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.9)",
            isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.7)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.glassOverlay, { borderRadius }]}
        >
          {children}
        </LinearGradient>
      </View>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderTopWidth: 1.5,
    overflow: "hidden",
  },
  glassOverlay: {
    flex: 1,
  },
});
