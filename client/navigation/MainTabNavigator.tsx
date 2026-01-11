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
import { Colors, IconSize, CategoryColors } from "@/constants/theme";
import { HeaderTitle } from "@/components/HeaderTitle";

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

function TabIcon({ 
  name, 
  focused, 
  categoryColor, 
  inactiveColor 
}: { 
  name: keyof typeof Feather.glyphMap; 
  focused: boolean; 
  categoryColor: string; 
  inactiveColor: string;
}) {
  return (
    <View style={styles.iconContainer}>
      <Feather 
        name={name} 
        size={IconSize.navigation} 
        color={focused ? categoryColor : inactiveColor} 
      />
      {focused ? (
        <View style={[styles.activeIndicator, { backgroundColor: categoryColor }]} />
      ) : null}
    </View>
  );
}

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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          paddingTop: 8,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: t.home.title,
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              name={AppIcons.home} 
              focused={focused} 
              categoryColor={CategoryColors.home}
              inactiveColor={colors.tabIconDefault}
            />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{
          title: t.calendar.title,
          headerShown: true,
          headerTitle: () => <HeaderTitle />,
          headerStyle: { backgroundColor: "transparent" },
          headerTransparent: true,
          headerTintColor: colors.text,
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              name={AppIcons.calendar} 
              focused={focused} 
              categoryColor={CategoryColors.calendar}
              inactiveColor={colors.tabIconDefault}
            />
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
            headerTitle: () => <HeaderTitle />,
            headerStyle: { backgroundColor: "transparent" },
            headerTransparent: true,
            headerTintColor: colors.text,
            tabBarIcon: ({ focused }) => (
              <TabIcon 
                name={AppIcons.tasks} 
                focused={focused} 
                categoryColor={CategoryColors.lists}
                inactiveColor={colors.tabIconDefault}
              />
            ),
          }}
        />
      ) : null}
      <Tab.Screen
        name="NotesTab"
        component={NotesStackNavigator}
        options={{
          title: t.notes.title,
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              name={AppIcons.notes} 
              focused={focused} 
              categoryColor={CategoryColors.notes}
              inactiveColor={colors.tabIconDefault}
            />
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
            headerTitle: () => <HeaderTitle />,
            headerStyle: { backgroundColor: "transparent" },
            headerTransparent: true,
            headerTintColor: colors.text,
            tabBarIcon: ({ focused }) => (
              <TabIcon 
                name={AppIcons.budget} 
                focused={focused} 
                categoryColor={CategoryColors.budget}
                inactiveColor={colors.tabIconDefault}
              />
            ),
          }}
        />
      ) : null}
      <Tab.Screen
        name="AssistantTab"
        component={AssistantScreen}
        options={{
          title: t.assistant.title,
          headerShown: true,
          headerTitle: () => <HeaderTitle />,
          headerStyle: { backgroundColor: "transparent" },
          headerTransparent: true,
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              name={AppIcons.assistant} 
              focused={focused} 
              categoryColor={CategoryColors.assistant}
              inactiveColor={colors.tabIconDefault}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: t.profile.title,
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              name={AppIcons.profile} 
              focused={focused} 
              categoryColor={CategoryColors.profile}
              inactiveColor={colors.tabIconDefault}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeIndicator: {
    position: "absolute",
    top: -8,
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
});
