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
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius, Typography, CategoryColors, CategoryBackgrounds, RainbowButtonColors } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { PlacePickerModal, Place } from "@/components/PlacePickerModal";
import type { Task, ShoppingItem, FamilyMember } from "@shared/types";
import { ScrollableHeader } from "@/components/ScrollableHeader";

type TabType = "shopping" | "tasks";
type ShoppingFilter = "all" | "toBuy" | "purchased";
type TaskFilter = "all" | "pending" | "completed" | "overdue";

export default function ListsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const permissions = user?.permissions ?? {
    canViewCalendar: true,
    canViewTasks: true,
    canViewShopping: true,
    canViewBudget: false,
    canViewPlaces: true,
    canModifyItems: true,
  };

  const defaultTab: TabType = permissions.canViewShopping ? "shopping" : "tasks";
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [shoppingFilter, setShoppingFilter] = useState<ShoppingFilter>("all");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [newItemName, setNewItemName] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editUnit, setEditUnit] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const colors = isDark ? Colors.dark : Colors.light;
  const screenWidth = Dimensions.get("window").width;

  const { data: members } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family/members"],
    enabled: isAuthenticated,
  });

  const getMemberName = useCallback((userId: string | null | undefined) => {
    if (!userId) return t.tasks.noAssignment;
    const member = members?.find((m) => m.id === userId);
    return member?.displayName || member?.username || t.tasks.noAssignment;
  }, [members, t]);

  const {
    data: shoppingItems,
    isLoading: shoppingLoading,
    refetch: refetchShopping,
    isRefetching: shoppingRefetching,
  } = useQuery<ShoppingItem[]>({
    queryKey: ["/api/shopping"],
    enabled: isAuthenticated && permissions.canViewShopping,
  });

  const {
    data: tasks,
    isLoading: tasksLoading,
    refetch: refetchTasks,
    isRefetching: tasksRefetching,
  } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated && permissions.canViewTasks,
  });

  const { data: places } = useQuery<Place[]>({
    queryKey: ["/api/places"],
    enabled: isAuthenticated && permissions.canViewPlaces,
  });

  const getPlaceName = useCallback((placeId: string | null | undefined) => {
    if (!placeId) return null;
    const place = places?.find((p) => p.id === placeId);
    return place?.name || null;
  }, [places]);

  const createShoppingMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/shopping", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping"] });
      setNewItemName("");
      setIsAddingItem(false);
    },
  });

  const updateShoppingMutation = useMutation({
    mutationFn: async ({ id, purchased }: { id: string; purchased: boolean }) => {
      return apiRequest("PUT", `/api/shopping/${id}`, { purchased });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping"] });
    },
  });

  const updateShoppingDetailsMutation = useMutation({
    mutationFn: async ({ id, name, quantity, unit, purchased }: { id: string; name: string; quantity: number; unit: string; purchased: boolean }) => {
      return apiRequest("PUT", `/api/shopping/${id}`, { name, quantity, unit, purchased });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping"] });
      setSelectedItem(null);
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteShoppingMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/shopping/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: { title: string; placeId?: string | null }) => {
      return apiRequest("POST", "/api/tasks", { title: data.title, placeId: data.placeId || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setNewItemName("");
      setSelectedPlaceId(null);
      setIsAddingItem(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      return apiRequest("PUT", `/api/tasks/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const updateTaskDetailsMutation = useMutation({
    mutationFn: async ({ id, title, description, completed }: { id: string; title: string; description?: string; completed: boolean }) => {
      return apiRequest("PUT", `/api/tasks/${id}`, { title, description, completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setSelectedItem(null);
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const filteredShoppingItems = useMemo(() => {
    if (!shoppingItems) return [];
    let items: ShoppingItem[];
    switch (shoppingFilter) {
      case "toBuy":
        items = shoppingItems.filter((i) => !i.purchased);
        break;
      case "purchased":
        items = shoppingItems.filter((i) => i.purchased);
        break;
      default:
        items = [...shoppingItems];
    }
    return items.sort((a, b) => {
      if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [shoppingItems, shoppingFilter]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    const now = new Date();
    switch (taskFilter) {
      case "pending":
        return tasks.filter((t) => !t.completed);
      case "completed":
        return tasks.filter((t) => t.completed);
      case "overdue":
        return tasks.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) < now);
      default:
        return tasks;
    }
  }, [tasks, taskFilter]);

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    if (activeTab === "shopping") {
      createShoppingMutation.mutate(newItemName.trim());
    } else {
      createTaskMutation.mutate({ title: newItemName.trim(), placeId: selectedPlaceId });
    }
  };

  const handleToggleShopping = (item: ShoppingItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateShoppingMutation.mutate({ id: item.id, purchased: !item.purchased });
  };

  const handleToggleTask = (task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateTaskMutation.mutate({ id: task.id, completed: !task.completed });
  };

  const confirmDeleteShopping = (item: ShoppingItem) => {
    Alert.alert(t.shopping.deleteItem, t.shopping.deleteConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: () => deleteShoppingMutation.mutate(item.id),
      },
    ]);
  };

  const confirmDeleteTask = (task: Task) => {
    Alert.alert(t.tasks.deleteTask, t.tasks.deleteConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: () => deleteTaskMutation.mutate(task.id),
      },
    ]);
  };

  const handleOpenShoppingModal = useCallback((item: ShoppingItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(item);
    setEditName(item.name);
    setEditQuantity(String(item.quantity || 1));
    setEditUnit(item.unit || "");
    setIsEditing(false);
  }, []);

  const handleOpenTaskModal = useCallback((task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItem(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setIsEditing(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedItem(null);
    setIsEditing(false);
  }, []);

  const handleSaveShopping = useCallback(() => {
    if (!selectedItem || !("name" in selectedItem)) return;
    updateShoppingDetailsMutation.mutate({
      id: selectedItem.id,
      name: editName.trim(),
      quantity: parseInt(editQuantity) || 1,
      unit: editUnit.trim(),
      purchased: selectedItem.purchased,
    });
  }, [selectedItem, editName, editQuantity, editUnit, updateShoppingDetailsMutation]);

  const handleSaveTask = useCallback(() => {
    if (!selectedItem || !("title" in selectedItem)) return;
    updateTaskDetailsMutation.mutate({
      id: selectedItem.id,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      completed: selectedItem.completed,
    });
  }, [selectedItem, editTitle, editDescription, updateTaskDetailsMutation]);

  const handleToggleShoppingFromModal = useCallback(() => {
    if (!selectedItem || !("name" in selectedItem)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...selectedItem, purchased: !selectedItem.purchased };
    setSelectedItem(updated);
    updateShoppingMutation.mutate({ id: selectedItem.id, purchased: !selectedItem.purchased });
  }, [selectedItem, updateShoppingMutation]);

  const handleToggleTaskFromModal = useCallback(() => {
    if (!selectedItem || !("title" in selectedItem)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = { ...selectedItem, completed: !selectedItem.completed };
    setSelectedItem(updated);
    updateTaskMutation.mutate({ id: selectedItem.id, completed: !selectedItem.completed });
  }, [selectedItem, updateTaskMutation]);

  const priorityColors: Record<string, string> = {
    low: colors.success,
    medium: colors.warning,
    high: colors.error,
  };

  const renderShoppingItem = ({ item }: { item: ShoppingItem }) => {
    const handleDelete = () => confirmDeleteShopping(item);

    const tapGesture = Gesture.Tap()
      .onEnd(() => {
        scheduleOnRN(handleOpenShoppingModal, item);
      });

    const swipeGesture = Gesture.Pan()
      .activeOffsetX([-20, 20])
      .onEnd((event) => {
        if (event.translationX < -100) {
          scheduleOnRN(handleDelete);
        }
      });

    const composedGestures = Gesture.Race(tapGesture, swipeGesture);

    return (
      <GestureDetector gesture={composedGestures}>
        <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
          <Card style={styles.itemCard}>
            <Pressable
              onPress={() => handleToggleShopping(item)}
              style={styles.checkbox}
              testID={`shopping-toggle-${item.id}`}
            >
              <View
                style={[
                  styles.checkboxInner,
                  {
                    backgroundColor: item.purchased ? CategoryColors.lists : "transparent",
                    borderColor: item.purchased ? CategoryColors.lists : colors.border,
                  },
                ]}
              >
                {item.purchased ? (
                  <Feather name="check" size={14} color={colors.buttonText} />
                ) : null}
              </View>
            </Pressable>
            <Pressable style={styles.itemContent} onPress={() => handleOpenShoppingModal(item)}>
              <ThemedText
                style={[
                  styles.itemName,
                  { color: colors.text },
                  item.purchased && styles.itemCompleted,
                ]}
              >
                {item.name}
              </ThemedText>
              {item.quantity > 1 || item.unit ? (
                <ThemedText style={[styles.itemMeta, { color: colors.textSecondary }]}>
                  {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                </ThemedText>
              ) : null}
            </Pressable>
            {permissions.canModifyItems ? (
              <Pressable onPress={handleDelete} hitSlop={8} testID={`shopping-delete-${item.id}`}>
                <Feather name="trash-2" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </Card>
        </Animated.View>
      </GestureDetector>
    );
  };

  const renderTask = ({ item }: { item: Task }) => {
    const isOverdue = !item.completed && item.dueDate && new Date(item.dueDate) < new Date();
    const handleDelete = () => confirmDeleteTask(item);

    const tapGesture = Gesture.Tap()
      .onEnd(() => {
        scheduleOnRN(handleOpenTaskModal, item);
      });

    const swipeGesture = Gesture.Pan()
      .activeOffsetX([-20, 20])
      .onEnd((event) => {
        if (event.translationX < -100) {
          scheduleOnRN(handleDelete);
        }
      });

    const composedGestures = Gesture.Race(tapGesture, swipeGesture);

    return (
      <GestureDetector gesture={composedGestures}>
        <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
          <Card style={styles.itemCard}>
            <Pressable
              onPress={() => handleToggleTask(item)}
              style={styles.checkbox}
              testID={`task-toggle-${item.id}`}
            >
              <View
                style={[
                  styles.checkboxInner,
                  {
                    backgroundColor: item.completed ? CategoryColors.lists : "transparent",
                    borderColor: item.completed ? CategoryColors.lists : colors.border,
                  },
                ]}
              >
                {item.completed ? (
                  <Feather name="check" size={14} color={colors.buttonText} />
                ) : null}
              </View>
            </Pressable>
            <Pressable style={styles.itemContent} onPress={() => handleOpenTaskModal(item)}>
              <View style={styles.taskHeader}>
                <ThemedText
                  style={[
                    styles.itemName,
                    { color: colors.text },
                    item.completed && styles.itemCompleted,
                  ]}
                >
                  {item.title}
                </ThemedText>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: priorityColors[item.priority] },
                  ]}
                />
              </View>
              <View style={styles.taskMeta}>
                {item.dueDate ? (
                  <ThemedText
                    style={[
                      styles.dueDateText,
                      { color: isOverdue ? colors.error : colors.textSecondary },
                    ]}
                  >
                    <Feather name="clock" size={12} />{" "}
                    {new Date(item.dueDate).toLocaleDateString()}
                  </ThemedText>
                ) : null}
                {item.assignedTo ? (
                  <ThemedText style={[styles.assigneeText, { color: colors.textSecondary }]}>
                    <Feather name="user" size={12} /> {getMemberName(item.assignedTo)}
                  </ThemedText>
                ) : null}
                {permissions.canViewPlaces && item.placeId ? (
                  <ThemedText style={[styles.placeText, { color: colors.textSecondary }]}>
                    <Feather name="map-pin" size={12} /> {getPlaceName(item.placeId) || ""}
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
            {permissions.canModifyItems ? (
              <Pressable onPress={handleDelete} hitSlop={8} testID={`task-delete-${item.id}`}>
                <Feather name="trash-2" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </Card>
        </Animated.View>
      </GestureDetector>
    );
  };

  const renderTabSelector = () => {
    const showBothTabs = permissions.canViewShopping && permissions.canViewTasks;
    if (!showBothTabs) return null;
    
    return (
      <View style={[styles.tabContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <Pressable
          style={[
            styles.tabButton,
            activeTab === "shopping" && { backgroundColor: CategoryColors.lists },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("shopping");
          }}
          testID="tab-shopping"
          accessibilityLabel={t.lists.shopping}
          accessibilityRole="tab"
        >
          <Feather
            name="shopping-cart"
            size={16}
            color={activeTab === "shopping" ? colors.buttonText : colors.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabText,
              { color: activeTab === "shopping" ? colors.buttonText : colors.textSecondary },
            ]}
          >
            {t.lists.shopping}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.tabButton,
            activeTab === "tasks" && { backgroundColor: CategoryColors.lists },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("tasks");
          }}
          testID="tab-tasks"
          accessibilityLabel={t.lists.tasks}
          accessibilityRole="tab"
        >
          <Feather
            name="check-square"
            size={16}
            color={activeTab === "tasks" ? colors.buttonText : colors.textSecondary}
          />
          <ThemedText
            style={[
              styles.tabText,
              { color: activeTab === "tasks" ? colors.buttonText : colors.textSecondary },
            ]}
          >
            {t.lists.tasks}
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  const renderShoppingFilters = () => (
    <View style={styles.filterRow}>
      {(["all", "toBuy", "purchased"] as ShoppingFilter[]).map((filter) => (
        <Pressable
          key={filter}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                shoppingFilter === filter ? CategoryColors.lists : colors.backgroundSecondary,
            },
          ]}
          onPress={() => setShoppingFilter(filter)}
          testID={`filter-shopping-${filter}`}
        >
          <ThemedText
            style={[
              styles.filterText,
              { color: shoppingFilter === filter ? colors.buttonText : colors.textSecondary },
            ]}
          >
            {filter === "all"
              ? t.shopping.all
              : filter === "toBuy"
              ? t.shopping.toBuy
              : t.shopping.purchased}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  const renderTaskFilters = () => (
    <View style={styles.filterRow}>
      {(["all", "pending", "completed", "overdue"] as TaskFilter[]).map((filter) => (
        <Pressable
          key={filter}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                taskFilter === filter ? CategoryColors.lists : colors.backgroundSecondary,
            },
          ]}
          onPress={() => setTaskFilter(filter)}
          testID={`filter-task-${filter}`}
        >
          <ThemedText
            style={[
              styles.filterText,
              { color: taskFilter === filter ? colors.buttonText : colors.textSecondary },
            ]}
          >
            {filter === "all"
              ? t.tasks.all
              : filter === "pending"
              ? t.tasks.pending
              : filter === "completed"
              ? t.tasks.completed
              : t.tasks.overdue}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  const renderAddInput = () => {
    if (!permissions.canModifyItems) return null;
    
    return (
      <View style={[styles.addInputContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.addInputRow}>
          <TextInput
            style={[styles.addInput, { color: colors.text, borderColor: colors.border }]}
            placeholder={activeTab === "shopping" ? t.shopping.itemName : t.tasks.taskTitle}
            placeholderTextColor={colors.textSecondary}
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
            testID="input-new-item"
          />
          {activeTab === "tasks" && permissions.canViewPlaces ? (
            <Pressable
              style={[
                styles.placeButton,
                { 
                  backgroundColor: selectedPlaceId ? CategoryColors.lists : colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowPlacePicker(true)}
              testID="button-select-place"
            >
              <Feather 
                name="map-pin" 
                size={18} 
                color={selectedPlaceId ? colors.buttonText : colors.textSecondary} 
              />
            </Pressable>
          ) : null}
          <Pressable
            style={[
              styles.addButton, 
              { 
                backgroundColor: CategoryColors.lists,
                opacity: newItemName.trim() ? 1 : 0.5,
              }
            ]}
            onPress={handleAddItem}
            disabled={!newItemName.trim()}
            testID="button-add-item"
            accessibilityLabel={activeTab === "shopping" ? t.shopping.addItem : t.tasks.addTask}
            accessibilityRole="button"
          >
            <Feather name="plus" size={20} color={colors.buttonText} />
          </Pressable>
        </View>
        {activeTab === "tasks" && selectedPlaceId ? (
          <View style={styles.selectedPlaceRow}>
            <Feather name="map-pin" size={14} color={CategoryColors.lists} />
            <ThemedText style={[styles.selectedPlaceText, { color: colors.text }]}>
              {getPlaceName(selectedPlaceId)}
            </ThemedText>
            <Pressable onPress={() => setSelectedPlaceId(null)} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather
        name={activeTab === "shopping" ? "shopping-cart" : "check-square"}
        size={48}
        color={colors.textSecondary}
      />
      <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
        {activeTab === "shopping" ? t.shopping.noItems : t.tasks.noTasks}
      </ThemedText>
    </View>
  );

  const renderShoppingModal = () => {
    if (!selectedItem || !("name" in selectedItem)) return null;
    const item = selectedItem as ShoppingItem;

    return (
      <Modal
        visible={true}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboardView}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: colors.surface, width: screenWidth - Spacing.xl * 2 }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                  {isEditing ? "Modifica articolo" : "Dettagli articolo"}
                </ThemedText>
                <Pressable style={styles.modalCloseButton} onPress={handleCloseModal}>
                  <Feather name="x" size={24} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                {isEditing ? (
                  <>
                    <View style={styles.modalFieldGroup}>
                      <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                        {"Nome"}
                      </ThemedText>
                      <TextInput
                        style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder={t.shopping?.itemName || "Nome articolo"}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.modalRowFields}>
                      <View style={[styles.modalFieldGroup, { flex: 1 }]}>
                        <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                          {t.shopping?.quantity || "Quantita"}
                        </ThemedText>
                        <TextInput
                          style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                          value={editQuantity}
                          onChangeText={setEditQuantity}
                          keyboardType="numeric"
                          placeholder="1"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                      <View style={[styles.modalFieldGroup, { flex: 1 }]}>
                        <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                          {t.shopping?.unit || "Unita"}
                        </ThemedText>
                        <TextInput
                          style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                          value={editUnit}
                          onChangeText={setEditUnit}
                          placeholder="pz, kg, l..."
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.modalFieldGroup}>
                      <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                        {"Nome"}
                      </ThemedText>
                      <ThemedText style={[styles.modalValue, { color: colors.text }]}>
                        {item.name}
                      </ThemedText>
                    </View>
                    <View style={styles.modalRowFields}>
                      <View style={[styles.modalFieldGroup, { flex: 1 }]}>
                        <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                          {t.shopping?.quantity || "Quantita"}
                        </ThemedText>
                        <ThemedText style={[styles.modalValue, { color: colors.text }]}>
                          {item.quantity || 1}
                        </ThemedText>
                      </View>
                      <View style={[styles.modalFieldGroup, { flex: 1 }]}>
                        <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                          {t.shopping?.unit || "Unita"}
                        </ThemedText>
                        <ThemedText style={[styles.modalValue, { color: colors.text }]}>
                          {item.unit || "-"}
                        </ThemedText>
                      </View>
                    </View>
                  </>
                )}

                <View style={styles.modalFieldGroup}>
                  <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                    {"Stato"}
                  </ThemedText>
                  <Pressable
                    style={[styles.modalStatusToggle, { backgroundColor: item.purchased ? CategoryColors.lists : colors.backgroundSecondary }]}
                    onPress={handleToggleShoppingFromModal}
                  >
                    <Feather name={item.purchased ? "check-circle" : "circle"} size={20} color={item.purchased ? colors.buttonText : colors.textSecondary} />
                    <ThemedText style={[styles.modalStatusText, { color: item.purchased ? colors.buttonText : colors.textSecondary }]}>
                      {item.purchased ? (t.shopping?.purchased || "Acquistato") : (t.shopping?.toBuy || "Da comprare")}
                    </ThemedText>
                  </Pressable>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                {isEditing ? (
                  <>
                    <Pressable
                      style={[styles.modalButton, { backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => setIsEditing(false)}
                    >
                      <ThemedText style={[styles.modalButtonText, { color: colors.text }]}>
                        {t.common.cancel}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={[styles.modalButton, { backgroundColor: CategoryColors.lists }]}
                      onPress={handleSaveShopping}
                    >
                      <Feather name="save" size={16} color={colors.buttonText} />
                      <ThemedText style={[styles.modalButtonText, { color: colors.buttonText }]}>
                        {t.common.save || "Salva"}
                      </ThemedText>
                    </Pressable>
                  </>
                ) : (
                  <>
                    {permissions.canModifyItems ? (
                      <>
                        <Pressable
                          style={[styles.modalButton, { backgroundColor: colors.error }]}
                          onPress={() => {
                            handleCloseModal();
                            confirmDeleteShopping(item);
                          }}
                        >
                          <Feather name="trash-2" size={16} color={colors.buttonText} />
                          <ThemedText style={[styles.modalButtonText, { color: colors.buttonText }]}>
                            {t.common.delete}
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          style={[styles.modalButton, { backgroundColor: CategoryColors.lists }]}
                          onPress={() => setIsEditing(true)}
                        >
                          <Feather name="edit-2" size={16} color={colors.buttonText} />
                          <ThemedText style={[styles.modalButtonText, { color: colors.buttonText }]}>
                            {t.common.edit || "Modifica"}
                          </ThemedText>
                        </Pressable>
                      </>
                    ) : null}
                  </>
                )}
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    );
  };

  const renderTaskModal = () => {
    if (!selectedItem || !("title" in selectedItem)) return null;
    const task = selectedItem as Task;
    const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();

    return (
      <Modal
        visible={true}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboardView}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: colors.surface, width: screenWidth - Spacing.xl * 2 }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitle}>
                  <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                    {isEditing ? "Modifica attività" : "Dettagli attività"}
                  </ThemedText>
                  <View style={[styles.priorityBadgeLarge, { backgroundColor: priorityColors[task.priority] }]} />
                </View>
                <Pressable style={styles.modalCloseButton} onPress={handleCloseModal}>
                  <Feather name="x" size={24} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                {isEditing ? (
                  <>
                    <View style={styles.modalFieldGroup}>
                      <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                        {t.tasks?.title || "Titolo"}
                      </ThemedText>
                      <TextInput
                        style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                        value={editTitle}
                        onChangeText={setEditTitle}
                        placeholder={t.tasks?.taskTitle || "Titolo attivita"}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.modalFieldGroup}>
                      <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                        {"Descrizione"}
                      </ThemedText>
                      <TextInput
                        style={[styles.modalInputMultiline, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                        value={editDescription}
                        onChangeText={setEditDescription}
                        placeholder={"Aggiungi descrizione..."}
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.modalFieldGroup}>
                      <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                        {t.tasks?.title || "Titolo"}
                      </ThemedText>
                      <ThemedText style={[styles.modalValue, { color: colors.text }, task.completed && styles.modalValueCompleted]}>
                        {task.title}
                      </ThemedText>
                    </View>
                    <View style={styles.modalFieldGroup}>
                      <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                        {"Descrizione"}
                      </ThemedText>
                      <ThemedText style={[styles.modalValue, { color: task.description ? colors.text : colors.textSecondary }]}>
                        {task.description || "Nessuna descrizione"}
                      </ThemedText>
                    </View>
                  </>
                )}

                <View style={styles.modalRowFields}>
                  {task.dueDate ? (
                    <View style={[styles.modalFieldGroup, { flex: 1 }]}>
                      <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                        {t.tasks?.dueDate || "Scadenza"}
                      </ThemedText>
                      <View style={styles.modalMetaRow}>
                        <Feather name="clock" size={16} color={isOverdue ? colors.error : colors.textSecondary} />
                        <ThemedText style={[styles.modalMetaText, { color: isOverdue ? colors.error : colors.text }]}>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </ThemedText>
                      </View>
                    </View>
                  ) : null}
                  <View style={[styles.modalFieldGroup, { flex: 1 }]}>
                    <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                      {t.tasks?.priority || "Priorita"}
                    </ThemedText>
                    <View style={styles.modalMetaRow}>
                      <View style={[styles.priorityBadge, { backgroundColor: priorityColors[task.priority] }]} />
                      <ThemedText style={[styles.modalMetaText, { color: colors.text }]}>
                        {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Bassa"}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <View style={styles.modalRowFields}>
                  {task.assignedTo ? (
                    <View style={[styles.modalFieldGroup, { flex: 1 }]}>
                      <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                        {"Assegnato a"}
                      </ThemedText>
                      <View style={styles.modalMetaRow}>
                        <Feather name="user" size={16} color={colors.textSecondary} />
                        <ThemedText style={[styles.modalMetaText, { color: colors.text }]}>
                          {getMemberName(task.assignedTo)}
                        </ThemedText>
                      </View>
                    </View>
                  ) : null}
                  {permissions.canViewPlaces && task.placeId ? (
                    <View style={[styles.modalFieldGroup, { flex: 1 }]}>
                      <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                        {"Luogo"}
                      </ThemedText>
                      <View style={styles.modalMetaRow}>
                        <Feather name="map-pin" size={16} color={colors.textSecondary} />
                        <ThemedText style={[styles.modalMetaText, { color: colors.text }]}>
                          {getPlaceName(task.placeId) || ""}
                        </ThemedText>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={styles.modalFieldGroup}>
                  <ThemedText style={[styles.modalLabel, { color: colors.textSecondary }]}>
                    {"Stato"}
                  </ThemedText>
                  <Pressable
                    style={[styles.modalStatusToggle, { backgroundColor: task.completed ? CategoryColors.lists : colors.backgroundSecondary }]}
                    onPress={handleToggleTaskFromModal}
                  >
                    <Feather name={task.completed ? "check-circle" : "circle"} size={20} color={task.completed ? colors.buttonText : colors.textSecondary} />
                    <ThemedText style={[styles.modalStatusText, { color: task.completed ? colors.buttonText : colors.textSecondary }]}>
                      {task.completed ? (t.tasks?.completed || "Completato") : (t.tasks?.pending || "In sospeso")}
                    </ThemedText>
                  </Pressable>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                {isEditing ? (
                  <>
                    <Pressable
                      style={[styles.modalButton, { backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => setIsEditing(false)}
                    >
                      <ThemedText style={[styles.modalButtonText, { color: colors.text }]}>
                        {t.common.cancel}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={[styles.modalButton, { backgroundColor: CategoryColors.lists }]}
                      onPress={handleSaveTask}
                    >
                      <Feather name="save" size={16} color={colors.buttonText} />
                      <ThemedText style={[styles.modalButtonText, { color: colors.buttonText }]}>
                        {t.common.save || "Salva"}
                      </ThemedText>
                    </Pressable>
                  </>
                ) : (
                  <>
                    {permissions.canModifyItems ? (
                      <>
                        <Pressable
                          style={[styles.modalButton, { backgroundColor: colors.error }]}
                          onPress={() => {
                            handleCloseModal();
                            confirmDeleteTask(task);
                          }}
                        >
                          <Feather name="trash-2" size={16} color={colors.buttonText} />
                          <ThemedText style={[styles.modalButtonText, { color: colors.buttonText }]}>
                            {t.common.delete}
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          style={[styles.modalButton, { backgroundColor: CategoryColors.lists }]}
                          onPress={() => setIsEditing(true)}
                        >
                          <Feather name="edit-2" size={16} color={colors.buttonText} />
                          <ThemedText style={[styles.modalButtonText, { color: colors.buttonText }]}>
                            {t.common.edit || "Modifica"}
                          </ThemedText>
                        </Pressable>
                      </>
                    ) : null}
                  </>
                )}
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    );
  };

  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={{ color: colors.textSecondary }}>
          {t.auth.pleaseLogin}
        </ThemedText>
      </ThemedView>
    );
  }

  const isLoading = activeTab === "shopping" ? shoppingLoading : tasksLoading;
  const isRefetching = activeTab === "shopping" ? shoppingRefetching : tasksRefetching;
  const refetch = activeTab === "shopping" ? refetchShopping : refetchTasks;
  const data = activeTab === "shopping" ? filteredShoppingItems : filteredTasks;

  if (isLoading) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={CategoryColors.lists} />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: isDark ? CategoryBackgrounds.dark.lists : CategoryBackgrounds.light.lists }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + Spacing.md,
          paddingBottom: tabBarHeight,
        }}
      >
        <ScrollableHeader />
        <View style={styles.headerSection}>
          {renderTabSelector()}
          {activeTab === "shopping" ? renderShoppingFilters() : renderTaskFilters()}
        </View>

        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenPadding,
            paddingBottom: Spacing.xl,
            flexGrow: 1,
          }}
          data={data as (ShoppingItem | Task)[]}
          keyExtractor={(item) => item.id}
          renderItem={
            activeTab === "shopping"
              ? (renderShoppingItem as any)
              : (renderTask as any)
          }
          ListEmptyComponent={renderEmptyState}
          refreshing={isRefetching}
          onRefresh={refetch}
          testID={`list-${activeTab}`}
        />

        {renderAddInput()}
      </View>

      <PlacePickerModal
        visible={showPlacePicker}
        onClose={() => setShowPlacePicker(false)}
        onSelect={(place) => {
          setSelectedPlaceId(place.id);
          setShowPlacePicker(false);
        }}
        selectedPlaceId={selectedPlaceId}
      />

      {renderShoppingModal()}
      {renderTaskModal()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  tabContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  tabText: {
    ...Typography.body,
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
  },
  filterText: {
    ...Typography.small,
    fontWeight: "500",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  checkbox: {
    marginRight: Spacing.md,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    ...Typography.body,
    fontWeight: "500",
  },
  itemCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  itemMeta: {
    ...Typography.small,
    marginTop: 2,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  priorityBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskMeta: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: 4,
  },
  dueDateText: {
    ...Typography.small,
  },
  assigneeText: {
    ...Typography.small,
  },
  placeText: {
    ...Typography.small,
  },
  addInputContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
  },
  addInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  addInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  placeButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedPlaceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  selectedPlaceText: {
    ...Typography.small,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    ...Typography.body,
    marginTop: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  modalContent: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalHeaderTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  modalTitle: {
    ...Typography.subtitle,
    fontWeight: "600",
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalScrollContent: {
    maxHeight: 400,
  },
  modalFieldGroup: {
    marginBottom: Spacing.lg,
  },
  modalRowFields: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  modalValue: {
    ...Typography.body,
    fontSize: 18,
  },
  modalValueCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  modalInputMultiline: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.body,
  },
  modalStatusToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  modalStatusText: {
    ...Typography.body,
    fontWeight: "500",
  },
  modalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  modalMetaText: {
    ...Typography.body,
  },
  priorityBadgeLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  modalButtonText: {
    ...Typography.body,
    fontWeight: "600",
  },
});
