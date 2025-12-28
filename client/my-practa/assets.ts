/**
 * Asset Resolver for Practa
 * 
 * Register your assets here and use assets("key") to get URLs.
 * NEVER use require() directly in component code.
 * 
 * SPLASH SCREEN:
 * To enable a branded splash screen, add splash.png to the assets folder
 * and uncomment the splash line below:
 * 
 *   const localAssets: Record<string, AssetSource> = {
 *     splash: require("./assets/splash.png"),
 *   } as const;
 */

type AssetSource = number | { uri: string };

const localAssets: Record<string, AssetSource> = {
  splash: require("./assets/splash.png"),
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
  return "splash" in localAssets && localAssets.splash !== undefined;
};

export const getSplashSource = (): AssetSource | null => {
  if (hasSplash()) {
    return localAssets.splash;
  }
  return null;
};
