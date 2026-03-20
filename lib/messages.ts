import {
  RuntimeMessage,
  GenerateDraftResponse,
  ThreadData,
  SummarizeResponse,
  DraftHistoryEntry,
} from './types';

export async function sendRuntimeMessage<T>(message: RuntimeMessage): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

export async function getThreadData(): Promise<ThreadData | null> {
  return sendRuntimeMessage<ThreadData | null>({ type: 'GET_THREAD_DATA' });
}

export async function generateDraft(
  notes: string,
  conversationHistory: import('./types').ConversationTurn[],
  toneInstruction?: string,
  intentInstruction?: string
): Promise<GenerateDraftResponse> {
  return sendRuntimeMessage<GenerateDraftResponse>({
    type: 'GENERATE_DRAFT',
    payload: { notes, conversationHistory, toneInstruction, intentInstruction },
  });
}

export async function summarizeThread(): Promise<SummarizeResponse> {
  return sendRuntimeMessage<SummarizeResponse>({ type: 'SUMMARIZE_THREAD' });
}

export async function insertDraftIntoGmail(text: string): Promise<{ ok: boolean; error?: string }> {
  return sendRuntimeMessage<{ ok: boolean; error?: string }>({
    type: 'INSERT_DRAFT',
    payload: { text },
  });
}

export async function insertDraftReplyAll(text: string): Promise<{ ok: boolean; error?: string }> {
  return sendRuntimeMessage<{ ok: boolean; error?: string }>({
    type: 'INSERT_DRAFT_REPLY_ALL',
    payload: { text },
  });
}

export async function openNewCompose(text: string): Promise<{ ok: boolean; error?: string }> {
  return sendRuntimeMessage<{ ok: boolean; error?: string }>({
    type: 'OPEN_NEW_COMPOSE',
    payload: { text },
  });
}

export async function generateNewEmail(
  notes: string,
  recipient: string,
  subject: string,
  conversationHistory: import('./types').ConversationTurn[],
  toneInstruction?: string,
  intentInstruction?: string
): Promise<GenerateDraftResponse> {
  return sendRuntimeMessage<GenerateDraftResponse>({
    type: 'GENERATE_NEW_EMAIL',
    payload: { notes, recipient, subject, conversationHistory, toneInstruction, intentInstruction },
  });
}
