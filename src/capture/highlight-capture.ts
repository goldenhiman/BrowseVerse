// ============================================================
// Highlight Capture - Text selection listener
// ============================================================

import type { HighlightCapturedMessage } from '../shared/messaging';
import { HIGHLIGHT_CONTEXT_CHARS, SETTINGS_STORAGE_KEY } from '../shared/constants';

function getSelectionContext(
  selection: Selection,
): { text: string; context_before: string; context_after: string } | null {
  const text = selection.toString().trim();
  if (!text || text.length < 3) return null;

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;

  // Get the text content of the parent element for context
  const parentText = container.textContent || '';
  const startOffset = parentText.indexOf(text);

  let context_before = '';
  let context_after = '';

  if (startOffset >= 0) {
    context_before = parentText
      .substring(Math.max(0, startOffset - HIGHLIGHT_CONTEXT_CHARS), startOffset)
      .trim();
    context_after = parentText
      .substring(startOffset + text.length, startOffset + text.length + HIGHLIGHT_CONTEXT_CHARS)
      .trim();
  }

  return { text, context_before, context_after };
}

export function setupHighlightCapture(): void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  document.addEventListener('mouseup', () => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const result = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
      const paused = (result[SETTINGS_STORAGE_KEY] as { extension_paused?: boolean } | undefined)?.extension_paused ?? false;
      if (paused) return;

      const context = getSelectionContext(selection);
      if (!context) return;

      const message: HighlightCapturedMessage = {
        type: 'HIGHLIGHT_CAPTURED',
        payload: {
          url: window.location.href,
          ...context,
        },
      };

      browser.runtime.sendMessage(message).catch((err) => {
        console.debug('[BKO] Failed to send highlight:', err);
      });
    }, 500);
  });

  console.debug('[BKO] Highlight capture initialized');
}
