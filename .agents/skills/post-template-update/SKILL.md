---
name: post-template-update
description: Reviews changes after a template update by comparing two Git SHAs. Use after running the update-practa-template skill when it returns previousSha and updatedTo values.
---

# Post-Template-Update Review

After updating the Practa template, this skill walks you through reviewing what changed and fixing the user's Practa if needed.

## When to Use

- Immediately after running the `update-practa-template` skill
- Only when the update returned **both** `previousSha` and `updatedTo` values (meaning a real update happened)
- If `previousSha` is `null`, the template was already up to date — skip this entire process

## Required Input

You need two SHA values from the template update response:

- **`previousSha`** — the commit SHA before the update
- **`updatedTo`** — the commit SHA after the update

These are returned in the JSON response from `POST /api/template/update`.

## Step 1: Fetch the Diff

Use `web_fetch` to retrieve the GitHub comparison page between the two commits:

```
https://github.com/stellarin-org/practa-template/compare/{previousSha}...{updatedTo}
```

This shows all files that changed between the two versions.

## Step 2: Identify Breaking Changes

Review the diff for changes that could break an existing Practa:

- **Types**: Renamed or removed props in `client/types/flow.ts`
- **Components**: Changed APIs in `client/components/`
- **Context/Hooks**: Updated providers in `client/context/` or hooks in `client/hooks/`
- **Metadata Schema**: New required fields in metadata.json
- **Asset Resolution**: Changes to `client/lib/practa-assets.ts`
- **Constants**: Updated values in `client/constants/`

## Step 3: Fix the User's Practa

Review `client/my-practa/index.tsx` and `client/my-practa/metadata.json` against the identified changes:

1. Update any renamed imports or props
2. Add any newly required metadata fields
3. Migrate deprecated patterns to new ones
4. Ensure asset declarations still work with the updated resolver

## Step 4: Restart and Verify

1. Restart the app workflow so changes take effect
2. Verify the app loads correctly
3. Check that the Practa renders without errors

## Step 5: Suggest New Features

If the template introduced new capabilities (new hooks, components, config options, etc.), briefly tell the user what's available and offer to integrate them into their Practa.

## If previousSha is null

The template was already up to date or this is the first sync. Skip the entire review — there's nothing to compare.
