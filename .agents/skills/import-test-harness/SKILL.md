---
name: import-test-harness
description: Imports the latest test harness files from the main Stellarin app into the master template. Use when the user asks to import the harness, sync from the main app, update the test harness, pull harness files, or refresh the design system / types / components from Stellarin.
---

# Import Test Harness

Pulls the latest design system, types, components, and test harness from the main Stellarin app (`stellarin-org/stellarin-app`) into this template. Only works on the master template (requires `MASTER_TEMPLATE_KEY`).

## When to Use

- User asks to "import the harness", "sync from the main app", "update the test harness"
- User wants the latest design tokens, types, or shared components from Stellarin
- After upstream changes are made to `stellarin-org/stellarin-app`

## Pre-Flight Check

Before doing anything, verify that `MASTER_TEMPLATE_KEY` is set:

```bash
if [ -z "$MASTER_TEMPLATE_KEY" ]; then echo "MISSING"; else echo "SET"; fi
```

If `MISSING`:
- Stop immediately
- Tell the user: "The master template key is not set. This skill only works on the master template. Please set the `MASTER_TEMPLATE_KEY` environment variable first."
- Do NOT proceed with the import

## Step 1: Capture Pre-Import State

Before running the import, save the current state of every harness-managed file so we can diff afterward.

Read `.config/harness-import.config.json` to get the file list, then for each file in `syncItems[].to`:

```bash
mkdir -p /tmp/harness-pre-import
```

For each file, copy it to the temp directory preserving the relative path:

```bash
for f in <list of syncItems[].to paths>; do
  mkdir -p "/tmp/harness-pre-import/$(dirname "$f")"
  cp "$f" "/tmp/harness-pre-import/$f" 2>/dev/null || true
done
```

Also capture a snapshot of the current git state for these files:

```bash
git log --oneline -1 -- <file1> <file2> ...
```

## Step 2: Run the Import

```bash
curl -s -X POST http://localhost:5000/api/harness-import/sync | jq .
```

Check the response:
- If `success` is `true`, continue to Step 3
- If `success` is `false`, report the errors to the user and stop
- Note how many files succeeded, failed, or were deleted from the `results` array

## Step 3: Diff and Analyze Changes

For each file that was successfully imported, compare the pre-import version with the new version:

```bash
for f in <list of successfully imported files>; do
  if [ -f "/tmp/harness-pre-import/$f" ]; then
    diff "/tmp/harness-pre-import/$f" "$f" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
      echo "CHANGED: $f"
    fi
  else
    echo "NEW: $f"
  fi
done
```

For each changed or new file, read both the old and new versions and analyze:

### 3a: Check for Breaking Changes

Look for these categories of breaking changes:

| File pattern | What to check |
|---|---|
| `client/types/flow.ts` | Renamed/removed props, changed interfaces, removed exports |
| `client/components/*.tsx` | Changed component props, removed components, renamed exports |
| `client/context/*.tsx` | Changed context shape, renamed providers/hooks |
| `client/hooks/*.ts` | Changed hook signatures, return types |
| `client/constants/theme.ts` | Removed color tokens, renamed keys, changed Spacing/Typography values |
| `client/lib/practa-storage.ts` | Changed storage API methods, parameters |
| `server/cdn_routes.ts` | Changed API routes, request/response shapes |

For each breaking change found:
1. Search the codebase for usages of the broken API
2. Fix all usages to match the new API
3. Pay special attention to `client/my-practa/index.tsx` and `client/my-practa/metadata.json`
4. Also check `client/screens/`, `client/components/`, and `server/` for usages

### 3b: Check for Missing Dependencies (New Files Needed)

After diffing, scan every imported file for `@/` imports and check whether each dependency is either:
1. Already in the harness import config (`.config/harness-import.config.json`)
2. A file that exists locally in the template

```bash
# Extract all @/ imports from harness-managed files
for f in <list of harness files>; do
  grep -E "^import .* from ['\"]@/" "$f" 2>/dev/null | sed "s/.*from ['\"]//;s/['\"].*//"
done | sort -u
```

Compare this list against the `syncItems[].to` paths in the harness config (strip `client/` prefix to match `@/` aliases).

For each dependency that is **not** in the config and **does not** exist locally:

1. **Evaluate whether it should be imported** — Is it a core utility the template needs? Or is it Stellarin-app-specific logic that doesn't belong in the template?
2. **If it should be imported**: Add a request to `docs/harness-dev-change-requests.md` asking the harness dev to add it to the import config
3. **If a stub is appropriate**: Create a minimal stub locally with just the exports the imported file needs. Document the stub in the change requests file so the harness dev knows we're maintaining it
4. **If it should be removed from the imported file**: Add a request asking the harness dev to remove the import or make it conditional

