// ============================================================
// Concept Extractor - Derives abstractions from browsing patterns
// ============================================================

import { db } from '../db/index';
import { conceptsRepo } from '../db/repositories/concepts';
import type { Topic, Page } from '../shared/types';

/**
 * Extract concepts from frequently co-occurring keywords across topics.
 * This is the deterministic version; AI-enhanced version lives in ai/tasks.
 */
export async function extractConcepts(): Promise<void> {
  console.log('[BKO] Extracting concepts...');
  const topics = await db.topics.toArray();
  if (topics.length === 0) return;

  // Build keyword frequency across topics
  const keywordTopics = new Map<string, Set<number>>();

  for (const topic of topics) {
    const pages = await db.pages.where('id').anyOf(topic.page_ids.slice(0, 20)).toArray();
    const keywords = extractKeywordsFromPages(pages);

    for (const keyword of keywords) {
      if (!keywordTopics.has(keyword)) keywordTopics.set(keyword, new Set());
      keywordTopics.get(keyword)!.add(topic.id!);
    }
  }

  // Concepts are keywords that appear across multiple topics
  for (const [keyword, topicIdSet] of keywordTopics) {
    if (topicIdSet.size < 2) continue;

    const existingConcepts = await db.concepts.where('label').equals(keyword).first();
    if (existingConcepts) continue;

    await conceptsRepo.create({
      label: keyword,
      explanation: `Cross-topic concept appearing in ${topicIdSet.size} topics`,
      derived_from_ids: Array.from(topicIdSet),
      created_at: Date.now(),
    });
  }

  console.log('[BKO] Concept extraction complete');
}

function extractKeywordsFromPages(pages: Page[]): string[] {
  const wordFreq = new Map<string, number>();

  for (const page of pages) {
    // Extract from title
    const titleWords = (page.title || '')
      .toLowerCase()
      .split(/[\s\-_|/,:;.!?()[\]{}]+/)
      .filter((w) => w.length > 3 && w.length < 25 && !STOP_WORDS.has(w));

    for (const word of titleWords) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    // Extract from metadata keywords
    if (page.metadata?.keywords) {
      for (const kw of page.metadata.keywords) {
        const clean = kw.toLowerCase().trim();
        if (clean.length > 2) {
          wordFreq.set(clean, (wordFreq.get(clean) || 0) + 2); // Weight metadata keywords higher
        }
      }
    }
  }

  // Return keywords that appear frequently
  return Array.from(wordFreq.entries())
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'from', 'this',
  'that', 'with', 'they', 'will', 'what', 'when', 'make', 'like', 'just',
  'over', 'such', 'than', 'them', 'some', 'very', 'into', 'most', 'about',
  'home', 'page', 'search', 'free', 'here', 'there', 'more', 'other',
  'also', 'back', 'first', 'next', 'last', 'only', 'then', 'after',
  'http', 'https', 'www', 'html', 'undefined', 'null',
]);
