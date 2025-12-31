import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Network from "expo-network";
import { Platform } from "react-native";
import { PractaAssets, PractaAssetValue } from "@/types/flow";
import { getApiUrl } from "@/lib/query-client";

const CACHE_MANIFEST_KEY = "community_practa_cache_manifest";
const CACHE_DIR = `${FileSystem.documentDirectory}practa-cache/`;
const MAX_CACHE_SIZE_MB = 250;

const CDN_BASE = "https://stellarin-practa-verification.replit.app/";

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "json"]);
const ALLOWED_CDN_HOSTS = new Set([
  "stellarin-practa-verification.replit.app",
]);

export interface AssetValidationError {
  key: string;
  url: string;
  reason: string;
}

export function validateAssetUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    
    if (parsed.protocol !== "https:") {
      return { valid: false, reason: "Only HTTPS URLs are allowed" };
    }
    
    if (!ALLOWED_CDN_HOSTS.has(parsed.hostname)) {
      return { valid: false, reason: `Host ${parsed.hostname} is not in the allow-list` };
    }
    
    const pathname = parsed.pathname;
    if (pathname.includes("..") || pathname.includes("//")) {
      return { valid: false, reason: "Path traversal detected" };
    }
    
    const ext = pathname.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return { valid: false, reason: `Extension .${ext} is not allowed` };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, reason: "Invalid URL format" };
  }
}

export function validateAssetKey(key: string): { valid: boolean; reason?: string } {
  if (key.includes("..") || key.includes("/") || key.includes("\\")) {
    return { valid: false, reason: "Path traversal characters detected in key" };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    return { valid: false, reason: "Key contains invalid characters (allowed: a-z, A-Z, 0-9, _, -)" };
  }
  
  if (key.length > 64) {
    return { valid: false, reason: "Key exceeds maximum length of 64 characters" };
  }
  
  return { valid: true };
}

export function validateAssets(
  assets: Record<string, string>
): { valid: boolean; errors: AssetValidationError[] } {
  const errors: AssetValidationError[] = [];
  
  for (const [key, url] of Object.entries(assets)) {
    const keyValidation = validateAssetKey(key);
    if (!keyValidation.valid) {
      errors.push({ key, url, reason: keyValidation.reason! });
      continue;
    }
    
    const urlValidation = validateAssetUrl(url);
    if (!urlValidation.valid) {
      errors.push({ key, url, reason: urlValidation.reason! });
    }
  }
  
  return { valid: errors.length === 0, errors };
}

function getProxiedUrl(cdnUrl: string): string {
  if (Platform.OS !== "web") {
    return cdnUrl;
  }
  if (!cdnUrl.startsWith(CDN_BASE)) {
    return cdnUrl;
  }
  const path = cdnUrl.replace(CDN_BASE, "");
  const baseUrl = getApiUrl().replace(/\/$/, "");
  return `${baseUrl}/api/practa-assets/${path}`;
}

export interface CachedAssetEntry {
  localPath: string;
  originalUrl: string;
  extension: string;
}

export interface CachedPractaManifest {
  buildId: string;
  cachedAt: string;
  lastUsedAt: string;
  assets: Record<string, CachedAssetEntry>;
  totalSizeBytes: number;
}

export interface CacheManifest {
  [slug: string]: CachedPractaManifest;
}

let manifestCache: CacheManifest | null = null;
let jsonCache: Record<string, unknown> = {};

async function ensureCacheDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function loadManifest(): Promise<CacheManifest> {
  if (manifestCache !== null) {
    return manifestCache;
  }

  try {
    const data = await AsyncStorage.getItem(CACHE_MANIFEST_KEY);
    if (data) {
      manifestCache = JSON.parse(data);
      return manifestCache!;
    }
  } catch (e) {
    console.warn("[AssetCache] Failed to load manifest:", e);
  }

  manifestCache = {};
  return manifestCache;
}

async function saveManifest(): Promise<void> {
  if (manifestCache === null) return;

  try {
    await AsyncStorage.setItem(CACHE_MANIFEST_KEY, JSON.stringify(manifestCache));
  } catch (e) {
    console.warn("[AssetCache] Failed to save manifest:", e);
  }
}

function getExtension(url: string): string {
  const pathname = new URL(url).pathname;
  const ext = pathname.split(".").pop()?.toLowerCase() || "";
  return ext;
}

function isJsonAsset(extension: string): boolean {
  return extension === "json";
}

function isImageAsset(extension: string): boolean {
  return ["png", "jpg", "jpeg", "gif", "webp"].includes(extension);
}

