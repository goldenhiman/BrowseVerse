// ============================================================
// Page Tracker - Captures tab visits and dwell time
// ============================================================

import { pagesRepo } from '../db/repositories/pages';
import { isExcluded, isPaused } from '../privacy/exclusions';
import { SYSTEM_EXCLUDED_PATTERNS, MIN_DWELL_TIME_MS } from '../shared/constants';

interface ActiveTab {
  tabId: number;
  url: string;
  startTime: number;
  pageId?: number;
}

let activeTab: ActiveTab | null = null;

function isSystemUrl(url: string): boolean {
  return SYSTEM_EXCLUDED_PATTERNS.some((pattern) => url.startsWith(pattern));
}

async function finalizeActiveTab(): Promise<void> {
  if (!activeTab) return;

  const dwellTime = Date.now() - activeTab.startTime;
  if (dwellTime >= MIN_DWELL_TIME_MS && activeTab.pageId) {
    await pagesRepo.updateDwellTime(activeTab.pageId, dwellTime);
  }
  activeTab = null;
}

async function trackPage(tabId: number, url: string, title: string): Promise<number | undefined> {
  if (isSystemUrl(url)) return undefined;
  if (await isPaused()) return undefined;

  try {
    const excluded = await isExcluded(url);
    if (excluded) return undefined;

    const pageId = await pagesRepo.upsert(url, { title });
    return pageId;
  } catch (err) {
    console.error('[BKO] Error tracking page:', err);
    return undefined;
  }
}

export function setupPageTracker(): void {
  // Track completed navigations
  browser.webNavigation.onCompleted.addListener(async (details) => {
    // Only track main frame navigations
    if (details.frameId !== 0) return;

    const tab = await browser.tabs.get(details.tabId).catch(() => null);
    if (!tab?.url) return;

    await finalizeActiveTab();

    const pageId = await trackPage(details.tabId, tab.url, tab.title || '');
    if (pageId !== undefined) {
      activeTab = {
        tabId: details.tabId,
        url: tab.url,
        startTime: Date.now(),
        pageId,
      };
    }
  });

  // Track tab switches
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    await finalizeActiveTab();

    const tab = await browser.tabs.get(activeInfo.tabId).catch(() => null);
    if (!tab?.url) return;

    const pageId = await trackPage(activeInfo.tabId, tab.url, tab.title || '');
    if (pageId !== undefined) {
      activeTab = {
        tabId: activeInfo.tabId,
        url: tab.url,
        startTime: Date.now(),
        pageId,
      };
    }
  });

  // Track tab closes - finalize dwell time
  browser.tabs.onRemoved.addListener(async (tabId) => {
    if (activeTab?.tabId === tabId) {
      await finalizeActiveTab();
    }
  });

  // Track tab URL changes (SPA navigations)
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url && activeTab?.tabId === tabId && changeInfo.url !== activeTab.url) {
      await finalizeActiveTab();

      const pageId = await trackPage(tabId, changeInfo.url, tab.title || '');
      if (pageId !== undefined) {
        activeTab = {
          tabId,
          url: changeInfo.url,
          startTime: Date.now(),
          pageId,
        };
      }
    }
    // Update title if it changes
    if (changeInfo.title && activeTab?.tabId === tabId && activeTab.pageId) {
      await pagesRepo.upsert(activeTab.url, { title: changeInfo.title });
    }
  });

  console.log('[BKO] Page tracker initialized');
}

export function getActiveTab(): ActiveTab | null {
  return activeTab;
}

export { finalizeActiveTab };
