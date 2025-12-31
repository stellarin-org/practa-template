import React, { useEffect, useCallback, useState, useMemo, useRef } from "react";
import { View, StyleSheet, Pressable, Text, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { FlowCelebration } from "@/components/FlowCelebration";
import PractaSplashScreen from "@/components/PractaSplashScreen";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { PractaChromeProvider, usePractaChrome } from "@/context/PractaChromeContext";
import { useFlow, useCurrentPracta } from "@/context/FlowContext";
import { FlowDefinition, FlowExecutionState, PractaOutput, PractaType, PractaContext, PractaCompleteHandler } from "@/types/flow";
import { JournalPracta, SilentMeditationPracta, PersonalizedMeditationPracta, TendPracta, IntegrationBreathPracta, getCommunityPractaComponents } from "@/practa";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useMeditation } from "@/context/MeditationContext";
import { useTimeline } from "@/context/TimelineContext";
import { PractaStorageManager, createNoopStorage } from "@/lib/practa-storage";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { getCommunityPractaBySlug, resolveAssetsForPractaAsync, canLaunchPracta } from "@/practa/community-loader";
import { PractaAssets } from "@/types/flow";
import { useManaPondAuth } from "@/context/ManaPondAuthContext";

interface PractaComponentProps {
  context: PractaContext;
  onComplete: PractaCompleteHandler;
  onSkip?: () => void;
}

type PractaComponent = React.ComponentType<PractaComponentProps>;

const BUILTIN_PRACTA_COMPONENTS: Record<string, PractaComponent> = {
  "journal": JournalPracta,
  "silent-meditation": SilentMeditationPracta,
  "personalized-meditation": PersonalizedMeditationPracta,
  "tend": TendPracta,
  "integration-breath": IntegrationBreathPracta,
};

function getPractaComponent(type: string): PractaComponent | undefined {
  if (BUILTIN_PRACTA_COMPONENTS[type]) {
    return BUILTIN_PRACTA_COMPONENTS[type];
  }
  const communityComponents = getCommunityPractaComponents();
  return communityComponents[type] as PractaComponent | undefined;
}

