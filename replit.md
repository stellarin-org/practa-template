# Practa Starter Template

A Replit-powered development environment for creating Practa - interactive wellbeing experiences for the Stellarin app.

**No coding experience required.** Describe your idea to Replit AI and it will build your Practa.

## For AI Agents

**Only files in `client/my-practa/` are submitted to Stellarin.** All other files exist only for local development.

When building a Practa:
- Edit `client/my-practa/index.tsx` (your Practa component)
- Update `client/my-practa/metadata.json` (Practa info)
- Place assets in `client/my-practa/assets/`
- Reference demos in `client/demo-practa/` for patterns
- Do not modify other files unless explicitly requested

## Quick Start

1. **Describe** your idea to Replit AI
2. **Preview** in the app (Dev screen → Run Practa)
3. **Iterate** until polished
4. **Submit** when ready (Dev screen → Submit)

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
