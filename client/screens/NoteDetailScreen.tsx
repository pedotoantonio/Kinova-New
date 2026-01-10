import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import type { Note, NoteColor, NoteRelatedType, CalendarEvent, Task, Expense, ShoppingItem } from "@shared/types";

type RouteParams = {
  NoteDetail: {
    noteId: string;
  };
};

const NOTE_COLORS: Record<NoteColor, string> = {
  default: "#9CA3AF",
  red: "#EF4444",
  orange: "#F97316",
  yellow: "#EAB308",
  green: "#22C55E",
  blue: "#3B82F6",
  purple: "#A855F7",
  pink: "#EC4899",
};

const RELATED_TYPE_ICONS: Record<NoteRelatedType, string> = {
  event: "calendar",
  task: "check-square",
  expense: "credit-card",
  shopping_item: "shopping-cart",
};

export default function NoteDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, "NoteDetail">>();

  const { noteId } = route.params;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<NoteColor>("default");
  const [pinned, setPinned] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const colors = isDark ? Colors.dark : Colors.light;

  const permissions = user?.permissions ?? {
    canModifyItems: true,
  };

  const { data: note, isLoading } = useQuery<Note>({
    queryKey: ["/api/notes", noteId],
    enabled: isAuthenticated && !!noteId,
  });

  const { data: relatedEvent } = useQuery<CalendarEvent>({
    queryKey: ["/api/events", note?.relatedId],
    enabled: isAuthenticated && note?.relatedType === "event" && !!note?.relatedId,
  });

  const { data: relatedTask } = useQuery<Task>({
    queryKey: ["/api/tasks", note?.relatedId],
    enabled: isAuthenticated && note?.relatedType === "task" && !!note?.relatedId,
  });

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || "");
      setColor(note.color);
      setPinned(note.pinned);
    }
  }, [note]);

  const updateNoteMutation = useMutation({
    mutationFn: async (data: Partial<Note>) => {
      return apiRequest("PATCH", `/api/notes/${noteId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert(t.common.error, t.errors.serverError);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    },
  });

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      Alert.alert(t.common.error, t.notes?.titleRequired || "Il titolo e obbligatorio");
      return;
    }
    updateNoteMutation.mutate({
      title: title.trim(),
      content: content || null,
      color,
      pinned,
    });
  }, [title, content, color, pinned, updateNoteMutation, t]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t.notes?.deleteTitle || "Elimina nota",
      t.notes?.deleteConfirm || "Sei sicuro di voler eliminare questa nota?",
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete,
          style: "destructive",
          onPress: () => deleteNoteMutation.mutate(),
        },
      ]
    );
  }, [t, deleteNoteMutation]);

  const handleTitleChange = (text: string) => {
    setTitle(text);
    setHasChanges(true);
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    setHasChanges(true);
  };

  const handleColorChange = (newColor: NoteColor) => {
    setColor(newColor);
    setHasChanges(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePinToggle = () => {
    setPinned(!pinned);
    setHasChanges(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getRelatedEntityName = (): string | null => {
    if (!note?.relatedType || !note?.relatedId) return null;
    if (note.relatedType === "event" && relatedEvent) return relatedEvent.title;
    if (note.relatedType === "task" && relatedTask) return relatedTask.title;
    return null;
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          {hasChanges && permissions.canModifyItems ? (
            <Pressable onPress={handleSave} style={styles.headerButton}>
              {updateNoteMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Feather name="check" size={22} color={theme.primary} />
              )}
            </Pressable>
          ) : null}
          {permissions.canModifyItems ? (
            <Pressable onPress={handleDelete} style={styles.headerButton}>
              <Feather name="trash-2" size={20} color="#EF4444" />
            </Pressable>
          ) : null}
        </View>
      ),
    });
  }, [navigation, hasChanges, handleSave, handleDelete, updateNoteMutation.isPending, permissions, theme]);

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!note) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <ThemedText style={styles.errorText}>
          {t.notes?.notFound || "Nota non trovata"}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.md }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <Pressable onPress={handlePinToggle} style={styles.pinButton}>
            <Feather
              name="star"
              size={24}
              color={pinned ? "#EAB308" : theme.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.colorSection}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            {t.notes?.colorLabel || "Colore"}
          </ThemedText>
          <View style={styles.colorPicker}>
            {(Object.keys(NOTE_COLORS) as NoteColor[]).map((c) => (
              <Pressable
                key={c}
                style={[
                  styles.colorOption,
                  { backgroundColor: NOTE_COLORS[c] },
                  color === c && styles.colorOptionSelected,
                ]}
                onPress={() => handleColorChange(c)}
                disabled={!permissions.canModifyItems}
              />
            ))}
          </View>
        </View>

        <TextInput
          style={[
            styles.titleInput,
            { color: theme.text, borderBottomColor: NOTE_COLORS[color] },
          ]}
          placeholder={t.notes?.titlePlaceholder || "Titolo della nota..."}
          placeholderTextColor={theme.textSecondary}
          value={title}
          onChangeText={handleTitleChange}
          editable={permissions.canModifyItems}
        />

        <TextInput
          style={[styles.contentInput, { color: theme.text, backgroundColor: theme.surface }]}
          placeholder={t.notes?.contentPlaceholder || "Scrivi qui le tue note..."}
          placeholderTextColor={theme.textSecondary}
          value={content}
          onChangeText={handleContentChange}
          multiline
          textAlignVertical="top"
          editable={permissions.canModifyItems}
        />

        {note.relatedType && note.relatedId ? (
          <View style={[styles.relatedSection, { backgroundColor: theme.surface }]}>
            <Feather
              name={RELATED_TYPE_ICONS[note.relatedType] as any}
              size={18}
              color={theme.textSecondary}
            />
            <View style={styles.relatedInfo}>
              <ThemedText style={[styles.relatedLabel, { color: theme.textSecondary }]}>
                {note.relatedType === "event"
                  ? t.notes?.relatedEvent || "Collegato a evento"
                  : note.relatedType === "task"
                  ? t.notes?.relatedTask || "Collegato ad attivita"
                  : note.relatedType === "expense"
                  ? t.notes?.relatedExpense || "Collegato a spesa"
                  : t.notes?.relatedShopping || "Collegato a lista spesa"}
              </ThemedText>
              {getRelatedEntityName() ? (
                <ThemedText style={styles.relatedName}>{getRelatedEntityName()}</ThemedText>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.metaSection}>
          <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
            {t.notes?.createdAt || "Creato"}: {new Date(note.createdAt).toLocaleDateString("it-IT", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </ThemedText>
          {note.updatedAt !== note.createdAt ? (
            <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
              {t.notes?.updatedAt || "Modificato"}: {new Date(note.updatedAt).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </ThemedText>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: Spacing.md,
  },
  pinButton: {
    padding: Spacing.sm,
  },
  colorSection: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.small,
    marginBottom: Spacing.sm,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  titleInput: {
    ...Typography.subtitle,
    fontWeight: "600",
    paddingVertical: Spacing.md,
    borderBottomWidth: 3,
    marginBottom: Spacing.lg,
  },
  contentInput: {
    ...Typography.body,
    minHeight: 200,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    lineHeight: 24,
  },
  relatedSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  relatedInfo: {
    flex: 1,
  },
  relatedLabel: {
    ...Typography.small,
  },
  relatedName: {
    ...Typography.body,
    fontWeight: "500",
    marginTop: 2,
  },
  metaSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  metaText: {
    ...Typography.small,
    marginBottom: Spacing.xs,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  errorText: {
    textAlign: "center",
    ...Typography.body,
  },
});
