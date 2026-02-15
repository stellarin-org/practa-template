---
name: generate-practa-icon
description: Generate a Practa icon image using AI image generation. Use when the user asks to create a practa icon, generate a practa icon, make an icon for a practa, create an app icon for a practa, or any variation of generating/creating an icon image for their Practa.
---

# Generate a Practa Icon

Generate a square icon image for the user's Practa and save it to the correct assets location.

## Dimensions & Format

- **Size:** 1024x1024 pixels (1:1 aspect ratio)
- **Format:** PNG
- **Output path:** `client/my-practa/assets/icon.png`

## Design Rules

1. **Gradient background required** — always use a rich, colorful gradient background. Never use a plain white background.
2. **No text** — the icon must not contain any text, letters, numbers, or alphanumeric characters.
3. **Simple and memorable** — use a minimal number of shapes. Embrace simplicity.
4. **Foreground depth** — overlapping solid shapes, paired with transparency or blurring, give depth.
5. **Wellness/mindfulness tone** — the icon should feel calming, uplifting, or restorative, appropriate for a wellbeing app.

## Steps

1. Read `client/my-practa/metadata.json` to understand the Practa's name, description, category, and tags.
2. Compose a detailed image generation prompt that:
   - Describes a gradient background (never white)
   - Includes a simple, symbolic foreground element relevant to the Practa's theme
   - Specifies no text or alphanumeric characters
   - Ends with: "Absolutely no text, letters, numbers, or alphanumeric characters visible anywhere."
3. Generate the image with:
   - `output_path`: `client/my-practa/assets/icon.png`
   - `aspect_ratio`: `1:1`
   - `overwrite`: `true`
4. Ensure `metadata.json` has `"icon": "icon.png"` in the `assets` object. Add it if missing.

## Prompt Template

```
[Style]: Modern, minimal app icon design with soft rounded shapes
[Background]: Rich [color] to [color] gradient, smooth transition, no white
[Foreground]: Simple symbolic element representing [practa theme] — e.g., a lotus, leaf, wave, sun, heart, breath circle
[Mood]: Calming, serene, wellness-focused
[End]: Absolutely no text, letters, numbers, or alphanumeric characters visible anywhere.
```

## Example Prompt

For a breathing exercise Practa:

> Modern minimal app icon, soft rounded design. Background is a smooth deep teal to ocean blue gradient. Center features a simple abstract circular breathing symbol with gentle concentric rings in soft white and light cyan. Calming, serene, wellness-focused mood. Absolutely no text, letters, numbers, or alphanumeric characters visible anywhere.
