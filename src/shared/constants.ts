// ============================================================
// Application Constants
// ============================================================

/** Default session idle threshold in milliseconds (30 minutes) */
export const DEFAULT_SESSION_IDLE_MS = 30 * 60 * 1000;

/** Minimum dwell time (ms) before a page visit is recorded */
export const MIN_DWELL_TIME_MS = 2000;

/** How often (ms) the knowledge engine re-processes data */
export const ENGINE_PROCESSING_INTERVAL_MS = 5 * 60 * 1000;

/** Minimum pages before a topic transitions from emerging to active */
export const TOPIC_ACTIVE_THRESHOLD = 5;

/** Days of inactivity before a topic becomes dormant */
export const TOPIC_DORMANT_DAYS = 14;

/** Number of context characters captured around highlights */
export const HIGHLIGHT_CONTEXT_CHARS = 150;

/** Internal Chrome extension pages to always exclude */
export const SYSTEM_EXCLUDED_PATTERNS = [
  'chrome://',
  'chrome-extension://',
  'about:',
  'edge://',
  'brave://',
  'moz-extension://',
];

/** Database name */
export const DB_NAME = 'browsing-knowledge-os';

/** Database version */
export const DB_VERSION = 2;

/** Storage key for app settings */
export const SETTINGS_STORAGE_KEY = 'bko_settings';

/** Settings version for preset migration */
export const EXCLUSIONS_PRESETS_VERSION = 1;

/** Dashboard page URL path */
export const DASHBOARD_PATH = '/dashboard.html';

/** How often (ms) the AI processor runs (15 minutes) */
export const AI_PROCESSING_INTERVAL_MS = 15 * 60 * 1000;

/** Max pages to summarize per AI processing cycle */
export const AI_PAGE_SUMMARY_BATCH_SIZE = 10;

/** Storage key for AI processor last-run timestamp */
export const AI_LAST_RUN_KEY = 'bko_ai_last_run';

/** Storage key for last auto-backup timestamp */
export const LAST_AUTO_BACKUP_KEY = 'bko_last_auto_backup';

/** Chrome alarm name for daily backup */
export const AUTO_BACKUP_ALARM_NAME = 'bko_auto_backup';
