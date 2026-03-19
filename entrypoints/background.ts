import {
  ThreadData,
  RuntimeMessage,
  GenerateDraftResponse,
  SummarizeResponse,
  StreamPortMessage,
} from '../lib/types';
import { loadSettings, cacheThreadData, getCachedThreadData, clearCachedThreadData, clearSessionState } from '../lib/storage';
import {
  buildSystemPrompt,
  buildNewEmailSystemPrompt,
  buildSummarizationSystemPrompt,
  buildMessages,
  buildNewEmailMessages,
  parseDraftResponse,
} from '../lib/claude';

export default defineBackground(() => {
  // Open side panel when extension icon is clicked
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  });

  // Handle one-shot messages
  chrome.runtime.onMessage.addListener(
    (message: RuntimeMessage, _sender, sendResponse) => {
      handleMessage(message, _sender).then(sendResponse).catch((err) => {
        console.error('[ThreadPen] Message handler error:', err);
        sendResponse({ error: err.message || 'Unknown error' });
      });
      return true; // keep channel open for async
    }
  );

  // Handle streaming connections
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'threadpen-stream') return;

    port.onMessage.addListener(async (msg: StreamPortMessage) => {
      if (msg.type === 'STREAM_START') {
        await handleStreamDraft(port, msg.payload);
      } else if (msg.type === 'STREAM_NEW_EMAIL_START') {
        await handleStreamNewEmail(port, msg.payload);
      }
    });
  });
});

async function handleMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender): Promise<any> {
  switch (message.type) {
    case 'THREAD_DATA_UPDATED':
      await cacheThreadData(message.payload);
      // Broadcast to side panel so it picks up the new thread
      chrome.runtime.sendMessage({ type: 'THREAD_DATA_UPDATED', payload: message.payload }).catch(() => {});
      return { ok: true };

    case 'GET_THREAD_DATA':
      return getThreadDataWithFallback();

    case 'GENERATE_DRAFT':
      return generateDraft(message.payload);

    case 'GENERATE_NEW_EMAIL':
      return generateNewEmail(message.payload);

    case 'GET_SETTINGS':
      return loadSettings();

    case 'SUMMARIZE_THREAD':
      return summarizeThread();

    case 'INSERT_DRAFT':
      return forwardToContentScript(message);

    case 'OPEN_NEW_COMPOSE':
      return forwardToContentScript(message);

    case 'DISMISS_THREAD':
      await clearCachedThreadData();
      await clearSessionState();
      return { ok: true };

    default:
      return { error: 'Unknown message type' };
  }
}

async function forwardToContentScript(message: RuntimeMessage): Promise<any> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url?.includes('mail.google.com')) {
      return await chrome.tabs.sendMessage(tab.id, message);
    }
    return { ok: false, error: 'No active Gmail tab found' };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Failed to communicate with Gmail tab' };
  }
}

async function getThreadDataWithFallback(): Promise<ThreadData | null> {
  const cached = await getCachedThreadData();
  if (cached) return cached;

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
  payload: import('../lib/types').GenerateDraftRequest
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
  const messages = buildMessages(
    payload.notes,
    payload.conversationHistory,
    payload.toneInstruction,
    payload.intentInstruction
  );

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

async function generateNewEmail(
  payload: import('../lib/types').NewEmailDraftRequest
): Promise<GenerateDraftResponse> {
  const settings = await loadSettings();
  if (!settings.apiKey) {
    throw new Error('API key not configured. Open ThreadPen settings to add your Anthropic API key.');
  }

  const systemPrompt = buildNewEmailSystemPrompt(settings);
  const messages = buildNewEmailMessages(
    payload.notes,
    payload.recipient,
    payload.subject,
    payload.conversationHistory,
    payload.toneInstruction,
    payload.intentInstruction
  );

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

async function summarizeThread(): Promise<SummarizeResponse> {
  const settings = await loadSettings();
  if (!settings.apiKey) {
    throw new Error('API key not configured.');
  }

  const threadData = await getCachedThreadData();
  if (!threadData) {
    throw new Error('No thread data available.');
  }

  const systemPrompt = buildSummarizationSystemPrompt(threadData);

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
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Please summarize this email thread.' }],
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
  return {
    summary: data.content?.[0]?.text?.trim() ?? '',
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

// --- Streaming handlers ---

async function handleStreamDraft(
  port: chrome.runtime.Port,
  payload: import('../lib/types').GenerateDraftRequest
) {
  try {
    const settings = await loadSettings();
    if (!settings.apiKey) {
      port.postMessage({ type: 'STREAM_ERROR', error: 'API key not configured.' });
      return;
    }

    const threadData = await getCachedThreadData();
    if (!threadData) {
      port.postMessage({ type: 'STREAM_ERROR', error: 'No thread data available.' });
      return;
    }

    const systemPrompt = buildSystemPrompt(threadData, settings);
    const messages = buildMessages(
      payload.notes,
      payload.conversationHistory,
      payload.toneInstruction,
      payload.intentInstruction
    );

    await streamFromAPI(port, settings.apiKey, settings.model, systemPrompt, messages);
  } catch (err: any) {
    port.postMessage({ type: 'STREAM_ERROR', error: err.message || 'Streaming failed' });
  }
}

async function handleStreamNewEmail(
  port: chrome.runtime.Port,
  payload: import('../lib/types').NewEmailDraftRequest
) {
  try {
    const settings = await loadSettings();
    if (!settings.apiKey) {
      port.postMessage({ type: 'STREAM_ERROR', error: 'API key not configured.' });
      return;
    }

    const systemPrompt = buildNewEmailSystemPrompt(settings);
    const messages = buildNewEmailMessages(
      payload.notes,
      payload.recipient,
      payload.subject,
      payload.conversationHistory,
      payload.toneInstruction,
      payload.intentInstruction
    );

    await streamFromAPI(port, settings.apiKey, settings.model, systemPrompt, messages);
  } catch (err: any) {
    port.postMessage({ type: 'STREAM_ERROR', error: err.message || 'Streaming failed' });
  }
}

async function streamFromAPI(
  port: chrome.runtime.Port,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      stream: true,
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
    port.postMessage({ type: 'STREAM_ERROR', error: errorMsg });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    port.postMessage({ type: 'STREAM_ERROR', error: 'No response body' });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const event = JSON.parse(jsonStr);

          if (event.type === 'content_block_delta' && event.delta?.text) {
            port.postMessage({ type: 'STREAM_DELTA', text: event.delta.text });
          } else if (event.type === 'message_delta' && event.usage) {
            outputTokens = event.usage.output_tokens ?? outputTokens;
          } else if (event.type === 'message_start' && event.message?.usage) {
            inputTokens = event.message.usage.input_tokens ?? 0;
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  port.postMessage({ type: 'STREAM_DONE', inputTokens, outputTokens });
}
