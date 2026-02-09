/**
 * Practa Metadata Schema — Single Source of Truth
 *
 * This file defines every metadata field, its type, whether it's required,
 * human-readable labels, and validation constraints. Both the client-side
 * and server-side validators consume this schema so that adding or changing
 * a field only requires editing this one file.
 *
 * Context-dependent rules (e.g. master-template author exception) live in
 * the calling validators, not here.
 */

export type FieldType = "string" | "boolean" | "number" | "array" | "object";

export interface StringConstraints {
  pattern?: RegExp;
  patternHint?: string;
  minLength?: number;
  maxLength?: number;
}

export interface NumberConstraints {
  min?: number;
  max?: number;
}

export interface ArrayConstraints {
  itemType?: FieldType;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
  stringConstraints?: StringConstraints;
  numberConstraints?: NumberConstraints;
  arrayConstraints?: ArrayConstraints;
}

export interface NestedFieldRequirement {
  path: string[];
  label: string;
  expectedType?: string;
  description?: string;
}

export const METADATA_FIELDS: FieldDefinition[] = [
  {
    key: "id",
    label: "Practa ID",
    type: "string",
    required: true,
    description: "Unique identifier (lowercase kebab-case)",
    stringConstraints: {
      pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/,
      patternHint: "lowercase kebab-case (e.g., 'my-practa')",
      minLength: 3,
      maxLength: 50,
    },
  },
  {
    key: "name",
    label: "Display name",
    type: "string",
    required: true,
  },
  {
    key: "description",
    label: "Description",
    type: "string",
    required: true,
  },
  {
    key: "author",
    label: "Author name",
    type: "string",
    required: true,
  },
  {
    key: "version",
    label: "Version",
    type: "string",
    required: false,
    description: "Auto-managed in version.json — not required in metadata.json",
    stringConstraints: {
      pattern: /^\d+\.\d+\.\d+$/,
      patternHint: "format X.Y.Z (e.g., '1.0.0')",
    },
  },
  {
    key: "requiresAI",
    label: "Requires AI",
    type: "boolean",
    required: true,
    description: "Whether the Practa cannot function without AI",
  },
  {
    key: "estimatedDuration",
    label: "Estimated duration",
    type: "number",
    required: false,
    description: "Duration in seconds",
    numberConstraints: { min: 0 },
  },
  {
    key: "category",
    label: "Category",
    type: "string",
    required: false,
  },
  {
    key: "tags",
    label: "Tags",
    type: "array",
    required: false,
    arrayConstraints: { itemType: "string" },
  },
];

export const NESTED_FIELD_REQUIREMENTS: NestedFieldRequirement[] = [
  {
    path: ["configSchema", "fields", "aiEnabled"],
    label: "configSchema.fields.aiEnabled",
    expectedType: "boolean",
    description: "User toggle for AI features (must be a boolean config field)",
  },
];

export interface MetadataFieldError {
  field: string;
  label: string;
  message: string;
}

export interface MetadataFieldSuccess {
  field: string;
  label: string;
}

export interface SchemaValidationResult {
  errors: MetadataFieldError[];
  successes: MetadataFieldSuccess[];
  warnings: MetadataFieldError[];
}

function resolveNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const segment of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Validate a metadata object against the schema.
 *
 * @param data        The raw metadata object to validate
 * @param skipFields  Field keys to skip (e.g. ["author"] when master template allows null)
 */
export function validateMetadataFields(
  data: Record<string, unknown>,
  skipFields: string[] = []
): SchemaValidationResult {
  const errors: MetadataFieldError[] = [];
  const successes: MetadataFieldSuccess[] = [];
  const warnings: MetadataFieldError[] = [];

  for (const field of METADATA_FIELDS) {
    if (skipFields.includes(field.key)) continue;

    const value = data[field.key];

    if (field.required) {
      if (value === undefined || value === null) {
        errors.push({
          field: field.key,
          label: field.label,
          message: `Missing required field: ${field.label} (${field.key})`,
        });
        continue;
      }

      if (field.type === "string") {
        if (typeof value !== "string") {
          errors.push({ field: field.key, label: field.label, message: `${field.label} must be a string` });
          continue;
        }
        if (value.trim() === "") {
          errors.push({ field: field.key, label: field.label, message: `${field.label} cannot be empty` });
          continue;
        }
        if (field.stringConstraints) {
          const sc = field.stringConstraints;
          if (sc.minLength !== undefined && value.length < sc.minLength) {
            errors.push({ field: field.key, label: field.label, message: `${field.label} must be at least ${sc.minLength} characters` });
            continue;
          }
          if (sc.maxLength !== undefined && value.length > sc.maxLength) {
            errors.push({ field: field.key, label: field.label, message: `${field.label} must be at most ${sc.maxLength} characters` });
            continue;
          }
          if (sc.pattern && !sc.pattern.test(value)) {
            errors.push({ field: field.key, label: field.label, message: `${field.label} must be ${sc.patternHint || "in the correct format"}` });
            continue;
          }
        }
      } else if (field.type === "boolean") {
        if (typeof value !== "boolean") {
          errors.push({ field: field.key, label: field.label, message: `${field.label} must be true or false` });
          continue;
        }
      } else if (field.type === "number") {
        if (typeof value !== "number") {
          errors.push({ field: field.key, label: field.label, message: `${field.label} must be a number` });
          continue;
        }
      }

      successes.push({ field: field.key, label: field.label });
    } else {
      if (value === undefined || value === null) {
        if (field.type === "number" && field.key === "estimatedDuration") {
          warnings.push({ field: field.key, label: field.label, message: `Consider adding ${field.label} (in seconds)` });
        }
        continue;
      }

      if (field.type === "string" && typeof value !== "string") {
        errors.push({ field: field.key, label: field.label, message: `${field.label} must be a string` });
        continue;
      }
      if (field.type === "number") {
        if (typeof value !== "number") {
          errors.push({ field: field.key, label: field.label, message: `${field.label} must be a number` });
          continue;
        }
        const nc = field.numberConstraints;
        if (nc?.min !== undefined && value < nc.min) {
          errors.push({ field: field.key, label: field.label, message: `${field.label} must be at least ${nc.min}` });
          continue;
        }
        if (nc?.max !== undefined && value > nc.max) {
          errors.push({ field: field.key, label: field.label, message: `${field.label} must be at most ${nc.max}` });
          continue;
        }
      }
      if (field.type === "array") {
        if (!Array.isArray(value)) {
          errors.push({ field: field.key, label: field.label, message: `${field.label} must be an array` });
          continue;
        }
        const ac = field.arrayConstraints;
        if (ac?.itemType === "string" && !value.every((item: unknown) => typeof item === "string")) {
          errors.push({ field: field.key, label: field.label, message: `All ${field.label.toLowerCase()} must be strings` });
          continue;
        }
      }

      successes.push({ field: field.key, label: field.label });
    }
  }

  for (const nested of NESTED_FIELD_REQUIREMENTS) {
    const value = resolveNestedValue(data, nested.path);
    const pathStr = nested.path.join(".");

    if (value === undefined || value === null) {
      errors.push({
        field: pathStr,
        label: nested.label,
        message: `Missing required field: ${nested.label}`,
      });
    } else if (
      nested.expectedType &&
      typeof value === "object" &&
      value !== null &&
      (value as Record<string, unknown>).type !== nested.expectedType
    ) {
      errors.push({
        field: pathStr,
        label: nested.label,
        message: `${nested.label} must have type "${nested.expectedType}"`,
      });
    } else {
      successes.push({ field: pathStr, label: nested.label });
    }
  }

  return { errors, successes, warnings };
}
