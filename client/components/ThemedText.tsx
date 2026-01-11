import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "largeTitle" | "title" | "subtitle" | "body" | "label" | "caption" | "small" | "button" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.link;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "largeTitle":
        return Typography.largeTitle;
      case "title":
        return Typography.title;
      case "subtitle":
        return Typography.subtitle;
      case "body":
        return Typography.body;
      case "label":
        return Typography.label;
      case "caption":
        return Typography.caption;
      case "small":
        return Typography.small;
      case "button":
        return Typography.button;
      case "link":
        return { ...Typography.body, textDecorationLine: "underline" as const };
      default:
        return Typography.body;
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}
