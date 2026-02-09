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
  github-sync.ts          # Shared GitHub sync utilities (fetch repo info, download zip, etc.)
  routes.ts               # API routes (template sync, practa sync, validation, submission)
```

## Key Files

| File | Purpose |
|------|---------|
| `client/my-practa/index.tsx` | Your Practa implementation |
| `client/my-practa/metadata.json` | Your Practa metadata |
| `shared/metadata-schema.ts` | **Single source of truth** for metadata field definitions & validation |
| `shared/schema.ts` | Zod schema & TypeScript types for metadata |
| `client/lib/practa-validator.ts` | Client-side validator (consumes shared schema) |
| `client/lib/practa-config.ts` | Practa config types, Zod schemas, and config registry (imported from upstream) |
| `client/types/flow.ts` | TypeScript types |
| `docs/practa-developer-guide.md` | Full requirements & examples |
| `docs/practa-metadata-schema.md` | Dedicated metadata.json reference |
| `server/github-sync.ts` | Shared GitHub sync utilities |

## Path Aliases

- `@/` → `./client/`
- `@shared/` → `./shared/`

## Metadata Schema Architecture

Metadata field definitions live in `shared/metadata-schema.ts` — the single source of truth for what fields exist, whether they're required, their types, labels, and validation constraints. Both the client-side validator (`client/lib/practa-validator.ts`) and server-side validator (`server/routes.ts`) consume this shared schema.

**To add a new metadata field:**
1. Add a `FieldDefinition` entry to `METADATA_FIELDS` in `shared/metadata-schema.ts`
2. For nested requirements (like `configSchema.fields.aiEnabled`), add to `NESTED_FIELD_REQUIREMENTS`
3. Update `shared/schema.ts` (Zod types) to match
4. Both validators automatically pick up the new field — no code changes needed in either

**Key required fields:** `id`, `name`, `description`, `author`, `version`, `requiresAI`, `configSchema.fields.aiEnabled`

## Automatic Version Bumping

The template auto-increments your Practa's patch version (1.0.0 → 1.0.1) on each git commit. No setup required.

## Three Sync Systems

This project has **three distinct sync systems**. Each pulls files from a different GitHub repo, targets different files, and serves a different purpose. Do not confuse them.

### 1. Test Harness Import — Master Template Only

**Purpose:** Keeps the template's core components in sync with the main Stellarin app. These are the "source of truth" files that originate in Stellarin — design system, types, test harness, chrome, and storage.

| Detail | Value |
|--------|-------|
| Source repo | `stellarin-org/stellarin-app` |
| Config file | `.config/harness-import.config.json` |
| Endpoints | `GET /api/harness-import/status`, `POST /api/harness-import/sync` |
| Guard | Requires `MASTER_TEMPLATE_KEY` env var |
| Auth | Uses Replit GitHub connector (private repo) |
| Manifest | `.config/.harness-import-manifest.json` (tracks synced files for stale detection) |

**Files imported** (defined in `.config/harness-import.config.json`):
- `client/types/flow.ts` — Practa contract types
- `client/components/PractaTestHarness.tsx` — Test harness
- `client/components/PractaSplashScreen.tsx` — Splash screen
- `client/components/PractaChromeHeader.tsx` — Chrome header
- `client/context/PractaChromeContext.tsx` — Chrome context
- `client/lib/practa-storage.ts` — Storage API
- `client/constants/theme.ts` — Design tokens
- `client/hooks/useTheme.ts` — Theme hook
- `client/components/ThemedText.tsx`, `ThemedView.tsx`, `Card.tsx` — UI primitives
- `server/cdn_routes.ts` — CDN backend routes
- `docs/practa-test-harness.md`, `design_guidelines.md` — Documentation

**Flow:** `stellarin-app` → (Harness Import into master template) → master template commits to `practa-template` repo → (Template Update into user templates)

### 2. Template Update — Available to All Users

**Purpose:** Updates template infrastructure files from the published template repo. Keeps user templates up to date with the latest tooling, validation, screens, navigation, server code, etc. Protects `client/my-practa/` (never overwrites user's Practa).

| Detail | Value |
|--------|-------|
| Source repo | `stellarin-org/practa-template` |
| Config file | `server/template-sync-config.ts` |
| Endpoints | `GET /api/template/sync-status`, `POST /api/template/update` |
| Guard | None (available to all) |
| Protected paths | `client/my-practa/` |

**Directories synced:** `assets/`, `client/` (except `my-practa/`), `demo-template/`, `docs/`, `scripts/`, `server/`, `shared/`

If the app is broken or failing to load, `POST /api/template/update` will restore template files without touching `client/my-practa/`.

**Template update flow:** When out of date, the app shows a "Copy Instructions for AI" button. The copied message tells the AI agent to follow `.agents/skills/update-practa-template/SKILL.md` and then `.agents/skills/post-template-update/SKILL.md` using the SHA values returned by the update.

### 3. Practa Sync — Collaboration Updates

**Purpose:** Pulls the latest version of the user's specific Practa from the shared Practa repo. Used when a collaborator pushes a newer version of the same Practa.

| Detail | Value |
|--------|-------|
| Source repo | `stellarin-org/stellarin-practa` |
| Endpoints | `GET /api/practa/sync-status`, `POST /api/practa/sync` |
| Guard | Requires a published Practa with a valid `id` in `metadata.json` |
| Target | `client/my-practa/` only |

**Three version sources compared:** Local (`metadata.json` version), Published (registry in `stellarin-practa` repo), Repo (latest committed code in repo).

### File Ownership Rules

**DO NOT edit files managed by Harness Import or Template Update** unless explicitly requested. Changes to these files will be overwritten on the next sync. If a change is needed, it should be made upstream.

| Owner | Files | Editable locally? |
|-------|-------|-------------------|
| Harness Import | Files listed in `.config/harness-import.config.json` | No (master template only; changes go to `stellarin-app`) |
| Template Update | Everything in `client/` (except `my-practa/`), `server/`, `shared/`, `docs/`, `scripts/`, `assets/` | No (changes go to `practa-template` repo) |
| User | `client/my-practa/` | Yes — this is the developer's workspace |
| Practa Sync | `client/my-practa/` | Yes, but may be overwritten by collaboration sync |

## Header Configuration

Every Practa should use `usePractaChrome` and `useHeaderHeight`:

```typescript
import { usePractaChrome } from "@/context/PractaChromeContext";
import { useHeaderHeight } from "@/components/PractaChromeHeader";

