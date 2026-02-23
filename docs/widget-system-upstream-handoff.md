# Practa Widget System — Upstream Handoff

This document consolidates everything needed for the upstream harness developer to understand and integrate the widget system into Stellarin and `flow.ts`.

---

## 1. Feature Spec

The Widget System allows each Practa to surface a glanceable, read-only widget inside the main Stellarin app. Widgets act like iOS or Android home-screen widgets — full-width cards that display contextual information from the Practa's stored data. They appear in specific circumstances determined by built-in conditional logic, or can be set to always display.

### Goals

1. **Contextual surfacing** — Show relevant Practa information at the right time (e.g., "You have a meditation session scheduled for today").
2. **Self-contained** — Each widget bundles its own visual design and display logic; the host app doesn't need to understand the Practa's internal data model.
3. **Data-driven** — Widgets read from the Practa's existing storage (via `PractaStorage`) so they reflect real user data.
4. **Testable in-template** — Developers can preview their widget inside the Practa Starter Template using real stored data before submission.
5. **Optional** — Not every Practa needs a widget. The system is opt-in via metadata declaration.

### File Structure

```
client/my-practa/
  index.tsx           # Main Practa component (unchanged)
  widget.tsx          # Widget component + display logic
  metadata.json       # Declares widget support
  assets/             # Shared assets (unchanged)
```

### widget.tsx Contract

Each widget file exports two things:

**1. `shouldDisplay` — named export**

A pure, synchronous, side-effect-free function. Receives the Practa's stored data as a flat object. Returns `true` to show the widget, `false` to hide.

```
shouldDisplay(data: Record<string, any>) => boolean
```

For always-visible widgets: `return true`.

**2. Default export — Widget component**

A React component that renders the widget's visual content.

| Prop | Type | Description |
|------|------|-------------|
| `data` | `Record<string, unknown>` | All key-value pairs from PractaStorage |
| `theme` | ThemeColors (Colors.light / Colors.dark) | Current app theme |
| `isDark` | `boolean` | Whether dark mode is active |
| `practaName` | `string` | Display name of the Practa (from metadata) |

**Constraints:**
- Read-only — widgets cannot write to storage.
- No internal navigation — tapping the widget to open the Practa is handled by the host app.
- Self-contained layout — the widget provides its own internal layout within the full-width card frame.
- No `onComplete`, no `context.flowId` — widgets are outside the flow execution model.

### Tap-to-Open Behavior

The entire widget card is tappable. The host app wraps the rendered widget component in a `Pressable` and uses the Practa's `id` from metadata to navigate. The widget component itself has no `onPress` or navigation props.

### Metadata Declaration

```json
{
  "widget": {
    "enabled": true,
    "displayName": "Today's Session",
    "description": "Shows upcoming or active sessions for today"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | `boolean` | Yes | Whether this Practa has a widget |
| `displayName` | `string` | Yes (when enabled) | Short label for the widget |
| `description` | `string` | No | Brief description of what the widget shows |

If `widget` is absent or `enabled` is `false`, the Practa has no widget.

### Data Flow

```
┌─────────────────────────────────────────────────┐
│                  Stellarin App                   │
│                                                  │
│  1. Load all installed Practas                   │
│  2. For each Practa with widget.enabled = true:  │
│     a. Read Practa's PractaStorage data          │
│     b. Call shouldDisplay(data)                  │
│     c. If true → render Widget component         │
│        Pass: { data, theme, isDark, practaName } │
│  3. Display widgets in home/dashboard feed       │
│  4. Wrap each widget in Pressable → tap opens    │
│     the associated Practa via metadata.id        │
└─────────────────────────────────────────────────┘
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| No stored data yet | `shouldDisplay` receives `{}` — widget decides whether to show with empty data |
| Widget throws error | Host catches error, hides widget, logs warning |
| `shouldDisplay` is missing | Treat as always-display (`return true`) |
| `widget.tsx` missing but `widget.enabled` is true | Validation error at submission time |
| Widget returns null | Host renders empty card frame, no crash |

### Non-Goals (Out of Scope for v1)

- Internal interactivity (no buttons/inputs inside widgets)
- Multiple widgets per Practa
- Widget-to-widget communication
- Push/background refresh
- Variable widget sizing

---

## 2. Types to Add to flow.ts

