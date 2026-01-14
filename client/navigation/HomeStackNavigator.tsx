import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "@/screens/HomeScreen";
import NotificationCenterScreen from "@/screens/NotificationCenterScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useI18n } from "@/lib/i18n";

export type HomeStackParamList = {
  Home: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useI18n();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationCenterScreen}
        options={{
          title: t.notifications.title,
        }}
      />
    </Stack.Navigator>
  );
}
