import React from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, View, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, Animation, CategoryColors, Colors, DepthEffects } from "@/constants/theme";

type CategoryColor = "calendar" | "lists" | "notes" | "budget" | "assistant" | "profile" | "home" | "none";

interface CardProps {
  elevation?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  category?: CategoryColor;
  showCategoryIndicator?: boolean;
}

const springConfig: WithSpringConfig = {
  damping: Animation.spring.damping,
  stiffness: Animation.spring.stiffness,
  mass: 0.3,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  elevation = 1,
  title,
  description,
  children,
  onPress,
  style,
  testID,
  category = "none",
  showCategoryIndicator = false,
}: CardProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const scale = useSharedValue(1);

  const cardBackgroundColor = colors.cardBackground || colors.surface;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(Animation.pressScale, springConfig);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const handlePress = () => {
    if (onPress) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    }
  };

  const getShadowStyle = () => {
    switch (elevation) {
      case 0:
        return {};
      case 1:
        return Shadows.md;
      case 2:
        return Shadows.card;
      case 3:
        return Shadows.xl;
      default:
        return Shadows.floating;
    }
  };

  const getCategoryColor = () => {
    if (category === "none") return null;
    return CategoryColors[category];
  };

  const categoryColor = getCategoryColor();

  const cardContent = (
    <>
      {showCategoryIndicator && categoryColor ? (
        <View style={[styles.categoryIndicator, { backgroundColor: categoryColor }]} />
      ) : null}
      <View style={styles.cardInner}>
        {title ? (
          <ThemedText type="subtitle" style={styles.cardTitle}>
            {title}
          </ThemedText>
        ) : null}
        {description ? (
          <ThemedText type="caption" style={[styles.cardDescription, { color: colors.textSecondary }]}>
            {description}
          </ThemedText>
        ) : null}
        {children}
      </View>
    </>
  );

  const cardStyles: ViewStyle[] = [
    styles.card,
    {
      backgroundColor: cardBackgroundColor,
      borderColor: isDark ? DepthEffects.card.borderHighlight : colors.border,
      borderTopColor: isDark ? DepthEffects.card.borderHighlight : colors.borderLight,
    },
    getShadowStyle(),
  ];

  if (showCategoryIndicator && categoryColor) {
    cardStyles.push(styles.cardWithIndicator);
  }

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
        style={[cardStyles, animatedStyle, style]}
      >
        {cardContent}
      </AnimatedPressable>
    );
  }

  return (
    <View testID={testID} style={[cardStyles, style]}>
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderTopWidth: 1.5,
    overflow: "hidden",
  },
  cardWithIndicator: {
    paddingLeft: 0,
  },
  categoryIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.card,
    borderBottomLeftRadius: BorderRadius.card,
  },
  cardInner: {
    padding: Spacing.cardPadding,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    marginBottom: Spacing.sm,
  },
});
