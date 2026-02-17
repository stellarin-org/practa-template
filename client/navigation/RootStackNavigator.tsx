import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "@/navigation/TabNavigator";
import HarnessPreviewScreen from "@/screens/HarnessPreviewScreen";
import MetadataEditorScreen from "@/screens/MetadataEditorScreen";
import SubmitScreen from "@/screens/SubmitScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  HarnessPreview: { practaId: string };
  MetadataEditor: undefined;
  Submit: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HarnessPreview"
        component={HarnessPreviewScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="MetadataEditor"
        component={MetadataEditorScreen}
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="Submit"
        component={SubmitScreen}
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
    </Stack.Navigator>
  );
}
