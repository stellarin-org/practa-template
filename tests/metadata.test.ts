import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { validateMetadataFields, METADATA_FIELDS } from "../shared/metadata-schema";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const MY_PRACTA_METADATA = path.join(PROJECT_ROOT, "client/my-practa/metadata.json");

function loadJson(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

describe("my-practa metadata.json", () => {
  it("file exists and is valid JSON", () => {
    assert.ok(fs.existsSync(MY_PRACTA_METADATA), "metadata.json must exist at client/my-practa/metadata.json");
    assert.doesNotThrow(() => loadJson(MY_PRACTA_METADATA), "metadata.json must be valid JSON");
  });

  it("passes schema validation with no errors", () => {
    const data = loadJson(MY_PRACTA_METADATA);
    const result = validateMetadataFields(data);

    if (result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => `  - ${e.message}`).join("\n");
      assert.fail(`Metadata validation failed:\n${errorMessages}`);
    }
  });

  it("has all required top-level fields", () => {
    const data = loadJson(MY_PRACTA_METADATA);
    const requiredFields = METADATA_FIELDS.filter((f) => f.required);

    for (const field of requiredFields) {
      assert.ok(
        data[field.key] !== undefined && data[field.key] !== null,
        `Missing required field: ${field.key} (${field.label})`
      );
    }
  });

  it("has configSchema.fields.aiEnabled", () => {
    const data = loadJson(MY_PRACTA_METADATA) as {
      configSchema?: { fields?: Record<string, { type?: string }> };
    };

    assert.ok(data.configSchema, "configSchema must exist");
    assert.ok(data.configSchema?.fields, "configSchema.fields must exist");
    assert.ok(data.configSchema?.fields?.aiEnabled, "configSchema.fields.aiEnabled must exist");
    assert.equal(
      data.configSchema?.fields?.aiEnabled?.type,
      "boolean",
      "aiEnabled must be a boolean config field"
    );
  });

  it("id is valid kebab-case", () => {
    const data = loadJson(MY_PRACTA_METADATA);
    assert.ok(typeof data.id === "string", "id must be a string");
    assert.match(data.id as string, /^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be lowercase kebab-case");
  });

  it("version is valid semver format", () => {
    const data = loadJson(MY_PRACTA_METADATA);
    assert.ok(typeof data.version === "string", "version must be a string");
    assert.match(data.version as string, /^\d+\.\d+\.\d+$/, "version must be X.Y.Z format");
  });

  it("requiresAI is a boolean", () => {
    const data = loadJson(MY_PRACTA_METADATA);
    assert.equal(typeof data.requiresAI, "boolean", "requiresAI must be a boolean");
  });

  it("offlineCapable is a boolean", () => {
    const data = loadJson(MY_PRACTA_METADATA);
    assert.equal(typeof data.offlineCapable, "boolean", "offlineCapable must be a boolean");
  });

  it("assets reference files that exist on disk", () => {
    const data = loadJson(MY_PRACTA_METADATA);
    const assets = data.assets as Record<string, string> | undefined;
    if (!assets) return;

    const assetsDir = path.join(PROJECT_ROOT, "client/my-practa/assets");

    for (const [key, filename] of Object.entries(assets)) {
      const normalized = filename.replace(/^\.?\/?(assets\/)?/, "");
      const fullPath = path.join(assetsDir, normalized);
      assert.ok(
        fs.existsSync(fullPath),
        `Asset "${key}" references "${filename}" but file not found at ${fullPath}`
      );
    }
  });
});
