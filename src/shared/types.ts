// ============================================================
// Core Entity Types - Local-First Browsing Knowledge OS
// ============================================================

/** Represents a single visited URL */
export interface Page {
  id?: number;
  url: string;
  domain: string;
  title: string;
  favicon: string;
  first_seen_at: number; // Unix timestamp ms
  last_seen_at: number;
  total_dwell_time: number; // milliseconds
  scroll_depth: number; // 0-100 percentage
  referrer: string;
  excluded: boolean;
  metadata: PageMetadata;
  /** AI-generated summary of the page content */
  ai_summary?: string;
  /** Timestamp when the AI summary was generated */
  ai_summary_generated_at?: number;
}

export interface PageMetadata {
  og_title?: string;
  og_description?: string;
  og_image?: string;
  keywords?: string[];
  description?: string;
  author?: string;
}

/** Represents a continuous browsing period with shared intent */
export interface Session {
  id?: number;
  start_time: number;
  end_time: number;
  page_ids: number[];
  inferred_intent: string;
  confidence_score: number; // 0-1
}

/** User-selected or detected text highlight */
export interface Highlight {
  id?: number;
  page_id: number;
  text: string;
  context_before: string;
  context_after: string;
  timestamp: number;
}

/** Mid-level abstraction inferred from multiple pages */
export interface Topic {
  id?: number;
  name: string;
  description: string;
  page_ids: number[];
  lifecycle_state: TopicLifecycle;
  confidence_score: number; // 0-1
  created_at: number;
  updated_at: number;
}

export type TopicLifecycle = 'emerging' | 'active' | 'dormant';

/** High-level identity bucket */
export interface Category {
  id?: number;
  name: string;
  description: string;
  system_generated: boolean;
  topic_ids: number[];
  trend: CategoryTrend;
  created_at: number;
  updated_at: number;
}

export type CategoryTrend = 'up' | 'flat' | 'down';

/** AI- or rule-derived abstraction */
export interface Concept {
  id?: number;
  label: string;
  explanation: string;
  derived_from_ids: number[];
  created_at: number;
}

/** Defines how entities connect */
export interface Relationship {
  id?: number;
  from_entity_id: number;
  from_entity_type: EntityType;
  to_entity_id: number;
  to_entity_type: EntityType;
  relationship_type: RelationshipType;
  strength: number; // 0-1
  explanation: string;
  created_at: number;
}

export type EntityType = 'page' | 'session' | 'topic' | 'category' | 'concept' | 'knowledge_box';
export type RelationshipType = 'temporal' | 'semantic' | 'behavioral' | 'user_defined';

/** User-defined, goal-oriented tracking space (displayed as "Constellation" in UI) */
export interface KnowledgeBox {
  id?: number;
  title: string;
  goal_statement: string;
  start_date: number;
  related_page_ids: number[];
  related_topic_ids: number[];
  notes: KnowledgeBoxNote[];
  status: KnowledgeBoxStatus;
  created_at: number;
  updated_at: number;
  /** AI-generated summary, if any */
  ai_summary?: string;
  /** Timestamp when the AI summary was generated */
  ai_summary_generated_at?: number;
  /** Snapshot of data hash when summary was generated, to detect staleness */
  ai_summary_data_hash?: string;
}

export type KnowledgeBoxStatus = 'active' | 'paused' | 'completed';

export interface KnowledgeBoxNote {
  id: string;
  text: string;
  timestamp: number;
}

// ============================================================
// Settings & Privacy
// ============================================================

export interface AppSettings {
  excluded_domains: string[];
  excluded_url_patterns: string[];
  /** Preset category IDs that are enabled (e.g. email, banking) */
  excluded_preset_ids?: string[];
  /** When true, extension stops collecting browsing data (pages, highlights, metadata) */
  extension_paused?: boolean;
  session_idle_threshold_ms: number; // default 30 min = 1800000
  dashboard_password?: string;
  accent_color: string;
  ai_enabled: boolean;
  /** Prioritized list of AI providers. First is primary; on rate limit or failure, falls back to next. */
  ai_providers?: AIProviderConfig[];
  /** Whether daily auto-backup is enabled */
  auto_backup_enabled?: boolean;
  /** Password for encrypting exports (stored for auto-backup use; empty = no encryption) */
  backup_encryption_password?: string;
  /** @deprecated Use ai_providers. Kept for migration. */
  ai_provider?: AIProviderType;
  /** @deprecated Use ai_providers. Kept for migration. */
  ai_api_key?: string;
  /** @deprecated Use ai_providers. Kept for migration. */
  ai_model?: string;
  /** @deprecated Use ai_providers. Kept for migration. */
  ai_custom_model?: string;
}

export type AIProviderType = 'openai' | 'anthropic' | 'groq';

