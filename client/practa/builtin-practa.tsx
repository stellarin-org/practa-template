import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { PractaContext, PractaCompleteHandler } from "@/types/flow";

interface PractaComponentProps {
  context: PractaContext;
  onComplete: PractaCompleteHandler;
  onSkip?: () => void;
}

function PlaceholderPracta({ onComplete, name }: PractaComponentProps & { name: string }) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete({});
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{name}</ThemedText>
      <ThemedText style={styles.subtitle}>This is a placeholder for the {name} Practa.</ThemedText>
    </View>
  );
}

export function JournalPracta(props: PractaComponentProps) {
  return <PlaceholderPracta {...props} name="Journal" />;
}

export function SilentMeditationPracta(props: PractaComponentProps) {
  return <PlaceholderPracta {...props} name="Silent Meditation" />;
}

export function PersonalizedMeditationPracta(props: PractaComponentProps) {
  return <PlaceholderPracta {...props} name="Personalized Meditation" />;
}

export function TendPracta(props: PractaComponentProps) {
  return <PlaceholderPracta {...props} name="Tend" />;
}

export function IntegrationBreathPracta(props: PractaComponentProps) {
  return <PlaceholderPracta {...props} name="Integration Breath" />;
}

export function getCommunityPractaComponents(): Record<string, React.ComponentType<PractaComponentProps>> {
  return {};
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
});
