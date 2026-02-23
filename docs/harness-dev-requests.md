# Harness Developer — Post-Import Status & Requests

After the latest harness import, here's where things stand and what we still need from you.

---

## What Landed Successfully

- **Widget types in `flow.ts`** — `WidgetProps`, `ShouldDisplayFn`, `WidgetModule`, `WidgetMetadata` all came through cleanly. We've deleted our local `client/types/widget.ts` and updated `widget.tsx` to import from `@/types/flow`. Everything compiles.
- **`onSkip` prop on `PractaProps`** — Received, no issues.
- **`practaHasMeaningfulConfig` helper** — Received in `practa-config.ts`, no issues.
- **Theme simplification** — `toggleTheme` removed from `useTheme`, `ThemeContext` dependency dropped. We've updated our screens accordingly.
- **New color tokens** — `secondary`, `accent`, `jade`, `jadeMuted`, `amber`, `amberMuted`, `coral`, `coralMuted` all received in both light and dark themes.
- **`boxShadow` migration** — `PractaChromeHeader` updated from deprecated `shadow*` props. No issues.

---

## Open Items — Action Needed

### 1. `_widgets.tsx` Build Script (Blocker)

Your host-side integration doc notes that `scripts/fetch-community-practa.js` generates `_components.tsx` but **does not yet generate `_widgets.tsx`**. Until this is added, no community widgets will render in Stellarin. This is the single biggest gap.

**What we need:** Update the build script to also generate `_widgets.tsx` with the same pattern as `_components.tsx`, importing each Practa's `widget.tsx` (when `metadata.widget.enabled === true`).

### 2. `slug` vs `id` in Metadata

Your host-side doc references `slug` as the metadata identifier (e.g., `metadata.slug`). Our template and validation use `id` (e.g., `metadata.id`). The submission system also keys on `id`.

**What we need:** Confirm whether these are the same field with different names, or whether both should exist. If `slug` is the canonical host-side key, we'll add it to our schema.

### 3. `shouldDisplay` Fallback Behavior

Our spec says: if `shouldDisplay` is missing from `widget.tsx`, treat it as always-display (`return true`). Your host-side doc doesn't specify this.

**What we need:** Confirm this fallback is correct, or tell us the intended behavior so we can align documentation on both sides.

### 4. Widget Error Boundary Contract

Our spec says: if a widget throws during render, the host should catch the error, hide that widget, and log a warning — not crash the feed. Your `PractaWidgetCard.tsx` likely handles this already, but we haven't seen the error boundary implementation.

**What we need:** Confirm this is the behavior, or share the relevant error boundary code so we can document the exact contract for Practa developers.

---

## No Action Needed (FYI)

- **Theme toggle removal** — We've accepted this as intentional and removed all `toggleTheme` references from template screens.
- **`client/types/widget.ts` deleted** — Fully replaced by `flow.ts` types. No backward compatibility shim needed.
- **Handoff doc updated** — `docs/widget-system-upstream-handoff.md` has been updated to reflect the current state (types in `flow.ts`, aligned contract).
- **Widget preview in template** — Fully functional in MyPractaScreen with real storage data, `shouldDisplay` evaluation, and force-show toggle. Developers can test their widgets before submission.
