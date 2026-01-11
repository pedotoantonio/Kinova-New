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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius, Typography, CategoryColors } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import type { Event, EventCategory, RecurrenceFrequency, EventRecurrence } from "@shared/types";
import { PlacePickerModal, Place } from "@/components/PlacePickerModal";

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

const CATEGORY_COLORS: Record<EventCategory, string> = {
  family: "#2F7F6D",
  course: "#64B5F6",
  shift: "#FFB74D",
  vacation: "#BA68C8",
  holiday: "#E57373",
  other: "#9E9E9E",
};

const CATEGORIES: EventCategory[] = ["family", "course", "shift", "vacation", "holiday", "other"];
const RECURRENCE_FREQUENCIES: (RecurrenceFrequency | "none")[] = ["none", "daily", "weekly", "monthly"];
const MAX_VISIBLE_EVENTS = 3;

type ViewMode = "month" | "week";

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

function getStartOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getMonthGridDays(date: Date): Date[] {
  const firstDay = getStartOfMonth(date);
  const lastDay = getEndOfMonth(date);
  const startWeek = getStartOfWeek(firstDay);
  
  const days: Date[] = [];
  const current = new Date(startWeek);
  
  while (current <= lastDay || days.length % 7 !== 0 || days.length < 35) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
    if (days.length >= 42) break;
  }
  
  return days;
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
    return dayStart >= eventDayStart && dayStart <= eventDayEnd;
  }

  return start <= dayEnd && end >= dayStart;
}

