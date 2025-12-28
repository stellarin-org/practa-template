/**
 * Asset Resolver for Practa
 * 
 * Register your assets here and use assets("key") to get URLs.
 * NEVER use require() directly in component code.
 * 
 * SPLASH SCREEN:
 * To add a splash screen, place a file named "splash.png" in the
 * my-practa folder or my-practa/assets folder. It will be auto-detected.
 * Recommended dimensions: 1:2 aspect ratio (e.g., 1080x2160)
 */

type AssetSource = number | { uri: string };

const localAssets = {} as const;

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
 * Splash screen image - auto-detected from:
 * - my-practa/splash.png
 * - my-practa/assets/splash.png
 * 
 * Returns null if no splash image is found.
 * The image will display full-screen edge-to-edge.
 */
let splashImageSource: number | null = null;

try {
  splashImageSource = require("./splash.png");
} catch {
  try {
    splashImageSource = require("./assets/splash.png");
  } catch {
    splashImageSource = null;
  }
}

export const splashImage = splashImageSource;
export const hasSplashImage = splashImageSource !== null;
