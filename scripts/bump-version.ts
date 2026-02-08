import * as fs from "node:fs";
import * as path from "node:path";

const METADATA_PATH = path.resolve(process.cwd(), "client/my-practa/metadata.json");
const PRACTA_INDEX_PATH = path.resolve(process.cwd(), "client/my-practa/index.tsx");
const APP_JSON_PATH = path.resolve(process.cwd(), "app.json");
const CACHE_PATH = path.resolve(process.cwd(), ".cache/last-version-commit.json");
const TEMPLATE_CACHE_PATH = path.resolve(process.cwd(), ".cache/last-template-version-commit.json");

// Packages to exclude from dependencies (built-in or provided by template)
const EXCLUDED_PACKAGES = new Set([
  "react",
  "react-native",
  "react-dom",
  "@/",
  "@shared/",
  "./",
  "../",
]);

// Prefixes that indicate local/relative imports
const LOCAL_PREFIXES = ["./", "../", "@/", "@shared/"];

export function detectDependencies(): string[] {
  if (!fs.existsSync(PRACTA_INDEX_PATH)) {
    return [];
  }

  const content = fs.readFileSync(PRACTA_INDEX_PATH, "utf-8");
  const detectedDeps: Set<string> = new Set();

  // Match all import statements: import ... from "package" or import "package"
  const importRegex = /(?:import\s+(?:[\s\S]*?)\s+from\s+|import\s+)['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const pkg = match[1];
    
    // Skip local/relative imports
    if (LOCAL_PREFIXES.some(prefix => pkg.startsWith(prefix))) {
      continue;
    }
    
    // Skip excluded packages
    if (EXCLUDED_PACKAGES.has(pkg)) {
      continue;
    }
    
    // For scoped packages (@org/pkg), keep full name
    // For regular packages, extract the package name (before any subpath)
    let packageName: string;
    if (pkg.startsWith("@")) {
      // Scoped package: @org/pkg or @org/pkg/subpath
      const parts = pkg.split("/");
      packageName = parts.slice(0, 2).join("/");
    } else {
      // Regular package: pkg or pkg/subpath
      packageName = pkg.split("/")[0];
    }
    
    detectedDeps.add(packageName);
  }

  return Array.from(detectedDeps).sort();
}

interface PractaMetadata {
  version: string;
  dependencies?: string[];
  [key: string]: unknown;
}

function bumpPatchVersion(version: string): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) {
    return "1.0.1";
  }
  const [, major, minor, patch, suffix] = match;
  let newMajor = Number(major);
  let newMinor = Number(minor);
  let newPatch = Number(patch) + 1;
  
  // Roll over: 1.0.9 -> 1.1.0, 1.9.9 -> 2.0.0
  if (newPatch >= 10) {
    newPatch = 0;
    newMinor += 1;
  }
  if (newMinor >= 10) {
    newMinor = 0;
    newMajor += 1;
  }
  
  return `${newMajor}.${newMinor}.${newPatch}${suffix || ""}`;
}

export function bumpMetadataPatch(): { success: boolean; newVersion?: string; detectedDeps?: string[]; error?: string } {
  try {
    if (!fs.existsSync(METADATA_PATH)) {
      return { success: false, error: "metadata.json not found" };
    }

    const content = fs.readFileSync(METADATA_PATH, "utf-8");
    const metadata: PractaMetadata = JSON.parse(content);
    
    const oldVersion = metadata.version;
    const newVersion = bumpPatchVersion(oldVersion);
    metadata.version = newVersion;

    const detectedDeps = detectDependencies();
    if (detectedDeps.length > 0) {
      metadata.dependencies = detectedDeps;
      console.log(`[Version Bump] Auto-detected dependencies: ${detectedDeps.join(", ")}`);
    } else {
      delete metadata.dependencies;
    }

    const jsonContent = JSON.stringify(metadata, null, 2) + "\n";

    fs.writeFileSync(METADATA_PATH, jsonContent);

    console.log(`[Version Bump] ${oldVersion} -> ${newVersion}`);
    return { success: true, newVersion, detectedDeps };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export function getLastProcessedCommit(): string | null {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const data = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
      return data.lastCommit || null;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

export function setLastProcessedCommit(commitSha: string): void {
  try {
    const cacheDir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ lastCommit: commitSha }, null, 2) + "\n");
  } catch (error) {
    console.error("[Version Bump] Failed to save commit cache:", error);
  }
}

export function getCurrentCommitSha(): string | null {
  try {
    const headPath = path.resolve(process.cwd(), ".git/HEAD");
    if (!fs.existsSync(headPath)) {
      return null;
    }

    const headContent = fs.readFileSync(headPath, "utf-8").trim();
    
    if (headContent.startsWith("ref: ")) {
      const refPath = path.resolve(process.cwd(), ".git", headContent.slice(5));
      if (fs.existsSync(refPath)) {
        return fs.readFileSync(refPath, "utf-8").trim();
      }
      return null;
    }
    
    return headContent;
  } catch {
    return null;
  }
}

export function bumpTemplateVersion(): { success: boolean; newVersion?: string; error?: string } {
  try {
    if (!fs.existsSync(APP_JSON_PATH)) {
      return { success: false, error: "app.json not found" };
    }

    const content = fs.readFileSync(APP_JSON_PATH, "utf-8");
    const appJson = JSON.parse(content);
    
    if (!appJson.expo?.version) {
      return { success: false, error: "No version field in app.json" };
    }

    const oldVersion = appJson.expo.version;
    const newVersion = bumpPatchVersion(oldVersion);
    appJson.expo.version = newVersion;

    fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + "\n");

    console.log(`[Template Version Bump] ${oldVersion} -> ${newVersion}`);
    return { success: true, newVersion };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export function getLastProcessedTemplateCommit(): string | null {
  try {
    if (fs.existsSync(TEMPLATE_CACHE_PATH)) {
      const data = JSON.parse(fs.readFileSync(TEMPLATE_CACHE_PATH, "utf-8"));
      return data.lastCommit || null;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

export function setLastProcessedTemplateCommit(commitSha: string): void {
  try {
    const cacheDir = path.dirname(TEMPLATE_CACHE_PATH);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(TEMPLATE_CACHE_PATH, JSON.stringify({ lastCommit: commitSha }, null, 2) + "\n");
  } catch (error) {
    console.error("[Template Version Bump] Failed to save commit cache:", error);
  }
}
