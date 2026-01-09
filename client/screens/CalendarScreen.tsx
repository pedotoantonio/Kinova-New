import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Switch,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import type { Event } from "@shared/types";

const EVENT_COLORS = [
  "#2F7F6D",
  "#6FB7A8",
  "#E57373",
  "#64B5F6",
  "#FFB74D",
  "#BA68C8",
  "#4DB6AC",
  "#FF8A65",
];

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isEventOnDay(event: Event, day: Date): boolean {
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : start;
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  if (event.allDay) {
    const eventDayStart = new Date(start);
    eventDayStart.setHours(0, 0, 0, 0);
    const eventDayEnd = new Date(end);
    eventDayEnd.setHours(0, 0, 0, 0);
    return dayStart >= eventDayStart && dayStart < eventDayEnd;
  }

  return start <= dayEnd && end >= dayStart;
}

interface EventFormData {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  color: string;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const colors = isDark ? Colors.dark : Colors.light;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(),
    allDay: false,
    color: EVENT_COLORS[0],
  });

  const weekStart = currentWeekStart;
  const weekEnd = getEndOfWeek(currentWeekStart);

  const { data: events, isLoading, error, refetch } = useQuery<Event[]>({
    queryKey: ["/api/events", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      const url = `/api/events?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`;
      const response = await apiRequest("GET", url) as Response;
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: Omit<Event, "id" | "familyId" | "createdBy" | "createdAt" | "updatedAt">) => {
      const response = await apiRequest("POST", "/api/events", data) as Response;
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setShowEventModal(false);
      resetForm();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Event> & { id: string }) => {
      const response = await apiRequest("PUT", `/api/events/${id}`, data) as Response;
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setShowEventModal(false);
      setEditingEvent(null);
      resetForm();
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/events/${id}`) as Response;
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setShowEventModal(false);
      setEditingEvent(null);
      resetForm();
    },
  });

  const resetForm = useCallback(() => {
    setFormData({
      title: "",
      description: "",
      startDate: selectedDate,
      endDate: selectedDate,
      allDay: false,
      color: EVENT_COLORS[0],
    });
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const selectedDayEvents = useMemo(() => {
    if (!events) return [];
    return events
      .filter((e) => isEventOnDay(e, selectedDate))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [events, selectedDate]);

  const goToPrevWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentWeekStart(getStartOfWeek(today));
    setSelectedDate(today);
  };

  const openCreateEvent = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      startDate: selectedDate,
      endDate: selectedDate,
      allDay: false,
      color: EVENT_COLORS[0],
    });
    setShowEventModal(true);
  };

  const openEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      startDate: new Date(event.startDate),
      endDate: event.endDate ? new Date(event.endDate) : new Date(event.startDate),
      allDay: event.allDay,
      color: event.color || EVENT_COLORS[0],
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = () => {
    if (!formData.title.trim()) {
      Alert.alert(t.errors.validationError, t.calendar.titleRequired);
      return;
    }

    const eventData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      startDate: formData.startDate.toISOString(),
      endDate: formData.allDay
        ? new Date(formData.endDate.getFullYear(), formData.endDate.getMonth(), formData.endDate.getDate() + 1).toISOString()
        : formData.endDate.toISOString(),
      allDay: formData.allDay,
      color: formData.color,
    };

    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, ...eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleDeleteEvent = () => {
    if (!editingEvent) return;
    Alert.alert(t.calendar.deleteEvent, t.calendar.deleteConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: () => deleteEventMutation.mutate(editingEvent.id),
      },
    ]);
  };

  const dayAbbreviations = [
    t.calendar.sun,
    t.calendar.mon,
    t.calendar.tue,
    t.calendar.wed,
    t.calendar.thu,
    t.calendar.fri,
    t.calendar.sat,
  ];

  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={{ color: colors.textSecondary }}>{t.auth.pleaseLogin}</ThemedText>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
          {t.common.loading}
        </ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="alert-circle" size={48} color={colors.error} />
        <ThemedText style={{ color: colors.error, marginTop: Spacing.md }}>
          {t.common.error}
        </ThemedText>
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
        >
          <ThemedText style={{ color: "#FFF" }}>{t.common.retry}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.weekNav}>
          <Pressable onPress={goToPrevWeek} style={styles.navButton}>
            <Feather name="chevron-left" size={24} color={colors.text} />
          </Pressable>
          <Pressable onPress={goToToday}>
            <ThemedText style={[styles.monthLabel, { color: colors.text }]}>
              {t.calendar.months[currentWeekStart.getMonth()]} {currentWeekStart.getFullYear()}
            </ThemedText>
          </Pressable>
          <Pressable onPress={goToNextWeek} style={styles.navButton}>
            <Feather name="chevron-right" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const hasEvents = events?.some((e) => isEventOnDay(e, day));

            return (
              <Pressable
                key={index}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: colors.primary },
                  isToday && !isSelected && { borderColor: colors.primary, borderWidth: 2 },
                ]}
                onPress={() => setSelectedDate(day)}
                testID={`day-cell-${day.getDate()}`}
              >
                <ThemedText
                  style={[
                    styles.dayAbbr,
                    { color: isSelected ? "#FFF" : colors.textSecondary },
                  ]}
                >
                  {dayAbbreviations[day.getDay()]}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.dayNumber,
                    { color: isSelected ? "#FFF" : colors.text },
                  ]}
                >
                  {day.getDate()}
                </ThemedText>
                {hasEvents ? (
                  <View
                    style={[
                      styles.eventDot,
                      { backgroundColor: isSelected ? "#FFF" : colors.primary },
                    ]}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <ThemedText style={[styles.selectedDateLabel, { color: colors.text }]}>
              {isSameDay(selectedDate, new Date())
                ? t.common.today
                : selectedDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
            </ThemedText>
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={openCreateEvent}
              testID="button-add-event"
            >
              <Feather name="plus" size={20} color="#FFF" />
            </Pressable>
          </View>

          {selectedDayEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={48} color={colors.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t.calendar.noEvents}
              </ThemedText>
            </View>
          ) : (
            selectedDayEvents.map((event) => (
              <Pressable
                key={event.id}
                onPress={() => openEditEvent(event)}
                testID={`event-card-${event.id}`}
              >
                <Card style={styles.eventCard}>
                  <View
                    style={[
                      styles.eventColorBar,
                      { backgroundColor: event.color || colors.primary },
                    ]}
                  />
                  <View style={styles.eventContent}>
                    <ThemedText style={[styles.eventTitle, { color: colors.text }]}>
                      {event.title}
                    </ThemedText>
                    <ThemedText style={[styles.eventTime, { color: colors.textSecondary }]}>
                      {event.allDay
                        ? t.calendar.allDay
                        : `${formatTime(new Date(event.startDate))}${
                            event.endDate
                              ? ` - ${formatTime(new Date(event.endDate))}`
                              : ""
                          }`}
                    </ThemedText>
                    {event.description ? (
                      <ThemedText
                        style={[styles.eventDescription, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {event.description}
                      </ThemedText>
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showEventModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                {editingEvent ? t.common.edit : t.common.create} {t.calendar.eventTitle.toLowerCase()}
              </ThemedText>
              <Pressable onPress={() => setShowEventModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t.calendar.eventTitle}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.backgroundRoot, color: colors.text },
                ]}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder={t.calendar.eventTitle}
                placeholderTextColor={colors.textSecondary}
                testID="input-event-title"
              />

              <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t.calendar.eventDescription}
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  { backgroundColor: theme.backgroundRoot, color: colors.text },
                ]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder={t.calendar.eventDescription}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                testID="input-event-description"
              />

              <View style={styles.switchRow}>
                <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {t.calendar.allDay}
                </ThemedText>
                <Switch
                  value={formData.allDay}
                  onValueChange={(value) => setFormData({ ...formData, allDay: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  testID="switch-all-day"
                />
              </View>

              <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t.calendar.selectColor}
              </ThemedText>
              <View style={styles.colorPicker}>
                {EVENT_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.color === color && styles.colorSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, color })}
                    testID={`color-option-${color}`}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              {editingEvent ? (
                <Pressable
                  style={[styles.deleteButton, { backgroundColor: colors.error }]}
                  onPress={handleDeleteEvent}
                  testID="button-delete-event"
                >
                  <ThemedText style={{ color: "#FFF" }}>{t.common.delete}</ThemedText>
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }} />
              <Pressable
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowEventModal(false)}
              >
                <ThemedText style={{ color: colors.text }}>{t.common.cancel}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveEvent}
                testID="button-save-event"
              >
                <ThemedText style={{ color: "#FFF" }}>{t.common.save}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  weekNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  navButton: {
    padding: Spacing.sm,
  },
  monthLabel: {
    ...Typography.subtitle,
    fontWeight: "600",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginHorizontal: 2,
    borderRadius: BorderRadius.md,
  },
  dayAbbr: {
    ...Typography.small,
    marginBottom: Spacing.xs,
  },
  dayNumber: {
    ...Typography.body,
    fontWeight: "600",
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: Spacing.xs,
  },
  eventsSection: {
    flex: 1,
  },
  eventsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  selectedDateLabel: {
    ...Typography.subtitle,
    fontWeight: "600",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    ...Typography.body,
    marginTop: Spacing.lg,
  },
  eventCard: {
    flexDirection: "row",
    padding: 0,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  eventColorBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  eventTitle: {
    ...Typography.body,
    fontWeight: "600",
  },
  eventTime: {
    ...Typography.small,
    marginTop: Spacing.xs,
  },
  eventDescription: {
    ...Typography.small,
    marginTop: Spacing.xs,
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    ...Typography.subtitle,
    fontWeight: "600",
  },
  modalBody: {
    padding: Spacing.lg,
  },
  inputLabel: {
    ...Typography.small,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  textInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  modalActions: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    gap: Spacing.md,
  },
  deleteButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  cancelButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  saveButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
