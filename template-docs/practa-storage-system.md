# Practa Storage System

A persistence system that allows community practa to save and restore state across sessions. This enables use cases like remembering user preferences (difficulty level, timer duration) or saving progress in multi-session activities.

## Features

- **Simple API** - Practa authors use intuitive get/set methods
- **Automatic isolation** - Each practa's data is namespaced by user ID and slug
- **Local-first** - Works offline using AsyncStorage
- **Safe** - Untrusted community code can't access other practa's data
- **Resilient** - Graceful error handling for corrupted data or storage failures

## Quick Start

Storage is automatically available via `context.storage` in any practa component:

```typescript
function MyPracta({ context, onComplete }: PractaComponentProps) {
  const [difficulty, setDifficulty] = useState<string>("medium");
  
  useEffect(() => {
    context.storage?.get<string>("difficulty")
      .then((saved) => {
        if (saved) setDifficulty(saved);
      })
      .catch(() => {});
  }, []);
  
  const handleDifficultyChange = async (level: string) => {
    setDifficulty(level);
    context.storage?.set("difficulty", level).catch(() => {});
  };
  
  // ... rest of component
}
```

## API Reference

### PractaStorage Interface

```typescript
interface PractaStorage {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

### Methods

| Method | Description |
|--------|-------------|
| `get<T>(key)` | Retrieve a value. Returns `null` if not found or corrupted. |
| `set(key, value)` | Store a JSON-serializable value. Throws if quota exceeded. |
| `remove(key)` | Delete a single key. |
| `clear()` | Delete all keys for this practa (for this user). |

### Error Handling

All methods return promises. `get()` never throws (returns `null` on error), but `set()` may throw:

```typescript
try {
  await context.storage?.set("key", value);
} catch (error) {
  // Value too large or quota exceeded
}
```

## Namespacing

All storage keys are automatically prefixed with user ID and practa slug:

```
practa:{userId}:{slug}:{key}
```

| User | Practa | Key | AsyncStorage Key |
|------|--------|-----|------------------|
| user-123 | daily-sudoku | difficulty | `practa:user-123:daily-sudoku:difficulty` |
| anon-abc | daily-sudoku | difficulty | `practa:anon-abc:daily-sudoku:difficulty` |
| user-123 | builtin-journal | lastDraft | `practa:user-123:builtin-journal:lastDraft` |

### User Identity

- **Authenticated users**: Uses `user.sub` from ManaPond auth
- **Anonymous users**: Uses `anon-{deviceId}` 

This ensures users on shared devices have isolated data.

### Slug Resolution

- **Community practa**: Uses the `slug` from `metadata.json`
- **Built-in practa**: Uses `builtin-{type}` (e.g., `builtin-journal`)

## Limits

| Limit | Value | Behavior |
|-------|-------|----------|
| Per-value size | 10 KB | `set()` throws error |
| Total per-practa | 100 KB | `set()` throws error |
| JSON serialization | Required | `set()` throws error |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Practa Component                      │
│   context.storage.get("key")                             │
│   context.storage.set("key", value)                      │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  PractaStorageManager                    │
│   - Prefixes keys: "practa:{userId}:{slug}:{key}"        │
│   - Enforces size limits and quota                       │
│   - Safe JSON parsing with fallback                      │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     AsyncStorage                         │
│   Persists to device - survives app restarts             │
└─────────────────────────────────────────────────────────┘
```

## Data Lifecycle

### When Data Persists

- App restart
- Device restart  
- User logout (data remains tied to user ID)
- App updates

### When Data Is Cleared

- App uninstall (OS clears all data)
- User clears app data in device settings
- Practa calls `storage.clear()`

### Logout Behavior

When a user logs out:
1. Their data remains in storage (keyed by userId)
2. New user/anonymous session gets a fresh namespace
3. If original user logs back in, their data is restored

## Security

### What Practa Cannot Do

- Access another practa's stored data
- Access another user's data
- Access app-level storage (sessions, meditation history, etc.)
- Store non-serializable data (functions, class instances)
- Exceed storage quotas
- Crash the app by storing corrupted data

## Implementation Files

| File | Purpose |
|------|---------|
| `client/lib/practa-storage.ts` | PractaStorageManager class |
| `client/types/flow.ts` | PractaStorage interface, PractaContext |
| `client/screens/FlowScreen.tsx` | Creates and injects storage per practa |

## Complete Example

```typescript
import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { PractaContext, PractaCompleteHandler } from "@/types/flow";

interface Props {
  context: PractaContext;
  onComplete: PractaCompleteHandler;
}

type Difficulty = "easy" | "medium" | "hard";

export default function DailySudoku({ context, onComplete }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!context.storage) {
      setIsLoading(false);
      return;
    }
    
    context.storage.get<Difficulty>("difficulty")
      .then((saved) => {
        if (saved) setDifficulty(saved);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [context.storage]);

  const handleDifficultyChange = async (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    context.storage?.set("difficulty", newDifficulty).catch(() => {});
  };

  if (isLoading) return null;

  return (
    <View>
      {/* Component UI */}
    </View>
  );
}
```

## Future Considerations

### Cloud Sync

The storage interface could be extended for optional cloud sync:

```typescript
interface PractaStorage {
  // ... existing methods
  sync(): Promise<void>;
  isSynced(): boolean;
}
```

### Migration

If a practa slug changes, old data becomes orphaned. Future versions may support migration scripts.
