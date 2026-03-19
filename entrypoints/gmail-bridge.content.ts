// This bridge is no longer needed — gmail-reader now runs in ISOLATED world
// and communicates directly via chrome.runtime. Kept as a no-op to avoid
// breaking the build if referenced.
export default defineContentScript({
  matches: ['https://mail.google.com/*'],
  runAt: 'document_idle',
  main() {
    // no-op
  },
});
