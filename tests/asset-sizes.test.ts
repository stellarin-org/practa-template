import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(PROJECT_ROOT, "client/my-practa/assets");
const PRACTA_DIR = path.join(PROJECT_ROOT, "client/my-practa");

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE_BYTES / 1024 / 1024;
const MAX_TOTAL_SIZE_MB = MAX_TOTAL_SIZE_BYTES / 1024 / 1024;

function getFilesRecursive(dir: string, exclude: string[] = []): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(PRACTA_DIR, fullPath);

    if (exclude.some((ex) => relativePath.startsWith(ex))) continue;

    if (entry.isDirectory()) {
      results.push(...getFilesRecursive(fullPath, exclude));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

describe("asset file sizes", () => {
  it("no single asset exceeds 5MB", () => {
    if (!fs.existsSync(ASSETS_DIR)) return;

    const files = getFilesRecursive(ASSETS_DIR);
    const oversized: string[] = [];

    for (const file of files) {
      const stat = fs.statSync(file);
      const sizeMB = stat.size / 1024 / 1024;
      if (stat.size > MAX_FILE_SIZE_BYTES) {
        oversized.push(`${path.relative(ASSETS_DIR, file)} (${sizeMB.toFixed(1)}MB)`);
      }
    }

    if (oversized.length > 0) {
      assert.fail(
        `These assets exceed the ${MAX_FILE_SIZE_MB}MB per-file limit:\n  ${oversized.join("\n  ")}`
      );
    }
  });

  it("total practa package does not exceed 25MB", () => {
    const excludeDirs = ["tests", "node_modules", ".git", "dist", "static-build"];
    const allFiles = getFilesRecursive(PRACTA_DIR, excludeDirs);
    let totalSize = 0;

    for (const file of allFiles) {
      totalSize += fs.statSync(file).size;
    }

    const totalMB = totalSize / 1024 / 1024;
    assert.ok(
      totalSize <= MAX_TOTAL_SIZE_BYTES,
      `Total practa size is ${totalMB.toFixed(1)}MB — exceeds the ${MAX_TOTAL_SIZE_MB}MB submission limit`
    );
  });

  it("asset filenames have no spaces", () => {
    if (!fs.existsSync(ASSETS_DIR)) return;

    const files = getFilesRecursive(ASSETS_DIR);
    const withSpaces: string[] = [];

    for (const file of files) {
      const name = path.basename(file);
      if (name.includes(" ")) {
        withSpaces.push(name);
      }
    }

    if (withSpaces.length > 0) {
      assert.fail(
        `Asset filenames must not contain spaces (use hyphens or underscores):\n  ${withSpaces.join("\n  ")}`
      );
    }
  });
});