type FlowRouteProp = RouteProp<RootStackParamList, "Flow">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FlowScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FlowRouteProp>();
  const { startFlow, currentFlow, abortFlow, setOnFlowComplete } = useFlow();
  const { practa, context, complete } = useCurrentPracta();
  const { addJournalEntry, addSession, addFlowCompletion, sessions, journalEntries, tendCompletions } = useMeditation();
  const { publish: addItem } = useTimeline();
  const { user } = useManaPondAuth();

  const [totalRiceEarned, setTotalRiceEarned] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [assets, setAssets] = useState<PractaAssets | undefined>(undefined);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const { flow, testMode, splashActive } = route.params;
  const hasNavigatedBack = useRef(false);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  const storage = useMemo(() => {
    if (!deviceId || !practa) return createNoopStorage();
    const communityPracta = getCommunityPractaBySlug(practa.type);
    const slug = communityPracta ? communityPracta.slug : `builtin-${practa.type}`;
    const userId = user?.sub || `anon-${deviceId}`;
    return new PractaStorageManager(userId, slug);
  }, [deviceId, practa?.type, user?.sub]);

  const loadAssets = useCallback(async () => {
    if (!practa) {
      setAssets(undefined);
      return;
    }

    setAssetsLoading(true);
    setOfflineError(null);

    try {
      const launchCheck = await canLaunchPracta(practa.type);
      if (!launchCheck.canLaunch) {
        setOfflineError(launchCheck.reason || "Unable to load this activity.");
        setAssetsLoading(false);
        return;
      }

      const result = await resolveAssetsForPractaAsync(practa.type);
      if (result) {
        setAssets(result.assets);
      } else {
        setAssets(undefined);
      }
    } catch (e) {
      console.warn("[FlowScreen] Failed to load assets:", e);
      setAssets(undefined);
    }

    setAssetsLoading(false);
  }, [practa?.type]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const contextWithAssets = useMemo((): PractaContext | null => {
    if (!context) return null;
    return { ...context, storage, assets };
  }, [context, storage, assets]);

  const splashImageSource = useMemo(() => {
    if (!assets?.splash) {
      return null;
    }
    const splash = assets.splash;
    if (typeof splash === "string") {
      return { uri: splash };
    }
    return splash;
  }, [assets]);

  useEffect(() => {
    setShowSplash(true);
  }, [practa?.id]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i <= 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const hasActivity =
        sessions.some((s) => s.date === dateStr) ||
        journalEntries.some((e) => e.date === dateStr) ||
        tendCompletions.some((c) => c.date === dateStr);

      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }, [sessions, journalEntries, tendCompletions]);

  const persistPractaOutput = useCallback(async (type: PractaType, output: PractaOutput) => {
    if (output.metadata?.skipped) return;

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();
    let riceFromAction = 0;

    if (type === "journal" && output.content?.type === "text") {
      const entry = {
        id: Date.now().toString(),
        date: today,
        content: output.content.value,
        createdAt: now,
        type: "text" as const,
      };
      riceFromAction = await addJournalEntry(entry);

      await addItem({
        type: "journal",
        content: {
          type: "text",
          value: output.content.value,
        },
        metadata: output.metadata,
      });
    } else if (type === "silent-meditation" || type === "personalized-meditation") {
      const duration = (output.metadata?.duration as number) || 180;
      riceFromAction = Math.floor(duration / 60) * 10;

      const session = {
        id: Date.now().toString(),
        date: today,
        duration,
        riceEarned: riceFromAction,
        completedAt: now,
      };
      await addSession(session);

      await addItem({
        type: "meditation",
        content: {
          type: "text",
          value: `${Math.floor(duration / 60)} minute meditation`,
        },
        metadata: {
          ...output.metadata,
          duration,
          riceEarned: riceFromAction,
          meditationType: type === "personalized-meditation" ? "personalized" : "silent",
          meditationName: type === "personalized-meditation" 
            ? (output.metadata?.meditationName as string) || "Personalized Meditation"
            : "Silent Meditation",
        },
      });
    } else if (type === "tend" && output.metadata?.cardTitle) {
      await addItem({
        type: "milestone",
        content: {
          type: "text",
          value: output.metadata.cardPrompt as string,
        },
        metadata: {
          source: "system",
          cardId: output.metadata.cardId as string,
          cardTitle: output.metadata.cardTitle as string,
          practaType: "tend",
        },
      });
    }

    if (riceFromAction > 0) {
      setTotalRiceEarned(prev => prev + riceFromAction);
    }
  }, [addJournalEntry, addSession, addItem]);

  useEffect(() => {
    hasNavigatedBack.current = false;
    setTotalRiceEarned(0);
    startFlow(flow);

    setOnFlowComplete(() => (flowState: FlowExecutionState) => {
      const hasCompletedPracta = flowState.practaOutputs.some(
        (output: PractaOutput) => !output.metadata?.skipped
      );
      if (hasCompletedPracta) {
        addFlowCompletion(flow.id);
      }

      if (testMode && !hasNavigatedBack.current) {
        hasNavigatedBack.current = true;
        requestAnimationFrame(() => {
          navigation.goBack();
        });
      }
    });

    return () => {
      setOnFlowComplete(() => undefined);
    };
  }, [flow, startFlow, setOnFlowComplete, addFlowCompletion, testMode, navigation]);

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

  const handleComplete = useCallback(async (output: PractaOutput) => {
    if (practa) {
      await persistPractaOutput(practa.type, output);
    }
    complete(output);
  }, [complete, practa, persistPractaOutput]);

  const handleContinue = useCallback(() => {
    navigation.goBack();
  }, [navigation]);


  if (!currentFlow || currentFlow.status === "aborted") {
    return null;
  }

  if (currentFlow.status === "completed") {
    if (testMode) {
      return null;
    }
    return (
      <FlowCelebration
        flow={currentFlow.flowDefinition}
        riceEarned={totalRiceEarned}
        streak={currentStreak}
        onContinue={handleContinue}
      />
    );
  }

  if (offlineError) {
    return (
      <View style={[styles.container, styles.centeredContainer, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Feather name="x" size={24} color={theme.textSecondary} />
          </Pressable>
          <View style={styles.placeholder} />
          <View style={styles.placeholder} />
        </View>
        <View style={styles.offlineContent}>
          <Feather name="wifi-off" size={48} color={theme.textSecondary} />
          <Text style={[styles.offlineTitle, { color: theme.text }]}>No Connection</Text>
          <Text style={[styles.offlineMessage, { color: theme.textSecondary }]}>{offlineError}</Text>
          <Pressable 
            style={[styles.retryButton, { backgroundColor: theme.primary }]} 
            onPress={loadAssets}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (assetsLoading) {
    return (
      <View style={[styles.container, styles.centeredContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!practa || !contextWithAssets) {
    return null;
  }

  const showCloseButton = currentFlow.currentIndex === 0;
  const totalSteps = currentFlow.flowDefinition.practas.length;
  const currentStep = currentFlow.currentIndex + 1;

  const shouldShowSplash = showSplash && splashImageSource !== null;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {shouldShowSplash ? (
        <PractaSplashScreen
          splashImage={splashImageSource}
          onComplete={() => setShowSplash(false)}
          startWithOverlay={splashActive}
        />
      ) : null}

      <PractaChromeProvider key={practa.id}>
        <View style={styles.practaFullScreen}>
          {(() => {
            const PractaComponent = getPractaComponent(practa.type);
            if (!PractaComponent) return null;
            return (
              <PractaComponent
                context={contextWithAssets}
                onComplete={handleComplete}
                onSkip={totalSteps > 1 ? handleSkip : undefined}
              />
            );
          })()}
        </View>

        <ChromeOverlay
          showCloseButton={showCloseButton}
          onClose={handleClose}
          totalSteps={totalSteps}
          currentStep={currentStep}
          currentIndex={currentFlow.currentIndex}
          insets={insets}
          theme={theme}
        />
      </PractaChromeProvider>
    </View>
  );
}

interface ChromeOverlayProps {
  showCloseButton: boolean;
  onClose: () => void;
  totalSteps: number;
  currentStep: number;
  currentIndex: number;
  insets: { top: number; bottom: number; left: number; right: number };
  theme: ReturnType<typeof useTheme>["theme"];
}

function ChromeOverlay({ showCloseButton, onClose, totalSteps, currentStep, currentIndex, insets, theme }: ChromeOverlayProps) {
  const { config } = usePractaChrome();

  const renderCloseButton = () => {
    if (!showCloseButton) return <View style={styles.placeholder} />;

    return (
      <View style={styles.closeButtonCircle}>
        <Pressable style={styles.closeButtonInner} onPress={onClose}>
          <Feather name="x" size={18} color="rgba(0, 0, 0, 0.8)" />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.chromeOverlay, { paddingTop: insets.top + Spacing.sm }]} pointerEvents="box-none">
      <View style={styles.chromeRow} pointerEvents="box-none">
        {renderCloseButton()}

        {config.showProgressDots && totalSteps > 1 ? (
          <View style={styles.progressIndicator}>
            {Array.from({ length: totalSteps }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      index < currentStep
                        ? theme.primary
                        : index === currentIndex
                        ? theme.primary
                        : "rgba(255,255,255,0.4)",
                  },
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.placeholder} />
        )}

        {config.rightAction ? (
          <View>{config.rightAction}</View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  practaFullScreen: {
    flex: 1,
  },
  chromeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    zIndex: 100,
  },
  chromeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonInner: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
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
  centeredContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  offlineContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  offlineMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.lg,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
