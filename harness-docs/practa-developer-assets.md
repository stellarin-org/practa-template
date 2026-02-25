# Practa Developer Guide: Assets

## Overview

Assets are images, data files, and other resources your practa needs. Stellarin handles downloading, caching, and serving assets automatically - you just declare them and use them.

## Declaring Assets

Assets are declared in your practa's registry entry. The Practa Manager handles this when you publish.

```json
{
  "slug": "my-practa",
  "assets": {
    "splash": "https://cdn.example.com/splash.png",
    "background": "https://cdn.example.com/bg.jpg",
    "wordlist": "https://cdn.example.com/words.json",
    "puzzles": "https://cdn.example.com/puzzles.json"
  }
}
```

Asset keys are camelCase identifiers you'll use in your code.

## Using Assets in Your Practa

All assets are available via `context.assets`. Usage is automatic based on file type.

### Images

Use directly with the Image component:

```tsx
import { Image } from 'react-native';

function MyPracta({ context }) {
  return (
    <Image source={context.assets.splash} />
    <Image source={context.assets.background} style={styles.bg} />
  );
}
```

### JSON Data

Use directly as parsed objects/arrays:

```tsx
function MyPracta({ context }) {
  const words = context.assets.wordlist; // Already parsed!
  const puzzles = context.assets.puzzles;
  
  // Use immediately - no async, no fetch, no parsing
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const todaysPuzzle = puzzles.find(p => p.date === today);
  
  return <Text>{randomWord}</Text>;
}
```

## Supported File Types

| Extension | What You Receive | Usage |
|-----------|-----------------|-------|
| `.png` | Image source object | `<Image source={context.assets.icon} />` |
| `.jpg` / `.jpeg` | Image source object | `<Image source={context.assets.photo} />` |
| `.gif` | Image source object | `<Image source={context.assets.animation} />` |
| `.json` | Parsed JavaScript object/array | `context.assets.data.forEach(...)` |

## What You Don't Need to Do

Stellarin handles all of this automatically:

- Downloading assets from CDN
- Caching assets locally for offline use
- Updating cached assets when you publish new versions
- Parsing JSON files
- Managing storage space
- Handling network errors and retries

## Best Practices

### Keep Asset Keys Simple
```typescript
// Good
context.assets.splash
context.assets.wordlist
context.assets.levelData

// Avoid
context.assets.mainSplashScreenImageV2
context.assets.allWordsForGameplayFiltered
```

### Use Descriptive Keys for Multiple Similar Assets
```typescript
context.assets.splashLight
context.assets.splashDark
context.assets.iconSmall
context.assets.iconLarge
```

### JSON Data Structure
Structure your JSON for direct use - no transformation needed:

```json
// words.json - simple array
["apple", "banana", "cherry"]

// puzzles.json - array of objects
[
  { "id": 1, "question": "...", "answer": "..." },
  { "id": 2, "question": "...", "answer": "..." }
]

// config.json - configuration object
{
  "difficulty": "medium",
  "timeLimit": 60,
  "hints": true
}
```

### Asset Size Guidelines

| Asset Type | Recommended Max Size |
|------------|---------------------|
| Splash image | 500 KB |
| Icons/thumbnails | 100 KB |
| Background images | 1 MB |
| JSON data files | 5 MB |
| Total per practa | 20 MB |

Larger assets mean slower first-load for users.

## Offline Behavior

- **First use**: Requires internet connection
- **After first use**: Works fully offline (assets cached locally)
- **Updates**: Cached automatically when user next opens your practa

Users don't need to think about this - it just works.

## Common Patterns

### Splash Screen with Background
```tsx
function MyPracta({ context }) {
  return (
    <View style={styles.container}>
      <Image 
        source={context.assets.background} 
        style={StyleSheet.absoluteFill} 
      />
      <Image source={context.assets.logo} />
    </View>
  );
}
```

### Data-Driven Game
```tsx
function QuizPracta({ context }) {
  const questions = context.assets.questions;
  const [current, setCurrent] = useState(0);
  
  return (
    <View>
      <Text>{questions[current].question}</Text>
      {questions[current].options.map(opt => (
        <Button key={opt} title={opt} />
      ))}
    </View>
  );
}
```

### Daily Content
```tsx
function DailyPracta({ context }) {
  const allContent = context.assets.dailyContent;
  const today = new Date().toISOString().split('T')[0];
  const todaysContent = allContent.find(c => c.date === today);
  
  return <Text>{todaysContent.message}</Text>;
}
```

## Questions?

If your asset needs don't fit these patterns, reach out to the Stellarin team.
