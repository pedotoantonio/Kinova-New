import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import NotificationSettingsScreen from "@/screens/NotificationSettingsScreen";
import FamilyMembersScreen from "@/screens/FamilyMembersScreen";
import QRScannerScreen from "@/screens/QRScannerScreen";
import DonationScreen from "@/screens/DonationScreen";
import NotesScreen from "@/screens/NotesScreen";
import NoteDetailScreen from "@/screens/NoteDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useI18n } from "@/lib/i18n";

export type ProfileStackParamList = {
  Profile: undefined;
  NotificationSettings: undefined;
  FamilyMembers: undefined;
  QRScanner: undefined;
  Donation: undefined;
  Notes: undefined;
  NoteDetail: { noteId?: string };
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
        name="Notes"
        component={NotesScreen}
        options={{
          title: t.notes.title,
        }}
      />
      <Stack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={{
          title: t.notes.title,
        }}
      />
    </Stack.Navigator>
  );
}
