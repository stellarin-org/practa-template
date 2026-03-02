# Practa AI

Every practa gets `context.ai` automatically — three functions that give you direct access to OpenAI, Gemini, and Anthropic. No API keys, no endpoints, no imports. The request and response shapes are identical to the official SDKs you already know.

## Quick Start

```tsx
// OpenAI — same as openai.chat.completions.create()
const chat = await context.ai.openai({
  model: "gpt-5-nano",
  messages: [
    { role: "system", content: "You are a mindfulness coach." },
    { role: "user", content: "Give me a one-line affirmation." },
  ],
});
const text = chat.choices[0].message.content;

// Gemini — same as ai.models.generateContent()
const gen = await context.ai.gemini({
  model: "gemini-2.5-flash",
  contents: [
    { role: "user", parts: [{ text: "Summarize this journal entry..." }] },
  ],
});
const text = gen.text;

// Anthropic — same as anthropic.messages.create()
const msg = await context.ai.anthropic({
  model: "claude-haiku-4-5",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Suggest a breathing exercise." },
  ],
});
const text = msg.content[0].text;
```

## Available Models

### OpenAI
| Model | Best For |
|-------|----------|
| `gpt-5-nano` | Fast, cheap — game commentary, quick prompts |
| `gpt-5-mini` | Cost-effective for higher-volume tasks |
| `gpt-5.2` | Most capable — complex reasoning, rich content |

### Gemini
| Model | Best For |
|-------|----------|
| `gemini-2.5-flash` | General purpose, fast |
| `gemini-2.5-pro` | Complex reasoning |
| `gemini-3-flash-preview` | Latest hybrid reasoning |

### Anthropic
| Model | Best For |
|-------|----------|
| `claude-haiku-4-5` | Fastest, simple tasks |
| `claude-sonnet-4-6` | Balanced performance |
| `claude-opus-4-6` | Most capable |

New models are supported automatically — no app updates needed.

## Request & Response Formats

**OpenAI** and **Anthropic** return the raw provider response — the exact same shape as the official SDKs:
- **OpenAI**: [Chat Completions API](https://platform.openai.com/docs/api-reference/chat) — `response.choices[0].message.content`
- **Anthropic**: [Messages API](https://docs.anthropic.com/en/api/messages) — `response.content[0].text`

**Gemini** returns a serialized response with these fields:
- `text` — the generated text (convenience shorthand)
- `candidates` — full candidate list with finish reasons
- `usageMetadata` — token counts
- `modelVersion` — the model version used

Reference: [generateContent API](https://ai.google.dev/api/generate-content)

## Best Practices

### Check connectivity first
```tsx
if (!context.isOnline) {
  // Show offline fallback
  return;
}
const result = await context.ai.openai({ ... });
```

### Respect the aiEnabled flag
If your practa declares `requiresAI: true` in metadata, the flow system automatically skips it when AI is disabled. For optional AI features, check the config:
```tsx
const aiEnabled = context.config?.aiEnabled !== false;
if (aiEnabled) {
  const result = await context.ai.openai({ ... });
}
```

### Error handling
```tsx
try {
  const result = await context.ai.openai({ ... });
} catch (err) {
  if (err.status === 429) {
    // Rate limited — wait and retry, or show a message
  }
  // Other errors: show graceful fallback
}
```

### Pick the right model
- Use `gpt-5-nano` / `claude-haiku-4-5` / `gemini-2.5-flash` for quick, cheap calls (game comments, short prompts)
- Use full models only when you need complex reasoning or long-form content
- Keep prompts concise — shorter prompts = faster responses + lower cost

## Rate Limits

The API allows 10 requests per minute per user across all providers. Design your practa to make focused, efficient calls rather than polling rapidly.

## How It Works

The harness creates `context.ai` automatically. Under the hood, each function calls a server-side pass-through endpoint that forwards your request to the provider via Replit AI Integrations. You never need to think about endpoints, API keys, or server configuration.
