# Side Panel Mode

## Problem
The popup closes when the user clicks away or switches tabs, making it hard to use alongside Gmail.

## Solution
Use Chrome's [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) (`chrome.sidePanel`) to dock ThreadPen to the right side of the browser. The extension stays open while the user navigates Gmail, composes replies, and switches between threads.

## Implementation Notes
- Add `"sidePanel"` permission to manifest
- Create a `sidepanel/` entrypoint (same React UI as popup, adapted for taller layout)
- Register via `chrome.sidePanel.setOptions({ path: "sidepanel.html" })`
- Keep popup as fallback; let user choose mode in settings
- Side panel persists across tab switches — solves the "closing on tab change" problem too
