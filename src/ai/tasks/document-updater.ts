// ============================================================
// AI-Powered Living Document Updater
// Incrementally updates constellation documents using a
// git-like diff approach — only changed chunks are regenerated.
// ============================================================

import type { AIProvider } from '../interface';
import type { KnowledgeBox, Page, Topic, DocumentSectionType } from '../../shared/types';
import { db } from '../../db/index';
import { documentChunksRepo } from '../../db/repositories/documentChunks';
import { knowledgeBoxesRepo } from '../../db/repositories/knowledgeBoxes';

interface DocumentUpdatePlan {
  updates: Array<{
    section_key: string;
    section_type: DocumentSectionType;
    action: 'create' | 'update' | 'append';
    order_index: number;
    title: string;
    content: string;
    source_page_ids?: number[];
    source_topic_ids?: number[];
  }>;
}

/**
 * Update the living document for a single constellation.
 * Returns true if any updates were made.
 */
export async function updateConstellationDocument(
  provider: AIProvider,
  constellation: KnowledgeBox,
): Promise<boolean> {
  if (!constellation.id) return false;
  const constellationId = constellation.id;

  // Fetch current chunks
  const existingChunks = await documentChunksRepo.getByConstellation(constellationId);

  // Fetch related pages and topics
  const pages = constellation.related_page_ids.length > 0
    ? await db.pages.where('id').anyOf(constellation.related_page_ids).toArray()
    : [];
  const topics = constellation.related_topic_ids.length > 0
    ? await db.topics.where('id').anyOf(constellation.related_topic_ids).toArray()
    : [];

  // If no pages at all, nothing to document
  if (pages.length === 0) {
    return false;
  }

  // Determine if this is a bootstrap (first document creation) or an incremental update
  if (existingChunks.length === 0) {
    return await bootstrapDocument(provider, constellationId, constellation, pages, topics);
  }

  return await incrementalUpdate(provider, constellationId, constellation, existingChunks, pages, topics);
}

/**
 * Bootstrap: create the initial document with all sections in one AI call.
 */
async function bootstrapDocument(
  provider: AIProvider,
  constellationId: number,
  constellation: KnowledgeBox,
  pages: Page[],
  topics: Topic[],
): Promise<boolean> {
  const pageDescriptions = formatPages(pages);
  const topicDescriptions = formatTopics(topics);

  const prompt = `Create a comprehensive knowledge document for this research constellation.

CONSTELLATION:
Title: "${constellation.title}"
Goal: ${constellation.goal_statement}
Status: ${constellation.status}
Started: ${new Date(constellation.start_date).toLocaleDateString()}

PAGES (${pages.length}):
${pageDescriptions}

${topicDescriptions.length > 0 ? `TOPICS:\n${topicDescriptions}` : ''}

${constellation.notes.length > 0 ? `USER NOTES:\n${constellation.notes.slice(-5).map((n) => `- ${n.text}`).join('\n')}` : ''}

Create a well-structured document with the following sections. Each section must have rich Markdown formatting (headings, lists, bold, links where relevant).

Respond in JSON:
{
  "updates": [
    {
      "section_key": "overview",
      "section_type": "overview",
      "action": "create",
      "order_index": 0,
      "title": "Overview",
      "content": "## [Evolved document title]\\n\\n[Rich overview paragraph describing the scope, purpose, and current state of this research area. Should read as the opening of a well-written research document.]"
    },
    {
      "section_key": "key_findings",
      "section_type": "key_findings",
      "action": "create",
      "order_index": 100,
      "title": "Key Findings",
      "content": "## Key Findings\\n\\n[Synthesized insights from all sources, formatted as a rich narrative with bullet points for key takeaways]"
    },
    {
      "section_key": "source:[domain_or_theme]",
      "section_type": "source_analysis",
      "action": "create",
      "order_index": 200,
      "title": "[Source Group Name]",
      "content": "## [Source Group Name]\\n\\n[Analysis of pages from this domain/theme, what they contribute, key information extracted]"
    },
    {
      "section_key": "topic_synthesis",
      "section_type": "topic_synthesis",
      "action": "create",
      "order_index": 300,
      "title": "Topic Connections",
      "content": "## Topic Connections\\n\\n[How the topics relate to each other and to the constellation goal]"
    },
    {
      "section_key": "progress_log",
      "section_type": "progress_log",
      "action": "create",
      "order_index": 400,
      "title": "Progress Log",
      "content": "## Progress Log\\n\\n**${new Date().toLocaleDateString()}** — Document created with ${pages.length} pages and ${topics.length} topics."
    },
    {
      "section_key": "next_steps",
      "section_type": "next_steps",
      "action": "create",
      "order_index": 500,
      "title": "Next Steps",
      "content": "## Next Steps\\n\\n[Actionable recommendations based on the current research]"
    }
  ]
}

Rules:
- Create one source_analysis chunk per distinct domain or thematic group (use order_index 200-299)
- All content must be well-formatted Markdown
- The overview should read like the opening of a polished research document
- Include the page indices that inform each source_analysis chunk
- Be comprehensive but concise — quality over quantity`;

  const response = await provider.complete(prompt, {
    systemPrompt: 'You are a research documentation assistant. Create well-structured, richly formatted Markdown documents that synthesize browsing research into coherent knowledge. Always respond with valid JSON.',
    maxTokens: 4000,
    temperature: 0.4,
  });

  return await applyUpdatePlan(constellationId, response, pages, topics);
}

