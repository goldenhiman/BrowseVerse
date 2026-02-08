// ============================================================
// Content Script - Metadata extraction + Highlight capture
// ============================================================

import { extractAndSendMetadata } from '../src/capture/metadata-extractor';
import { setupHighlightCapture } from '../src/capture/highlight-capture';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    // Extract and send page metadata to background (async, skips when paused)
    void extractAndSendMetadata();

    // Set up highlight/text selection capture
    setupHighlightCapture();

    console.debug('[BKO] Content script loaded for', window.location.href);
  },
});
