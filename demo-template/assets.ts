/**
 * Asset Resolver for Practa
 * 
 * Register your assets here and use assets("key") to get URLs.
 * NEVER use require() directly in component code.
 * 
 * For splash screens:
 * 1. Add splash.png to my-practa/assets/ folder (1:2 aspect ratio recommended)
 * 2. Uncomment the splash line in localAssets below
 * 3. Wrap your Practa with <PractaSplash> component
 */

type AssetSource = number | { uri: string };

const localAssets = {
  // Uncomment the line below and add your splash image:
  // splash: require("./assets/splash.png"),
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

/**
 * Gets the splash image URL if registered.
 * Returns empty string if no splash is configured.
 */
export const splashImage = (): string => {
  if (!("splash" in localAssets)) {
    return "";
  }
  const asset = (localAssets as Record<string, AssetSource>)["splash"];
  if (typeof asset === "object" && "uri" in asset) {
    return asset.uri;
  }
  if (typeof asset === "number") {
    return String(asset);
  }
  return "";
};