/**
 * Incremental update: determine what changed and only update affected chunks.
 */
async function incrementalUpdate(
  provider: AIProvider,
  constellationId: number,
  constellation: KnowledgeBox,
  existingChunks: import('../../shared/types').DocumentChunk[],
  pages: Page[],
  topics: Topic[],
): Promise<boolean> {
  // Determine which pages/topics are new (not yet covered by any chunk)
  const coveredPageIds = await documentChunksRepo.getCoveredPageIds(constellationId);
  const coveredTopicIds = await documentChunksRepo.getCoveredTopicIds(constellationId);

  const newPages = pages.filter((p) => p.id && !coveredPageIds.has(p.id));
  const newTopics = topics.filter((t) => t.id && !coveredTopicIds.has(t.id));

  // Nothing new to incorporate
  if (newPages.length === 0 && newTopics.length === 0) {
    return false;
  }

  // Build the current document index for the AI
  const documentIndex = existingChunks.map((c) => ({
    section_key: c.section_key,
    section_type: c.section_type,
    order_index: c.order_index,
    title: c.title,
    content_preview: c.content.slice(0, 200) + (c.content.length > 200 ? '...' : ''),
    version: c.version,
    page_count: c.source_page_ids.length,
  }));

  const newPageDescriptions = formatPages(newPages);
  const newTopicDescriptions = formatTopics(newTopics);

  const prompt = `You are incrementally updating a living knowledge document. Only modify sections that NEED changing based on new information. This is like a git diff — preserve unchanged sections.

CONSTELLATION:
Title: "${constellation.title}"
Goal: ${constellation.goal_statement}

CURRENT DOCUMENT INDEX:
${documentIndex.map((d) => `[${d.section_key}] (v${d.version}) "${d.title}" — ${d.content_preview}`).join('\n\n')}

NEW PAGES ADDED (${newPages.length}):
${newPageDescriptions}

${newTopicDescriptions.length > 0 ? `NEW TOPICS ADDED:\n${newTopicDescriptions}` : ''}

Determine which sections need updating and respond in JSON:
{
  "updates": [
    {
      "section_key": "existing_key_or_new_key",
      "section_type": "overview|key_findings|source_analysis|topic_synthesis|progress_log|next_steps",
      "action": "create|update|append",
      "order_index": 0,
      "title": "Section Title",
      "content": "Full Markdown content for this section"
    }
  ]
}

Rules:
- ONLY include sections that need changing — do NOT return unchanged sections
- For "update" action: provide the COMPLETE new content for that section (replaces old)
- For "append" action (progress_log only): provide ONLY the new entries to append
- For "create" action: used for new source_analysis chunks from new domains
- The overview should be updated if the new pages significantly change the scope
- key_findings should be updated if new pages introduce novel insights
- Create new source_analysis chunks for pages from new domains/themes (order_index 200-299)
- topic_synthesis should be updated if new topics are added
- ALWAYS append to progress_log noting what was added
- next_steps should be refreshed if new info warrants it
- All content must be well-formatted Markdown with ## headings, lists, bold text
- Be surgical — only update what truly needs changing`;

  const response = await provider.complete(prompt, {
    systemPrompt: 'You are a research documentation assistant performing incremental updates to a living document. Be precise — only modify sections affected by new information. Always respond with valid JSON.',
    maxTokens: 3000,
    temperature: 0.3,
  });

  return await applyUpdatePlan(constellationId, response, pages, topics, newPages, newTopics);
}

