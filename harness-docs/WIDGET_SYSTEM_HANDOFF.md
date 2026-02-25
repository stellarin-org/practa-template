# Practa Widget System - Host-Side Integration Guide

This document describes how the Stellarin host app loads, evaluates, and renders community Practa widgets on the home screen. It also answers the four open items from the post-import status report.

---

## Answers to Open Items

### 1. `_widgets.tsx` Build Script — RESOLVED

The build script (`scripts/fetch-community-practa.js`) now includes a `generateWidgetsFile(practas)` function that runs alongside `generateComponentsFile`. It:

- Filters Practa entries where `widget.enabled === true` in the registry metadata AND `widget.tsx` exists in the copied directory.
- Generates `client/practa/community/_widgets.tsx` with static imports, matching the exact pattern used by `_components.tsx`.
- Is called both during normal sync and during orphan pruning.
- `widget.tsx` files are already copied by the existing code (`.tsx` is in `CODE_EXTENSIONS` and `widget.tsx` is not in `SKIP_FILES`).

Example generated output for a Practa with slug `breathing-timer`:

```tsx
import type { WidgetModule } from "@/types/flow";
import BreathingTimerWidget, { shouldDisplay as BreathingTimerShouldDisplay } from "./breathing-timer/widget";

export const COMMUNITY_WIDGET_MODULES: Record<string, WidgetModule> = {
  "breathing-timer": {
    default: BreathingTimerWidget,
    shouldDisplay: BreathingTimerShouldDisplay,
  },
};
```

### 2. `slug` vs `id` — CLARIFICATION

On the host side, **`slug` is the only identifier used**. The registry (`_registry.json`) keys everything on `slug`. The host-side loader (`community-loader.ts`), the component registry (`_components.tsx`), the widget registry (`_widgets.tsx`), and `PractaStorageManager` all use `slug`.

If your template and submission system use `id`, these are effectively the same value — your submission pipeline just needs to map `id` to `slug` when generating registry entries. The host never looks for an `id` field. You do NOT need to add `slug` as a separate field to your schema; just ensure the value that lands in `_registry.json` as `slug` matches what your template calls `id`.

**TL;DR**: `slug` (host) = `id` (template). Same value, different name. No schema change needed on either side.

### 3. `shouldDisplay` Fallback — CONFIRMED

**Yes, your spec is correct.** If `shouldDisplay` is not exported from `widget.tsx`, the host treats it as always-display (`return true`). The relevant code in `PractaWidgetCard.tsx`:

```typescript
const shouldShow = widgetModule.shouldDisplay
  ? widgetModule.shouldDisplay(allData)
  : true;
```

Additionally:
- If `shouldDisplay` throws, the widget is hidden (caught in try/catch, treated as `false`).
- If `shouldDisplay` returns a falsy value, the widget is hidden.
- If the Practa has no stored data, `data` will be `{}` — the widget and its `shouldDisplay` still run normally.

### 4. Widget Error Boundary — CONFIRMED

**Yes, your spec is correct.** The host wraps every widget in a `WidgetErrorBoundary` class component. Here is the exact contract:

```typescript
class WidgetErrorBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[PractaWidget] Widget render error:", error.message);
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
```

Behavior:
- If the widget component throws during render, the boundary catches it.
- The broken widget renders `null` (invisible) — it does NOT crash the home screen.
- A warning is logged: `[PractaWidget] Widget render error: <message>`.
- The widget card sets `errored = true` and stays hidden for the rest of the session.
- Other widgets are completely unaffected (each has its own boundary).
- The `shouldDisplay` function is called in a separate try/catch before the boundary — if it throws, the widget is hidden before rendering is even attempted.

---

## Architecture Overview

The widget system has three layers:

1. **Build-time**: `scripts/fetch-community-practa.js` syncs community Practa from GitHub and generates both `_components.tsx` and `_widgets.tsx`.
2. **Registry/Loader** (`client/practa/community-loader.ts`): Discovers which Practa have `widget.enabled: true` in their metadata, and loads their widget modules from `_widgets.tsx`.
3. **Rendering** (`client/components/PractaWidgetCard.tsx`): Evaluates `shouldDisplay`, renders the widget component inside an error boundary, and handles tap-to-launch.

---

## What a Community Practa Must Provide

### 1. Registry metadata (in `_registry.json`)

The Practa entry must include a `widget` field:

```json
{
  "slug": "my-practa",
  "name": "My Practa",
  "widget": {
    "enabled": true,
    "displayName": "My Widget Title",
    "description": "Optional description"
  }
}
```

- `enabled`: Must be `true` for the widget to appear.
- `displayName`: Passed as `practaName` in `WidgetProps`.
- `description`: Optional, not currently rendered by the host.

