# Draft History (Local, 25 Entries)

## Problem
Once the user moves on from a draft, there's no way to go back and review or reuse previous drafts.

## Solution
Store last 25 drafts in `chrome.storage.local` with FIFO eviction. Browsable list view in the side panel with a "History" tab.

## Implementation Notes
- Store in `chrome.storage.local` (larger quota than sync)
- Each entry: `{ id, threadSubject, timestamp, notes, draft, tips, model }`
- Cap at 25 entries, FIFO eviction (oldest dropped when limit reached)
- UI: list view sorted by timestamp, click to expand full draft
- "Reuse" button to load a past draft's notes into the current session
