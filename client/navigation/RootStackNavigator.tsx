import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "@/navigation/TabNavigator";
import FlowScreen from "@/screens/FlowScreen";
import MetadataEditorScreen from "@/screens/MetadataEditorScreen";
import SubmitScreen from "@/screens/SubmitScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { FlowDefinition } from "@/types/flow";

export type RootStackParamList = {
  Main: undefined;
  Flow: { flow: FlowDefinition; splashActive?: boolean };
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
        name="Flow"
        component={FlowScreen}
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
