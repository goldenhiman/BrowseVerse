// ============================================================
// AI-Enhanced Topic Clustering
// ============================================================

import type { AIProvider, AIClusterResult } from '../interface';
import type { Page } from '../../shared/types';
import { topicsRepo } from '../../db/repositories/topics';

/**
 * Use AI to cluster pages into meaningful topics beyond simple domain grouping.
 */
export async function aiClusterPages(
  provider: AIProvider,
  pages: Page[],
): Promise<AIClusterResult> {
  const pageDescriptions = pages.map((p, i) => ({
    index: i,
    title: p.title || 'Untitled',
    domain: p.domain,
    url: p.url,
    keywords: p.metadata?.keywords?.join(', ') || '',
    description: p.metadata?.description || '',
  }));

  const prompt = `Analyze these web pages and group them into meaningful topic clusters.
Each cluster should represent a coherent theme or area of interest.

Pages:
${pageDescriptions
  .slice(0, 50)
  .map((p) => `[${p.index}] "${p.title}" (${p.domain}) - ${p.description || p.keywords}`)
  .join('\n')}

Respond in JSON format:
{
  "clusters": [
    {
      "label": "Topic Name",
      "description": "Brief description of the theme",
      "item_indices": [0, 3, 7]
    }
  ]
}

Rules:
- Each page should be in at most one cluster
- Only create clusters with 2+ pages
- Use clear, concise labels
- Focus on user intent and themes, not just domain grouping`;

  const response = await provider.complete(prompt, {
    systemPrompt:
      'You are a knowledge organization assistant. You analyze browsing patterns to identify meaningful themes. Always respond with valid JSON.',
    maxTokens: 2000,
    temperature: 0.3,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const result = JSON.parse(jsonMatch[0]) as AIClusterResult;
    return result;
  } catch (err) {
    console.error('[BKO] Failed to parse AI clustering result:', err);
    return { clusters: [] };
  }
}

/**
 * Apply AI clustering results to the topic system.
 */
export async function applyAIClusters(
  result: AIClusterResult,
  pages: Page[],
): Promise<void> {
  for (const cluster of result.clusters) {
    const pageIds = cluster.item_indices
      .filter((i) => i >= 0 && i < pages.length)
      .map((i) => pages[i].id!)
      .filter(Boolean);

    if (pageIds.length < 2) continue;

    await topicsRepo.upsertByName(cluster.label, {
      description: cluster.description,
      page_ids: pageIds,
      lifecycle_state: 'active',
      confidence_score: 0.8,
    });
  }
}