export async function checkNetworkAvailable(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

export async function isPractaCached(slug: string, buildId: string): Promise<boolean> {
  const manifest = await loadManifest();
  const entry = manifest[slug];
  
  if (!entry) return false;
  if (entry.buildId !== buildId) return false;
  
  const assetPaths = Object.values(entry.assets).map(a => a.localPath);
  for (const path of assetPaths) {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return false;
  }
  
  return true;
}

export async function getCachedBuildId(slug: string): Promise<string | null> {
  const manifest = await loadManifest();
  return manifest[slug]?.buildId || null;
}

async function downloadAsset(url: string, localPath: string): Promise<void> {
  const dir = localPath.substring(0, localPath.lastIndexOf("/"));
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const downloadResult = await FileSystem.downloadAsync(url, localPath);
  
  if (downloadResult.status !== 200) {
    throw new Error(`Download failed with status ${downloadResult.status}`);
  }
}

export async function cachePractaAssets(
  slug: string,
  buildId: string,
  assets: Record<string, string>
): Promise<void> {
  const validation = validateAssets(assets);
  if (!validation.valid) {
    const errorMessages = validation.errors.map(e => `${e.key}: ${e.reason}`).join("; ");
    console.error(`[AssetCache] Security validation failed for ${slug}: ${errorMessages}`);
    throw new Error(`Asset validation failed: ${errorMessages}`);
  }
  
  await ensureCacheDir();
  
  const practaDir = `${CACHE_DIR}${slug}/${buildId}/`;
  const cachedAssets: Record<string, CachedAssetEntry> = {};
  let totalSize = 0;

  for (const [key, url] of Object.entries(assets)) {
    const extension = getExtension(url);
    const filename = `${key}.${extension}`;
    const localPath = `${practaDir}${filename}`;

    try {
      await downloadAsset(url, localPath);
      
      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists && info.size) {
        totalSize += info.size;
      }

      cachedAssets[key] = {
        localPath,
        originalUrl: url,
        extension,
      };
    } catch (e) {
      console.warn(`[AssetCache] Failed to download ${key} for ${slug}:`, e);
      throw e;
    }
  }

  const manifest = await loadManifest();
  
  if (manifest[slug] && manifest[slug].buildId !== buildId) {
    await cleanupOldVersion(slug, manifest[slug].buildId);
  }

  manifest[slug] = {
    buildId,
    cachedAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    assets: cachedAssets,
    totalSizeBytes: totalSize,
  };

  manifestCache = manifest;
  await saveManifest();
  
  await pruneIfNeeded();
}

async function cleanupOldVersion(slug: string, oldBuildId: string): Promise<void> {
  const oldDir = `${CACHE_DIR}${slug}/${oldBuildId}/`;
  try {
    const info = await FileSystem.getInfoAsync(oldDir);
    if (info.exists) {
      await FileSystem.deleteAsync(oldDir, { idempotent: true });
    }
  } catch (e) {
    console.warn(`[AssetCache] Failed to cleanup old version for ${slug}:`, e);
  }
}

async function pruneIfNeeded(): Promise<void> {
  const manifest = await loadManifest();
  
  let totalBytes = 0;
  for (const entry of Object.values(manifest)) {
    totalBytes += entry.totalSizeBytes || 0;
  }

  const maxBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
  
  if (totalBytes <= maxBytes) return;

  const entries = Object.entries(manifest).sort((a, b) => {
    const aTime = new Date(a[1].lastUsedAt).getTime();
    const bTime = new Date(b[1].lastUsedAt).getTime();
    return aTime - bTime;
  });

  while (totalBytes > maxBytes && entries.length > 0) {
    const [slug, entry] = entries.shift()!;
    
    try {
      const dir = `${CACHE_DIR}${slug}/`;
      await FileSystem.deleteAsync(dir, { idempotent: true });
      totalBytes -= entry.totalSizeBytes || 0;
      delete manifest[slug];
    } catch (e) {
      console.warn(`[AssetCache] Failed to prune ${slug}:`, e);
    }
  }

  manifestCache = manifest;
  await saveManifest();
}

async function updateLastUsed(slug: string): Promise<void> {
  const manifest = await loadManifest();
  if (manifest[slug]) {
    manifest[slug].lastUsedAt = new Date().toISOString();
    manifestCache = manifest;
    await saveManifest();
  }
}

async function loadJsonAsset(localPath: string, cacheKey: string): Promise<unknown> {
  if (jsonCache[cacheKey]) {
    return jsonCache[cacheKey];
  }

  try {
    const content = await FileSystem.readAsStringAsync(localPath);
    const parsed = JSON.parse(content);
    jsonCache[cacheKey] = parsed;
    return parsed;
  } catch (e) {
    console.warn(`[AssetCache] Failed to load JSON from ${localPath}:`, e);
    throw e;
  }
}

