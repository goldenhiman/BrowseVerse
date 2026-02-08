// ============================================================
// AI Summarization Tasks
// ============================================================

import type { AIProvider, AISummaryResult } from '../interface';
import type { Page, Session, KnowledgeBox } from '../../shared/types';
import { db } from '../../db/index';

/**
 * Generate a concise, content-rich AI summary for an individual page.
 * Uses page title, URL, domain, and metadata to produce a 2-3 sentence summary.
 */
export async function summarizePage(
  provider: AIProvider,
  page: Page,
): Promise<string> {
  const meta = page.metadata || {};
  const description = meta.og_description || meta.description || '';
  const keywords = meta.keywords?.join(', ') || '';
  const author = meta.author || '';

  const prompt = `Summarize this web page in 2-3 concise, informative sentences. Focus on what the page is about, its key content, and why someone might find it useful.

Title: ${page.title || 'Untitled'}
URL: ${page.url}
Domain: ${page.domain}${description ? `\nDescription: ${description}` : ''}${keywords ? `\nKeywords: ${keywords}` : ''}${author ? `\nAuthor: ${author}` : ''}
Time spent: ${Math.round(page.total_dwell_time / 1000)}s

Respond with ONLY the summary text, no JSON or extra formatting.`;

  const response = await provider.complete(prompt, {
    systemPrompt:
      'You are a knowledge assistant that creates clear, factual page summaries. Be concise and informative. Return plain text only.',
    maxTokens: 200,
    temperature: 0.3,
  });

  return response.trim();
}

/**
 * Summarize a browsing session.
 */
export async function summarizeSession(
  provider: AIProvider,
  session: Session,
): Promise<AISummaryResult> {
  const pages = await db.pages.where('id').anyOf(session.page_ids).toArray();

  const prompt = `Summarize this browsing session:

Duration: ${Math.round((session.end_time - session.start_time) / 60000)} minutes
Pages visited (${pages.length}):
${pages
  .map((p) => `- "${p.title}" (${p.domain}) — ${Math.round(p.total_dwell_time / 1000)}s dwell time`)
  .join('\n')}

Provide:
1. A brief summary of what the user was doing
2. Key points or findings
3. Main themes

Respond in JSON:
{
  "summary": "One paragraph summary",
  "key_points": ["point 1", "point 2"],
  "themes": ["theme 1", "theme 2"]
}`;

  const response = await provider.complete(prompt, {
    systemPrompt:
      'You are a personal knowledge assistant. Summarize browsing sessions concisely and insightfully. Always respond with valid JSON.',
    maxTokens: 800,
    temperature: 0.5,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as AISummaryResult;
  } catch {
    return { summary: response, key_points: [], themes: [] };
  }
}

/**
 * Summarize a Constellation's (Knowledge Box) progress.
 */
export async function summarizeKnowledgeBox(
  provider: AIProvider,
  box: KnowledgeBox,
): Promise<AISummaryResult> {
  const pages = await db.pages.where('id').anyOf(box.related_page_ids).toArray();
  const topics = await db.topics.where('id').anyOf(box.related_topic_ids).toArray();

  const prompt = `Summarize the progress of this knowledge constellation:

Title: ${box.title}
Goal: ${box.goal_statement}
Status: ${box.status}
Started: ${new Date(box.start_date).toLocaleDateString()}

Related Pages (${pages.length}):
${pages
  .slice(0, 20)
  .map((p) => `- "${p.title}" (${p.domain})`)
  .join('\n')}

Related Topics: ${topics.map((t) => t.name).join(', ')}

Notes (${box.notes.length}):
${box.notes
  .slice(-5)
  .map((n) => `- [${new Date(n.timestamp).toLocaleDateString()}] ${n.text}`)
  .join('\n')}

Provide a progress summary, key findings, and suggested next steps.

Respond in JSON:
{
  "summary": "Progress summary paragraph",
  "key_points": ["finding 1", "finding 2"],
  "themes": ["next step 1", "next step 2"]
}`;

  const response = await provider.complete(prompt, {
    systemPrompt:
      'You are a personal knowledge assistant helping a user track their research and learning goals. Be encouraging and insightful. Always respond with valid JSON.',
    maxTokens: 1000,
    temperature: 0.5,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as AISummaryResult;
  } catch {
    return { summary: response, key_points: [], themes: [] };
  }
}

/**
 * Generate a daily browsing digest.
 */
export async function generateDailyDigest(
  provider: AIProvider,
): Promise<AISummaryResult> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const pages = await db.pages
    .where('last_seen_at')
    .above(startOfDay.getTime())
    .toArray();

  if (pages.length === 0) {
    return {
      summary: 'No browsing activity today.',
      key_points: [],
      themes: [],
    };
  }

  const prompt = `Create a brief daily digest of today's browsing activity:

Pages visited today (${pages.length}):
${pages
  .slice(0, 30)
  .map((p) => `- "${p.title}" (${p.domain}) — ${Math.round(p.total_dwell_time / 1000)}s`)
  .join('\n')}

Provide a reflective summary of the day's browsing, key themes, and any notable patterns.

Respond in JSON:
{
  "summary": "Today's browsing digest",
  "key_points": ["observation 1", "observation 2"],
  "themes": ["theme 1", "theme 2"]
}`;

  const response = await provider.complete(prompt, {
    systemPrompt:
      'You are a reflective personal knowledge assistant. Create brief, insightful daily digests. Always respond with valid JSON.',
    maxTokens: 600,
    temperature: 0.6,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as AISummaryResult;
  } catch {
    return { summary: response, key_points: [], themes: [] };
  }
}
