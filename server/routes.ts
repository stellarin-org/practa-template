import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as fs from "fs";
import * as path from "path";
import { PassThrough } from "node:stream";
import archiver from "archiver";
import AdmZip from "adm-zip";
import { TEMPLATE_SYNC_CONFIG } from "./template-sync-config";
import { updatePractaAssets } from "./index";
import type { PractaFileMetadata } from "@shared/schema";
import { validateMetadataFields } from "@shared/metadata-schema";
import { fetchRepoInfo, fetchLatestSha, fetchJsonFile, downloadRepoZip, compareVersions, fetchPublishedInfo, fetchRepoPractaMetadata, readLocalMetadata, listPractaFiles, fetchFileContent, TEMPLATE_REPO, PRACTA_REPO, type PublishedPractaInfo } from "./github-sync";
import { bumpMetadataVersion, type ReleaseType } from "../scripts/bump-version";

const METADATA_PATH = path.resolve(process.cwd(), "client/my-practa/metadata.json");
const LAST_SUBMIT_PATH = path.resolve(process.cwd(), ".config/last-submit.json");
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

function validateMetadata(data: unknown): { valid: boolean; errors: string[] } {
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Invalid data format"] };
  }

  const metadata = data as Record<string, unknown>;

  const skipFields: string[] = [];
  if (metadata.author === null && isMasterTemplate()) {
    skipFields.push("author");
  }

  const result = validateMetadataFields(metadata, skipFields);
  const errors = result.errors.map((e) => e.message);

  return { valid: errors.length === 0, errors };
}

function resolveAuthor(): string {
  return process.env.REPL_OWNER || "Anonymous";
}

function isMasterTemplate(): boolean {
  const masterKey = process.env.MASTER_TEMPLATE_KEY;
  return typeof masterKey === "string" && masterKey.length > 0;
}

function readConfig(): PractaFileMetadata | null {
  try {
    if (fs.existsSync(METADATA_PATH)) {
      const content = fs.readFileSync(METADATA_PATH, "utf-8");
      const config = JSON.parse(content);
      if (!config.author && !isMasterTemplate()) {
        config.author = resolveAuthor();
      }
      return config;
    }
  } catch (error) {
    console.error("Error reading metadata.json:", error);
  }
  return null;
}

function writeConfig(updates: Partial<PractaFileMetadata>): boolean {
  try {
    const existing = fs.existsSync(METADATA_PATH)
      ? JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"))
      : {};
    const merged = { ...existing, ...updates };
    fs.writeFileSync(METADATA_PATH, JSON.stringify(merged, null, 2) + "\n");
    return true;
  } catch (error) {
    console.error("Error writing metadata.json:", error);
    return false;
  }
}