export async function resolveAssetsFromCache(
  slug: string,
  buildId: string,
  registryAssets: Record<string, string>
): Promise<{ assets: PractaAssets; isCached: boolean; needsDownload: boolean }> {
  const validation = validateAssets(registryAssets);
  if (!validation.valid) {
    const errorMessages = validation.errors.map(e => `${e.key}: ${e.reason}`).join("; ");
    console.error(`[AssetCache] Security validation failed for ${slug}: ${errorMessages}`);
    throw new Error(`Asset validation failed: ${errorMessages}`);
  }
  
  const manifest = await loadManifest();
  const cached = manifest[slug];

  if (cached && cached.buildId === buildId) {
    let allFilesExist = true;
    for (const entry of Object.values(cached.assets)) {
      const info = await FileSystem.getInfoAsync(entry.localPath);
      if (!info.exists) {
        allFilesExist = false;
        break;
      }
    }

    if (allFilesExist) {
      await updateLastUsed(slug);
      
      const resolved: PractaAssets = {};
      
      for (const [key, entry] of Object.entries(cached.assets)) {
        if (isJsonAsset(entry.extension)) {
          const cacheKey = `${slug}:${buildId}:${key}`;
          resolved[key] = await loadJsonAsset(entry.localPath, cacheKey) as PractaAssetValue;
        } else if (isImageAsset(entry.extension)) {
          resolved[key] = { uri: entry.localPath };
        } else {
          resolved[key] = { uri: entry.localPath };
        }
      }

      addSplashAlias(resolved, registryAssets, slug);
      
      return { assets: resolved, isCached: true, needsDownload: false };
    }
  }

  const resolved: PractaAssets = {};
  for (const [key, url] of Object.entries(registryAssets)) {
    const extension = getExtension(url);
    const fetchUrl = getProxiedUrl(url);
    
    if (isJsonAsset(extension)) {
      try {
        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        if (response.ok) {
          const parsed = await response.json();
          const cacheKey = `${slug}:${buildId}:${key}`;
          jsonCache[cacheKey] = parsed;
          resolved[key] = parsed as PractaAssetValue;
        } else {
          console.warn(`[AssetCache] JSON fetch failed for ${key}: ${response.status} ${response.statusText}`);
          resolved[key] = [] as unknown as PractaAssetValue;
        }
      } catch (e) {
        console.warn(`[AssetCache] Failed to fetch JSON ${key}:`, e);
        resolved[key] = [] as unknown as PractaAssetValue;
      }
    } else {
      resolved[key] = { uri: Platform.OS === "web" ? fetchUrl : url };
    }
  }
  
  addSplashAlias(resolved, registryAssets, slug);

  return { assets: resolved, isCached: false, needsDownload: true };
}

function addSplashAlias(resolved: PractaAssets, registryAssets: Record<string, string>, slug: string): void {
  if (!resolved.splash) {
    if (resolved[slug]) {
      resolved.splash = resolved[slug];
    } else {
      const splashKey = Object.keys(registryAssets).find(k =>
        k.toLowerCase().includes("splash") ||
        k === slug ||
        k === `${slug}_splash` ||
        k === `${slug}Splash`
      );
      if (splashKey && resolved[splashKey]) {
        resolved.splash = resolved[splashKey];
      }
    }
  }
}

export async function cacheAssetsInBackground(
  slug: string,
  buildId: string,
  assets: Record<string, string>
): Promise<void> {
  try {
    const isCached = await isPractaCached(slug, buildId);
    if (isCached) return;

    const isOnline = await checkNetworkAvailable();
    if (!isOnline) return;

    await cachePractaAssets(slug, buildId, assets);
    console.log(`[AssetCache] Cached assets for ${slug} (${buildId})`);
  } catch (e) {
    console.warn(`[AssetCache] Background caching failed for ${slug}:`, e);
  }
}

export function clearJsonCache(): void {
  jsonCache = {};
}

export async function clearAllCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    await AsyncStorage.removeItem(CACHE_MANIFEST_KEY);
    manifestCache = null;
    jsonCache = {};
  } catch (e) {
    console.warn("[AssetCache] Failed to clear cache:", e);
  }
}

export async function getCacheStats(): Promise<{
  totalSizeMB: number;
  practaCount: number;
  practas: Array<{ slug: string; sizeMB: number; lastUsed: string }>;
}> {
  const manifest = await loadManifest();
  
  let totalBytes = 0;
  const practas: Array<{ slug: string; sizeMB: number; lastUsed: string }> = [];

  for (const [slug, entry] of Object.entries(manifest)) {
    const sizeMB = (entry.totalSizeBytes || 0) / (1024 * 1024);
    totalBytes += entry.totalSizeBytes || 0;
    practas.push({
      slug,
      sizeMB: Math.round(sizeMB * 100) / 100,
      lastUsed: entry.lastUsedAt,
    });
  }

  return {
    totalSizeMB: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
    practaCount: practas.length,
    practas,
  };
}
