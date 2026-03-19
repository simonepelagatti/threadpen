# Thread Summarization (On Demand)

## Problem
Long email threads are hard to parse. Users need to understand the full context before drafting a reply.

## Solution
"Summarize" button in ThreadPreview. Sends thread to Claude with a summarization-focused system prompt. Displays a collapsible one-paragraph summary.

## Implementation Notes
- Always user-initiated, never automatic
- Uses a separate system prompt focused on summarization (not reply drafting)
- Shows token cost for the summary call
- Summary displayed in a collapsible section below the thread preview
- New message type: `SUMMARIZE_THREAD` → returns `{ summary, inputTokens, outputTokens }`
