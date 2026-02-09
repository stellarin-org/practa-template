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

### 3b: Identify New Features and Enhancements

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

## Step 5: Clean Up

```bash
rm -rf /tmp/harness-pre-import
```

## Step 6: Report to User

Provide a summary with three sections:

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
- Use `docs/upstream-changes-needed.md` (if it exists) to track local changes that need to go upstream before importing
