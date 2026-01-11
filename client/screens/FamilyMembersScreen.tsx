import React, { useState } from "react";
import { View, Pressable, StyleSheet, ScrollView, Modal, Switch, TextInput, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { useQuery, useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth, UserRole } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { queryClient, apiRequest } from "@/lib/query-client";

interface FamilyMember {
  id: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName: string | null;
  birthDate?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  permissions: {
    canViewCalendar: boolean;
    canViewTasks: boolean;
    canViewShopping: boolean;
    canViewBudget: boolean;
    canViewPlaces: boolean;
    canModifyItems: boolean;
  };
}

interface Invite {
  id: string;
  code: string;
  role: UserRole;
  displayName?: string;
  expiresAt: string;
  permissions: {
    canViewCalendar: boolean;
    canViewTasks: boolean;
    canViewShopping: boolean;
    canViewBudget: boolean;
    canViewPlaces: boolean;
    canModifyItems: boolean;
  };
}

const PERMISSION_LABELS = {
  canViewCalendar: { it: "Calendario", en: "Calendar" },
  canViewTasks: { it: "Attività", en: "Tasks" },
  canViewShopping: { it: "Spesa", en: "Shopping" },
  canViewBudget: { it: "Budget", en: "Budget" },
  canViewPlaces: { it: "Luoghi", en: "Places" },
  canModifyItems: { it: "Modifica elementi", en: "Edit items" },
};

export default function FamilyMembersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { t, language } = useI18n();
  const colors = isDark ? Colors.dark : Colors.light;

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [createdInvite, setCreatedInvite] = useState<Invite | null>(null);

  const [inviteForm, setInviteForm] = useState({
    role: "member" as UserRole,
    displayName: "",
    canViewCalendar: true,
    canViewTasks: true,
    canViewShopping: true,
    canViewBudget: false,
    canViewPlaces: true,
    canModifyItems: true,
  });

  const [editForm, setEditForm] = useState({
    displayName: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    canViewCalendar: true,
    canViewTasks: true,
    canViewShopping: true,
    canViewBudget: false,
    canViewPlaces: true,
    canModifyItems: true,
  });

  const { data: members = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family/members"],
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: typeof inviteForm): Promise<Invite> => {
      return apiRequest("POST", "/api/family/invite", data) as Promise<Invite>;
    },
    onSuccess: (data: Invite) => {
      setCreatedInvite(data);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editForm }) => {
      return apiRequest("PATCH", `/api/family/members/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family/members"] });
      setShowEditModal(false);
      setSelectedMember(null);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest("DELETE", `/api/family/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family/members"] });
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
    Alert.alert(language === "it" ? "Copiato" : "Copied", language === "it" ? "Codice copiato negli appunti" : "Code copied to clipboard");
  };

  const handleCreateInvite = () => {
    createInviteMutation.mutate(inviteForm);
  };

  const handleEditMember = (member: FamilyMember) => {
    setSelectedMember(member);
    setEditForm({
      displayName: member.displayName || "",
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      birthDate: member.birthDate ? member.birthDate.split("T")[0] : "",
      canViewCalendar: member.permissions.canViewCalendar,
      canViewTasks: member.permissions.canViewTasks,
      canViewShopping: member.permissions.canViewShopping,
      canViewBudget: member.permissions.canViewBudget,
      canViewPlaces: member.permissions.canViewPlaces,
      canModifyItems: member.permissions.canModifyItems,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!selectedMember) return;
    updateMemberMutation.mutate({ id: selectedMember.id, data: editForm });
  };

  const handleRemoveMember = (member: FamilyMember) => {
    const title = language === "it" ? "Rimuovi membro" : "Remove member";
    const message = language === "it" 
      ? `Vuoi rimuovere ${member.displayName || member.username} dalla famiglia?` 
      : `Do you want to remove ${member.displayName || member.username} from the family?`;
    
    Alert.alert(title, message, [
      { text: language === "it" ? "Annulla" : "Cancel", style: "cancel" },
      { 
        text: language === "it" ? "Rimuovi" : "Remove", 
        style: "destructive",
        onPress: () => removeMemberMutation.mutate(member.id),
      },
    ]);
  };

  const getRoleLabel = (role: UserRole) => {
    const labels = {
      admin: language === "it" ? "Amministratore" : "Administrator",
      member: language === "it" ? "Membro" : "Member",
      child: language === "it" ? "Bambino" : "Child",
    };
    return labels[role];
  };

  const resetInviteModal = () => {
    setShowInviteModal(false);
    setCreatedInvite(null);
    setInviteForm({
      role: "member",
      displayName: "",
      canViewCalendar: true,
      canViewTasks: true,
      canViewShopping: true,
      canViewBudget: false,
      canViewPlaces: true,
      canModifyItems: true,
    });
  };

  const isAdmin = user?.role === "admin";

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: headerHeight + Spacing.screenPadding, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            {language === "it" ? "Membri della famiglia" : "Family members"}
          </ThemedText>
          {isAdmin && (
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowInviteModal(true)}
              hitSlop={8}
            >
              <Feather name="user-plus" size={20} color="#fff" />
            </Pressable>
          )}
        </View>

        {members.map((member) => (
          <Card key={member.id} style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                <ThemedText style={[styles.avatarText, { color: colors.primary }]}>
                  {(member.displayName || member.username).charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.memberInfo}>
                <ThemedText style={[styles.memberName, { color: theme.text }]}>
                  {member.displayName || member.username}
                </ThemedText>
                {(member.firstName || member.lastName) && (
                  <ThemedText style={[styles.memberFullName, { color: theme.textSecondary }]}>
                    {[member.firstName, member.lastName].filter(Boolean).join(" ")}
                  </ThemedText>
                )}
                <ThemedText style={[styles.memberRole, { color: colors.primary }]}>
                  {getRoleLabel(member.role)}
                </ThemedText>
              </View>
              {isAdmin && member.id !== user?.id && (
                <View style={styles.memberActions}>
                  <Pressable
                    style={[styles.iconButton, { backgroundColor: colors.secondary + "20" }]}
                    onPress={() => handleEditMember(member)}
                    hitSlop={8}
                  >
                    <Feather name="edit-2" size={16} color={colors.secondary} />
                  </Pressable>
                  <Pressable
                    style={[styles.iconButton, { backgroundColor: "#F4433620" }]}
                    onPress={() => handleRemoveMember(member)}
                    hitSlop={8}
                  >
                    <Feather name="trash-2" size={16} color="#F44336" />
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.permissionsGrid}>
              {Object.entries(member.permissions).map(([key, value]) => (
                <View key={key} style={[styles.permissionBadge, { backgroundColor: value ? colors.primary + "20" : theme.backgroundDefault }]}>
                  <Feather name={value ? "check" : "x"} size={12} color={value ? colors.primary : theme.textSecondary} />
                  <ThemedText style={[styles.permissionLabel, { color: value ? colors.primary : theme.textSecondary }]}>
                    {PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS][language]}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>
        ))}
      </ScrollView>

      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                {language === "it" ? "Nuovo invito" : "New invite"}
              </ThemedText>
              <Pressable onPress={resetInviteModal} hitSlop={8}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {createdInvite ? (
              <View style={styles.qrContainer}>
                <ThemedText style={[styles.qrLabel, { color: theme.text }]}>
                  {language === "it" ? "Scansiona il QR code o condividi il codice" : "Scan QR code or share the code"}
                </ThemedText>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={`kinova://join/${createdInvite.code}`}
                    size={200}
                    backgroundColor={isDark ? "#333" : "#fff"}
                    color={isDark ? "#fff" : "#000"}
                  />
                </View>
                <View style={styles.codeContainer}>
                  <ThemedText style={[styles.inviteCode, { color: colors.primary }]}>
                    {createdInvite.code}
                  </ThemedText>
                  <Pressable
                    style={[styles.copyButton, { backgroundColor: colors.primary }]}
                    onPress={() => copyInviteCode(createdInvite.code)}
                    hitSlop={8}
                  >
                    <Feather name="copy" size={16} color="#fff" />
                    <ThemedText style={styles.copyButtonText}>
                      {language === "it" ? "Copia" : "Copy"}
                    </ThemedText>
                  </Pressable>
                </View>
                <ThemedText style={[styles.expiryText, { color: theme.textSecondary }]}>
                  {language === "it" ? "Scade tra 7 giorni" : "Expires in 7 days"}
                </ThemedText>
              </View>
            ) : (
              <ScrollView style={styles.formScroll}>
                <View style={styles.formSection}>
                  <ThemedText style={[styles.formLabel, { color: theme.text }]}>
                    {language === "it" ? "Nome visualizzato" : "Display name"}
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border }]}
                    value={inviteForm.displayName}
                    onChangeText={(text) => setInviteForm({ ...inviteForm, displayName: text })}
                    placeholder={language === "it" ? "Es. Mamma, Papà, Luca..." : "E.g. Mom, Dad, Luke..."}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.formSection}>
                  <ThemedText style={[styles.formLabel, { color: theme.text }]}>
                    {language === "it" ? "Ruolo" : "Role"}
                  </ThemedText>
                  <View style={styles.roleButtons}>
                    {(["member", "child"] as UserRole[]).map((role) => (
                      <Pressable
                        key={role}
                        style={[
                          styles.roleButton,
                          { borderColor: colors.primary },
                          inviteForm.role === role && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => {
                          if (Platform.OS !== "web") Haptics.selectionAsync();
                          const defaults = role === "child" 
                            ? { canViewBudget: false, canViewShopping: false, canModifyItems: false }
                            : { canViewBudget: false, canModifyItems: true };
                          setInviteForm({ ...inviteForm, role, ...defaults });
                        }}
                      >
                        <ThemedText style={[styles.roleButtonText, { color: inviteForm.role === role ? "#fff" : colors.primary }]}>
                          {getRoleLabel(role)}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.formSection}>
                  <ThemedText style={[styles.formLabel, { color: theme.text }]}>
                    {language === "it" ? "Permessi" : "Permissions"}
                  </ThemedText>
                  {Object.keys(PERMISSION_LABELS).map((key) => (
                    <View key={key} style={styles.permissionRow}>
                      <ThemedText style={[styles.permissionText, { color: theme.text }]}>
                        {PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS][language]}
                      </ThemedText>
                      <Switch
                        value={inviteForm[key as keyof typeof inviteForm] as boolean}
                        onValueChange={(value) => {
                          if (Platform.OS !== "web") Haptics.selectionAsync();
                          setInviteForm({ ...inviteForm, [key]: value });
                        }}
                        trackColor={{ false: theme.border, true: colors.primary + "80" }}
                        thumbColor={inviteForm[key as keyof typeof inviteForm] ? colors.primary : "#f4f3f4"}
                      />
                    </View>
                  ))}
                </View>

                <Pressable
                  style={[styles.createButton, { backgroundColor: colors.primary }]}
                  onPress={handleCreateInvite}
                  disabled={createInviteMutation.isPending}
                >
                  <ThemedText style={styles.createButtonText}>
                    {createInviteMutation.isPending 
                      ? (language === "it" ? "Creazione..." : "Creating...") 
                      : (language === "it" ? "Genera QR Code" : "Generate QR Code")}
                  </ThemedText>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                {language === "it" ? "Modifica membro" : "Edit member"}
              </ThemedText>
              <Pressable onPress={() => setShowEditModal(false)} hitSlop={8}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.formSection}>
                <ThemedText style={[styles.formLabel, { color: theme.text }]}>
                  {language === "it" ? "Nome" : "First name"}
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border }]}
                  value={editForm.firstName}
                  onChangeText={(text) => setEditForm({ ...editForm, firstName: text })}
                  placeholder={language === "it" ? "Nome" : "First name"}
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.formSection}>
                <ThemedText style={[styles.formLabel, { color: theme.text }]}>
                  {language === "it" ? "Cognome" : "Last name"}
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border }]}
                  value={editForm.lastName}
                  onChangeText={(text) => setEditForm({ ...editForm, lastName: text })}
                  placeholder={language === "it" ? "Cognome" : "Last name"}
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.formSection}>
                <ThemedText style={[styles.formLabel, { color: theme.text }]}>
                  {language === "it" ? "Data di nascita" : "Birth date"}
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: theme.border }]}
                  value={editForm.birthDate}
                  onChangeText={(text) => setEditForm({ ...editForm, birthDate: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                />
                <ThemedText style={[styles.hintText, { color: theme.textSecondary }]}>
                  {language === "it" 
                    ? "La data verrà aggiunta automaticamente al calendario come promemoria annuale" 
                    : "The date will be automatically added to the calendar as a yearly reminder"}
                </ThemedText>
              </View>

              <View style={styles.formSection}>
                <ThemedText style={[styles.formLabel, { color: theme.text }]}>
                  {language === "it" ? "Permessi" : "Permissions"}
                </ThemedText>
                {Object.keys(PERMISSION_LABELS).map((key) => (
                  <View key={key} style={styles.permissionRow}>
                    <ThemedText style={[styles.permissionText, { color: theme.text }]}>
                      {PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS][language]}
                    </ThemedText>
                    <Switch
                      value={editForm[key as keyof typeof editForm] as boolean}
                      onValueChange={(value) => {
                        if (Platform.OS !== "web") Haptics.selectionAsync();
                        setEditForm({ ...editForm, [key]: value });
                      }}
                      trackColor={{ false: theme.border, true: colors.primary + "80" }}
                      thumbColor={editForm[key as keyof typeof editForm] ? colors.primary : "#f4f3f4"}
                    />
                  </View>
                ))}
              </View>

              <Pressable
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
                disabled={updateMemberMutation.isPending}
              >
                <ThemedText style={styles.createButtonText}>
                  {updateMemberMutation.isPending 
                    ? (language === "it" ? "Salvataggio..." : "Saving...") 
                    : (language === "it" ? "Salva modifiche" : "Save changes")}
                </ThemedText>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.screenPadding,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.title,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  memberCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    ...Typography.subtitle,
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...Typography.body,
    fontWeight: "600",
  },
  memberFullName: {
    ...Typography.caption,
    marginTop: 2,
  },
  memberRole: {
    ...Typography.caption,
    marginTop: 2,
    fontWeight: "500",
  },
  memberActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  permissionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  permissionLabel: {
    ...Typography.caption,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: "85%",
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
  formScroll: {
    flexGrow: 0,
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    ...Typography.body,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  hintText: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  roleButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  roleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  roleButtonText: {
    ...Typography.body,
    fontWeight: "500",
  },
  permissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  permissionText: {
    ...Typography.body,
  },
  createButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  createButtonText: {
    ...Typography.body,
    fontWeight: "600",
    color: "#fff",
  },
  qrContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  qrLabel: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  qrWrapper: {
    padding: Spacing.lg,
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  inviteCode: {
    ...Typography.title,
    fontWeight: "700",
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  copyButtonText: {
    ...Typography.body,
    fontWeight: "500",
    color: "#fff",
  },
  expiryText: {
    ...Typography.caption,
    marginTop: Spacing.md,
  },
});
