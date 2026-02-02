import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import {
  bumpMetadataPatch,
  bumpTemplateVersion,
  getLastProcessedCommit,
  setLastProcessedCommit,
  getLastProcessedTemplateCommit,
  setLastProcessedTemplateCommit,
  getCurrentCommitSha,
} from "../scripts/bump-version";
import { TEMPLATE_SYNC_CONFIG } from "./template-sync-config";

interface PractaAssetEntry {
  id: string;
  relativePath: string;
  assets: Record<string, string>;
}

/**
 * Normalize asset path to just the filename.
 * Handles common user mistakes:
 * - "assets/splash.png" → "splash.png"
 * - "./assets/splash.png" → "splash.png"
 * - "  splash.png  " → "splash.png"
 * - "/assets/splash.png" → "splash.png"
 * - "././assets/foo.png" → "foo.png"
 * Returns empty string for invalid paths (e.g., just "assets/" or "./")
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

function discoverPractas(): PractaAssetEntry[] {
  const practas: PractaAssetEntry[] = [];
  
  // my-practa
  const myPractaPath = path.join(process.cwd(), "client/my-practa/metadata.json");
  if (fs.existsSync(myPractaPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(myPractaPath, "utf-8"));
      practas.push({
        id: "my-practa", // Always use "my-practa" as key - this matches practa.type in FlowScreen
        relativePath: "../my-practa",
        assets: metadata.assets || {},
      });
    } catch (error) {
      console.error("[Assets] Failed to read my-practa metadata:", error);
    }
  }
  
  // demo-practa directories
  const demoPractaDir = path.join(process.cwd(), "client/demo-practa");
  if (fs.existsSync(demoPractaDir)) {
    const entries = fs.readdirSync(demoPractaDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metadataPath = path.join(demoPractaDir, entry.name, "metadata.json");
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
            practas.push({
              id: metadata.id || entry.name,
              relativePath: `../demo-practa/${entry.name}`,
              assets: metadata.assets || {},
            });
          } catch (error) {
            console.error(`[Assets] Failed to read ${entry.name} metadata:`, error);
          }
        }
      }
    }
  }
  
  return practas;
}

export function updatePractaAssets() {
  const outputPath = path.join(process.cwd(), "client/lib/practa-assets.ts");
  const practas = discoverPractas();
  
  const registryEntries: string[] = [];
  let totalAssets = 0;
  
  for (const practa of practas) {
    const assetLines: string[] = [];
    const assetsDir = path.join(process.cwd(), `client/${practa.relativePath.replace("../", "")}/assets`);
    
    for (const [key, rawFilename] of Object.entries(practa.assets)) {
      // Normalize the path to handle common user mistakes
      const filename = normalizeAssetPath(rawFilename);
      
      // Guard against empty paths (e.g., just "assets/" or "./")
      if (!filename) {
        console.warn(`[Assets] ${practa.id}: Invalid path for key "${key}" - normalized to empty (original: "${rawFilename}")`);
        continue;
      }
      
      const assetPath = path.join(assetsDir, filename);
      
      // Check file exists and is actually a file (not a directory)
      if (fs.existsSync(assetPath)) {
        try {
          const stat = fs.statSync(assetPath);
          if (stat.isFile()) {
            // If splash key points to a video file, register as splashVideo
            const ext = path.extname(filename).toLowerCase();
            const isVideoFile = [".mp4", ".webm", ".mov"].includes(ext);
            const registryKey = key === "splash" && isVideoFile ? "splashVideo" : key;
            
            assetLines.push(`    ${registryKey}: require("${practa.relativePath}/assets/${filename}"),`);
            totalAssets++;
          } else {
            console.warn(`[Assets] ${practa.id}: Path "${filename}" for key "${key}" is a directory, not a file`);
          }
        } catch {
          console.warn(`[Assets] ${practa.id}: Could not stat "${filename}" for key "${key}"`);
        }
      } else {
        console.warn(`[Assets] ${practa.id}: Missing file "${filename}" for key "${key}" (original: "${rawFilename}")`);
      }
    }
    
    if (assetLines.length > 0) {
      registryEntries.push(`  "${practa.id}": {\n${assetLines.join("\n")}\n  },`);
    } else {
      registryEntries.push(`  "${practa.id}": {},`);
    }
  }
  
  const registryBlock = registryEntries.join("\n");
  
  const newContent = `/**
 * Local Asset Resolver for Development
 * 
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * This file is regenerated on server startup.
 * 
 * Assets are discovered from each practa's metadata.json file:
 * - client/my-practa/metadata.json
 * - client/demo-practa/[name]/metadata.json
 * 
 * To add/remove assets, update the "assets" section in metadata.json.
 * Only assets that exist on disk will be included.
 * 
 * In production (Stellarin), assets are provided via CDN URLs through context.
 */

import { ImageSourcePropType } from "react-native";
import { ResolvedAssets } from "@/types/flow";

type AssetSource = number | { uri: string };

const assetRegistry: Record<string, Record<string, AssetSource>> = {
${registryBlock}
};

export function resolveAssets(practaId: string = "my-practa"): ResolvedAssets {
  const assets = assetRegistry[practaId];
  return assets ? { ...assets } : {};
}

export function hasSplash(practaId: string = "my-practa"): boolean {
  const assets = assetRegistry[practaId];
  return assets ? ("splash" in assets || "splashVideo" in assets) : false;
}

export function isSplashVideo(practaId: string = "my-practa"): boolean {
  const assets = assetRegistry[practaId];
  return assets ? "splashVideo" in assets : false;
}

export function getSplashSource(practaId: string = "my-practa"): ImageSourcePropType | null {
  const assets = assetRegistry[practaId];
  if (assets && "splash" in assets) {
    return assets.splash as ImageSourcePropType;
  }
  return null;
}

