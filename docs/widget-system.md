# Practa Widget System — Feature Spec

## Overview

The Widget System allows each Practa to surface a glanceable, read-only widget inside the main Stellarin app. Widgets act like iOS or Android home-screen widgets — full-width cards that display contextual information from the Practa's stored data. They appear in specific circumstances determined by built-in conditional logic, or can be set to always display.

## Goals

1. **Contextual surfacing** — Show relevant Practa information at the right time (e.g., "You have a meditation session scheduled for today").
2. **Self-contained** — Each widget bundles its own visual design and display logic; the host app doesn't need to understand the Practa's internal data model.
3. **Data-driven** — Widgets read from the Practa's existing storage (via `PractaStorage`) so they reflect real user data.
4. **Testable in-template** — Developers can preview their widget inside the Practa Starter Template using real stored data before submission.
5. **Optional** — Not every Practa needs a widget. The system is opt-in via metadata declaration.

## Architecture

### File Structure

```
client/my-practa/
  index.tsx           # Main Practa component (unchanged)
  widget.tsx          # NEW — Widget component + display logic
  metadata.json       # Updated — declares widget support
  assets/             # Shared assets (unchanged)
```

### widget.tsx Contract

Each widget file exports two things:

#### 1. `shouldDisplay` function

A pure function that receives the Practa's stored data and returns whether the widget should be visible right now.

**Signature:**
```
shouldDisplay(data: Record<string, any>) => boolean
```

**Behavior:**
- Called by the host app (Stellarin) periodically or on app foreground to decide whether to render the widget.
- Receives all key-value pairs from the Practa's `PractaStorage` as a flat object.
- Returns `true` to show the widget, `false` to hide it.
- Must be synchronous and side-effect-free.
- For "always visible" widgets, simply return `true`.

**Examples:**
- Always display: `return true`
- Date-based: Check if any stored event date matches today
- Streak-based: Show if user has an active streak
- Threshold-based: Show if a counter exceeds a value

#### 2. Default export — Widget component

A React component that renders the widget's visual content.

**Props (`WidgetProps`):**
| Prop | Type | Description |
|------|------|-------------|
| `data` | `Record<string, any>` | All key-value pairs from PractaStorage |
| `theme` | Theme object | Current app theme (light/dark colors) |
| `isDark` | `boolean` | Whether dark mode is active |
| `practaName` | `string` | Display name of the Practa (from metadata) |

**Constraints:**
- Read-only — widgets cannot write to storage.
- No internal navigation — the widget component itself has no navigation logic. Tapping the widget to open the associated Practa is handled by the host app (see Tap-to-Open below).
- Self-contained layout — the widget provides its own internal layout within the full-width card frame provided by the host.
- No `onComplete`, no `context.flowId` — widgets are outside the flow execution model.

### Tap-to-Open Behavior

The entire widget card is tappable. When a user taps the widget, the host app navigates to the associated Practa. This is implemented by the host — it wraps the rendered widget component in a `Pressable` and uses the Practa's `id` from metadata to navigate. The widget component itself is not aware of this; it has no `onPress` or navigation props. This keeps the widget purely presentational while still allowing users to jump straight into the relevant Practa from the widget.

### Metadata Declaration

Practas declare widget support in `metadata.json`:

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
| `displayName` | `string` | Yes | Short label for the widget (shown in widget management UI) |
| `description` | `string` | No | Brief description of what the widget shows and when |

If `widget` is absent or `enabled` is `false`, the Practa has no widget. The host app skips it entirely.

## Data Flow

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
└─────────────────────────────────────────────────┘
```

### Storage Access

- Stellarin reads the Practa's stored data using the same `PractaStorage` mechanism (keyed by userId + practaSlug).
- The data is passed as a plain object to both `shouldDisplay` and the widget component.
- The widget never writes data — it only reads what the main Practa has stored.

## Template Integration — Widget Preview

### MyPractaScreen Changes

The template's MyPractaScreen gains a "Widget Preview" section:

1. **Detect widget** — Check if `client/my-practa/widget.tsx` exists (via metadata `widget.enabled`).
2. **Load stored data** — Read the Practa's `PractaStorage` data for the current user/slug.
3. **Evaluate display logic** — Call `shouldDisplay(data)` and show the result (visible or hidden).
4. **Render preview** — If `shouldDisplay` returns true, render the widget component inside a preview card with a "Widget Preview" header.
5. **Toggle override** — Provide a toggle to force-show the widget even when `shouldDisplay` returns false, for testing purposes.

### Preview Layout

```
┌──────────────────────────────────────┐
│  My Practa (existing content)        │
│  ...                                 │
├──────────────────────────────────────┤
│  Widget Preview                      │
│  ┌──────────────────────────────────┐│
│  │ shouldDisplay: ✓ visible         ││
│  ├──────────────────────────────────┤│
│  │                                  ││
│  │  [Rendered Widget Component]     ││
│  │                                  ││
│  └──────────────────────────────────┘│
│  [ ] Force show (override)          │
└──────────────────────────────────────┘
```

## Type Definitions

New types added to `client/types/flow.ts`:

### WidgetProps
```
interface WidgetProps {
  data: Record<string, any>;
  theme: ThemeTokens;
  isDark: boolean;
  practaName: string;
}
```

### shouldDisplay
```
type ShouldDisplayFn = (data: Record<string, any>) => boolean;
```

### Widget module shape
```
interface WidgetModule {
  default: React.ComponentType<WidgetProps>;
  shouldDisplay: ShouldDisplayFn;
}
```

## Submission

- `widget.tsx` is included in the submission zip alongside `index.tsx`, `metadata.json`, and assets.
- The existing submission glob (`**/*` from `client/my-practa/`) already captures all files, so no archive changes are needed — `widget.tsx` is automatically included.
- Metadata validation should check: if `widget.enabled` is `true`, a `widget.tsx` file must exist.

## Stellarin Host Integration (Future)

This section describes how Stellarin would consume widgets. This is not implemented in the template — it's the contract the template builds toward.

1. **Discovery** — On app launch, scan installed Practas for `widget.enabled: true` in their metadata.
2. **Evaluation** — For each widget-enabled Practa, load its storage data and call `shouldDisplay(data)`.
3. **Rendering** — Render visible widgets in the home feed or dashboard as full-width tappable cards.
4. **Tap-to-open** — Wrap each widget card in a `Pressable`. On tap, navigate to the associated Practa using the `id` from the Practa's metadata.
5. **Refresh** — Re-evaluate `shouldDisplay` on app foreground, after Practa completion, and on a configurable interval.
6. **Widget management** — Users can hide/show widgets from a settings screen using the `displayName` from metadata.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No stored data yet | `shouldDisplay` receives `{}` — widget decides whether to show with empty data |
| Widget throws error | Host catches error, hides widget, logs warning |
| `shouldDisplay` is missing | Treat as always-display (`return true`) |
| `widget.tsx` missing but `widget.enabled` is true | Validation error at submission time |
| Widget returns null | Host renders empty card frame, no crash |

## Non-Goals (Out of Scope)

- **Internal interactivity** — Widgets are visually read-only (no buttons, inputs, or forms inside the widget). The only interaction is the host-level tap-to-open, which launches the associated Practa.
- **Multiple widgets per Practa** — One widget per Practa. Multiple could be explored later.
- **Widget-to-widget communication** — Widgets are isolated; they only see their own Practa's data.
- **Push/background refresh** — Display logic is evaluated on demand, not via background tasks.
- **Widget sizing** — All widgets are full-width. Variable sizing (half-width, tall/short) is a future consideration.
