# Auto-Generate Writing Guidelines from Sent Emails

## Problem
Writing the guidelines manually is tedious. The user's own sent emails already demonstrate their writing style — tone, formality, sign-offs, typical length, etc.

## Solution
Given the user's email address, fetch their recent sent messages from the Gmail thread DOM (or via Gmail API) and use Claude to analyze patterns and generate a writing style profile automatically.

## Implementation Notes
- **Approach A — DOM-based (no OAuth)**:
  - Content script navigates to the "Sent" folder and extracts the N most recent sent messages
  - Or: collect the user's replies from threads they open over time (passive learning)
  - Pro: no extra permissions. Con: slower, limited to what the user views.

- **Approach B — Gmail API (OAuth)**:
  - Add `identity` permission + Gmail read-only OAuth scope
  - Fetch last ~50 sent messages via `gmail.users.messages.list` with `from:user@email.com`
  - Pro: fast, comprehensive. Con: OAuth flow, extra permissions, user trust.

- **Analysis prompt**: Send sampled sent emails to Claude with a prompt like:
  "Analyze these emails written by the user. Describe their writing style: tone, formality level, typical greeting/sign-off, average length, any recurring phrases or patterns. Output a concise writing guidelines document."

- Store the generated guidelines in settings, let the user review/edit before applying
- Add a "Regenerate" button to re-analyze with more recent emails
- Could offer "style profiles" — e.g. one for internal team, one for clients
