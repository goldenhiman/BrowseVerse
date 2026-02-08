// ============================================================
// Data Export & Import - JSON and CSV
// ============================================================

import { db } from '../db/index';
import {
  SETTINGS_STORAGE_KEY,
  AI_LAST_RUN_KEY,
} from '../shared/constants';
import { invalidateCache } from './exclusions';
import type {
  Page,
  Session,
  Highlight,
  Topic,
  Category,
  Concept,
  Relationship,
  KnowledgeBox,
  DocumentChunk,
  Nebula,
  NebulaRun,
  Artifact,
  AppSettings,
} from '../shared/types';

const PRESETS_VERSION_KEY = 'bko_exclusions_presets_version';

// ============================================================
// Export Data Shape
// ============================================================

export interface ExportData {
  version: string;
  exported_at: string;
  // IndexedDB tables
  pages: Page[];
  sessions: Session[];
  highlights: Highlight[];
  topics: Topic[];
  categories: Category[];
  concepts: Concept[];
  relationships: Relationship[];
  knowledgeBoxes: KnowledgeBox[];
  documentChunks: DocumentChunk[];
  nebulas: Nebula[];
  nebulaRuns: NebulaRun[];
  artifacts: Artifact[];
  // Browser storage
  browserStorage: {
    settings?: AppSettings;
    exclusionsPresetsVersion?: number;
    aiLastRun?: number;
  };
}

export const EXPORT_VERSION = '2.0';

// ============================================================
// Validation
// ============================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  preview?: ImportPreview;
}

export interface ImportPreview {
  version: string;
  exported_at: string;
  counts: Record<string, number>;
  hasSettings: boolean;
}

const TABLE_KEYS: (keyof ExportData)[] = [
  'pages',
  'sessions',
  'highlights',
  'topics',
  'categories',
  'concepts',
  'relationships',
  'knowledgeBoxes',
  'documentChunks',
  'nebulas',
  'nebulaRuns',
  'artifacts',
];

/** Validate an export file and return a preview of what it contains */
export function validateExportFile(jsonString: string): ValidationResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return { valid: false, error: 'Invalid JSON — the file could not be parsed.' };
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { valid: false, error: 'Invalid format — expected a JSON object.' };
  }

  if (!data.version || typeof data.version !== 'string') {
    return { valid: false, error: 'Missing or invalid "version" field.' };
  }

  if (!data.exported_at || typeof data.exported_at !== 'string') {
    return { valid: false, error: 'Missing or invalid "exported_at" field.' };
  }

  // v1.0 exports have a subset of tables; v2.0 has all. Both are accepted.
  const v1RequiredTables = ['pages', 'sessions', 'highlights', 'topics', 'categories', 'concepts', 'relationships', 'knowledgeBoxes'];
  for (const key of v1RequiredTables) {
    if (!Array.isArray(data[key])) {
      return { valid: false, error: `Missing or invalid table "${key}" — expected an array.` };
    }
  }

  const counts: Record<string, number> = {};
  for (const key of TABLE_KEYS) {
    const arr = data[key];
    counts[key] = Array.isArray(arr) ? arr.length : 0;
  }

  const browserStorage = data.browserStorage as Record<string, unknown> | undefined;
  const hasSettings = !!(browserStorage && typeof browserStorage === 'object' && browserStorage.settings);

  return {
    valid: true,
    preview: {
      version: data.version as string,
      exported_at: data.exported_at as string,
      counts,
      hasSettings,
    },
  };
}

// ============================================================
// Import
// ============================================================

export interface ImportResult {
  success: boolean;
  error?: string;
  counts: Record<string, number>;
}

/** Import all data from a JSON export, replacing existing data */
export async function importFromJSON(jsonString: string): Promise<ImportResult> {
  const validation = validateExportFile(jsonString);
  if (!validation.valid) {
    return { success: false, error: validation.error, counts: {} };
  }

  const data = JSON.parse(jsonString) as Record<string, unknown>;
  const counts: Record<string, number> = {};

  try {
    // Clear and bulk-insert all IndexedDB tables inside a transaction
    await db.transaction('rw', db.tables, async () => {
      // Clear every table
      for (const table of db.tables) {
        await table.clear();
      }

      // Bulk-insert each table from the export
      const tableMap: Record<string, typeof db.pages> = {
        pages: db.pages,
        sessions: db.sessions,
        highlights: db.highlights,
        topics: db.topics,
        categories: db.categories,
        concepts: db.concepts,
        relationships: db.relationships,
        knowledgeBoxes: db.knowledgeBoxes,
        documentChunks: db.documentChunks,
        nebulas: db.nebulas,
        nebulaRuns: db.nebulaRuns,
        artifacts: db.artifacts,
      };

      for (const [key, table] of Object.entries(tableMap)) {
        const arr = data[key];
        if (Array.isArray(arr) && arr.length > 0) {
          await table.bulkAdd(arr);
          counts[key] = arr.length;
        } else {
          counts[key] = 0;
        }
      }
    });

    // Restore browser.storage data
    const browserStorage = data.browserStorage as Record<string, unknown> | undefined;
    if (browserStorage && typeof browserStorage === 'object') {
      if (browserStorage.settings) {
        await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: browserStorage.settings });
      }
      if (typeof browserStorage.exclusionsPresetsVersion === 'number') {
        await browser.storage.local.set({ [PRESETS_VERSION_KEY]: browserStorage.exclusionsPresetsVersion });
      }
      if (typeof browserStorage.aiLastRun === 'number') {
        await browser.storage.local.set({ [AI_LAST_RUN_KEY]: browserStorage.aiLastRun });
      }
    }

    // Invalidate cached settings so subsequent reads pick up imported values
    invalidateCache();

    return { success: true, counts };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown import error';
    return { success: false, error: message, counts };
  }
}

// ============================================================
// Export
// ============================================================

/** Export all data as JSON (all IndexedDB tables + browser.storage) */
export async function exportAsJSON(): Promise<string> {
  // Fetch browser.storage values
  const storageResult = await browser.storage.local.get([
    SETTINGS_STORAGE_KEY,
    PRESETS_VERSION_KEY,
    AI_LAST_RUN_KEY,
  ]);

  const data: ExportData = {
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    // IndexedDB tables
    pages: await db.pages.toArray(),
    sessions: await db.sessions.toArray(),
    highlights: await db.highlights.toArray(),
    topics: await db.topics.toArray(),
    categories: await db.categories.toArray(),
    concepts: await db.concepts.toArray(),
    relationships: await db.relationships.toArray(),
    knowledgeBoxes: await db.knowledgeBoxes.toArray(),
    documentChunks: await db.documentChunks.toArray(),
    nebulas: await db.nebulas.toArray(),
    nebulaRuns: await db.nebulaRuns.toArray(),
    artifacts: await db.artifacts.toArray(),
    // Browser storage
    browserStorage: {
      settings: storageResult[SETTINGS_STORAGE_KEY] ?? undefined,
      exclusionsPresetsVersion: storageResult[PRESETS_VERSION_KEY] ?? undefined,
      aiLastRun: storageResult[AI_LAST_RUN_KEY] ?? undefined,
    },
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
