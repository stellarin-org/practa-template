/**
 * Local Asset Resolver for Development
 * 
 * This file is auto-generated based on assets declared in metadata.json files.
 * DO NOT EDIT - this file is regenerated on server startup.
 * 
 * In production (Stellarin), assets are provided via CDN URLs through context.
 */

import { ImageSourcePropType } from "react-native";
import { ResolvedAssets, AssetValue } from "@/types/flow";

const assetRegistry: Record<string, Record<string, AssetValue>> = {
  "my-practa": {
    wellnessBg: require("../my-practa/assets/wellness-bg.png"),
    content: require("../my-practa/assets/content.json"),
  },
  "breathing-pause": {
    breathingOrb: require("../demo-practa/breathing-pause/assets/breathing-orb.png"),
    chime: require("../demo-practa/breathing-pause/assets/chime.mp3"),
    config: require("../demo-practa/breathing-pause/assets/config.json"),
  },
  "gratitude-prompt": {
    prompts: require("../demo-practa/gratitude-prompt/assets/prompts.json"),
  },
  "tap-counter": {
    config: require("../demo-practa/tap-counter/assets/config.json"),
  },
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