function isWeekend(day: Date): boolean {
  const dayOfWeek = day.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function isMultiDayEvent(event: Event): boolean {
  if (!event.endDate) return false;
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end.getTime() > start.getTime();
}

function getEventColor(event: Event): string {
  if (event.color) return event.color;
  return CATEGORY_COLORS[event.category] || CATEGORY_COLORS.family;
}

interface EventFormData {
  title: string;
  shortCode: string;
  description: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  color: string;
  category: EventCategory;
  placeId: string | null;
  recurrenceFrequency: RecurrenceFrequency | "none";
  recurrenceInterval: number;
  recurrenceEndDate: Date | null;
}

interface FilterState {
  category: EventCategory | null;
  assignedTo: string | null;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const colors = isDark ? Colors.dark : Colors.light;

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [showEventModal, setShowEventModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDayEventsModal, setShowDayEventsModal] = useState(false);
  const [dayEventsDate, setDayEventsDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [filters, setFilters] = useState<FilterState>({ category: null, assignedTo: null });
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    shortCode: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(),
    allDay: false,
    color: EVENT_COLORS[0],
    category: "family",
    placeId: null,
    recurrenceFrequency: "none",
    recurrenceInterval: 1,
    recurrenceEndDate: null,
  });
  const [showPlacePicker, setShowPlacePicker] = useState(false);

  const { dateRangeStartIso, dateRangeEndIso } = useMemo(() => {
    if (viewMode === "month") {
      const monthDays = getMonthGridDays(currentMonth);
      const start = monthDays[0];
      const end = monthDays[monthDays.length - 1];
      end.setHours(23, 59, 59, 999);
      return {
        dateRangeStartIso: start.toISOString(),
        dateRangeEndIso: end.toISOString(),
      };
    } else {
      const start = new Date(currentWeekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return {
        dateRangeStartIso: start.toISOString(),
        dateRangeEndIso: end.toISOString(),
      };
    }
  }, [viewMode, currentMonth, currentWeekStart]);

  const monthGridDays = useMemo(() => getMonthGridDays(currentMonth), [currentMonth]);

  const { data: events, isLoading, error, refetch } = useQuery<Event[]>({
    queryKey: ["/api/events", dateRangeStartIso, dateRangeEndIso],
    queryFn: async () => {
      const url = `/api/events?from=${dateRangeStartIso}&to=${dateRangeEndIso}`;
      return apiRequest<Event[]>("GET", url);
    },
    enabled: isAuthenticated,
  });

  const { data: places } = useQuery<Place[]>({
    queryKey: ["/api/places"],
    enabled: isAuthenticated,
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: Omit<Event, "id" | "familyId" | "createdBy" | "createdAt" | "updatedAt">) => {
      return apiRequest<Event>("POST", "/api/events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setShowEventModal(false);
      resetForm();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Event> & { id: string }) => {
      return apiRequest<Event>("PUT", `/api/events/${id}`, data);
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
      return apiRequest<void>("DELETE", `/api/events/${id}`);
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
      shortCode: "",
      description: "",
      startDate: selectedDate,
      endDate: selectedDate,
      allDay: false,
      color: EVENT_COLORS[0],
      category: "family",
      placeId: null,
      recurrenceFrequency: "none",
      recurrenceInterval: 1,
      recurrenceEndDate: null,
    });
  }, [selectedDate]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((e) => {
      if (filters.category && e.category !== filters.category) return false;
      if (filters.assignedTo && e.assignedTo !== filters.assignedTo) return false;
      return true;
    });
  }, [events, filters]);

  const hasActiveFilters = filters.category !== null || filters.assignedTo !== null;

  const getEventsForDay = useCallback(
    (day: Date) => {
      return filteredEvents
        .filter((e) => isEventOnDay(e, day))
        .sort((a, b) => {
          if (a.allDay && !b.allDay) return -1;
          if (!a.allDay && b.allDay) return 1;
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });
    },
    [filteredEvents]
  );

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentWeekStart]);

  const selectedDayEvents = useMemo(() => {
    return getEventsForDay(selectedDate);
  }, [getEventsForDay, selectedDate]);

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

  const goToPrevMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
    setCurrentWeekStart(getStartOfWeek(today));
  };

  const toggleViewMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewMode(viewMode === "month" ? "week" : "month");
  };

  const openCreateEvent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingEvent(null);
    setFormData({
      title: "",
      shortCode: "",
      description: "",
      startDate: selectedDate,
      endDate: selectedDate,
      allDay: false,
      color: EVENT_COLORS[0],
      category: "family",
      placeId: null,
      recurrenceFrequency: "none",
      recurrenceInterval: 1,
      recurrenceEndDate: null,
    });
    setShowEventModal(true);
  };

  const openEditEvent = (event: Event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingEvent(event);
    setFormData({
      title: event.title,
      shortCode: event.shortCode || "",
      description: event.description || "",
      startDate: new Date(event.startDate),
      endDate: event.endDate ? new Date(event.endDate) : new Date(event.startDate),
      allDay: event.allDay,
      color: event.color || CATEGORY_COLORS[event.category] || EVENT_COLORS[0],
      category: event.category || "family",
      placeId: event.placeId || null,
      recurrenceFrequency: event.recurrence?.frequency || "none",
      recurrenceInterval: event.recurrence?.interval || 1,
      recurrenceEndDate: event.recurrence?.endDate ? new Date(event.recurrence.endDate) : null,
    });
    setShowEventModal(true);
  };

  const openDayEvents = (day: Date, dayEvents: Event[]) => {
    if (dayEvents.length > MAX_VISIBLE_EVENTS) {
      setDayEventsDate(day);
      setShowDayEventsModal(true);
    }
  };

  const handleSaveEvent = () => {
    if (!formData.title.trim()) {
      Alert.alert(t.errors.validationError, t.calendar.titleRequired);
      return;
    }

    const recurrence =
      formData.recurrenceFrequency !== "none"
        ? {
            frequency: formData.recurrenceFrequency as RecurrenceFrequency,
            interval: formData.recurrenceInterval,
            endDate: formData.recurrenceEndDate?.toISOString() || null,
            byWeekday: null,
          }
        : null;

    const eventData = {
      title: formData.title.trim(),
      shortCode: formData.shortCode.trim() || null,
      description: formData.description.trim() || null,
      startDate: formData.startDate.toISOString(),
      endDate: formData.allDay
        ? new Date(formData.endDate.getFullYear(), formData.endDate.getMonth(), formData.endDate.getDate() + 1).toISOString()
        : formData.endDate.toISOString(),
      allDay: formData.allDay,
      color: formData.color,
      category: formData.category,
      placeId: formData.placeId,
      recurrence,
      isHoliday: formData.category === "holiday",
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

  const confirmDeleteEventSwipe = (event: Event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t.calendar.deleteEvent, t.calendar.deleteConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: () => deleteEventMutation.mutate(event.id),
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
        <ActivityIndicator size="large" color={CategoryColors.calendar} />
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
          style={[styles.retryButton, { backgroundColor: CategoryColors.calendar }]}
          onPress={() => refetch()}
        >
          <ThemedText style={{ color: colors.buttonText }}>{t.common.retry}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.screenPadding,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.calendarHeader}>
          <View style={styles.weekNav}>
            <Pressable onPress={viewMode === "month" ? goToPrevMonth : goToPrevWeek} style={styles.navButton}>
              <Feather name="chevron-left" size={24} color={colors.text} />
            </Pressable>
            <Pressable onPress={goToToday}>
              <ThemedText style={[styles.monthLabel, { color: colors.text }]}>
                {t.calendar.months[viewMode === "month" ? currentMonth.getMonth() : currentWeekStart.getMonth()]}{" "}
                {viewMode === "month" ? currentMonth.getFullYear() : currentWeekStart.getFullYear()}
              </ThemedText>
            </Pressable>
            <Pressable onPress={viewMode === "month" ? goToNextMonth : goToNextWeek} style={styles.navButton}>
              <Feather name="chevron-right" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.viewToggle}>
            <Pressable
              style={[
                styles.viewToggleButton,
                viewMode === "month" && { backgroundColor: CategoryColors.calendar },
              ]}
              onPress={() => setViewMode("month")}
            >
              <Feather name="grid" size={16} color={viewMode === "month" ? colors.buttonText : colors.text} />
            </Pressable>
            <Pressable
              style={[
                styles.viewToggleButton,
                viewMode === "week" && { backgroundColor: CategoryColors.calendar },
              ]}
              onPress={() => setViewMode("week")}
            >
              <Feather name="list" size={16} color={viewMode === "week" ? colors.buttonText : colors.text} />
            </Pressable>
          </View>
        </View>

        {hasActiveFilters ? (
          <View style={[styles.filterBadge, { backgroundColor: CategoryColors.calendar + "20" }]}>
            <ThemedText style={[styles.filterBadgeText, { color: CategoryColors.calendar }]}>
              {t.calendar.filters.active}
            </ThemedText>
            <Pressable onPress={() => setFilters({ category: null, assignedTo: null })}>
              <Feather name="x" size={16} color={CategoryColors.calendar} />
            </Pressable>
          </View>
        ) : null}

        {viewMode === "month" ? (
          <View style={styles.monthGrid}>
            <View style={styles.weekdayHeader}>
              {dayAbbreviations.map((abbr, i) => (
                <View key={i} style={styles.weekdayCell}>
                  <ThemedText style={[styles.weekdayText, { color: i === 0 || i === 6 ? CategoryColors.calendar : colors.textSecondary }]}>
                    {abbr}
                  </ThemedText>
                </View>
              ))}
            </View>
            <View style={styles.monthDaysGrid}>
              {monthGridDays.map((day, index) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const dayEvents = getEventsForDay(day);
                const eventCount = dayEvents.length;
                const isWeekendDay = isWeekend(day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                
                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.monthDayCell,
                      isWeekendDay && { backgroundColor: isDark ? "#1a2a25" : "#f5f9f8" },
                      !isCurrentMonth && { opacity: 0.4 },
                      isSelected && { backgroundColor: CategoryColors.calendar },
                      isToday && !isSelected && { borderColor: CategoryColors.calendar, borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setSelectedDate(day);
                      if (dayEvents.length > 0) {
                        openDayEvents(day, dayEvents);
                      }
                    }}
                    testID={`month-day-${day.getDate()}`}
                  >
                    <ThemedText
                      style={[
                        styles.monthDayNumber,
                        { color: isSelected ? "#FFF" : colors.text },
                      ]}
                    >
                      {day.getDate()}
                    </ThemedText>
                    {eventCount > 0 ? (
                      <View style={styles.monthEventIndicators}>
                        {eventCount <= 2 ? (
                          dayEvents.slice(0, 2).map((e, i) => (
                            <View
                              key={e.id}
                              style={[
                                styles.monthEventDot,
                                { backgroundColor: isSelected ? "#FFF" : getEventColor(e) },
                              ]}
                            />
                          ))
                        ) : (
                          <ThemedText style={[styles.monthEventCount, { color: isSelected ? "#FFF" : CategoryColors.calendar }]}>
                            +{eventCount}
                          </ThemedText>
                        )}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.weekRow}>
            {weekDays.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const dayEvents = getEventsForDay(day);
              const eventCount = dayEvents.length;
              const isWeekendDay = isWeekend(day);

              return (
                <Pressable
                  key={index}
                  style={[
                    styles.dayCell,
                    isWeekendDay && { backgroundColor: isDark ? "#1a2a25" : "#f5f9f8" },
                    isSelected && { backgroundColor: CategoryColors.calendar },
                    isToday && !isSelected && { borderColor: CategoryColors.calendar, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedDate(day)}
                  testID={`day-cell-${day.getDate()}`}
                >
                  <ThemedText
                    style={[
                      styles.dayAbbr,
                      { color: isSelected ? "#FFF" : isWeekendDay ? CategoryColors.calendar : colors.textSecondary },
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
                  {eventCount > 0 ? (
                    <View style={styles.eventCountContainer}>
                      {eventCount <= MAX_VISIBLE_EVENTS ? (
                        dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((e, i) => (
                          <View
                            key={e.id}
                            style={[
                              styles.eventDot,
                              { backgroundColor: isSelected ? "#FFF" : getEventColor(e), marginLeft: i > 0 ? 2 : 0 },
                            ]}
                          />
                        ))
                      ) : (
                        <View style={[styles.eventCountBadge, { backgroundColor: isSelected ? "#FFF" : CategoryColors.calendar }]}>
                          <ThemedText style={[styles.eventCountText, { color: isSelected ? CategoryColors.calendar : "#FFF" }]}>
                            {eventCount}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

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
              {isWeekend(selectedDate) ? ` (${t.calendar.weekend})` : ""}
            </ThemedText>
            <View style={styles.headerButtons}>
              <Pressable
                style={[styles.filterButton, { backgroundColor: hasActiveFilters ? CategoryColors.calendar : colors.backgroundSecondary }]}
                onPress={() => setShowFilters(true)}
                testID="button-filter"
              >
                <Feather name="filter" size={18} color={hasActiveFilters ? colors.buttonText : colors.text} />
              </Pressable>
              <Pressable
                style={[styles.addButton, { backgroundColor: CategoryColors.calendar }]}
                onPress={openCreateEvent}
                testID="button-add-event"
                accessibilityLabel={t.calendar.addEvent}
                accessibilityRole="button"
              >
                <Feather name="plus" size={20} color={colors.buttonText} />
              </Pressable>
            </View>
          </View>

          {selectedDayEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={48} color={colors.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t.calendar.noEvents}
              </ThemedText>
            </View>
          ) : (
            selectedDayEvents.map((event) => {
              const categoryKey = event.category as keyof typeof t.calendar.categories;
              const categoryLabel = t.calendar.categories[categoryKey] || t.calendar.categories.other;
              const eventColor = getEventColor(event);
              const isMultiDay = isMultiDayEvent(event);
              
              const tapGesture = Gesture.Tap().onEnd(() => {
                scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
                scheduleOnRN(openEditEvent, event);
              });
              
              const swipeGesture = Gesture.Pan()
                .activeOffsetX(-50)
                .onEnd((e) => {
                  if (e.translationX < -100) {
                    scheduleOnRN(confirmDeleteEventSwipe, event);
                  }
                });
              
              const composedGesture = Gesture.Race(tapGesture, swipeGesture);
              
              return (
                <GestureDetector key={event.id} gesture={composedGesture}>
                  <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
                    <Pressable onPress={() => openEditEvent(event)} testID={`event-card-${event.id}`}>
                      <Card style={isMultiDay ? [styles.eventCard, styles.multiDayCard] : styles.eventCard}>
                      <View
                        style={[
                          styles.eventColorBar,
                          { backgroundColor: eventColor },
                          isMultiDay && styles.multiDayBar,
                        ]}
                      />
                      <View style={styles.eventContent}>
                        <View style={styles.eventHeader}>
                          {event.shortCode ? (
                            <View style={[styles.shortCodeBadge, { backgroundColor: eventColor + "20" }]}>
                              <ThemedText style={[styles.shortCodeText, { color: eventColor }]}>
                                {event.shortCode}
                              </ThemedText>
                            </View>
                          ) : null}
                          <ThemedText style={[styles.eventTitle, { color: colors.text, flex: 1 }]}>
                            {event.title}
                          </ThemedText>
                          {event.recurrence ? (
                            <Feather name="repeat" size={14} color={colors.textSecondary} />
                          ) : null}
                        </View>
                        <View style={styles.eventMeta}>
                          <ThemedText style={[styles.eventTime, { color: colors.textSecondary }]}>
                            {event.allDay
                              ? t.calendar.allDay
                              : `${formatTime(new Date(event.startDate))}${
                                  event.endDate
                                    ? ` - ${formatTime(new Date(event.endDate))}`
                                    : ""
                                }`}
                          </ThemedText>
                          <View style={[styles.categoryBadge, { backgroundColor: eventColor + "15" }]}>
                            <ThemedText style={[styles.categoryText, { color: eventColor }]}>
                              {categoryLabel}
                            </ThemedText>
                          </View>
                        </View>
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
                  </Animated.View>
                </GestureDetector>
              );
            })
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
              <View style={styles.formRow}>
                <View style={{ flex: 2 }}>
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
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    {t.calendar.shortCode}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.textInput,
                      { backgroundColor: theme.backgroundRoot, color: colors.text },
                    ]}
                    value={formData.shortCode}
                    onChangeText={(text) => setFormData({ ...formData, shortCode: text.toUpperCase().slice(0, 4) })}
                    placeholder={t.calendar.shortCodeHint}
                    placeholderTextColor={colors.textSecondary}
                    maxLength={4}
                    testID="input-event-shortcode"
                  />
                </View>
              </View>

              <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t.calendar.category}
              </ThemedText>
              <View style={styles.categoryPicker}>
                {CATEGORIES.map((cat) => {
                  const catKey = cat as keyof typeof t.calendar.categories;
                  return (
                    <Pressable
                      key={cat}
                      style={[
                        styles.categoryOption,
                        { backgroundColor: CATEGORY_COLORS[cat] + "15", borderColor: CATEGORY_COLORS[cat] },
                        formData.category === cat && { backgroundColor: CATEGORY_COLORS[cat] },
                      ]}
                      onPress={() => setFormData({ ...formData, category: cat, color: CATEGORY_COLORS[cat] })}
                      testID={`category-option-${cat}`}
                    >
                      <ThemedText
                        style={[
                          styles.categoryOptionText,
                          { color: formData.category === cat ? "#FFF" : CATEGORY_COLORS[cat] },
                        ]}
                      >
                        {t.calendar.categories[catKey]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

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
                  trackColor={{ false: colors.border, true: CategoryColors.calendar }}
                  testID="switch-all-day"
                />
              </View>

              <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t.places.selectPlace}
              </ThemedText>
              <Pressable
                style={[styles.placeSelector, { backgroundColor: theme.backgroundRoot, borderColor: colors.border }]}
                onPress={() => setShowPlacePicker(true)}
                testID="button-select-place"
              >
                <Feather name="map-pin" size={18} color={formData.placeId ? CategoryColors.calendar : colors.textSecondary} />
                <ThemedText style={[styles.placeSelectorText, { color: formData.placeId ? colors.text : colors.textSecondary }]}>
                  {formData.placeId ? places?.find(p => p.id === formData.placeId)?.name || t.places.selectPlace : t.places.selectPlace}
                </ThemedText>
                {formData.placeId ? (
                  <Pressable onPress={() => setFormData({ ...formData, placeId: null })} hitSlop={10}>
                    <Feather name="x" size={18} color={colors.textSecondary} />
                  </Pressable>
                ) : (
                  <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                )}
              </Pressable>

              <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t.calendar.recurrence.title}
              </ThemedText>
              <View style={styles.recurrencePicker}>
                {RECURRENCE_FREQUENCIES.map((freq) => {
                  const freqKey = freq as keyof typeof t.calendar.recurrence;
                  return (
                    <Pressable
                      key={freq}
                      style={[
                        styles.recurrenceOption,
                        { backgroundColor: theme.backgroundRoot },
                        formData.recurrenceFrequency === freq && { backgroundColor: CategoryColors.calendar },
                      ]}
                      onPress={() => setFormData({ ...formData, recurrenceFrequency: freq })}
                      testID={`recurrence-option-${freq}`}
                    >
                      <ThemedText
                        style={[
                          styles.recurrenceOptionText,
                          { color: formData.recurrenceFrequency === freq ? "#FFF" : colors.text },
                        ]}
                      >
                        {t.calendar.recurrence[freqKey]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
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
                  <ThemedText style={{ color: colors.buttonText }}>{t.common.delete}</ThemedText>
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
                style={[styles.saveButton, { backgroundColor: CategoryColors.calendar }]}
                onPress={handleSaveEvent}
                testID="button-save-event"
              >
                <ThemedText style={{ color: colors.buttonText }}>{t.common.save}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                {t.calendar.filters.title}
              </ThemedText>
              <Pressable onPress={() => setShowFilters(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <ThemedText style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t.calendar.filters.byCategory}
              </ThemedText>
              <View style={styles.filterOptions}>
                <Pressable
                  style={[
                    styles.filterOption,
                    { backgroundColor: filters.category === null ? CategoryColors.calendar : theme.backgroundRoot },
                  ]}
                  onPress={() => setFilters({ ...filters, category: null })}
                >
                  <ThemedText style={{ color: filters.category === null ? "#FFF" : colors.text }}>
                    {t.calendar.filters.all}
                  </ThemedText>
                </Pressable>
                {CATEGORIES.map((cat) => {
                  const catKey = cat as keyof typeof t.calendar.categories;
                  const isActive = filters.category === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[
                        styles.filterOption,
                        { backgroundColor: isActive ? CATEGORY_COLORS[cat] : CATEGORY_COLORS[cat] + "15" },
                      ]}
                      onPress={() => setFilters({ ...filters, category: cat })}
                    >
                      <ThemedText style={{ color: isActive ? "#FFF" : CATEGORY_COLORS[cat] }}>
                        {t.calendar.categories[catKey]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.cancelButton, { borderColor: colors.border, flex: 1 }]}
                onPress={() => {
                  setFilters({ category: null, assignedTo: null });
                  setShowFilters(false);
                }}
              >
                <ThemedText style={{ color: colors.text }}>{t.calendar.filters.reset}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: CategoryColors.calendar, flex: 1 }]}
                onPress={() => setShowFilters(false)}
              >
                <ThemedText style={{ color: colors.buttonText }}>{t.common.confirm}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <PlacePickerModal
        visible={showPlacePicker}
        onClose={() => setShowPlacePicker(false)}
        onSelect={(place) => {
          setFormData({ ...formData, placeId: place.id });
          setShowPlacePicker(false);
        }}
        selectedPlaceId={formData.placeId}
      />
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
    alignItems: "center",
    gap: Spacing.md,
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
    alignItems: "center",
  },
  formRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  categoryPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  categoryOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  categoryOptionText: {
    ...Typography.small,
    fontWeight: "500",
  },
  placeSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  placeSelectorText: {
    ...Typography.body,
    flex: 1,
  },
  recurrencePicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  recurrenceOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  recurrenceOptionText: {
    ...Typography.small,
  },
  eventCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  eventCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  eventCountText: {
    fontSize: 10,
    fontWeight: "600",
  },
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  filterBadgeText: {
    ...Typography.small,
    fontWeight: "500",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  shortCodeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  shortCodeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "500",
  },
  multiDayCard: {
    borderLeftWidth: 0,
  },
  multiDayBar: {
    width: 8,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  filterOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  viewToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  viewToggleButton: {
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  monthGrid: {
    marginBottom: Spacing.lg,
  },
  weekdayHeader: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  weekdayText: {
    ...Typography.small,
    fontWeight: "600",
  },
  monthDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  monthDayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
  },
  monthDayNumber: {
    ...Typography.small,
    fontWeight: "500",
  },
  monthEventIndicators: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  monthEventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  monthEventCount: {
    fontSize: 8,
    fontWeight: "600",
  },
});