These types are currently defined locally in `client/types/widget.ts`. They should be absorbed into `flow.ts` upstream so all templates get the same widget contract.

```typescript
// client/types/widget.ts — to be absorbed into flow.ts

import type { Colors } from "@/constants/theme";

export type ThemeColors = (typeof Colors)["light"];

export interface WidgetProps {
  data: Record<string, unknown>;
  theme: ThemeColors;
  isDark: boolean;
  practaName: string;
}

export type ShouldDisplayFn = (data: Record<string, unknown>) => boolean;

export interface WidgetModule {
  default: React.ComponentType<WidgetProps>;
  shouldDisplay: ShouldDisplayFn;
}
```

---

## 3. Example Widget Implementation

This is the example widget shipped with the template. It shows session count and last activity — always visible.

```tsx
// client/my-practa/widget.tsx

import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { WidgetProps } from "@/types/widget";

export function shouldDisplay(data: Record<string, unknown>): boolean {
  return true;
}

export default function MyPractaWidget({ data, theme, isDark, practaName }: WidgetProps) {
  const sessionCount = typeof data.sessionCount === "number" ? data.sessionCount : 0;
  const lastSession = typeof data.lastSession === "string" ? data.lastSession : null;

  const greeting = sessionCount > 0
    ? `${sessionCount} session${sessionCount !== 1 ? "s" : ""} completed`
    : "No sessions yet";

  const subtitle = lastSession
    ? `Last session: ${formatRelativeDate(lastSession)}`
    : "Tap to start your first session";

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: theme.accentSoft }]}>
          <Feather name="sun" size={20} color={theme.primary} />
        </View>
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>{practaName}</ThemedText>
          <ThemedText style={styles.stat}>{greeting}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</ThemedText>
        </View>
      </View>
    </View>
  );
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  stat: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
});
```

---

## 4. Example Metadata Declaration

```json
{
  "id": "practa-template",
  "name": "My Practa",
  "version": "4.1.2",
  "widget": {
    "enabled": true,
    "displayName": "Session Tracker",
    "description": "Shows session count and last activity"
  }
}
```

---

## 5. Metadata Validation (added to shared/metadata-schema.ts)

When `widget.enabled` is `true`, validation requires `widget.displayName` to be a non-empty string:

```typescript
const widget = data.widget;
if (widget && typeof widget === "object" && (widget as Record<string, unknown>).enabled === true) {
  const w = widget as Record<string, unknown>;
  if (!w.displayName || typeof w.displayName !== "string" || (w.displayName as string).trim() === "") {
    errors.push({
      field: "widget.displayName",
      label: "Widget display name",
      message: "Widget is enabled but missing a displayName",
    });
  } else {
    successes.push({ field: "widget.displayName", label: "Widget display name" });
  }
  if (w.description && typeof w.description === "string") {
    successes.push({ field: "widget.description", label: "Widget description" });
  }
}
```

---

## 6. Template Preview (MyPractaScreen)

The template's MyPractaScreen includes a Widget Preview section that:

1. Detects widget support via `metadata.json` `widget.enabled`
2. Loads all stored data from `PractaStorage` (via AsyncStorage prefix scan)
3. Evaluates `shouldDisplay(data)` and shows visible/hidden status
4. Renders the widget component with real data inside a tappable preview frame
5. Provides a "Force show" toggle to override `shouldDisplay` for testing
6. Displays stored data keys/values below the widget for debugging

---

## 7. Stellarin Host Integration Checklist

When integrating widgets into the main Stellarin app:

- [ ] Absorb `WidgetProps`, `ShouldDisplayFn`, `WidgetModule` from `client/types/widget.ts` into `flow.ts`
- [ ] Add `widget.ts` to harness import config (`.config/harness-import.config.json`) so it syncs to all templates
- [ ] On app launch/foreground: scan installed Practas for `widget.enabled: true`
- [ ] For each widget-enabled Practa: load storage data, call `shouldDisplay(data)`
- [ ] Render visible widgets as full-width cards in the home/dashboard feed
- [ ] Wrap each widget in `Pressable` — tap navigates to the associated Practa
- [ ] Catch rendering errors per-widget (hide + log, don't crash the feed)
- [ ] Re-evaluate `shouldDisplay` on app foreground and after Practa completion
- [ ] Add widget management (show/hide) to user settings using `displayName` from metadata
