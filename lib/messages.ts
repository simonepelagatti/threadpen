import { RuntimeMessage, GenerateDraftResponse, ThreadData } from './types';

export async function sendRuntimeMessage<T>(message: RuntimeMessage): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

export async function getThreadData(): Promise<ThreadData | null> {
  return sendRuntimeMessage<ThreadData | null>({ type: 'GET_THREAD_DATA' });
}

export async function generateDraft(
  notes: string,
  conversationHistory: import('./types').ConversationTurn[]
): Promise<GenerateDraftResponse> {
  return sendRuntimeMessage<GenerateDraftResponse>({
    type: 'GENERATE_DRAFT',
    payload: { notes, conversationHistory },
  });
}
