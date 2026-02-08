# Upstream Changes Needed for Stellarin App

**Date:** February 8, 2026
**Source:** Practa Template (local changes to harness-managed files)
**Target repo:** `stellarin-org/stellarin-app`

These changes were made locally in the Practa Template to files that are managed by the Test Harness Import system. They need to be applied upstream in the main Stellarin app so they persist across future syncs.

---

## 1. `client/constants/theme.ts` — Add `warning` color

Add a `warning` color token to both light and dark themes, consistent with the existing `success` and `error` colors.

### Light theme

```diff
     success: "#4CAF50",
+    warning: "#F39C12",
     error: "#E74C3C",
```

### Dark theme

```diff
     success: "#4CAF50",
+    warning: "#F39C12",
     error: "#E74C3C",
```

**Why:** The template's validation and status UI needs a warning state (e.g., metadata warnings that aren't hard errors). Currently only `success` and `error` exist.

---

## 2. `client/types/flow.ts` — Add config field types and `PractaFileMetadata` interface

Add typed interfaces for Practa config schema fields, and a `PractaFileMetadata` interface used by the template's metadata editor and validation screens.

### Add after the `PractaMetadata` interface:

```typescript
interface ConfigFieldBase {
  type: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface StringField extends ConfigFieldBase {
  type: "string";
  placeholder?: string;
  default?: string;
  minLength?: number;
  maxLength?: number;
}

export interface NumberField extends ConfigFieldBase {
  type: "number";
  default?: number;
  min?: number;
  max?: number;
}

export interface BooleanField extends ConfigFieldBase {
  type: "boolean";
  default?: boolean;
}

export interface SelectField extends ConfigFieldBase {
  type: "select";
  options: { value: string; label: string }[];
}

export type ConfigField = StringField | NumberField | BooleanField | SelectField;

export interface ConfigSchema {
  fields: Record<string, ConfigField>;
  requiredConfig?: boolean;
}

export interface PractaFileMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  estimatedDuration?: number;
  category?: string;
  tags?: string[];
  assets?: Record<string, string>;
  dependencies?: string[];
  requiresAI?: boolean;
  configSchema?: ConfigSchema;
  [key: string]: unknown;
}
```

**Why:** The template needs typed config schema fields to power the metadata editor UI and validation. `PractaFileMetadata` is shared across multiple screens (DevScreen, metadata editor, submission) and should live in the contract types file rather than being redefined in each screen.

**Note on optionality:** `requiresAI` and `configSchema` are kept optional in the TypeScript interface for backward compatibility — not every Practa will have these set initially. The template's validation layer enforces them as required at submission time.

---

## Summary of affected files

| File | Change | Lines added |
|------|--------|-------------|
| `client/constants/theme.ts` | Add `warning: "#F39C12"` to light + dark | +2 |
| `client/types/flow.ts` | Add config field types + `PractaFileMetadata` | +55 |
