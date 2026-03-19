import { ThreadData, ConversationTurn, Settings } from './types';

export function buildSystemPrompt(thread: ThreadData, settings: Settings): string {
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

export function buildMessages(
  notes: string,
  conversationHistory: ConversationTurn[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  if (conversationHistory.length === 0) {
    messages.push({
      role: 'user',
      content: `Please draft a reply to the most recent message in the thread. Here are my notes on what the reply should cover:\n\n${notes}`,
    });
  } else {
    for (const turn of conversationHistory) {
      messages.push({ role: turn.role, content: turn.content });
    }
    messages.push({
      role: 'user',
      content: notes,
    });
  }

  return messages;
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
