import { ThreadData, ConversationTurn, Settings, ContactProfile } from './types';

export function buildContactContext(contact: ContactProfile): string {
  let block = '\n--- RECIPIENT PROFILE ---\n';
  if (contact.name) block += `Name: ${contact.name}\n`;
  if (contact.role || contact.company) {
    block += `Role: ${contact.role}${contact.company ? ` at ${contact.company}` : ''}\n`;
  }
  if (contact.relationship && contact.relationship !== 'other') {
    block += `Relationship: ${contact.relationship.charAt(0).toUpperCase() + contact.relationship.slice(1)}\n`;
  }
  if (contact.preferredTone) block += `Preferred tone: ${contact.preferredTone}\n`;
  if (contact.notes) block += `Notes: ${contact.notes}\n`;
  block += '---\nAdapt your writing style to match this recipient\'s preferred tone.\n';
  return block;
}

export function buildSystemPrompt(thread: ThreadData, settings: Settings, contact?: ContactProfile | null): string {
  const guidelines = settings.writingGuidelines.trim();
  const userName = settings.userName.trim();
  const userEmail = settings.userEmail.trim();

  let prompt = `You are an email reply drafting assistant. Your job is to draft a reply to the most recent message in the email thread below.
`;

  if (userName || userEmail) {
    prompt += `
The person you are drafting for is:`;
    if (userName) prompt += `\n- Name: ${userName}`;
    if (userEmail) prompt += `\n- Email: ${userEmail}`;
    prompt += `
Identify this person in the thread and write the reply from their perspective.
`;
  }

  prompt += `
Rules:
- Write only the reply body text. Do not include subject lines, headers, salutations like "Subject:" or "From:", or email metadata.
- Start with an appropriate greeting and end with an appropriate sign-off.
- Be concise and clear.
- Match the tone and formality of the existing thread unless guidelines say otherwise.

IMPORTANT: Structure your response in exactly two sections separated by the marker "---TIPS---".
- First section: The draft reply text only.
- Second section (after ---TIPS---): 2-4 short practical tips or observations about the reply — tone suggestions, things to double-check, alternative angles, or context the user should be aware of.

Example format:
Hi John,

Thank you for the update...

Best regards,
Alice
---TIPS---
- Consider mentioning the deadline explicitly since John didn't address it
- The tone is slightly formal; the thread has been casual so far
`;

  if (guidelines) {
    prompt += `
Writing Guidelines (follow these for tone, style, and content):
${guidelines}
`;
  }

  if (contact) {
    prompt += buildContactContext(contact);
  }

  prompt += `
--- EMAIL THREAD ---
Subject: ${thread.subject}
`;

  if (thread.truncated) {
    prompt += `(${thread.totalMessages - thread.messages.length} older messages omitted)\n\n`;
  }

  for (const msg of thread.messages) {
    prompt += `
From: ${msg.from}
To: ${msg.to}
Date: ${msg.date}

${msg.body}

---
`;
  }

  return prompt;
}

export function buildNewEmailSystemPrompt(settings: Settings, contact?: ContactProfile | null): string {
  const guidelines = settings.writingGuidelines.trim();
  const userName = settings.userName.trim();

  let prompt = `You are an email drafting assistant. Your job is to compose a new email from scratch based on the user's notes.
`;

  if (userName) {
    prompt += `
The person you are drafting for is: ${userName}
`;
  }

  prompt += `
Rules:
- Write only the email body text. Do not include subject lines, headers, or email metadata.
- Start with an appropriate greeting and end with an appropriate sign-off.
- Be concise and clear.

IMPORTANT: Structure your response in exactly two sections separated by the marker "---TIPS---".
- First section: The draft email text only.
- Second section (after ---TIPS---): 2-4 short practical tips or observations about the email.
`;

  if (guidelines) {
    prompt += `
Writing Guidelines (follow these for tone, style, and content):
${guidelines}
`;
  }

  if (contact) {
    prompt += buildContactContext(contact);
  }

  return prompt;
}

export function buildSummarizationSystemPrompt(thread: ThreadData): string {
  let prompt = `You are an email thread summarization assistant. Summarize the following email thread in one concise paragraph. Focus on:
- The main topic and purpose of the thread
- Key decisions or action items
- The current status or what's pending

--- EMAIL THREAD ---
Subject: ${thread.subject}
`;

  if (thread.truncated) {
    prompt += `(${thread.totalMessages - thread.messages.length} older messages omitted)\n\n`;
  }

  for (const msg of thread.messages) {
    prompt += `
From: ${msg.from}
Date: ${msg.date}

${msg.body}

---
`;
  }

  return prompt;
}

export function buildMessages(
  notes: string,
  conversationHistory: ConversationTurn[],
  toneInstruction?: string,
  intentInstruction?: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Build the instruction prefix from tone/intent
  let prefix = '';
  if (toneInstruction) prefix += toneInstruction + '\n';
  if (intentInstruction) prefix += intentInstruction + '\n';

  if (conversationHistory.length === 0) {
    const content = prefix
      ? `${prefix}\nPlease draft a reply following the above instructions. Here are my notes:\n\n${notes}`
      : `Please draft a reply to the most recent message in the thread. Here are my notes on what the reply should cover:\n\n${notes}`;
    messages.push({ role: 'user', content });
  } else {
    for (const turn of conversationHistory) {
      messages.push({ role: turn.role, content: turn.content });
    }
    const content = prefix ? `${prefix}\n${notes}` : notes;
    messages.push({ role: 'user', content });
  }

  return messages;
}

export function buildNewEmailMessages(
  notes: string,
  recipient: string,
  subject: string,
  conversationHistory: ConversationTurn[],
  toneInstruction?: string,
  intentInstruction?: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  let prefix = '';
  if (toneInstruction) prefix += toneInstruction + '\n';
  if (intentInstruction) prefix += intentInstruction + '\n';

  let context = '';
  if (recipient) context += `Recipient: ${recipient}\n`;
  if (subject) context += `Subject: ${subject}\n`;

  if (conversationHistory.length === 0) {
    const content = `${prefix}${context ? context + '\n' : ''}Please draft a new email based on these notes:\n\n${notes}`;
    messages.push({ role: 'user', content });
  } else {
    for (const turn of conversationHistory) {
      messages.push({ role: turn.role, content: turn.content });
    }
    const content = prefix ? `${prefix}\n${notes}` : notes;
    messages.push({ role: 'user', content });
  }

  return messages;
}

export function buildContactExtractionPrompt(threadSnippet: string, generatedDraft: string, recipientEmail: string): string {
  return `Extract information about the email recipient from the context below. Return ONLY a JSON object with these fields (omit fields you cannot determine):

{
  "email": "${recipientEmail}",
  "name": "full name",
  "role": "job title",
  "company": "company name",
  "relationship": "colleague|client|vendor|manager|report|partner|other",
  "suggestedTone": "brief tone description e.g. formal and respectful"
}

--- THREAD CONTEXT ---
${threadSnippet}

--- GENERATED DRAFT ---
${generatedDraft}

Respond with JSON only, no explanation.`;
}

export function parseDraftResponse(raw: string): { draft: string; tips: string } {
  const marker = '---TIPS---';
  const idx = raw.indexOf(marker);
  if (idx === -1) {
    return { draft: raw.trim(), tips: '' };
  }
  return {
    draft: raw.substring(0, idx).trim(),
    tips: raw.substring(idx + marker.length).trim(),
  };
}
