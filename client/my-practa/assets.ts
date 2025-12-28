/**
 * Asset Resolver for Practa
 * 
 * This file is auto-generated based on assets in the assets/ folder.
 * Just drop a splash.png file into assets/ and restart the app.
 * No manual code changes needed!
 * 
 * DO NOT EDIT - this file is regenerated on server startup.
 */

type AssetSource = number | { uri: string };

const localAssets: Record<string, AssetSource> = {

} as const;

export type AssetKey = keyof typeof localAssets;

export const assets = (key: AssetKey): string => {
  const asset = localAssets[key] as AssetSource | undefined;
  if (asset === undefined) {
    console.warn(`[Practa Assets] Asset "${String(key)}" not found.`);
    return "";
  }
  if (typeof asset === "object" && "uri" in asset) {
    return asset.uri;
  }
  if (typeof asset === "number") {
    return String(asset);
  }
  return "";
};

export const hasSplash = (): boolean => {
  return "splash" in localAssets;
};

export const getSplashSource = (): AssetSource | null => {
  if (hasSplash()) {
    return localAssets.splash;
  }
  return null;
};
