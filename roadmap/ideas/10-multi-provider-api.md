# Multi-Provider API Support

## Status: Future Development

## Problem
ThreadPen hardcodes Anthropic's API in 4 fetch call sites. Users may want to use Scaleway AI, OpenRouter, Groq, Together, Ollama, or other providers.

## Key Insight
All alternative providers expose an **OpenAI-compatible** `/v1/chat/completions` endpoint. The problem collapses to two wire formats: **Anthropic** and **OpenAI-compatible**.

## Solution
Create a `lib/providers.ts` module with a provider registry and format adapters.

### Provider Registry
- `anthropic`: `api.anthropic.com/v1/messages`, Anthropic format
- `scaleway`: `api.scaleway.ai/v1/chat/completions`, OpenAI format
- `openrouter`: `openrouter.ai/api/v1/chat/completions`, OpenAI format
- `custom`: user-provided URL, OpenAI format

### Format Differences

| | Anthropic | OpenAI-compatible |
|---|---|---|
| Auth header | `x-api-key: <key>` | `Authorization: Bearer <key>` |
| System prompt | Top-level `system` field | `{"role": "system"}` in messages |
| Response text | `content[0].text` | `choices[0].message.content` |
| Input tokens | `usage.input_tokens` | `usage.prompt_tokens` |
| Output tokens | `usage.output_tokens` | `usage.completion_tokens` |
| Stream delta | `content_block_delta.delta.text` | `choices[0].delta.content` |
| Stream end | `message_stop` event | `data: [DONE]` |

### Adapter Functions Needed
- `getProviderConfig(settings)` → `{ url, headers, apiFormat }`
- `buildRequestBody(apiFormat, model, system, messages, options)` → JSON
- `parseResponse(apiFormat, data)` → `{ text, inputTokens, outputTokens }`
- `parseStreamEvent(apiFormat, jsonStr)` → `{ text?, inputTokens?, outputTokens?, done? }`

### Settings Changes
- Add `provider: ProviderId` (defaults to `'anthropic'` for backward compat)
- Add `baseUrl: string` (only for `custom` provider)
- Dynamic model list per provider in SettingsView
- Text input for model name when provider is `custom`

### Manifest Changes
- Add `host_permissions` for known providers (Scaleway, OpenRouter)
- Add `optional_host_permissions: ['https://*/*']` for custom — request at runtime

### Migration
No breaking changes. Existing users have no `provider` field → defaults to `anthropic`. Their `apiKey` and `model` continue working.

## Files to Modify
- `lib/types.ts` — Add `ProviderId`, `ProviderConfig`, extend `Settings`
- `lib/providers.ts` — **New file**: registry + 4 adapter functions
- `lib/storage.ts` — Add defaults for `provider`/`baseUrl`
- `entrypoints/background.ts` — Replace 4 fetch call sites with provider abstraction
- `entrypoints/sidepanel/components/SettingsView.tsx` — Provider dropdown, dynamic models
- `wxt.config.ts` — Expand host permissions
