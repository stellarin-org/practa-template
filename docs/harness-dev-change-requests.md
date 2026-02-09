# Harness Developer Change Requests

Requests for the test harness developer to address in `stellarin-org/stellarin-app`. These changes would make the next Test Harness Import clean and avoid the template needing local workarounds.

---

## Active Requests

### 1. Add `warning` color token to theme

**File:** `client/constants/theme.ts`
**Priority:** Low
**Status:** Locally patched in template

The template's validation and status UI uses a `warning` color for non-critical issues (e.g., metadata warnings that aren't hard errors). Only `success` and `error` exist upstream.

**Requested change:**

```diff
  // Light theme
     success: "#4CAF50",
+    warning: "#F39C12",
     error: "#E74C3C",

  // Dark theme
     success: "#4CAF50",
+    warning: "#F39C12",
     error: "#E74C3C",
```

**Impact if not done:** The import overwrites `theme.ts` and removes the `warning` color. The template has to re-add it after every import.

---

### 2. Add `client/lib/practa-config.ts` to the harness import — or remove the import from `flow.ts`

**File:** `client/types/flow.ts` imports from `@/lib/practa-config`
**Priority:** High (breaks on import)
**Status:** Locally created stub in template

The upstream `flow.ts` imports `practaHasConfig`, `practaConfigIsRequired`, `JournalConfig`, and `PractaPickerConfig` from `@/lib/practa-config`. But that file is not included in the harness import config, so when `flow.ts` is synced into the template, it breaks immediately with a missing module error.

**Options for the harness dev:**
1. **Add `client/lib/practa-config.ts` to the harness import** (`.config/harness-import.config.json` sync items) so it arrives alongside `flow.ts`
2. **Move the config types/functions directly into `flow.ts`** so there's no external dependency
3. **Remove the import from `flow.ts`** if `practa-config` is Stellarin-app-specific and not needed in the template

**Current stub we maintain locally:**

```typescript
export interface JournalConfig {
  promptStyle?: "guided" | "free" | "structured";
  maxEntryLength?: number;
}

export interface PractaPickerConfig {
  allowMultiple?: boolean;
  categories?: string[];
}

const PRACTA_TYPES_REQUIRING_CONFIG: string[] = ["journal", "practa-picker"];

export function practaHasConfig(type: string): boolean {
  return PRACTA_TYPES_REQUIRING_CONFIG.includes(type);
}

export function practaConfigIsRequired(type: string): boolean {
  return PRACTA_TYPES_REQUIRING_CONFIG.includes(type);
}
```

**Impact if not done:** Every harness import breaks `flow.ts` until we manually recreate the stub.

---

### 3. Export `ResolvedAssets` type from `flow.ts` — or confirm it's intentionally removed

**File:** `client/types/flow.ts`
**Priority:** Medium
**Status:** Locally defined in `practa-assets.ts`

The previous version of `flow.ts` exported `ResolvedAssets = Record<string, number | { uri: string }>`. The new version removed it. The template's asset resolver (`practa-assets.ts`, auto-generated) used this type.

We now define it locally in `practa-assets.ts`, but if it was removed intentionally, a note in a changelog would be helpful. If it was accidental, please re-export it.

**Impact if not done:** Minor — we have a local workaround. But if the upstream adds it back later with a different shape, there could be a silent mismatch.

---

### 4. Confirm `onSkip` removal from `PractaProps` is intentional

**File:** `client/types/flow.ts`
**Priority:** Low (informational)
**Status:** No fix needed — template uses local types

The official `PractaProps` no longer includes `onSkip`. The template's demo practas and `my-practa` define their own local props that include `onSkip`, so nothing breaks. But the template's validator (`practa-validator.ts`) and documentation currently recommend supporting `onSkip`.

**Requested clarification:**
- Is `onSkip` deprecated? Should we stop recommending it?
- Or will it return in a future version?

If deprecated, we'll update the validator and docs to remove `onSkip` references.

---

## Resolved Requests

### Config field types in `flow.ts` (Feb 8, 2026)
**Resolved:** The upstream now includes `ConfigFieldBase`, `StringField`, `NumberField`, `BooleanField`, `SelectField`, `ConfigField`, `ConfigSchema`, and `PractaFileMetadata` in `flow.ts`. No local additions needed.

---

## How to Use This File

After each Test Harness Import, the import skill checks for breaking changes and adds new requests here when:
- A change from upstream breaks the template and requires a local workaround
- A missing file or export forces us to create stubs

When a request is resolved upstream, move it to the "Resolved Requests" section with the date.
