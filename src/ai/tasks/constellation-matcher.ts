// ============================================================
// AI-Powered Constellation (Knowledge Box) Matcher
// Periodically assigns relevant pages and topics to constellations
// ============================================================

import type { AIProvider } from '../interface';
import type { KnowledgeBox, Page, Topic } from '../../shared/types';
import { db } from '../../db/index';
import { knowledgeBoxesRepo } from '../../db/repositories/knowledgeBoxes';

interface ConstellationMatchResult {
  assignments: Array<{
    constellation_index: number;
    page_indices: number[];
    topic_indices: number[];
  }>;
}

/**
 * Match unassigned pages to active constellations based on their goal statements.
 * Returns the number of new assignments made.
 */
export async function matchPagesToConstellations(
  provider: AIProvider,
  sinceTimestamp?: number,
): Promise<number> {
  // Fetch all active constellations
  const constellations = await knowledgeBoxesRepo.getByStatus('active');
  if (constellations.length === 0) {
    console.log('[BKO] No active constellations to match against');
    return 0;
  }

  // Fetch candidate pages (recent and not excluded)
  const candidatePages = await getCandidatePages(constellations, sinceTimestamp);
  if (candidatePages.length === 0) {
    console.log('[BKO] No new pages to match');
    return 0;
  }

  // Fetch existing topics for topic-to-constellation matching
  const topics = await db.topics.orderBy('updated_at').reverse().limit(50).toArray();

  // Build the AI prompt
  const result = await runMatchingPrompt(provider, constellations, candidatePages, topics);

  // Apply assignments
  let totalAssignments = 0;
  for (const assignment of result.assignments) {
    const constellation = constellations[assignment.constellation_index];
    if (!constellation?.id) continue;

    // Assign pages
    for (const pageIdx of assignment.page_indices) {
      const page = candidatePages[pageIdx];
      if (page?.id) {
        await knowledgeBoxesRepo.addPage(constellation.id, page.id);
        totalAssignments++;
      }
    }

    // Assign topics
    for (const topicIdx of assignment.topic_indices) {
      const topic = topics[topicIdx];
      if (topic?.id) {
        await knowledgeBoxesRepo.addTopic(constellation.id, topic.id);
      }
    }
  }

  console.log(`[BKO] Constellation matcher: ${totalAssignments} page assignments made`);
  return totalAssignments;
}

/**
 * Get pages that are candidates for constellation assignment.
 * Filters out pages already assigned to all constellations and system pages.
 */
async function getCandidatePages(
  constellations: KnowledgeBox[],
  sinceTimestamp?: number,
): Promise<Page[]> {
  // Collect all page IDs already assigned to any constellation
  const assignedPageIds = new Set<number>();
  for (const box of constellations) {
    for (const pid of box.related_page_ids) {
      assignedPageIds.add(pid);
    }
  }

  // Fetch recent pages
  let pages: Page[];
  if (sinceTimestamp) {
    pages = await db.pages
      .where('last_seen_at')
      .above(sinceTimestamp)
      .toArray();
  } else {
    // Default: last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    pages = await db.pages
      .where('last_seen_at')
      .above(oneDayAgo)
      .toArray();
  }

  // Filter: not excluded, has a title, and not already assigned to every constellation
  return pages
    .filter((p) => !p.excluded && !!p.title && !assignedPageIds.has(p.id!))
    .slice(0, 50); // Cap at 50 to control prompt size
}

/**
 * Run the AI matching prompt to assign pages and topics to constellations.
 */
async function runMatchingPrompt(
  provider: AIProvider,
  constellations: KnowledgeBox[],
  pages: Page[],
  topics: Topic[],
): Promise<ConstellationMatchResult> {
  const constellationDescriptions = constellations.map((c, i) => ({
    index: i,
    title: c.title,
    goal: c.goal_statement,
    existing_pages: c.related_page_ids.length,
  }));

  const pageDescriptions = pages.map((p, i) => ({
    index: i,
    title: p.title || 'Untitled',
    domain: p.domain,
    description: p.metadata?.description || p.metadata?.og_description || '',
    keywords: p.metadata?.keywords?.join(', ') || '',
    ai_summary: p.ai_summary || '',
  }));

  const topicDescriptions = topics.map((t, i) => ({
    index: i,
    name: t.name,
    description: t.description,
    page_count: t.page_ids.length,
  }));

  const prompt = `You are assigning browsing pages and topics to knowledge constellations.
Each constellation has a title and goal statement. Assign pages and topics that are clearly relevant to each constellation's goal.

CONSTELLATIONS:
${constellationDescriptions
  .map((c) => `[C${c.index}] "${c.title}" — Goal: ${c.goal} (${c.existing_pages} existing pages)`)
  .join('\n')}

CANDIDATE PAGES:
${pageDescriptions
  .map((p) => `[P${p.index}] "${p.title}" (${p.domain})${p.description ? ` — ${p.description}` : ''}${p.ai_summary ? ` | Summary: ${p.ai_summary}` : ''}`)
  .join('\n')}

${topicDescriptions.length > 0 ? `TOPICS:
${topicDescriptions
  .map((t) => `[T${t.index}] "${t.name}" — ${t.description} (${t.page_count} pages)`)
  .join('\n')}` : ''}

Respond in JSON format:
{
  "assignments": [
    {
      "constellation_index": 0,
      "page_indices": [1, 3, 7],
      "topic_indices": [2]
    }
  ]
}

Rules:
- Only assign pages/topics that are CLEARLY relevant to a constellation's goal
- A page can be assigned to multiple constellations if truly relevant to both
- If no pages match a constellation, omit it from the response
- Prefer precision over recall — only high-confidence matches
- Use the page summaries, descriptions, and keywords to judge relevance`;

  const response = await provider.complete(prompt, {
    systemPrompt:
      'You are a knowledge organization assistant. Match browsing pages to user-defined research goals with high precision. Always respond with valid JSON.',
    maxTokens: 1500,
    temperature: 0.2,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const parsed = JSON.parse(jsonMatch[0]) as ConstellationMatchResult;

    // Validate indices are in range
    parsed.assignments = (parsed.assignments || []).filter((a) => {
      if (a.constellation_index < 0 || a.constellation_index >= constellations.length) return false;
      a.page_indices = (a.page_indices || []).filter((i) => i >= 0 && i < pages.length);
      a.topic_indices = (a.topic_indices || []).filter((i) => i >= 0 && i < topics.length);
      return a.page_indices.length > 0 || a.topic_indices.length > 0;
    });

    return parsed;
  } catch (err) {
    console.error('[BKO] Failed to parse constellation matching result:', err);
    return { assignments: [] };
  }
}
