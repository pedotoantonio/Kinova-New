import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { Spacing } from "@/constants/theme";

interface ScrollableHeaderProps {
  style?: any;
}

export function ScrollableHeader({ style }: ScrollableHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require("../../assets/images/kinova-text-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
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
});
