import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import NotificationSettingsScreen from "@/screens/NotificationSettingsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useI18n } from "@/lib/i18n";

export type ProfileStackParamList = {
  Profile: undefined;
  NotificationSettings: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useI18n();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t.profile.title,
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: t.notifications.settings,
        }}
      />
    </Stack.Navigator>
  );
}
