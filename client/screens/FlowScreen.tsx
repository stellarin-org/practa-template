import React, { useEffect, useCallback, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useFlow, useCurrentPracta } from "@/context/FlowContext";
import { FlowDefinition, FlowExecutionState, PractaOutput, PractaContext, PractaCompleteHandler } from "@/types/flow";
import MyPracta from "@/my-practa";
import { demoPractas } from "@/demo-practa";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface PractaComponentProps {
  context: PractaContext;
  onComplete: PractaCompleteHandler;
  onSkip?: () => void;
}

type PractaComponent = React.ComponentType<PractaComponentProps>;

const PRACTA_COMPONENTS: Record<string, PractaComponent> = {
  "my-practa": MyPracta,
  ...Object.fromEntries(demoPractas.map((p) => [p.id, p.component])),
};

type FlowRouteProp = RouteProp<RootStackParamList, "Flow">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function CompletionScreen({ onContinue }: { onContinue: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.completionContainer}>
      <View style={styles.completionContent}>
        <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
          <Feather name="check" size={48} color="white" />
        </View>
        <ThemedText style={styles.completionTitle}>Practa Complete</ThemedText>
        <ThemedText style={[styles.completionSubtitle, { color: theme.textSecondary }]}>
          Your Practa ran successfully!
        </ThemedText>
      </View>
      <View style={[styles.completionFooter, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          onPress={onContinue}
          style={[styles.continueButton, { backgroundColor: theme.primary }]}
        >
          <ThemedText style={styles.continueButtonText}>Back to Preview</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

export default function FlowScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FlowRouteProp>();
  const { startFlow, currentFlow, abortFlow, setOnFlowComplete } = useFlow();
  const { practa, context, complete } = useCurrentPracta();

  const { flow } = route.params;

  useEffect(() => {
    startFlow(flow);

    setOnFlowComplete(() => (flowState: FlowExecutionState) => {
      console.log("Flow completed:", flowState);
    });

    return () => {
      setOnFlowComplete(() => undefined);
    };
  }, [flow, startFlow, setOnFlowComplete]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    abortFlow();
    navigation.goBack();
  }, [abortFlow, navigation]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const emptyOutput: PractaOutput = {
      metadata: { skipped: true },
    };
    complete(emptyOutput);
  }, [complete]);

  const handleComplete = useCallback((output: PractaOutput) => {
    console.log("Practa output:", output);
    complete(output);
  }, [complete]);

  const handleContinue = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!currentFlow || currentFlow.status === "aborted") {
    return null;
  }

  if (currentFlow.status === "completed") {
    return <CompletionScreen onContinue={handleContinue} />;
  }

  if (!practa || !context) {
    return null;
  }

  const showCloseButton = currentFlow.currentIndex === 0;
  const totalSteps = currentFlow.flowDefinition.practas.length;
  const currentStep = currentFlow.currentIndex + 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        {showCloseButton ? (
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Feather name="x" size={24} color={theme.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}

        {totalSteps > 1 ? (
          <View style={styles.progressIndicator}>
            {currentFlow.flowDefinition.practas.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      index < currentStep
                        ? theme.primary
                        : index === currentFlow.currentIndex
                        ? theme.primary
                        : theme.border,
                  },
                ]}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.placeholder} />
      </View>

      <View style={styles.practaContainer}>
        {(() => {
          const PractaComponent = PRACTA_COMPONENTS[practa.type];
          if (!PractaComponent) {
            return (
              <ThemedView style={styles.errorContainer}>
                <View style={[styles.errorCircle, { backgroundColor: "#FEE2E2" }]}>
                  <Feather name="alert-triangle" size={32} color="#EF4444" />
                </View>
                <ThemedText style={styles.errorTitle}>Component Not Found</ThemedText>
                <ThemedText style={[styles.errorMessage, { color: theme.textSecondary }]}>
                  Unable to load Practa: {practa.type}
                </ThemedText>
                <Pressable
                  onPress={handleClose}
                  style={[styles.errorButton, { borderColor: theme.primary }]}
                >
                  <ThemedText style={[styles.errorButtonText, { color: theme.primary }]}>
                    Go Back
                  </ThemedText>
                </Pressable>
              </ThemedView>
            );
          }
          return (
            <PractaComponent
              context={context}
              onComplete={handleComplete}
              onSkip={totalSteps > 1 ? handleSkip : undefined}
            />
          );
        })()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  placeholder: {
    width: 40,
  },
  progressIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  practaContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  errorCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  errorButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  completionContainer: {
    flex: 1,
  },
  completionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  completionSubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  completionFooter: {
    paddingHorizontal: Spacing.lg,
  },
  continueButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
