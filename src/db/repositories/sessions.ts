import { db } from '../index';
import type { Session } from '../../shared/types';

export const sessionsRepo = {
  async create(session: Omit<Session, 'id'>): Promise<number> {
    return db.sessions.add(session as Session);
  },

  async update(id: number, data: Partial<Session>): Promise<void> {
    await db.sessions.update(id, data);
  },

  async addPageToSession(sessionId: number, pageId: number): Promise<void> {
    const session = await db.sessions.get(sessionId);
    if (session) {
      const pageIds = [...new Set([...session.page_ids, pageId])];
      await db.sessions.update(sessionId, {
        page_ids: pageIds,
        end_time: Date.now(),
      });
    }
  },

  async getCurrent(): Promise<Session | undefined> {
    return db.sessions.orderBy('start_time').reverse().first();
  },

  async getRecent(limit = 20): Promise<Session[]> {
    return db.sessions
      .orderBy('start_time')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getByDateRange(from: number, to: number): Promise<Session[]> {
    return db.sessions
      .where('start_time')
      .between(from, to)
      .reverse()
      .sortBy('start_time');
  },

  async getById(id: number): Promise<Session | undefined> {
    return db.sessions.get(id);
  },

  async count(): Promise<number> {
    return db.sessions.count();
  },

  async deleteSession(id: number): Promise<void> {
    await db.sessions.delete(id);
  },
};
