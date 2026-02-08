---
name: update-practa-template
description: Fetches the latest Practa template from the Stellarin repo. Use when the user asks to update, refresh, or sync the template, or when the app is broken and needs a reset.
---

# Update Practa Template

Pulls the latest template files from the upstream Stellarin repo without touching the user's Practa code in `client/my-practa/`.

## When to Use

- User asks to "update the template", "get the latest template", or "sync the template"
- The app is broken or failing to load and a template refresh might fix it
- After a major version bump in the upstream repo

## How to Run

Execute this curl command against the local dev server:

```bash
curl -X POST http://localhost:5000/api/template/update
```

The endpoint will:
1. Fetch the latest release from the `stellarin-org/practa-template` GitHub repo
2. Download and extract the template zip
3. Overwrite protected template files (everything outside `client/my-practa/`)
4. Regenerate `client/lib/practa-assets.ts`
5. Preserve all user code in `client/my-practa/`

## Expected Output

- **Success**: JSON with `{ "success": true, "updatedFiles": [...], "version": "x.y.z", "updatedTo": "<new-sha>", "previousSha": "<old-sha>", "repoName": "stellarin-org/practa-template" }`
- **Already up to date**: JSON with `{ "success": true, "message": "Already up to date" }` — `previousSha` will be `null`
- **Error**: JSON with `{ "error": "..." }` — check server logs for details

## After Running

1. Restart the app workflow so changes take effect
2. Verify the app loads correctly
3. **Perform a post-update review** (see below)

## Post-Update Review Process

When the update response includes both `previousSha` and `updatedTo` (meaning a real update happened, not "already up to date"), you should review the changes and fix the user's Practa if needed.

### Step 1: Fetch the diff

Use the GitHub compare API to see what changed between the two commits:

```
https://github.com/{repoName}/compare/{previousSha}...{updatedTo}
```

For example:
```
https://github.com/stellarin-org/practa-template/compare/abc1234...def5678
```

Fetch this URL and review the file-level changes.

### Step 2: Identify breaking changes

Look for changes that could break an existing Practa:

- Renamed or removed props in `client/types/flow.ts`
- Changed component APIs in `client/components/`
- Updated context providers or hooks in `client/context/` or `client/hooks/`
- New required fields in metadata.json schema
- Changes to the asset resolution system in `client/lib/practa-assets.ts`
- Updated constants in `client/constants/`

### Step 3: Fix the user's Practa

Review `client/my-practa/index.tsx` and `client/my-practa/metadata.json` against the identified changes:

- Update any renamed imports or props
- Add any newly required metadata fields
- Migrate deprecated patterns to new ones
- Ensure asset declarations still work with the updated resolver

### Step 4: Suggest new features

If the template introduced new capabilities (new hooks, components, config options, etc.), briefly tell the user what's available and offer to integrate them.

### If previousSha is null

If `previousSha` is `null`, the template was already up to date or this is the first sync. Skip the review process — there's nothing new to compare.
