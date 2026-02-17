import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassBackground } from "@/components/GlassBackground";
import { AnimatedSection } from "@/components/AnimatedSection";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useHaptics } from "@/hooks/useHaptics";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PractaProps } from "@/types/flow";
import { usePractaChrome } from "@/context/PractaChromeContext";
import { useHeaderHeight } from "@/components/PractaChromeHeader";

const DEFAULT_PROMPTS = [
  "What made you smile today?",
  "Name something you're thankful for right now.",
];

export default function GratitudePrompt({ context, onComplete, onSettings, showSettings }: PractaProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { setConfig } = usePractaChrome();
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    setConfig({
      headerMode: "none",
      showSettings,
      onSettings,
    });
  }, [setConfig, showSettings, onSettings]);
  
  const prompts = (context.assets?.prompts as string[]) || DEFAULT_PROMPTS;
  const [prompt] = useState(() => prompts[Math.floor(Math.random() * prompts.length)]);
  const [response, setResponse] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!response.trim()) return;
    haptics.light();
    setIsSubmitted(true);
    haptics.success();
  };

  const handleComplete = () => {
    haptics.light();
    onComplete({
      content: { 
        type: "text", 
        value: response.trim()
      },
      metadata: { 
        prompt,
        responseLength: response.trim().length,
        completedAt: Date.now(),
      },
    });
  };

  return (
    <GlassBackground style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { 
            paddingTop: headerHeight + Spacing.lg, 
            paddingBottom: insets.bottom + Spacing.xl 
          }
        ]}
      >
        <AnimatedSection index={0}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="heart" size={32} color={theme.primary} />
            </View>
            <ThemedText style={styles.title}>Gratitude Moment</ThemedText>
          </View>
        </AnimatedSection>

        <AnimatedSection index={1}>
          <View style={styles.promptContainer}>
            <ThemedText style={[styles.prompt, { color: theme.textSecondary }]}>
              {prompt}
            </ThemedText>
          </View>
        </AnimatedSection>

        <AnimatedSection index={2}>
          {isSubmitted ? (
            <View style={styles.thankYouContainer}>
              <Feather name="check-circle" size={48} color={theme.primary} />
              <ThemedText style={styles.thankYouTitle}>Thank you for sharing</ThemedText>
              <ThemedText style={[styles.thankYouSubtitle, { color: theme.textSecondary }]}>
                Taking time to appreciate the good helps build resilience and joy.
              </ThemedText>
              
              <View style={[styles.responsePreview, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText style={styles.responsePreviewText}>
                  "{response.trim()}"
                </ThemedText>
              </View>

              <Pressable
                onPress={handleComplete}
                style={[styles.button, { backgroundColor: theme.primary }]}
              >
                <ThemedText style={styles.buttonText}>Continue</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Write your thoughts here..."
                placeholderTextColor={theme.textSecondary}
                value={response}
                onChangeText={setResponse}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Pressable
                onPress={handleSubmit}
                style={[
                  styles.button, 
                  { 
                    backgroundColor: response.trim() ? theme.primary : theme.backgroundSecondary,
                    opacity: response.trim() ? 1 : 0.6,
                  }
                ]}
                disabled={!response.trim()}
              >
                <ThemedText style={[
                  styles.buttonText,
                  { color: response.trim() ? "white" : theme.textSecondary }
                ]}>
                  Submit
                </ThemedText>
              </Pressable>
            </View>
          )}
        </AnimatedSection>
      </KeyboardAwareScrollViewCompat>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
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
  },
  promptContainer: {
    marginBottom: Spacing.xl,
  },
  prompt: {
    fontSize: 20,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 28,
  },
  inputContainer: {
    flex: 1,
  },
  textInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 120,
    marginBottom: Spacing.lg,
  },
  button: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  thankYouContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thankYouTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  thankYouSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  responsePreview: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    alignSelf: "stretch",
  },
  responsePreviewText: {
    fontSize: 16,
    fontStyle: "italic",
    textAlign: "center",
  },
});
