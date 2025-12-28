# Practa Developer Guide

Everything you need to build, test, and submit a Practa for Stellarin.

## Quick Start

1. **Edit your Practa** in `client/my-practa/index.tsx`
2. **Update metadata** in `client/my-practa/metadata.json`
3. **Preview** in the app (Dev screen → Run Practa)
4. **Submit** when ready (Dev screen → Submit)

---

## The Practa Contract

Your Practa is a React Native component that receives these props:

```typescript
interface PractaProps {
  context: PractaContext;           // Flow info + optional storage
  onComplete: (output: PractaOutput) => void;  // Call when done
  onSkip?: () => void;              // Optional skip handler
}
```

### Required: Call `onComplete`

Every Practa must call `onComplete` to signal completion:

```typescript
const handleComplete = () => {
  onComplete({
    content: { type: "text", value: "User's response" },
    metadata: { duration: 60 },
  });
};
```

### Optional: Support `onSkip`

Allow users to exit early:

```typescript
{onSkip ? (
  <Pressable onPress={onSkip}>
    <Text>Skip</Text>
  </Pressable>
) : null}
```

---

## Context & Storage

The `context` prop provides flow information and optional persistence:

```typescript
interface PractaContext {
  flowId: string;           // Current flow execution ID
  practaIndex: number;      // Position in flow (0 = first)
  previous?: {              // Output from previous Practa
    practaId: string;
    practaType: string;
    content?: { type: "text" | "image"; value: string };
    metadata?: Record<string, unknown>;
  };
  storage?: PractaStorage;  // Persist state across sessions
}
```

### Using Storage

Save user preferences or progress that persists across app restarts:

```typescript
// Load saved preference
useEffect(() => {
  context.storage?.get<string>("difficulty")
    .then((saved) => { if (saved) setDifficulty(saved); })
    .catch(() => {});
}, []);

// Save preference
const handleChange = (level: string) => {
  setDifficulty(level);
  context.storage?.set("difficulty", level).catch(() => {});
};
```

See `docs/practa-storage-system.md` for full API reference.

---

## Metadata Schema

Update `client/my-practa/metadata.json` with your Practa info:

### Required Fields

| Field | Type | Example |
|-------|------|---------|
| `type` | string | `"gratitude-journal"` |
| `name` | string | `"Gratitude Journal"` |
| `description` | string | `"Write three things you're grateful for"` |
| `author` | string | `"Your Name"` |
| `version` | string | `"1.0.0"` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `estimatedDuration` | number | Seconds to complete |
| `tags` | string[] | `["journaling", "gratitude"]` |
| `icon` | string | Feather icon name (`"heart"`) |

### Example

```json
{
  "type": "gratitude-journal",
  "name": "Gratitude Journal", 
  "description": "Write three things you're grateful for today",
  "author": "Jane Developer",
  "version": "1.0.0",
  "estimatedDuration": 120,
  "tags": ["journaling", "gratitude"],
  "icon": "heart"
}
```

---

## Assets

Declare assets in `metadata.json` and access them via `context.assets` in your Practa.

### Declaring Assets

Add an `assets` object to your `metadata.json`:

```json
{
  "id": "my-practa",
  "name": "My Practa",
  "version": "1.0.0",
  "assets": {
    "splash": "splash.png",
    "background": "bg.jpg"
  }
}
```

Then place the files in `client/my-practa/assets/`. On app restart, assets are automatically resolved.

### Accessing Assets

Assets are available via `context.assets`:

```typescript
export default function MyPracta({ context, onComplete }: PractaProps) {
  const backgroundImage = context.assets?.background;
  
  return (
    <Image source={backgroundImage} style={styles.background} />
  );
}
```

### Why This Pattern?

Your Practa code works identically in development (Replit) and production (Stellarin):
- **Dev**: Assets resolved via Metro bundler's require()
- **Production**: Stellarin provides CDN URLs through the same context

---

## Splash Screen

Add a branded splash screen that fades in before your Practa loads.

### Setup

1. Add `splash.png` to `client/my-practa/assets/`
2. Declare it in `metadata.json`:

```json
{
  "assets": {
    "splash": "splash.png"
  }
}
```

3. Restart the app

To remove the splash screen, remove the `splash` key from assets and delete the file.

### Image Requirements

| Property | Requirement |
|----------|-------------|
| File name | Any PNG (declared in metadata.json) |
| Aspect ratio | 1:2 recommended (e.g., 1080 x 2160) |
| Format | PNG |

