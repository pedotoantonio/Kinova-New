/**
 * React Native Testing Setup
 * Mocks and configuration for testing React Native components
 */

import { vi } from "vitest";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    getAllKeys: vi.fn(() => Promise.resolve([])),
    multiGet: vi.fn(() => Promise.resolve([])),
    multiSet: vi.fn(() => Promise.resolve()),
    multiRemove: vi.fn(() => Promise.resolve()),
  },
}));

// Mock Expo Haptics
vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(() => Promise.resolve()),
  notificationAsync: vi.fn(() => Promise.resolve()),
  selectionAsync: vi.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

// Mock Expo LinearGradient
vi.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children, style }: any) => {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, { style }, children);
  },
}));

// Mock React Native Reanimated
vi.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");

  return {
    default: {
      createAnimatedComponent: (component: any) => component,
      View,
      Text: require("react-native").Text,
    },
    useSharedValue: (initialValue: any) => ({ value: initialValue }),
    useAnimatedStyle: (styleCallback: () => any) => styleCallback(),
    withSpring: (value: any) => value,
    withTiming: (value: any) => value,
    Easing: {
      linear: (t: number) => t,
      ease: (t: number) => t,
    },
    createAnimatedComponent: (component: any) => component,
  };
});

// Mock React Navigation
vi.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: vi.fn(),
    goBack: vi.fn(),
    setOptions: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: vi.fn(),
  useIsFocused: () => true,
}));

// Mock Expo Notifications
vi.mock("expo-notifications", () => ({
  getPermissionsAsync: vi.fn(() =>
    Promise.resolve({ status: "granted", granted: true })
  ),
  requestPermissionsAsync: vi.fn(() =>
    Promise.resolve({ status: "granted", granted: true })
  ),
  getExpoPushTokenAsync: vi.fn(() =>
    Promise.resolve({ data: "ExponentPushToken[test-token]" })
  ),
  setNotificationHandler: vi.fn(),
  addNotificationReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  scheduleNotificationAsync: vi.fn(() => Promise.resolve("notification-id")),
  cancelScheduledNotificationAsync: vi.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: vi.fn(() => Promise.resolve()),
}));

// Mock Expo Constants
vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      name: "Kinova NewStile",
      version: "1.0.0",
    },
    manifest: {
      name: "Kinova NewStile",
    },
  },
}));

// Mock Safe Area Context
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, null, children);
  },
}));

// Mock Theme hook
vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "light",
    isDark: false,
    toggleTheme: vi.fn(),
  }),
}));

// Mock I18n hook
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: "it",
    setLanguage: vi.fn(),
  }),
  I18nProvider: ({ children }: any) => children,
}));

// Mock Auth hook
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Global test utilities
export function mockConsole() {
  const originalConsole = { ...console };

  beforeEach(() => {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
}

// Helper to wait for async updates
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
