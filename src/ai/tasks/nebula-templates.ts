// ============================================================
// Pre-built Nebula Templates
// ============================================================

import type { Nebula } from '../../shared/types';
import { nebulasRepo } from '../../db/repositories/nebulas';
import { db } from '../../db';

let seedingPromise: Promise<void> | null = null;

/** Creates the default templates if the nebulas table has none.
 *  Guarded against concurrent calls (React StrictMode, fast remounts). */
export function seedNebulaTemplates(): Promise<void> {
  if (!seedingPromise) {
    seedingPromise = doSeed().finally(() => { seedingPromise = null; });
  }
  return seedingPromise;
}

async function doSeed(): Promise<void> {
  const all = await db.nebulas.toArray();
  const existingTemplates = all.filter((n) => n.is_template);

  // Deduplicate: if there are more templates than expected, keep only one per name
  if (existingTemplates.length > DEFAULT_TEMPLATES.length) {
    const seen = new Set<string>();
    for (const tpl of existingTemplates) {
      if (seen.has(tpl.name)) {
        // Duplicate — delete it
        if (tpl.id) await db.nebulas.delete(tpl.id);
      } else {
        seen.add(tpl.name);
      }
    }
  }

  // Also clean up any duplicated non-template copies that were accidentally created
  // from the old "duplicate on template click" behavior
  const duplicates = all.filter((n) => !n.is_template && n.template_id);
  for (const dup of duplicates) {
    if (dup.id) {
      // Only delete if the user never edited it (still matches template structure)
      await nebulasRepo.deleteNebula(dup.id);
    }
  }

  if (existingTemplates.length > 0) return; // already seeded (after dedup)

  const now = Date.now();
  for (const tpl of DEFAULT_TEMPLATES) {
    await nebulasRepo.create({ ...tpl, created_at: now, updated_at: now });
  }
}

