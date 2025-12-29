import React, { useState } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PractaContext, PractaCompleteHandler } from "@/types/flow";

interface TapConfig {
  targetTaps: number;
  title: string;
  completeTitle: string;
  subtitle: string;
  completeSubtitle: string;
  hint: string;
}

const DEFAULT_CONFIG: TapConfig = {
  targetTaps: 10,
  title: "Mindful Taps",
  completeTitle: "Great job!",
  subtitle: "Tap {target} times to complete",
  completeSubtitle: "You completed the exercise",
  hint: "Tap the circle above",
};

interface TapCounterProps {
  context: PractaContext;
  onComplete: PractaCompleteHandler;
  onSkip?: () => void;
}

export default function TapCounter({ context, onComplete, onSkip }: TapCounterProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const config = (context.assets?.config as TapConfig) || DEFAULT_CONFIG;
  const TARGET_TAPS = config.targetTaps;
  
  const [count, setCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleTap = () => {
    triggerHaptic();
    
    scale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1, { damping: 8 })
    );
    rotation.value = withSequence(
      withSpring(5, { damping: 8 }),
      withSpring(-5, { damping: 8 }),
      withSpring(0, { damping: 8 })
    );
    
    const newCount = count + 1;
    setCount(newCount);
    
    if (newCount >= TARGET_TAPS) {
      setIsComplete(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleComplete = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onComplete({
      content: { 
        type: "text", 
        value: `Completed ${count} mindful taps.`
      },
      metadata: { 
        tapCount: count,
        targetReached: count >= TARGET_TAPS,
        completedAt: Date.now(),
      },
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const progress = Math.min(count / TARGET_TAPS, 1);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>
          {isComplete ? config.completeTitle : config.title}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {isComplete 
            ? config.completeSubtitle 
            : config.subtitle.replace("{target}", String(TARGET_TAPS))}
        </ThemedText>

        <View style={styles.counterContainer}>
          <Animated.View style={animatedStyle}>
            <Pressable
              onPress={isComplete ? undefined : handleTap}
              style={[
                styles.tapButton,
                { backgroundColor: isComplete ? theme.primary : theme.backgroundSecondary }
              ]}
            >
              {isComplete ? (
                <Feather name="check" size={48} color="white" />
              ) : (
                <ThemedText style={[styles.countText, { color: theme.primary }]}>
                  {count}
                </ThemedText>
              )}
            </Pressable>
          </Animated.View>

          <View style={[styles.progressContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  backgroundColor: theme.primary,
                  width: `${progress * 100}%` 
                }
              ]} 
            />
          </View>
          
          <ThemedText style={[styles.progressText, { color: theme.textSecondary }]}>
            {count} / {TARGET_TAPS}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {isComplete ? (
          <Pressable
            onPress={handleComplete}
            style={[styles.button, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.buttonText}>Complete</ThemedText>
          </Pressable>
        ) : (
          <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
            {config.hint}
          </ThemedText>
        )}

        {onSkip && !isComplete ? (
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
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
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
    marginBottom: Spacing["2xl"],
  },
  counterContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tapButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  countText: {
    fontSize: 56,
    fontWeight: "700",
  },
  progressContainer: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },
  button: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  hint: {
    fontSize: 16,
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
