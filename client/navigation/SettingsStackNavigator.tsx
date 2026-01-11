import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SettingsScreen from "@/screens/SettingsScreen";
import NotificationSettingsScreen from "@/screens/NotificationSettingsScreen";
import DonationScreen from "@/screens/DonationScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useI18n } from "@/lib/i18n";

export type SettingsStackParamList = {
  Settings: undefined;
  NotificationSettings: undefined;
  Donation: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t, language } = useI18n();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: language === "it" ? "Impostazioni" : "Settings",
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          headerTitle: t.notifications?.settings || (language === "it" ? "Notifiche" : "Notifications"),
        }}
      />
      <Stack.Screen
        name="Donation"
        component={DonationScreen}
        options={{
          headerTitle: t.donation?.title || (language === "it" ? "Supporta Kinova" : "Support Kinova"),
        }}
      />
    </Stack.Navigator>
  );
}
