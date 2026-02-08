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
- User pastes a message saying their template is out of date

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
2. **Important**: Check the response for `previousSha` and `updatedTo` values
3. If both SHA values are present (a real update happened), proceed to the post-update review skill:
   - Follow the instructions in `.agents/skills/post-template-update/SKILL.md`
   - Pass the `previousSha` and `updatedTo` values from the update response
4. If `previousSha` is `null`, the template was already up to date — no review needed
