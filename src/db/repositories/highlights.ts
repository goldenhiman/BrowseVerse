import { db } from '../index';
import type { Highlight } from '../../shared/types';

export const highlightsRepo = {
  async create(highlight: Omit<Highlight, 'id'>): Promise<number> {
    return db.highlights.add(highlight as Highlight);
  },

  async getByPage(pageId: number): Promise<Highlight[]> {
    return db.highlights.where('page_id').equals(pageId).toArray();
  },

  async getRecent(limit = 50): Promise<Highlight[]> {
    return db.highlights
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async deleteByPage(pageId: number): Promise<void> {
    await db.highlights.where('page_id').equals(pageId).delete();
  },

  async deleteHighlight(id: number): Promise<void> {
    await db.highlights.delete(id);
  },

  async count(): Promise<number> {
    return db.highlights.count();
  },
};
