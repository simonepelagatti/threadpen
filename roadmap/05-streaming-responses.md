# Streaming Responses

## Problem
Claude's response takes several seconds. The user stares at a spinner with no feedback until the full response arrives.

## Solution
Stream Claude's response token-by-token using `stream: true` in the API request. Use `chrome.runtime.connect` port to push deltas from background to side panel.

## Implementation Notes
- Background sends `stream: true` in the API request body
- Use `chrome.runtime.connect` port (not `sendMessage`) for streaming deltas
- Port messages: `{ type: 'STREAM_DELTA', text: string }`, `{ type: 'STREAM_DONE', inputTokens, outputTokens }`, `{ type: 'STREAM_ERROR', error: string }`
- Buffer full text in background, split `---TIPS---` marker only after stream completes
- DraftOutput renders incrementally as tokens arrive
- Show a "streaming..." indicator instead of a generic spinner
