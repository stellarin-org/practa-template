# Community Practa Configuration Guide

This guide explains how to add configurable options to your community practa so users can customize settings when adding your practa to a flow.

## Overview

When users add your practa to a flow in the Stellarin app, they can tap a settings gear icon to configure options you've defined. Your practa then receives these settings at runtime via `context.config`.

## Adding Configuration to Your Practa

Add a `configSchema` object to your `metadata.json`:

```json
{
  "slug": "my-practa",
  "name": "My Practa",
  "version": "1.0.0",
  "description": "A wonderful practa",
  "author": "Your Name",
  "category": "mindfulness",
  "estimatedDuration": 120,
  "assets": {
    "splash": "splash.png"
  },
  "configSchema": {
    "fields": {
      "duration": {
        "type": "number",
        "label": "Duration (minutes)",
        "description": "How long the session lasts",
        "default": 5,
        "min": 1,
        "max": 30
      },
      "soundEnabled": {
        "type": "boolean",
        "label": "Play Sounds",
        "description": "Enable audio cues during the session",
        "default": true
      }
    },
    "requiredConfig": false
  }
}
```

## Field Types

### String Field

Text input for free-form text.

```json
{
  "prompt": {
    "type": "string",
    "label": "Custom Prompt",
    "description": "A question or topic for reflection",
    "placeholder": "What are you grateful for?",
    "required": false
  }
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"string"` | Yes | Field type identifier |
| `label` | string | Yes | Display label shown to users |
| `description` | string | No | Help text below the label |
| `placeholder` | string | No | Placeholder text in the input |
| `default` | string | No | Default value (defaults to empty string `""`) |
| `required` | boolean | No | Whether the field must be filled |

### Number Field

Numeric input with optional min/max constraints.

```json
{
  "rounds": {
    "type": "number",
    "label": "Number of Rounds",
    "description": "How many rounds to complete",
    "default": 10,
    "min": 5,
    "max": 50
  }
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"number"` | Yes | Field type identifier |
| `label` | string | Yes | Display label shown to users |
| `description` | string | No | Help text below the label |
| `default` | number | **Yes** | Default value (required so practa has a fallback) |
| `min` | number | No | Minimum allowed value |
| `max` | number | No | Maximum allowed value |

### Boolean Field

Toggle switch for on/off settings.

```json
{
  "hapticFeedback": {
    "type": "boolean",
    "label": "Haptic Feedback",
    "description": "Vibrate on key moments",
    "default": true
  }
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"boolean"` | Yes | Field type identifier |
| `label` | string | Yes | Display label shown to users |
| `description` | string | No | Help text below the label |
| `default` | boolean | **Yes** | Default value (`true` or `false`) |

### Select Field

Single-choice selection from predefined options.

```json
{
  "difficulty": {
    "type": "select",
    "label": "Difficulty Level",
    "description": "Choose your challenge level",
    "options": [
      { "value": "easy", "label": "Easy" },
      { "value": "medium", "label": "Medium" },
      { "value": "hard", "label": "Hard" }
    ],
    "default": "medium"
  }
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"select"` | Yes | Field type identifier |
| `label` | string | Yes | Display label shown to users |
| `description` | string | No | Help text below the label |
| `options` | array | Yes | Array of `{ value, label }` objects |
| `default` | string | **Yes** | Default selected value (must match one of the option values) |

## Default Values

All configuration fields (except `string`) require a `default` property. This ensures that every Practa can run correctly out-of-the-box without requiring user configuration, while still allowing customization when desired.

| Field Type | Default Required | Notes |
|------------|------------------|-------|
| `number` | **Yes** | Practa needs a valid fallback value |
| `boolean` | **Yes** | Must be explicitly `true` or `false` |
| `select` | **Yes** | Must match one of the defined option values |
| `string` | No | Implicitly defaults to empty string `""` if not specified |

The `requiredConfig` schema-level flag can still be set to `true` if a Practa author wants to force users to review settings before use.

## Schema-Level Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `fields` | object | Required | Object containing field definitions |
| `requiredConfig` | boolean | `false` | If `true`, users must configure before saving |

## Accessing Config in Your Practa

Your practa component receives configuration via `context.config`:

```tsx
import { PractaProps } from "@/types/flow";

export default function MyPracta({ context, onComplete }: PractaProps) {
  const duration = context.config?.duration ?? 5;
  const soundEnabled = context.config?.soundEnabled ?? true;
  const difficulty = context.config?.difficulty ?? 'easy';
  
  return (
    <View>
      <Text>Duration: {duration} minutes</Text>
      <Text>Sound: {soundEnabled ? 'On' : 'Off'}</Text>
      <Text>Difficulty: {difficulty}</Text>
    </View>
  );
}
```

## Complete Example

Here's a full example of a configurable practa:

### metadata.json

```json
{
  "id": "focus-timer",
  "name": "Focus Timer",
  "version": "1.0.0",
  "description": "A customizable focus session timer",
  "author": "Practa Developer",
  "category": "productivity",
  "estimatedDuration": 300,
  "assets": {
    "splash": "splash.png"
  },
  "configSchema": {
    "fields": {
      "duration": {
        "type": "number",
        "label": "Session Length",
        "description": "Duration in minutes",
        "default": 25,
        "min": 5,
        "max": 60
      },
      "breakReminder": {
        "type": "boolean",
        "label": "Break Reminder",
        "description": "Show a reminder to take a break after the session",
        "default": true
      },
      "ambiance": {
        "type": "select",
        "label": "Background Ambiance",
        "default": "none",
        "options": [
          { "value": "none", "label": "Silent" },
          { "value": "rain", "label": "Rain Sounds" },
          { "value": "forest", "label": "Forest Sounds" },
          { "value": "cafe", "label": "Cafe Ambiance" }
        ]
      },
      "intention": {
        "type": "string",
        "label": "Session Intention",
        "description": "What do you want to focus on?",
        "placeholder": "e.g., Deep work on project X"
      }
    },
    "requiredConfig": false
  }
}
```

### Component Usage

```tsx
import { View, Text } from "react-native";
import { PractaProps } from "@/types/flow";

export default function FocusTimer({ context, onComplete }: PractaProps) {
  const config = context.config ?? {};
  
  const duration = config.duration ?? 25;
  const breakReminder = config.breakReminder ?? true;
  const ambiance = config.ambiance ?? 'none';
  const intention = config.intention ?? '';

  return (
    <View style={styles.container}>
      {intention ? (
        <Text style={styles.intention}>Focus: {intention}</Text>
      ) : null}
      <Timer minutes={duration} />
    </View>
  );
}
```

## Best Practices

1. **Always provide defaults** - Users may skip configuration, so handle missing values gracefully
2. **Use descriptive labels** - Make it clear what each option does
3. **Add descriptions for complex options** - Help users understand the impact of their choices
4. **Keep it simple** - Don't overwhelm users with too many options
5. **Set sensible min/max values** - Prevent invalid configurations
6. **Test with and without configuration** - Ensure your practa works in both scenarios

## Validation

The Stellarin app automatically:
- Validates number fields against min/max constraints
- Enforces required fields when `requiredConfig: true`
- Provides type-safe config to your practa
- Shows the settings gear icon in the flow editor for configurable practas

## Questions?

If you have questions about implementing configuration for your practa, reach out to the Stellarin team.