function buildManifest(config: PractaFileMetadata): Record<string, unknown> {
  const { id, category, tags, assets, ...rest } = config;
  return {
    ...rest,
    id,
    type: "widget",
    category: category || "wellbeing",
    tags: Array.isArray(tags) && tags.length > 0 ? tags : ["practa", "wellbeing"],
    requiredPermissions: [],
    assets: (assets && typeof assets === "object") ? assets : {},
  };
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
    const existing = readConfig() || {};
    const merged = { ...existing, ...req.body };
    const validation = validateMetadata(merged);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        error: "Validation failed", 
        errors: validation.errors 
      });
    }
    
    if (writeConfig(merged)) {
      const saved = readConfig();
      res.json(saved || req.body);
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
    
    const manifest = config ? buildManifest(config) : null;

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

  app.post("/api/practa/bump-version", async (req, res) => {
    try {
      const { releaseType } = req.body as { releaseType?: string };
      const validTypes: ReleaseType[] = ["major", "minor", "patch"];
      
      if (!releaseType || !validTypes.includes(releaseType as ReleaseType)) {
        return res.status(400).json({ 
          error: "Release type is required. Choose 'major', 'minor', or 'patch'." 
        });
      }

      const bumpResult = bumpMetadataVersion(releaseType as ReleaseType, isMasterTemplate());
      if (!bumpResult.success) {
        return res.status(500).json({ error: `Version bump failed: ${bumpResult.error}` });
      }

      res.json({
        success: true,
        previousVersion: bumpResult.oldVersion,
        newVersion: bumpResult.newVersion,
        releaseType,
        detectedDeps: bumpResult.detectedDeps,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/practa/submit", async (req, res) => {
    const SUBMIT_URL = "https://stellarin-practa-verification.replit.app/api/submissions/upload-preview";
    
    try {
      const { releaseType } = req.body as { releaseType?: string };
      const validTypes: ReleaseType[] = ["major", "minor", "patch"];
      
      if (!releaseType || !validTypes.includes(releaseType as ReleaseType)) {
        return res.status(400).json({ 
          error: "Release type is required. Choose 'major', 'minor', or 'patch'." 
        });
      }

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

      const bumpResult = bumpMetadataVersion(releaseType as ReleaseType);
      if (!bumpResult.success) {
        return res.status(500).json({ error: `Version bump failed: ${bumpResult.error}` });
      }

      const config = readConfig();
      if (!config) {
        return res.status(400).json({ error: "Practa configuration not found" });
      }

      const componentName = config.name.replace(/[^a-zA-Z0-9]/g, "");
      const practaIdSubmit = config.id;

      const manifest = buildManifest(config);

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
        
        const replitEnv = {
          REPLIT_DEV_DOMAIN: process.env.REPLIT_DEV_DOMAIN || null,
          REPLIT_DOMAINS: process.env.REPLIT_DOMAINS || null,
          REPLIT_USER: process.env.REPLIT_USER || null,
          REPLIT_USERID: process.env.REPLIT_USERID || null,
          generatedAt: new Date().toISOString(),
        };

        archive.glob("**/*", {
          cwd: practaDir,
          ignore: ["metadata.json", "README.md", "replit.json"],
        });
        archive.append(JSON.stringify(manifest, null, 2), { name: "metadata.json" });
        archive.append(readme, { name: "README.md" });
        archive.append(JSON.stringify(replitEnv, null, 2), { name: "replit.json" });
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
          version: config.version,
          releaseType,
          previousVersion: bumpResult.oldVersion,
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

  app.get("/api/practa/published-info/:slug", async (req, res) => {
    const { slug } = req.params;
    try {
      const info = await fetchPublishedInfo(slug);
      if (!info) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json(info);
    } catch (error) {
      console.error("Error fetching published info:", error);
      res.status(500).json({ error: "Failed to fetch published info" });
    }
  });

  app.get("/api/practa/sync-status", async (req, res) => {
    try {
      const localMetadata = readLocalMetadata();
      const slug = localMetadata?.id as string;
      
      if (!slug) {
        return res.json({
          hasLocalPracta: true,
          isPublished: false,
          repoAvailable: false,
          slug: null,
        });
      }
      
      const localVersion = (localMetadata?.version as string) || "0.0.0";
      
      const [publishedInfo, repoMetadata] = await Promise.all([
        fetchPublishedInfo(slug),
        fetchRepoPractaMetadata(slug),
      ]);
      
      const repoVersion = repoMetadata ? (repoMetadata.version as string) || null : null;
      
      const publishedVersion = publishedInfo?.version || null;
      const isPublished = !!publishedInfo;
      
      const hasNewerPublished = publishedVersion ? compareVersions(publishedVersion, localVersion) > 0 : false;
      const hasNewerInRepo = repoVersion ? compareVersions(repoVersion, localVersion) > 0 : false;
      const localIsAhead = publishedVersion ? compareVersions(localVersion, publishedVersion) > 0 : false;
      
      res.json({
        hasLocalPracta: true,
        slug,
        localVersion,
        isPublished,
        publishedVersion,
        publishedAt: publishedInfo?.publishedAt || null,
        publishedEntry: publishedInfo,
        hasNewerPublished,
        localIsAhead,
        repoVersion,
        hasNewerInRepo,
        repoAvailable: !!repoMetadata,
        repoUrl: `https://github.com/stellarin-org/stellarin-practa/tree/main/practas/${slug}`,
      });
    } catch (error) {
      console.error("Practa sync status error:", error);
      res.json({
        hasLocalPracta: true,
        isPublished: false,
        repoAvailable: false,
        slug: null,
        error: "Failed to check sync status",
      });
    }
  });

  const TEXT_EXTENSIONS = new Set([".tsx", ".ts", ".json", ".txt", ".md", ".js", ".jsx", ".css"]);
  const BINARY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".mp3", ".wav", ".mp4", ".webm", ".m4a", ".ogg", ".mov"]);

  app.post("/api/practa/sync", async (req, res) => {
    try {
      const localMetadata = readLocalMetadata();
      const slug = localMetadata?.id as string;
      
      if (!slug) {
        return res.status(400).json({ error: "No Practa ID found in local metadata.json" });
      }
      
      const repoFiles = await listPractaFiles(slug);
      if (!repoFiles || repoFiles.length === 0) {
        return res.status(404).json({ error: `Practa "${slug}" not found in repository` });
      }
      
      const practaDir = path.resolve(process.cwd(), "client/my-practa");
      const assetsDir = path.join(practaDir, "assets");
      
      if (!fs.existsSync(practaDir)) {
        fs.mkdirSync(practaDir, { recursive: true });
      }
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      
      const updatedFiles: string[] = [];
      const errors: string[] = [];

      async function downloadFile(filePath: string, destPath: string, fileName: string, displayName: string) {
        const ext = path.extname(fileName).toLowerCase();
        const isText = TEXT_EXTENSIONS.has(ext);
        const isBinary = BINARY_EXTENSIONS.has(ext);

        if (isText || (!isBinary && !ext)) {
          const content = await fetchFileContent(PRACTA_REPO, filePath);
          if (content !== null) {
            fs.writeFileSync(destPath, content);
            updatedFiles.push(displayName);
          }
        } else {
          const rawUrl = `https://raw.githubusercontent.com/${PRACTA_REPO}/main/${filePath}`;
          const resp = await fetch(rawUrl);
          if (resp.ok) {
            const arrayBuf = await resp.arrayBuffer();
            fs.writeFileSync(destPath, Buffer.from(arrayBuf));
            updatedFiles.push(displayName);
          }
        }
      }
      
      for (const file of repoFiles) {
        if (file.type === "dir") {
          const subFiles = await listPractaFiles(`${slug}/${file.name}`);
          if (subFiles) {
            const subDir = path.join(practaDir, file.name);
            if (!fs.existsSync(subDir)) {
              fs.mkdirSync(subDir, { recursive: true });
            }
            for (const subFile of subFiles) {
              if (subFile.type !== "file") continue;
              try {
                await downloadFile(subFile.path, path.join(subDir, subFile.name), subFile.name, `${file.name}/${subFile.name}`);
              } catch (e) {
                errors.push(`Failed to fetch ${file.name}/${subFile.name}`);
              }
            }
          }
          continue;
        }
        
        if (file.type !== "file") continue;
        
        try {
          await downloadFile(file.path, path.join(practaDir, file.name), file.name, file.name);
        } catch (e) {
          errors.push(`Failed to fetch ${file.name}`);
        }
      }
      
      const { updatePractaAssets } = await import("./index");
      updatePractaAssets();
      
      const missingPackages: string[] = [];
      try {
        const newMetadata = readLocalMetadata();
        const deps = (newMetadata?.dependencies as string[]) || [];
        if (deps.length > 0) {
          const packageJsonPath = path.resolve(process.cwd(), "package.json");
          if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
            const installed = { ...packageJson.dependencies, ...packageJson.devDependencies };
            for (const pkg of deps) {
              if (!installed[pkg]) {
                missingPackages.push(pkg);
              }
            }
          }
        }
      } catch {}
      
      const syncResponse: Record<string, unknown> = {
        success: true,
        updatedFiles,
        errors: errors.length > 0 ? errors : undefined,
        message: errors.length > 0
          ? `Synced ${updatedFiles.length} files with ${errors.length} errors`
          : `Successfully synced ${updatedFiles.length} files from repository`,
      };
      
      if (missingPackages.length > 0) {
        syncResponse.missingPackages = missingPackages;
        syncResponse.installCommand = `npx expo install ${missingPackages.join(" ")}`;
      }
      
      res.json(syncResponse);
    } catch (error) {
      console.error("Practa sync error:", error);
      res.status(500).json({
        error: "Failed to sync Practa",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/template/sync-status", async (req, res) => {
    try {
      // Check if this is the master template by looking for the MASTER_TEMPLATE_KEY secret
      // Forks/copies of this template will NOT have this secret
      const masterKey = process.env.MASTER_TEMPLATE_KEY;
      const isMasterTemplate = typeof masterKey === "string" && masterKey.length > 0;
      
      const repoInfo = await fetchRepoInfo(TEMPLATE_REPO);
      
      if (!repoInfo || !repoInfo.available) {
        return res.json({
          isInSync: true,
          localVersion: null,
          latestVersion: null,
          repoUrl: `https://github.com/${TEMPLATE_REPO}`,
          repoAvailable: false,
          isMasterTemplate,
        });
      }
      
      const defaultBranch = repoInfo.defaultBranch;
      
      const latestSha = await fetchLatestSha(TEMPLATE_REPO, defaultBranch);
      
      if (!latestSha) {
        return res.json({
          isInSync: true,
          localVersion: null,
          latestVersion: null,
          repoUrl: `https://github.com/${TEMPLATE_REPO}`,
          repoAvailable: false,
          isMasterTemplate,
        });
      }
      
      // Get local template version from app.json
      let localTemplateVersion = "1.0.0";
      const appJsonPath = path.resolve(process.cwd(), "app.json");
      try {
        if (fs.existsSync(appJsonPath)) {
          const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
          localTemplateVersion = appJson.expo?.version || "1.0.0";
        }
      } catch {}
      
      let latestTemplateVersion = localTemplateVersion;
      try {
        const remoteAppJson = await fetchJsonFile<{ expo?: { version?: string } }>(TEMPLATE_REPO, "app.json", defaultBranch);
        if (remoteAppJson) {
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
      const repoInfo = await fetchRepoInfo(TEMPLATE_REPO);
      
      if (!repoInfo || !repoInfo.available) {
        return res.status(500).json({ 
          error: "Template repository not available" 
        });
      }
      
      const defaultBranch = repoInfo.defaultBranch;
      
      const latestSha = await fetchLatestSha(TEMPLATE_REPO, defaultBranch);
      
      if (!latestSha) {
        return res.status(500).json({ 
          error: "Failed to fetch template info" 
        });
      }
      
      const zipBuffer = await downloadRepoZip(TEMPLATE_REPO, defaultBranch);
      
      if (!zipBuffer) {
        return res.status(500).json({ 
          error: "Failed to download template" 
        });
      }
      
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
      const previousSha = fs.existsSync(syncFilePath) 
        ? fs.readFileSync(syncFilePath, "utf-8").trim() 
        : null;
      fs.writeFileSync(syncFilePath, latestSha);
      
      // Delete deprecated files that were removed from the template
      const FILES_TO_DELETE = TEMPLATE_SYNC_CONFIG.filesToDelete || [];
      for (const fileToDelete of FILES_TO_DELETE) {
        const filePath = path.join(projectRoot, fileToDelete);
        if (fs.existsSync(filePath)) {
          console.log(`[Template Update] Deleting deprecated file: ${fileToDelete}`);
          fs.unlinkSync(filePath);
        }
      }
      
      // Regenerate practa-assets.ts to reflect any changes in demo-practa
      console.log("[Template Update] Regenerating practa-assets.ts...");
      updatePractaAssets();
      
      // Check for missing required packages
      const missingPackages: string[] = [];
      const templatePackages = TEMPLATE_SYNC_CONFIG.requiredPackages || [];
      
      // Also check Practa-level dependencies from metadata.json
      let practaPackages: string[] = [];
      try {
        const practaMetadataPath = path.join(projectRoot, "client/my-practa/metadata.json");
        if (fs.existsSync(practaMetadataPath)) {
          const practaMetadata = JSON.parse(fs.readFileSync(practaMetadataPath, "utf-8"));
          if (Array.isArray(practaMetadata.dependencies)) {
            practaPackages = practaMetadata.dependencies;
          }
        }
      } catch (e) {
        console.error("[Template Update] Error reading Practa dependencies:", e);
      }
      
      // Merge template and Practa requirements (deduplicated)
      const allRequiredPackages = [...new Set([...templatePackages, ...practaPackages])];
      
      if (allRequiredPackages.length > 0) {
        try {
          const packageJsonPath = path.join(projectRoot, "package.json");
          if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
            const installedDeps = {
              ...packageJson.dependencies,
              ...packageJson.devDependencies,
            };
            
            for (const pkg of allRequiredPackages) {
              if (!installedDeps[pkg]) {
                missingPackages.push(pkg);
                console.log(`[Template Update] Missing required package: ${pkg}`);
              }
            }
          }
        } catch (e) {
          console.error("[Template Update] Error checking packages:", e);
        }
      }
      
      const response: {
        success: boolean;
        updatedTo: string;
        previousSha: string | null;
        repoName: string;
        message: string;
        missingPackages?: string[];
        installCommand?: string;
      } = {
        success: true,
        updatedTo: latestSha,
        previousSha: previousSha !== latestSha ? previousSha : null,
        repoName: TEMPLATE_REPO,
        message: missingPackages.length > 0
          ? `Template updated. Install missing packages: ${missingPackages.join(", ")}`
          : "Template updated successfully. Restart the app to see changes."
      };
      
      if (missingPackages.length > 0) {
        response.missingPackages = missingPackages;
        response.installCommand = `npx expo install ${missingPackages.join(" ")}`;
      }
      
      res.json(response);
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
  // HARNESS IMPORT ROUTES (Master Template Only)
  // Imports critical files from main Stellarin app
  // Uses Replit GitHub connector for authentication
  // ============================================
  
  const HARNESS_IMPORT_CONFIG_PATH = path.resolve(process.cwd(), ".config/harness-import.config.json");
  
  interface HarnessImportConfig {
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
  
  function readHarnessImportConfig(): HarnessImportConfig | null {
    try {
      if (fs.existsSync(HARNESS_IMPORT_CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(HARNESS_IMPORT_CONFIG_PATH, "utf-8"));
      }
    } catch (error) {
      console.error("Error reading harness-import.config.json:", error);
    }
    return null;
  }

  app.get("/api/harness-import/status", async (req, res) => {
    try {
      const masterKey = process.env.MASTER_TEMPLATE_KEY;
      const isMasterTemplate = typeof masterKey === "string" && masterKey.length > 0;
      
      if (!isMasterTemplate) {
        return res.json({
          available: false,
          reason: "Harness import is only available for the master template"
        });
      }
      
      const config = readHarnessImportConfig();
      if (!config) {
        return res.json({
          available: false,
          reason: "Harness import configuration not found"
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
      const syncLogPath = path.resolve(process.cwd(), ".config/.harness-import-log");
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
      console.error("Harness import status error:", error);
      res.status(500).json({
        available: false,
        reason: "Failed to check harness import status"
      });
    }
  });

  app.post("/api/harness-import/sync", async (req, res) => {
    try {
      const masterKey = process.env.MASTER_TEMPLATE_KEY;
      const isMasterTemplate = typeof masterKey === "string" && masterKey.length > 0;
      
      if (!isMasterTemplate) {
        return res.status(403).json({
          error: "Harness import is only available for the master template"
        });
      }
      
      const config = readHarnessImportConfig();
      if (!config) {
        return res.status(404).json({
          error: "Harness import configuration not found"
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
      const manifestPath = path.resolve(projectRoot, ".config/.harness-import-manifest.json");
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
              console.log(`[Harness Import] Deleted stale file: ${staleFile}`);
            }
          } catch (deleteError) {
            console.error(`[Harness Import] Failed to delete stale file ${staleFile}:`, deleteError);
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
      const syncLogPath = path.resolve(process.cwd(), ".config/.harness-import-log");
      fs.writeFileSync(syncLogPath, new Date().toISOString(), "utf-8");
      
      const successCount = results.filter(r => r.status === "success").length;
      const failedCount = results.filter(r => r.status === "failed").length;
      const deletedCount = results.filter(r => r.status === "deleted").length;
      
      let message = `Imported ${successCount}/${config.syncItems.length} files from main app`;
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
      console.error("Harness import error:", error);
      res.status(500).json({
        error: "Failed to import from main app",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
