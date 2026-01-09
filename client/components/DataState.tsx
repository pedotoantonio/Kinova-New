import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";

interface DataStateProps {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  isOffline?: boolean;
  isCached?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: keyof typeof Feather.glyphMap;
  children?: React.ReactNode;
}

export function LoadingState() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <ThemedText style={styles.loadingText}>Loading...</ThemedText>
    </ThemedView>
  );
}

interface ErrorStateProps {
  error?: Error | null;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${colors.error}20` }]}>
        <Feather name="alert-circle" size={32} color={colors.error} />
      </View>
      <ThemedText style={styles.title}>Something went wrong</ThemedText>
      <ThemedText style={styles.message}>
        {error?.message || "An unexpected error occurred"}
      </ThemedText>
      {onRetry ? (
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={onRetry}
        >
          <Feather name="refresh-cw" size={16} color="#fff" style={styles.retryIcon} />
          <ThemedText style={styles.retryText}>Try again</ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: keyof typeof Feather.glyphMap;
}

export function EmptyState({
  title = "No data",
  message = "There's nothing here yet",
  icon = "inbox",
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <Feather name={icon} size={32} color={colors.textSecondary} />
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>
    </ThemedView>
  );
}

interface OfflineStateProps {
  isCached?: boolean;
  onRetry?: () => void;
}

export function OfflineState({ isCached, onRetry }: OfflineStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${colors.warning}20` }]}>
        <Feather name="wifi-off" size={32} color={colors.warning} />
      </View>
      <ThemedText style={styles.title}>You're offline</ThemedText>
      <ThemedText style={styles.message}>
        {isCached
          ? "Showing cached data. Some information may be outdated."
          : "Check your internet connection and try again."}
      </ThemedText>
      {onRetry ? (
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={onRetry}
        >
          <Feather name="refresh-cw" size={16} color="#fff" style={styles.retryIcon} />
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

export function OfflineBadge() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <View style={[styles.offlineBadge, { backgroundColor: colors.warning }]}>
      <Feather name="wifi-off" size={12} color="#fff" />
      <ThemedText style={styles.offlineBadgeText}>Offline</ThemedText>
    </View>
  );
}

export function CachedDataBadge() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <View style={[styles.cachedBadge, { backgroundColor: `${colors.info}20` }]}>
      <Feather name="clock" size={12} color={colors.info} />
      <ThemedText style={[styles.cachedBadgeText, { color: colors.info }]}>Cached</ThemedText>
    </View>
  );
}

export function DataState({
  isLoading,
  isError,
  isEmpty,
  isOffline,
  isCached,
  error,
  onRetry,
  emptyTitle,
  emptyMessage,
  emptyIcon,
  children,
}: DataStateProps) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (isOffline && !isCached) {
    return <OfflineState onRetry={onRetry} />;
  }

  if (isError && !isCached) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isEmpty && !isCached) {
    return <EmptyState title={emptyTitle} message={emptyMessage} icon={emptyIcon} />;
  }

  return (
    <>
      {isCached ? <CachedDataBadge /> : null}
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    opacity: 0.7,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryIcon: {
    marginRight: Spacing.sm,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  offlineBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cachedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
    alignSelf: "center",
    marginBottom: Spacing.sm,
  },
  cachedBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
