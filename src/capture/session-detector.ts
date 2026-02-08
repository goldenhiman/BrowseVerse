// ============================================================
// Session Detector - Idle-based session splitting
// ============================================================

import { sessionsRepo } from '../db/repositories/sessions';
import { DEFAULT_SESSION_IDLE_MS } from '../shared/constants';

let currentSessionId: number | null = null;
let lastActivityTime: number = Date.now();
let idleThresholdMs: number = DEFAULT_SESSION_IDLE_MS;

async function startNewSession(): Promise<number> {
  // End current session if it exists
  if (currentSessionId) {
    await sessionsRepo.update(currentSessionId, { end_time: Date.now() });
  }

  const now = Date.now();
  const id = await sessionsRepo.create({
    start_time: now,
    end_time: now,
    page_ids: [],
    inferred_intent: '',
    confidence_score: 0,
  });

  currentSessionId = id;
  lastActivityTime = now;
  console.log('[BKO] New session started:', id);
  return id;
}

async function ensureSession(): Promise<number> {
  const now = Date.now();

  // If no session exists or idle threshold exceeded, start new session
  if (!currentSessionId || now - lastActivityTime > idleThresholdMs) {
    return startNewSession();
  }

  lastActivityTime = now;
  return currentSessionId;
}

export async function recordPageInSession(pageId: number): Promise<void> {
  const sessionId = await ensureSession();
  await sessionsRepo.addPageToSession(sessionId, pageId);
}

export function setupSessionDetector(): void {
  // Use Chrome idle API to detect idle state
  browser.idle.setDetectionInterval(60); // Check every 60 seconds

  browser.idle.onStateChanged.addListener(async (newState) => {
    if (newState === 'active') {
      // User came back from idle
      const now = Date.now();
      if (now - lastActivityTime > idleThresholdMs) {
        await startNewSession();
      }
      lastActivityTime = now;
    } else if (newState === 'idle' || newState === 'locked') {
      // Mark end of current session
      if (currentSessionId) {
        await sessionsRepo.update(currentSessionId, { end_time: Date.now() });
      }
    }
  });

  // Start initial session
  startNewSession();

  console.log('[BKO] Session detector initialized');
}

export function getCurrentSessionId(): number | null {
  return currentSessionId;
}

export function setIdleThreshold(ms: number): void {
  idleThresholdMs = ms;
}
