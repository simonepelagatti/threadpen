import { ThreadData, ThreadMessage, MAX_THREAD_MESSAGES } from '../../lib/types';

export default defineContentScript({
  matches: ['https://mail.google.com/*'],
  runAt: 'document_idle',

  main() {
    // Listen for requests from sidepanel/background
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'EXTRACT_THREAD') {
        const data = extractThread();
        sendResponse(data);
        return false;
      }

      if (message.type === 'INSERT_DRAFT') {
        insertDraftIntoCompose(message.payload.text)
          .then((result) => sendResponse(result))
          .catch((err) => sendResponse({ ok: false, error: err.message }));
        return true; // async
      }

      if (message.type === 'OPEN_NEW_COMPOSE') {
        openNewComposeAndInsert(message.payload.text)
          .then((result) => sendResponse(result))
          .catch((err) => sendResponse({ ok: false, error: err.message }));
        return true; // async
      }

      return false;
    });

    // Proactively extract and cache on navigation
    let lastUrl = '';
    const observer = new MutationObserver(() => {
      const currentUrl = window.location.hash;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        setTimeout(() => {
          const data = extractThread();
          if (data) {
            chrome.runtime.sendMessage({
              type: 'THREAD_DATA_UPDATED',
              payload: data,
            });
          }
        }, 1000);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial extraction
    setTimeout(() => {
      const data = extractThread();
      if (data) {
        chrome.runtime.sendMessage({
          type: 'THREAD_DATA_UPDATED',
          payload: data,
        });
      }
    }, 2000);
  },
});

// --- Insert draft into reply compose ---

async function insertDraftIntoCompose(text: string): Promise<{ ok: boolean; error?: string }> {
  // Check for existing compose box (reply or reply-all)
  let composeBox = findActiveComposeBox();

  if (!composeBox) {
    // No compose open — try to click the reply button
    const replyButton = document.querySelector('[data-tooltip="Reply"]') as HTMLElement
      || document.querySelector('.ams.bkH') as HTMLElement;

    if (replyButton) {
      replyButton.click();
      // Wait for compose box to appear
      composeBox = await waitForComposeBox(3000);
    }
  }

  if (!composeBox) {
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, error: 'clipboard_fallback' };
    } catch {
      return { ok: false, error: 'Could not find compose box or copy to clipboard' };
    }
  }

  insertTextIntoElement(composeBox, text);
  return { ok: true };
}

// --- Open new compose and insert ---

async function openNewComposeAndInsert(text: string): Promise<{ ok: boolean; error?: string }> {
  // Check for existing new-compose window
  let composeBox = findNewComposeBox();

  if (!composeBox) {
    // Click the Compose button
    const composeButton = document.querySelector('.T-I.T-I-KE.L3') as HTMLElement;

    if (composeButton) {
      composeButton.click();
      composeBox = await waitForComposeBox(3000);
    }
  }

  if (!composeBox) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, error: 'clipboard_fallback' };
    } catch {
      return { ok: false, error: 'Could not find compose box or copy to clipboard' };
    }
  }

  insertTextIntoElement(composeBox, text);
  return { ok: true };
}

function findActiveComposeBox(): HTMLElement | null {
  // Look for editable compose areas (reply, reply-all, or forward)
  const editables = document.querySelectorAll<HTMLElement>(
    'div[role="textbox"][aria-label*="Message Body"], div.editable[contenteditable="true"], div[aria-label="Message Body"][contenteditable="true"]'
  );
  if (editables.length > 0) {
    // Return the last one (most recently opened)
    return editables[editables.length - 1];
  }
  return null;
}

function findNewComposeBox(): HTMLElement | null {
  // New compose windows have a different structure — look for compose in a popup or inline
  const composeViews = document.querySelectorAll<HTMLElement>('.nH .nH .no');
  for (const view of composeViews) {
    const editable = view.querySelector<HTMLElement>(
      'div[role="textbox"][contenteditable="true"], div.editable[contenteditable="true"]'
    );
    if (editable) return editable;
  }
  return findActiveComposeBox();
}

async function waitForComposeBox(timeout: number): Promise<HTMLElement | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const box = findActiveComposeBox();
    if (box) return box;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

function insertTextIntoElement(el: HTMLElement, text: string) {
  // Clear existing content and insert new text
  el.focus();
  // Use innerHTML with line breaks preserved
  el.innerHTML = text.split('\n').map((line) => `<div>${line || '<br>'}</div>`).join('');
  // Dispatch input event so Gmail registers the change
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// --- Thread extraction ---

function extractThread(): ThreadData | null {
  try {
    const subject =
      document.querySelector('h2[data-thread-perm-id]')?.textContent?.trim() ||
      document.querySelector('.hP')?.textContent?.trim() ||
      document.querySelector('h2.hP')?.textContent?.trim() ||
      '';

    if (!subject) return null;

    const messageEls = document.querySelectorAll('[data-message-id]');
    if (messageEls.length === 0) return null;

    const allMessages: ThreadMessage[] = [];

    messageEls.forEach((msgEl) => {
      const msg = parseMessage(msgEl, subject);
      if (msg) allMessages.push(msg);
    });

    if (allMessages.length === 0) return null;

    const totalMessages = allMessages.length;
    const truncated = totalMessages > MAX_THREAD_MESSAGES;
    const messages = truncated
      ? allMessages.slice(-MAX_THREAD_MESSAGES)
      : allMessages;

    return { subject, messages, totalMessages, truncated };
  } catch (e) {
    console.warn('[ThreadPen] Error extracting thread:', e);
    return null;
  }
}

function parseMessage(el: Element, subject: string): ThreadMessage | null {
  const senderEl = el.querySelector('.gD');
  const from = senderEl?.getAttribute('email') ||
    senderEl?.getAttribute('name') ||
    senderEl?.textContent?.trim() ||
    'Unknown';

  let to = '';
  const toContainer = el.querySelector('.g2');
  if (toContainer) {
    const toSpans = toContainer.querySelectorAll('span[email]');
    to = Array.from(toSpans).map(s => s.getAttribute('email')).filter(Boolean).join(', ');
  }
  if (!to) {
    const headerRows = el.querySelectorAll('.ajA');
    for (const row of headerRows) {
      if (row.textContent?.toLowerCase().includes('to:')) {
        to = row.textContent.replace(/^.*to:\s*/i, '').trim();
        break;
      }
    }
  }
  if (!to) to = 'Unknown';

  const dateEl = el.querySelector('.g3') ||
    el.querySelector('span[title]');
  const date = dateEl?.getAttribute('title') ||
    dateEl?.textContent?.trim() ||
    '';

  const bodyEl = el.querySelector('.a3s.aiL') ||
    el.querySelector('.a3s') ||
    el.querySelector('[data-message-id] .ii');
  const body = bodyEl?.textContent?.trim() || '';

  if (!body && !from) return null;

  return { from, to, date, subject, body };
}
