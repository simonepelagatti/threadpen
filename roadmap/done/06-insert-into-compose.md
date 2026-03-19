# Insert into Gmail Compose

## Problem
After generating a draft, the user must manually copy and paste it into Gmail's compose box. This breaks the flow.

## Solution
One-click "Insert into Reply" button. Content script handles three cases:
- **No compose open:** click Gmail's reply button, wait for compose box, insert draft
- **Reply already open:** find the active compose box and insert draft
- **Reply-all already open:** detect reply-all compose and insert draft into it (don't override with a single reply)

## Implementation Notes
- Detection: check for existing `.editable` compose areas first. If found, insert there. If not, click reply button.
- Fall back to clipboard copy with a toast if DOM injection fails
- New content script message type: `INSERT_DRAFT { text: string }`
- New compose handling: detect or open a new blank compose window for "New Email" mode
