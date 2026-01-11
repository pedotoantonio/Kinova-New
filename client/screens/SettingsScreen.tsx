import React, { useState } from "react";
import { View, StyleSheet, Switch, Pressable, Alert, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { queryClient } from "@/lib/query-client";

interface SettingRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  iconColor?: string;
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  showChevron = true,
  iconColor,
}: SettingRowProps) {
  const { theme } = useTheme();

  const content = (
    <View style={styles.settingRow}>
      <View style={[styles.settingIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name={icon} size={18} color={iconColor || theme.primary} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText style={[styles.settingLabel, { color: theme.text }]}>{label}</ThemedText>
        {value ? (
          <ThemedText style={[styles.settingValue, { color: theme.textSecondary }]}>
            {value}
          </ThemedText>
        ) : null}
      </View>
      {rightElement ? rightElement : null}
      {showChevron && onPress && !rightElement ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const navigation = useNavigation();

  const colors = isDark ? Colors.dark : Colors.light;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  const handleToggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleToggleDataSharing = (value: boolean) => {
    setDataSharing(value);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleToggleTheme = () => {
    toggleTheme?.();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleLanguageChange = (lang: "it" | "en") => {
    setLanguage(lang);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const performLogout = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    queryClient.clear();
    await logout();
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm(t.auth.confirmLogout)) {
        performLogout();
      }
    } else {
      Alert.alert(
        t.auth.logout,
        t.auth.confirmLogout,
        [
          { text: t.common.cancel, style: "cancel" },
          {
            text: t.auth.logout,
            style: "destructive",
            onPress: performLogout,
          },
        ]
      );
    }
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Card style={styles.sectionCard}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          {t.settings?.notifications || "Notifiche"}
        </ThemedText>
        
        <SettingRow
          icon="bell"
          label={t.notifications?.enable || "Abilita notifiche"}
          showChevron={false}
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.backgroundSecondary, true: colors.primary }}
              thumbColor={notificationsEnabled ? colors.buttonText : colors.surface}
            />
          }
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <SettingRow
          icon="settings"
          label={t.notifications?.settings || "Impostazioni notifiche"}
          onPress={() => (navigation as any).navigate("NotificationSettings")}
        />
      </Card>

      <Card style={styles.sectionCard}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          {t.settings?.privacy || "Privacy"}
        </ThemedText>
        
        <SettingRow
          icon="share-2"
          label={t.settings?.dataSharing || "Condivisione dati"}
          showChevron={false}
          rightElement={
            <Switch
              value={dataSharing}
              onValueChange={handleToggleDataSharing}
              trackColor={{ false: colors.backgroundSecondary, true: colors.primary }}
              thumbColor={dataSharing ? colors.buttonText : colors.surface}
            />
          }
        />
      </Card>

      <Card style={styles.sectionCard}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          {t.settings?.appearance || "Aspetto"}
        </ThemedText>
        
        <SettingRow
          icon="globe"
          label={t.profile?.language || "Lingua"}
          showChevron={false}
          rightElement={
            <View style={styles.languageSelector}>
              <Pressable
                style={[
                  styles.languageOption,
                  {
                    backgroundColor: language === "it" ? colors.primary : colors.backgroundSecondary,
                    borderTopLeftRadius: BorderRadius.sm,
                    borderBottomLeftRadius: BorderRadius.sm,
                  },
                ]}
                onPress={() => handleLanguageChange("it")}
              >
                <ThemedText
                  style={[
                    styles.languageOptionText,
                    { color: language === "it" ? colors.buttonText : colors.text },
                  ]}
                >
                  IT
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.languageOption,
                  {
                    backgroundColor: language === "en" ? colors.primary : colors.backgroundSecondary,
                    borderTopRightRadius: BorderRadius.sm,
                    borderBottomRightRadius: BorderRadius.sm,
                  },
                ]}
                onPress={() => handleLanguageChange("en")}
              >
                <ThemedText
                  style={[
                    styles.languageOptionText,
                    { color: language === "en" ? colors.buttonText : colors.text },
                  ]}
                >
                  EN
                </ThemedText>
              </Pressable>
            </View>
          }
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <SettingRow
          icon={isDark ? "moon" : "sun"}
          label={t.settings?.theme || "Tema"}
          value={isDark ? (t.settings?.dark || "Scuro") : (t.settings?.light || "Chiaro")}
          showChevron={false}
          rightElement={
            <Switch
              value={isDark}
              onValueChange={handleToggleTheme}
              trackColor={{ false: colors.backgroundSecondary, true: colors.primary }}
              thumbColor={isDark ? colors.buttonText : colors.surface}
            />
          }
        />
      </Card>

      <Card style={styles.sectionCard}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          {t.settings?.support || "Supporto"}
        </ThemedText>
        
        <SettingRow
          icon="help-circle"
          label={t.settings?.help || "Aiuto e FAQ"}
          onPress={() => (navigation as any).navigate("Help")}
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <SettingRow
          icon="mail"
          label={t.settings?.contact || "Contatta il supporto"}
          onPress={() => {}}
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <SettingRow
          icon="heart"
          label={t.donation?.title || "Supporta Kinova"}
          onPress={() => (navigation as any).navigate("Donation")}
        />
      </Card>

      <Card style={styles.sectionCard}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          {t.settings?.about || "Informazioni"}
        </ThemedText>
        
        <SettingRow
          icon="info"
          label={t.settings?.version || "Versione app"}
          value={appVersion}
          showChevron={false}
        />
      </Card>

      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          { borderColor: colors.error, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={handleLogout}
        testID="button-logout"
      >
        <Feather name="log-out" size={18} color={colors.error} />
        <ThemedText style={[styles.logoutText, { color: colors.error }]}>
          {t.auth.logout}
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.subtitle,
    marginBottom: Spacing.lg,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    ...Typography.body,
  },
  settingValue: {
    ...Typography.caption,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  languageSelector: {
    flexDirection: "row",
  },
  languageOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  languageOptionText: {
    ...Typography.caption,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  logoutText: {
    ...Typography.body,
    fontWeight: "600",
  },
});