### 2. widget.tsx

Place a `widget.tsx` file in the Practa's directory. It must export:

```tsx
import React from "react";
import { View } from "react-native";
import type { WidgetProps } from "@/types/flow";

// Optional but recommended: determines if this widget should appear.
// If omitted, widget is always shown.
// `data` is ALL key-value pairs stored by this Practa via PractaStorageManager.
export function shouldDisplay(data: Record<string, unknown>): boolean {
  return Object.keys(data).length > 0;
}

// Required: the actual widget UI — a read-only, glanceable card.
// The entire card is already tappable (launches the parent Practa).
export default function MyWidget({ data, theme, isDark, practaName }: WidgetProps) {
  return (
    <View>{/* Your read-only content */}</View>
  );
}
```

### WidgetProps contract

```typescript
interface WidgetProps {
  data: Record<string, unknown>;  // All stored key-value pairs for this Practa
  theme: ThemeColors;              // Current theme color tokens
  isDark: boolean;                 // Whether dark mode is active
  practaName: string;              // The displayName from widget metadata
}
```

`ThemeColors` comes from `client/constants/theme.ts` and includes: `text`, `textSecondary`, `background`, `card`, `border`, `primary`, `secondary`, `accent`, `jade`, `jadeMuted`, `amber`, `amberMuted`, `coral`, `coralMuted`, etc.

### shouldDisplay contract

```typescript
type ShouldDisplayFn = (data: Record<string, unknown>) => boolean;
```

- Called with the full contents of `PractaStorageManager.getAllData()` for the current user + this Practa's slug.
- Must be a **pure, synchronous function** — no async, no side effects.
- If it throws, the widget is hidden (caught in try/catch, treated as `false`).
- If omitted from the export, the widget is treated as always-visible.
- If the Practa has never stored any data, `data` will be `{}`.

---

## How Storage Works for Widgets

The host loads widget data via `PractaStorageManager(userId, slug).getAllData()`.

- **userId**: `user.sub` (ManaPond OAuth) or `anon-${deviceId}` (anonymous). This matches exactly what FlowScreen passes when running the Practa, so any data stored during execution is visible to the widget.
- **slug**: The Practa's slug from the registry.
- **Key format in AsyncStorage**: `practa:${userId}:${slug}:${key}` — the widget receives just the `${key}` portion.
- **Quota keys** (suffixed `__quota__`) are automatically excluded.

---

## Host Rendering Pipeline

On the home screen:

1. **`PractaWidgetList`** mounts and:
   - Resolves userId (`user.sub` from ManaPond auth, or `anon-${deviceId}`).
   - Calls `getWidgetEnabledPractas()` to find entries with `widget.enabled: true`.
   - Loads each widget's `CommunityWidgetMeta` and `WidgetModule` from `_widgets.tsx`.
   - Renders a `PractaWidgetCard` for each valid widget.

2. **`PractaWidgetCard`** for each widget:
   - Loads stored data via `PractaStorageManager(userId, slug).getAllData()`.
   - Calls `shouldDisplay(data)` (or defaults to `true`).
   - Wraps the component in `WidgetErrorBoundary`.
   - The card is a `Pressable` — tapping calls `onPractaPress(slug)`, launching the Practa as a single-step flow.

3. **Re-evaluation**: `useFocusEffect` re-runs `loadWidgetData` every time the home screen gains focus (e.g., after completing a Practa).

---

## Widget Design Constraints

Widgets should:

- Be **read-only** and **glanceable** — dashboard cards, not interactive forms.
- Use the provided `theme` object for all colors (light/dark mode support).
- Not implement their own tap handlers — the card is already tappable.
- Not make network requests — they only read from local `data`.
- Keep rendering fast — they're on the home screen scroll.

---

## File Reference

| File | Purpose |
|------|---------|
| `client/types/flow.ts` | `WidgetProps`, `ShouldDisplayFn`, `WidgetModule`, `WidgetMetadata` types |
| `client/lib/practa-storage.ts` | `PractaStorageManager` with `getAllData()` |
| `client/practa/community-loader.ts` | `getWidgetEnabledPractas()`, `getWidgetMeta()`, `getCommunityWidgetModule()` |
| `client/practa/community/_widgets.tsx` | Auto-generated widget module registry |
| `client/components/PractaWidgetCard.tsx` | `PractaWidgetCard` + `PractaWidgetList` + `WidgetErrorBoundary` |
| `client/screens/HomeScreen.tsx` | Integrates `PractaWidgetList` between flow banners and Activities |
| `scripts/fetch-community-practa.js` | Build script — generates `_components.tsx` and `_widgets.tsx` |
