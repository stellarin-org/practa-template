# Upstream Template Changes Needed

Active requests for the `practa-template` repo. All three are template-side only — no host changes required.

---

## 1. `DEV_USER_ID` Shared Constant

Add `client/constants/dev.ts` exporting `DEV_USER_ID = "dev-user"`. Both `HarnessPreviewScreen` and `MyPractaScreen` should import from this constant instead of hardcoding `"dev-user"`. Include in the harness import config if it should be synced from `stellarin-app`.

## 2. `HarnessPreviewScreen` — Pass Real Storage to Test Harness

**Problem:** The harness preview uses the no-op storage default. Practas that call `context.storage.get/set` silently do nothing — data isn't persisted, and widget preview always shows empty.

**Fix in `client/screens/HarnessPreviewScreen.tsx`:**
- Import `useMemo` from React
- Import `PractaStorageManager` from `@/lib/practa-storage`
- Import `DEV_USER_ID` from `@/constants/dev`
- Import `practaMetadataJson` from `@/my-practa/metadata.json`
- Create storage instance: `const slug = practaId === "my-practa" ? practaMetadataJson.id : practaId;` and `const storage = useMemo(() => new PractaStorageManager(DEV_USER_ID, slug), [slug]);`
- Pass `storage={storage}` to `<PractaTestHarness>` (the harness already accepts an optional `storage` prop)

## 3. `MyPractaScreen` — Reset Practa Storage Button

**Fix in `client/screens/MyPractaScreen.tsx`:**
- Import `DEV_USER_ID` from `@/constants/dev`
- Replace hardcoded `"dev-user"` with `DEV_USER_ID`
- Add a "Reset Practa Storage" button that calls `new PractaStorageManager(DEV_USER_ID, slug).clear()` (the `clear()` method already wipes all matching keys and resets the quota counter)
- Show confirmation dialog before clearing, reset widget data state after, provide haptic feedback
