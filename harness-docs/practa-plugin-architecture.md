# Practa Plugin Architecture: High-Trust Ecosystem

This document describes how trusted developers can create, test, and publish Practa for the Stellarin wellbeing app.

## Overview

Practa are interactive wellbeing experiences - breathing exercises, journaling prompts, guided meditations, card draws, and more. In our **high-trust ecosystem**, community Practa have the same capabilities as core Practa - full access to all APIs, hooks, and device features.

### System Architecture

```
┌─────────────────────┐
│ PRACTA STARTER      │  Replit template that developers fork
│ (Developer's Fork)  │  - Sample practa to modify
│                     │  - Local preview/testing
│  [Submit] ──────────┼──────────┐
│  [Sync]             │          │
└─────────────────────┘          │
                                 ▼
┌─────────────────────┐   ┌─────────────────────┐
│ REVIEW SERVICE      │   │ Community Git Repo  │
│ (Stellarin Backend) │──▶│ stellarin-practa/   │
│                     │   │   community/        │
│ - Receives code     │   │     gratitude/      │
│ - AI analysis       │   │     body-scan/      │
│ - Auto-commits      │   │     ...             │
└─────────────────────┘   └─────────────────────┘
                                   │
                                   ▼
                       ┌─────────────────────┐
                       │ STELLARIN APP       │
                       │ (Main App)          │
                       │                     │
                       │ Auto-discovers      │
                       │ community practa    │
                       └─────────────────────┘
```

---

## The Practa Contract

Community Practa are identical to core Practa. They're React Native components that:

```typescript
interface PractaProps {
  // Context from the previous Practa in a Flow (if any)
  context: PractaContext;

  // Call when the Practa completes successfully
  onComplete: (output: PractaOutput) => void;

  // Call if the user wants to skip this Practa
  onSkip?: () => void;
}

interface PractaContext {
  flowId: string;
  practaIndex: number;
  previous?: {
    practaId: string;
    practaType: PractaType;
    content?: PractaContent;
    metadata?: PractaMetadata;
  };
}

interface PractaContent {
  type: "text" | "image";     // Content type
  value: string;              // The actual content (text or image URI)
}

interface PractaMetadata {
  source?: "user" | "ai" | "system";
  duration?: number;          // seconds spent
  riceEarned?: number;        // 0-50 range
  themes?: string[];
  emotionTags?: string[];
  [key: string]: unknown;     // custom metadata
}

interface PractaOutput {
  content?: PractaContent;
  metadata?: PractaMetadata;
}
```

### Full API Access

Community Practa can use everything core Practa use:

```tsx
// All imports available
import { View, Text, Pressable, TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import { useAudio } from "expo-audio";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";

// All hooks available
import { useTheme } from "@/hooks/useTheme";
import { useMeditation } from "@/context/MeditationContext";
import { useTimeline } from "@/context/TimelineContext";

// All components available
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";

// AI access available
import { generateMeditation } from "@/lib/ai";
```

---

## Example Community Practa

```tsx
// community/gratitude-reflection/index.tsx
import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PractaContext, PractaOutput } from "@/types/flow";

interface GratitudeReflectionPractaProps {
  context: PractaContext;
  onComplete: (output: PractaOutput) => void;
  onSkip?: () => void;
}

export function GratitudeReflectionPracta({ 
  context, 
  onComplete, 
  onSkip 
}: GratitudeReflectionPractaProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [gratitude, setGratitude] = useState("");

  const handleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    onComplete({
      content: { type: "text", value: gratitude },
      metadata: {
        source: "user",
        duration: 60,
        riceEarned: 5,
      },
    });
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <ThemedText style={styles.title}>
        What are you grateful for today?
      </ThemedText>
      
      <TextInput
        style={[styles.input, { 
          backgroundColor: theme.backgroundDefault,
          color: theme.text 
        }]}
        value={gratitude}
        onChangeText={setGratitude}
        multiline
        placeholder="Take a moment to reflect..."
        placeholderTextColor={theme.textSecondary}
      />
      
      <Pressable 
        onPress={handleComplete}
        style={[styles.button, { backgroundColor: theme.primary }]}
      >
        <ThemedText style={styles.buttonText}>Complete</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  input: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    textAlignVertical: "top",
  },
  button: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});

// Export metadata for auto-discovery
export const metadata = {
  type: "gratitude-reflection",
  name: "Gratitude Reflection",
  description: "A simple gratitude journaling exercise",
  author: "Jane Developer",
  version: "1.0.0",
  riceRange: [1, 10],
  estimatedDuration: 60,
};
```

---

## Folder Structure

```
client/practa/
├── core/                           # Built-in Stellarin practa
│   ├── JournalPracta.tsx
│   ├── SilentMeditationPracta.tsx
│   ├── PersonalizedMeditationPracta.tsx
│   ├── TendPracta.tsx
│   └── IntegrationBreathPracta.tsx
│
├── community/                      # Third-party practa (auto-discovered)
│   ├── gratitude-reflection/
│   │   └── index.tsx               # Component + exported metadata
│   ├── body-scan/
│   │   └── index.tsx
│   └── forest-walk/
│       └── index.tsx
│
├── registry.ts                     # Auto-discovers from core/ and community/
└── index.ts                        # Exports everything
```

