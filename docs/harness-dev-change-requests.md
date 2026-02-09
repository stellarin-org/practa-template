# Harness Developer Change Requests

Requests for the test harness developer to address in `stellarin-org/stellarin-app`. These changes would make the next Test Harness Import clean and avoid the template needing local workarounds.

---

## Active Requests

### 1. Confirm `onSkip` removal from `PractaProps` is intentional

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

### `practa-config.ts` missing from import config (Feb 9, 2026)
**Resolved:** Added `client/lib/practa-config.ts` to `.config/harness-import.config.json`. The upstream file now imports successfully with full Zod schemas, config registry, validation, and editor support. Local stub is no longer needed.

### `ResolvedAssets` type removed from `flow.ts` (Feb 9, 2026)
**Resolved:** The upstream `flow.ts` now re-exports `ResolvedAssets = Record<string, number | { uri: string }>`. No local workaround needed.

### `warning` color token in theme (Feb 9, 2026)
**Resolved:** The upstream `theme.ts` now includes `warning: "#F39C12"` in both light and dark themes.

### Config field types in `flow.ts` (Feb 8, 2026)
**Resolved:** The upstream now includes `ConfigFieldBase`, `StringField`, `NumberField`, `BooleanField`, `SelectField`, `ConfigField`, `ConfigSchema`, and `PractaFileMetadata` in `flow.ts`. No local additions needed.

---

## How to Use This File

After each Test Harness Import, the import skill checks for breaking changes and adds new requests here when:
- A change from upstream breaks the template and requires a local workaround
- A missing file or export forces us to create stubs

When a request is resolved upstream, move it to the "Resolved Requests" section with the date.
