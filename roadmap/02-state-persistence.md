# State Persistence (Side Panel Safety Net)

## Problem
Accidentally closing the side panel (or browser restart) loses the current draft, notes, loading state, and refinement history.

## Solution
Auto-save panel state to `chrome.storage.session` on every meaningful change (debounced 500ms). Restore on panel open. Keyed by thread subject to avoid showing stale data for a different thread.

## Implementation Notes
- Save to session storage: notes text, draft, tips, conversation history, active tone/intent selections
- On panel open, hydrate state from session storage before fetching fresh thread data
- Clear saved state when the thread subject changes (new thread detected)
- Debounce writes to avoid thrashing storage on every keystroke
