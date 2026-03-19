# Side Panel Mode (Replaces Popup)

## Problem
The popup closes when the user clicks away or switches tabs, making it hard to use alongside Gmail.

## Decision
Replace the popup entirely — no fallback, no user toggle. The extension icon opens the Chrome Side Panel.

## Solution
Use Chrome's [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) (`chrome.sidePanel`) to dock ThreadPen to the right side of the browser. The extension stays open while the user navigates Gmail, composes replies, and switches between threads.

## Implementation Notes
- Add `"sidePanel"` permission to `wxt.config.ts`
- Create `entrypoints/sidepanel/` with the same React app, responsive layout (300-600px)
- Remove `entrypoints/popup/` entirely
- Extension action button triggers `chrome.sidePanel.open()` via background listener on `chrome.action.onClicked`
- Move all shared components under `entrypoints/sidepanel/components/`
