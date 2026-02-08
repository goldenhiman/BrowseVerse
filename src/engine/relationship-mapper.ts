// ============================================================
// Relationship Mapper - Builds entity connections
// ============================================================

import { db } from '../db/index';
import { relationshipsRepo } from '../db/repositories/relationships';
import type { Page, Topic } from '../shared/types';

/**
 * Build temporal relationships between pages visited in sequence.
 */
export async function buildTemporalRelationships(): Promise<void> {
  const sessions = await db.sessions.orderBy('start_time').reverse().limit(20).toArray();

  for (const session of sessions) {
    if (session.page_ids.length < 2) continue;

    // Connect consecutive pages in the session
    for (let i = 0; i < session.page_ids.length - 1; i++) {
      const fromId = session.page_ids[i];
      const toId = session.page_ids[i + 1];

      await relationshipsRepo.upsert('page', fromId, 'page', toId, 'temporal', {
        strength: 0.6,
        explanation: `Visited sequentially in session`,
      });
    }
  }
}

/**
 * Build semantic relationships between topics that share pages.
 */
export async function buildSemanticRelationships(): Promise<void> {
  const topics = await db.topics.toArray();

  for (let i = 0; i < topics.length; i++) {
    for (let j = i + 1; j < topics.length; j++) {
      const topicA = topics[i];
      const topicB = topics[j];

      // Compute Jaccard similarity of page sets
      const setA = new Set(topicA.page_ids);
      const setB = new Set(topicB.page_ids);
      const intersection = new Set([...setA].filter((x) => setB.has(x)));

      if (intersection.size === 0) continue;

      const union = new Set([...setA, ...setB]);
      const similarity = intersection.size / union.size;

      if (similarity < 0.1) continue; // Skip weak connections

      await relationshipsRepo.upsert(
        'topic',
        topicA.id!,
        'topic',
        topicB.id!,
        'semantic',
        {
          strength: similarity,
          explanation: `${intersection.size} shared pages (${Math.round(similarity * 100)}% overlap)`,
        },
      );
    }
  }
}

/**
 * Build behavioral relationships between pages on the same domain.
 */
export async function buildBehavioralRelationships(): Promise<void> {
  const pages = await db.pages.filter((p) => !p.excluded).toArray();

  // Group by domain
  const domainPages = new Map<string, Page[]>();
  for (const page of pages) {
    if (!domainPages.has(page.domain)) domainPages.set(page.domain, []);
    domainPages.get(page.domain)!.push(page);
  }

  // Connect pages within the same domain (only high-engagement pages)
  for (const [domain, dPages] of domainPages) {
    // Only create relationships for domains with multiple pages
    if (dPages.length < 2 || dPages.length > 50) continue;

    // Connect pages with highest dwell time to each other
    const topPages = dPages
      .sort((a, b) => b.total_dwell_time - a.total_dwell_time)
      .slice(0, 10);

    for (let i = 0; i < topPages.length; i++) {
      for (let j = i + 1; j < topPages.length; j++) {
        await relationshipsRepo.upsert(
          'page',
          topPages[i].id!,
          'page',
          topPages[j].id!,
          'behavioral',
          {
            strength: 0.4,
            explanation: `Same domain: ${domain}`,
          },
        );
      }
    }
  }
}

/**
 * Build relationships between topics and categories.
 */
export async function buildTopicCategoryRelationships(): Promise<void> {
  const categories = await db.categories.toArray();

  for (const category of categories) {
    for (const topicId of category.topic_ids) {
      await relationshipsRepo.upsert(
        'category',
        category.id!,
        'topic',
        topicId,
        'semantic',
        {
          strength: 0.9,
          explanation: `Topic belongs to category "${category.name}"`,
        },
      );
    }
  }
}

/**
 * Run all relationship mapping strategies.
 */
export async function runRelationshipMapping(): Promise<void> {
  console.log('[BKO] Running relationship mapping...');
  await buildTemporalRelationships();
  await buildSemanticRelationships();
  await buildBehavioralRelationships();
  await buildTopicCategoryRelationships();
  console.log('[BKO] Relationship mapping complete');
}
