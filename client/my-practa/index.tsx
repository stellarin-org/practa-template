/**
 * Practa Starter Template
 * 
 * This is a minimal template for building your own Practa.
 * 
 * Key concepts:
 * - `context`: Contains flow info and optional `storage` for persistence
 * - `onComplete`: Call when the user finishes the experience
 * - `showSettings` / `onSettings`: Header settings integration
 * 
 * For persistent state (user preferences, progress), use context.storage:
 *   await context.storage?.get<string>("key")
 *   await context.storage?.set("key", value)
 * 
 * See template-docs/practa-storage-system.md for full storage documentation.
 */

import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ImageSource } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassBackground } from "@/components/GlassBackground";
import { PractaImage } from "@/components/PractaImage";
import { AnimatedSection } from "@/components/AnimatedSection";
import { useTheme } from "@/hooks/useTheme";
import { useHaptics } from "@/hooks/useHaptics";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PractaProps } from "@/types/flow";
import { usePractaChrome } from "@/context/PractaChromeContext";
import { useHeaderHeight } from "@/components/PractaChromeHeader";

interface ContentData {
  title: string;
  startedTitle: string;
  welcomeMessage: string;
  startedMessage: string;
  buttonStart: string;
  buttonComplete: string;
}

export default function MyPracta({ context, onComplete, showSettings, onSettings }: PractaProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { setConfig } = usePractaChrome();
  const headerHeight = useHeaderHeight();
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    setConfig({
      headerMode: "default",
      title: "My Practa",
      showSettings,
      onSettings,
    });
  }, [setConfig, showSettings, onSettings]);

  const wellnessBgSource = context.assets?.wellnessBg as ImageSource | undefined;
  const content = context.assets?.content as ContentData | undefined;

  const title = isStarted 
    ? (content?.startedTitle ?? "Great!") 
    : (content?.title ?? "Welcome");
  const subtitle = isStarted
    ? (content?.startedMessage ?? "You've started your Practa experience.")
    : (content?.welcomeMessage ?? "This is a starter template. Customize it to create your own wellbeing experience.");
  const startButtonText = content?.buttonStart ?? "Start";
  const completeButtonText = content?.buttonComplete ?? "Complete";

  const handleStart = () => {
    haptics.light();
    setIsStarted(true);
  };

  const handleComplete = () => {
    haptics.success();
    onComplete({
      content: { 
        type: "text", 
        value: "Practa completed successfully!"
      },
      metadata: { 
        completedAt: Date.now(),
      },
    });
  };

  return (
    <GlassBackground style={[styles.container, { paddingTop: headerHeight + Spacing.lg }]}>
      <View style={styles.content}>
        <AnimatedSection index={0}>
          {wellnessBgSource ? (
            <PractaImage
              source={wellnessBgSource}
              size={150}
              circular
              style={{ marginBottom: Spacing.xl }}
            />
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="star" size={48} color={theme.primary} />
            </View>
          )}
        </AnimatedSection>

        <AnimatedSection index={1}>
          <ThemedText style={styles.title}>
            {title}
          </ThemedText>
          
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </ThemedText>
        </AnimatedSection>
      </View>

      <AnimatedSection index={2} style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {isStarted ? (
          <Pressable
            onPress={handleComplete}
            style={[styles.button, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.buttonText}>{completeButtonText}</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleStart}
            style={[styles.button, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.buttonText}>{startButtonText}</ThemedText>
          </Pressable>
        )}
      </AnimatedSection>
    </GlassBackground>
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
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
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
});
