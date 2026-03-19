# New Email Composition

## Problem
ThreadPen only works for replies to existing threads. Users also want help drafting fresh emails from scratch.

## Solution
"New Email" mode toggle in the UI. When active:
- Skip thread extraction
- Show input fields: recipient, subject, context/notes
- Claude drafts a fresh email based on notes alone
- "Insert" button targets Gmail's new-compose window (not reply)
- Content script detects whether to open a new compose or use an existing one

## Implementation Notes
- Toggle between "Reply" and "New Email" modes in the side panel header
- New email form: recipient (optional, for context), subject (optional), notes (required)
- Claude prompt adapted: no thread context, just notes + tone/intent if selected
- Insert targets Gmail's compose window (click the "Compose" button if no compose open)
- Draft history stores new-email drafts with a `mode: 'compose'` flag
