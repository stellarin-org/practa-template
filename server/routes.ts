import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as fs from "fs";
import * as path from "path";
import { PassThrough } from "node:stream";
import archiver from "archiver";
import AdmZip from "adm-zip";
import { TEMPLATE_SYNC_CONFIG } from "./template-sync-config";
import { updatePractaAssets } from "./index";

const METADATA_PATH = path.resolve(process.cwd(), "client/my-practa/metadata.json");
const LAST_SUBMIT_PATH = path.resolve(process.cwd(), ".config/last-submit.json");
const TEMPLATE_REPO = "stellarin-org/practa-template";
const PROTECTED_PATHS = TEMPLATE_SYNC_CONFIG.protectedPaths;
const MY_PRACTA_PATH = "client/my-practa";
const DEMO_TEMPLATE_PATH = "demo-template";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per file
const MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024; // 25MB total
const ALLOWED_ASSET_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".mp3", ".wav", ".m4a", ".ogg",
  ".mp4", ".webm",
  ".json", ".txt"
];

interface PractaMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  estimatedDuration?: number;
  category?: string;
  tags?: string[];
  assets?: Record<string, string>;
  configSchema?: {
    fields: Record<string, unknown>;
    requiredConfig?: boolean;
  };
}

function validateMetadata(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Invalid data format"] };
  }
  
  const metadata = data as Record<string, unknown>;
  
  // Validate id field (required, lowercase kebab-case)
  const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!metadata.id || typeof metadata.id !== "string") {
    errors.push("id is required and must be a string");
  } else if (metadata.id.length < 3 || metadata.id.length > 50) {
    errors.push("id must be 3-50 characters");
  } else if (!idPattern.test(metadata.id)) {
    errors.push("id must be lowercase kebab-case (e.g., 'my-practa')");
  }
  
  if (!metadata.name || typeof metadata.name !== "string") {
    errors.push("name is required and must be a string");
  }
  
  if (!metadata.description || typeof metadata.description !== "string") {
    errors.push("description is required and must be a string");
  }
  
  if (!metadata.author || typeof metadata.author !== "string") {
    errors.push("author is required and must be a string");
  }
  
  if (!metadata.version || typeof metadata.version !== "string") {
    errors.push("version is required and must be a string");
  } else if (!/^\d+\.\d+\.\d+$/.test(metadata.version)) {
    errors.push("version must follow semantic versioning (e.g., '1.0.0')");
  }
  
  if (metadata.estimatedDuration !== undefined) {
    if (typeof metadata.estimatedDuration !== "number" || metadata.estimatedDuration < 0) {
      errors.push("estimatedDuration must be a positive number");
    }
  }
  
  if (metadata.category !== undefined && typeof metadata.category !== "string") {
    errors.push("category must be a string");
  }
  
  if (metadata.tags !== undefined) {
    if (!Array.isArray(metadata.tags)) {
      errors.push("tags must be an array");
    } else if (!metadata.tags.every((t: unknown) => typeof t === "string")) {
      errors.push("all tags must be strings");
    }
  }
  
  return { valid: errors.length === 0, errors };
}

