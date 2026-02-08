// ============================================================
// Metadata Extractor - Runs in content script context
// ============================================================

import type { PageMetadata } from '../shared/types';
import type { MetadataExtractedMessage } from '../shared/messaging';
import { SETTINGS_STORAGE_KEY } from '../shared/constants';

function getMetaContent(attr: string, value: string): string {
  const el = document.querySelector(`meta[${attr}="${value}"]`);
  return el?.getAttribute('content') || '';
}

function extractMetadata(): PageMetadata {
  return {
    og_title: getMetaContent('property', 'og:title'),
    og_description: getMetaContent('property', 'og:description'),
    og_image: getMetaContent('property', 'og:image'),
    keywords: getMetaContent('name', 'keywords')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
    description: getMetaContent('name', 'description'),
    author: getMetaContent('name', 'author'),
  };
}

function getFavicon(): string {
  const link =
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]') ||
    document.querySelector('link[rel="apple-touch-icon"]');
  if (link) {
    const href = link.getAttribute('href');
    if (href) {
      try {
        return new URL(href, window.location.origin).href;
      } catch {
        return href;
      }
    }
  }
  return `${window.location.origin}/favicon.ico`;
}

export async function extractAndSendMetadata(): Promise<void> {
  const result = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
  const paused = (result[SETTINGS_STORAGE_KEY] as { extension_paused?: boolean } | undefined)?.extension_paused ?? false;
  if (paused) return;

  const metadata = extractMetadata();
  const message: MetadataExtractedMessage = {
    type: 'METADATA_EXTRACTED',
    payload: {
      url: window.location.href,
      title: document.title,
      favicon: getFavicon(),
      metadata,
    },
  };

  browser.runtime.sendMessage(message).catch((err) => {
    console.debug('[BKO] Failed to send metadata:', err);
  });
}
