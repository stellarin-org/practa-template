# Upstream Template Changes Needed

Active requests for the `practa-template` repo.

---

## 1. `DEV_USER_ID` Shared Constant

We've created `client/constants/dev.ts` exporting `DEV_USER_ID = "dev-user"`. Both `HarnessPreviewScreen` and `MyPractaScreen` now import from this constant instead of hardcoding `"dev-user"`. This file needs to be added to the upstream `practa-template` repo and included in the harness import config if it should be synced.

## 2. `HarnessPreviewScreen` — Pass Real Storage to Test Harness

**Problem:** The harness preview used the no-op storage default. Practas that called `context.storage.get/set` silently did nothing — data wasn't persisted, and widget preview always showed empty.

**Fix needed upstream in `client/screens/HarnessPreviewScreen.tsx`:**
- Import `useMemo` from React
- Import `PractaStorageManager` from `@/lib/practa-storage`
- Import `DEV_USER_ID` from `@/constants/dev`
- Import `practaMetadataJson` from `@/my-practa/metadata.json`
- Create storage instance: `const slug = practaId === "my-practa" ? practaMetadataJson.id : practaId;` and `const storage = useMemo(() => new PractaStorageManager(DEV_USER_ID, slug), [slug]);`
- Pass `storage={storage}` to `<PractaTestHarness>`

## 3. `MyPractaScreen` — Reset Practa Storage Button

**Fix needed upstream in `client/screens/MyPractaScreen.tsx`:**
- Import `DEV_USER_ID` from `@/constants/dev`
- Replace hardcoded `"dev-user"` in the widget data loading prefix with `DEV_USER_ID`
- Add a "Reset Practa Storage" button below the "Preview Practa" button that:
  - Shows a confirmation dialog before clearing
  - Clears all AsyncStorage keys matching `practa:${DEV_USER_ID}:<practa-id>:*`
  - Resets widget data state immediately after clearing
  - Provides haptic feedback

## 4. `shouldDisplay` Fallback Behavior

Still awaiting confirmation. Our spec says: if `shouldDisplay` is missing from `widget.tsx`, treat as always-display (`return true`).

## 5. Widget Error Boundary Contract

Still awaiting confirmation. Our spec says: if a widget throws during render, the host catches the error, hides the widget, and logs a warning — does not crash the feed.
