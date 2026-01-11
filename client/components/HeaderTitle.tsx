import React from "react";
import { View, StyleSheet, Image } from "react-native";

interface HeaderTitleProps {
  title?: string;
}

export function HeaderTitle({ title = "Kinova" }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/icon.png")}
        style={styles.icon}
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
    marginLeft: -32,
  },
  icon: {
    width: 176,
    height: 176,
  },
});
