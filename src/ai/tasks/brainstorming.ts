// ============================================================
// AI Brainstorming Tasks
// ============================================================

import type { AIProvider, AIBrainstormResult } from '../interface';
import type { Topic, KnowledgeBox } from '../../shared/types';
import { db } from '../../db/index';

/**
 * Generate brainstorming ideas based on a knowledge box and its related topics.
 */
export async function brainstormForKnowledgeBox(
  provider: AIProvider,
  box: KnowledgeBox,
): Promise<AIBrainstormResult> {
  const pages = await db.pages.where('id').anyOf(box.related_page_ids).toArray();
  const topics = await db.topics.where('id').anyOf(box.related_topic_ids).toArray();

  const prompt = `Based on this research tracking box, suggest creative ideas and next steps:

Title: ${box.title}
Goal: ${box.goal_statement}

Research so far:
- ${pages.length} pages explored across ${new Set(pages.map((p) => p.domain)).size} domains
- Topics: ${topics.map((t) => t.name).join(', ')}
- Key pages: ${pages.slice(0, 10).map((p) => `"${p.title}"`).join(', ')}

Recent notes:
${box.notes
  .slice(-3)
  .map((n) => `- ${n.text}`)
  .join('\n')}

Suggest 3-5 creative ideas or next steps to advance this goal.

Respond in JSON:
{
  "ideas": [
    {
      "title": "Idea title",
      "description": "What to do and why",
      "relevance": "How it connects to the goal"
    }
  ]
}`;

  const response = await provider.complete(prompt, {
    systemPrompt:
      'You are a creative thinking partner. Generate insightful, actionable ideas based on browsing research patterns. Always respond with valid JSON.',
    maxTokens: 1200,
    temperature: 0.8,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as AIBrainstormResult;
  } catch {
    return { ideas: [] };
  }
}

/**
 * Suggest connections between topics.
 */
export async function suggestTopicConnections(
  provider: AIProvider,
  topics: Topic[],
): Promise<AIBrainstormResult> {
  const prompt = `Analyze these browsing topics and suggest unexpected or insightful connections between them:

Topics:
${topics
  .map(
    (t) =>
      `- "${t.name}" (${t.lifecycle_state}, ${t.page_ids.length} pages): ${t.description}`,
  )
  .join('\n')}

Suggest 3-5 interesting connections or cross-topic insights.

Respond in JSON:
{
  "ideas": [
    {
      "title": "Connection title",
      "description": "How these topics relate in a non-obvious way",
      "relevance": "Why this connection matters"
    }
  ]
}`;

  const response = await provider.complete(prompt, {
    systemPrompt:
      'You are a pattern recognition assistant. Find non-obvious connections between diverse topics. Always respond with valid JSON.',
    maxTokens: 1000,
    temperature: 0.9,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as AIBrainstormResult;
  } catch {
    return { ideas: [] };
  }
}
