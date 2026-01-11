import React from "react";
import { View, StyleSheet, Pressable, Linking, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/lib/i18n";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";

interface HelpItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress?: () => void;
}

function HelpItem({ icon, title, description, onPress }: HelpItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card style={styles.helpCard}>
        <View style={[styles.helpIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={icon} size={24} color={theme.primary} />
        </View>
        <View style={styles.helpContent}>
          <ThemedText style={[styles.helpTitle, { color: theme.text }]}>{title}</ThemedText>
          <ThemedText style={[styles.helpDescription, { color: theme.textSecondary }]}>
            {description}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Card>
    </Pressable>
  );
}

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { language } = useI18n();

  const colors = isDark ? Colors.dark : Colors.light;

  const handleContactSupport = () => {
    Linking.openURL("mailto:support@kinova.app");
  };

  const faqItems = [
    {
      icon: "users" as const,
      title: language === "it" ? "Come invitare membri della famiglia?" : "How to invite family members?",
      description: language === "it"
        ? "Vai al profilo e usa il codice QR o il link di invito"
        : "Go to profile and use the QR code or invite link",
    },
    {
      icon: "calendar" as const,
      title: language === "it" ? "Come creare un evento?" : "How to create an event?",
      description: language === "it"
        ? "Tocca il pulsante + nel calendario per aggiungere eventi"
        : "Tap the + button in calendar to add events",
    },
    {
      icon: "list" as const,
      title: language === "it" ? "Come condividere liste?" : "How to share lists?",
      description: language === "it"
        ? "Le liste sono automaticamente condivise con la famiglia"
        : "Lists are automatically shared with your family",
    },
    {
      icon: "bell" as const,
      title: language === "it" ? "Come gestire le notifiche?" : "How to manage notifications?",
      description: language === "it"
        ? "Vai in Impostazioni > Notifiche per personalizzare"
        : "Go to Settings > Notifications to customize",
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: Spacing.xl,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.xl,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.headerSection}>
        <View style={[styles.headerIconContainer, { backgroundColor: colors.primary }]}>
          <Feather name="help-circle" size={32} color="#FFFFFF" />
        </View>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
          {language === "it" ? "Come possiamo aiutarti?" : "How can we help?"}
        </ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {language === "it"
            ? "Trova risposte alle domande frequenti o contattaci"
            : "Find answers to common questions or contact us"}
        </ThemedText>
      </View>

      <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
        {language === "it" ? "Domande frequenti" : "Frequently Asked Questions"}
      </ThemedText>

      {faqItems.map((item, index) => (
        <HelpItem
          key={index}
          icon={item.icon}
          title={item.title}
          description={item.description}
          onPress={() => {}}
        />
      ))}

      <ThemedText style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl }]}>
        {language === "it" ? "Hai bisogno di altro aiuto?" : "Need more help?"}
      </ThemedText>

      <Card style={styles.contactCard}>
        <View style={[styles.contactIconContainer, { backgroundColor: colors.secondary + "40" }]}>
          <Feather name="mail" size={24} color={colors.primary} />
        </View>
        <View style={styles.contactContent}>
          <ThemedText style={[styles.contactTitle, { color: colors.text }]}>
            {language === "it" ? "Contatta il supporto" : "Contact Support"}
          </ThemedText>
          <ThemedText style={[styles.contactDescription, { color: colors.textSecondary }]}>
            {language === "it"
              ? "Scrivici, risponderemo entro 24 ore"
              : "Write to us, we'll respond within 24 hours"}
          </ThemedText>
        </View>
        <Pressable
          onPress={handleContactSupport}
          style={[styles.contactButton, { backgroundColor: colors.primary }]}
        >
          <ThemedText style={[styles.contactButtonText, { color: colors.buttonText }]}>
            {language === "it" ? "Scrivi" : "Write"}
          </ThemedText>
        </Pressable>
      </Card>

      <View style={styles.footerSection}>
        <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
          Kinova v1.0.0
        </ThemedText>
        <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
          {language === "it" ? "La tua app di fiducia per la famiglia" : "Your trusted family app"}
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.title,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  headerSubtitle: {
    ...Typography.body,
    textAlign: "center",
  },
  sectionTitle: {
    ...Typography.subtitle,
    marginBottom: Spacing.lg,
  },
  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  helpIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    ...Typography.body,
    fontWeight: "600",
    marginBottom: 2,
  },
  helpDescription: {
    ...Typography.caption,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    ...Typography.body,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactDescription: {
    ...Typography.caption,
  },
  contactButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
  },
  contactButtonText: {
    ...Typography.caption,
    fontWeight: "600",
  },
  footerSection: {
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  footerText: {
    ...Typography.small,
    marginBottom: Spacing.xs,
  },
});