function readConfig(): PractaMetadata | null {
  try {
    if (fs.existsSync(METADATA_PATH)) {
      const content = fs.readFileSync(METADATA_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading metadata.json:", error);
  }
  return null;
}

function writeConfig(metadata: PractaMetadata): boolean {
  // Order fields consistently: id, name, version, description, author, estimatedDuration, category, tags, assets, configSchema
  const orderedMetadata = {
    id: metadata.id,
    name: metadata.name,
    version: metadata.version,
    description: metadata.description,
    author: metadata.author,
    ...(metadata.estimatedDuration !== undefined && { estimatedDuration: metadata.estimatedDuration }),
    ...(metadata.category && { category: metadata.category }),
    ...(metadata.tags && metadata.tags.length > 0 && { tags: metadata.tags }),
    ...(metadata.assets && Object.keys(metadata.assets).length > 0 && { assets: metadata.assets }),
    ...(metadata.configSchema && { configSchema: metadata.configSchema }),
  };
  
  try {
    fs.writeFileSync(METADATA_PATH, JSON.stringify(orderedMetadata, null, 2) + "\n");
    return true;
  } catch (error) {
    console.error("Error writing metadata.json:", error);
    return false;
  }
}

interface AssetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalSize: number;
  fileCount: number;
}

/**
 * Normalize asset path to just the filename.
 * Handles common user mistakes like "assets/splash.png" instead of "splash.png"
 */
function normalizeAssetPath(assetPath: string): string {
  let normalized = assetPath.trim();
  
  // Strip leading ./ or /
  normalized = normalized.replace(/^\.\//, "");
  normalized = normalized.replace(/^\//, "");
  // Strip single leading assets/ prefix if present
  normalized = normalized.replace(/^assets\//, "");
  
  return normalized;
}

function extractDeclaredAssets(practaDir: string): { key: string; path: string }[] {
  const metadataPath = path.join(practaDir, "metadata.json");
  if (!fs.existsSync(metadataPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(metadataPath, "utf-8");
    const metadata = JSON.parse(content);
    const declared: { key: string; path: string }[] = [];

    if (metadata.assets && typeof metadata.assets === "object") {
      for (const [key, rawPath] of Object.entries(metadata.assets)) {
        if (typeof rawPath === "string") {
          const normalizedPath = normalizeAssetPath(rawPath);
          if (normalizedPath) {
            declared.push({ key, path: normalizedPath });
          }
        }
      }
    }

    return declared;
  } catch (error) {
    console.error("[Validator] Failed to parse metadata.json:", error);
    return [];
  }
}

function validateAssets(practaDir: string): AssetValidationResult {
  const result: AssetValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    totalSize: 0,
    fileCount: 0,
  };

  const assetsDir = path.join(practaDir, "assets");
  
  // Check for declared assets that don't exist
  const declaredAssets = extractDeclaredAssets(practaDir);
  for (const asset of declaredAssets) {
    const assetFullPath = path.join(assetsDir, asset.path);
    if (!fs.existsSync(assetFullPath)) {
      result.errors.push(
        `Asset "${asset.key}" is declared but file not found: ./assets/${asset.path}`
      );
      result.valid = false;
    }
  }

  if (!fs.existsSync(assetsDir)) {
    // If there are declared assets but no assets folder, that's already caught above
    return result;
  }

  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(practaDir, fullPath);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile()) {
        result.fileCount++;
        const stats = fs.statSync(fullPath);
        const ext = path.extname(entry.name).toLowerCase();
        
        result.totalSize += stats.size;
        
        if (stats.size > MAX_FILE_SIZE_BYTES) {
          result.errors.push(
            `File "${relativePath}" exceeds 5MB limit (${(stats.size / 1024 / 1024).toFixed(2)}MB)`
          );
          result.valid = false;
        }
        
        if (!ALLOWED_ASSET_EXTENSIONS.includes(ext)) {
          result.warnings.push(
            `File "${relativePath}" has unsupported extension "${ext}"`
          );
        }
      }
    }
  }

  scanDirectory(assetsDir);

  if (result.totalSize > MAX_TOTAL_SIZE_BYTES) {
    result.errors.push(
      `Total package size exceeds 25MB limit (${(result.totalSize / 1024 / 1024).toFixed(2)}MB)`
    );
    result.valid = false;
  }

  return result;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/practa/check-name", async (req, res) => {
    const { name } = req.query;
    
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name parameter is required" });
    }

    try {
      const checkUrl = `https://stellarin-practa-verification.replit.app/api/practa/check-name?name=${encodeURIComponent(name)}`;
      const response = await fetch(checkUrl);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to check name availability" });
      }

      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error("Check name error:", error);
      res.status(500).json({ error: "Failed to check name availability" });
    }
  });

  app.get("/api/practa/metadata", (req, res) => {
    const config = readConfig();
    if (config) {
      res.json(config);
    } else {
      res.status(404).json({ error: "Configuration not found" });
    }
  });

  app.put("/api/practa/metadata", (req, res) => {
    const validation = validateMetadata(req.body);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        error: "Validation failed", 
        errors: validation.errors 
      });
    }
    
    const metadata: PractaMetadata = {
      id: req.body.id,
      name: req.body.name,
      description: req.body.description,
      author: req.body.author,
      version: req.body.version,
      estimatedDuration: req.body.estimatedDuration,
      category: req.body.category,
      tags: req.body.tags,
    };
    
    if (writeConfig(metadata)) {
      res.json(metadata);
    } else {
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  app.get("/api/practa/download-zip", (req, res) => {
    const practaDir = path.resolve(process.cwd(), "client/my-practa");
    
    if (!fs.existsSync(practaDir)) {
      return res.status(404).json({ error: "Practa directory not found" });
    }

    const config = readConfig();
    const practaId = config?.id || "my-practa";
    const filename = config ? `${practaId}-${config.version}.zip` : "practa.zip";

    const componentName = config ? config.name.replace(/[^a-zA-Z0-9]/g, "") : "MyPracta";
    
    const manifest = config ? {
      id: practaId,
      name: config.name,
      version: config.version,
      description: config.description,
      author: config.author,
      type: "widget",
      category: config.category || "wellbeing",
      tags: config.tags || ["practa", "wellbeing"],
      estimatedDuration: config.estimatedDuration,
      requiredPermissions: [],
      assets: config.assets || {},
    } : null;

    const readme = config ? `# ${config.name}

${config.description}

## Installation

This Practa component is designed for the Stellarin app.

## Usage

\`\`\`tsx
import ${componentName} from "@stellarin/practa-${practaId}";

function MyFlow() {
  return (
    <${componentName}
      context={{ flowId: "my-flow", practaIndex: 0 }}
      onComplete={(output) => console.log("Completed:", output)}
      onSkip={() => console.log("Skipped")}
    />
  );
}
\`\`\`

## Props

This component accepts the standard Practa props:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| \`context\` | PractaContext | Yes | Flow context from previous Practa |
| \`onComplete\` | (output: PractaOutput) => void | Yes | Callback when the Practa completes |
| \`onSkip\` | () => void | No | Optional callback to skip the Practa |

## Author

Created by ${config.author}

## Version

${config.version}
` : null;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      res.status(500).json({ error: "Failed to create archive" });
    });

    archive.pipe(res);
    
    // Add directory contents but exclude files we'll add separately
    archive.glob("**/*", {
      cwd: practaDir,
      ignore: ["metadata.json", "README.md"],
    });
    
    if (manifest) {
      archive.append(JSON.stringify(manifest, null, 2), { name: "metadata.json" });
    }
    if (readme) {
      archive.append(readme, { name: "README.md" });
    }
    
    archive.finalize();
  });

  app.get("/api/practa/validate-assets", (req, res) => {
    const practaDir = path.resolve(process.cwd(), "client/my-practa");
    
    if (!fs.existsSync(practaDir)) {
      return res.status(404).json({ error: "Practa directory not found" });
    }

    const result = validateAssets(practaDir);
    res.json({
      ...result,
      totalSizeMB: (result.totalSize / 1024 / 1024).toFixed(2),
      maxFileSizeMB: MAX_FILE_SIZE_BYTES / 1024 / 1024,
      maxTotalSizeMB: MAX_TOTAL_SIZE_BYTES / 1024 / 1024,
    });
  });

  app.post("/api/practa/submit", async (req, res) => {
    const SUBMIT_URL = "https://stellarin-practa-verification.replit.app/api/submissions/upload-preview";
    
    try {
      const practaDir = path.resolve(process.cwd(), "client/my-practa");
      
      if (!fs.existsSync(practaDir)) {
        return res.status(404).json({ error: "Practa directory not found" });
      }

      const assetValidation = validateAssets(practaDir);
      if (!assetValidation.valid) {
        return res.status(400).json({ 
          error: "Asset validation failed", 
          errors: assetValidation.errors,
          warnings: assetValidation.warnings,
          totalSizeMB: (assetValidation.totalSize / 1024 / 1024).toFixed(2),
        });
      }

      const config = readConfig();
      if (!config) {
        return res.status(400).json({ error: "Practa configuration not found" });
      }

      const componentName = config.name.replace(/[^a-zA-Z0-9]/g, "");
      const practaIdSubmit = config.id;

      const manifest = {
        id: practaIdSubmit,
        name: config.name,
        version: config.version,
        description: config.description,
        author: config.author,
        type: "widget",
        category: config.category || "wellbeing",
        tags: config.tags || ["practa", "wellbeing"],
        estimatedDuration: config.estimatedDuration,
        requiredPermissions: [],
        assets: config.assets || {},
      };

      const readme = `# ${config.name}

${config.description}

## Installation

This Practa component is designed for the Stellarin app.

## Usage

\`\`\`tsx
import ${componentName} from "@stellarin/practa-${practaIdSubmit}";

function MyFlow() {
  return (
    <${componentName}
      context={{ flowId: "my-flow", practaIndex: 0 }}
      onComplete={(output) => console.log("Completed:", output)}
      onSkip={() => console.log("Skipped")}
    />
  );
}
\`\`\`

## Props

This component accepts the standard Practa props:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| \`context\` | PractaContext | Yes | Flow context from previous Practa |
| \`onComplete\` | (output: PractaOutput) => void | Yes | Callback when the Practa completes |
| \`onSkip\` | () => void | No | Optional callback to skip the Practa |

## Author

Created by ${config.author}

## Version

${config.version}
`;

      const chunks: Buffer[] = [];
      const archive = archiver("zip", { zlib: { level: 9 } });
      const passThrough = new PassThrough();
      
      passThrough.on("data", (chunk) => chunks.push(chunk));
      archive.pipe(passThrough);
      
      await new Promise<void>((resolve, reject) => {
        passThrough.on("end", resolve);
        archive.on("error", reject);
        passThrough.on("error", reject);
        
        // Add directory contents but exclude files we'll add separately
        archive.glob("**/*", {
          cwd: practaDir,
          ignore: ["metadata.json", "README.md"],
        });
        archive.append(JSON.stringify(manifest, null, 2), { name: "metadata.json" });
        archive.append(readme, { name: "README.md" });
        archive.finalize();
      });

      const zipBuffer = Buffer.concat(chunks);
      const blob = new Blob([zipBuffer], { type: "application/zip" });
      
      const formData = new FormData();
      formData.append("file", blob, `${practaIdSubmit}-${config.version}.zip`);

      const response = await fetch(SUBMIT_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ 
          error: "Submission failed", 
          details: errorText 
        });
      }

      const result = await response.json();
      
      // Save last submission timestamp
      try {
        const configDir = path.dirname(LAST_SUBMIT_PATH);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(LAST_SUBMIT_PATH, JSON.stringify({ 
          timestamp: new Date().toISOString(),
          practaId: practaIdSubmit,
          version: config.version
        }, null, 2));
      } catch (timestampError) {
        console.error("Failed to save submission timestamp:", timestampError);
      }
      
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Submit error:", error);
      res.status(500).json({ 
        error: "Failed to submit practa",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/practa/last-submit", (req, res) => {
    try {
      if (!fs.existsSync(LAST_SUBMIT_PATH)) {
        return res.json({ timestamp: null });
      }
      const content = fs.readFileSync(LAST_SUBMIT_PATH, "utf-8");
      const data = JSON.parse(content);
      res.json(data);
    } catch (error) {
      console.error("Error reading last submission:", error);
      res.json({ timestamp: null });
    }
  });

  app.get("/api/template/sync-status", async (req, res) => {
    try {
      // Check if this is the master template by looking for the MASTER_TEMPLATE_KEY secret
      // Forks/copies of this template will NOT have this secret
      const masterKey = process.env.MASTER_TEMPLATE_KEY;
      const isMasterTemplate = typeof masterKey === "string" && masterKey.length > 0;
      
      const repoResponse = await fetch(
        `https://api.github.com/repos/${TEMPLATE_REPO}`,
        { headers: { "Accept": "application/vnd.github+json" } }
      );
      
      if (!repoResponse.ok) {
        return res.json({
          isInSync: true,
          localVersion: null,
          latestVersion: null,
          repoUrl: `https://github.com/${TEMPLATE_REPO}`,
          repoAvailable: false,
          isMasterTemplate,
        });
      }
      
      const repoData = await repoResponse.json();
      const defaultBranch = repoData.default_branch || "main";
      
      const branchResponse = await fetch(
        `https://api.github.com/repos/${TEMPLATE_REPO}/branches/${defaultBranch}`,
        { headers: { "Accept": "application/vnd.github+json" } }
      );
      
      if (!branchResponse.ok) {
        return res.json({
          isInSync: true,
          localVersion: null,
          latestVersion: null,
          repoUrl: `https://github.com/${TEMPLATE_REPO}`,
          repoAvailable: false,
          isMasterTemplate,
        });
      }
      
      const branchData = await branchResponse.json();
      const latestSha = branchData.commit.sha;
      
      // Get local template version from app.json
      let localTemplateVersion = "1.0.0";
      const appJsonPath = path.resolve(process.cwd(), "app.json");
      try {
        if (fs.existsSync(appJsonPath)) {
          const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
          localTemplateVersion = appJson.expo?.version || "1.0.0";
        }
      } catch {}
      
      // Get latest template version from GitHub (use API to avoid raw.githubusercontent CDN cache)
      let latestTemplateVersion = localTemplateVersion;
      try {
        const appJsonUrl = `https://api.github.com/repos/${TEMPLATE_REPO}/contents/app.json?ref=${defaultBranch}`;
        const appJsonResponse = await fetch(appJsonUrl, {
          headers: { 
            "Accept": "application/vnd.github.raw+json",
            "Cache-Control": "no-cache"
          }
        });
        if (appJsonResponse.ok) {
          const remoteAppJson = await appJsonResponse.json();
          latestTemplateVersion = remoteAppJson.expo?.version || localTemplateVersion;
        }
      } catch {}
      
      const syncFilePath = path.resolve(process.cwd(), ".template-sync");
      let localSha = "";
      let isFirstRun = false;
      
      if (fs.existsSync(syncFilePath)) {
        localSha = fs.readFileSync(syncFilePath, "utf-8").trim();
      } else {
        // First run for a fork - mark as first run
        isFirstRun = true;
      }
      
      let gitHeadSha = "";
      try {
        const gitHeadPath = path.resolve(process.cwd(), ".git/HEAD");
        if (fs.existsSync(gitHeadPath)) {
          const headContent = fs.readFileSync(gitHeadPath, "utf-8").trim();
          if (headContent.startsWith("ref: ")) {
            const refPath = path.resolve(process.cwd(), ".git", headContent.substring(5));
            if (fs.existsSync(refPath)) {
              gitHeadSha = fs.readFileSync(refPath, "utf-8").trim();
            }
          } else {
            gitHeadSha = headContent;
          }
        }
      } catch {
      }
      
      // For master template: sync file tracks what's been pushed
      // For forks: sync file tracks what version of template they're on
      if (isMasterTemplate) {
        // Master template: update sync file when git HEAD matches latest
        if (gitHeadSha && gitHeadSha === latestSha) {
          if (localSha !== latestSha) {
            fs.writeFileSync(syncFilePath, latestSha);
            localSha = latestSha;
          }
        }
      } else if (isFirstRun) {
        // Fork's first run: assume they're starting fresh with latest template
        // Create sync file with latest SHA so they start in sync
        fs.writeFileSync(syncFilePath, latestSha);
        localSha = latestSha;
      }
      
      // For master template: check if local git HEAD differs from remote (unpushed changes)
      // For forks: check if .template-sync differs from remote (updates available)
      const isInSync = isMasterTemplate 
        ? (gitHeadSha === latestSha)
        : (localSha === latestSha);
      
      // Compare semantic versions to determine if update is actually newer
      const compareVersions = (a: string, b: string): number => {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
          if ((pa[i] || 0) > (pb[i] || 0)) return 1;
          if ((pa[i] || 0) < (pb[i] || 0)) return -1;
        }
        return 0;
      };
      
      const hasNewerVersion = compareVersions(latestTemplateVersion, localTemplateVersion) > 0;
      
      res.json({
        isInSync,
        localVersion: isMasterTemplate ? gitHeadSha : (localSha || null),
        latestVersion: latestSha,
        localTemplateVersion,
        latestTemplateVersion,
        hasNewerVersion,
        repoUrl: `https://github.com/${TEMPLATE_REPO}`,
        repoAvailable: true,
        isMasterTemplate,
      });
    } catch (error) {
      console.error("Sync check error:", error);
      
      // Still try to read local version from app.json even on error
      let localTemplateVersion = "1.0.0";
      try {
        const appJsonPath = path.resolve(process.cwd(), "app.json");
        if (fs.existsSync(appJsonPath)) {
          const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
          localTemplateVersion = appJson.expo?.version || "1.0.0";
        }
      } catch {}
      
      res.json({
        isInSync: true,
        localVersion: null,
        latestVersion: null,
        localTemplateVersion,
        latestTemplateVersion: localTemplateVersion,
        hasNewerVersion: false,
        repoUrl: `https://github.com/${TEMPLATE_REPO}`,
        repoAvailable: false,
        isMasterTemplate: false,
      });
    }
  });

  app.post("/api/practa/reset-to-demo", async (req, res) => {
    try {
      const { execSync } = require("child_process");
      const demoDir = path.resolve(process.cwd(), "demo-template");
      const practaDir = path.resolve(process.cwd(), "client/my-practa");
      const configPath = path.resolve(process.cwd(), "practa.config.json");

      if (!fs.existsSync(demoDir)) {
        return res.status(404).json({ error: "Demo template not found" });
      }

      // Read demo files content
      const demoIndexContent = fs.readFileSync(path.join(demoDir, "index.tsx"), "utf-8");
      const demoMetadataContent = fs.readFileSync(path.join(demoDir, "metadata.json"), "utf-8");

      // Ensure directories exist
      if (!fs.existsSync(practaDir)) {
        fs.mkdirSync(practaDir, { recursive: true });
      }
      const assetsDir = path.join(practaDir, "assets");
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      // Write files by truncating and writing (keeps same inode)
      fs.writeFileSync(path.join(practaDir, "index.tsx"), demoIndexContent, { flag: "w" });
      fs.writeFileSync(path.join(practaDir, "metadata.json"), demoMetadataContent, { flag: "w" });
      fs.writeFileSync(configPath, demoMetadataContent, { flag: "w" });

      // Copy assets
      const demoAssetsDir = path.join(demoDir, "assets");
      if (fs.existsSync(demoAssetsDir)) {
        const demoAssets = fs.readdirSync(demoAssetsDir);
        for (const asset of demoAssets) {
          const srcPath = path.join(demoAssetsDir, asset);
          const destPath = path.join(assetsDir, asset);
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Force sync filesystem
      try {
        execSync(`sync`, { stdio: "pipe" });
      } catch (e) {
        // sync may not be available, ignore
      }

      res.json({ success: true, message: "Practa reset to demo state" });

      setTimeout(() => {
        console.log("[Reset] Restarting server to apply changes...");
        process.exit(0);
      }, 500);
    } catch (error) {
      console.error("Reset error:", error);
      res.status(500).json({
        error: "Failed to reset Practa",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/template/update", async (req, res) => {
    try {
      // Add cache-busting headers to bypass GitHub CDN cache
      const githubHeaders = { 
        "Accept": "application/vnd.github+json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      };
      
      const repoResponse = await fetch(
        `https://api.github.com/repos/${TEMPLATE_REPO}`,
        { headers: githubHeaders }
      );
      
      if (!repoResponse.ok) {
        return res.status(500).json({ 
          error: "Template repository not available" 
        });
      }
      
      const repoData = await repoResponse.json();
      const defaultBranch = repoData.default_branch || "main";
      
      const branchResponse = await fetch(
        `https://api.github.com/repos/${TEMPLATE_REPO}/branches/${defaultBranch}`,
        { headers: githubHeaders }
      );
      
      if (!branchResponse.ok) {
        return res.status(500).json({ 
          error: "Failed to fetch template info" 
        });
      }
      
      const branchData = await branchResponse.json();
      const latestSha = branchData.commit.sha;
      
      const archiveUrl = `https://api.github.com/repos/${TEMPLATE_REPO}/zipball/${defaultBranch}`;
      const archiveResponse = await fetch(archiveUrl, {
        headers: githubHeaders
      });
      
      if (!archiveResponse.ok) {
        return res.status(500).json({ 
          error: "Failed to download template" 
        });
      }
      
      const arrayBuffer = await archiveResponse.arrayBuffer();
      const zipBuffer = Buffer.from(arrayBuffer);
      
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();
      
      if (zipEntries.length === 0) {
        return res.status(500).json({ error: "Invalid template archive" });
      }
      
      const firstEntry = zipEntries[0].entryName;
      const rootFolder = firstEntry.split("/")[0];
      const projectRoot = process.cwd();
      
      const SKIP_PATTERNS = TEMPLATE_SYNC_CONFIG.skipPatterns;
      const SYNC_DIRECTORIES = TEMPLATE_SYNC_CONFIG.syncDirectories;
      
      // Collect all template file paths for sync directories
      const templateFiles = new Set<string>();
      
      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        
        const entryPath = entry.entryName;
        const relativePath = entryPath.substring(rootFolder.length + 1);
        
        if (!relativePath) continue;
        
        const isProtected = PROTECTED_PATHS.some(
          (p) => relativePath === p || relativePath.startsWith(p + "/")
        );
        if (isProtected) continue;
        
        const shouldSkip = SKIP_PATTERNS.some((p) => relativePath.startsWith(p));
        if (shouldSkip) continue;
        
        // Track files in sync directories
        const isInSyncDir = SYNC_DIRECTORIES.some(
          (dir) => relativePath === dir || relativePath.startsWith(dir + "/")
        );
        if (isInSyncDir) {
          templateFiles.add(relativePath);
        }
        
        const destPath = path.join(projectRoot, relativePath);
        const destDir = path.dirname(destPath);
        
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        fs.writeFileSync(destPath, entry.getData());
      }
      
      // Delete stale files in sync directories
      const getAllFiles = (dir: string, baseDir: string): string[] => {
        const files: string[] = [];
        if (!fs.existsSync(dir)) return files;
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);
          
          if (entry.isDirectory()) {
            files.push(...getAllFiles(fullPath, baseDir));
          } else {
            files.push(relativePath);
          }
        }
        return files;
      };
      
      for (const syncDir of SYNC_DIRECTORIES) {
        const fullSyncDir = path.join(projectRoot, syncDir);
        if (!fs.existsSync(fullSyncDir)) continue;
        
        const localFiles = getAllFiles(fullSyncDir, projectRoot);
        
        for (const localFile of localFiles) {
          // Skip if file exists in template
          if (templateFiles.has(localFile)) continue;
          
          // Skip protected paths
          const isProtected = PROTECTED_PATHS.some(
            (p) => localFile === p || localFile.startsWith(p + "/")
          );
          if (isProtected) continue;
          
          // Skip dynamically generated files
          const shouldSkip = SKIP_PATTERNS.some((p) => localFile.startsWith(p));
          if (shouldSkip) continue;
          
          // Delete stale file
          const filePath = path.join(projectRoot, localFile);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        
        // Clean up empty directories
        const cleanEmptyDirs = (dir: string) => {
          if (!fs.existsSync(dir)) return;
          
          const entries = fs.readdirSync(dir);
          for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            if (fs.statSync(fullPath).isDirectory()) {
              cleanEmptyDirs(fullPath);
            }
          }
          
          // Check if directory is now empty (and not protected)
          const relativePath = path.relative(projectRoot, dir);
          const isProtected = PROTECTED_PATHS.some(
            (p) => relativePath === p || relativePath.startsWith(p + "/")
          );
          
          if (!isProtected && fs.existsSync(dir)) {
            const remaining = fs.readdirSync(dir);
            if (remaining.length === 0) {
              fs.rmdirSync(dir);
            }
          }
        };
        
        cleanEmptyDirs(fullSyncDir);
      }
      
      const syncFilePath = path.resolve(projectRoot, ".template-sync");
      fs.writeFileSync(syncFilePath, latestSha);
      
      // Regenerate practa-assets.ts to reflect any changes in demo-practa
      console.log("[Template Update] Regenerating practa-assets.ts...");
      updatePractaAssets();
      
      res.json({
        success: true,
        updatedTo: latestSha,
        message: "Template updated successfully. Restart the app to see changes."
      });
    } catch (error) {
      console.error("Template update error:", error);
      res.status(500).json({
        error: "Failed to update template",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Publish to Git: reset to demo + commit + push
  app.post("/api/template/publish", async (req, res) => {
    try {
      // Check if this is the master template
      const masterKey = process.env.MASTER_TEMPLATE_KEY;
      const isMasterTemplate = typeof masterKey === "string" && masterKey.length > 0;
      
      if (!isMasterTemplate) {
        return res.status(403).json({ 
          error: "Publishing is only available for the master template" 
        });
      }

      // Step 1: Reset Practa to demo
      const myPractaDir = path.resolve(process.cwd(), MY_PRACTA_PATH);
      const demoDir = path.resolve(process.cwd(), DEMO_TEMPLATE_PATH);

      if (!fs.existsSync(demoDir)) {
        return res.status(404).json({ error: "Demo template not found" });
      }

      // Clear my-practa directory
      if (fs.existsSync(myPractaDir)) {
        const files = fs.readdirSync(myPractaDir);
        for (const file of files) {
          const filePath = path.join(myPractaDir, file);
          fs.rmSync(filePath, { recursive: true, force: true });
        }
      } else {
        fs.mkdirSync(myPractaDir, { recursive: true });
      }

      // Copy demo template
      const copyRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };
      copyRecursive(demoDir, myPractaDir);

      // Step 2: Git add, commit, push
      const { execSync } = await import("child_process");
      const projectRoot = process.cwd();
      
      try {
        // Stage all changes
        execSync("git add -A", { cwd: projectRoot, stdio: "pipe" });
        
        // Create commit with timestamp
        const timestamp = new Date().toISOString().split("T")[0];
        const commitMessage = `Publish template ${timestamp}`;
        execSync(`git commit -m "${commitMessage}" --allow-empty`, { 
          cwd: projectRoot, 
          stdio: "pipe" 
        });
        
        // Push to remote
        execSync("git push", { cwd: projectRoot, stdio: "pipe", timeout: 30000 });
        
        res.json({
          success: true,
          message: "Successfully reset to demo and published to Git"
        });
      } catch (gitError) {
        console.error("Git operation failed:", gitError);
        res.status(500).json({
          error: "Reset completed but Git push failed. You may need to push manually.",
          details: gitError instanceof Error ? gitError.message : "Unknown git error"
        });
      }
    } catch (error) {
      console.error("Publish error:", error);
      res.status(500).json({
        error: "Failed to publish",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============================================
  // APP SYNC ROUTES (Master Template Only)
  // Syncs critical files from main Stellarin app
  // Uses Replit GitHub connector for authentication
  // ============================================
  
  const APP_SYNC_CONFIG_PATH = path.resolve(process.cwd(), ".config/app-sync.config.json");
  
  interface AppSyncConfig {
    mainAppRepo: string;
    mainAppBranch: string;
    githubConnectionId?: string;
    deleteStaleFiles?: boolean;
    syncItems: Array<{
      from: string;
      to: string;
      description: string;
    }>;
  }
  
  // Cache for Replit GitHub connector token
  let githubConnectionSettings: { settings: { access_token?: string; expires_at?: string; oauth?: { credentials?: { access_token?: string } } } } | null = null;
  
  async function getGitHubAccessToken(connectionId?: string): Promise<string | null> {
    try {
      // Check if cached token is still valid
      if (githubConnectionSettings?.settings?.expires_at) {
        const expiresAt = new Date(githubConnectionSettings.settings.expires_at).getTime();
        if (expiresAt > Date.now()) {
          return githubConnectionSettings.settings.access_token || 
                 githubConnectionSettings.settings.oauth?.credentials?.access_token || null;
        }
      }
      
      const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
      if (!hostname) {
        return null;
      }
      
      const xReplitToken = process.env.REPL_IDENTITY 
        ? 'repl ' + process.env.REPL_IDENTITY 
        : process.env.WEB_REPL_RENEWAL 
        ? 'depl ' + process.env.WEB_REPL_RENEWAL 
        : null;
      
      if (!xReplitToken) {
        return null;
      }
      
      // If a specific connection ID is provided, query it directly
      const url = connectionId
        ? `https://${hostname}/api/v2/connection/${connectionId}?include_secrets=true`
        : `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=github`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // Handle different response formats (single object vs array)
      if (connectionId) {
        githubConnectionSettings = data as typeof githubConnectionSettings;
      } else {
        const items = (data as { items?: Array<typeof githubConnectionSettings> }).items;
        githubConnectionSettings = items?.[0] || null;
      }
      
      if (!githubConnectionSettings) {
        return null;
      }
      
      return githubConnectionSettings.settings?.access_token || 
             githubConnectionSettings.settings?.oauth?.credentials?.access_token || null;
    } catch (error) {
      console.error("Failed to get GitHub access token from Replit connector:", error);
      return null;
    }
  }
  
  function readAppSyncConfig(): AppSyncConfig | null {
    try {
      if (fs.existsSync(APP_SYNC_CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(APP_SYNC_CONFIG_PATH, "utf-8"));
      }
    } catch (error) {
      console.error("Error reading app-sync.config.json:", error);
    }
    return null;
  }

  app.get("/api/app-sync/status", async (req, res) => {
    try {
      const masterKey = process.env.MASTER_TEMPLATE_KEY;
      const isMasterTemplate = typeof masterKey === "string" && masterKey.length > 0;
      
      if (!isMasterTemplate) {
        return res.json({
          available: false,
          reason: "App sync is only available for the master template"
        });
      }
      
      const config = readAppSyncConfig();
      if (!config) {
        return res.json({
          available: false,
          reason: "App sync configuration not found"
        });
      }
      
      // Check if main app repo is accessible (use Replit GitHub connector)
      const githubToken = await getGitHubAccessToken(config.githubConnectionId);
      const headers: Record<string, string> = { "Accept": "application/vnd.github+json" };
      if (githubToken) {
        headers["Authorization"] = `Bearer ${githubToken}`;
      }
      
      const repoResponse = await fetch(
        `https://api.github.com/repos/${config.mainAppRepo}`,
        { headers }
      );
      
      const repoAccessible = repoResponse.ok;
      const hasGithubConnector = githubToken !== null;
      
      // Get last sync timestamp if exists
      const syncLogPath = path.resolve(process.cwd(), ".config/.app-sync-log");
      let lastSync: string | null = null;
      if (fs.existsSync(syncLogPath)) {
        lastSync = fs.readFileSync(syncLogPath, "utf-8").trim();
      }
      
      res.json({
        available: true,
        isMasterTemplate: true,
        mainAppRepo: config.mainAppRepo,
        mainAppBranch: config.mainAppBranch,
        repoAccessible,
        hasGithubConnector,
        syncItems: config.syncItems,
        lastSync
      });
    } catch (error) {
      console.error("App sync status error:", error);
      res.status(500).json({
        available: false,
        reason: "Failed to check app sync status"
      });
    }
  });

  app.post("/api/app-sync/sync", async (req, res) => {
    try {
      const masterKey = process.env.MASTER_TEMPLATE_KEY;
      const isMasterTemplate = typeof masterKey === "string" && masterKey.length > 0;
      
      if (!isMasterTemplate) {
        return res.status(403).json({
          error: "App sync is only available for the master template"
        });
      }
      
      const config = readAppSyncConfig();
      if (!config) {
        return res.status(404).json({
          error: "App sync configuration not found"
        });
      }
      
      const projectRoot = process.cwd();
      const results: Array<{ file: string; status: "success" | "failed" | "deleted"; error?: string }> = [];
      
      // Helper to validate paths don't escape project root
      const isPathSafe = (filePath: string): boolean => {
        const resolved = path.resolve(projectRoot, filePath);
        return resolved.startsWith(projectRoot) && !filePath.includes('..');
      };
      
      // Load manifest of previously synced files
      const manifestPath = path.resolve(projectRoot, ".config/.app-sync-manifest.json");
      let previouslySyncedFiles: string[] = [];
      if (fs.existsSync(manifestPath)) {
        try {
          previouslySyncedFiles = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        } catch {
          previouslySyncedFiles = [];
        }
      }
      
      // Get current sync destinations
      const currentSyncFiles = config.syncItems.map(item => item.to);
      
      // Delete stale files (files that were synced before but are no longer in config)
      if (config.deleteStaleFiles) {
        const staleFiles = previouslySyncedFiles.filter(f => !currentSyncFiles.includes(f));
        for (const staleFile of staleFiles) {
          try {
            if (!isPathSafe(staleFile)) continue;
            const filePath = path.resolve(projectRoot, staleFile);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              results.push({
                file: staleFile,
                status: "deleted"
              });
              console.log(`[App Sync] Deleted stale file: ${staleFile}`);
            }
          } catch (deleteError) {
            console.error(`[App Sync] Failed to delete stale file ${staleFile}:`, deleteError);
          }
        }
      }
      
      // Track successfully synced files for manifest
      const syncedFiles: string[] = [];
      
      for (const item of config.syncItems) {
        try {
          // Validate paths to prevent directory traversal
          if (!isPathSafe(item.to)) {
            results.push({
              file: item.to,
              status: "failed",
              error: "Invalid destination path"
            });
            continue;
          }
          
          // Fetch file from GitHub (use Replit GitHub connector for private repos)
          const githubToken = await getGitHubAccessToken(config.githubConnectionId);
          const fileUrl = `https://api.github.com/repos/${config.mainAppRepo}/contents/${item.from}?ref=${config.mainAppBranch}`;
          const fetchHeaders: Record<string, string> = {
            "Accept": "application/vnd.github.raw+json",
            "Cache-Control": "no-cache"
          };
          if (githubToken) {
            fetchHeaders["Authorization"] = `Bearer ${githubToken}`;
          }
          const response = await fetch(fileUrl, { headers: fetchHeaders });
          
          if (!response.ok) {
            results.push({
              file: item.from,
              status: "failed",
              error: `HTTP ${response.status}: File not found in main app`
            });
            continue;
          }
          
          const content = await response.text();
          
          // Ensure destination directory exists
          const destPath = path.resolve(projectRoot, item.to);
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          
          // Write the file
          fs.writeFileSync(destPath, content, "utf-8");
          syncedFiles.push(item.to);
          
          results.push({
            file: item.to,
            status: "success"
          });
        } catch (itemError) {
          results.push({
            file: item.from,
            status: "failed",
            error: itemError instanceof Error ? itemError.message : "Unknown error"
          });
        }
      }
      
      // Save manifest of synced files for future stale detection
      fs.writeFileSync(manifestPath, JSON.stringify(syncedFiles, null, 2), "utf-8");
      
      // Log the sync
      const syncLogPath = path.resolve(process.cwd(), ".config/.app-sync-log");
      fs.writeFileSync(syncLogPath, new Date().toISOString(), "utf-8");
      
      const successCount = results.filter(r => r.status === "success").length;
      const failedCount = results.filter(r => r.status === "failed").length;
      const deletedCount = results.filter(r => r.status === "deleted").length;
      
      let message = `Synced ${successCount}/${config.syncItems.length} files from main app`;
      if (deletedCount > 0) {
        message += `, deleted ${deletedCount} stale files`;
      }
      
      res.json({
        success: failedCount === 0,
        message,
        results,
        syncedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("App sync error:", error);
      res.status(500).json({
        error: "Failed to sync from main app",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
