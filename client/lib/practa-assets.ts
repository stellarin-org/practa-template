/**
 * Local Asset Resolver for Development
 * 
 * This file is auto-generated based on assets declared in metadata.json files.
 * DO NOT EDIT - this file is regenerated on server startup.
 * 
 * In production (Stellarin), assets are provided via CDN URLs through context.
 */

import { ImageSourcePropType } from "react-native";
import { ResolvedAssets } from "@/types/flow";

type AssetSource = number | { uri: string };

const assetRegistry: Record<string, Record<string, AssetSource>> = {
  "my-practa": {
    wellnessBg: require("../my-practa/assets/wellness-bg.png"),
    content: require("../my-practa/assets/content.json"),
  },
  "breathing-pause": {
    breathingOrb: require("../demo-practa/breathing-pause/assets/breathing-orb.png"),
    chime: require("../demo-practa/breathing-pause/assets/chime.mp3"),
  },
  "gratitude-prompt": {},
  "tap-counter": {},
};

export function resolveAssets(practaId: string = "my-practa"): ResolvedAssets {
  const assets = assetRegistry[practaId];
  return assets ? { ...assets } : {};
}

export function hasSplash(practaId: string = "my-practa"): boolean {
  const assets = assetRegistry[practaId];
  return assets ? "splash" in assets : false;
}

export function getSplashSource(practaId: string = "my-practa"): ImageSourcePropType | null {
  const assets = assetRegistry[practaId];
  if (assets && "splash" in assets) {
    return assets.splash as ImageSourcePropType;
  }
  return null;
}
