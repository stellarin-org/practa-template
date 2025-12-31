import React, { useCallback, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PractaTestHarness } from "@/components/PractaTestHarness";
import { resolveAssets } from "@/lib/practa-assets";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import MyPracta from "@/my-practa";
import { demoPractas } from "@/demo-practa";
import { PractaOutput } from "@/types/flow";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

type HarnessRouteProp = RouteProp<RootStackParamList, "HarnessPreview">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PRACTA_COMPONENTS: Record<string, React.ComponentType<any>> = {
  "my-practa": MyPracta,
  ...Object.fromEntries(demoPractas.map((p) => [p.id, p.component])),
};

export default function HarnessPreviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<HarnessRouteProp>();
  const { practaId } = route.params;
  const { theme } = useTheme();

  const PractaComponent = PRACTA_COMPONENTS[practaId];
  const assets = resolveAssets(practaId);

  const handleComplete = useCallback((output: PractaOutput) => {
    console.log("Practa completed:", output);
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    if (!PractaComponent) {
      console.warn(`Unknown practaId: ${practaId}`);
      navigation.goBack();
    }
  }, [PractaComponent, practaId, navigation]);

  if (!PractaComponent) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.backgroundDefault }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: Spacing.md }}>Loading...</ThemedText>
      </View>
    );
  }

  return (
    <PractaTestHarness
      PractaComponent={PractaComponent}
      assets={assets}
      onComplete={handleComplete}
      onClose={handleClose}
    />
  );
}
