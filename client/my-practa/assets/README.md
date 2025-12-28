# Practa Assets

Place your Practa assets in this folder.

## Splash Screen

To add a branded splash screen that shows before your Practa loads:

1. Add a file named `splash.png` to this folder
2. Uncomment the splash line in `assets.ts`

### Image Requirements

| Property | Requirement |
|----------|-------------|
| File name | `splash.png` (exact name, lowercase) |
| Aspect ratio | 1:2 recommended (e.g., 1080 x 2160) |
| Format | PNG |

The image displays edge-to-edge, anchored to the top. Overflow clips from the bottom, ensuring branding at the top is always visible.

If no splash.png is provided, your Practa loads immediately without a splash screen.
