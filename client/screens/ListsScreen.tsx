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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import type { Task, ShoppingItem, FamilyMember } from "@shared/types";

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

  const [activeTab, setActiveTab] = useState<TabType>("shopping");
  const [shoppingFilter, setShoppingFilter] = useState<ShoppingFilter>("all");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [newItemName, setNewItemName] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);

  const colors = isDark ? Colors.dark : Colors.light;

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
    enabled: isAuthenticated,
  });

  const {
    data: tasks,
    isLoading: tasksLoading,
    refetch: refetchTasks,
    isRefetching: tasksRefetching,
  } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

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

  const deleteShoppingMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/shopping/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", "/api/tasks", { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setNewItemName("");
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
    switch (shoppingFilter) {
      case "toBuy":
        return shoppingItems.filter((i) => !i.purchased);
      case "purchased":
        return shoppingItems.filter((i) => i.purchased);
      default:
        return shoppingItems;
    }
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
      createTaskMutation.mutate(newItemName.trim());
    }
  };

  const handleToggleShopping = (item: ShoppingItem) => {
    updateShoppingMutation.mutate({ id: item.id, purchased: !item.purchased });
  };

  const handleToggleTask = (task: Task) => {
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

  const priorityColors: Record<string, string> = {
    low: "#4CAF50",
    medium: "#FF9800",
    high: "#F44336",
  };

  const renderShoppingItem = ({ item }: { item: ShoppingItem }) => {
    const handleDelete = () => confirmDeleteShopping(item);

    return (
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
                  backgroundColor: item.purchased ? colors.primary : "transparent",
                  borderColor: item.purchased ? colors.primary : colors.border,
                },
              ]}
            >
              {item.purchased ? (
                <Feather name="check" size={14} color="#FFFFFF" />
              ) : null}
            </View>
          </Pressable>
          <View style={styles.itemContent}>
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
          </View>
          <Pressable onPress={handleDelete} hitSlop={8} testID={`shopping-delete-${item.id}`}>
            <Feather name="trash-2" size={18} color={colors.textSecondary} />
          </Pressable>
        </Card>
      </Animated.View>
    );
  };

  const renderTask = ({ item }: { item: Task }) => {
    const isOverdue = !item.completed && item.dueDate && new Date(item.dueDate) < new Date();
    const handleDelete = () => confirmDeleteTask(item);

    return (
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
                  backgroundColor: item.completed ? colors.primary : "transparent",
                  borderColor: item.completed ? colors.primary : colors.border,
                },
              ]}
            >
              {item.completed ? (
                <Feather name="check" size={14} color="#FFFFFF" />
              ) : null}
            </View>
          </Pressable>
          <View style={styles.itemContent}>
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
                    { color: isOverdue ? "#F44336" : colors.textSecondary },
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
            </View>
          </View>
          <Pressable onPress={handleDelete} hitSlop={8} testID={`task-delete-${item.id}`}>
            <Feather name="trash-2" size={18} color={colors.textSecondary} />
          </Pressable>
        </Card>
      </Animated.View>
    );
  };

  const renderTabSelector = () => (
    <View style={[styles.tabContainer, { backgroundColor: colors.backgroundSecondary }]}>
      <Pressable
        style={[
          styles.tabButton,
          activeTab === "shopping" && { backgroundColor: colors.primary },
        ]}
        onPress={() => setActiveTab("shopping")}
        testID="tab-shopping"
      >
        <Feather
          name="shopping-cart"
          size={16}
          color={activeTab === "shopping" ? "#FFFFFF" : colors.textSecondary}
        />
        <ThemedText
          style={[
            styles.tabText,
            { color: activeTab === "shopping" ? "#FFFFFF" : colors.textSecondary },
          ]}
        >
          {t.lists.shopping}
        </ThemedText>
      </Pressable>
      <Pressable
        style={[
          styles.tabButton,
          activeTab === "tasks" && { backgroundColor: colors.primary },
        ]}
        onPress={() => setActiveTab("tasks")}
        testID="tab-tasks"
      >
        <Feather
          name="check-square"
          size={16}
          color={activeTab === "tasks" ? "#FFFFFF" : colors.textSecondary}
        />
        <ThemedText
          style={[
            styles.tabText,
            { color: activeTab === "tasks" ? "#FFFFFF" : colors.textSecondary },
          ]}
        >
          {t.lists.tasks}
        </ThemedText>
      </Pressable>
    </View>
  );

  const renderShoppingFilters = () => (
    <View style={styles.filterRow}>
      {(["all", "toBuy", "purchased"] as ShoppingFilter[]).map((filter) => (
        <Pressable
          key={filter}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                shoppingFilter === filter ? colors.primary : colors.backgroundSecondary,
            },
          ]}
          onPress={() => setShoppingFilter(filter)}
          testID={`filter-shopping-${filter}`}
        >
          <ThemedText
            style={[
              styles.filterText,
              { color: shoppingFilter === filter ? "#FFFFFF" : colors.textSecondary },
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
                taskFilter === filter ? colors.primary : colors.backgroundSecondary,
            },
          ]}
          onPress={() => setTaskFilter(filter)}
          testID={`filter-task-${filter}`}
        >
          <ThemedText
            style={[
              styles.filterText,
              { color: taskFilter === filter ? "#FFFFFF" : colors.textSecondary },
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

  const renderAddInput = () => (
    <View style={[styles.addInputContainer, { backgroundColor: colors.backgroundSecondary }]}>
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
      <Pressable
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={handleAddItem}
        disabled={!newItemName.trim()}
        testID="button-add-item"
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );

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
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <View
        style={{
          flex: 1,
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: tabBarHeight,
        }}
      >
        <View style={styles.headerSection}>
          {renderTabSelector()}
          {activeTab === "shopping" ? renderShoppingFilters() : renderTaskFilters()}
        </View>

        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
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
    paddingHorizontal: Spacing.lg,
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
  addInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
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
});
