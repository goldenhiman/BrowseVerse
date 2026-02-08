// ============================================================
// AI Background Processor
// Orchestrates periodic AI tasks: page summarization and
// constellation matching. Called from background.ts on a timer.
// ============================================================

import { getAIProvider, isAIAvailable } from './manager';
import { summarizePage } from './tasks/summarization';
import { matchPagesToConstellations } from './tasks/constellation-matcher';
import { updateConstellationDocument } from './tasks/document-updater';
import { pagesRepo } from '../db/repositories/pages';
import { knowledgeBoxesRepo } from '../db/repositories/knowledgeBoxes';
import { AI_PAGE_SUMMARY_BATCH_SIZE, AI_LAST_RUN_KEY } from '../shared/constants';

/** Guard against overlapping runs */
let isRunning = false;

/**
 * Main entry point for periodic AI processing.
 * Runs page summarization and constellation matching in sequence.
 * Safe to call repeatedly — guards against overlapping execution.
 */
export async function runAIProcessor(): Promise<void> {
  if (isRunning) {
    console.log('[BKO] AI processor already running, skipping');
    return;
  }

  isRunning = true;
  console.log('[BKO] AI processor starting...');

  try {
    const provider = await getAIProvider();
    if (!provider) {
      console.log('[BKO] AI not configured, skipping AI processing');
      return;
    }

    const available = await isAIAvailable();
    if (!available) {
      console.log('[BKO] AI provider not available, skipping');
      return;
    }

    // --- Task 1: Summarize unsummarized pages ---
    await runPageSummarization(provider);

    // --- Task 2: Match pages to constellations ---
    await runConstellationMatching(provider);

    // --- Task 3: Update constellation living documents ---
    await runDocumentUpdates(provider);

    // Update last run timestamp
    await saveLastRunTimestamp();

    console.log('[BKO] AI processor completed successfully');
  } catch (err) {
    console.error('[BKO] AI processor error:', err);
  } finally {
    isRunning = false;
  }
}

/**
 * Summarize a batch of pages that don't yet have AI summaries.
 */
async function runPageSummarization(provider: import('./interface').AIProvider): Promise<void> {
  try {
    const unsummarized = await pagesRepo.getUnsummarized(AI_PAGE_SUMMARY_BATCH_SIZE);

    if (unsummarized.length === 0) {
      console.log('[BKO] No unsummarized pages found');
      return;
    }

    console.log(`[BKO] Summarizing ${unsummarized.length} pages...`);

    let successCount = 0;
    for (const page of unsummarized) {
      try {
        const summary = await summarizePage(provider, page);
        if (summary && page.id) {
          await pagesRepo.updateAISummary(page.id, summary);
          successCount++;
        }
      } catch (err) {
        console.error(`[BKO] Failed to summarize page ${page.id} (${page.url}):`, err);
        // Continue with next page — don't let one failure block the batch
      }
    }

    console.log(`[BKO] Summarized ${successCount}/${unsummarized.length} pages`);
  } catch (err) {
    console.error('[BKO] Page summarization batch error:', err);
  }
}

/**
 * Match recently browsed pages to active constellations.
 */
async function runConstellationMatching(provider: import('./interface').AIProvider): Promise<void> {
  try {
    const lastRun = await getLastRunTimestamp();
    const assignments = await matchPagesToConstellations(provider, lastRun || undefined);
    console.log(`[BKO] Constellation matching completed: ${assignments} new assignments`);
  } catch (err) {
    console.error('[BKO] Constellation matching error:', err);
  }
}

/**
 * Update living documents for active constellations that have pages assigned.
 */
async function runDocumentUpdates(provider: import('./interface').AIProvider): Promise<void> {
  try {
    const constellations = await knowledgeBoxesRepo.getByStatus('active');
    const withPages = constellations.filter((c) => c.related_page_ids.length > 0);

    if (withPages.length === 0) {
      console.log('[BKO] No active constellations with pages for document updates');
      return;
    }

    console.log(`[BKO] Updating documents for ${withPages.length} constellations...`);

    let updateCount = 0;
    for (const constellation of withPages) {
      try {
        const updated = await updateConstellationDocument(provider, constellation);
        if (updated) updateCount++;
      } catch (err) {
        console.error(`[BKO] Failed to update document for constellation ${constellation.id}:`, err);
      }
    }

    console.log(`[BKO] Document updates completed: ${updateCount}/${withPages.length} constellations updated`);
  } catch (err) {
    console.error('[BKO] Document update batch error:', err);
  }
}

/**
 * Get the timestamp of the last AI processor run from extension storage.
 */
async function getLastRunTimestamp(): Promise<number | null> {
  try {
    const result = await browser.storage.local.get(AI_LAST_RUN_KEY);
    return (result[AI_LAST_RUN_KEY] as number) || null;
  } catch {
    return null;
  }
}

/**
 * Save the current timestamp as the last AI processor run time.
 */
async function saveLastRunTimestamp(): Promise<void> {
  try {
    await browser.storage.local.set({ [AI_LAST_RUN_KEY]: Date.now() });
  } catch (err) {
    console.error('[BKO] Failed to save last run timestamp:', err);
  }
}
