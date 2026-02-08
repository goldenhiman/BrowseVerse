// ============================================================
// Data Export - JSON and CSV export
// ============================================================

import { db } from '../db/index';
import type {
  Page,
  Session,
  Highlight,
  Topic,
  Category,
  Concept,
  Relationship,
  KnowledgeBox,
} from '../shared/types';

interface ExportData {
  version: string;
  exported_at: string;
  pages: Page[];
  sessions: Session[];
  highlights: Highlight[];
  topics: Topic[];
  categories: Category[];
  concepts: Concept[];
  relationships: Relationship[];
  knowledgeBoxes: KnowledgeBox[];
}

/** Export all data as JSON */
export async function exportAsJSON(): Promise<string> {
  const data: ExportData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    pages: await db.pages.toArray(),
    sessions: await db.sessions.toArray(),
    highlights: await db.highlights.toArray(),
    topics: await db.topics.toArray(),
    categories: await db.categories.toArray(),
    concepts: await db.concepts.toArray(),
    relationships: await db.relationships.toArray(),
    knowledgeBoxes: await db.knowledgeBoxes.toArray(),
  };
  return JSON.stringify(data, null, 2);
}

/** Export pages as CSV */
export async function exportPagesAsCSV(): Promise<string> {
  const pages = await db.pages.toArray();
  const headers = [
    'id',
    'url',
    'domain',
    'title',
    'first_seen_at',
    'last_seen_at',
    'total_dwell_time',
    'scroll_depth',
    'referrer',
    'excluded',
  ];

  const rows = pages.map((p) =>
    [
      p.id,
      escapeCSV(p.url),
      escapeCSV(p.domain),
      escapeCSV(p.title),
      new Date(p.first_seen_at).toISOString(),
      new Date(p.last_seen_at).toISOString(),
      p.total_dwell_time,
      p.scroll_depth,
      escapeCSV(p.referrer),
      p.excluded,
    ].join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}

/** Export highlights as CSV */
export async function exportHighlightsAsCSV(): Promise<string> {
  const highlights = await db.highlights.toArray();
  const headers = ['id', 'page_id', 'text', 'context_before', 'context_after', 'timestamp'];

  const rows = highlights.map((h) =>
    [
      h.id,
      h.page_id,
      escapeCSV(h.text),
      escapeCSV(h.context_before),
      escapeCSV(h.context_after),
      new Date(h.timestamp).toISOString(),
    ].join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}

/** Export knowledge box as markdown */
export async function exportKnowledgeBoxAsMarkdown(boxId: number): Promise<string | null> {
  const box = await db.knowledgeBoxes.get(boxId);
  if (!box) return null;

  const pages = await db.pages.where('id').anyOf(box.related_page_ids).toArray();
  const topics = await db.topics.where('id').anyOf(box.related_topic_ids).toArray();

  let md = `# ${box.title}\n\n`;
  md += `**Goal:** ${box.goal_statement}\n\n`;
  md += `**Status:** ${box.status}\n`;
  md += `**Started:** ${new Date(box.start_date).toLocaleDateString()}\n\n`;

  if (topics.length > 0) {
    md += `## Related Topics\n\n`;
    for (const topic of topics) {
      md += `- **${topic.name}** (${topic.lifecycle_state}) — ${topic.page_ids.length} pages\n`;
    }
    md += '\n';
  }

  if (pages.length > 0) {
    md += `## Related Pages\n\n`;
    for (const page of pages) {
      md += `- [${page.title || page.url}](${page.url}) — ${page.domain}\n`;
    }
    md += '\n';
  }

  if (box.notes.length > 0) {
    md += `## Notes\n\n`;
    for (const note of box.notes) {
      md += `### ${new Date(note.timestamp).toLocaleDateString()}\n\n`;
      md += `${note.text}\n\n`;
    }
  }

  return md;
}

/** Download helper - triggers file download in browser */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCSV(str: string): string {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
