---
name: build-practa
description: Build, create, or scaffold a Practa (wellness/mindfulness component) for Stellarin. Use when the user asks to create a practa, build a practa, make a practa, build an app, create an app, start a new practa, build a wellness experience, create a mindfulness exercise, or any variation of building interactive wellbeing content.
---

# Build a Practa

Before writing any code, read the full documentation to understand the contract:

1. **Read `template-docs/practa-developer-guide.md`** — the complete Practa contract, props, header config, assets, storage, and validation checklist
2. **Read `template-docs/practa-metadata-schema.md`** — dedicated metadata.json reference (required fields, assets, configSchema, AI flags)
3. **Read `template-docs/practa-storage-system.md`** — if the Practa needs to persist user state across sessions
4. **Read `client/types/flow.ts`** — TypeScript types for PractaProps, PractaContext, PractaOutput
5. **Browse `client/demo-practa/`** — working examples to reference for patterns

## File Constraints

- ONLY edit files in `client/my-practa/`:
  - `client/my-practa/index.tsx` — your component (default export)
  - `client/my-practa/metadata.json` — practa metadata
  - `client/my-practa/assets/` — images, JSON data, audio
- Do NOT modify files outside `client/my-practa/` unless explicitly asked

## Critical Rules (Easy to Forget)

- **NEVER use `require()` or `import` for assets** — declare in `metadata.json`, access via `context.assets`
- **ALWAYS call `onComplete`** — every Practa must signal completion
- **ALWAYS configure header** — use `usePractaChrome` and `useHeaderHeight`
- **ALWAYS use theme colors** — never hardcode colors, use `useTheme()`
- **Guard haptics** — wrap `Haptics.*` calls with `Platform.OS !== "web"`

## Workflow

1. Read the docs above
2. Edit `client/my-practa/index.tsx` with the component
3. Update `client/my-practa/metadata.json` (id, name, version, description, author, requiresAI, assets, configSchema with aiEnabled, dependencies)
4. Place any asset files in `client/my-practa/assets/`
5. Restart the app so assets regenerate
6. Verify against the validation checklist in the developer guide
7. Generate a Practa icon — follow `.agents/skills/generate-practa-icon/SKILL.md`
8. Generate a Practa splash image — follow `.agents/skills/generate-practa-splash/SKILL.md`
