import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import NotificationSettingsScreen from "@/screens/NotificationSettingsScreen";
import FamilyMembersScreen from "@/screens/FamilyMembersScreen";
import QRScannerScreen from "@/screens/QRScannerScreen";
import DonationScreen from "@/screens/DonationScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import HelpScreen from "@/screens/HelpScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useI18n } from "@/lib/i18n";
import { HeaderTitle } from "@/components/HeaderTitle";

export type ProfileStackParamList = {
  Profile: undefined;
  NotificationSettings: undefined;
  FamilyMembers: undefined;
  QRScanner: undefined;
  Donation: undefined;
  Settings: undefined;
  Help: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t, language } = useI18n();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: () => <HeaderTitle />,
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: t.notifications.settings,
        }}
      />
      <Stack.Screen
        name="FamilyMembers"
        component={FamilyMembersScreen}
        options={{
          title: t.family.members,
        }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{
          title: t.family.scanQR,
        }}
      />
      <Stack.Screen
        name="Donation"
        component={DonationScreen}
        options={{
          title: t.donation.title,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: language === "it" ? "Impostazioni" : "Settings",
        }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{
          title: language === "it" ? "Aiuto" : "Help",
        }}
      />
    </Stack.Navigator>
  );
}
