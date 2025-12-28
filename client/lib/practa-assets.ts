/**
 * Local Asset Resolver for Development
 * 
 * This file is auto-generated based on assets declared in metadata.json.
 * DO NOT EDIT - this file is regenerated on server startup.
 * 
 * In production (Stellarin), assets are provided via CDN URLs through context.
 */

import { ImageSourcePropType } from "react-native";
import { ResolvedAssets } from "@/types/flow";

type AssetSource = number | { uri: string };

const localAssets: Record<string, AssetSource> = {

} as const;

export function resolveAssets(): ResolvedAssets {
  return { ...localAssets };
}

export function hasSplash(): boolean {
  return "splash" in localAssets;
}

export function getSplashSource(): ImageSourcePropType | null {
  if (hasSplash()) {
    return localAssets.splash as ImageSourcePropType;
  }
  return null;
}
