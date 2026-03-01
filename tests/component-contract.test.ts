import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PRACTA_DIR = path.join(PROJECT_ROOT, "client/my-practa");
const INDEX_PATH = path.join(PRACTA_DIR, "index.tsx");
const METADATA_PATH = path.join(PRACTA_DIR, "metadata.json");

function readSource(): string {
  return fs.readFileSync(INDEX_PATH, "utf-8");
}

function loadMetadata(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"));
}

describe("practa component contract", () => {
  it("index.tsx exists", () => {
    assert.ok(fs.existsSync(INDEX_PATH), "index.tsx must exist at client/my-practa/index.tsx");
  });

  it("index.tsx has a default export", () => {
    const source = readSource();
    assert.ok(
      source.includes("export default") || source.includes("export { default"),
      "index.tsx must have a default export (your Practa component)"
    );
  });

  it("component calls onComplete", () => {
    const source = readSource();
    assert.ok(
      source.includes("onComplete"),
      "Practa must reference onComplete — every Practa must signal completion to the host app"
    );
  });

  it("does not use require() for assets", () => {
    const source = readSource();
    const requirePattern = /require\s*\(\s*['"]\..*assets/;
    assert.ok(
      !requirePattern.test(source),
      "Do not use require() for assets — declare them in metadata.json and access via context.assets"
    );
  });

  it("does not use static import for assets", () => {
    const source = readSource();
    const importPattern = /import\s+.*from\s+['"]\..*assets\//;
    assert.ok(
      !importPattern.test(source),
      "Do not use static import for assets — declare them in metadata.json and access via context.assets"
    );
  });

  it("dependencies in metadata match imports in source", () => {
    const source = readSource();
    const metadata = loadMetadata();
    const declaredDeps = (metadata.dependencies as string[]) || [];

    const localPrefixes = ["./", "../", "@/", "@shared/"];
    const builtins = new Set([
      "react", "react-native", "react-dom",
      "node:test", "node:assert", "node:path", "node:fs", "node:url",
    ]);
    const rnFamilyPrefixes = ["react-native/", "@react-native/"];

    const typeOnlyImportRegex = /import\s+type\s+/;
    const importRegex = /^(?!.*import\s+type\s+)(?:import\s+(?:[\s\S]*?)\s+from\s+|import\s+)['"]([^'"]+)['"]/gm;
    let match;
    const missingDeps: string[] = [];

    while ((match = importRegex.exec(source)) !== null) {
      const fullLine = source.substring(
        source.lastIndexOf("\n", match.index) + 1,
        source.indexOf("\n", match.index)
      );
      if (typeOnlyImportRegex.test(fullLine)) continue;

      const pkg = match[1];
      if (localPrefixes.some((prefix) => pkg.startsWith(prefix))) continue;
      if (builtins.has(pkg)) continue;
      if (pkg.startsWith("node:")) continue;
      if (rnFamilyPrefixes.some((prefix) => pkg.startsWith(prefix))) continue;

      let packageName: string;
      if (pkg.startsWith("@")) {
        const parts = pkg.split("/");
        packageName = parts.slice(0, 2).join("/");
      } else {
        packageName = pkg.split("/")[0];
      }

      if (!declaredDeps.includes(packageName)) {
        missingDeps.push(packageName);
      }
    }

    if (missingDeps.length > 0) {
      assert.fail(
        `These imports are used in index.tsx but not listed in metadata.json dependencies: ${missingDeps.join(", ")}`
      );
    }
  });
});
