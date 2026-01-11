import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
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
import { Colors, IconSize, BorderRadius } from "@/constants/theme";

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
  
  const colors = isDark ? Colors.dark : Colors.light;
  
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
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
        },
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
            <Feather name={AppIcons.home} size={IconSize.navigation} color={color} />
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
            <Feather name={AppIcons.calendar} size={IconSize.navigation} color={color} />
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
              <Feather name={AppIcons.tasks} size={IconSize.navigation} color={color} />
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
            <Feather name={AppIcons.notes} size={IconSize.navigation} color={color} />
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
              <Feather name={AppIcons.budget} size={IconSize.navigation} color={color} />
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
            <Feather name={AppIcons.assistant} size={IconSize.navigation} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: t.profile.title,
          tabBarIcon: ({ color, size }) => (
            <Feather name={AppIcons.profile} size={IconSize.navigation} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
