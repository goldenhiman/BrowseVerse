// ============================================================
// Topic Inference Engine - Deterministic clustering
// ============================================================

import { db } from '../db/index';
import { topicsRepo } from '../db/repositories/topics';
import type { Page, Topic, TopicLifecycle } from '../shared/types';
import { TOPIC_ACTIVE_THRESHOLD, TOPIC_DORMANT_DAYS } from '../shared/constants';

/**
 * Domain-based topic inference.
 * Groups pages by domain and creates/updates topics based on domain clusters.
 */
export async function inferTopicsFromDomains(): Promise<void> {
  const pages = await db.pages.filter((p) => !p.excluded).toArray();
  if (pages.length === 0) return;

  // Group pages by domain
  const domainGroups = new Map<string, Page[]>();
  for (const page of pages) {
    if (!domainGroups.has(page.domain)) domainGroups.set(page.domain, []);
    domainGroups.get(page.domain)!.push(page);
  }

  // Create/update topics for domains with enough pages
  for (const [domain, domainPages] of domainGroups) {
    if (domainPages.length < 2) continue; // Skip single-visit domains

    const name = cleanDomainName(domain);
    const pageIds = domainPages.map((p) => p.id!).filter(Boolean);
    const lifecycle = computeLifecycle(domainPages);
    const confidence = Math.min(1, domainPages.length / 20);

    await topicsRepo.upsertByName(name, {
      description: `Pages from ${domain}`,
      page_ids: pageIds,
      lifecycle_state: lifecycle,
      confidence_score: confidence,
    });
  }
}

/**
 * Keyword co-occurrence topic inference.
 * Clusters pages that share keywords from metadata.
 */
export async function inferTopicsFromKeywords(): Promise<void> {
  const pages = await db.pages.filter((p) => !p.excluded).toArray();
  if (pages.length === 0) return;

  // Build keyword → page mapping
  const keywordPages = new Map<string, Set<number>>();
  for (const page of pages) {
    const keywords = extractKeywords(page);
    for (const keyword of keywords) {
      if (!keywordPages.has(keyword)) keywordPages.set(keyword, new Set());
      keywordPages.get(keyword)!.add(page.id!);
    }
  }

  // Create topics for keywords with enough pages
  for (const [keyword, pageIdSet] of keywordPages) {
    if (pageIdSet.size < 3) continue;

    const topicName = `${keyword.charAt(0).toUpperCase()}${keyword.slice(1)}`;
    const pageIds = Array.from(pageIdSet);

    // Check if already covered by a domain topic
    const existingTopic = await db.topics.where('name').equals(topicName).first();
    if (existingTopic) {
      // Merge page IDs
      const merged = [...new Set([...existingTopic.page_ids, ...pageIds])];
      await topicsRepo.update(existingTopic.id!, { page_ids: merged });
      continue;
    }

    const confidence = Math.min(1, pageIdSet.size / 15);
    await topicsRepo.upsertByName(topicName, {
      description: `Pages related to "${keyword}"`,
      page_ids: pageIds,
      lifecycle_state: pageIdSet.size >= TOPIC_ACTIVE_THRESHOLD ? 'active' : 'emerging',
      confidence_score: confidence,
    });
  }
}

/**
 * URL path pattern topic inference.
 * Groups pages by common URL path patterns.
 */