// ------------------------------------------------------------------
// Template 1: Article Writer
// ------------------------------------------------------------------
const articleWriter: Omit<Nebula, 'id' | 'created_at' | 'updated_at'> = {
  name: 'Article Writer',
  description: 'Write a polished article using your browsing research and personal writing style.',
  icon: '✍️',
  is_template: true,
  nodes: [
    {
      id: 'input-topic',
      type: 'user-input',
      position: { x: 50, y: 80 },
      data: {
        label: 'Topic',
        input_type: 'text',
        placeholder: 'What should the article be about?',
        required: true,
      },
    },
    {
      id: 'input-tone',
      type: 'user-input',
      position: { x: 50, y: 220 },
      data: {
        label: 'Tone & Style',
        input_type: 'select',
        placeholder: 'Choose a writing tone',
        required: false,
        options: ['Professional', 'Conversational', 'Academic', 'Casual', 'Persuasive'],
        default_value: 'Professional',
      },
    },
    {
      id: 'source-pages',
      type: 'data-source',
      position: { x: 50, y: 360 },
      data: {
        label: 'Recent Research Pages',
        source_type: 'pages',
        filters: { limit: 30 },
      },
    },
    {
      id: 'ai-write',
      type: 'ai-process',
      position: { x: 400, y: 180 },
      data: {
        label: 'Write Article',
        prompt_template: `You are an expert writer. Write a well-structured, insightful article based on the following inputs.

**Topic:** {{input-topic}}
**Tone:** {{input-tone}}

**Research context from browsing history:**
{{source-pages}}

Write a comprehensive article with:
- An engaging title (as a # heading)
- A compelling introduction
- 3-5 well-developed sections with ## headings
- Specific insights drawn from the research context
- A thoughtful conclusion

Output the article in Markdown format.`,
        temperature: 0.7,
        max_tokens: 4000,
      },
    },
    {
      id: 'output',
      type: 'output',
      position: { x: 700, y: 180 },
      data: {
        label: 'Article',
        format: 'markdown',
        artifact_title_template: 'Article: {{input-topic}}',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'input-topic', target: 'ai-write' },
    { id: 'e2', source: 'input-tone', target: 'ai-write' },
    { id: 'e3', source: 'source-pages', target: 'ai-write' },
    { id: 'e4', source: 'ai-write', target: 'output' },
  ],
};

// ------------------------------------------------------------------
// Template 2: Research Summary
// ------------------------------------------------------------------
const researchSummary: Omit<Nebula, 'id' | 'created_at' | 'updated_at'> = {
  name: 'Research Summary',
  description: 'Synthesize your recent browsing into a focused research summary around a specific area.',
  icon: '🔬',
  is_template: true,
  nodes: [
    {
      id: 'input-focus',
      type: 'user-input',
      position: { x: 50, y: 120 },
      data: {
        label: 'Focus Area',
        input_type: 'textarea',
        placeholder: 'Describe what aspect of your research to summarize...',
        required: true,
      },
    },
    {
      id: 'source-pages',
      type: 'data-source',
      position: { x: 50, y: 320 },
      data: {
        label: 'Browsed Pages',
        source_type: 'pages',
        filters: { limit: 50 },
      },
    },
    {
      id: 'source-topics',
      type: 'data-source',
      position: { x: 50, y: 460 },
      data: {
        label: 'Discovered Topics',
        source_type: 'topics',
      },
    },
    {
      id: 'ai-summarize',
      type: 'ai-process',
      position: { x: 400, y: 250 },
      data: {
        label: 'Synthesize Summary',
        prompt_template: `You are a research analyst. Create a comprehensive research summary based on the user's browsing data.

**Focus Area:** {{input-focus}}

**Pages visited:**
{{source-pages}}

**Topics discovered:**
{{source-topics}}

Create a structured research summary in Markdown with:
- # Research Summary: [inferred title]
- ## Key Findings (bulleted list of the most important discoveries)
- ## Source Analysis (group insights by domain/theme)
- ## Connections & Patterns (cross-cutting themes)
- ## Knowledge Gaps (what's missing or needs more research)
- ## Recommended Next Steps

Be specific and reference actual page content where relevant.`,
        temperature: 0.4,
        max_tokens: 3500,
      },
    },
    {
      id: 'output',
      type: 'output',
      position: { x: 700, y: 250 },
      data: {
        label: 'Summary',
        format: 'markdown',
        artifact_title_template: 'Research Summary: {{input-focus}}',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'input-focus', target: 'ai-summarize' },
    { id: 'e2', source: 'source-pages', target: 'ai-summarize' },
    { id: 'e3', source: 'source-topics', target: 'ai-summarize' },
    { id: 'e4', source: 'ai-summarize', target: 'output' },
  ],
};

// ------------------------------------------------------------------
// Template 3: Topic Brief
// ------------------------------------------------------------------
const topicBrief: Omit<Nebula, 'id' | 'created_at' | 'updated_at'> = {
  name: 'Topic Brief',
  description: 'Generate a deep-dive brief on a specific topic using your accumulated knowledge.',
  icon: '📋',
  is_template: true,
  nodes: [
    {
      id: 'input-topic',
      type: 'user-input',
      position: { x: 50, y: 120 },
      data: {
        label: 'Topic Name',
        input_type: 'text',
        placeholder: 'Which topic to create a brief for?',
        required: true,
      },
    },
    {
      id: 'input-audience',
      type: 'user-input',
      position: { x: 50, y: 260 },
      data: {
        label: 'Target Audience',
        input_type: 'select',
        placeholder: 'Who is this brief for?',
        required: false,
        options: ['Myself', 'Team / Colleagues', 'Executive / Manager', 'General Public'],
        default_value: 'Myself',
      },
    },
    {
      id: 'source-topics',
      type: 'data-source',
      position: { x: 50, y: 400 },
      data: {
        label: 'All Topics',
        source_type: 'topics',
      },
    },
    {
      id: 'source-pages',
      type: 'data-source',
      position: { x: 50, y: 540 },
      data: {
        label: 'Related Pages',
        source_type: 'pages',
        filters: { limit: 40 },
      },
    },
    {
      id: 'ai-brief',
      type: 'ai-process',
      position: { x: 400, y: 300 },
      data: {
        label: 'Compile Brief',
        prompt_template: `You are a knowledge analyst. Create a comprehensive topic brief.

**Topic:** {{input-topic}}
**Audience:** {{input-audience}}

**Available topics in the knowledge base:**
{{source-topics}}

**Related pages:**
{{source-pages}}

Create a structured brief in Markdown with:
- # Topic Brief: {{input-topic}}
- ## Overview (what this topic is about, based on the data)
- ## Key Concepts (important ideas and definitions)
- ## Current Landscape (what the research shows)
- ## Notable Sources (highlight the most valuable pages/resources)
- ## Open Questions (areas needing further exploration)

Adjust depth and language for the target audience.`,
        temperature: 0.5,
        max_tokens: 3500,
      },
    },
    {
      id: 'output',
      type: 'output',
      position: { x: 700, y: 300 },
      data: {
        label: 'Brief',
        format: 'markdown',
        artifact_title_template: 'Brief: {{input-topic}}',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'input-topic', target: 'ai-brief' },
    { id: 'e2', source: 'input-audience', target: 'ai-brief' },
    { id: 'e3', source: 'source-topics', target: 'ai-brief' },
    { id: 'e4', source: 'source-pages', target: 'ai-brief' },
    { id: 'e5', source: 'ai-brief', target: 'output' },
  ],
};

const DEFAULT_TEMPLATES: Omit<Nebula, 'id' | 'created_at' | 'updated_at'>[] = [
  articleWriter,
  researchSummary,
  topicBrief,
];