/**
 * Parse the AI response and apply the update plan to the database.
 */
async function applyUpdatePlan(
  constellationId: number,
  aiResponse: string,
  allPages: Page[],
  allTopics: Topic[],
  newPages?: Page[],
  newTopics?: Topic[],
): Promise<boolean> {
  let plan: DocumentUpdatePlan;

  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');
    plan = JSON.parse(jsonMatch[0]) as DocumentUpdatePlan;
  } catch (err) {
    console.error('[BKO] Failed to parse document update plan:', err);
    return false;
  }

  if (!plan.updates || plan.updates.length === 0) {
    return false;
  }

  let appliedCount = 0;

  for (const update of plan.updates) {
    try {
      // Determine source IDs for this chunk
      const sourcePageIds = update.source_page_ids ?? inferSourcePageIds(update, newPages ?? allPages);
      const sourceTopicIds = update.source_topic_ids ?? inferSourceTopicIds(update, newTopics ?? allTopics);

      if (update.action === 'append') {
        await documentChunksRepo.appendToChunk(
          constellationId,
          update.section_key,
          update.content,
          {
            section_type: update.section_type,
            order_index: update.order_index,
            title: update.title,
            source_page_ids: sourcePageIds,
            source_topic_ids: sourceTopicIds,
          },
        );
      } else {
        // 'create' or 'update' — both use upsert
        await documentChunksRepo.upsertChunk(constellationId, update.section_key, {
          section_type: update.section_type,
          order_index: update.order_index,
          title: update.title,
          content: update.content,
          source_page_ids: sourcePageIds,
          source_topic_ids: sourceTopicIds,
        });
      }
      appliedCount++;
    } catch (err) {
      console.error(`[BKO] Failed to apply document update for section "${update.section_key}":`, err);
    }
  }

  console.log(`[BKO] Document updated for constellation ${constellationId}: ${appliedCount} sections modified`);
  return appliedCount > 0;
}

/**
 * Infer which page IDs a chunk is about based on section type.
 */
function inferSourcePageIds(
  update: DocumentUpdatePlan['updates'][0],
  pages: Page[],
): number[] {
  if (update.section_type === 'source_analysis') {
    // Try to match pages by domain from the section_key (e.g., "source:github.com")
    const domainMatch = update.section_key.match(/^source:(.+)$/);
    if (domainMatch) {
      const domain = domainMatch[1];
      return pages.filter((p) => p.domain.includes(domain)).map((p) => p.id!).filter(Boolean);
    }
  }
  // For overview, key_findings, etc., associate all pages
  return pages.map((p) => p.id!).filter(Boolean);
}

/**
 * Infer which topic IDs a chunk is about.
 */
function inferSourceTopicIds(
  update: DocumentUpdatePlan['updates'][0],
  topics: Topic[],
): number[] {
  if (update.section_type === 'topic_synthesis') {
    return topics.map((t) => t.id!).filter(Boolean);
  }
  return [];
}

// ============================================================
// Helpers
// ============================================================

function formatPages(pages: Page[]): string {
  return pages
    .slice(0, 50)
    .map((p, i) => {
      const desc = p.metadata?.description || p.metadata?.og_description || '';
      const summary = p.ai_summary || '';
      return `[P${i}] "${p.title || 'Untitled'}" (${p.domain})${desc ? ` — ${desc}` : ''}${summary ? `\n    Summary: ${summary}` : ''}`;
    })
    .join('\n');
}

function formatTopics(topics: Topic[]): string {
  if (topics.length === 0) return '';
  return topics
    .map((t) => `- "${t.name}" — ${t.description} (${t.page_ids.length} pages)`)
    .join('\n');
}
