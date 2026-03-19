# Draft History

## Problem
Once the user moves on from a draft, there's no way to go back and review or reuse previous drafts.

## Solution
Store a history of generated drafts with metadata (thread subject, timestamp, notes used, final draft text). Browsable from a "History" tab in the UI.

## Implementation Notes
- Store in `chrome.storage.local` (larger quota than sync)
- Each entry: `{ id, threadSubject, timestamp, notes, draft, tips, model }`
- Cap at ~100 entries, FIFO eviction
- UI: list view with search/filter by subject or date, click to expand full draft
- "Reuse" button to load a past draft's notes into the current session
- Could also enable "compare" — show two drafts side by side
