import React from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface CardProps {
  elevation?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
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
}: CardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const cardBackgroundColor = theme.cardBackground || theme.surface;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const cardContent = (
    <>
      {title ? (
        <ThemedText type="subtitle" style={styles.cardTitle}>
          {title}
        </ThemedText>
      ) : null}
      {description ? (
        <ThemedText type="small" style={[styles.cardDescription, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
        style={[
          styles.card,
          {
            backgroundColor: cardBackgroundColor,
            borderColor: theme.border,
          },
          animatedStyle,
          style,
        ]}
      >
        {cardContent}
      </AnimatedPressable>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: cardBackgroundColor,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    marginBottom: Spacing.md,
  },
});
