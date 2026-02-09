import React from "react";
import { View, StyleSheet, ScrollView, Linking, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { demoPractas, DemoPractaInfo } from "@/demo-practa";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface StepProps {
  number: number;
  title: string;
  description: string;
}

function Step({ number, title, description }: StepProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.step}>
      <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
        <ThemedText style={styles.stepNumberText}>{number}</ThemedText>
      </View>
      <View style={styles.stepContent}>
        <ThemedText style={styles.stepTitle}>{title}</ThemedText>
        <ThemedText style={[styles.stepDescription, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

interface TipProps {
  icon: string;
  title: string;
  description: string;
}

function Tip({ icon, title, description }: TipProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.tip}>
      <View style={[styles.tipIcon, { backgroundColor: theme.primary + "20" }]}>
        <Feather name={icon as any} size={20} color={theme.primary} />
      </View>
      <View style={styles.tipContent}>
        <ThemedText style={styles.tipTitle}>{title}</ThemedText>
        <ThemedText style={[styles.tipDescription, { color: theme.textSecondary }]}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

interface DemoCardProps {
  demo: DemoPractaInfo;
  onPress: () => void;
}

function DemoCard({ demo, onPress }: DemoCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.demoCard, { backgroundColor: theme.backgroundSecondary }]}
    >
      <View style={[styles.demoIcon, { backgroundColor: theme.primary + "20" }]}>
        <Feather name={demo.icon as any} size={24} color={theme.primary} />
      </View>
      <View style={styles.demoContent}>
        <ThemedText style={styles.demoTitle}>{demo.name}</ThemedText>
        <ThemedText style={[styles.demoDescription, { color: theme.textSecondary }]}>
          {demo.description}
        </ThemedText>
      </View>
      <Feather name="play-circle" size={24} color={theme.primary} />
    </Pressable>
  );
}

export default function HowToScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();

  const handleOpenDocs = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL("https://github.com/woodenfox/Stellarin-Practa-Template");
  };

  const handleTryDemo = (demo: DemoPractaInfo) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate("HarnessPreview", { practaId: demo.id });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>How To</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Build your first Practa
          </ThemedText>
        </View>

        <Card style={styles.card}>
          <ThemedText style={styles.sectionTitle}>What is this?</ThemedText>
          <ThemedText style={[styles.introText, { color: theme.textSecondary }]}>
            This Practa template lets you build Practa - small daily rituals that operate like mini-app experiences. Build your Practa with this template and then publish it to the Stellarin app. The next time the app is published to the app store, your Practa will be bundled and included with it, allowing users to include it in their daily flows.
          </ThemedText>
        </Card>

        <Card style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Try Demo Practa</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Explore these examples to see what's possible
          </ThemedText>
          
          {demoPractas.map((demo) => (
            <DemoCard
              key={demo.id}
              demo={demo}
              onPress={() => handleTryDemo(demo)}
            />
          ))}
        </Card>

        <Card style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Getting Started</ThemedText>
          
          <Step
            number={1}
            title="Describe your idea to Replit AI"
            description="Tell the AI what kind of wellbeing experience you want to create. Be specific about interactions, visuals, and duration."
          />
          
          <Step
            number={2}
            title="Update the metadata"
            description="Go to the Edit tab to set your Practa name, description, author, and version."
          />
          
          <Step
            number={3}
            title="Preview your changes"
            description="Use the Preview button on the My Practa tab to test your Practa in action."
          />
          
          <Step
            number={4}
            title="Check validation"
            description="Make sure all validation checks pass before submitting."
          />
          
          <Step
            number={5}
            title="Submit for review"
            description="When ready, go to the Publish tab to submit your Practa to Stellarin."
          />
        </Card>

        <Card style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Best Practices</ThemedText>

          <Tip
            icon="zap"
            title="Use Haptic Feedback"
            description="Add haptic feedback to buttons and interactions for a native feel."
          />

          <Tip
            icon="sun"
            title="Support Light and Dark Mode"
            description="Use useTheme() hook for colors to automatically support both themes."
          />

          <Tip
            icon="smartphone"
            title="Handle Safe Areas"
            description="Use useSafeAreaInsets() to avoid content behind the notch or home indicator."
          />

          <Tip
            icon="check-circle"
            title="Call onComplete"
            description="Always call onComplete() when the user finishes your Practa."
          />

        </Card>

        <Card style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Practa Props</ThemedText>
          
          <View style={styles.codeBlock}>
            <ThemedText style={[styles.code, { color: theme.textSecondary }]}>
              {`interface PractaProps {
  context: {
    flowId: string;
    practaIndex: number;
    previous?: {
      practaId: string;
      practaType: string;
      content?: { type: "text" | "image"; value: string };
      metadata?: Record<string, unknown>;
    };
  };
  onComplete: (output: PractaOutput) => void;
}`}
            </ThemedText>
          </View>
        </Card>

        <Pressable
          onPress={handleOpenDocs}
          style={[styles.docsButton, { borderColor: theme.primary }]}
        >
          <Feather name="external-link" size={18} color={theme.primary} />
          <ThemedText style={[styles.docsButtonText, { color: theme.primary }]}>
            View Full Documentation
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  introText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  step: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  stepNumberText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  tip: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  tipDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  codeBlock: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  code: {
    fontSize: 12,
    fontFamily: "monospace",
    lineHeight: 18,
  },
  docsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  docsButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  demoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  demoIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  demoContent: {
    flex: 1,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  demoDescription: {
    fontSize: 13,
  },
});