**Decision criteria:**

| Situation | Action |
|---|---|
| File contains types/interfaces used by template screens | Request import |
| File contains business logic specific to Stellarin flows | Create stub with just the types/exports needed |
| File is a utility used by one harness file in a minor way | Create stub |
| File is a new core module (storage, config, theme) | Request import |

### 3c: Identify New Features and Enhancements

Look for:
- New exported types, interfaces, or components
- New props added to existing components
- New color tokens or spacing values
- New hooks or context values
- New utility functions
- New documentation sections

Categorize each as:
- **New capability** — something that wasn't possible before
- **Enhancement** — improvement to an existing feature
- **Internal change** — refactor that doesn't affect the public API

## Step 4: Fix Breaking Changes

If any breaking changes were found in Step 3a:

1. Update all affected files in the template
2. Restart the app workflow
3. Verify the app loads without errors
4. Check for LSP diagnostics on changed files

## Step 5: Update Change Requests for Harness Developer

After fixing breaking changes, update `docs/harness-dev-change-requests.md` to communicate issues back to the upstream harness developer. This file is the canonical list of things we want changed in `stellarin-org/stellarin-app` so future imports are cleaner.

### When to add a request

Add a new entry to the "Active Requests" section when:
- A breaking change required a local workaround (stub file, local type definition, re-adding removed values)
- An imported file depends on a module that isn't included in the import
- A change removes something the template actively uses and there's no clean migration path
- You want clarification on whether a removal was intentional

### When NOT to add a request

Don't add a request when:
- The breaking change was straightforward to adapt to (e.g., a renamed prop we can just update)
- The change is clearly an improvement and our code should simply adopt it
- It's a new feature we just need to learn about, not a conflict

### Request format

Each request should include:
- **File** affected
- **Priority** (High = breaks on import, Medium = requires workaround, Low = cosmetic/informational)
- **Status** (e.g., "Locally patched", "No fix needed", "Needs discussion")
- **What changed** and why it's a problem for the template
- **Suggested fix** — what the harness dev should do
- **Impact if not done** — what happens on the next import if this isn't addressed

### Resolving requests

When a future import shows that a request has been addressed upstream:
1. Move the entry from "Active Requests" to "Resolved Requests"
2. Add the resolution date

### If the file doesn't exist

Create it with this structure:

```markdown
# Harness Developer Change Requests

Requests for the test harness developer to address in `stellarin-org/stellarin-app`.

---

## Active Requests

(entries here)

---

## Resolved Requests

(resolved entries here)
```

## Step 6: Clean Up

```bash
rm -rf /tmp/harness-pre-import
```

## Step 7: Report to User

Provide a summary with four sections:

### Files Updated
List all files that changed, were added, or were deleted.

### Breaking Changes Fixed
For each breaking change:
- What changed (old vs new)
- What was affected in the template
- How it was fixed

### New Features Available
For each new feature or enhancement:
- What it is and what file it's in
- How it could be used in a Practa
- Whether the user should consider adopting it

### Change Requests for Harness Developer
Summarize any new or updated entries added to `docs/harness-dev-change-requests.md`. If no new requests were needed, say so.

If nothing changed (all files were identical), just say "All harness files are already up to date with the main app."

## Files Managed by This Skill

These files are defined in `.config/harness-import.config.json` and are the ones imported:

- `server/cdn_routes.ts`
- `client/constants/theme.ts`
- `client/hooks/useTheme.ts`
- `client/components/ThemedText.tsx`
- `client/components/ThemedView.tsx`
- `client/components/Card.tsx`
- `client/components/PractaSplashScreen.tsx`
- `client/types/flow.ts`
- `client/lib/practa-storage.ts`
- `client/context/PractaChromeContext.tsx`
- `client/components/PractaChromeHeader.tsx`
- `client/components/PractaTestHarness.tsx`
- `docs/practa-test-harness.md`
- `design_guidelines.md`

## Important Notes

- This skill only works on the master template — it requires `MASTER_TEMPLATE_KEY`
- Changes to these files should be made upstream in `stellarin-org/stellarin-app`, not locally
- If local changes exist that haven't been pushed upstream, this import will overwrite them
- `docs/harness-dev-change-requests.md` tracks requests for the upstream harness developer — review it before sharing with the dev team
