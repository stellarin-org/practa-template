# Practa Starter Template

Build interactive wellbeing experiences for the Stellarin app.

## What is Practa?

Practa are small daily rituals - mini-app experiences that users incorporate into their daily flows. Think breathing exercises, gratitude prompts, mindfulness moments, or any brief interactive experience that supports wellbeing.

This template provides everything you need to build, preview, and submit your own Practa to the Stellarin app.

## How It Works

1. **Build** your Practa using React Native components
2. **Preview** it in real-time using the built-in development app
3. **Validate** against Stellarin's requirements
4. **Submit** for inclusion in the next Stellarin release

When Stellarin is next published to the app store, your Practa will be bundled and available for users to add to their daily flows.

## Getting Started

### Option 1: Use Replit AI (No Coding Required)

1. Open this project in Replit
2. Describe your idea to Replit AI
3. Preview your Practa in the app
4. Iterate until polished
5. Submit when ready

### Option 2: Build Manually

1. Edit `client/my-practa/index.tsx` - your Practa component
2. Update `client/my-practa/metadata.json` - your Practa info
3. Add assets to `client/my-practa/assets/`
4. Run the app to preview
5. Submit when ready

## Project Structure

```
client/
  my-practa/                # YOUR PRACTA - Edit this folder
    index.tsx               # Your component (default export)
    metadata.json           # Name, description, author, version
    assets/                 # Images, splash screen, data files
  
  demo-practa/              # Example Practa to reference
    breathing-pause/        # Guided breathing exercise
    gratitude-prompt/       # Text reflection prompt
    tap-counter/            # Interactive counter

  components/               # Shared UI components
  constants/                # Theme colors and spacing
  hooks/                    # useTheme, useScreenOptions
  types/                    # TypeScript definitions

docs/
  practa-developer-guide.md # Full API documentation
  practa-storage-system.md  # Persistence API reference

server/                     # Express backend for development
```

## The Practa Contract

Every Practa receives these props:

```typescript
interface PractaProps {
  context: PractaContext;
  onComplete: (output: PractaOutput) => void;
  showSettings?: boolean;
  onSettings?: () => void;
}
```

- **context** - Flow info, resolved assets, and optional storage
- **onComplete** - Call this when the user finishes your Practa
- **showSettings** - Whether to show a settings button
- **onSettings** - Callback when settings button is tapped

## Features

### Theming
Built-in light/dark mode support using the `useTheme()` hook.

### Assets
Declare images and data files in `metadata.json` and access them via `context.assets`.

### Storage
Persist user preferences across sessions with `context.storage`.

### Splash Screens
Add a branded splash screen that displays before your Practa loads.

## Documentation

| Document | Description |
|----------|-------------|
| [Developer Guide](template-docs/practa-developer-guide.md) | Complete API reference and examples |
| [Storage System](template-docs/practa-storage-system.md) | Persistence API for saving state |
| [Design Guidelines](harness-docs/design_guidelines.md) | Visual design system |

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Express** backend for development
- iOS 26 Liquid Glass design language

## License

This template is provided for creating Practa for the Stellarin app.
