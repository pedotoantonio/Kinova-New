import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import NotesScreen from "@/screens/NotesScreen";
import NoteDetailScreen from "@/screens/NoteDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useI18n } from "@/lib/i18n";
import { HeaderTitle } from "@/components/HeaderTitle";

export type NotesStackParamList = {
  Notes: undefined;
  NoteDetail: { noteId?: string };
};

const Stack = createNativeStackNavigator<NotesStackParamList>();

export default function NotesStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useI18n();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Notes"
        component={NotesScreen}
        options={{
          headerTitle: () => <HeaderTitle />,
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
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
