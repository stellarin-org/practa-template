import React, { useCallback } from "react";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PractaTestHarness } from "@/components/PractaTestHarness";
import { resolveAssets } from "@/lib/practa-assets";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import MyPracta from "@/my-practa";
import { demoPractas } from "@/demo-practa";
import { PractaOutput } from "@/types/flow";

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

  const PractaComponent = PRACTA_COMPONENTS[practaId];
  const assets = resolveAssets(practaId);

  const handleComplete = useCallback((output: PractaOutput) => {
    console.log("Practa completed:", output);
    navigation.goBack();
  }, [navigation]);

  if (!PractaComponent) {
    navigation.goBack();
    return null;
  }

  return (
    <PractaTestHarness
      PractaComponent={PractaComponent}
      assets={assets}
      onComplete={handleComplete}
    />
  );
}
