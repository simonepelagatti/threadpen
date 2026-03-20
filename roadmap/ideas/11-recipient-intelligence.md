# Contact Agenda (Recipient Intelligence)

## Status: Done

## Problem
When composing or replying to emails, ThreadPen has no context about the recipient. Drafts are generic and don't account for the relationship, role, or preferred communication tone.

## Solution
A **Contact Agenda** — an AI-aware address book that stores per-contact profiles (role, company, relationship, preferred tone, notes). Profiles are injected into Claude's system prompt to tailor drafts.

### Two population modes
1. **Manual**: Users add/edit contacts via a dedicated Agenda UI
2. **Auto-population**: After each draft generation, a lightweight Haiku call extracts recipient info from the thread context and upserts it into the agenda — no mailbox scanning

## How It Works

### Contact Profile
Each contact stores:
- Email (primary key, normalized to lowercase)
- Name, role/title, company
- Relationship type (colleague, client, vendor, manager, report, partner, other)
- Preferred tone (free text, e.g., "formal and respectful")
- Notes (free text)
- Field metadata tracking source (`manual` vs `auto`) per field

### Prompt Integration
When generating a reply or new email:
1. Recipient email is determined from thread messages (replies) or compose form (new emails)
2. Contact is looked up by email
3. If found, a `--- RECIPIENT PROFILE ---` block is appended to the system prompt after writing guidelines
4. Claude adapts tone, formality, and style based on the profile

### Auto-Extraction (Post-Generation)
After STREAM_DONE:
1. Side panel sends `EXTRACT_CONTACT_INFO` message to background (fire-and-forget)
2. Background calls Haiku (`claude-haiku-4-5-20251001`, max 256 tokens) with thread snippet + draft
3. Haiku returns structured JSON with extracted contact fields
4. `upsertContactFromExtraction()` merges results, respecting manual field protection

### Contact Agenda UI
- Searchable list of all contacts (filter by name/email)
- Expandable cards showing name, email, relationship badge, tone
- Add/Edit/Delete contacts via a form editor
- Auto-populated fields show "(auto)" indicator; editing promotes to "manual"

### Compose Form Integration
- When typing a recipient email, a debounced lookup (300ms) checks the agenda
- If found, shows inline badge: "Known: {name} ({relationship})"

## Key Design Decisions

| Decision | Rationale |
|---|---|
| No Gmail scanning | Privacy-first — no mailbox access or scraping |
| Separate Haiku call for extraction | 60x cheaper than main model; keeps main prompt clean |
| Fire-and-forget extraction | Never blocks draft delivery; builds agenda passively |
| `fieldMeta` tracking | Prevents auto-extraction from overwriting manual edits |
| `chrome.storage.local` | 10MB limit vs 100KB for sync; contacts can grow |
| 200 contact limit | Prevents unbounded storage growth |

## Files Modified
- `lib/types.ts` — `ContactProfile`, `ContactExtractionResult`, `RelationshipType`, `CONTACT_AGENDA_LIMIT`
- `lib/storage.ts` — Contact CRUD: `getContactAgenda`, `getContactByEmail`, `saveContact`, `deleteContact`, `upsertContactFromExtraction`
- `lib/claude.ts` — `buildContactContext`, `buildContactExtractionPrompt`, updated `buildSystemPrompt` and `buildNewEmailSystemPrompt`
- `entrypoints/background.ts` — Contact-aware generation, `EXTRACT_CONTACT_INFO` handler, `extractRecipientFromThread`
- `entrypoints/sidepanel/App.tsx` — Agenda/editor view routing, extraction trigger on STREAM_DONE
- `entrypoints/sidepanel/components/ComposeForm.tsx` — Contact badge with debounced lookup
- `entrypoints/sidepanel/components/AgendaView.tsx` — Contact list with search, expand, edit, delete
- `entrypoints/sidepanel/components/ContactEditor.tsx` — Contact form with auto/manual field tracking
- `entrypoints/sidepanel/style.css` — Agenda, contact card, contact editor, contact badge styles
