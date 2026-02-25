# Harness Developer Requests

Active requests for changes to `stellarin-org/stellarin-app` so future harness imports are cleaner. Review before sharing with the dev team.

---

## Active Requests

### 1. DEV_USER_ID constant in practa-template

**File:** `client/constants/dev.ts`
**Request:** Ensure `DEV_USER_ID` is exported as a constant from this file. It is used by the harness preview screen to pass a consistent user ID to `PractaStorageManager` during development.
**Status:** Implemented locally — upstream needs to adopt.

---

### 2. Real storage passed to PractaTestHarness in HarnessPreviewScreen

**File:** `client/screens/HarnessPreviewScreen.tsx`
**Request:** Pass a real `PractaStorageManager` instance (keyed by `DEV_USER_ID` and the Practa id) into `PractaTestHarness` as the `storage` prop, so developers can test persistent state during harness preview.
**Status:** Implemented locally — upstream needs to adopt.

---

### 3. Reset Practa Storage button in MyPractaScreen

**File:** `client/screens/MyPractaScreen.tsx`
**Request:** Add a "Reset Practa Storage" button that calls `PractaStorageManager.clear()` for the current Practa. Allows developers to easily reset stored state during development without clearing the entire device storage.
**Status:** Implemented locally — upstream needs to adopt.

---

## Resolved Requests

_(None yet)_