export default function MyPracta({ showSettings, onSettings }: PractaProps) {
  const { setConfig } = usePractaChrome();
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    setConfig({
      headerMode: "default",  // "default" | "minimal" | "none"
      title: "My Practa",
      showSettings,
      onSettings,
    });
  }, [setConfig, showSettings, onSettings]);

  return (
    <View style={{ paddingTop: headerHeight + Spacing.lg }}>
      {/* Content */}
    </View>
  );
}
```

## AI Metadata

Every Practa must declare two AI-related values:

1. **`requiresAI`** (top-level, required) — `true` if the Practa cannot function without AI, `false` otherwise. This is a factual declaration about the Practa.
2. **`aiEnabled`** (in `configSchema.fields`, required) — A boolean toggle that lets users turn AI features on/off at runtime. Default `true`. Even Practas that don't require AI should include this so they can optionally leverage AI enhancements.

## Documentation

See `docs/practa-developer-guide.md` for:
- Component contract (props, onComplete, onSkip, showSettings, onSettings)
- Header configuration (usePractaChrome, useHeaderHeight)
- Metadata schema (including `requiresAI` and `aiEnabled`)
- Storage API
- Best practices
- Complete examples

## Resources

- [Expo Icons](https://icons.expo.fyi) - Browse available icons
- `design_guidelines.md` - Visual design system

---
