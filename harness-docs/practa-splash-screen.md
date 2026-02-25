# Practa Splash Screen

Drop in a `splash.png` for a branded fade animation before your practa loads.

---

## For Template Designers (Practa Template Repo)

> **Context:** You're building a practa in the template repo. There is no `build.json` here - that's generated later by the publishing pipeline.

### What You Need To Do

**1. Add the splash image:**

```
your-practa/
  ├── index.tsx
  ├── metadata.json
  └── assets/
      └── splash.png    ← Add this file
```

**2. Declare it in metadata.json:**

```json
{
  "name": "My Practa",
  "assets": {
    "splash": "splash.png"
  }
}
```

**That's all.** No other configuration required.

### Image Requirements

| Property | Requirement |
|----------|-------------|
| File name | Any name (declare in metadata.json) |
| Location | `assets/` folder |
| Aspect ratio | 1:2 (e.g., 1080 × 2160) |
| Format | PNG |

The image displays **edge-to-edge**, anchored to the top. Overflow clips from the bottom, never the top. This ensures branding/content at the top of the image is always visible.

### Accessing Assets in Your Practa

Assets are passed via `context.assets`:

```typescript
export default function MyPracta({ context, onComplete }: PractaProps) {
  // Access any declared asset
  const backgroundMusic = context.assets?.backgroundMusic;
  const splashImage = context.assets?.splash;
  
  // Use in your component
  // ...
}
```

**This works identically in development and production.** The system handles local vs CDN resolution automatically.

---

## How It Works

### Asset Flow

1. **Template Dev**: You declare assets in `metadata.json` and place files in `assets/`
2. **Publishing**: Practa Manager uploads assets to CDN, generates `build.json` with CDN URLs
3. **Stellarin Import**: Fetch script reads both `metadata.json` (declarations) and `build.json` (CDN URLs)
4. **Runtime**: FlowScreen resolves assets and passes them via `context.assets`

### Resolution Priority

- If CDN URL exists in `build.json` → use that
- Otherwise → use local path from `metadata.json`

---

## For Stellarin App Implementation

> **Context:** You're working in the Stellarin app codebase.

### Asset Discovery

Assets are resolved via the registry and passed through context:

```typescript
import { resolveAssetsForPracta } from "@/practa/community-loader";

// FlowScreen resolves assets for the current practa
const assets = resolveAssetsForPracta(practa.type);
// → { splash: "https://cdn.example.com/splash.png", ... } | undefined

// Then passes them via context
const contextWithAssets = { ...context, storage, assets };
```

### FlowScreen Integration

```typescript
// In FlowScreen.tsx
import { resolveAssetsForPracta } from "@/practa/community-loader";

export default function FlowScreen() {
  const { practa, context } = useCurrentPracta();
  
  // Resolve assets for current practa
  const assets = useMemo(() => {
    if (!practa) return undefined;
    return resolveAssetsForPracta(practa.type);
  }, [practa?.type]);
  
  // Add assets to context
  const contextWithAssets = useMemo(() => {
    if (!context) return null;
    return { ...context, storage, assets };
  }, [context, storage, assets]);
  
  // Get splash URL from resolved assets
  const splashUrl = useMemo(() => {
    if (!assets?.splash) return null;
    return assets.splash;
  }, [assets]);
  
  // ...
}
```

### PractaSplashScreen Component

```typescript
interface PractaSplashScreenProps {
  splashImage: ImageSourcePropType;
  onComplete: () => void;
  displayDuration?: number; // default: 2000ms
}
```

**Animation sequence:**
1. White overlay fades in (300ms)
2. Splash image fades in (400ms)
3. Holds for `displayDuration` (2000ms)
4. Everything fades out (400ms)
5. Calls `onComplete()`

**Timeout fallback:** If image doesn't load in 5s, `onComplete()` is called anyway.

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| No assets declared | `assets` is undefined, splash skipped |
| No splash in assets | `splashUrl` is null, splash skipped |
| Image fails to load | 5s timeout calls `onComplete()` |
| Multi-practa flow | Each practa with splash shows its own |
| Practa changes | `showSplash` resets via `practa.id` dependency |
| Built-in practa | No registry entry, splash skipped |

### Files

| File | Purpose |
|------|---------|
| `client/components/PractaSplashScreen.tsx` | Splash animation component |
| `client/screens/FlowScreen.tsx` | Asset resolution + splash rendering |
| `client/practa/community-loader.ts` | `resolveAssetsForPracta()` function |
| `client/types/flow.ts` | `PractaAssets` type, `assets` field on `PractaContext` |
