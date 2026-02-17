# Practa Developer Guide

Everything you need to build, test, and submit a Practa for Stellarin.

## Quick Start

1. **Edit your Practa** in `client/my-practa/index.tsx`
2. **Update metadata** in `client/my-practa/metadata.json`
3. **Add dependencies** to metadata if using external packages (see Dependencies section)
4. **Preview** in the app (Dev screen → Run Practa)
5. **Submit** when ready (Dev screen → Submit)

---

## The Practa Contract

Your Practa is a React Native component that receives these props:

```typescript
interface PractaProps {
  context: PractaContext;           // Flow info + optional storage
  onComplete: (output: PractaOutput) => void;  // Call when done
  showSettings?: boolean;           // Whether to show settings button
  onSettings?: () => void;          // Settings button callback
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

### Optional: Settings Support

If your Practa has configurable options, use the settings props:

```typescript
export default function MyPracta({ showSettings, onSettings }: PractaProps) {
  // Settings are handled via usePractaChrome - see Header Configuration below
}
```

---

## Header Configuration (usePractaChrome)

Use the `usePractaChrome` hook to configure how your Practa's header appears:

```typescript
import { useEffect } from "react";
import { usePractaChrome } from "@/context/PractaChromeContext";

export default function MyPracta({ showSettings, onSettings }: PractaProps) {
  const { setConfig } = usePractaChrome();

  useEffect(() => {
    setConfig({
      headerMode: "default",      // "default" | "minimal" | "none"
      title: "My Practa",         // Header title (for default mode)
      showSettings,               // Pass through from props
      onSettings,                 // Pass through from props
    });
  }, [setConfig, showSettings, onSettings]);
}
```

### Header Modes

| Mode | Description |
|------|-------------|
| `default` | Full header with title, close button, and optional settings |
| `minimal` | Floating close button with optional progress dots |
| `none` | No header (for full-screen experiences) |

---

## Layout Padding (useHeaderHeight)

Use the `useHeaderHeight` hook to calculate proper top padding that accounts for the header:

```typescript
import { usePractaChrome } from "@/context/PractaChromeContext";
import { useHeaderHeight } from "@/components/PractaChromeHeader";
import { Spacing } from "@/constants/theme";

