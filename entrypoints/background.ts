import { ThreadData, RuntimeMessage, GenerateDraftResponse } from '../lib/types';
import { loadSettings, cacheThreadData, getCachedThreadData } from '../lib/storage';
import { buildSystemPrompt, buildMessages, parseDraftResponse } from '../lib/claude';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener(
    (message: RuntimeMessage, _sender, sendResponse) => {
      handleMessage(message).then(sendResponse).catch((err) => {
        console.error('[ThreadPen] Message handler error:', err);
        sendResponse({ error: err.message || 'Unknown error' });
      });
      return true; // keep channel open for async
    }
  );
});

async function handleMessage(message: RuntimeMessage): Promise<any> {
  switch (message.type) {
    case 'THREAD_DATA_UPDATED':
      await cacheThreadData(message.payload);
      return { ok: true };

    case 'GET_THREAD_DATA':
      return getThreadDataWithFallback();

    case 'GENERATE_DRAFT':
      return generateDraft(message.payload);

    case 'GET_SETTINGS':
      return loadSettings();

    default:
      return { error: 'Unknown message type' };
  }
}

async function getThreadDataWithFallback(): Promise<ThreadData | null> {
  // First check cache
  const cached = await getCachedThreadData();
  if (cached) return cached;

  // Fallback: ask the content script in the active Gmail tab to extract now
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url?.includes('mail.google.com')) {
      const data = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_THREAD' });
      if (data) {
        await cacheThreadData(data);
        return data;
      }
    }
  } catch (e) {
    console.warn('[ThreadPen] Failed to extract from active tab:', e);
  }

  return null;
}

async function generateDraft(
  payload: { notes: string; conversationHistory: import('../lib/types').ConversationTurn[] }
): Promise<GenerateDraftResponse> {
  const settings = await loadSettings();
  if (!settings.apiKey) {
    throw new Error('API key not configured. Open ThreadPen settings to add your Anthropic API key.');
  }

  const threadData = await getCachedThreadData();
  if (!threadData) {
    throw new Error('No thread data available. Navigate to a Gmail thread first.');
  }

  const systemPrompt = buildSystemPrompt(threadData, settings);
  const messages = buildMessages(payload.notes, payload.conversationHistory);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg = `API error (${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      errorMsg = parsed.error?.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const rawText = data.content?.[0]?.text ?? '';
  const { draft, tips } = parseDraftResponse(rawText);

  return {
    draft,
    tips,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}
