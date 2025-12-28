/**
 * Asset Resolver for Practa
 * 
 * Register your assets here and use assets("key") to get URLs.
 * NEVER use require() directly in component code.
 * 
 * Special Assets:
 * - splash: Optional splash screen image (1:2 aspect ratio recommended)
 *   Add splash.png to the assets/ folder to enable branded splash screens.
 */

type AssetSource = number | { uri: string };

const localAssets: Record<string, AssetSource> = {
  // Uncomment the line below after adding splash.png to assets/ folder:
  // splash: require("./assets/splash.png"),
} as const;

export type AssetKey = keyof typeof localAssets;

export const assets = (key: string): string => {
  const asset = localAssets[key] as AssetSource | undefined;
  if (asset === undefined) {
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
  if (!hasSplash()) return null;
  return localAssets.splash;
};
