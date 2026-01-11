import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import NotesStackNavigator from "@/navigation/NotesStackNavigator";
import CalendarScreen from "@/screens/CalendarScreen";
import ListsScreen from "@/screens/ListsScreen";
import BudgetScreen from "@/screens/BudgetScreen";
import AssistantScreen from "@/screens/AssistantScreen";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { AppIcons } from "@/constants/icons";
import { Shadows } from "@/constants/theme";

export type MainTabParamList = {
  HomeTab: undefined;
  CalendarTab: undefined;
  ListsTab: undefined;
  NotesTab: undefined;
  BudgetTab: undefined;
  AssistantTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  
  const permissions = user?.permissions ?? {
    canViewCalendar: true,
    canViewTasks: true,
    canViewShopping: true,
    canViewBudget: false,
    canViewPlaces: true,
    canModifyItems: true,
  };
  
  const showListsTab = permissions.canViewTasks || permissions.canViewShopping;

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
            web: theme.backgroundRoot,
          }),
          borderTopWidth: Platform.OS === "web" ? 1 : 0,
          borderTopColor: theme.border,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: t.home.title,
          tabBarIcon: ({ color, size }) => (
            <Feather name={AppIcons.home} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{
          title: t.calendar.title,
          headerShown: true,
          headerTitle: t.calendar.title,
          headerStyle: { backgroundColor: theme.backgroundRoot },
          headerTintColor: theme.text,
          tabBarIcon: ({ color, size }) => (
            <Feather name={AppIcons.calendar} size={size} color={color} />
          ),
        }}
      />
      {showListsTab ? (
        <Tab.Screen
          name="ListsTab"
          component={ListsScreen}
          options={{
            title: t.lists.title,
            headerShown: true,
            headerTitle: t.lists.title,
            headerStyle: { backgroundColor: theme.backgroundRoot },
            headerTintColor: theme.text,
            tabBarIcon: ({ color, size }) => (
              <Feather name={AppIcons.tasks} size={size} color={color} />
            ),
          }}
        />
      ) : null}
      <Tab.Screen
        name="NotesTab"
        component={NotesStackNavigator}
        options={{
          title: t.notes.title,
          tabBarIcon: ({ color, size }) => (
            <Feather name={AppIcons.notes} size={size} color={color} />
          ),
        }}
      />
      {permissions.canViewBudget ? (
        <Tab.Screen
          name="BudgetTab"
          component={BudgetScreen}
          options={{
            title: t.budget.title,
            headerShown: true,
            headerTitle: t.budget.title,
            headerStyle: { backgroundColor: theme.backgroundRoot },
            headerTintColor: theme.text,
            tabBarIcon: ({ color, size }) => (
              <Feather name={AppIcons.budget} size={size} color={color} />
            ),
          }}
        />
      ) : null}
      <Tab.Screen
        name="AssistantTab"
        component={AssistantScreen}
        options={{
          title: t.assistant.title,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Feather name={AppIcons.assistant} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: t.profile.title,
          tabBarIcon: ({ color, size }) => (
            <Feather name={AppIcons.profile} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
