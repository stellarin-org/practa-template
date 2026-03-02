import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassBackground } from "@/components/GlassBackground";
import { AnimatedSection } from "@/components/AnimatedSection";
import { useTheme } from "@/hooks/useTheme";
import { useHaptics } from "@/hooks/useHaptics";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PractaProps } from "@/types/flow";
import { usePractaChrome } from "@/context/PractaChromeContext";
import { useHeaderHeight } from "@/components/PractaChromeHeader";

const MOODS = [
  { label: "Calm", icon: "sun" as const, emoji: "calm" },
  { label: "Anxious", icon: "cloud" as const, emoji: "anxious" },
  { label: "Grateful", icon: "heart" as const, emoji: "grateful" },
  { label: "Tired", icon: "moon" as const, emoji: "tired" },
  { label: "Motivated", icon: "zap" as const, emoji: "motivated" },
  { label: "Sad", icon: "cloud-rain" as const, emoji: "sad" },
];

export default function AIAffirmation({ context, onComplete, onSettings, showSettings }: PractaProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { setConfig } = usePractaChrome();
  const headerHeight = useHeaderHeight();

  const [phase, setPhase] = useState<"select" | "loading" | "display" | "error">("select");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [affirmation, setAffirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setConfig({
      headerMode: "default",
      title: "AI Affirmation",
      showSettings,
      onSettings,
    });
  }, [setConfig, showSettings, onSettings]);

  const generateAffirmation = useCallback(async (mood: string) => {
    if (!context.ai) {
      setErrorMessage("AI is not available in this environment.");
      setPhase("error");
      return;
    }

    setSelectedMood(mood);
    setPhase("loading");

    try {
      const result = await context.ai.gemini({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a compassionate wellness coach. Generate a single short, powerful affirmation (1-2 sentences) for someone who is feeling ${mood}. The affirmation should be personal (use "you" or "I"), uplifting, and grounded. Do not include quotation marks or attribution. Just the affirmation text.`,
              },
            ],
          },
        ],
      });

      const text = result.text?.trim();
      if (text) {
        setAffirmation(text);
        setPhase("display");
        haptics.success();
      } else {
        setErrorMessage("No affirmation was generated. Please try again.");
        setPhase("error");
      }
    } catch (err: any) {
      const message =
        err?.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : err?.message || "Something went wrong. Please try again.";
      setErrorMessage(message);
      setPhase("error");
      haptics.error();
    }
  }, [context.ai, haptics]);

  const handleReset = () => {
    setPhase("select");
    setSelectedMood(null);
    setAffirmation("");
    setErrorMessage("");
  };

  const handleComplete = () => {
    haptics.light();
    onComplete({
      content: {
        type: "text",
        value: affirmation,
      },
      metadata: {
        mood: selectedMood,
        completedAt: Date.now(),
      },
    });
  };

  return (
    <GlassBackground style={[styles.container, { paddingTop: headerHeight + Spacing.lg }]}>
      <View style={styles.content}>
        {phase === "select" ? (
          <>
            <AnimatedSection index={0}>
              <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
                  <Feather name="star" size={32} color={theme.primary} />
                </View>
                <ThemedText style={styles.title}>How are you feeling?</ThemedText>
                <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Choose a mood and receive a personalized affirmation
                </ThemedText>
              </View>
            </AnimatedSection>

            <AnimatedSection index={1}>
              <View style={styles.moodGrid}>
                {MOODS.map((mood) => (
                  <Pressable
                    key={mood.label}
                    onPress={() => {
                      haptics.light();
                      generateAffirmation(mood.label.toLowerCase());
                    }}
                    style={[styles.moodButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name={mood.icon} size={24} color={theme.primary} />
                    <ThemedText style={styles.moodLabel}>{mood.label}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </AnimatedSection>
          </>
        ) : null}

        {phase === "loading" ? (
          <AnimatedSection index={0}>
            <View style={styles.centeredContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
                Creating your affirmation...
              </ThemedText>
            </View>
          </AnimatedSection>
        ) : null}

        {phase === "display" ? (
          <>
            <AnimatedSection index={0}>
              <View style={styles.centeredContainer}>
                <Feather name="star" size={48} color={theme.primary} />
                <ThemedText style={[styles.moodTag, { color: theme.primary }]}>
                  Feeling {selectedMood}
                </ThemedText>
                <View style={[styles.affirmationCard, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText style={styles.affirmationText}>{affirmation}</ThemedText>
                </View>
              </View>
            </AnimatedSection>

            <AnimatedSection index={1}>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleReset}
                  style={[styles.secondaryButton, { borderColor: theme.border }]}
                >
                  <Feather name="refresh-cw" size={16} color={theme.text} />
                  <ThemedText style={styles.secondaryButtonText}>Try Again</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleComplete}
                  style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                >
                  <ThemedText style={styles.primaryButtonText}>Save & Continue</ThemedText>
                </Pressable>
              </View>
            </AnimatedSection>
          </>
        ) : null}

        {phase === "error" ? (
          <AnimatedSection index={0}>
            <View style={styles.centeredContainer}>
              <Feather name="alert-circle" size={48} color={theme.error || "#E55050"} />
              <ThemedText style={styles.errorTitle}>Oops</ThemedText>
              <ThemedText style={[styles.errorMessage, { color: theme.textSecondary }]}>
                {errorMessage}
              </ThemedText>
              <Pressable
                onPress={handleReset}
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
              >
                <ThemedText style={styles.primaryButtonText}>Try Again</ThemedText>
              </Pressable>
            </View>
          </AnimatedSection>
        ) : null}
      </View>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
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
    lineHeight: 22,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.md,
  },
  moodButton: {
    width: "28%",
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    marginTop: Spacing.lg,
  },
  moodTag: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  affirmationCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignSelf: "stretch",
  },
  affirmationText: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 32,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  primaryButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing["2xl"],
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
});
