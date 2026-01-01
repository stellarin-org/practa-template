# PractaTestHarness

A minimal testing environment for developing individual practa without importing Stellarin flow machinery.

## Overview

The `PractaTestHarness` allows template developers to:
- Test single practa in isolation
- Simulate receiving context from a previous practa
- Use splash screens and floating chrome controls
- Chain multiple practa manually without FlowContext

## Installation

See [Sync Files](#sync-files) section for the complete list of files to copy from stellarin-app.

## Basic Usage

```tsx
import { PractaTestHarness } from "@/components/PractaTestHarness";
import MyPracta from "./practa/MyPracta";

export default function App() {
  return (
    <PractaTestHarness
      PractaComponent={MyPracta}
      assets={{
        splash: require("./assets/splash.png"),
        background: require("./assets/bg.png"),
      }}
      onComplete={(output) => {
        console.log("Practa completed:", output);
      }}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `PractaComponent` | `React.ComponentType<PractaProps>` | Yes | The practa component to render |
| `assets` | `Record<string, unknown>` | No | Assets to pass via `context.assets`. If `splash` key exists, shows splash screen |
| `previousContext` | `PreviousPractaContext` | No | Simulates output from a previous practa |
| `storage` | `PractaStorage` | No | Storage instance. Defaults to no-op storage |
| `onComplete` | `(output: PractaOutput) => void` | No | Called when practa completes |
| `onClose` | `() => void` | No | Called when X close button is pressed |
| `onSettings` | `() => void` | No | Called when settings gear is pressed. Passed to your practa component |
| `showSplash` | `boolean` | No | Force splash on/off. Default: true if `assets.splash` exists |
| `showSettings` | `boolean` | No | Whether to show settings gear. Passed to your practa component |
| `showClose` | `boolean` | No | Show X close button in chrome overlay. Default: true if `onClose` is provided |
| `headerMode` | `"default" \| "minimal" \| "none"` | No | Header style. Default: "minimal" |
| `title` | `string` | No | Title for default header mode. Default: "" |
| `splashDuration` | `number` | No | Splash display duration in ms. Default: 2000 |

## Simulating Previous Practa Context

Test how your practa handles incoming context from a prior practa:

```tsx
<PractaTestHarness
  PractaComponent={PersonalizedMeditationPracta}
  previousContext={{
    practaId: "journal-1",
    practaType: "journal",
    content: {
      type: "text",
      value: "I've been feeling anxious about work lately. The deadlines are piling up.",
    },
    metadata: {
      source: "user",
      duration: 180000,
    },
  }}
  onComplete={(output) => console.log(output)}
/>
```

Your practa receives this via `context.previous`:

```tsx
function PersonalizedMeditationPracta({ context, onComplete }: PractaProps) {
  const journalText = context.previous?.content?.value;
  
  // Generate meditation based on journal content
  // ...
}
```

## Manual Flow Chaining

Chain multiple practa without FlowContext by passing one's output to the next:

```tsx
function TestFlow() {
  const [step, setStep] = useState<"journal" | "meditation" | "done">("journal");
  const [journalOutput, setJournalOutput] = useState<PractaOutput | null>(null);

  if (step === "journal") {
    return (
      <PractaTestHarness
        PractaComponent={JournalPracta}
        assets={{ splash: require("./journal-splash.png") }}
        onComplete={(output) => {
          setJournalOutput(output);
          setStep("meditation");
        }}
      />
    );
  }

  if (step === "meditation") {
    return (
      <PractaTestHarness
        PractaComponent={MeditationPracta}
        previousContext={journalOutput ? {
          practaId: "journal-step",
          practaType: "journal",
          content: journalOutput.content,
          metadata: journalOutput.metadata,
        } : undefined}
        onComplete={() => setStep("done")}
      />
    );
  }

  return <Text>Flow complete!</Text>;
}
```

## Storage

By default, storage operations are no-ops (reads return null, writes succeed silently). For testing persistence:

```tsx
import { createTestStorage } from "@/lib/test-storage";

const testStorage = createTestStorage();

<PractaTestHarness
  PractaComponent={MyPracta}
  storage={testStorage}
  onComplete={() => {
    // Inspect what was stored
    console.log(testStorage.dump());
  }}
/>
```

## Chrome Controls

The harness renders a floating chrome overlay with configurable header modes. Practa can also configure additional options via `usePractaChrome()`.

### Header Modes

Three header modes are available:

| Mode | Description |
|------|-------------|
| `"default"` | White/blur bar with close button on left, title in center |
| `"minimal"` | Floating X button only, no bar (default for PractaTestHarness) |
| `"none"` | No header - practa has full control |

```tsx
// Default header with title bar
<PractaTestHarness
  PractaComponent={MyPracta}
  headerMode="default"
  title="My Practa"
  onClose={() => navigation.goBack()}
/>

// Minimal floating X (default)
<PractaTestHarness
  PractaComponent={MyPracta}
  headerMode="minimal"
  onClose={() => console.log("User dismissed")}
/>

// No header - full-bleed content
<PractaTestHarness
  PractaComponent={MyPracta}
  headerMode="none"
/>
```

### Dynamic Chrome Configuration

Your practa can dynamically configure the chrome via `usePractaChrome()`:

```tsx
function MyPracta({ context, onComplete }: PractaProps) {
  const { setConfig } = usePractaChrome();

  useEffect(() => {
    setConfig({
      headerMode: "default",
      title: "My Custom Title",
      showSettings: true,
      onSettings: () => setShowSettingsModal(true),
    });
  }, []);

  return <View>...</View>;
}
```

### Chrome Config Options

| Option | Type | Description |
|--------|------|-------------|
| `headerMode` | `"default" \| "minimal" \| "none"` | Override header mode |
| `title` | `string` | Title text for default header |
| `showSettings` | `boolean` | Show settings gear in top-right |
| `onSettings` | `() => void` | Callback when settings is tapped |
| `showProgressDots` | `boolean` | Show progress dots (for multi-step flows) |
| `rightAction` | `ReactNode` | Custom right-side action element |

### Adding Right Action

Your practa can add custom controls to the chrome overlay:

```tsx
function MyPracta({ context, onComplete }: PractaProps) {
  const { setConfig } = usePractaChrome();

  useEffect(() => {
    setConfig({
      rightAction: (
        <Pressable onPress={() => console.log("Settings tapped")}>
          <Feather name="settings" size={20} color="white" />
        </Pressable>
      ),
    });
  }, []);

  return <View>...</View>;
}
```

## Full Component Code

See `client/components/PractaTestHarness.tsx` for the full implementation. The component includes:
- PractaChromeHeader with multiple header modes
- PractaSplashScreen integration
- Safe area inset handling
- No-op storage default

## Sync Files

The following files should be synced from stellarin-app to template projects:

```
client/types/flow.ts
client/components/PractaTestHarness.tsx
client/components/PractaSplashScreen.tsx
client/components/PractaChromeHeader.tsx
client/context/PractaChromeContext.tsx
client/lib/practa-storage.ts
client/constants/theme.ts
client/hooks/useTheme.ts
client/components/ThemedText.tsx
client/components/ThemedView.tsx
client/components/Card.tsx
```

## Type Definitions Reference

From `flow.ts`:

```typescript
interface PractaContext {
  flowId: string;
  practaIndex: number;
  assets?: Record<string, unknown>;
  storage?: PractaStorage;
  previous?: PreviousPractaContext;
}

interface PreviousPractaContext {
  practaId: string;
  practaType: PractaType;
  content?: PractaContent;
  metadata?: PractaMetadata;
}

interface PractaOutput {
  content?: PractaContent;
  metadata?: PractaMetadata;
}

interface PractaProps {
  context: PractaContext;
  onComplete: (output: PractaOutput) => void;
  showSettings?: boolean;
  onSettings?: () => void;
}
```
