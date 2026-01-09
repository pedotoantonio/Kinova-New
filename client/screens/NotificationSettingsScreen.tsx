import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Switch, ActivityIndicator, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/lib/i18n";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { queryClient, apiRequest } from "@/lib/query-client";

interface NotificationSettings {
  enabled: boolean;
  calendarEnabled: boolean;
  tasksEnabled: boolean;
  shoppingEnabled: boolean;
  budgetEnabled: boolean;
  aiEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  eventReminderMinutes: number;
}

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { t } = useI18n();

  const colors = isDark ? Colors.dark : Colors.light;

  const [localSettings, setLocalSettings] = useState<NotificationSettings | null>(null);

  const { data: settings, isLoading } = useQuery<NotificationSettings>({
    queryKey: ["/api/notification-settings"],
  });

  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationSettings>) => {
      return apiRequest("PUT", "/api/notification-settings", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
    },
  });

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalSettings(prev => prev ? { ...prev, [key]: value } : null);
    updateMutation.mutate({ [key]: value });
  };

  const handleReminderChange = (value: string) => {
    const minutes = parseInt(value) || 30;
    setLocalSettings(prev => prev ? { ...prev, eventReminderMinutes: minutes } : null);
    updateMutation.mutate({ eventReminderMinutes: minutes });
  };

  if (isLoading || !localSettings) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <Card style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Feather name="bell" size={20} color={colors.primary} />
            <ThemedText style={[styles.labelText, { color: colors.text }]}>
              {t.notifications.enabled}
            </ThemedText>
          </View>
          <Switch
            value={localSettings.enabled}
            onValueChange={(value) => handleToggle("enabled", value)}
            trackColor={{ false: colors.backgroundSecondary, true: colors.primary }}
            thumbColor={colors.buttonText}
          />
        </View>
      </Card>

      <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t.notifications.settings}
      </ThemedText>

      <Card style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Feather name="calendar" size={20} color={colors.textSecondary} />
            <ThemedText style={[styles.labelText, { color: colors.text }]}>
              {t.notifications.calendar}
            </ThemedText>
          </View>
          <Switch
            value={localSettings.calendarEnabled}
            onValueChange={(value) => handleToggle("calendarEnabled", value)}
            trackColor={{ false: colors.backgroundSecondary, true: colors.primary }}
            thumbColor={colors.buttonText}
            disabled={!localSettings.enabled}
          />
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />
        
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Feather name="check-square" size={20} color={colors.textSecondary} />
            <ThemedText style={[styles.labelText, { color: colors.text }]}>
              {t.notifications.tasks}
            </ThemedText>
          </View>
          <Switch
            value={localSettings.tasksEnabled}
            onValueChange={(value) => handleToggle("tasksEnabled", value)}
            trackColor={{ false: colors.backgroundSecondary, true: colors.primary }}
            thumbColor={colors.buttonText}
            disabled={!localSettings.enabled}
          />
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />
        
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Feather name="shopping-cart" size={20} color={colors.textSecondary} />
            <ThemedText style={[styles.labelText, { color: colors.text }]}>
              {t.notifications.shopping}
            </ThemedText>
          </View>
          <Switch
            value={localSettings.shoppingEnabled}
            onValueChange={(value) => handleToggle("shoppingEnabled", value)}
            trackColor={{ false: colors.backgroundSecondary, true: colors.primary }}
            thumbColor={colors.buttonText}
            disabled={!localSettings.enabled}
          />
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />
        
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Feather name="dollar-sign" size={20} color={colors.textSecondary} />
            <ThemedText style={[styles.labelText, { color: colors.text }]}>
              {t.notifications.budget}
            </ThemedText>
          </View>
          <Switch
            value={localSettings.budgetEnabled}
            onValueChange={(value) => handleToggle("budgetEnabled", value)}
            trackColor={{ false: colors.backgroundSecondary, true: colors.primary }}
            thumbColor={colors.buttonText}
            disabled={!localSettings.enabled}
          />
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />
        
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Feather name="cpu" size={20} color={colors.textSecondary} />
            <ThemedText style={[styles.labelText, { color: colors.text }]}>
              {t.notifications.ai}
            </ThemedText>
          </View>
          <Switch
            value={localSettings.aiEnabled}
            onValueChange={(value) => handleToggle("aiEnabled", value)}
            trackColor={{ false: colors.backgroundSecondary, true: colors.primary }}
            thumbColor={colors.buttonText}
            disabled={!localSettings.enabled}
          />
        </View>
      </Card>

      <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t.notifications.eventReminderMinutes}
      </ThemedText>

      <Card style={styles.card}>
        <View style={styles.reminderRow}>
          {[15, 30, 60].map((minutes) => (
            <Pressable
              key={minutes}
              style={[
                styles.reminderOption,
                { 
                  backgroundColor: localSettings.eventReminderMinutes === minutes 
                    ? colors.primary 
                    : colors.backgroundSecondary 
                },
              ]}
              onPress={() => handleReminderChange(String(minutes))}
            >
              <ThemedText style={[
                styles.reminderText,
                { 
                  color: localSettings.eventReminderMinutes === minutes 
                    ? colors.buttonText 
                    : colors.text 
                },
              ]}>
                {minutes} min
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Card>

      <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t.notifications.quietHours}
      </ThemedText>

      <Card style={styles.card}>
        <View style={styles.settingRow}>
          <ThemedText style={[styles.labelText, { color: colors.text }]}>
            {t.notifications.quietHoursStart}
          </ThemedText>
          <TextInput
            style={[styles.timeInput, { 
              backgroundColor: colors.backgroundSecondary, 
              color: colors.text,
              borderColor: colors.border,
            }]}
            value={localSettings.quietHoursStart || ""}
            onChangeText={(value) => {
              setLocalSettings(prev => prev ? { ...prev, quietHoursStart: value || null } : null);
            }}
            onBlur={() => {
              updateMutation.mutate({ quietHoursStart: localSettings.quietHoursStart });
            }}
            placeholder="22:00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />
        
        <View style={styles.settingRow}>
          <ThemedText style={[styles.labelText, { color: colors.text }]}>
            {t.notifications.quietHoursEnd}
          </ThemedText>
          <TextInput
            style={[styles.timeInput, { 
              backgroundColor: colors.backgroundSecondary, 
              color: colors.text,
              borderColor: colors.border,
            }]}
            value={localSettings.quietHoursEnd || ""}
            onChangeText={(value) => {
              setLocalSettings(prev => prev ? { ...prev, quietHoursEnd: value || null } : null);
            }}
            onBlur={() => {
              updateMutation.mutate({ quietHoursEnd: localSettings.quietHoursEnd });
            }}
            placeholder="07:00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    marginLeft: Spacing.xs,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  settingLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  labelText: {
    ...Typography.body,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  reminderRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: Spacing.sm,
  },
  reminderOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  reminderText: {
    ...Typography.body,
    fontWeight: "600",
  },
  timeInput: {
    ...Typography.body,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 80,
    textAlign: "center",
  },
});
