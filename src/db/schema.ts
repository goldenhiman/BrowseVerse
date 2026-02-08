// ============================================================
// Dexie Schema Definitions (versioned)
// ============================================================

/**
 * Each key is a table name, value is comma-separated index definitions.
 * ++ = auto-increment primary key
 * & = unique index
 * * = multi-value index (array)
 * [a+b] = compound index
 */
export const SCHEMA_V1: Record<string, string> = {
  pages: '++id, url, domain, first_seen_at, last_seen_at, excluded, [domain+last_seen_at]',
  sessions: '++id, start_time, end_time, [start_time+end_time]',
  highlights: '++id, page_id, timestamp',
  topics: '++id, name, lifecycle_state, updated_at',
  categories: '++id, name, system_generated, updated_at',
  concepts: '++id, label, created_at',
  relationships: '++id, from_entity_id, from_entity_type, to_entity_id, to_entity_type, relationship_type, [from_entity_type+from_entity_id], [to_entity_type+to_entity_id]',
  knowledgeBoxes: '++id, title, status, start_date, updated_at',
};

/** V2 adds documentChunks table for constellation living documents */
export const SCHEMA_V2: Record<string, string> = {
  ...SCHEMA_V1,
  documentChunks: '++id, constellation_id, section_key, [constellation_id+section_key], [constellation_id+order_index]',
};

/** V3 adds nebulas, nebulaRuns, artifacts tables for workflow-based artifact generation */
export const SCHEMA_V3: Record<string, string> = {
  ...SCHEMA_V2,
  nebulas: '++id, name, created_at, updated_at',
  nebulaRuns: '++id, nebula_id, status, created_at',
  artifacts: '++id, run_id, nebula_id, created_at',
};
