import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PractaContext, PractaCompleteHandler } from "@/types/flow";

interface BreathingConfig {
  cycles: number;
  inhaleDuration: number;
  holdDuration: number;
  exhaleDuration: number;
  phases: {
    ready: { title: string; subtitle: string };
    complete: { title: string; subtitle: string };
    inhale: string;
    hold: string;
    exhale: string;
  };
}

const DEFAULT_CONFIG: BreathingConfig = {
  cycles: 3,
  inhaleDuration: 4000,
  holdDuration: 2000,
  exhaleDuration: 4000,
  phases: {
    ready: { title: "Take a moment to pause", subtitle: "A brief breathing exercise to center yourself" },
    complete: { title: "Well done", subtitle: "You completed your breathing pause" },
    inhale: "Breathe in...",
    hold: "Hold...",
    exhale: "Breathe out...",
  },
};

interface BreathingPauseProps {
  context: PractaContext;
  onComplete: PractaCompleteHandler;
  onSkip?: () => void;
}

import { useNavigation } from "@react-navigation/native";

export default function BreathingPause({ context, onComplete, onSkip }: BreathingPauseProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  // Configure Transparent Header Example
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerBlurEffect: "regular",
      headerTitle: "Breathing Space",
    });
  }, [navigation]);

  const config = (context.assets?.config as BreathingConfig) || DEFAULT_CONFIG;
  const BREATH_CYCLES = config.cycles;
  const INHALE_DURATION = config.inhaleDuration;
  const HOLD_DURATION = config.holdDuration;
  const EXHALE_DURATION = config.exhaleDuration;
  const CYCLE_DURATION = INHALE_DURATION + HOLD_DURATION + EXHALE_DURATION;
  
  const [phase, setPhase] = useState<"ready" | "breathing" | "complete">("ready");
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [cycleCount, setCycleCount] = useState(0);
  
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);
  const progress = useSharedValue(0);
  
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exhaleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const chimeSource = context.assets?.chime as number | { uri: string } | undefined;
  const player = useAudioPlayer(chimeSource || null);

  const playChime = useCallback(() => {
    if (player) {
      try {
        player.seekTo(0);
        player.play();
      } catch (error) {
        console.warn("Failed to play chime:", error);
      }
    }
  }, [player]);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    if (cycleRef.current) {
      clearInterval(cycleRef.current);
      cycleRef.current = null;
    }
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (exhaleTimeoutRef.current) {
      clearTimeout(exhaleTimeoutRef.current);
      exhaleTimeoutRef.current = null;
    }
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, []);

  const startBreathCycle = useCallback(() => {
    if (!isMountedRef.current) return;
    
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    if (exhaleTimeoutRef.current) clearTimeout(exhaleTimeoutRef.current);
    
    setBreathPhase("inhale");
    triggerHaptic();
    
    scale.value = withTiming(1.4, { 
      duration: INHALE_DURATION, 
      easing: Easing.inOut(Easing.ease) 
    });
    opacity.value = withTiming(0.8, { 
      duration: INHALE_DURATION, 
      easing: Easing.inOut(Easing.ease) 
    });

    holdTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setBreathPhase("hold");
      triggerHaptic();
      
      exhaleTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setBreathPhase("exhale");
        triggerHaptic();
        
        scale.value = withTiming(1, { 
          duration: EXHALE_DURATION, 
          easing: Easing.inOut(Easing.ease) 
        });
        opacity.value = withTiming(0.3, { 
          duration: EXHALE_DURATION, 
          easing: Easing.inOut(Easing.ease) 
        });
      }, HOLD_DURATION);
    }, INHALE_DURATION);
  }, [scale, opacity, triggerHaptic]);

  const startBreathing = useCallback(() => {
    setPhase("breathing");
    setCycleCount(0);
    
    progress.value = withTiming(1, { duration: BREATH_CYCLES * CYCLE_DURATION });
    
    startBreathCycle();
    
    let currentCycle = 1;
    cycleRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      currentCycle++;
      if (currentCycle <= BREATH_CYCLES) {
        setCycleCount(prev => prev + 1);
        startBreathCycle();
      } else {
        clearAllTimers();
        
        completionTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          playChime();
          setPhase("complete");
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }, EXHALE_DURATION);
      }
    }, CYCLE_DURATION);
  }, [startBreathCycle, clearAllTimers, playChime, progress]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAllTimers();
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(progress);
    };
  }, [scale, opacity, progress, clearAllTimers]);

  const handleComplete = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onComplete({
      content: { 
        type: "text", 
        value: `Completed ${BREATH_CYCLES} breathing cycles. Feeling centered and calm.` 
      },
      metadata: { 
        breathCycles: BREATH_CYCLES,
        totalDuration: BREATH_CYCLES * CYCLE_DURATION / 1000,
        completedAt: Date.now(),
      },
    });
  };

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const getPhaseText = () => {
    if (phase === "ready") return config.phases.ready.title;
    if (phase === "complete") return config.phases.complete.title;
    switch (breathPhase) {
      case "inhale": return config.phases.inhale;
      case "hold": return config.phases.hold;
      case "exhale": return config.phases.exhale;
    }
  };

  const getSubtext = () => {
    if (phase === "ready") return config.phases.ready.subtitle;
    if (phase === "complete") return config.phases.complete.subtitle;
    return `Cycle ${cycleCount + 1} of ${BREATH_CYCLES}`;
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.content}>
        <View style={styles.orbContainer}>
          <Animated.View style={[styles.orbWrapper, animatedOrbStyle]}>
            <Image 
              source={context.assets?.breathingOrb as number | { uri: string } | undefined} 
              style={styles.orbImage}
              resizeMode="cover"
            />
          </Animated.View>
          
          {phase === "breathing" ? (
            <View style={styles.phaseIndicator}>
              <ThemedText style={[styles.phaseText, { color: theme.primary }]}>
                {breathPhase.toUpperCase()}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <ThemedText style={styles.title}>{getPhaseText()}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {getSubtext()}
        </ThemedText>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {phase === "ready" ? (
          <Pressable
            onPress={startBreathing}
            style={[styles.button, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.buttonText}>Begin</ThemedText>
          </Pressable>
        ) : phase === "complete" ? (
          <Pressable
            onPress={handleComplete}
            style={[styles.button, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.buttonText}>Complete</ThemedText>
          </Pressable>
        ) : (
          <View style={[styles.progressContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Animated.View 
              style={[
                styles.progressBar, 
                { backgroundColor: theme.primary },
                animatedProgressStyle
              ]} 
            />
          </View>
        )}

        {onSkip && phase !== "breathing" ? (
          <Pressable onPress={onSkip} style={styles.skipButton}>
            <ThemedText style={[styles.skipText, { color: theme.textSecondary }]}>
              Skip
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  orbContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  orbWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: "hidden",
  },
  orbImage: {
    width: "100%",
    height: "100%",
  },
  phaseIndicator: {
    position: "absolute",
    bottom: -10,
  },
  phaseText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: Spacing.lg,
  },
  button: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  skipButton: {
    padding: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  skipText: {
    fontSize: 14,
  },
});
