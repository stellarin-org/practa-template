import * as fs from "node:fs";
import * as path from "node:path";
import type { PractaFileMetadata } from "@shared/schema";

const METADATA_PATH = path.resolve(process.cwd(), "client/my-practa/metadata.json");
const PRACTA_INDEX_PATH = path.resolve(process.cwd(), "client/my-practa/index.tsx");

const LOCAL_PREFIXES = ["./", "../", "@/", "@shared/"];

const EXCLUDED_PACKAGES = new Set([
  "react",
  "react-native",
  "react-dom",
  "@/",
  "@shared/",
  "./",
  "../",
]);

export type ReleaseType = "major" | "minor" | "patch";

export function detectDependencies(): string[] {
  if (!fs.existsSync(PRACTA_INDEX_PATH)) {
    return [];
  }

  const content = fs.readFileSync(PRACTA_INDEX_PATH, "utf-8");
  const detectedDeps: Set<string> = new Set();

  const importRegex = /(?:import\s+(?:[\s\S]*?)\s+from\s+|import\s+)['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const pkg = match[1];
    
    if (LOCAL_PREFIXES.some(prefix => pkg.startsWith(prefix))) {
      continue;
    }
    
    if (EXCLUDED_PACKAGES.has(pkg)) {
      continue;
    }
    
    let packageName: string;
    if (pkg.startsWith("@")) {
      const parts = pkg.split("/");
      packageName = parts.slice(0, 2).join("/");
    } else {
      packageName = pkg.split("/")[0];
    }
    
    detectedDeps.add(packageName);
  }

  return Array.from(detectedDeps).sort();
}

export function bumpVersion(version: string, releaseType: ReleaseType): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) {
    return releaseType === "major" ? "1.0.0" : releaseType === "minor" ? "0.1.0" : "0.0.1";
  }
  const [, majorStr, minorStr, patchStr] = match;
  const major = Number(majorStr);
  const minor = Number(minorStr);
  const patch = Number(patchStr);

  switch (releaseType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

export function bumpMetadataVersion(releaseType: ReleaseType): { success: boolean; oldVersion?: string; newVersion?: string; detectedDeps?: string[]; error?: string } {
  try {
    if (!fs.existsSync(METADATA_PATH)) {
      return { success: false, error: "metadata.json not found" };
    }

    const content = fs.readFileSync(METADATA_PATH, "utf-8");
    const metadata: PractaFileMetadata = JSON.parse(content);
    
    const oldVersion = metadata.version;
    const newVersion = bumpVersion(oldVersion, releaseType);
    metadata.version = newVersion;

    const detectedDeps = detectDependencies();
    if (detectedDeps.length > 0) {
      metadata.dependencies = detectedDeps;
    } else {
      delete metadata.dependencies;
    }

    const jsonContent = JSON.stringify(metadata, null, 2) + "\n";
    fs.writeFileSync(METADATA_PATH, jsonContent);

    const attachedAssetsDir = path.resolve(process.cwd(), "attached_assets");
    if (fs.existsSync(attachedAssetsDir)) {
      const files = fs.readdirSync(attachedAssetsDir);
      for (const file of files) {
        const filePath = path.join(attachedAssetsDir, file);
        fs.rmSync(filePath, { recursive: true, force: true });
      }
      console.log(`[Version Bump] Cleared ${files.length} item(s) from attached_assets/`);
    }

    console.log(`[Version Bump] ${releaseType}: ${oldVersion} -> ${newVersion}`);
    return { success: true, oldVersion, newVersion, detectedDeps };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
