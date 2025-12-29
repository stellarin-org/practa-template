# Practa Migration Guide

Migrate your existing Practa to the new metadata-driven asset system.

## What Changed

Assets are now declared in `metadata.json` and accessed via `context.assets` instead of importing from a separate `assets.ts` file.

**Benefits:**
- Single source of truth for Practa configuration
- Assets work identically in development and production
- No manual `require()` calls needed

---

## metadata.json Schema

```json
{
  "id": "my-practa",
  "name": "My Practa",
  "version": "1.0.0",
  "description": "What your Practa does",
  "author": "Your Name",
  "estimatedDuration": 180,
  "category": "mindfulness",
  "tags": ["calm", "focus"],
  "assets": {
    "splash": "splash.png",
    "backgroundMusic": "ambient.mp3",
    "icon": "icon.png"
  }
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., "breathing-pause") |
| `name` | string | Display name |
| `version` | string | Semver version (auto-increments on commit) |
| `description` | string | Brief description |
| `author` | string | Creator name |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `estimatedDuration` | number | Duration in seconds |
| `category` | string | Category for organization |
| `tags` | string[] | Searchable tags |
| `assets` | object | Asset key-to-filename mapping |

### Assets Object

Each key becomes accessible via `context.assets.keyName`. Values are filenames in your `assets/` folder.

```json
"assets": {
  "breathingOrb": "breathing-orb.png",
  "chime": "chime.mp3"
}
```

---

## Before & After

### OLD Pattern (Deprecated)

```typescript
// assets.ts
export const assets = {
  breathingOrb: require("./assets/breathing-orb.png"),
  chime: require("./assets/chime.mp3"),
};

// index.tsx
import { assets } from "./assets";

export default function MyPracta({ context, onComplete }: PractaProps) {
  return <Image source={assets.breathingOrb} />;
}
```

### NEW Pattern

```typescript
// metadata.json
{
  "id": "my-practa",
  "name": "My Practa",
  "version": "1.0.0",
  "description": "A breathing exercise",
  "author": "Developer",
  "assets": {
    "breathingOrb": "breathing-orb.png",
    "chime": "chime.mp3"
  }
}

// index.tsx
import { ImageSourcePropType } from "react-native";

export default function MyPracta({ context, onComplete }: PractaProps) {
  const orbSource = context.assets?.breathingOrb as ImageSourcePropType;
  
  return orbSource ? <Image source={orbSource} /> : null;
}
```

---

## Migration Checklist

1. **Create/Update metadata.json**
   - Add `"assets": { ... }` section
   - Map each asset key to its filename

2. **Ensure assets are in the `assets/` folder**
   - All referenced files must exist in `my-practa/assets/`

3. **Restart the dev server**
   - The asset registry regenerates on server startup
   - Check logs for: `[Assets] Updated practa-assets.ts`

4. **Update your component**
   - Remove `import { assets } from "./assets"`
   - Access assets via `context.assets?.keyName`
   - Cast to appropriate type (e.g., `as ImageSourcePropType`)

5. **Delete legacy files**
   - Remove `assets.ts` if it exists

6. **Test your Practa**
   - Verify images display correctly
   - Verify audio plays correctly

---

## Type Safety

Assets are typed as `Record<string, unknown>` in context. Cast them when using:

```typescript
// Images
const splash = context.assets?.splash as ImageSourcePropType;

// Audio (using expo-audio)
const soundUri = context.assets?.chime;
// For local development, this is a require() result
// For production, this is a CDN URL string
```

---

## Troubleshooting

### Assets not loading?

1. Check the server logs for the asset count
2. Verify filenames match exactly (case-sensitive)
3. Restart the dev server after changing metadata.json

### TypeScript errors?

Cast assets to the appropriate type:
```typescript
const image = context.assets?.myImage as ImageSourcePropType;
```

---

## Example: Complete Practa

```
my-practa/
  index.tsx
  metadata.json
  assets/
    splash.png
    background.mp3
```

**metadata.json:**
```json
{
  "id": "my-practa",
  "name": "Calm Moment",
  "version": "1.0.0",
  "description": "A peaceful breathing exercise",
  "author": "Your Name",
  "estimatedDuration": 120,
  "assets": {
    "splash": "splash.png",
    "backgroundMusic": "background.mp3"
  }
}
```

**index.tsx:**
```typescript
import { View } from "react-native";
import { Image, ImageSourcePropType } from "react-native";
import { PractaProps } from "@/types/flow";

export default function MyPracta({ context, onComplete }: PractaProps) {
  const splash = context.assets?.splash as ImageSourcePropType;

  return (
    <View style={{ flex: 1 }}>
      {splash && <Image source={splash} style={{ width: 200, height: 200 }} />}
    </View>
  );
}
```
