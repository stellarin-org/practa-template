---
name: generate-practa-splash
description: Generate a Practa splash screen image using AI image generation. Use when the user asks to create a practa splash, generate a splash image, make a splash screen for a practa, create a loading screen image, or any variation of generating/creating a splash screen image for their Practa.
---

# Generate a Practa Splash Image

Generate a portrait splash screen image for the user's Practa and save it to the correct assets location.

## Dimensions & Format

- **Aspect ratio:** 9:16 (portrait, full-screen mobile)
- **Format:** PNG
- **Output path:** `client/my-practa/assets/splash.png`

## Design Rules

1. **Full-screen portrait composition** — the image fills the entire mobile screen. Design with edge-to-edge coverage.
2. **No text** — the splash must not contain any text, letters, numbers, or alphanumeric characters.
3. **Atmospheric and immersive** — the splash sets the mood before the Practa loads. It should feel enveloping and calming.
4. **Visual consistency with the icon** — use similar color palette and visual language as the Practa's icon if one exists.
5. **Wellness/mindfulness tone** — serene, peaceful, restorative imagery appropriate for a wellbeing experience.
6. **Can use gradients, nature scenes, or abstract art** — anything that creates a beautiful, calming full-screen moment.

## Steps

1. Read `client/my-practa/metadata.json` to understand the Practa's name, description, category, and tags.
2. Check if an icon exists at `client/my-practa/assets/icon.png` — if so, align the splash's color palette and visual theme with the icon.
3. Compose a detailed image generation prompt that:
   - Describes a full-screen portrait scene or abstract composition
   - Matches the Practa's theme and mood
   - Specifies no text or alphanumeric characters
   - Ends with: "Absolutely no text, letters, numbers, or alphanumeric characters visible anywhere."
4. Generate the image with:
   - `output_path`: `client/my-practa/assets/splash.png`
   - `aspect_ratio`: `9:16`
   - `overwrite`: `true`
5. Ensure `metadata.json` has `"splash": "splash.png"` in the `assets` object. Add it if missing.
6. If the Practa previously used a video splash (`splash.mp4`), note this to the user — they may want to keep the video instead or replace it.

## Prompt Template

```
[Style]: Immersive, atmospheric full-screen mobile splash screen
[Composition]: Portrait orientation, edge-to-edge, [scene or abstract description]
[Colors]: [Color palette matching the Practa theme / icon]
[Mood]: Serene, peaceful, meditative, wellness-focused
[Details]: Soft lighting, gentle gradients, subtle depth
[End]: Absolutely no text, letters, numbers, or alphanumeric characters visible anywhere.
```

## Example Prompt

For a breathing exercise Practa with a teal/blue icon:

> Immersive atmospheric full-screen mobile splash screen in portrait orientation. Soft deep teal to ocean blue gradient filling the entire frame. Abstract gentle light rays emanating from the center, creating a sense of calm focus. Subtle concentric circles suggesting breath and rhythm. Soft bokeh light particles floating gently. Serene, peaceful, meditative mood with gentle depth and dimension. Absolutely no text, letters, numbers, or alphanumeric characters visible anywhere.
