import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { queryClient } from "@/lib/query-client";

export default function QRScannerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const { acceptInvite } = useAuth();
  const { t } = useI18n();
  const colors = isDark ? Colors.dark : Colors.light;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      await acceptInvite(code);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      queryClient.invalidateQueries({ queryKey: ["/api/family/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      Alert.alert(t.family.joinSuccess, "", [
        { text: t.common.confirm, onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t.common.error, error.message || t.family.invalidCode);
      setScanned(false);
    },
  });

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || joinMutation.isPending) return;
    setScanned(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let code = data;
    if (data.startsWith("kinova://join/")) {
      code = data.replace("kinova://join/", "");
    }

    joinMutation.mutate(code);
  };

  const handleManualJoin = () => {
    if (!manualCode.trim() || joinMutation.isPending) return;
    joinMutation.mutate(manualCode.trim());
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundDefault }]}>
        <View style={[styles.centered, { paddingTop: insets.top + Spacing.xl }]}>
          <Feather name="smartphone" size={64} color={colors.textSecondary} />
          <ThemedText style={[styles.permissionTitle, { color: colors.text, marginTop: Spacing.lg }]}>
            {t.family.webNotSupported}
          </ThemedText>

          <Card style={[styles.manualCard, { marginTop: Spacing.xl }]}>
            <ThemedText style={[styles.manualLabel, { color: colors.textSecondary }]}>
              {t.family.manualEntry}
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder={t.family.inviteCodePlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={[
                styles.joinButton,
                { backgroundColor: colors.primary, opacity: joinMutation.isPending ? 0.6 : 1 },
              ]}
              onPress={handleManualJoin}
              disabled={joinMutation.isPending}
            >
              <ThemedText style={[styles.joinButtonText, { color: colors.buttonText }]}>
                {joinMutation.isPending ? t.family.joining : t.family.join}
              </ThemedText>
            </Pressable>
          </Card>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundDefault }]}>
        <View style={styles.centered}>
          <ThemedText style={{ color: colors.textSecondary }}>{t.common.loading}</ThemedText>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain !== false;

    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundDefault }]}>
        <View style={[styles.centered, { paddingTop: insets.top + Spacing.xl }]}>
          <Feather name="camera-off" size={64} color={colors.textSecondary} />
          <ThemedText style={[styles.permissionTitle, { color: colors.text }]}>
            {t.family.cameraPermissionRequired}
          </ThemedText>
          <ThemedText style={[styles.permissionText, { color: colors.textSecondary }]}>
            {t.family.cameraPermissionText}
          </ThemedText>

          {canAskAgain ? (
            <Pressable
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
            >
              <ThemedText style={[styles.permissionButtonText, { color: colors.buttonText }]}>
                {t.family.enableCamera}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={async () => {
                try {
                  await Linking.openSettings();
                } catch {}
              }}
            >
              <ThemedText style={[styles.permissionButtonText, { color: colors.buttonText }]}>
                {t.family.openSettings}
              </ThemedText>
            </Pressable>
          )}

          <Pressable
            style={[styles.manualEntryLink, { marginTop: Spacing.xl }]}
            onPress={() => setShowManualInput(true)}
          >
            <ThemedText style={[styles.manualEntryText, { color: colors.primary }]}>
              {t.family.manualEntry}
            </ThemedText>
          </Pressable>

          {showManualInput ? (
            <Card style={[styles.manualCard, { marginTop: Spacing.lg }]}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder={t.family.inviteCodePlaceholder}
                placeholderTextColor={colors.textSecondary}
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.manualButtons}>
                <Pressable
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setShowManualInput(false)}
                >
                  <ThemedText style={{ color: colors.text }}>{t.common.cancel}</ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.joinButton,
                    { backgroundColor: colors.primary, flex: 1, opacity: joinMutation.isPending ? 0.6 : 1 },
                  ]}
                  onPress={handleManualJoin}
                  disabled={joinMutation.isPending}
                >
                  <ThemedText style={[styles.joinButtonText, { color: colors.buttonText }]}>
                    {joinMutation.isPending ? t.family.joining : t.family.join}
                  </ThemedText>
                </Pressable>
              </View>
            </Card>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDefault }]}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={[styles.overlay, { paddingTop: insets.top + Spacing.md }]}>
        <ThemedText style={styles.overlayTitle}>{t.family.scanQR}</ThemedText>
        <ThemedText style={styles.overlaySubtitle}>{t.family.scanQRSubtitle}</ThemedText>
      </View>

      <View style={styles.scanFrame}>
        <View style={[styles.cornerTL, { borderColor: colors.primary }]} />
        <View style={[styles.cornerTR, { borderColor: colors.primary }]} />
        <View style={[styles.cornerBL, { borderColor: colors.primary }]} />
        <View style={[styles.cornerBR, { borderColor: colors.primary }]} />
      </View>

      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {scanned ? (
          joinMutation.isPending ? (
            <ThemedText style={styles.scanningText}>{t.family.joining}</ThemedText>
          ) : (
            <Pressable
              style={[styles.scanAgainButton, { backgroundColor: colors.primary }]}
              onPress={() => setScanned(false)}
            >
              <ThemedText style={[styles.scanAgainText, { color: colors.buttonText }]}>
                {t.family.scanAgain}
              </ThemedText>
            </Pressable>
          )
        ) : null}

        <Pressable
          style={styles.manualEntryLink}
          onPress={() => setShowManualInput(true)}
        >
          <ThemedText style={styles.manualEntryText}>{t.family.manualEntry}</ThemedText>
        </Pressable>

        {showManualInput ? (
          <Card style={[styles.manualCard, { backgroundColor: colors.backgroundSecondary }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder={t.family.inviteCodePlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.manualButtons}>
              <Pressable
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowManualInput(false)}
              >
                <ThemedText style={{ color: colors.text }}>{t.common.cancel}</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.joinButton,
                  { backgroundColor: colors.primary, flex: 1, opacity: joinMutation.isPending ? 0.6 : 1 },
                ]}
                onPress={handleManualJoin}
                disabled={joinMutation.isPending}
              >
                <ThemedText style={[styles.joinButtonText, { color: colors.buttonText }]}>
                  {joinMutation.isPending ? t.family.joining : t.family.join}
                </ThemedText>
              </Pressable>
            </View>
          </Card>
        ) : null}
      </View>
    </View>
  );
}

const SCAN_SIZE = 250;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingBottom: Spacing.lg,
  },
  overlayTitle: {
    ...Typography.title,
    color: "#fff",
    marginBottom: Spacing.xs,
  },
  overlaySubtitle: {
    ...Typography.body,
    color: "rgba(255,255,255,0.8)",
  },
  scanFrame: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    marginLeft: -SCAN_SIZE / 2,
    marginTop: -SCAN_SIZE / 2,
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingTop: Spacing.lg,
  },
  scanningText: {
    ...Typography.body,
    color: "#fff",
    marginBottom: Spacing.md,
  },
  scanAgainButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  scanAgainText: {
    ...Typography.body,
    fontWeight: "600",
  },
  manualEntryLink: {
    paddingVertical: Spacing.sm,
  },
  manualEntryText: {
    ...Typography.body,
    color: "#fff",
    textDecorationLine: "underline",
  },
  manualCard: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    width: "90%",
    maxWidth: 320,
  },
  manualLabel: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  input: {
    ...Typography.body,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  manualButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  joinButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  joinButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
  permissionTitle: {
    ...Typography.title,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  permissionText: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  permissionButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  permissionButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
});
