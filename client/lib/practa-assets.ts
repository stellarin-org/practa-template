/**
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

type AssetSource = number | { uri: string };
type ResolvedAssets = Record<string, AssetSource>;

const assetRegistry: Record<string, Record<string, AssetSource>> = {
  "my-practa": {
    icon: require("../my-practa/assets/icon.png"),
    wellnessBg: require("../my-practa/assets/wellness-bg.png"),
    content: require("../my-practa/assets/content.json"),
  },
  "ai-affirmation": {},
  "breathing-pause": {
    breathingOrb: require("../demo-practa/breathing-pause/assets/breathing-orb.png"),
    chime: require("../demo-practa/breathing-pause/assets/chime.mp3"),
    config: require("../demo-practa/breathing-pause/assets/config.json"),
    splash: require("../demo-practa/breathing-pause/assets/splash.png"),
  },
  "gratitude-prompt": {
    prompts: require("../demo-practa/gratitude-prompt/assets/prompts.json"),
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

export function getSplashSource(practaId: string = "my-practa"): AssetSource | null {
  const assets = assetRegistry[practaId];
  if (assets && "splash" in assets) {
    return assets.splash;
  }
  return null;
}