export default function MyPracta({ context, onComplete }: PractaProps) {
  const { setConfig } = usePractaChrome();
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    setConfig({ headerMode: "default", title: "My Practa" });
  }, [setConfig]);

  return (
    <ThemedView style={{ paddingTop: headerHeight + Spacing.lg }}>
      {/* Your content */}
    </ThemedView>
  );
}
```

The hook automatically returns:
- Header height + safe area for `default` and `minimal` modes
- `0` for `none` mode (you handle your own safe areas)

---

## Context, Assets & Storage

The `context` prop provides flow information, assets, and optional persistence:

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
  assets?: ResolvedAssets;  // Images and JSON declared in metadata.json
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

> Full standalone reference: [`docs/practa-metadata-schema.md`](./practa-metadata-schema.md)

Update `client/my-practa/metadata.json` with your Practa info:

### Required Fields

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `type` | string | `"gratitude-journal"` | Unique identifier |
| `name` | string | `"Gratitude Journal"` | Display name |
| `description` | string | `"Write three things you're grateful for"` | Short summary |
| `author` | string | `"Your Name"` | Creator name |
| `version` | string | `"1.0.0"` | Semver version |
| `requiresAI` | boolean | `false` | Whether this Practa **requires** AI to function at all. Set `true` if the Practa cannot work without AI (e.g., AI-generated content is the core experience). Set `false` if it can operate without AI. Every Practa must declare this. |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `estimatedDuration` | number | Seconds to complete |
| `tags` | string[] | `["journaling", "gratitude"]` |
| `icon` | string | Feather icon name (`"heart"`) |
| `dependencies` | string[] | npm packages to auto-install |
| `configSchema` | object | User-configurable settings schema |

### Config Schema

Define configurable options for your Practa by adding a `configSchema` object to your metadata.json. Each field goes under `fields` with a unique key. Your Practa receives its config at runtime via `context.config`.

#### Field Types

| Type | Properties | Description |
|------|-----------|-------------|
| `string` | `placeholder`, `default`, `minLength`, `maxLength` | Text input. When `maxLength` is set, the UI shows a character counter and enforces the limit. |
| `number` | `default`, `min`, `max` | Numeric input, clamped to min/max range |
| `boolean` | `default` | Toggle switch |
| `select` | `default`, `options` | Dropdown. `options` is an array of `{ value, label }` pairs |

All field types support: `label` (required), `description` (optional), `required` (optional, marks field as mandatory).

Set `requiredConfig: true` at the top level if the Practa cannot run without configuration.

#### Standard Field: `aiEnabled`

Every Practa should include an `aiEnabled` boolean in its configSchema. This lets the user toggle AI-powered enhancements on or off at runtime. This is separate from the top-level `requiresAI` flag:

- **`requiresAI`** (metadata) = "Can this Practa function at all without AI?" (a fact about the Practa)
- **`aiEnabled`** (configSchema) = "Should AI features be turned on right now?" (a user preference)

Even Practas that don't require AI should include this toggle so they can optionally leverage AI features (e.g., personalized prompts, adaptive pacing) when available.

```json
"aiEnabled": {
  "type": "boolean",
  "label": "Enable AI Features",
  "description": "Allow this Practa to use AI-powered enhancements when available",
  "default": true
}
```

At runtime, check both values to decide behavior:

```typescript
export default function MyPracta({ context }: PractaProps) {
  const aiEnabled = context.config?.aiEnabled ?? true;
  
  if (aiEnabled) {
    // Use AI-powered content generation, adaptive pacing, etc.
  } else {
    // Fall back to static content or manual configuration
  }
}
```

#### Example

```json
{
  "configSchema": {
    "fields": {
      "duration": {
        "type": "number",
        "label": "Minutes",
        "default": 25,
        "min": 5,
        "max": 60
      },
      "title": {
        "type": "string",
        "label": "Session Title",
        "maxLength": 50,
        "placeholder": "My Session"
      },
      "soundEnabled": {
        "type": "boolean",
        "label": "Play sounds",
        "default": true
      },
      "difficulty": {
        "type": "select",
        "label": "Difficulty",
        "default": "medium",
        "options": [
          { "value": "easy", "label": "Easy" },
          { "value": "medium", "label": "Medium" },
          { "value": "hard", "label": "Hard" }
        ]
      }
    },
    "requiredConfig": false
  }
}
```

#### Accessing Config at Runtime

```typescript
export default function MyPracta({ context, onComplete }: PractaProps) {
  const duration = context.config?.duration ?? 25;
  const title = context.config?.title ?? "Untitled";
  const soundEnabled = context.config?.soundEnabled ?? true;
  // ...
}
```

### Dependencies

If your Practa uses npm packages beyond the base template, list them in the `dependencies` array:

```json
{
  "dependencies": [
    "expo-sharing",
    "react-native-view-shot"
  ]
}
```

The server automatically installs missing dependencies on startup and template updates. Only include packages that are Expo Go compatible.

**Note:** If your Practa uses video assets (e.g., `splash.mp4`), include `expo-video` in dependencies.

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
  "icon": "heart",
  "dependencies": ["expo-sharing"]
}
```

---

## Assets

Declare assets in `metadata.json` and access them via `context.assets` in your Practa.

### Supported File Types

| Extension | What You Receive | Usage |
|-----------|------------------|-------|
| `.png` | Image source object | `<Image source={context.assets.icon} />` |
| `.jpg` / `.jpeg` | Image source object | `<Image source={context.assets.photo} />` |
| `.gif` | Image source object | `<Image source={context.assets.animation} />` |
| `.json` | Parsed JavaScript object/array | `context.assets.data.forEach(...)` |

### Declaring Assets

Add an `assets` object to your `metadata.json`:

