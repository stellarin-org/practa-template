# Practa metadata.json Reference

Every Practa must include a `metadata.json` file at its root. This file tells Stellarin everything it needs to know about the Practa: what it is, what it needs, and how users can configure it.

Location: `client/my-practa/metadata.json`

> **Version is managed separately.** The Practa version lives in `client/my-practa/version.json`, not in `metadata.json`. It is auto-incremented on each commit. The server merges it into API responses automatically.

---

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the Practa (e.g., `"breathing-pause"`) |
| `name` | string | Display name shown to users |
| `description` | string | Short summary of the experience |
| `author` | string | Creator name |
| `requiresAI` | boolean | `true` if the Practa cannot function without AI, `false` if it works without AI. Every Practa must set this. |

---

## Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `estimatedDuration` | number | Estimated time to complete in seconds |
| `category` | string | Category (e.g., `"wellness"`, `"breathwork"`, `"reflection"`) |
| `tags` | string[] | Searchable tags (e.g., `["mindfulness", "calm"]`) |
| `icon` | string | Feather icon name from [icons.expo.fyi](https://icons.expo.fyi) (e.g., `"heart"`) |
| `dependencies` | string[] | npm packages to auto-install (must be Expo Go compatible) |
| `assets` | object | Asset declarations (see Assets section) |
| `configSchema` | object | User-configurable settings (see Config Schema section) |

---

## Assets

Declare assets as key-value pairs where the key is the name you reference at runtime and the value is the filename in the `assets/` folder.

```json
"assets": {
  "icon": "icon.png",
  "splash": "splash.png",
  "data": "words.json"
}
```

**Supported file types:**

| Extension | What You Receive | Usage |
|-----------|------------------|-------|
| `.png`, `.jpg`, `.jpeg`, `.gif` | Image source object | `<Image source={context.assets.icon} />` |
| `.mp4` | Video source | Use with `expo-video` (add to `dependencies`) |
| `.json` | Parsed JS object/array | `context.assets.data.forEach(...)` |

**Access at runtime:** `context.assets.yourKey`

**Important:** Never use `require()` or `import` for assets. Always use `context.assets` — this ensures assets work in both development and production (Stellarin CDN).

---

## Config Schema

Define user-configurable options. Stellarin renders a settings UI automatically from this schema.

### Structure

```json
"configSchema": {
  "fields": {
    "fieldKey": { ... }
  },
  "requiredConfig": false
}
```

- `fields` — An object where each key becomes a config value accessible at runtime.
- `requiredConfig` — Set `true` if the Practa cannot run without the user configuring it first.

### Field Types

| Type | Properties | Description |
|------|-----------|-------------|
| `string` | `placeholder`, `default`, `minLength`, `maxLength` | Text input. Shows character counter when `maxLength` is set. |
| `number` | `default`, `min`, `max` | Numeric input, clamped to range |
| `boolean` | `default` | Toggle switch |
| `select` | `default`, `options` | Dropdown. `options` is `[{ value, label }]` |

**Common properties** (all field types): `label` (required), `description` (optional), `required` (optional).

### Standard Field: `aiEnabled`

Every Practa must include this in its configSchema:

```json
"aiEnabled": {
  "type": "boolean",
  "label": "Enable AI Features",
  "description": "Allow this Practa to use AI-powered enhancements when available",
  "default": true
}
```

This is a user-facing toggle, separate from the top-level `requiresAI` flag:

| Concept | Where | Purpose |
|---------|-------|---------|
| `requiresAI` | Top-level metadata | Fact: "Can this Practa work without AI?" |
| `aiEnabled` | configSchema field | Preference: "Should AI be turned on right now?" |

| `requiresAI` | `aiEnabled` | Behavior |
|---|---|---|
| `false` | `true` | Works without AI, uses AI enhancements when available |
| `false` | `false` | Fully manual/static mode |
| `true` | `true` | AI-powered experience (normal) |
| `true` | `false` | Practa won't function properly — Stellarin should warn |

### Access at Runtime

```typescript
export default function MyPracta({ context, onComplete }: PractaProps) {
  const sessionLength = context.config?.sessionLength ?? 5;
  const aiEnabled = context.config?.aiEnabled ?? true;
}
```

---

## Complete Example

```json
{
  "id": "breathing-pause",
  "name": "Breathing Pause",
  "description": "A calming breathing exercise to help you center yourself",
  "author": "Stellarin",
  "estimatedDuration": 60,
  "requiresAI": false,
  "category": "breathwork",
  "tags": ["breathing", "calm", "mindfulness"],
  "assets": {
    "breathingOrb": "breathing-orb.png",
    "chime": "chime.mp3",
    "config": "config.json",
    "splash": "splash.png"
  },
  "dependencies": [
    "@expo/vector-icons",
    "expo-haptics"
  ],
  "configSchema": {
    "fields": {
      "breathCycles": {
        "type": "number",
        "label": "Breath Cycles",
        "description": "Number of breathing cycles per session",
        "default": 5,
        "min": 1,
        "max": 20
      },
      "playChime": {
        "type": "boolean",
        "label": "Play Chime",
        "description": "Play a chime at the start and end",
        "default": true
      },
      "breathPattern": {
        "type": "select",
        "label": "Breathing Pattern",
        "description": "Choose a breathing rhythm",
        "default": "4-4-4",
        "options": [
          { "value": "4-4-4", "label": "Box Breathing (4-4-4-4)" },
          { "value": "4-7-8", "label": "Relaxing (4-7-8)" },
          { "value": "5-5", "label": "Simple (5-5)" }
        ]
      },
      "aiEnabled": {
        "type": "boolean",
        "label": "Enable AI Features",
        "description": "Allow this Practa to use AI-powered enhancements when available",
        "default": true
      }
    },
    "requiredConfig": false
  }
}
```

---

## Minimal Example

The simplest valid metadata.json:

```json
{
  "id": "my-practa",
  "name": "My Practa",
  "description": "A simple wellness experience",
  "author": "Your Name",
  "requiresAI": false,
  "configSchema": {
    "fields": {
      "aiEnabled": {
        "type": "boolean",
        "label": "Enable AI Features",
        "description": "Allow this Practa to use AI-powered enhancements when available",
        "default": true
      }
    }
  }
}
```
