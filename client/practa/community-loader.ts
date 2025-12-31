import { ComponentType } from "react";
import { PractaContext, PractaCompleteHandler, PractaAssets, PractaAssetValue } from "@/types/flow";
import {
  resolveAssetsFromCache,
  cacheAssetsInBackground,
  checkNetworkAvailable,
  isPractaCached,
  validateAssets,
} from "@/lib/community-asset-cache";

export interface CommunityPractaProps {
  context: PractaContext;
  onComplete: PractaCompleteHandler;
  onSkip?: () => void;
}

export interface CommunityPractaEntry {
  slug: string;
  version: string;
  buildId: string;
  name: string;
  description: string;
  author: string;
  category: string;
  practaType?: string;
  estimatedDuration: number;
  assets: Record<string, string>;
}

export interface CommunityRegistry {
  registryVersion: string;
  practas: CommunityPractaEntry[];
}

let cachedRegistry: CommunityRegistry | null = null;

function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length <= 64 && !slug.includes("..");
}

function validateRegistryEntry(entry: CommunityPractaEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!validateSlug(entry.slug)) {
    errors.push(`Invalid slug: ${entry.slug}`);
  }
  
  if (entry.assets && Object.keys(entry.assets).length > 0) {
    const assetValidation = validateAssets(entry.assets);
    if (!assetValidation.valid) {
      for (const error of assetValidation.errors) {
        errors.push(`Asset ${error.key}: ${error.reason}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function loadCommunityRegistry(): CommunityRegistry {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  try {
    const registry = require("./community/_registry.json") as CommunityRegistry;
    
    const validatedPractas: CommunityPractaEntry[] = [];
    for (const practa of registry.practas) {
      const validation = validateRegistryEntry(practa);
      if (validation.valid) {
        validatedPractas.push(practa);
      } else {
        console.warn(`[CommunityLoader] Rejecting ${practa.slug} due to security validation: ${validation.errors.join("; ")}`);
      }
    }
    
    cachedRegistry = {
      registryVersion: registry.registryVersion,
      practas: validatedPractas,
    };
    
    if (validatedPractas.length < registry.practas.length) {
      console.warn(`[CommunityLoader] Filtered ${registry.practas.length - validatedPractas.length} practa(s) due to security validation`);
    }
    
    return cachedRegistry;
  } catch (e) {
    console.log("[CommunityLoader] No community practa registry found (this is normal on first run)");
    cachedRegistry = { registryVersion: "", practas: [] };
    return cachedRegistry;
  }
}

export function getCommunityPractas(): CommunityPractaEntry[] {
  return loadCommunityRegistry().practas;
}

export function getCommunityPractaBySlug(slug: string): CommunityPractaEntry | undefined {
  return getCommunityPractas().find((p) => p.slug === slug);
}

function toImageSource(url: string): PractaAssetValue {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return { uri: url };
  }
  return url;
}

export interface ResolvedAssetsResult {
  assets: PractaAssets;
  isCached: boolean;
  needsDownload: boolean;
}

export async function resolveAssetsForPractaAsync(slug: string): Promise<ResolvedAssetsResult | undefined> {
  const practa = getCommunityPractaBySlug(slug);
  if (!practa) {
    return undefined;
  }

  const registryAssets = practa.assets || {};
  
  if (Object.keys(registryAssets).length === 0) {
    return undefined;
  }

  const result = await resolveAssetsFromCache(slug, practa.buildId, registryAssets);
  
  if (result.needsDownload) {
    cacheAssetsInBackground(slug, practa.buildId, registryAssets);
  }

  return result;
}

export function resolveAssetsForPracta(slug: string): PractaAssets | undefined {
  const practa = getCommunityPractaBySlug(slug);
  if (!practa) {
    return undefined;
  }

  const assets = practa.assets || {};
  
  if (Object.keys(assets).length === 0) {
    return undefined;
  }

  const assetValidation = validateAssets(assets);
  if (!assetValidation.valid) {
    console.error(`[CommunityLoader] Security validation failed for ${slug} assets: ${assetValidation.errors.map(e => `${e.key}: ${e.reason}`).join("; ")}`);
    return undefined;
  }

  const resolved: PractaAssets = {};
  
  for (const [key, url] of Object.entries(assets)) {
    resolved[key] = toImageSource(url);
  }
  
  if (!resolved.splash) {
    if (assets[slug]) {
      resolved.splash = toImageSource(assets[slug]);
    } else {
      const splashKey = Object.keys(assets).find(k => 
        k.toLowerCase().includes("splash") || 
        k === slug ||
        k === `${slug}_splash` ||
        k === `${slug}Splash`
      );
      if (splashKey) {
        resolved.splash = toImageSource(assets[splashKey]);
      }
    }
  }

  return resolved;
}

export async function canLaunchPracta(slug: string): Promise<{ canLaunch: boolean; reason?: string }> {
  const practa = getCommunityPractaBySlug(slug);
  if (!practa) {
    return { canLaunch: true };
  }

  const isCached = await isPractaCached(slug, practa.buildId);
  if (isCached) {
    return { canLaunch: true };
  }

  const isOnline = await checkNetworkAvailable();
  if (isOnline) {
    return { canLaunch: true };
  }

  return { 
    canLaunch: false, 
    reason: "This activity needs to download some files first. Please connect to the internet and try again." 
  };
}

export function getCommunityPractaMetadata() {
  const practas = getCommunityPractas();
  const metadata: Record<string, {
    type: string;
    name: string;
    description: string;
    author: string;
    version: string;
    estimatedDuration?: number;
  }> = {};

  for (const practa of practas) {
    metadata[practa.slug] = {
      type: practa.slug,
      name: practa.name,
      description: practa.description,
      author: practa.author,
      version: practa.version,
      estimatedDuration: practa.estimatedDuration,
    };
  }

  return metadata;
}

let cachedComponents: Record<string, ComponentType<CommunityPractaProps>> = {};
let componentsLoaded = false;

export function getCommunityPractaComponents(): Record<string, ComponentType<CommunityPractaProps>> {
  if (componentsLoaded) {
    return cachedComponents;
  }

  try {
    const { COMMUNITY_PRACTA_COMPONENTS } = require("./community/_components");
    cachedComponents = COMMUNITY_PRACTA_COMPONENTS;
    componentsLoaded = true;
    return cachedComponents;
  } catch (e) {
    console.log("[CommunityLoader] No community practa components found (this is normal on first run)");
    componentsLoaded = true;
    return cachedComponents;
  }
}

export function getCommunityPractaComponent(slug: string): ComponentType<CommunityPractaProps> | undefined {
  const components = getCommunityPractaComponents();
  return components[slug];
}
