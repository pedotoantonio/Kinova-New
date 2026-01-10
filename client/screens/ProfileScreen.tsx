import React, { useState, useCallback } from "react";
import { View, Pressable, StyleSheet, Alert, ActivityIndicator, Platform, TextInput, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
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

interface FamilyMember {
  id: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  avatarUrl?: string | null;
}

interface Invite {
  id: string;
  code: string;
  role: UserRole;
  expiresAt: string;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const { t, language } = useI18n();
  const navigation = useNavigation();

  const colors = isDark ? Colors.dark : Colors.light;

  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("member");
  const [createdInvite, setCreatedInvite] = useState<Invite | null>(null);
  const [showFamilyNameModal, setShowFamilyNameModal] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");

  const { data: family } = useQuery<Family>({
    queryKey: ["/api/family"],
    enabled: isAuthenticated,
  });

  const { data: members = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family/members"],
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

  const updateFamilyNameMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("PUT", "/api/family", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      setShowFamilyNameModal(false);
      setNewFamilyName("");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async (role: UserRole): Promise<Invite> => {
      return apiRequest("POST", "/api/family/invite", { role }) as Promise<Invite>;
    },
    onSuccess: (data: Invite) => {
      setCreatedInvite(data);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const copyInviteCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (Platform.OS === "web") {
      alert(t.profile.codeCopied);
    } else {
      Alert.alert(t.profile.codeCopied);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      admin: t.family.admin,
      member: t.family.member,
      child: t.family.child,
    };
    return labels[role] || role;
  };

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
        <ThemedText style={{ color: colors.textSecondary }}>{t.auth.pleaseLogin}</ThemedText>
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
          <ThemedText style={[styles.avatarText, { color: colors.buttonText }]}>
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
              {t.profile.userId}
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
              {t.profile.familyId}
            </ThemedText>
            <ThemedText style={[styles.infoValue, { color: colors.text }]}>
              {user.familyId || t.profile.none}
            </ThemedText>
          </View>
        </View>
        
        <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />
        
        <View style={styles.infoRow}>
          <Feather name="shield" size={20} color={colors.textSecondary} />
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {t.profile.role}
            </ThemedText>
            <ThemedText style={[styles.infoValue, { color: colors.text }]}>
              {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : t.profile.member}
            </ThemedText>
          </View>
        </View>
      </Card>

      <Card style={styles.settingsCard}>
        <ThemedText style={[styles.settingsTitle, { color: colors.text }]}>
          {t.profile.settings}
        </ThemedText>
        
        {user.role === "admin" ? (
          <>
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
            <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />
          </>
        ) : null}
        
        <Pressable
          style={styles.settingsRow}
          onPress={() => (navigation as any).navigate("NotificationSettings")}
          testID="button-notification-settings"
        >
          <View style={styles.settingsRowLeft}>
            <Feather name="bell" size={20} color={colors.primary} />
            <View style={styles.settingsRowContent}>
              <ThemedText style={[styles.settingsLabel, { color: colors.textSecondary }]}>
                {t.notifications.settings}
              </ThemedText>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </Pressable>
      </Card>

      <Card style={styles.familyCard}>
        <View style={styles.familySectionHeader}>
          <ThemedText style={[styles.settingsTitle, { color: colors.text }]}>
            {t.profile.familySection}
          </ThemedText>
          {user.role === "admin" ? (
            <Pressable
              onPress={() => {
                setNewFamilyName(family?.name || "");
                setShowFamilyNameModal(true);
              }}
              hitSlop={8}
              testID="button-edit-family-name"
            >
              <Feather name="edit-2" size={18} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.familyNameRow}>
          <Feather name="home" size={20} color={colors.textSecondary} />
          <ThemedText style={[styles.familyNameText, { color: colors.text }]}>
            {family?.name || t.profile.none}
          </ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />

        <ThemedText style={[styles.membersTitle, { color: colors.textSecondary }]}>
          {t.profile.familyMembers} ({members.length})
        </ThemedText>

        {members.length > 0 ? (
          <View style={styles.membersList}>
            {members.map((member) => (
              <View key={member.id} style={styles.memberItem}>
                <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                  <ThemedText style={[styles.memberAvatarText, { color: colors.buttonText }]}>
                    {(member.displayName || member.username).charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.memberInfo}>
                  <ThemedText style={[styles.memberName, { color: colors.text }]}>
                    {member.displayName || member.username}
                    {member.id === user.id ? ` (${t.family.you})` : ""}
                  </ThemedText>
                  <ThemedText style={[styles.memberRole, { color: colors.textSecondary }]}>
                    {getRoleLabel(member.role)}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <ThemedText style={[styles.noMembers, { color: colors.textSecondary }]}>
            {t.profile.noMembers}
          </ThemedText>
        )}

        {user.role === "admin" ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.backgroundSecondary }]} />
            <Pressable
              style={[styles.inviteButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setCreatedInvite(null);
                setSelectedRole("member");
                setShowInviteModal(true);
              }}
              testID="button-invite-member"
            >
              <Feather name="user-plus" size={18} color={colors.buttonText} />
              <ThemedText style={[styles.inviteButtonText, { color: colors.buttonText }]}>
                {t.profile.inviteMember}
              </ThemedText>
            </Pressable>
          </>
        ) : null}
      </Card>

      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          { backgroundColor: colors.error, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={handleLogout}
        testID="button-logout"
        accessibilityLabel={t.auth.logout}
        accessibilityRole="button"
      >
        <Feather name="log-out" size={20} color={colors.buttonText} />
        <ThemedText style={[styles.logoutText, { color: colors.buttonText }]}>{t.auth.logout}</ThemedText>
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

      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                {t.profile.inviteMember}
              </ThemedText>
              <Pressable onPress={() => setShowInviteModal(false)} hitSlop={8}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>

            {createdInvite ? (
              <View style={styles.inviteResult}>
                <ThemedText style={[styles.inviteResultText, { color: colors.text }]}>
                  {t.profile.inviteCreated}
                </ThemedText>
                <View style={[styles.inviteCodeBox, { backgroundColor: colors.backgroundSecondary }]}>
                  <ThemedText style={[styles.inviteCodeText, { color: colors.primary }]}>
                    {createdInvite.code}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.inviteExpiry, { color: colors.textSecondary }]}>
                  {t.profile.inviteExpires}: {new Date(createdInvite.expiresAt).toLocaleDateString()}
                </ThemedText>
                <Pressable
                  style={[styles.copyButton, { backgroundColor: colors.primary }]}
                  onPress={() => copyInviteCode(createdInvite.code)}
                >
                  <Feather name="copy" size={16} color={colors.buttonText} />
                  <ThemedText style={[styles.copyButtonText, { color: colors.buttonText }]}>
                    {t.profile.copyCode}
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.inviteForm}>
                <ThemedText style={[styles.selectRoleLabel, { color: colors.textSecondary }]}>
                  {t.profile.selectRole}
                </ThemedText>
                <View style={styles.roleButtons}>
                  {(["member", "child"] as UserRole[]).map((role) => (
                    <Pressable
                      key={role}
                      style={[
                        styles.roleButton,
                        {
                          backgroundColor: selectedRole === role ? colors.primary : colors.backgroundSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => setSelectedRole(role)}
                    >
                      <ThemedText
                        style={[
                          styles.roleButtonText,
                          { color: selectedRole === role ? colors.buttonText : colors.text },
                        ]}
                      >
                        {getRoleLabel(role)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  style={[styles.createInviteButton, { backgroundColor: colors.primary }]}
                  onPress={() => createInviteMutation.mutate(selectedRole)}
                  disabled={createInviteMutation.isPending}
                >
                  {createInviteMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.buttonText} />
                  ) : (
                    <ThemedText style={[styles.createInviteButtonText, { color: colors.buttonText }]}>
                      {t.common.create}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFamilyNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFamilyNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                {t.profile.editFamilyName}
              </ThemedText>
              <Pressable onPress={() => setShowFamilyNameModal(false)} hitSlop={8}>
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
              placeholder={t.profile.familyName}
              placeholderTextColor={colors.textSecondary}
              value={newFamilyName}
              onChangeText={setNewFamilyName}
              autoFocus
            />

            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={() => updateFamilyNameMutation.mutate(newFamilyName)}
              disabled={!newFamilyName.trim() || updateFamilyNameMutation.isPending}
            >
              {updateFamilyNameMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <ThemedText style={[styles.saveButtonText, { color: colors.buttonText }]}>
                  {t.common.save}
                </ThemedText>
              )}
            </Pressable>
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
  familyCard: {
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  familySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  familyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  familyNameText: {
    ...Typography.body,
    fontWeight: "500",
  },
  membersTitle: {
    ...Typography.caption,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  membersList: {
    gap: Spacing.sm,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  memberInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  memberName: {
    ...Typography.body,
    fontWeight: "500",
  },
  memberRole: {
    ...Typography.caption,
  },
  noMembers: {
    ...Typography.body,
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
  inviteButton: {
    flexDirection: "row",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  inviteButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  inviteResult: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  inviteResultText: {
    ...Typography.body,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  inviteCodeBox: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  inviteCodeText: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 2,
  },
  inviteExpiry: {
    ...Typography.caption,
    marginBottom: Spacing.lg,
  },
  copyButton: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    gap: Spacing.sm,
  },
  copyButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  inviteForm: {
    paddingVertical: Spacing.md,
  },
  selectRoleLabel: {
    ...Typography.caption,
    marginBottom: Spacing.md,
  },
  roleButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  roleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  roleButtonText: {
    ...Typography.body,
    fontWeight: "500",
  },
  createInviteButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  createInviteButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  saveButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  saveButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
});
