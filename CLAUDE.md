# ThreadPen — Development Guide

## What is this?
ThreadPen is a Chrome extension that helps users draft Gmail replies and compose new emails using Claude. It runs as a side panel alongside Gmail.

## Tech Stack
- **Framework**: [WXT](https://wxt.dev) (Web Extension Toolkit) with React
- **Language**: TypeScript
- **Package manager**: pnpm (10.32.1)
- **AI**: Anthropic Claude API (direct browser access, no backend server)
- **Storage**: `chrome.storage.sync` (settings), `chrome.storage.session` (thread cache, session state), `chrome.storage.local` (draft history, contact agenda)

## Build & Dev Commands
```bash
pnpm dev      # Start dev server with hot reload
pnpm build    # Production build → output in .output/
pnpm zip      # Build and package as .zip for distribution
```

After `pnpm build`, reload the extension in `chrome://extensions` to pick up changes.

**Important**: `npx tsc --noEmit` will report false errors (missing `chrome` types, `--jsx` not set) because the tsconfig extends WXT's generated config at `.wxt/tsconfig.json`. Always use `pnpm build` to verify correctness.

## Versioning
- The canonical version lives in **`wxt.config.ts`** (`manifest.version`). This is what Chrome sees.
- `package.json` also has a `version` field but it's not used at runtime.
- The version is displayed in the side panel header via `chrome.runtime.getManifest().version`.
- Bump the version in `wxt.config.ts` when making user-visible changes so the user can confirm they're running the latest build after reloading.

## Project Structure
```
lib/                          # Shared logic (no framework dependencies)
  types.ts                    # All TypeScript types, interfaces, constants
  storage.ts                  # chrome.storage CRUD (settings, cache, history, contacts)
  claude.ts                   # Prompt builders, response parsers
  messages.ts                 # Runtime message helpers (sendRuntimeMessage, etc.)
  markdown.ts                 # Markdown-to-plaintext converter

entrypoints/
  background.ts               # Service worker: message routing, API calls, streaming
  gmail-reader.content/        # Content script: extracts thread data from Gmail DOM
  gmail-bridge.content.ts      # Content script: inserts drafts into Gmail compose box
  sidepanel/                   # React side panel UI
    App.tsx                    # Main app component, state management (useReducer)
    style.css                  # All styles (single file, no CSS modules)
    components/
      AgendaView.tsx           # Contact agenda list (search, expand, edit, delete)
      ComposeForm.tsx          # New email form with recipient typeahead from agenda
      ContactEditor.tsx        # Add/edit contact form
      CopyButton.tsx           # Copy-to-clipboard button
      DraftOutput.tsx          # Draft display (supports streaming)
      HistoryView.tsx          # Draft history list
      NotesInput.tsx           # User notes textarea + submit
      SettingsView.tsx         # Settings form (API key, model, guidelines, presets)
      ThreadPreview.tsx        # Thread info card with summarize
      TipsOutput.tsx           # AI tips display
      ToneControls.tsx         # Tone/intent preset chips

roadmap/                       # Feature specs organized by status
  done/                        # Completed features
  ideas/                       # Planned/proposed features
  wip/                         # Work in progress

wxt.config.ts                  # WXT config: manifest, permissions, modules
```

## Architecture Patterns

### Message Flow
- **Content script → Background**: `chrome.runtime.sendMessage` with `RuntimeMessage` union type
- **Side panel → Background**: Same `RuntimeMessage` for one-shot, `StreamPortMessage` via `chrome.runtime.connect` for streaming
- **Background → Side panel**: `chrome.runtime.sendMessage` broadcasts (e.g., `THREAD_DATA_UPDATED`)

### Streaming
Draft generation uses SSE streaming via the Anthropic API (`stream: true`). The side panel opens a port (`threadpen-stream`), background reads the stream and forwards `STREAM_DELTA` chunks, then sends `STREAM_DONE` with token counts.

### State Management
`App.tsx` uses `useReducer` with a `State`/`Action` pattern. Session state is debounce-persisted to `chrome.storage.session` so it survives panel reopens.

### Contact Agenda
- Contacts are auto-populated via a fire-and-forget Haiku call after each draft generation (`EXTRACT_CONTACT_INFO`)
- Manual edits are protected: `fieldMeta` tracks `source: 'manual' | 'auto'` per field; auto-extraction never overwrites manual fields
- Contact profiles are injected into system prompts as a `--- RECIPIENT PROFILE ---` block

## Style Conventions
- **CSS**: Single `style.css` file, BEM-ish class names (`.contact-card-header`), no CSS modules
- **Colors**: Evergreen palette — primary `#15803d`, accents `#bbf7d0`, `#f0fdf4`, `#22c55e`
- **Components**: Functional React components, props interfaces defined inline above the component
- **Naming**: Files use PascalCase for components, camelCase for lib modules
- **No test framework** currently configured

## Key Design Decisions
- No backend server — all API calls go directly from the browser to Anthropic's API using `anthropic-dangerous-direct-browser-access` header
- Privacy-first — no Gmail mailbox scanning; contact data is built passively from generated drafts
- Haiku model for contact extraction (cheap, fast, never blocks the user)
- `chrome.storage.local` for contacts/history (10MB limit vs 100KB for sync)
