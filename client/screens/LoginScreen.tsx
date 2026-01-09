import React, { useState } from "react";
import { View, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { login, register, guestLogin, isLoading } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const colors = isDark ? Colors.dark : Colors.light;

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        await register(username.trim(), password, displayName.trim() || undefined);
      } else {
        await login(username.trim(), password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      await guestLogin();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Guest login failed");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + Spacing["2xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
      ]}
    >
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: colors.primary }]}>Kinova</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isRegisterMode ? "Create your account" : "Welcome back"}
        </ThemedText>
      </View>

      <View style={styles.form}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.backgroundSecondary,
            },
          ]}
          placeholder="Username"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          testID="input-username"
        />

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.backgroundSecondary,
            },
          ]}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="input-password"
        />

        {isRegisterMode && (
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.backgroundSecondary,
              },
            ]}
            placeholder="Display Name (optional)"
            placeholderTextColor={colors.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
            testID="input-displayname"
          />
        )}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={loading}
          testID="button-submit"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.buttonText}>
              {isRegisterMode ? "Create Account" : "Login"}
            </ThemedText>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => setIsRegisterMode(!isRegisterMode)}
          disabled={loading}
        >
          <ThemedText style={[styles.secondaryButtonText, { color: colors.primary }]}>
            {isRegisterMode ? "Already have an account? Login" : "Create new account"}
          </ThemedText>
        </Pressable>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.backgroundSecondary }]} />
          <ThemedText style={[styles.dividerText, { color: colors.textSecondary }]}>or</ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: colors.backgroundSecondary }]} />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.guestButton,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleGuestLogin}
          disabled={loading}
          testID="button-guest"
        >
          <ThemedText style={styles.buttonText}>Continue as Guest</ThemedText>
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    marginTop: Spacing["3xl"],
    marginBottom: Spacing["2xl"],
    alignItems: "center",
  },
  title: {
    ...Typography.title,
    fontSize: 36,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
  },
  form: {
    gap: Spacing.lg,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    ...Typography.body,
  },
  primaryButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  secondaryButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  guestButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    ...Typography.body,
    fontWeight: "600",
  },
  secondaryButtonText: {
    ...Typography.body,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.lg,
    ...Typography.caption,
  },
});