The image displays edge-to-edge, anchored to the top. Overflow clips from the bottom, ensuring branding at the top is always visible.

### Animation Sequence

1. White overlay fades in (300ms)
2. Splash image fades in (400ms)
3. Holds for 2 seconds
4. Everything fades out (400ms)
5. Practa content appears

If no splash is declared, your Practa loads immediately.

---

## Output Schema

When calling `onComplete`, provide structured output:

```typescript
interface PractaOutput {
  content?: {
    type: "text" | "image";
    value: string;
  };
  metadata?: {
    source?: "user" | "ai" | "system";
    duration?: number;
    themes?: string[];
    emotionTags?: string[];
    [key: string]: unknown;  // Custom fields allowed
  };
}
```

### Examples

```typescript
// Simple completion
onComplete({});

// Text response
onComplete({
  content: { type: "text", value: "I'm grateful for..." },
  metadata: { source: "user", duration: 60 },
});

// With custom metadata
onComplete({
  metadata: { 
    difficulty: "medium",
    score: 85,
  },
});
```

---

## Best Practices

### Theming

Always use theme colors for light/dark mode support:

```typescript
import { useTheme } from "@/hooks/useTheme";

const { theme } = useTheme();

<View style={{ backgroundColor: theme.backgroundDefault }}>
  <Text style={{ color: theme.text }}>Hello</Text>
</View>
```

### Haptic Feedback

Provide tactile feedback for actions:

```typescript
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const triggerHaptic = () => {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};
```

### Safe Areas

Handle notches and home indicators:

```typescript
import { useSafeAreaInsets } from "react-native-safe-area-context";

const insets = useSafeAreaInsets();

<View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
```

### Spacing

Use consistent spacing from theme:

```typescript
import { Spacing, BorderRadius } from "@/constants/theme";

<View style={{ padding: Spacing.lg, borderRadius: BorderRadius.md }}>
```

---

## Validation Checklist

Before submitting, ensure:

- [ ] Default export is a function component
- [ ] Calls `onComplete` at some point
- [ ] Metadata has all required fields (`type`, `name`, `description`, `author`, `version`)
- [ ] `type` uses lowercase letters, numbers, and hyphens only
- [ ] Uses `useTheme()` for colors (no hardcoded colors)
- [ ] Provides skip option if appropriate

---

## Submission Workflow

1. **Preview** your Practa in the Dev screen
2. Click **Submit** when ready
3. Enter your **claim code** (get one from Stellarin)
4. Your Practa is reviewed and published

### What Gets Checked

| Check | Description |
|-------|-------------|
| Syntax | Valid TypeScript, no errors |
| Exports | Component and metadata exported correctly |
| Contract | `onComplete` called with valid output |
| Style | Follows Stellarin design patterns |
| UX | Has skip option, provides feedback |

---

## Complete Example

```typescript
import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PractaContext, PractaCompleteHandler } from "@/types/flow";

interface Props {
  context: PractaContext;
  onComplete: PractaCompleteHandler;
  onSkip?: () => void;
}

export default function GratitudeJournal({ context, onComplete, onSkip }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleComplete = () => {
    triggerHaptic();
    onComplete({
      content: { type: "text", value: text },
      metadata: { source: "user" },
    });
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <ThemedText style={styles.title}>What are you grateful for?</ThemedText>
      
      <TextInput
        style={[styles.input, { 
          backgroundColor: theme.backgroundDefault,
          color: theme.text,
        }]}
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Take a moment to reflect..."
        placeholderTextColor={theme.textSecondary}
      />

      <View style={{ paddingBottom: insets.bottom + Spacing.lg }}>
        <Pressable
          onPress={handleComplete}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          <ThemedText style={styles.buttonText}>Complete</ThemedText>
        </Pressable>

        {onSkip ? (
          <Pressable onPress={onSkip} style={styles.skipButton}>
            <ThemedText style={{ color: theme.textSecondary }}>Skip</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  title: { fontSize: 24, fontWeight: "600", marginBottom: Spacing.lg },
  input: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 16, textAlignVertical: "top" },
  button: { padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
  skipButton: { padding: Spacing.md, alignItems: "center", marginTop: Spacing.sm },
});
```

---

## Resources

- Storage API: `docs/practa-storage-system.md`
- Design system: `design_guidelines.md`
- Type definitions: `client/types/flow.ts`
