---
name: build-practa-widget
description: Build or create a Practa widget for the Stellarin home screen. Use when the user asks to create a widget, build a widget, add a widget to their practa, make a home screen card, add a glanceable display, or any variation of building a widget for their Practa.
---

# Build a Practa Widget

Widgets are optional, glanceable, read-only cards that appear on the Stellarin home screen. They show contextual information from the Practa's stored data. Think of them like iOS or Android home-screen widgets.

## Before You Start

1. **Read `docs/widget-system.md`** — full feature spec covering architecture, data flow, edge cases, and constraints
2. **Read `client/types/flow.ts`** — look at `WidgetProps`, `ShouldDisplayFn`, `WidgetModule`, and `WidgetMetadata` types
3. **Reference `client/my-practa/widget.tsx`** — the existing example widget to see the pattern

## What a Widget Is

- A full-width card rendered in the Stellarin home/dashboard feed
- Read-only — no buttons, inputs, forms, or navigation inside the widget
- Data-driven — receives stored data from PractaStorage as a flat `Record<string, unknown>`
- Conditionally visible — a `shouldDisplay` function controls when it appears
- Tappable — the host wraps the entire card in a Pressable that opens the associated Practa (the widget itself has no tap/navigation logic)

## What a Widget Is NOT

- Not interactive (no onPress handlers, no TextInput, no buttons)
- Not a mini-app — it cannot write to storage or trigger flows
- Not a replacement for the main Practa component — it supplements it
- Not required — widgets are opt-in

## File to Create/Edit

```
client/my-practa/widget.tsx
```

This is the ONLY file you create. You also update `metadata.json` to declare the widget.

## widget.tsx Contract

The file must export exactly two things:

### 1. Named export: `shouldDisplay`

```typescript
export function shouldDisplay(data: Record<string, unknown>): boolean {
  // Return true to show the widget, false to hide it
  // data = all key-value pairs from the Practa's PractaStorage
}
```

**Rules:**
- Must be synchronous
- Must be side-effect-free (no API calls, no storage writes, no console.log)
- Receives `{}` if no data has been stored yet
- Return `true` for always-visible widgets

**Common patterns:**
- Always show: `return true`
- Show after first use: `return Object.keys(data).length > 0`
- Show on active streak: `return typeof data.streakDays === "number" && data.streakDays > 0`
- Show on specific day: `return new Date().getDay() === 1` (Mondays)
- Show when threshold met: `return typeof data.count === "number" && data.count >= 5`

### 2. Default export: Widget component

```typescript
import type { WidgetProps } from "@/types/flow";

export default function MyWidget({ data, theme, isDark, practaName }: WidgetProps) {
  // Render a glanceable card with stored data
}
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `data` | `Record<string, unknown>` | All stored key-value pairs from PractaStorage |
| `theme` | ThemeColors | Current theme colors (light or dark mode) |
| `isDark` | `boolean` | Whether dark mode is active |
| `practaName` | `string` | Display name of the Practa from metadata |

## Metadata Declaration

Add a `widget` section to `client/my-practa/metadata.json`:

```json
{
  "widget": {
    "enabled": true,
    "displayName": "Short Widget Label",
    "description": "Brief description of what the widget shows"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | `boolean` | Yes | Must be `true` for the widget to appear |
| `displayName` | `string` | Yes (when enabled) | Short label shown in widget management UI |
| `description` | `string` | No | What the widget shows and when |

## Design Guidelines

- **Use theme colors** — never hardcode colors; use `theme.primary`, `theme.text`, `theme.textSecondary`, `theme.accentSoft`, etc.
- **Use `ThemedText`** — import from `@/components/ThemedText` for all text
- **Use `Spacing` and `BorderRadius`** — import from `@/constants/theme` for consistent spacing
- **Keep it compact** — widgets are glanceable; aim for 2-4 lines of meaningful info
- **Use Feather icons** — import from `@expo/vector-icons` for visual cues
- **Support both themes** — test with `isDark` true and false
- **Handle empty data** — always provide fallback values when data keys are missing
- **Type-check data values** — stored data is `unknown`; check types before using (e.g., `typeof data.count === "number"`)

## Allowed Imports

Widgets can use:
- `react` and `react-native` (View, Text, StyleSheet, etc.)
- `@expo/vector-icons` (Feather icons)
- `@/components/ThemedText`
- `@/constants/theme` (Spacing, BorderRadius, Colors)
- `@/types/flow` (WidgetProps)

Widgets CANNOT use:
- `@/lib/practa-storage` (no writing)
- `@/context/PractaChromeContext` (no header)
- Any navigation hooks
- Any async operations

## Complete Example

```typescript
import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import type { WidgetProps } from "@/types/flow";

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
    ? `Last: ${formatRelativeDate(lastSession)}`
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
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </ThemedText>
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
  container: { padding: Spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  textContainer: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  stat: { fontSize: 13, fontWeight: "500", marginBottom: 2 },
  subtitle: { fontSize: 12 },
});
```

## Testing

The Widget Preview section in the My Practa tab shows:
- Whether `shouldDisplay` returns true or false with current stored data
- The rendered widget with real data
- A "Force show" toggle to preview even when `shouldDisplay` returns false
- The stored data keys and values for debugging

After creating or editing `widget.tsx`:
1. Rebuild: `npx expo export --platform web`
2. Restart the app workflow
3. Navigate to the My Practa tab and scroll to the Widget Preview section

## Workflow

1. Read the docs listed above
2. Understand what data the main Practa stores (check `index.tsx` for `storage.set()` calls)
3. Decide the `shouldDisplay` logic — when should the widget appear?
4. Create `client/my-practa/widget.tsx` with both exports
5. Update `client/my-practa/metadata.json` with the `widget` section
6. Rebuild and restart
7. Test in the Widget Preview section on the My Practa tab

## Common Mistakes

- Adding buttons or Pressables inside the widget (read-only only)
- Forgetting to handle empty/missing data (widget crashes on first load)
- Hardcoding colors instead of using `theme.*`
- Using `require()` for images (use theme colors and icons instead)
- Making `shouldDisplay` async (must be synchronous)
- Writing to storage from the widget (read-only)
