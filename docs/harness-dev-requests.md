# Harness Developer — Post-Import Status & Requests

After the latest harness import, here's where things stand.

---

## What Landed Successfully

- **Widget types in `flow.ts`** — `WidgetProps`, `ShouldDisplayFn`, `WidgetModule`, `WidgetMetadata` all came through cleanly. We've deleted our local `client/types/widget.ts` and updated `widget.tsx` to import from `@/types/flow`. Everything compiles.
- **`onSkip` prop on `PractaProps`** — Received, no issues.
- **`practaHasMeaningfulConfig` helper** — Received in `practa-config.ts`, no issues.
- **Theme simplification** — `toggleTheme` removed from `useTheme`, `ThemeContext` dependency dropped. We've updated our screens accordingly.
- **New color tokens** — `secondary`, `accent`, `jade`, `jadeMuted`, `amber`, `amberMuted`, `coral`, `coralMuted` all received in both light and dark themes.
- **`boxShadow` migration** — `PractaChromeHeader` updated from deprecated `shadow*` props. No issues.

---

## Resolved Items

### 1. `_widgets.tsx` Build Script — RESOLVED

The build script now includes `generateWidgetsFile(practas)` alongside `generateComponentsFile`. It filters for `widget.enabled === true` and generates `client/practa/community/_widgets.tsx` with static imports matching the `_components.tsx` pattern. No template-side changes needed.

### 2. `slug` vs `id` — RESOLVED

**`slug` is the only identifier on the host side.** The registry, loader, component registry, widget registry, and `PractaStorageManager` all use `slug`. Our template uses `id` — these are the same value. The submission pipeline maps `id` to `slug` when generating registry entries. No schema change needed on the template side.

### 3. `shouldDisplay` Fallback Behavior

Still awaiting confirmation. Our spec says: if `shouldDisplay` is missing from `widget.tsx`, treat as always-display (`return true`).

### 4. Widget Error Boundary Contract

Still awaiting confirmation. Our spec says: if a widget throws during render, the host catches the error, hides the widget, and logs a warning — does not crash the feed.

---

## Upstream Changes Needed

### 5. `DEV_USER_ID` Shared Constant

We've created `client/constants/dev.ts` exporting `DEV_USER_ID = "dev-user"`. Both `HarnessPreviewScreen` and `MyPractaScreen` now import from this constant instead of hardcoding `"dev-user"`. This file needs to be added to the upstream `practa-template` repo and included in the harness import config if it should be synced.

### 6. `HarnessPreviewScreen` — Pass Real Storage to Test Harness

**Problem:** The harness preview used the no-op storage default. Practas that called `context.storage.get/set` silently did nothing — data wasn't persisted, and widget preview always showed empty.

**Fix needed upstream in `client/screens/HarnessPreviewScreen.tsx`:**
- Import `useMemo` from React
- Import `PractaStorageManager` from `@/lib/practa-storage`
- Import `DEV_USER_ID` from `@/constants/dev`
- Import `practaMetadataJson` from `@/my-practa/metadata.json`
- Create storage instance: `const slug = practaId === "my-practa" ? practaMetadataJson.id : practaId;` and `const storage = useMemo(() => new PractaStorageManager(DEV_USER_ID, slug), [slug]);`
- Pass `storage={storage}` to `<PractaTestHarness>`

### 7. `MyPractaScreen` — Reset Practa Storage Button

**Fix needed upstream in `client/screens/MyPractaScreen.tsx`:**
- Import `DEV_USER_ID` from `@/constants/dev`
- Replace hardcoded `"dev-user"` in the widget data loading prefix with `DEV_USER_ID`
- Add a "Reset Practa Storage" button below the "Preview Practa" button that:
  - Shows a confirmation dialog before clearing
  - Clears all AsyncStorage keys matching `practa:${DEV_USER_ID}:<practa-id>:*`
  - Resets widget data state immediately after clearing
  - Provides haptic feedback

---

## No Action Needed (FYI)

- **Theme toggle removal** — Accepted as intentional and removed all `toggleTheme` references from template screens.
- **`client/types/widget.ts` deleted** — Fully replaced by `flow.ts` types. No backward compatibility shim needed.
- **Handoff doc updated** — `docs/widget-system-upstream-handoff.md` reflects the current state (types in `flow.ts`, aligned contract).
- **Widget preview in template** — Fully functional in MyPractaScreen with real storage data, `shouldDisplay` evaluation, and force-show toggle.
