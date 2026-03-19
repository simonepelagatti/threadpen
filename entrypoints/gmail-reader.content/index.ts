import { ThreadData, ThreadMessage, MAX_THREAD_MESSAGES } from '../../lib/types';

export default defineContentScript({
  matches: ['https://mail.google.com/*'],
  runAt: 'document_idle',

  main() {
    // Listen for requests from popup/background to extract thread data
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'EXTRACT_THREAD') {
        const data = extractThread();
        sendResponse(data);
      }
      return false;
    });

    // Also proactively extract and cache on navigation
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

function extractThread(): ThreadData | null {
  try {
    // Get subject - try multiple selectors
    const subject =
      document.querySelector('h2[data-thread-perm-id]')?.textContent?.trim() ||
      document.querySelector('.hP')?.textContent?.trim() ||
      document.querySelector('h2.hP')?.textContent?.trim() ||
      '';

    if (!subject) return null;

    // Get all message containers - Gmail wraps each message in an element with data-message-id
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
  // Sender: .gD element has email and name attributes
  const senderEl = el.querySelector('.gD');
  const from = senderEl?.getAttribute('email') ||
    senderEl?.getAttribute('name') ||
    senderEl?.textContent?.trim() ||
    'Unknown';

  // To: .g2 container holds recipient spans, or try the "to" header row
  let to = '';
  const toContainer = el.querySelector('.g2');
  if (toContainer) {
    const toSpans = toContainer.querySelectorAll('span[email]');
    to = Array.from(toSpans).map(s => s.getAttribute('email')).filter(Boolean).join(', ');
  }
  if (!to) {
    // Fallback: look for "to" in expanded header
    const headerRows = el.querySelectorAll('.ajA');
    for (const row of headerRows) {
      if (row.textContent?.toLowerCase().includes('to:')) {
        to = row.textContent.replace(/^.*to:\s*/i, '').trim();
        break;
      }
    }
  }
  if (!to) to = 'Unknown';

  // Date: span with title attribute inside the message header area
  const dateEl = el.querySelector('.g3') ||
    el.querySelector('span[title]');
  const date = dateEl?.getAttribute('title') ||
    dateEl?.textContent?.trim() ||
    '';

  // Body: .a3s is the message body container
  // Try expanded body first, then collapsed
  const bodyEl = el.querySelector('.a3s.aiL') ||
    el.querySelector('.a3s') ||
    el.querySelector('[data-message-id] .ii');
  const body = bodyEl?.textContent?.trim() || '';

  if (!body && !from) return null;

  return { from, to, date, subject, body };
}
