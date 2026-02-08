// ============================================================
// Category Builder - Rolls up topics into high-level categories
// ============================================================

import { db } from '../db/index';
import { categoriesRepo } from '../db/repositories/categories';
import { topicsRepo } from '../db/repositories/topics';
import type { Topic, CategoryTrend } from '../shared/types';

/**
 * Predefined category rules mapping domain/keyword patterns to categories.
 */
const CATEGORY_RULES: Array<{
  name: string;
  description: string;
  patterns: RegExp[];
}> = [
  {
    name: 'Software Development',
    description: 'Programming, code, developer tools',
    patterns: [
      /github/i, /gitlab/i, /stack\s?overflow/i, /developer/i,
      /programming/i, /code/i, /javascript/i, /typescript/i,
      /python/i, /react/i, /node/i, /api/i, /documentation/i,
      /npm/i, /package/i, /library/i, /framework/i,
    ],
  },
  {
    name: 'Design & Creative',
    description: 'Design tools, inspiration, creative resources',
    patterns: [
      /figma/i, /dribbble/i, /behance/i, /design/i,
      /creative/i, /illustrat/i, /photoshop/i, /sketch/i,
      /ui\s?ux/i, /color/i, /typography/i, /font/i,
    ],
  },
  {
    name: 'Learning & Education',
    description: 'Courses, tutorials, educational content',
    patterns: [
      /learn/i, /tutorial/i, /course/i, /academy/i,
      /education/i, /university/i, /lecture/i, /udemy/i,
      /coursera/i, /edx/i, /khan/i,
    ],
  },
  {
    name: 'News & Media',
    description: 'News, articles, media consumption',
    patterns: [
      /news/i, /article/i, /times/i, /post/i,
      /journal/i, /medium/i, /substack/i, /blog/i,
      /bbc/i, /cnn/i, /reuters/i,
    ],
  },
  {
    name: 'Social & Communication',
    description: 'Social media, messaging, community',
    patterns: [
      /twitter/i, /reddit/i, /discord/i, /slack/i,
      /linkedin/i, /facebook/i, /instagram/i, /social/i,
      /community/i, /forum/i,
    ],
  },
  {
    name: 'Shopping & Commerce',
    description: 'Online shopping, products, reviews',
    patterns: [
      /amazon/i, /shop/i, /buy/i, /product/i,
      /price/i, /review/i, /store/i, /cart/i,
      /deal/i, /sale/i, /ebay/i,
    ],
  },
  {
    name: 'Entertainment',
    description: 'Videos, music, games, streaming',
    patterns: [
      /youtube/i, /netflix/i, /spotify/i, /twitch/i,
      /game/i, /music/i, /video/i, /stream/i,
      /movie/i, /show/i, /play/i,
    ],
  },
  {
    name: 'Productivity & Tools',
    description: 'Productivity apps, utilities, workflow tools',
    patterns: [
      /notion/i, /trello/i, /asana/i, /jira/i,
      /calendar/i, /email/i, /drive/i, /docs/i,
      /spreadsheet/i, /project/i, /manage/i,
    ],
  },
  {
    name: 'Career & Professional',
    description: 'Job search, career development, networking',
    patterns: [
      /linkedin/i, /job/i, /career/i, /resume/i,
      /hire/i, /interview/i, /salary/i, /recruit/i,
      /glassdoor/i, /indeed/i,
    ],
  },
  {
    name: 'Research & Reference',
    description: 'Academic research, reference materials, knowledge bases',
    patterns: [
      /wikipedia/i, /research/i, /paper/i, /arxiv/i,
      /scholar/i, /journal/i, /reference/i, /wiki/i,
      /encyclopedia/i, /definition/i,
    ],
  },
];

/**
 * Build categories by matching topics against predefined rules.
 */
export async function buildCategories(): Promise<void> {
  console.log('[BKO] Building categories...');
  const topics = await topicsRepo.getAll();
  if (topics.length === 0) return;

  for (const rule of CATEGORY_RULES) {
    const matchingTopics = topics.filter((topic) =>
      rule.patterns.some(
        (pattern) =>
          pattern.test(topic.name) ||
          pattern.test(topic.description) ||
          topic.page_ids.length > 0,
      ),
    );

    // More selective matching: check actual page content
    const confirmedTopicIds: number[] = [];
    for (const topic of matchingTopics) {
      const pages = await db.pages.where('id').anyOf(topic.page_ids.slice(0, 10)).toArray();
      const matches = pages.some((page) =>
        rule.patterns.some(
          (pattern) =>
            pattern.test(page.domain) ||
            pattern.test(page.title) ||
            pattern.test(page.url),
        ),
      );
      if (matches) {
        confirmedTopicIds.push(topic.id!);
      }
    }

    if (confirmedTopicIds.length === 0) continue;

    const trend = await computeTrend(confirmedTopicIds);

    await categoriesRepo.upsertByName(rule.name, {
      description: rule.description,
      system_generated: true,
      topic_ids: confirmedTopicIds,
      trend,
    });
  }

  console.log('[BKO] Category building complete');
}

/**
 * Compute trend for a category by comparing recent vs prior activity.
 */
async function computeTrend(topicIds: number[]): Promise<CategoryTrend> {
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  const topics = await db.topics.where('id').anyOf(topicIds).toArray();
  const allPageIds = topics.flatMap((t) => t.page_ids);
  if (allPageIds.length === 0) return 'flat';

  const pages = await db.pages.where('id').anyOf(allPageIds).toArray();

  const recentCount = pages.filter((p) => p.last_seen_at >= oneWeekAgo).length;
  const priorCount = pages.filter(
    (p) => p.last_seen_at >= twoWeeksAgo && p.last_seen_at < oneWeekAgo,
  ).length;

  if (recentCount > priorCount * 1.2) return 'up';
  if (recentCount < priorCount * 0.8) return 'down';
  return 'flat';
}

export { computeTrend };
