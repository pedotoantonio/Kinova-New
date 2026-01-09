import React, { useState, useCallback } from "react";
import { View, Pressable, StyleSheet, Alert, ActivityIndicator, Platform, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth, UserRole } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { queryClient, apiRequest } from "@/lib/query-client";
import { searchCities, GeocodingResult } from "@/lib/weather";

interface Family {
  id: string;
  name: string;
  city?: string | null;
  cityLat?: string | null;
  cityLon?: string | null;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const { t, language } = useI18n();

  const colors = isDark ? Colors.dark : Colors.light;

  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: family } = useQuery<Family>({
    queryKey: ["/api/family"],
    enabled: isAuthenticated,
  });

  const updateCityMutation = useMutation({
    mutationFn: async (cityData: { city: string; cityLat: number; cityLon: number }) => {
      return apiRequest("PUT", "/api/family", cityData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      queryClient.invalidateQueries({ queryKey: ["weather"] });
      setShowCityModal(false);
      setCitySearch("");
      setCityResults([]);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const handleCitySearch = useCallback(async (query: string) => {
    setCitySearch(query);
    if (query.length < 2) {
      setCityResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchCities(query, language as "it" | "en");
      setCityResults(results);
    } catch (error) {
      console.error("City search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [language]);

  const selectCity = (city: GeocodingResult) => {
    updateCityMutation.mutate({
      city: city.admin1 ? `${city.name}, ${city.admin1}` : city.name,
      cityLat: city.latitude,
      cityLon: city.longitude,
    });
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
      if (window.confirm("Are you sure you want to logout?")) {
        performLogout();
      }
    } else {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Logout",
            style: "destructive",
            onPress: performLogout,
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={{ color: colors.textSecondary }}>Please log in</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <ThemedText style={styles.avatarText}>
            {(user.displayName || user.username).charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <ThemedText style={[styles.displayName, { color: colors.text }]}>
          {user.displayName || user.username}
        </ThemedText>
        <ThemedText style={[styles.username, { color: colors.textSecondary }]}>
          @{user.username}
        </ThemedText>
      </View>

      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Feather name="user" size={20} color={colors.textSecondary} />
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>
              User ID
            </ThemedText>
            <ThemedText style={[styles.infoValue, { color: colors.text }]}>
              {user.id}
            </ThemedText>
          </View>
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />
        
        <View style={styles.infoRow}>
          <Feather name="users" size={20} color={colors.textSecondary} />
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Family ID
            </ThemedText>
            <ThemedText style={[styles.infoValue, { color: colors.text }]}>
              {user.familyId || "None"}
            </ThemedText>
          </View>
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />
        
        <View style={styles.infoRow}>
          <Feather name="shield" size={20} color={colors.textSecondary} />
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Role
            </ThemedText>
            <ThemedText style={[styles.infoValue, { color: colors.text }]}>
              {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Member"}
            </ThemedText>
          </View>
        </View>
      </Card>

      {user.role === "admin" ? (
        <Card style={styles.settingsCard}>
          <ThemedText style={[styles.settingsTitle, { color: colors.text }]}>
            {t.profile.settings}
          </ThemedText>
          
          <Pressable
            style={styles.settingsRow}
            onPress={() => setShowCityModal(true)}
            testID="button-select-city"
          >
            <View style={styles.settingsRowLeft}>
              <Feather name="map-pin" size={20} color={colors.primary} />
              <View style={styles.settingsRowContent}>
                <ThemedText style={[styles.settingsLabel, { color: colors.textSecondary }]}>
                  {t.profile.city}
                </ThemedText>
                <ThemedText style={[styles.settingsValue, { color: colors.text }]}>
                  {family?.city || t.weather.noCity}
                </ThemedText>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>
        </Card>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          { backgroundColor: colors.error, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={handleLogout}
        testID="button-logout"
      >
        <Feather name="log-out" size={20} color="#FFFFFF" />
        <ThemedText style={styles.logoutText}>Logout</ThemedText>
      </Pressable>

      <Modal
        visible={showCityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                {t.profile.selectCity}
              </ThemedText>
              <Pressable onPress={() => setShowCityModal(false)} hitSlop={8}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>
            
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder={t.profile.searchCity}
              placeholderTextColor={colors.textSecondary}
              value={citySearch}
              onChangeText={handleCitySearch}
              autoFocus
            />
            
            {isSearching ? (
              <View style={styles.searchingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : cityResults.length > 0 ? (
              <View style={styles.cityResultsList}>
                {cityResults.map((city) => (
                  <Pressable
                    key={city.id}
                    style={({ pressed }) => [
                      styles.cityResultItem,
                      { backgroundColor: pressed ? colors.backgroundSecondary : "transparent" },
                    ]}
                    onPress={() => selectCity(city)}
                    testID={`city-result-${city.id}`}
                  >
                    <View style={styles.cityResultContent}>
                      <ThemedText style={[styles.cityName, { color: colors.text }]}>
                        {city.name}
                      </ThemedText>
                      <ThemedText style={[styles.cityRegion, { color: colors.textSecondary }]}>
                        {city.admin1 ? `${city.admin1}, ` : ""}{city.country}
                      </ThemedText>
                    </View>
                    <Feather name="map-pin" size={16} color={colors.textSecondary} />
                  </Pressable>
                ))}
              </View>
            ) : citySearch.length >= 2 ? (
              <ThemedText style={[styles.noResults, { color: colors.textSecondary }]}>
                {t.profile.noResults}
              </ThemedText>
            ) : null}
            
            {updateCityMutation.isPending ? (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  displayName: {
    ...Typography.title,
    marginBottom: Spacing.xs,
  },
  username: {
    ...Typography.body,
  },
  infoCard: {
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  infoContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  infoLabel: {
    ...Typography.caption,
  },
  infoValue: {
    ...Typography.body,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  logoutButton: {
    flexDirection: "row",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoutText: {
    color: "#FFFFFF",
    ...Typography.body,
    fontWeight: "600",
  },
  settingsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  settingsTitle: {
    ...Typography.subtitle,
    marginBottom: Spacing.md,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingsRowContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  settingsLabel: {
    ...Typography.caption,
  },
  settingsValue: {
    ...Typography.body,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.subtitle,
  },
  searchInput: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body.fontSize,
    marginBottom: Spacing.md,
  },
  searchingIndicator: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  cityResultsList: {
    maxHeight: 300,
  },
  cityResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  cityResultContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  cityName: {
    ...Typography.body,
    fontWeight: "500",
  },
  cityRegion: {
    ...Typography.caption,
    marginTop: 2,
  },
  noResults: {
    ...Typography.body,
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
  savingIndicator: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
});
