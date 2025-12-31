import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { FlowDefinition } from "@/types/flow";

interface FlowCelebrationProps {
  flow: FlowDefinition;
  riceEarned: number;
  streak: number;
  onContinue: () => void;
}

export function FlowCelebration({ flow, riceEarned, streak, onContinue }: FlowCelebrationProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={styles.content}>
        <View style={styles.celebrationIcon}>
          <Feather name="check-circle" size={64} color={theme.primary} />
        </View>

        <ThemedText style={styles.title}>Flow Complete!</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          You've completed {flow.practas.length} step{flow.practas.length > 1 ? "s" : ""}
        </ThemedText>

        <View style={styles.statsContainer}>
          {riceEarned > 0 && (
            <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="award" size={24} color={theme.primary} />
              <ThemedText style={styles.statValue}>{riceEarned}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Rice Earned</ThemedText>
            </View>
          )}

          {streak > 0 && (
            <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="flame" size={24} color={theme.primary} />
              <ThemedText style={styles.statValue}>{streak}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</ThemedText>
            </View>
          )}
        </View>
      </View>

      <Pressable
        onPress={onContinue}
        style={[styles.continueButton, { backgroundColor: theme.primary }]}
      >
        <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  celebrationIcon: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  continueButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  continueButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
