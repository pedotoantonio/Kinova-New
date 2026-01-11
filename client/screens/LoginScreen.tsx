import React, { useState, useMemo } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator, Alert, Switch, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

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
    weak: "#E85D4E",
    fair: "#FF9800",
    good: "#7CB342",
    strong: "#2D8659",
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
      <View style={[styles.strengthBarContainer, { backgroundColor: colors.backgroundSecondary }]}>
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

      <Card style={styles.requirementsCard}>
        <ThemedText style={[styles.requirementsTitle, { color: colors.text }]}>
          {t.auth.passwordRequirements.title}
        </ThemedText>
        {requirements.map((req) => {
          const met = !validation.errors.includes(req.key);
          return (
            <View key={req.key} style={styles.requirementItem}>
              <Feather
                name={met ? "check-circle" : "circle"}
                size={16}
                color={met ? colors.success : colors.textSecondary}
              />
              <ThemedText
                style={[
                  styles.requirementText,
                  { color: met ? colors.success : colors.textSecondary },
                ]}
              >
                {req.label}
              </ThemedText>
            </View>
          );
        })}
      </Card>
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
        <Feather name="users" size={32} color="#FFFFFF" />
      </View>
      <ThemedText style={[styles.appName, { color: colors.primary }]}>Kinova</ThemedText>
      <ThemedText style={[styles.tagline, { color: colors.textSecondary }]}>
        {t.app?.tagline || "La tua app di fiducia per la famiglia"}
      </ThemedText>
    </View>
  );

  if (isForgotPassword) {
    return (
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: colors.backgroundRoot }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
      >
        {renderHeader()}

        <Card style={styles.formCard}>
          <ThemedText style={[styles.formTitle, { color: colors.text }]}>
            {t.auth.forgotPassword}
          </ThemedText>
          <ThemedText style={[styles.formSubtitle, { color: colors.textSecondary }]}>
            {t.auth.forgotPasswordDesc || "Inserisci la tua email per ricevere le istruzioni"}
          </ThemedText>

          <Input
            leftIcon="mail"
            placeholder={t.auth.email}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            testID="input-email"
          />

          <Button
            onPress={handleForgotPassword}
            loading={loading}
            testID="button-reset-password"
            style={styles.primaryButton}
          >
            {t.auth.resetPassword}
          </Button>

          <Button
            variant="outline"
            onPress={() => setIsForgotPassword(false)}
            style={styles.secondaryButton}
          >
            {t.auth.backToLogin || "Torna al login"}
          </Button>
        </Card>
      </KeyboardAwareScrollViewCompat>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.backgroundRoot }}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
      ]}
    >
      {renderHeader()}

      <Card style={styles.formCard}>
        <ThemedText style={[styles.formTitle, { color: colors.text }]}>
          {isRegisterMode ? t.auth.createYourAccount : t.auth.welcomeBack}
        </ThemedText>
        <ThemedText style={[styles.formSubtitle, { color: colors.textSecondary }]}>
          {isRegisterMode 
            ? (t.auth.createAccountDesc || "Inizia a organizzare la tua famiglia")
            : (t.auth.loginDesc || "Accedi al tuo account")}
        </ThemedText>

        <Input
          leftIcon="mail"
          placeholder={t.auth.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          testID="input-email"
        />

        <Input
          leftIcon="lock"
          placeholder={t.auth.password}
          value={password}
          onChangeText={setPassword}
          isPassword
          testID="input-password"
        />

        {isRegisterMode && password.length > 0 ? (
          <PasswordStrengthMeter password={password} t={t} colors={colors} />
        ) : null}

        {isRegisterMode ? (
          <Input
            leftIcon="user"
            placeholder={t.auth.displayNameOptional}
            value={displayName}
            onChangeText={setDisplayName}
            testID="input-displayname"
          />
        ) : null}

        {isRegisterMode ? (
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
        ) : null}

        <Button
          onPress={handleSubmit}
          loading={loading}
          testID="button-submit"
          style={styles.primaryButton}
        >
          {isRegisterMode ? t.auth.createAccount : t.auth.login}
        </Button>

        {!isRegisterMode ? (
          <Pressable
            style={styles.forgotPasswordLink}
            onPress={() => setIsForgotPassword(true)}
          >
            <ThemedText style={[styles.forgotPasswordText, { color: colors.primary }]}>
              {t.auth.forgotPassword}
            </ThemedText>
          </Pressable>
        ) : null}
      </Card>

      <View style={styles.switchModeContainer}>
        <ThemedText style={[styles.switchModeText, { color: colors.textSecondary }]}>
          {isRegisterMode ? t.auth.alreadyHaveAccount : t.auth.noAccount || "Non hai un account?"}
        </ThemedText>
        <Pressable onPress={() => setIsRegisterMode(!isRegisterMode)}>
          <ThemedText style={[styles.switchModeLink, { color: colors.primary }]}>
            {isRegisterMode ? t.auth.login : t.auth.createNewAccount}
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
    ...Shadows.lg,
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  tagline: {
    ...Typography.body,
    textAlign: "center",
  },
  formCard: {
    marginBottom: Spacing.xl,
  },
  formTitle: {
    ...Typography.title,
    marginBottom: Spacing.sm,
  },
  formSubtitle: {
    ...Typography.body,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    marginTop: Spacing.md,
  },
  secondaryButton: {
    marginTop: Spacing.md,
  },
  forgotPasswordLink: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  forgotPasswordText: {
    ...Typography.caption,
    fontWeight: "500",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  termsText: {
    ...Typography.caption,
    flex: 1,
  },
  switchModeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  switchModeText: {
    ...Typography.body,
  },
  switchModeLink: {
    ...Typography.body,
    fontWeight: "600",
  },
  strengthContainer: {
    marginBottom: Spacing.lg,
  },
  strengthBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  strengthBar: {
    height: "100%",
    borderRadius: 3,
  },
  strengthLabel: {
    ...Typography.caption,
    fontWeight: "600",
    textAlign: "right",
    marginBottom: Spacing.md,
  },
  requirementsCard: {
    padding: Spacing.lg,
  },
  requirementsTitle: {
    ...Typography.caption,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  requirementText: {
    ...Typography.caption,
  },
});
