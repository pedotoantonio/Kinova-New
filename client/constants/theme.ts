import { Platform } from "react-native";

export const CategoryColors = {
  calendar: "#4A90D9",
  lists: "#FF7B54",
  notes: "#9B7ED9",
  budget: "#4CAF7D",
  assistant: "#FFD93D",
  profile: "#4A90D9",
  home: "#4A90D9",
};

export const Gradients = {
  oceanBlue: ["#4A90D9", "#6BA8E3"],
  sunriseCoral: ["#FF7B54", "#FF9575"],
  meadowGreen: ["#4CAF7D", "#6FC596"],
  lavenderBloom: ["#9B7ED9", "#B299E3"],
  sunshineYellow: ["#FFD93D", "#FFE26B"],
};

export const Colors = {
  light: {
    primary: "#4A90D9",
    secondary: "#FF7B54",
    accent: "#9B7ED9",
    accentYellow: "#FFD93D",
    accentGreen: "#4CAF7D",
    text: "#2D3436",
    textSecondary: "#636E72",
    textLight: "#95A5A6",
    buttonText: "#FFFFFF",
    tabIconDefault: "#636E72",
    tabIconSelected: "#4A90D9",
    link: "#4A90D9",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F8F9FA",
    backgroundTertiary: "#F1F3F4",
    surface: "#FFFFFF",
    border: "#DFE6E9",
    borderLight: "#E8ECEF",
    success: "#4CAF7D",
    warning: "#FFD93D",
    error: "#FF6B6B",
    info: "#4A90D9",
    tabBar: "#FFFFFF",
    inputBackground: "#FFFFFF",
    inputBorder: "#DFE6E9",
    inputBorderFocus: "#4A90D9",
    cardBackground: "#FFFFFF",
    oceanBlue: "#4A90D9",
    sunriseCoral: "#FF7B54",
    meadowGreen: "#4CAF7D",
    lavenderBloom: "#9B7ED9",
    sunshineYellow: "#FFD93D",
  },
  dark: {
    primary: "#5A9FE8",
    secondary: "#FF8B64",
    accent: "#AB8EE9",
    accentYellow: "#FFE04D",
    accentGreen: "#5CBF8D",
    text: "#F8F9FA",
    textSecondary: "#B2BEC3",
    textLight: "#7F8C8D",
    buttonText: "#FFFFFF",
    tabIconDefault: "#7F8C8D",
    tabIconSelected: "#5A9FE8",
    link: "#5A9FE8",
    backgroundRoot: "#1A1D1F",
    backgroundDefault: "#1A1D1F",
    backgroundSecondary: "#252A2E",
    backgroundTertiary: "#2F3539",
    surface: "#252A2E",
    border: "#3D4449",
    borderLight: "#353A3F",
    success: "#5CBF8D",
    warning: "#FFE04D",
    error: "#FF7B7B",
    info: "#5A9FE8",
    tabBar: "#1A1D1F",
    inputBackground: "#252A2E",
    inputBorder: "#3D4449",
    inputBorderFocus: "#5A9FE8",
    cardBackground: "#252A2E",
    oceanBlue: "#5A9FE8",
    sunriseCoral: "#FF8B64",
    meadowGreen: "#5CBF8D",
    lavenderBloom: "#AB8EE9",
    sunshineYellow: "#FFE04D",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  screenPadding: 20,
  cardPadding: 16,
  componentGap: 12,
  inputHeight: 52,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 26,
  full: 9999,
  button: 26,
  input: 12,
  card: 16,
  badge: 20,
};

export const Typography = {
  largeTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  small: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  button: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
  },
};

export const IconSize = {
  sm: 18,
  md: 20,
  lg: 24,
  xl: 32,
  navigation: 24,
  inline: 20,
  decorative: 32,
};

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    shadowColor: "#4A90D9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "Inter",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "Inter",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "Inter, 'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Animation = {
  spring: {
    damping: 15,
    stiffness: 200,
  },
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  pressScale: 0.97,
};
