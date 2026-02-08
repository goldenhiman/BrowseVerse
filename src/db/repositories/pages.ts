import { db } from '../index';
import type { Page, PageMetadata } from '../../shared/types';

export const pagesRepo = {
  async upsert(url: string, data: Partial<Page>): Promise<number> {
    const existing = await db.pages.where('url').equals(url).first();
    if (existing?.id) {
      await db.pages.update(existing.id, {
        ...data,
        last_seen_at: Date.now(),
        total_dwell_time: (existing.total_dwell_time || 0) + (data.total_dwell_time || 0),
      });
      return existing.id;
    }
    const domain = new URL(url).hostname;
    const now = Date.now();
    return db.pages.add({
      url,
      domain,
      title: data.title || '',
      favicon: data.favicon || '',
      first_seen_at: now,
      last_seen_at: now,
      total_dwell_time: data.total_dwell_time || 0,
      scroll_depth: data.scroll_depth || 0,
      referrer: data.referrer || '',
      excluded: false,
      metadata: data.metadata || {},
    });
  },

  async updateMetadata(url: string, metadata: PageMetadata): Promise<void> {
    const page = await db.pages.where('url').equals(url).first();
    if (page?.id) {
      await db.pages.update(page.id, {
        metadata: { ...page.metadata, ...metadata },
      });
    }
  },

  async updateDwellTime(pageId: number, additionalMs: number): Promise<void> {
    const page = await db.pages.get(pageId);
    if (page?.id) {
      await db.pages.update(page.id, {
        total_dwell_time: page.total_dwell_time + additionalMs,
        last_seen_at: Date.now(),
      });
    }
  },

  async getByDomain(domain: string, limit = 50): Promise<Page[]> {
    return db.pages
      .where('domain')
      .equals(domain)
      .reverse()
      .sortBy('last_seen_at');
  },

  async getRecent(limit = 50, offset = 0): Promise<Page[]> {
    return db.pages
      .orderBy('last_seen_at')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  },

  async getByDateRange(from: number, to: number): Promise<Page[]> {
    return db.pages
      .where('last_seen_at')
      .between(from, to)
      .reverse()
      .sortBy('last_seen_at');
  },

  async getById(id: number): Promise<Page | undefined> {
    return db.pages.get(id);
  },

  async getByIds(ids: number[]): Promise<Page[]> {
    return db.pages.where('id').anyOf(ids).toArray();
  },

  async getTopDomains(limit = 10, since?: number): Promise<Array<{ domain: string; count: number }>> {
    let pages: Page[];
    if (since) {
      pages = await db.pages.where('last_seen_at').above(since).toArray();
    } else {
      pages = await db.pages.toArray();
    }
    const counts = new Map<string, number>();
    for (const p of pages) {
      if (!p.excluded) {
        counts.set(p.domain, (counts.get(p.domain) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  async countToday(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return db.pages
      .where('last_seen_at')
      .above(startOfDay.getTime())
      .count();
  },

  async totalDwellTimeToday(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const pages = await db.pages
      .where('last_seen_at')
      .above(startOfDay.getTime())
      .toArray();
    return pages.reduce((sum, p) => sum + p.total_dwell_time, 0);
  },

  async exclude(pageId: number): Promise<void> {
    await db.pages.update(pageId, { excluded: true });
  },

  async deletePage(pageId: number): Promise<void> {
    await db.transaction('rw', [db.pages, db.highlights, db.relationships], async () => {
      await db.pages.delete(pageId);
      await db.highlights.where('page_id').equals(pageId).delete();
      await db.relationships
        .where('[from_entity_type+from_entity_id]')
        .equals(['page', pageId])
        .delete();
      await db.relationships
        .where('[to_entity_type+to_entity_id]')
        .equals(['page', pageId])
        .delete();
    });
  },

  async deleteByDomain(domain: string): Promise<void> {
    const pages = await db.pages.where('domain').equals(domain).toArray();
    const ids = pages.map((p) => p.id!).filter(Boolean);
    await db.transaction('rw', [db.pages, db.highlights, db.relationships], async () => {
      await db.pages.where('domain').equals(domain).delete();
      if (ids.length > 0) {
        await db.highlights.where('page_id').anyOf(ids).delete();
      }
    });
  },

  async count(): Promise<number> {
    return db.pages.count();
  },

  async updateAISummary(pageId: number, summary: string): Promise<void> {
    await db.pages.update(pageId, {
      ai_summary: summary,
      ai_summary_generated_at: Date.now(),
    });
  },

  async getUnsummarized(limit = 10): Promise<Page[]> {
    return db.pages
      .filter((p) => !p.excluded && !p.ai_summary && !!p.title)
      .limit(limit)
      .toArray();
  },

  async search(query: string, limit = 20): Promise<Page[]> {
    const lower = query.toLowerCase();
    return db.pages
      .filter(
        (p) =>
          p.title.toLowerCase().includes(lower) ||
          p.url.toLowerCase().includes(lower) ||
          p.domain.toLowerCase().includes(lower),
      )
      .limit(limit)
      .toArray();
  },
};