---

## Developer Workflow

### 1. Fork the Practa Starter Template

On Replit, fork the Practa Starter template. It contains:

```
practa-starter/
├── my-practa/
│   └── index.tsx           # Your practa - edit this!
├── preview/                # Testing harness
├── scripts/
│   ├── sync.sh            # Pull latest template updates
│   ├── validate.ts        # Check your practa
│   └── submit.ts          # Submit to Stellarin
└── package.json
```

### 2. Develop Your Practa

Edit `my-practa/index.tsx`. The template provides:

- All Stellarin imports pre-configured
- Hot reload for instant feedback
- Preview in browser or Expo Go

### 3. Test Locally

```bash
# Start the preview
npm run dev

# Validate your practa
npm run validate
```

The validator checks:
- Component exports correctly
- Metadata is complete
- onComplete is called with valid output
- No syntax errors

### 4. Sync Template Updates

Keep your template up to date:

```bash
# Pull latest SDK, primitives, and fixes
npm run sync
```

This preserves your `my-practa/` folder while updating everything else.

### 5. Submit

```bash
npm run submit
```

This:
1. Validates your practa
2. Sends code to the Stellarin Review Service
3. You receive confirmation or feedback

---

## Review Service

The Review Service is a backend app that:

1. **Receives submissions** - Code posted from the Starter template
2. **Runs AI analysis** - Checks for quality, safety, UX patterns
3. **Auto-commits** - If approved, adds to the community git repo
4. **Notifies developer** - Success or feedback for improvements

### What Gets Checked

| Check | Description |
|-------|-------------|
| Syntax | Valid TypeScript, no errors |
| Exports | Component and metadata exported correctly |
| Contract | onComplete called with valid PractaOutput |
| Style | Follows Stellarin design patterns |
| Safety | No network calls, no data exfiltration |
| UX | Has skip option, provides feedback |

### Approval Flow

```
Developer submits
      │
      ▼
┌─────────────────┐
│ AI Analysis     │
│ - Code quality  │
│ - Safety check  │
│ - UX patterns   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 APPROVED   NEEDS WORK
    │         │
    ▼         ▼
 Commit    Send feedback
 to repo   to developer
```

For a high-trust ecosystem, most submissions auto-approve. Manual review only if flagged.

---

## Auto-Discovery

The registry automatically discovers practa from both `core/` and `community/`:

```typescript
// registry.ts (simplified)
import { readdirSync } from "fs";

// Discover community practa at build time
const communityPracta = discoverCommunityPracta();

export const ALL_PRACTA = {
  ...CORE_PRACTA,
  ...communityPracta,
};

function discoverCommunityPracta() {
  const communityDir = "./community";
  const folders = readdirSync(communityDir);
  
  return folders.reduce((acc, folder) => {
    const { metadata, default: Component } = require(`${communityDir}/${folder}`);
    acc[metadata.type] = { ...metadata, Component };
    return acc;
  }, {});
}
```

When the app builds, it automatically includes all community practa.

---

## Best Practices

### Design

- Use `useTheme()` for colors - support light/dark mode
- Use `Spacing` and `BorderRadius` from theme constants
- Follow existing practa patterns for consistency

### User Experience

- Always provide a way to complete (button, gesture, timer)
- Support `onSkip` for users who want to exit early
- Give haptic feedback for actions
- Show progress for multi-step experiences

### Performance

- Use `useKeepAwake()` for long-running practa
- Animate with Reanimated (60fps)
- Lazy load heavy assets

### AI Usage

Community practa can use AI for personalized experiences:

```typescript
import { generateText, streamText } from "@/lib/ai";

// Generate content
const affirmation = await generateText({
  prompt: "Create a morning affirmation about gratitude",
});

// Stream for real-time display
await streamText({
  prompt: "Guide me through a body scan meditation",
  onChunk: (text) => setMeditationText(prev => prev + text),
});
```

---

## Frequently Asked Questions

### How long does review take?

For trusted developers, most submissions auto-approve within minutes. If flagged for manual review, expect 1-2 days.

### Can I update my Practa?

Yes! Submit again with the same `type` in metadata. The new version replaces the old.

### What if my submission is rejected?

You'll receive specific feedback. Common issues:
- Missing metadata fields
- No onComplete call
- Hard-coded colors (use theme instead)

### Can I use external APIs?

For high-trust developers, yes. But prefer using Stellarin's provided AI and storage APIs when possible.

### How do users find my Practa?

Approved Practa appear in the Practa library. Users can browse, try them out, and add them to Flows.

---

## Resources

- Practa Starter Template (Replit)
- Example community practa in `community/`
- Stellarin design guidelines in `design_guidelines.md`
- Flow system documentation in `docs/practa-flow-system.md`
