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

- **Success**: JSON with `{ "success": true, "updatedFiles": [...], "version": "x.y.z" }`
- **Already up to date**: JSON with `{ "success": true, "message": "Already up to date" }`
- **Error**: JSON with `{ "error": "..." }` — check server logs for details

## After Running

- Restart the app workflow so changes take effect
- Verify the app loads correctly
