// ============================================================
// Background Service Worker - Capture Orchestrator
// ============================================================

import { setupPageTracker, getActiveTab } from '../src/capture/page-tracker';
import { setupSessionDetector, recordPageInSession, getCurrentSessionId } from '../src/capture/session-detector';
import { pagesRepo } from '../src/db/repositories/pages';
import { highlightsRepo } from '../src/db/repositories/highlights';
import { sessionsRepo } from '../src/db/repositories/sessions';
import { addExcludedDomain, loadSettings } from '../src/privacy/exclusions';
import { runTopicInference } from '../src/engine/topic-inference';
import { buildCategories } from '../src/engine/category-builder';
import { runRelationshipMapping } from '../src/engine/relationship-mapper';
import { extractConcepts } from '../src/engine/concept-extractor';
import { runAIProcessor } from '../src/ai/processor';
import type { ContentMessage, UIMessage, StatsResponse } from '../src/shared/messaging';
import { DASHBOARD_PATH, ENGINE_PROCESSING_INTERVAL_MS, AI_PROCESSING_INTERVAL_MS } from '../src/shared/constants';

export default defineBackground(() => {
  console.log('[BKO] Background service worker starting...');

  // Initialize capture systems
  setupPageTracker();
  setupSessionDetector();

  // Listen for messages from content scripts and UI
  browser.runtime.onMessage.addListener(
    (message: ContentMessage | UIMessage, sender, sendResponse) => {
      handleMessage(message, sender).then(sendResponse).catch((err) => {
        console.error('[BKO] Message handler error:', err);
        sendResponse({ error: err.message });
      });
      return true; // Keep message channel open for async response
    },
  );

  // Run knowledge engine periodically
  async function runKnowledgeEngine() {
    try {
      await runTopicInference();
      await buildCategories();
      await runRelationshipMapping();
      await extractConcepts();
    } catch (err) {
      console.error('[BKO] Knowledge engine error:', err);
    }
  }

  // Run engine after initial delay, then periodically
  setTimeout(runKnowledgeEngine, 30000); // First run after 30s
  setInterval(runKnowledgeEngine, ENGINE_PROCESSING_INTERVAL_MS);

  // Run AI processor after longer initial delay (let pages accumulate), then periodically
  setTimeout(runAIProcessor, 60000); // First AI run after 60s
  setInterval(runAIProcessor, AI_PROCESSING_INTERVAL_MS);

  console.log('[BKO] Background service worker ready');
});

async function handleMessage(
  message: ContentMessage | UIMessage,
  sender: browser.Runtime.MessageSender,
): Promise<unknown> {
  switch (message.type) {
    case 'METADATA_EXTRACTED': {
      const { url, title, favicon, metadata } = message.payload;
      await pagesRepo.upsert(url, { title, favicon, metadata });

      // Also record page in current session
      const page = await pagesRepo.upsert(url, {});
      if (page) {
        await recordPageInSession(page);
      }
      return { success: true };
    }

    case 'HIGHLIGHT_CAPTURED': {
      const { url, text, context_before, context_after } = message.payload;
      // Find the page ID for this URL
      const pages = await pagesRepo.search(url, 1);
      const pageId = pages[0]?.id;
      if (pageId) {
        await highlightsRepo.create({
          page_id: pageId,
          text,
          context_before,
          context_after,
          timestamp: Date.now(),
        });
      }
      return { success: true };
    }

    case 'GET_STATS': {
      const stats = await getStats();
      return stats;
    }

    case 'GET_TIMELINE': {
      const { from, to, domain, limit = 50, offset = 0 } = message.payload;
      let pages;
      if (domain) {
        pages = await pagesRepo.getByDomain(domain);
      } else if (from && to) {
        pages = await pagesRepo.getByDateRange(from, to);
      } else {
        pages = await pagesRepo.getRecent(limit, offset);
      }
      return { pages };
    }

    case 'OPEN_DASHBOARD': {
      await browser.tabs.create({
        url: browser.runtime.getURL(DASHBOARD_PATH),
      });
      return { success: true };
    }

    case 'EXCLUDE_DOMAIN': {
      await addExcludedDomain(message.payload.domain);
      await pagesRepo.deleteByDomain(message.payload.domain);
      return { success: true };
    }

    case 'DELETE_PAGE': {
      await pagesRepo.deletePage(message.payload.pageId);
      return { success: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}

async function getStats(): Promise<StatsResponse> {
  const pagesToday = await pagesRepo.countToday();
  const totalPages = await pagesRepo.count();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const topDomains = await pagesRepo.getTopDomains(5, startOfDay.getTime());
  const totalDwellTimeToday = await pagesRepo.totalDwellTimeToday();
  const currentSession = await sessionsRepo.getCurrent();

  return {
    pages_today: pagesToday,
    total_pages: totalPages,
    active_session: !!getCurrentSessionId(),
    session_page_count: currentSession?.page_ids.length || 0,
    top_domains: topDomains,
    total_dwell_time_today: totalDwellTimeToday,
  };
}
