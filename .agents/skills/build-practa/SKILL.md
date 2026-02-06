---
name: build-practa
description: Build, create, or scaffold a Practa (wellness/mindfulness component) for Stellarin. Use when the user asks to create a practa, build a practa, make a practa, build an app, create an app, start a new practa, build a wellness experience, create a mindfulness exercise, or any variation of building interactive wellbeing content.
---

# Build a Practa

Follow these rules precisely when building a Practa for Stellarin.

## File Constraints

- ONLY edit files in `client/my-practa/`:
  - `client/my-practa/index.tsx` — your component (default export)
  - `client/my-practa/metadata.json` — practa metadata
  - `client/my-practa/assets/` — images, JSON data, audio
- Reference `client/demo-practa/` for working examples
- Do NOT modify files outside `client/my-practa/` unless explicitly asked

## Component Contract

Every Practa is a React Native component with this signature:

```typescript
import { PractaProps } from "@/types/flow";

export default function MyPracta({
  context,
  onComplete,
  onSkip,
  showSettings,
  onSettings,
}: PractaProps) {
  // ...
}
```

### Props

| Prop | Type | Required | Purpose |
|------|------|----------|---------|
| `context` | `PractaContext` | Yes | Flow info, assets, storage |
| `onComplete` | `(output: PractaOutput) => void` | Yes | Signal completion |
| `onSkip` | `() => void` | No | Let user exit early |
| `showSettings` | `boolean` | No | Whether settings button is visible |
| `onSettings` | `() => void` | No | Settings button callback |

### Calling onComplete (REQUIRED)

Every Practa MUST call `onComplete` at some point:

```typescript
onComplete({
  content: { type: "text", value: "User's response" },
  metadata: { source: "user", duration: 60 },
});
```

### Supporting onSkip

Always offer a skip option when `onSkip` is provided:

```typescript
{onSkip ? (
  <Pressable onPress={onSkip}>
    <ThemedText>Skip</ThemedText>
  </Pressable>
) : null}
```

## Header Configuration (REQUIRED)

Every Practa must configure its header using `usePractaChrome` and `useHeaderHeight`:

```typescript
import { usePractaChrome } from "@/context/PractaChromeContext";
import { useHeaderHeight } from "@/components/PractaChromeHeader";
import { Spacing } from "@/constants/theme";

export default function MyPracta({ showSettings, onSettings }: PractaProps) {
  const { setConfig } = usePractaChrome();
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    setConfig({
      headerMode: "default",  // "default" | "minimal" | "none"
      title: "My Practa",
      showSettings,
      onSettings,
    });
  }, [setConfig, showSettings, onSettings]);

  return (
    <View style={{ paddingTop: headerHeight + Spacing.lg }}>
      {/* Content */}
    </View>
  );
}
```

| Header Mode | Use Case |
|-------------|----------|
| `default` | Standard screens with title and close button |
| `minimal` | Floating close button, progress dots |
| `none` | Full-screen immersive (you handle safe areas) |

## Assets — NEVER Use require()

Assets MUST be declared in `metadata.json` and accessed via `context.assets`.

### Step 1: Place files in `client/my-practa/assets/`
### Step 2: Declare in metadata.json

```json
{
  "assets": {
    "splash": "splash.png",
    "background": "bg.jpg",
    "wordlist": "words.json"
  }
}
```

### Step 3: Access via context

```typescript
// Images
<Image source={context.assets?.splash} />

// JSON data (auto-parsed)
const words = context.assets?.wordlist as string[];
```

### WRONG — Never do this

```typescript
import splash from "./assets/splash.png";     // NO
const img = require("./assets/icon.png");      // NO
```

## Storage API

Persist user preferences across sessions via `context.storage`:

```typescript
// Load
useEffect(() => {
  context.storage?.get<string>("difficulty")
    .then((saved) => { if (saved) setDifficulty(saved); })
    .catch(() => {});
}, []);

// Save
context.storage?.set("difficulty", level).catch(() => {});

// Remove
context.storage?.remove("key");

// Clear all
context.storage?.clear();
```

Limits: 10KB per value, 100KB total per practa.

## Theming (REQUIRED)

Always use theme colors — never hardcode colors:

```typescript
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const { theme } = useTheme();

<View style={{ backgroundColor: theme.backgroundDefault }}>
  <ThemedText style={{ color: theme.text }}>Hello</ThemedText>
</View>
```

## Haptic Feedback

```typescript
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

if (Platform.OS !== "web") {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
```

## Safe Areas

- With header (`default`/`minimal`): use `useHeaderHeight()` for top padding
- Without header (`none`): use `useSafeAreaInsets()` directly
- Bottom: always use `useSafeAreaInsets().bottom`

## Metadata Schema

Update `client/my-practa/metadata.json`:

```json
{
  "id": "my-practa-id",
  "name": "My Practa",
  "version": "1.0.0",
  "description": "What this practa does",
  "author": "Author Name",
  "estimatedDuration": 60,
  "category": "wellness",
  "tags": ["mindfulness", "breathing"],
  "assets": {},
  "dependencies": [],
  "configSchema": {}
}
```

Rules:
- `id`: lowercase kebab-case, 3-50 chars
- `version`: semver (e.g., "1.0.0")
- `dependencies`: only Expo Go compatible packages
- `configSchema`: optional, for user-configurable settings

### Config Schema Example

```json
{
  "configSchema": {
    "fields": {
      "duration": {
        "type": "number",
        "label": "Session Length",
        "description": "Duration in minutes",
        "default": 5,
        "min": 1,
        "max": 30
      },
      "theme": {
        "type": "select",
        "label": "Theme",
        "options": [
          { "value": "calm", "label": "Calm" },
          { "value": "nature", "label": "Nature" }
        ]
      }
    }
  }
}
```

Field types: `string`, `number`, `boolean`, `select`

## Validation Checklist

Before finishing, verify:
- [ ] Default export is a function component
- [ ] `onComplete` is called at some point
- [ ] `onSkip` is supported when provided
- [ ] `usePractaChrome` configures the header
- [ ] `useHeaderHeight` used for top padding
- [ ] Theme colors used (no hardcoded colors)
- [ ] Assets accessed via `context.assets` (no `require()`)
- [ ] Metadata has required fields: `id`, `name`, `description`, `author`, `version`
- [ ] `id` is lowercase kebab-case

## Reference

- Full docs: `docs/practa-developer-guide.md`
- Storage docs: `docs/practa-storage-system.md`
- Types: `client/types/flow.ts`
- Demo practas: `client/demo-practa/breathing-pause/`, `client/demo-practa/gratitude-prompt/`
