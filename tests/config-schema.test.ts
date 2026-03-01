import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const METADATA_PATH = path.join(PROJECT_ROOT, "client/my-practa/metadata.json");

const VALID_FIELD_TYPES = ["string", "number", "boolean", "select"];

interface ConfigField {
  type?: string;
  label?: string;
  default?: unknown;
  options?: Array<{ value?: string; label?: string }>;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

function loadMetadata(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"));
}

function getConfigFields(): Record<string, ConfigField> {
  const metadata = loadMetadata();
  const schema = metadata.configSchema as { fields?: Record<string, ConfigField> } | undefined;
  return schema?.fields || {};
}

describe("config schema validation", () => {
  it("every config field has a valid type", () => {
    const fields = getConfigFields();

    for (const [key, field] of Object.entries(fields)) {
      assert.ok(
        typeof field.type === "string" && VALID_FIELD_TYPES.includes(field.type),
        `Config field "${key}" has invalid type "${field.type}" — must be one of: ${VALID_FIELD_TYPES.join(", ")}`
      );
    }
  });

  it("every config field has a label", () => {
    const fields = getConfigFields();

    for (const [key, field] of Object.entries(fields)) {
      assert.ok(
        typeof field.label === "string" && field.label.trim().length > 0,
        `Config field "${key}" is missing a label — the settings UI needs this to display the field`
      );
    }
  });

  it("every config field has a default value", () => {
    const fields = getConfigFields();

    for (const [key, field] of Object.entries(fields)) {
      assert.ok(
        field.default !== undefined,
        `Config field "${key}" is missing a default value`
      );
    }
  });

  it("select fields have valid options", () => {
    const fields = getConfigFields();

    for (const [key, field] of Object.entries(fields)) {
      if (field.type !== "select") continue;

      assert.ok(
        Array.isArray(field.options) && field.options.length > 0,
        `Select field "${key}" must have a non-empty options array`
      );

      for (const opt of field.options!) {
        assert.ok(
          typeof opt.value === "string" && opt.value.length > 0,
          `Select field "${key}" has an option missing a value`
        );
        assert.ok(
          typeof opt.label === "string" && opt.label.length > 0,
          `Select field "${key}" has an option missing a label`
        );
      }
    }
  });

  it("select field default matches one of its options", () => {
    const fields = getConfigFields();

    for (const [key, field] of Object.entries(fields)) {
      if (field.type !== "select") continue;
      if (!Array.isArray(field.options) || field.default === undefined) continue;

      const validValues = field.options.map((o) => o.value);
      assert.ok(
        validValues.includes(field.default as string),
        `Select field "${key}" default "${field.default}" does not match any option value: ${validValues.join(", ")}`
      );
    }
  });

  it("number fields have valid min/max constraints", () => {
    const fields = getConfigFields();

    for (const [key, field] of Object.entries(fields)) {
      if (field.type !== "number") continue;

      if (field.min !== undefined && field.max !== undefined) {
        assert.ok(
          field.min < field.max,
          `Number field "${key}" has min (${field.min}) >= max (${field.max})`
        );
      }

      if (field.default !== undefined && typeof field.default === "number") {
        if (field.min !== undefined) {
          assert.ok(
            field.default >= field.min,
            `Number field "${key}" default (${field.default}) is below min (${field.min})`
          );
        }
        if (field.max !== undefined) {
          assert.ok(
            field.default <= field.max,
            `Number field "${key}" default (${field.default}) is above max (${field.max})`
          );
        }
      }
    }
  });
});
