import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, ActivityIndicator, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Typography, Shadows, Animation, Gradients, Colors, ColoredShadows, DepthEffects } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "red" | "orange" | "green" | "teal" | "purple" | "coral" | "lavender" | "yellow";

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  testID?: string;
}

const springConfig: WithSpringConfig = {
  damping: Animation.spring.damping,
  stiffness: Animation.spring.stiffness,
  mass: 0.3,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  loading = false,
  variant = "primary",
  testID,
}: ButtonProps) {
  const { theme, isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(Animation.pressScale, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    }
  };

  const isDisabled = disabled || loading;

  const getGradientColors = (): [string, string] => {
    switch (variant) {
      case "primary":
        return Gradients.primary as [string, string];
      case "red":
        return Gradients.red as [string, string];
      case "orange":
      case "coral":
        return Gradients.coral as [string, string];
      case "green":
        return Gradients.green as [string, string];
      case "teal":
        return Gradients.teal as [string, string];
      case "purple":
      case "lavender":
        return Gradients.purple as [string, string];
      case "yellow":
        return Gradients.sunshineYellow as [string, string];
      default:
        return Gradients.primary as [string, string];
    }
  };

  const getColoredShadow = () => {
    switch (variant) {
      case "red":
        return ColoredShadows.red;
      case "orange":
      case "coral":
        return ColoredShadows.orange;
      case "green":
        return ColoredShadows.green;
      case "teal":
        return ColoredShadows.cyan;
      case "purple":
      case "lavender":
        return ColoredShadows.purple;
      case "yellow":
        return ColoredShadows.orange;
      case "primary":
      default:
        return ColoredShadows.blue;
    }
  };

  const usesGradient = ["primary", "red", "orange", "coral", "green", "teal", "purple", "lavender", "yellow"].includes(variant);

  const getButtonStyles = (): ViewStyle => {
    switch (variant) {
      case "secondary":
        return {
          backgroundColor: colors.backgroundDefault,
          borderWidth: 1.5,
          borderColor: colors.primary,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: colors.primary,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
        };
      default:
        return {};
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case "secondary":
        return colors.primary;
      case "outline":
        return colors.primary;
      case "ghost":
        return colors.primary;
      case "yellow":
        return "#2D3436";
      default:
        return "#FFFFFF";
    }
  };

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <ThemedText
          type="button"
          style={[styles.buttonText, { color: getTextColor() }]}
        >
          {children}
        </ThemedText>
      )}
    </>
  );

  if (usesGradient) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        testID={testID}
        style={[
          styles.buttonContainer,
          { opacity: isDisabled ? 0.5 : 1 },
          style,
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, styles.gradientButton, getColoredShadow()]}
        >
          {buttonContent}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      testID={testID}
      style={[
        styles.button,
        getButtonStyles(),
        { opacity: isDisabled ? 0.5 : 1 },
        style,
        animatedStyle,
      ]}
    >
      {buttonContent}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: BorderRadius.button,
    overflow: "hidden",
  },
  button: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  gradientButton: {
    borderRadius: BorderRadius.button,
  },
  buttonText: {
    ...Typography.button,
  },
});
