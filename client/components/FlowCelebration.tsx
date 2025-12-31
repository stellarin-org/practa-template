import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  Easing,
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInUp,
  runOnJS,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { FlowDefinition } from "@/types/flow";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface FlowCelebrationProps {
  flow: FlowDefinition;
  riceEarned?: number;
  streak?: number;
  onContinue: () => void;
}

const CELEBRATION_MESSAGES = [
  "Beautiful work today",
  "Your practice grows stronger",
  "Every moment counts",
  "Well done, mindful one",
  "Peace flows through you",
  "Another step on your journey",
];

function Particle({ 
  delay, 
  startX, 
  color 
}: { 
  delay: number; 
  startX: number; 
  color: string;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(startX);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(800, withTiming(0, { duration: 400 }))
    ));
    scale.value = withDelay(delay, withSequence(
      withSpring(1, { damping: 8 }),
      withDelay(600, withTiming(0.5, { duration: 400 }))
    ));
    translateY.value = withDelay(delay, withTiming(-150, { 
      duration: 1400, 
      easing: Easing.out(Easing.cubic) 
    }));
    translateX.value = withDelay(delay, withTiming(
      startX + (Math.random() - 0.5) * 100, 
      { duration: 1400, easing: Easing.out(Easing.cubic) }
    ));
    rotation.value = withDelay(delay, withTiming(
      (Math.random() - 0.5) * 360, 
      { duration: 1400 }
    ));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const size = 8 + Math.random() * 8;

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

function RiceGrain({ delay, startX }: { delay: number; startX: number }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(startX);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(1000, withTiming(0, { duration: 500 }))
    ));
    scale.value = withDelay(delay, withSpring(1, { damping: 10 }));
    translateY.value = withDelay(delay, withTiming(-120 - Math.random() * 80, { 
      duration: 1800, 
      easing: Easing.out(Easing.cubic) 
    }));
    translateX.value = withDelay(delay, withTiming(
      startX + (Math.random() - 0.5) * 120, 
      { duration: 1800, easing: Easing.out(Easing.cubic) }
    ));
    rotation.value = withDelay(delay, withTiming(
      (Math.random() - 0.5) * 180, 
      { duration: 1800 }
    ));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.riceGrain, animatedStyle]}>
      <View style={styles.riceShape} />
    </Animated.View>
  );
}

export function FlowCelebration({ 
  flow, 
  riceEarned = 0, 
  streak = 0, 
  onContinue 
}: FlowCelebrationProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const celebrationMessage = CELEBRATION_MESSAGES[
    Math.floor(Math.random() * CELEBRATION_MESSAGES.length)
  ];

  const checkScale = useSharedValue(0);
  const checkRotation = useSharedValue(-45);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    checkScale.value = withDelay(300, withSpring(1, { 
      damping: 8, 
      stiffness: 100 
    }));
    checkRotation.value = withDelay(300, withSpring(0, { 
      damping: 12 
    }));
  }, []);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: checkScale.value },
      { rotate: `${checkRotation.value}deg` },
    ],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10 });
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const particles = Array.from({ length: 12 }).map((_, i) => ({
    delay: i * 50,
    startX: (Math.random() - 0.5) * SCREEN_WIDTH * 0.6,
    color: [theme.primary, theme.amber, theme.jade, theme.secondary][i % 4],
  }));

  const riceGrains = riceEarned > 0 
    ? Array.from({ length: Math.min(riceEarned / 5, 15) }).map((_, i) => ({
        delay: 400 + i * 80,
        startX: (Math.random() - 0.5) * SCREEN_WIDTH * 0.4,
      }))
    : [];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top + Spacing["4xl"],
          paddingBottom: insets.bottom + Spacing["2xl"],
        },
      ]}
    >
      <View style={styles.particleContainer}>
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
        {riceGrains.map((r, i) => (
          <RiceGrain key={`rice-${i}`} {...r} />
        ))}
      </View>

      <View style={styles.content}>
        <Animated.View style={checkAnimatedStyle}>
          <LinearGradient
            colors={[theme.primary, theme.amber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successIcon}
          >
            <Feather name="check" size={56} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(600)}>
          <ThemedText type="h2" style={[styles.title, { color: theme.text }]}>
            Flow Complete
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(600)}>
          <ThemedText style={[styles.message, { color: theme.textSecondary }]}>
            {celebrationMessage}
          </ThemedText>
        </Animated.View>

        <Animated.View 
          entering={FadeInUp.delay(700).duration(600)}
          style={styles.statsContainer}
        >
          {riceEarned > 0 ? (
            <View style={[styles.statCard, { backgroundColor: theme.amberMuted }]}>
              <View style={[styles.statIconWrap, { backgroundColor: `${theme.amber}20` }]}>
                <Feather name="award" size={24} color={theme.amber} />
              </View>
              <View style={styles.statTextWrap}>
                <ThemedText style={[styles.statValue, { color: theme.amber }]}>
                  +{riceEarned}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  rice earned
                </ThemedText>
              </View>
            </View>
          ) : null}

          {streak > 0 ? (
            <View style={[styles.statCard, { backgroundColor: theme.jadeMuted }]}>
              <View style={[styles.statIconWrap, { backgroundColor: `${theme.jade}20` }]}>
                <Feather name="zap" size={24} color={theme.jade} />
              </View>
              <View style={styles.statTextWrap}>
                <ThemedText style={[styles.statValue, { color: theme.jade }]}>
                  {streak} day{streak !== 1 ? "s" : ""}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  streak
                </ThemedText>
              </View>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View 
          entering={FadeInUp.delay(800).duration(600)}
          style={styles.flowInfo}
        >
          <ThemedText style={[styles.flowName, { color: theme.textSecondary }]}>
            {flow.name}
          </ThemedText>
        </Animated.View>
      </View>

      <Animated.View 
        entering={SlideInUp.delay(900).duration(600)}
        style={[buttonAnimatedStyle, styles.buttonContainer]}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onContinue}
          style={styles.continueButtonWrap}
        >
          <LinearGradient
            colors={[theme.primary, theme.amber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueButton}
          >
            <ThemedText style={styles.continueButtonText}>
              Continue
            </ThemedText>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  particleContainer: {
    position: "absolute",
    top: "40%",
    left: "50%",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
  },
  riceGrain: {
    position: "absolute",
  },
  riceShape: {
    width: 6,
    height: 14,
    backgroundColor: "#F5E6D3",
    borderRadius: 3,
    transform: [{ rotate: "15deg" }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  statsContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statTextWrap: {
    alignItems: "flex-start",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
  },
  flowInfo: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  flowName: {
    fontSize: 14,
  },
  buttonContainer: {
    paddingHorizontal: Spacing["2xl"],
  },
  continueButtonWrap: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