export async function inferTopicsFromUrlPatterns(): Promise<void> {
  const pages = await db.pages.filter((p) => !p.excluded).toArray();
  if (pages.length === 0) return;

  // Common path patterns that indicate content types
  const patterns: Array<{ pattern: RegExp; name: string; description: string }> = [
    { pattern: /\/docs?\//i, name: 'Documentation', description: 'Documentation pages' },
    { pattern: /\/blog\//i, name: 'Blog Reading', description: 'Blog posts and articles' },
    { pattern: /\/api\//i, name: 'API Reference', description: 'API documentation and references' },
    { pattern: /\/learn|\/tutorial|\/course/i, name: 'Learning', description: 'Educational content' },
    { pattern: /\/news|\/article/i, name: 'News & Articles', description: 'News and article pages' },
    { pattern: /\/video|\/watch/i, name: 'Video Content', description: 'Video content pages' },
    { pattern: /\/shop|\/product|\/buy/i, name: 'Shopping', description: 'Shopping and product pages' },
    { pattern: /github\.com\/[^/]+\/[^/]+/i, name: 'GitHub Projects', description: 'GitHub repository pages' },
    { pattern: /stackoverflow\.com\/questions/i, name: 'Stack Overflow', description: 'Programming Q&A' },
  ];

  for (const { pattern, name, description } of patterns) {
    const matchingPages = pages.filter((p) => pattern.test(p.url));
    if (matchingPages.length < 3) continue;

    const pageIds = matchingPages.map((p) => p.id!).filter(Boolean);
    const lifecycle = computeLifecycle(matchingPages);

    await topicsRepo.upsertByName(name, {
      description,
      page_ids: pageIds,
      lifecycle_state: lifecycle,
      confidence_score: Math.min(1, matchingPages.length / 10),
    });
  }
}

/**
 * Update lifecycle states for all topics based on recent activity.
 */
export async function updateTopicLifecycles(): Promise<void> {
  const topics = await topicsRepo.getAll();
  const dormantThreshold = Date.now() - TOPIC_DORMANT_DAYS * 24 * 60 * 60 * 1000;

  for (const topic of topics) {
    if (topic.page_ids.length === 0) continue;

    // Get the most recent page in this topic
    const pages = await db.pages.where('id').anyOf(topic.page_ids).toArray();
    if (pages.length === 0) continue;

    const mostRecent = Math.max(...pages.map((p) => p.last_seen_at));
    let newState: TopicLifecycle;

    if (mostRecent < dormantThreshold) {
      newState = 'dormant';
    } else if (pages.length >= TOPIC_ACTIVE_THRESHOLD) {
      newState = 'active';
    } else {
      newState = 'emerging';
    }

    if (newState !== topic.lifecycle_state) {
      await topicsRepo.update(topic.id!, { lifecycle_state: newState });
    }
  }
}

/**
 * Run all topic inference strategies.
 */
export async function runTopicInference(): Promise<void> {
  console.log('[BKO] Running topic inference...');
  await inferTopicsFromDomains();
  await inferTopicsFromKeywords();
  await inferTopicsFromUrlPatterns();
  await updateTopicLifecycles();
  console.log('[BKO] Topic inference complete');
}

// -- Helpers --

function cleanDomainName(domain: string): string {
  return domain
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|io|co|dev|app)$/, '')
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractKeywords(page: Page): string[] {
  const keywords: string[] = [];

  // From metadata keywords
  if (page.metadata?.keywords) {
    keywords.push(
      ...page.metadata.keywords
        .map((k) => k.toLowerCase().trim())
        .filter((k) => k.length > 2 && k.length < 30),
    );
  }

  // From title (split into words, filter common ones)
  const titleWords = (page.title || '')
    .toLowerCase()
    .split(/[\s\-_|/]+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  keywords.push(...titleWords);

  return [...new Set(keywords)];
}

function computeLifecycle(pages: Page[]): TopicLifecycle {
  const dormantThreshold = Date.now() - TOPIC_DORMANT_DAYS * 24 * 60 * 60 * 1000;
  const mostRecent = Math.max(...pages.map((p) => p.last_seen_at));

  if (mostRecent < dormantThreshold) return 'dormant';
  if (pages.length >= TOPIC_ACTIVE_THRESHOLD) return 'active';
  return 'emerging';
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'from', 'this',
  'that', 'with', 'they', 'will', 'what', 'when', 'make', 'like', 'just',
  'over', 'such', 'than', 'them', 'some', 'very', 'into', 'most', 'about',
  'home', 'page', 'search', 'free', 'here', 'there', 'more', 'other',
  'also', 'back', 'first', 'next', 'last', 'only', 'then', 'after',
]);
