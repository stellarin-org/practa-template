import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRACTA_DIR = path.resolve(__dirname, "..");
const METADATA_PATH = path.join(PRACTA_DIR, "metadata.json");

function loadMetadata(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"));
}

describe("my-practa dev build tests", () => {
  it("index.tsx exports a default component", () => {
    const indexPath = path.join(PRACTA_DIR, "index.tsx");
    assert.ok(fs.existsSync(indexPath), "index.tsx must exist");

    const content = fs.readFileSync(indexPath, "utf-8");
    assert.ok(
      content.includes("export default") || content.includes("export { default"),
      "index.tsx must have a default export"
    );
  });

  it("metadata id is not the template default", () => {
    const data = loadMetadata();
    assert.ok(
      data.id !== "practa-template" || process.env.MASTER_TEMPLATE_KEY,
      "Change the id from 'practa-template' to your own unique id before submitting"
    );
  });

  it("metadata author is not the template default", () => {
    const data = loadMetadata();
    assert.ok(
      data.author !== "Your Name" || process.env.MASTER_TEMPLATE_KEY,
      "Change the author from 'Your Name' to your name before submitting"
    );
  });

  it("metadata description is meaningful", () => {
    const data = loadMetadata();
    assert.ok(typeof data.description === "string", "description must be a string");
    assert.ok(
      (data.description as string).length >= 10,
      "description should be at least 10 characters"
    );
  });
});