```json
{
  "id": "my-practa",
  "name": "My Practa",
  "version": "1.0.0",
  "assets": {
    "splash": "splash.png",
    "background": "bg.jpg",
    "wordlist": "words.json",
    "puzzles": "puzzles.json"
  }
}
```

Then place the files in `client/my-practa/assets/`. On app restart, assets are automatically resolved.

### Using Image Assets

Images are used directly with the Image component:

```typescript
import { Image } from 'react-native';

export default function MyPracta({ context, onComplete }: PractaProps) {
  return (
    <Image source={context.assets?.splash} />
    <Image source={context.assets?.background} style={styles.bg} />
  );
}
```

### Using JSON Data

JSON files are automatically parsed and available as objects or arrays:

```typescript
export default function MyPracta({ context, onComplete }: PractaProps) {
  const words = context.assets?.wordlist as string[];
  const puzzles = context.assets?.puzzles as Puzzle[];
  
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const todaysPuzzle = puzzles.find(p => p.date === today);
  
  return <Text>{randomWord}</Text>;
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

Provide tactile feedback for actions using the `useHaptics` hook:

```typescript
import { useHaptics } from "@/hooks/useHaptics";

const haptics = useHaptics();

haptics.light();     // Light tap
haptics.medium();    // Medium impact
haptics.heavy();     // Heavy impact
haptics.success();   // Success notification
haptics.warning();   // Warning notification
haptics.error();     // Error notification
haptics.selection(); // Selection change
```

### Safe Areas & Header Height

For top padding, use `useHeaderHeight` which accounts for both the header and safe area:

```typescript
import { useHeaderHeight } from "@/components/PractaChromeHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "@/constants/theme";

const headerHeight = useHeaderHeight();
const insets = useSafeAreaInsets();

<View style={{ 
  paddingTop: headerHeight + Spacing.lg,  // Accounts for header + safe area
  paddingBottom: insets.bottom + Spacing.lg 
}}>
```

For screens with `headerMode: "none"`, use safe area insets directly:

```typescript
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
- [ ] Supports `showSettings` / `onSettings` props

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
| UX | Supports settings, provides feedback |

---

## Complete Example

```typescript
import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { GlassBackground } from "@/components/GlassBackground";
import { useTheme } from "@/hooks/useTheme";
import { useHaptics } from "@/hooks/useHaptics";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PractaProps } from "@/types/flow";
import { usePractaChrome } from "@/context/PractaChromeContext";
import { useHeaderHeight } from "@/components/PractaChromeHeader";

export default function GratitudeJournal({ 
  context, 
  onComplete, 
  showSettings,
  onSettings 
}: PractaProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { setConfig } = usePractaChrome();
  const headerHeight = useHeaderHeight();
  const [text, setText] = useState("");

  useEffect(() => {
    setConfig({
      headerMode: "default",
      title: "Gratitude Journal",
      showSettings,
      onSettings,
    });
  }, [setConfig, showSettings, onSettings]);

  const handleComplete = () => {
    haptics.success();
    onComplete({
      content: { type: "text", value: text },
      metadata: { source: "user" },
    });
  };

  return (
    <GlassBackground style={[styles.container, { paddingTop: headerHeight + Spacing.lg }]}>
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
      </View>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  title: { fontSize: 24, fontWeight: "600", marginBottom: Spacing.lg },
  input: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 16, textAlignVertical: "top" },
  button: { padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
```

---

## Demo Practas

Reference these examples in `client/demo-practa/`:

| Demo | Header Mode | Key Patterns |
|------|-------------|--------------|
| `breathing-pause` | `default` | Animation, audio, progress tracking, settings |
| `gratitude-prompt` | `none` | Text input, keyboard handling, full-screen layout |

Each demo shows proper use of `usePractaChrome`, `useHeaderHeight`, and the complete props interface.

---

## Resources

- Storage API: `docs/practa-storage-system.md`
- Design system: `design_guidelines.md`
- Type definitions: `client/types/flow.ts`
- Chrome context: `client/context/PractaChromeContext.tsx`
- Header component: `client/components/PractaChromeHeader.tsx`