export function getSplashVideoSource(practaId: string = "my-practa"): number | { uri: string } | null {
  const assets = assetRegistry[practaId];
  if (assets && "splashVideo" in assets) {
    return assets.splashVideo as number | { uri: string };
  }
  return null;
}
`;

  try {
    const existingContent = fs.existsSync(outputPath) 
      ? fs.readFileSync(outputPath, "utf-8") 
      : "";
    
    if (existingContent !== newContent) {
      fs.writeFileSync(outputPath, newContent);
      console.log(`[Assets] Updated practa-assets.ts: ${practas.length} practa(s), ${totalAssets} asset(s)`);
    }
  } catch (error) {
    console.error("[Assets] Failed to update practa-assets.ts:", error);
  }
}

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d: string) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    if (origin && origins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "50mb" }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    res.status(status).json({ message });

    throw err;
  });
}

function startGitVersionWatcher() {
  const gitHeadPath = path.resolve(process.cwd(), ".git/HEAD");
  const gitLogsHeadPath = path.resolve(process.cwd(), ".git/logs/HEAD");
  
  if (!fs.existsSync(gitHeadPath)) {
    log("[Version Watcher] No .git directory found, skipping auto-version");
    return;
  }

  // Check if this is the master template
  const masterKey = process.env.MASTER_TEMPLATE_KEY;
  const isMasterTemplate = typeof masterKey === "string" && masterKey.length > 0;

  const checkAndBumpPracta = () => {
    const currentSha = getCurrentCommitSha();
    if (!currentSha) return;

    const lastProcessed = getLastProcessedCommit();
    
    if (!lastProcessed) {
      log(`[Version Watcher] Initializing Practa commit tracking at ${currentSha.slice(0, 7)}`);
      setLastProcessedCommit(currentSha);
      return;
    }
    
    if (currentSha === lastProcessed) return;

    log(`[Version Watcher] New commit detected: ${currentSha.slice(0, 7)}`);
    const result = bumpMetadataPatch();
    
    if (result.success) {
      setLastProcessedCommit(currentSha);
    } else if (result.error) {
      log(`[Version Watcher] Practa bump failed: ${result.error}`);
    }
  };

  const checkAndBumpTemplate = () => {
    if (!isMasterTemplate) return;

    const currentSha = getCurrentCommitSha();
    if (!currentSha) return;

    const lastProcessed = getLastProcessedTemplateCommit();
    
    if (!lastProcessed) {
      log(`[Version Watcher] Initializing Template commit tracking at ${currentSha.slice(0, 7)}`);
      setLastProcessedTemplateCommit(currentSha);
      return;
    }
    
    if (currentSha === lastProcessed) return;

    const result = bumpTemplateVersion();
    
    if (result.success) {
      setLastProcessedTemplateCommit(currentSha);
    } else if (result.error) {
      log(`[Version Watcher] Template bump failed: ${result.error}`);
    }
  };

  const checkAndBump = () => {
    checkAndBumpPracta();
    checkAndBumpTemplate();
  };

  checkAndBump();

  const watchPath = fs.existsSync(gitLogsHeadPath) ? gitLogsHeadPath : gitHeadPath;
  
  try {
    fs.watch(watchPath, { persistent: false }, (eventType) => {
      if (eventType === "change") {
        setTimeout(checkAndBump, 100);
      }
    });
    const watchTypes = isMasterTemplate ? "Practa + Template versions" : "Practa version";
    log(`[Version Watcher] Watching for commits to auto-increment ${watchTypes}`);
  } catch (error) {
    log("[Version Watcher] Could not start watcher:", error);
  }
}

/**
 * Check for missing dependencies on startup and auto-install them.
 * Combines template-level requirements with Practa-level dependencies.
 */
function checkAndInstallDependencies(): void {
  const projectRoot = process.cwd();
  
  // Get template-level required packages
  const templatePackages = (TEMPLATE_SYNC_CONFIG as { requiredPackages?: string[] }).requiredPackages || [];
  
  // Get Practa-level dependencies from metadata.json
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
    log("[Dependency Check] Error reading Practa dependencies:", e);
  }
  
  // Merge and deduplicate
  const allRequiredPackages = [...new Set([...templatePackages, ...practaPackages])];
  
  if (allRequiredPackages.length === 0) {
    return;
  }
  
  // Check which packages are missing
  const missingPackages: string[] = [];
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
        }
      }
    }
  } catch (e) {
    log("[Dependency Check] Error checking packages:", e);
    return;
  }
  
  if (missingPackages.length === 0) {
    log("[Dependency Check] All required packages are installed");
    return;
  }
  
  // Auto-install missing packages
  log(`[Dependency Check] Installing missing packages: ${missingPackages.join(", ")}`);
  try {
    const installCmd = `npx expo install ${missingPackages.join(" ")}`;
    execSync(installCmd, { 
      stdio: "inherit",
      cwd: projectRoot,
    });
    log("[Dependency Check] Successfully installed missing packages");
  } catch (e) {
    log("[Dependency Check] Failed to install packages:", e);
  }
}

(async () => {
  updatePractaAssets();
  checkAndInstallDependencies();
  
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  startGitVersionWatcher();

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
      
      // Warmup Expo bundle with retries to ensure Metro is ready
      const warmupExpo = (attempt: number = 1, maxAttempts: number = 5) => {
        const expoPort = 8081;
        fetch(`http://localhost:${expoPort}/`)
          .then(() => log("[Warmup] Expo bundle triggered successfully"))
          .catch(() => {
            if (attempt < maxAttempts) {
              setTimeout(() => warmupExpo(attempt + 1, maxAttempts), 2000);
            }
          });
      };
      setTimeout(() => warmupExpo(), 5000);
    },
  );
})();
