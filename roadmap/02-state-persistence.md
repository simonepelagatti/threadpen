# State Persistence Across Popup Close

## Problem
Switching tabs or clicking outside the popup loses the current draft, notes, loading state, and refinement history. The user has to start over.

## Solution
Persist popup state to `chrome.storage.session` on every meaningful change (debounced). Restore it when the popup reopens.

## Implementation Notes
- Save to session storage: notes text, draft, tips, conversation history, loading flag
- On popup open, hydrate state from session storage before fetching fresh thread data
- Clear saved state when the user explicitly starts a new draft or the thread changes
- This is a quick win even before side panel — improves UX immediately
- If side panel (roadmap #01) ships, this becomes less critical but still useful as a safety net
