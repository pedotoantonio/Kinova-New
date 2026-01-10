import React, { useState, useMemo } from "react";
import { View, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";

interface PasswordStrength {
  valid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
  score: number;
}

function validatePassword(password: string): PasswordStrength {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push("min_length");
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("uppercase");
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push("lowercase");
  } else {
    score += 1;
  }

  if (!/[0-9]/.test(password)) {
    errors.push("number");
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push("symbol");
  } else {
    score += 1;
  }

  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  let strength: "weak" | "fair" | "good" | "strong";
  if (score <= 2) strength = "weak";
  else if (score <= 4) strength = "fair";
  else if (score <= 5) strength = "good";
  else strength = "strong";

  return { valid: errors.length === 0, errors, strength, score };
}

function PasswordStrengthMeter({ password, t, colors }: { password: string; t: any; colors: any }) {
  const validation = useMemo(() => validatePassword(password), [password]);

  if (!password) return null;

  const strengthColors = {
    weak: "#E53935",
    fair: "#FB8C00",
    good: "#7CB342",
    strong: "#43A047",
  };

  const strengthWidth = {
    weak: "25%",
    fair: "50%",
    good: "75%",
    strong: "100%",
  };

  const requirements = [
    { key: "min_length", label: t.auth.passwordRequirements.minLength },
    { key: "uppercase", label: t.auth.passwordRequirements.uppercase },
    { key: "lowercase", label: t.auth.passwordRequirements.lowercase },
    { key: "number", label: t.auth.passwordRequirements.number },
    { key: "symbol", label: t.auth.passwordRequirements.symbol },
  ];

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBarContainer}>
        <View
          style={[
            styles.strengthBar,
            {
              width: strengthWidth[validation.strength] as any,
              backgroundColor: strengthColors[validation.strength],
            },
          ]}
        />
      </View>
      <ThemedText style={[styles.strengthLabel, { color: strengthColors[validation.strength] }]}>
        {t.auth.passwordStrength[validation.strength]}
      </ThemedText>

      <View style={styles.requirementsList}>
        <ThemedText style={[styles.requirementsTitle, { color: colors.textSecondary }]}>
          {t.auth.passwordRequirements.title}
        </ThemedText>
        {requirements.map((req) => {
          const met = !validation.errors.includes(req.key);
          return (
            <View key={req.key} style={styles.requirementItem}>
              <Feather
                name={met ? "check-circle" : "circle"}
                size={14}
                color={met ? "#43A047" : colors.textSecondary}
              />
              <ThemedText
                style={[
                  styles.requirementText,
                  { color: met ? "#43A047" : colors.textSecondary },
                ]}
              >
                {req.label}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { login, register, isLoading } = useAuth();
  const { t } = useI18n();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const colors = isDark ? Colors.dark : Colors.light;

  const passwordValidation = useMemo(() => validatePassword(password), [password]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t.common.error, t.auth.enterCredentials);
      return;
    }

    if (isRegisterMode) {
      if (!passwordValidation.valid) {
        Alert.alert(t.common.error, t.auth.errors.weakPassword);
        return;
      }
      if (!acceptTerms) {
        Alert.alert(t.common.error, t.auth.termsRequired);
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        await register(email.trim(), password, displayName.trim() || undefined, acceptTerms);
      } else {
        await login(email.trim(), password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      let errorMessage = t.auth.authFailed;
      if (error.code === "RATE_LIMITED") {
        errorMessage = t.auth.errors.rateLimited.replace("{minutes}", error.retryAfterMinutes || "15");
      } else if (error.code === "INVALID_CREDENTIALS") {
        errorMessage = t.auth.errors.invalidCredentials;
      } else if (error.code === "EMAIL_EXISTS") {
        errorMessage = t.auth.errors.emailExists;
      } else if (error.code === "WEAK_PASSWORD") {
        errorMessage = t.auth.errors.weakPassword;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert(t.common.error, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t.common.error, t.auth.enterCredentials);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : ""}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t.auth.resetPassword, t.auth.resetPasswordSent);
      setIsForgotPassword(false);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t.common.error, error.message || t.auth.authFailed);
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

  if (isForgotPassword) {
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
            {t.auth.forgotPassword}
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
            placeholder={t.auth.email}
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            testID="input-email"
          />

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <ThemedText style={[styles.buttonText, { color: colors.buttonText }]}>
                {t.auth.resetPassword}
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => setIsForgotPassword(false)}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: colors.primary }]}>
              {t.auth.login}
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
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
          {isRegisterMode ? t.auth.createYourAccount : t.auth.welcomeBack}
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
          placeholder={t.auth.email}
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          testID="input-email"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.backgroundSecondary,
              },
            ]}
            placeholder={t.auth.password}
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            testID="input-password"
          />
          <Pressable
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        {isRegisterMode && password.length > 0 && (
          <PasswordStrengthMeter password={password} t={t} colors={colors} />
        )}

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
            placeholder={t.auth.displayNameOptional}
            placeholderTextColor={colors.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
            testID="input-displayname"
          />
        )}

        {isRegisterMode && (
          <View style={styles.termsContainer}>
            <Switch
              value={acceptTerms}
              onValueChange={setAcceptTerms}
              trackColor={{ false: colors.backgroundSecondary, true: colors.primary }}
              thumbColor={acceptTerms ? colors.buttonText : colors.surface}
            />
            <ThemedText style={[styles.termsText, { color: colors.textSecondary }]}>
              {t.auth.acceptTerms}
            </ThemedText>
          </View>
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
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <ThemedText style={[styles.buttonText, { color: colors.buttonText }]}>
              {isRegisterMode ? t.auth.createAccount : t.auth.login}
            </ThemedText>
          )}
        </Pressable>

        {!isRegisterMode && (
          <Pressable
            style={styles.forgotPasswordLink}
            onPress={() => setIsForgotPassword(true)}
          >
            <ThemedText style={[styles.forgotPasswordText, { color: colors.primary }]}>
              {t.auth.forgotPassword}
            </ThemedText>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => setIsRegisterMode(!isRegisterMode)}
          disabled={loading}
        >
          <ThemedText style={[styles.secondaryButtonText, { color: colors.primary }]}>
            {isRegisterMode ? t.auth.alreadyHaveAccount : t.auth.createNewAccount}
          </ThemedText>
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
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
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
  buttonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  secondaryButtonText: {
    ...Typography.body,
  },
  forgotPasswordLink: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  forgotPasswordText: {
    ...Typography.caption,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  termsText: {
    ...Typography.caption,
    flex: 1,
  },
  strengthContainer: {
    gap: Spacing.sm,
  },
  strengthBarContainer: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthBar: {
    height: "100%",
    borderRadius: 2,
  },
  strengthLabel: {
    ...Typography.caption,
    fontWeight: "600",
    textAlign: "right",
  },
  requirementsList: {
    gap: Spacing.xs,
  },
  requirementsTitle: {
    ...Typography.caption,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  requirementText: {
    ...Typography.caption,
  },
});
