import React, { useState } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator, TextInput, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";

interface PaymentConfig {
  freeDonation: {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
    suggestedAmounts: number[];
    currency: string;
  };
}

export default function DonationScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();

  const colors = isDark ? Colors.dark : Colors.light;

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  const { data: config, isLoading } = useQuery<PaymentConfig>({
    queryKey: ["/api/payments/config"],
  });

  const donateMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest("POST", "/api/payments/create-donation-session", {
        amount,
        familyId: user?.familyId,
      });
      return response as { url: string; sessionId: string };
    },
    onSuccess: async (data) => {
      if (data.url) {
        await Linking.openURL(data.url);
      }
    },
  });

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setSelectedAmount(num);
    } else {
      setSelectedAmount(null);
    }
  };

  const handleDonate = () => {
    if (selectedAmount && config?.freeDonation.enabled) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      donateMutation.mutate(selectedAmount);
    }
  };

  const freeDonation = config?.freeDonation;
  const isValidAmount =
    selectedAmount !== null &&
    freeDonation &&
    selectedAmount >= freeDonation.minAmount &&
    selectedAmount <= freeDonation.maxAmount;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!freeDonation?.enabled) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight + Spacing.xl }]}>
        <Card style={styles.disabledCard}>
          <Feather name="heart" size={48} color={colors.textSecondary} />
          <ThemedText style={[styles.disabledText, { color: colors.textSecondary }]}>
            {t.donation.disabled}
          </ThemedText>
        </Card>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="heart" size={32} color={colors.primary} />
        </View>
        <ThemedText style={[styles.title, { color: colors.text }]}>{t.donation.title}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t.donation.subtitle}
        </ThemedText>
      </View>

      <Card style={styles.amountCard}>
        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
          {t.donation.selectAmount}
        </ThemedText>

        <View style={styles.amountGrid}>
          {freeDonation.suggestedAmounts.map((amount) => (
            <Pressable
              key={amount}
              style={[
                styles.amountButton,
                { borderColor: colors.border },
                selectedAmount === amount && !customAmount && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => handleSelectAmount(amount)}
              testID={`button-amount-${amount}`}
            >
              <ThemedText
                style={[
                  styles.amountText,
                  { color: selectedAmount === amount && !customAmount ? colors.buttonText : colors.text },
                ]}
              >
                {freeDonation.currency} {amount}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.customAmountContainer}>
          <ThemedText style={[styles.customLabel, { color: colors.textSecondary }]}>
            {t.donation.customAmount}
          </ThemedText>
          <View style={[styles.customInputContainer, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <ThemedText style={[styles.currencyLabel, { color: colors.textSecondary }]}>
              {freeDonation.currency}
            </ThemedText>
            <TextInput
              style={[styles.customInput, { color: colors.text }]}
              value={customAmount}
              onChangeText={handleCustomAmountChange}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              testID="input-custom-amount"
            />
          </View>
          <ThemedText style={[styles.rangeText, { color: colors.textSecondary }]}>
            {t.donation.minMax
              .replace("{min}", freeDonation.minAmount.toString())
              .replace("{max}", freeDonation.maxAmount.toString())
              .replace("{currency}", freeDonation.currency)}
          </ThemedText>
        </View>
      </Card>

      <Pressable
        style={[
          styles.donateButton,
          { backgroundColor: isValidAmount ? colors.primary : colors.border },
        ]}
        onPress={handleDonate}
        disabled={!isValidAmount || donateMutation.isPending}
        testID="button-donate"
      >
        {donateMutation.isPending ? (
          <ActivityIndicator size="small" color={colors.buttonText} />
        ) : (
          <>
            <Feather name="heart" size={20} color={isValidAmount ? colors.buttonText : colors.textSecondary} />
            <ThemedText
              style={[
                styles.donateButtonText,
                { color: isValidAmount ? colors.buttonText : colors.textSecondary },
              ]}
            >
              {t.donation.donate}
              {selectedAmount ? ` ${freeDonation.currency} ${selectedAmount}` : ""}
            </ThemedText>
          </>
        )}
      </Pressable>

      {donateMutation.isError && (
        <ThemedText style={[styles.errorText, { color: colors.error }]}>
          {t.donation.error}
        </ThemedText>
      )}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenPadding,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  amountCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  amountButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: "center",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "600",
  },
  customAmountContainer: {
    marginTop: Spacing.md,
  },
  customLabel: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  currencyLabel: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: Spacing.md,
  },
  rangeText: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  donateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  donateButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  errorText: {
    textAlign: "center",
    marginTop: Spacing.md,
    fontSize: 14,
  },
  disabledCard: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  disabledText: {
    marginTop: Spacing.md,
    fontSize: 16,
    textAlign: "center",
  },
});
