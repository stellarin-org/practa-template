import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PRACTA_DIR = path.join(PROJECT_ROOT, "client/my-practa");
const WIDGET_PATH = path.join(PRACTA_DIR, "widget.tsx");
const METADATA_PATH = path.join(PRACTA_DIR, "metadata.json");

function loadMetadata(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"));
}

describe("widget consistency", () => {
  it("widget.tsx exists when widget is enabled in metadata", () => {
    const metadata = loadMetadata();
    const widget = metadata.widget as Record<string, unknown> | undefined;

    if (!widget || widget.enabled !== true) {
      return;
    }

    assert.ok(
      fs.existsSync(WIDGET_PATH),
      "metadata.json has widget.enabled: true but widget.tsx does not exist"
    );
  });

  it("widget.tsx exports shouldDisplay function", () => {
    if (!fs.existsSync(WIDGET_PATH)) {
      return;
    }

    const source = fs.readFileSync(WIDGET_PATH, "utf-8");
    assert.ok(
      source.includes("export function shouldDisplay") ||
        source.includes("export const shouldDisplay"),
      "widget.tsx must export a shouldDisplay function"
    );
  });

  it("widget.tsx has a default export", () => {
    if (!fs.existsSync(WIDGET_PATH)) {
      return;
    }

    const source = fs.readFileSync(WIDGET_PATH, "utf-8");
    assert.ok(
      source.includes("export default") || source.includes("export { default"),
      "widget.tsx must have a default export (your widget component)"
    );
  });

  it("widget metadata has displayName when enabled", () => {
    const metadata = loadMetadata();
    const widget = metadata.widget as Record<string, unknown> | undefined;

    if (!widget || widget.enabled !== true) {
      return;
    }

    assert.ok(
      typeof widget.displayName === "string" && (widget.displayName as string).trim().length > 0,
      "Widget is enabled but missing a displayName in metadata.json"
    );
  });

  it("widget.tsx does not use require() for assets", () => {
    if (!fs.existsSync(WIDGET_PATH)) {
      return;
    }

    const source = fs.readFileSync(WIDGET_PATH, "utf-8");
    const requirePattern = /require\s*\(\s*['"]\..*assets/;
    assert.ok(
      !requirePattern.test(source),
      "Widget should not use require() for assets"
    );
  });
});
