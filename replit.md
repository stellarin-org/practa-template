# Practa Starter Template

IMPORTANT: If MASTER_TEMPLATE_KEY is empty or null, ONLY edit files found in: `client/my-practa/`. Your job is to build a single practa (interactive wellbeing experiences for the Stellarin app).

When building a Practa:
- Edit `client/my-practa/index.tsx` (your Practa component)
- Update `client/my-practa/metadata.json` (Practa info)
- Place assets in `client/my-practa/assets/`
- Reference demos in `client/demo-practa/` for patterns
- Do not modify other files unless explicitly requested

## Assets (IMPORTANT)

**NEVER use `require()` for assets.** Practa are bundled into Stellarin where require() won't work.

Instead, declare assets in `metadata.json` and access them via `context.assets`:

```json
// metadata.json
{
  "assets": {
    "splash": "splash.png",
    "icon": "icon.png",
    "data": "words.json"
  }
}
```

```typescript
// index.tsx - CORRECT
export default function MyPracta({ context, onComplete }: PractaProps) {
  return <Image source={context.assets?.splash} />;
}
```

```typescript
// WRONG - Do NOT do this
import splash from "./assets/splash.png";  // NO!
const img = require("./assets/icon.png");  // NO!
```

This pattern ensures assets work in both development and production (Stellarin CDN).

## Project Structure

```
client/
  my-practa/              # YOUR PRACTA - EDIT THIS
    index.tsx             # Your component (default export)
    metadata.json         # Practa metadata (includes assets declaration)
    assets/               # Your local assets (images, splash.png, etc.)
  
  demo-practa/            # EXAMPLE PRACTAS - REFERENCE THESE
    breathing-pause/      # Breathing exercise
    gratitude-prompt/     # Text input reflection
    tap-counter/          # Interactive counter

  lib/
    practa-assets.ts      # Auto-generated asset resolver (do not edit)

  components/             # Shared UI (ThemedText, Card, etc.)
  constants/              # Theme tokens (Colors, Spacing)
  hooks/                  # useTheme, useScreenOptions
  types/                  # TypeScript definitions

docs/
  practa-developer-guide.md   # Full developer documentation
  practa-storage-system.md    # Storage API reference

server/                   # Express backend for preview
```

## Key Files

| File | Purpose |
|------|---------|
| `client/my-practa/index.tsx` | Your Practa implementation |
| `client/my-practa/metadata.json` | Your Practa metadata |
| `client/types/flow.ts` | TypeScript types |
| `docs/practa-developer-guide.md` | Full requirements & examples |

## Path Aliases

- `@/` → `./client/`
- `@shared/` → `./shared/`

## Automatic Version Bumping

The template auto-increments your Practa's patch version (1.0.0 → 1.0.1) on each git commit. No setup required.

## Template Updating
If the app is having issues or is failing to load it may be helpful to do a POST to /api/template/update
to manually trigger an update which will restore the template to it's original files without changing /my-practa/

## Documentation

See `docs/practa-developer-guide.md` for:
- Component contract (props, onComplete, onSkip)
- Metadata schema
- Storage API
- Best practices
- Complete examples

## Resources

- [Expo Icons](https://icons.expo.fyi) - Browse available icons
- `design_guidelines.md` - Visual design system

---