/** Single AI provider configuration with model selection */
export interface AIProviderConfig {
  provider: AIProviderType;
  api_key: string;
  model?: string;
  custom_model?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  excluded_domains: [],
  excluded_url_patterns: [],
  session_idle_threshold_ms: 30 * 60 * 1000,
  accent_color: '#5c7cfa',
  ai_enabled: false,
};

/** Models available per provider */
export const AI_PROVIDER_MODELS: Record<AIProviderType, { label: string; models: { id: string; label: string }[] }> = {
  openai: {
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
  },
  anthropic: {
    label: 'Anthropic',
    models: [
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
      { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-latest', label: 'Claude 3 Opus' },
    ],
  },
  groq: {
    label: 'GroqCloud',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    ],
  },
};

// ============================================================
// Live Document Chunk types (for Constellation documents)
// ============================================================

/** A single section/chunk of a constellation's living document */
export interface DocumentChunk {
  id?: number;
  constellation_id: number;
  section_type: DocumentSectionType;
  /** Unique within a constellation, e.g. "overview", "source:github.com" */
  section_key: string;
  /** Controls render order (overview=0, key_findings=100, source_analysis=200+, topic_synthesis=300, progress_log=400, next_steps=500) */
  order_index: number;
  /** Section heading displayed in the document */
  title: string;
  /** Markdown content of this chunk */
  content: string;
  /** Page IDs that informed this chunk */
  source_page_ids: number[];
  /** Topic IDs that informed this chunk */
  source_topic_ids: number[];
  created_at: number;
  updated_at: number;
  /** Increments on each AI update (git-like versioning) */
  version: number;
}

export type DocumentSectionType =
  | 'overview'         // Title, evolved description, scope
  | 'key_findings'     // Major insights synthesized
  | 'source_analysis'  // Per-domain or per-group page analysis
  | 'topic_synthesis'  // Cross-topic connections
  | 'progress_log'     // Chronological append-only log
  | 'next_steps';      // Suggested actions

// ============================================================
// Nebula Types - Workflow-based artifact generation
// ============================================================

/** A saved workflow definition (pipeline of nodes that produce artifacts) */
export interface Nebula {
  id?: number;
  name: string;
  description: string;
  icon: string; // emoji identifier
  nodes: NebulaNodeDef[];
  edges: NebulaEdgeDef[];
  viewport?: { x: number; y: number; zoom: number };
  is_template: boolean;
  template_id?: string;
  created_at: number;
  updated_at: number;
}

export type NebulaNodeType = 'data-source' | 'user-input' | 'ai-process' | 'transform' | 'output';

export interface NebulaNodeDef {
  id: string;
  type: NebulaNodeType;
  position: { x: number; y: number };
  data: DataSourceConfig | UserInputConfig | AIProcessConfig | TransformConfig | OutputConfig;
}

export interface DataSourceConfig {
  label: string;
  source_type: 'pages' | 'topics' | 'highlights' | 'categories' | 'concepts';
  filters?: {
    date_range?: { start: number; end: number };
    topic_ids?: number[];
    category_ids?: number[];
    limit?: number;
  };
}

export interface UserInputConfig {
  label: string;
  input_type: 'text' | 'textarea' | 'select' | 'tags';
  placeholder?: string;
  default_value?: string;
  required: boolean;
  options?: string[]; // for select type
}

export interface AIProcessConfig {
  label: string;
  prompt_template: string; // uses {{input_0}}, {{input_1}} placeholders
  temperature?: number;
  max_tokens?: number;
}

export interface TransformConfig {
  label: string;
  transform_type: 'merge' | 'filter' | 'format' | 'extract';
  config: Record<string, unknown>;
}

export interface OutputConfig {
  label: string;
  format: 'markdown' | 'plain_text';
  artifact_title_template?: string;
}

export interface NebulaEdgeDef {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/** A single execution of a nebula workflow */
export interface NebulaRun {
  id?: number;
  nebula_id: number;
  status: NebulaRunStatus;
  inputs: Record<string, unknown>; // node_id -> user input value
  node_results?: Record<string, unknown>;
  error?: string;
  started_at?: number;
  completed_at?: number;
  created_at: number;
}

export type NebulaRunStatus = 'pending' | 'running' | 'completed' | 'failed';

/** The output artifact produced by a nebula run */
export interface Artifact {
  id?: number;
  run_id: number;
  nebula_id: number;
  title: string;
  content: string;
  format: ArtifactFormat;
  source_page_ids?: number[];
  source_topic_ids?: number[];
  created_at: number;
}

export type ArtifactFormat = 'markdown' | 'plain_text';

// ============================================================
// Graph visualization types
// ============================================================

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  size?: number;
  color?: string;
  /** Original entity ID for data lookups */
  entityId?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: RelationshipType;
  strength: number;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ============================================================
// AI Summary types for graph nodes
// ============================================================

export interface NodeSummaryCache {
  nodeId: string;
  summary: string;
  generatedAt: number;
  dataHash: string;
}
