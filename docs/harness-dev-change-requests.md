# Harness Developer Change Requests

Requests for the test harness developer to address in `stellarin-org/stellarin-app`. These changes would make the next Test Harness Import clean and avoid the template needing local workarounds.

---

## Active Requests

(No active requests)

---

## Resolved Requests

### `onSkip` removal from `PractaProps` confirmed intentional (Feb 9, 2026)
**Resolved:** Confirmed by maintainer that `onSkip` was intentionally removed from `PractaProps`. Template validator and docs should be updated to stop recommending `onSkip`.

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
