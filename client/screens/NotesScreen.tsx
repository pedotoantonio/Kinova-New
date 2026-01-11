import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius, Typography, CategoryColors } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import type { Note, NoteColor, NoteRelatedType } from "@shared/types";

type FilterType = "all" | "pinned" | "event" | "task" | "expense" | "shopping_item";

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

const FILTER_ICONS: Record<FilterType, string> = {
  all: "grid",
  pinned: "star",
  event: "calendar",
  task: "check-square",
  expense: "credit-card",
  shopping_item: "shopping-cart",
};

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();

  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState<NoteColor>("default");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const colors = isDark ? Colors.dark : Colors.light;

  const permissions = user?.permissions ?? {
    canViewCalendar: true,
    canViewTasks: true,
    canViewShopping: true,
    canViewBudget: false,
    canViewPlaces: true,
    canModifyItems: true,
  };

  const queryFilters = useMemo(() => {
    if (filter === "pinned") return { pinned: "true" };
    if (filter === "event" || filter === "task" || filter === "expense" || filter === "shopping_item") {
      return { relatedType: filter };
    }
    return {};
  }, [filter]);

  const {
    data: notes,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Note[]>({
    queryKey: ["/api/notes", queryFilters],
    enabled: isAuthenticated,
  });

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        (note.content && note.content.toLowerCase().includes(query))
    );
  }, [notes, searchQuery]);

  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; color: NoteColor }) => {
      return apiRequest("POST", "/api/notes", data);
    },
    onSuccess: () => {
      setFilter("all");
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setNewNoteTitle("");
      setSelectedColor("default");
      setIsAddingNote(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert(t.common.error, t.errors.serverError);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      return apiRequest("PATCH", `/api/notes/${id}`, { pinned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const handleAddNote = useCallback(() => {
    if (!newNoteTitle.trim()) return;
    createNoteMutation.mutate({ title: newNoteTitle.trim(), color: selectedColor });
  }, [newNoteTitle, selectedColor, createNoteMutation]);

  const handleDeleteNote = useCallback((note: Note) => {
    Alert.alert(
      t.notes?.deleteTitle || "Elimina nota",
      t.notes?.deleteConfirm || "Sei sicuro di voler eliminare questa nota?",
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete,
          style: "destructive",
          onPress: () => deleteNoteMutation.mutate(note.id),
        },
      ]
    );
  }, [t, deleteNoteMutation]);

  const handleNotePress = useCallback((note: Note) => {
    setSelectedNote(note);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleEditNote = useCallback(() => {
    if (selectedNote) {
      setSelectedNote(null);
      navigation.navigate("NoteDetail", { noteId: selectedNote.id });
    }
  }, [navigation, selectedNote]);

  const getRelatedTypeLabel = (type: NoteRelatedType | null | undefined): string => {
    if (!type) return "";
    const labels: Record<NoteRelatedType, string> = {
      event: t.notes?.relatedEvent || "Evento",
      task: t.notes?.relatedTask || "Attivita",
      expense: t.notes?.relatedExpense || "Spesa",
      shopping_item: t.notes?.relatedShopping || "Lista spesa",
    };
    return labels[type] || "";
  };

  const renderNoteItem = ({ item, index }: { item: Note; index: number }) => {
    const tapGesture = Gesture.Tap()
      .onEnd(() => {
        scheduleOnRN(handleNotePress, item);
      });

    const swipeGesture = Gesture.Pan()
      .activeOffsetX([-20, 20])
      .onEnd((event) => {
        if (event.translationX < -100) {
          scheduleOnRN(handleDeleteNote, item);
        }
      });

    const composedGestures = Gesture.Race(tapGesture, swipeGesture);

    return (
      <GestureDetector gesture={composedGestures}>
        <Animated.View entering={FadeInDown.delay(index * 50).duration(200)}>
          <Pressable onPress={() => handleNotePress(item)}>
            <Card style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: NOTE_COLORS[item.color] || NOTE_COLORS.default },
                  ]}
                />
                <View style={styles.noteContent}>
                  <ThemedText style={styles.noteTitle} numberOfLines={1}>
                    {item.title}
                  </ThemedText>
                  {item.content ? (
                    <ThemedText style={[styles.notePreview, { color: theme.textSecondary }]} numberOfLines={2}>
                      {item.content}
                    </ThemedText>
                  ) : null}
                  {item.relatedType ? (
                    <View style={[styles.relatedBadge, { backgroundColor: theme.surface }]}>
                      <Feather
                        name={FILTER_ICONS[item.relatedType] as any}
                        size={12}
                        color={theme.textSecondary}
                      />
                      <ThemedText style={[styles.relatedText, { color: theme.textSecondary }]}>
                        {getRelatedTypeLabel(item.relatedType)}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                <Pressable
                  style={styles.pinButton}
                  onPress={() => togglePinMutation.mutate({ id: item.id, pinned: !item.pinned })}
                >
                  <Feather
                    name={item.pinned ? "star" : "star"}
                    size={20}
                    color={item.pinned ? "#EAB308" : theme.textSecondary}
                  />
                </Pressable>
              </View>
            </Card>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    );
  };

  const renderFilterChip = (filterType: FilterType, label: string) => {
    const isActive = filter === filterType;
    return (
      <Pressable
        key={filterType}
        style={[
          styles.filterChip,
          { backgroundColor: isActive ? CategoryColors.notes : theme.surface },
        ]}
        onPress={() => setFilter(filterType)}
      >
        <Feather
          name={FILTER_ICONS[filterType] as any}
          size={14}
          color={isActive ? "#FFFFFF" : theme.text}
        />
        <ThemedText
          style={[styles.filterChipText, isActive && { color: "#FFFFFF" }]}
        >
          {label}
        </ThemedText>
      </Pressable>
    );
  };

  const renderColorPicker = () => (
    <View style={styles.colorPicker}>
      {(Object.keys(NOTE_COLORS) as NoteColor[]).map((color) => (
        <Pressable
          key={color}
          style={[
            styles.colorOption,
            { backgroundColor: NOTE_COLORS[color] },
            selectedColor === color && styles.colorOptionSelected,
          ]}
          onPress={() => setSelectedColor(color)}
        />
      ))}
    </View>
  );

  const renderNoteModal = () => {
    if (!selectedNote) return null;
    
    return (
      <Modal
        visible={true}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNote(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedNote(null)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalColorBar,
                  { backgroundColor: NOTE_COLORS[selectedNote.color] || NOTE_COLORS.default },
                ]}
              />
              <View style={styles.modalHeaderActions}>
                {selectedNote.pinned ? (
                  <Feather name="star" size={20} color="#EAB308" />
                ) : null}
                <Pressable
                  style={[styles.modalEditButton, { backgroundColor: CategoryColors.notes }]}
                  onPress={handleEditNote}
                >
                  <Feather name="edit-2" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.modalEditButtonText}>
                    {t.common.edit || "Modifica"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setSelectedNote(null)}
                >
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>
            </View>
            
            <ScrollView
              style={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                {selectedNote.title}
              </ThemedText>
              
              {selectedNote.content ? (
                <ThemedText style={[styles.modalBody, { color: theme.textSecondary }]}>
                  {selectedNote.content}
                </ThemedText>
              ) : (
                <ThemedText style={[styles.modalEmptyContent, { color: theme.textSecondary }]}>
                  {"Nessun contenuto"}
                </ThemedText>
              )}
              
              {selectedNote.relatedType ? (
                <View style={[styles.modalRelatedBadge, { backgroundColor: theme.backgroundDefault }]}>
                  <Feather
                    name={FILTER_ICONS[selectedNote.relatedType] as any}
                    size={14}
                    color={theme.textSecondary}
                  />
                  <ThemedText style={[styles.modalRelatedText, { color: theme.textSecondary }]}>
                    {getRelatedTypeLabel(selectedNote.relatedType)}
                  </ThemedText>
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <ThemedText style={styles.emptyText}>{t.common.loading}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ThemedView style={[styles.container, { paddingTop: headerHeight + Spacing.md }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t.notes?.searchPlaceholder || "Cerca note..."}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filtersContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { type: "all" as FilterType, label: t.notes?.filterAll || "Tutte" },
              { type: "pinned" as FilterType, label: t.notes?.filterPinned || "Preferite" },
              { type: "event" as FilterType, label: t.notes?.filterEvents || "Eventi" },
              { type: "task" as FilterType, label: t.notes?.filterTasks || "Attivita" },
              { type: "expense" as FilterType, label: t.notes?.filterExpenses || "Spese" },
              { type: "shopping_item" as FilterType, label: t.notes?.filterShopping || "Spesa" },
            ]}
            renderItem={({ item }) => renderFilterChip(item.type, item.label)}
            keyExtractor={(item) => item.type}
            contentContainerStyle={styles.filtersContent}
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={CategoryColors.notes} />
          </View>
        ) : filteredNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="file-text" size={48} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery
                ? t.notes?.noSearchResults || "Nessuna nota trovata"
                : t.notes?.emptyState || "Nessuna nota"}
            </ThemedText>
            {permissions.canModifyItems && !searchQuery ? (
              <Pressable
                style={[styles.emptyAddButton, { backgroundColor: CategoryColors.notes }]}
                onPress={() => setIsAddingNote(true)}
              >
                <ThemedText style={styles.emptyAddButtonText}>
                  {t.notes?.addFirst || "Crea la tua prima nota"}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={filteredNotes}
            renderItem={renderNoteItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: tabBarHeight + Spacing.xl + 80 },
            ]}
            refreshing={isRefetching}
            onRefresh={refetch}
            showsVerticalScrollIndicator={false}
          />
        )}

        {isAddingNote ? (
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutUp.duration(200)}
            style={[
              styles.addNoteContainer,
              { backgroundColor: theme.backgroundDefault, bottom: tabBarHeight + Spacing.md },
            ]}
          >
            <View style={[styles.addNoteCard, { backgroundColor: theme.surface }]}>
              <TextInput
                style={[styles.addNoteInput, { color: theme.text }]}
                placeholder={t.notes?.titlePlaceholder || "Titolo della nota..."}
                placeholderTextColor={theme.textSecondary}
                value={newNoteTitle}
                onChangeText={setNewNoteTitle}
                autoFocus
                onSubmitEditing={handleAddNote}
              />
              {renderColorPicker()}
              <View style={styles.addNoteActions}>
                <Pressable
                  style={[styles.addNoteButton, { backgroundColor: theme.surface }]}
                  onPress={() => {
                    setIsAddingNote(false);
                    setNewNoteTitle("");
                    setSelectedColor("default");
                  }}
                >
                  <ThemedText>{t.common.cancel}</ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.addNoteButton,
                    { backgroundColor: CategoryColors.notes },
                    !newNoteTitle.trim() && { opacity: 0.5 },
                  ]}
                  onPress={handleAddNote}
                  disabled={!newNoteTitle.trim() || createNoteMutation.isPending}
                >
                  {createNoteMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText style={{ color: "#FFFFFF" }}>{t.common.save}</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {permissions.canModifyItems && !isAddingNote ? (
          <Pressable
            style={[
              styles.fab,
              { backgroundColor: CategoryColors.notes, bottom: tabBarHeight + Spacing.xl },
            ]}
            onPress={() => setIsAddingNote(true)}
          >
            <Feather name="plus" size={24} color="#FFFFFF" />
          </Pressable>
        ) : null}
        
        {renderNoteModal()}
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
  },
  filtersContainer: {
    marginTop: Spacing.md,
  },
  filtersContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    marginRight: Spacing.sm,
  },
  filterChipText: {
    ...Typography.small,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyText: {
    ...Typography.body,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  emptyAddButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  emptyAddButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  listContent: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  noteCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  colorIndicator: {
    width: 4,
    height: "100%",
    minHeight: 40,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    ...Typography.body,
    fontWeight: "600",
  },
  notePreview: {
    ...Typography.small,
    marginTop: Spacing.xs,
  },
  relatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    gap: 4,
  },
  relatedText: {
    ...Typography.caption,
  },
  pinButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5DED4",
  },
  addNoteContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    padding: Spacing.md,
  },
  addNoteCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#E5DED4",
  },
  addNoteInput: {
    ...Typography.body,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
    marginBottom: Spacing.md,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  addNoteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
  addNoteButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    maxHeight: Dimensions.get("window").height * 0.75,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    paddingLeft: 0,
  },
  modalColorBar: {
    width: 6,
    height: 40,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  modalHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  modalEditButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  modalEditButtonText: {
    ...Typography.small,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalCloseButton: {
    padding: Spacing.sm,
  },
  modalScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  modalBody: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: Spacing.lg,
  },
  modalEmptyContent: {
    fontSize: 16,
    fontStyle: "italic",
    marginBottom: Spacing.lg,
  },
  modalRelatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  modalRelatedText: {
    ...Typography.small,
  },
});
