import { Platform } from "react-native";

// Kinova Brand Colors
const primaryColor = "#2F7F6D";
const secondaryColor = "#6FB7A8";

export const Colors = {
  light: {
    primary: primaryColor,
    secondary: secondaryColor,
    text: "#1F2D2B",
    textSecondary: "#5E6E6B",
    buttonText: "#FFFFFF",
    tabIconDefault: "#5E6E6B",
    tabIconSelected: primaryColor,
    link: primaryColor,
    backgroundRoot: "#F5F7F6",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#E8EEEC",
    backgroundTertiary: "#D9E4E1",
    surface: "#FFFFFF",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    info: secondaryColor,
  },
  dark: {
    primary: secondaryColor,
    secondary: primaryColor,
    text: "#ECEDEE",
    textSecondary: "#9BA8A5",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA8A5",
    tabIconSelected: secondaryColor,
    link: secondaryColor,
    backgroundRoot: "#1F2D2B",
    backgroundDefault: "#2A3836",
    backgroundSecondary: "#354442",
    backgroundTertiary: "#40504E",
    surface: "#2A3836",
    success: "#66BB6A",
    warning: "#FFA726",
    error: "#EF5350",
    info: secondaryColor,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  inputHeight: 48,
  buttonHeight: 48,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
};

export const Typography = {
  title: {
    fontSize: 28,
    lineHeight: 39,
    fontWeight: "700" as const,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
