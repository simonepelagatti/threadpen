# Tone/Intent Quick Controls

## Problem
Users frequently want the same tonal adjustments (formal, casual) or intent patterns (accept, decline). Typing these instructions every time is repetitive.

## Solution
Two sets of controls:
- **Pre-draft:** Tone buttons (Formal / Casual / Friendly / Concise) and intent presets (Accept / Decline / Ask for info / Schedule) shown above the notes input. Selection prepends instructions to the prompt.
- **Post-draft (refinement):** Same buttons available after a draft is generated as one-click refinement actions.
- **Settings management:** Tone presets and intent templates are editable in the settings view. Users can add/remove/rename presets. Stored in `chrome.storage.sync` alongside other settings.

## Implementation Notes
- Default presets ship with the extension but are fully customizable
- Tone presets: array of `{ id, label, instruction }` objects
- Intent presets: array of `{ id, label, instruction }` objects
- Pre-draft selection prepends tone/intent instructions to the user's notes before sending to Claude
- Post-draft: clicking a tone/intent button triggers a refinement with that instruction
- Settings view gets a new section for managing tone and intent presets
