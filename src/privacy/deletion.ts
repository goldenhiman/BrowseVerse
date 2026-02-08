// ============================================================
// Retroactive Deletion - Delete data by domain, date range, or all
// ============================================================

import { db } from '../db/index';
import { pagesRepo } from '../db/repositories/pages';

/** Delete all data for a specific domain */
export async function deleteByDomain(domain: string): Promise<number> {
  const pages = await db.pages.where('domain').equals(domain).toArray();
  const pageIds = pages.map((p) => p.id!).filter(Boolean);

  await db.transaction(
    'rw',
    [db.pages, db.highlights, db.sessions, db.relationships],
    async () => {
      // Delete pages
      await db.pages.where('domain').equals(domain).delete();

      // Delete associated highlights
      if (pageIds.length > 0) {
        await db.highlights.where('page_id').anyOf(pageIds).delete();
      }

      // Remove page IDs from sessions
      const sessions = await db.sessions.toArray();
      for (const session of sessions) {
        const filtered = session.page_ids.filter((id) => !pageIds.includes(id));
        if (filtered.length !== session.page_ids.length) {
          await db.sessions.update(session.id!, { page_ids: filtered });
        }
      }

      // Delete relationships involving these pages
      for (const pageId of pageIds) {
        await db.relationships
          .where('[from_entity_type+from_entity_id]')
          .equals(['page', pageId])
          .delete();
        await db.relationships
          .where('[to_entity_type+to_entity_id]')
          .equals(['page', pageId])
          .delete();
      }
    },
  );

  return pageIds.length;
}

/** Delete all data within a time range */
export async function deleteByDateRange(from: number, to: number): Promise<number> {
  const pages = await db.pages.where('last_seen_at').between(from, to).toArray();
  const pageIds = pages.map((p) => p.id!).filter(Boolean);

  await db.transaction(
    'rw',
    [db.pages, db.highlights, db.sessions, db.relationships],
    async () => {
      await db.pages.where('last_seen_at').between(from, to).delete();

      if (pageIds.length > 0) {
        await db.highlights.where('page_id').anyOf(pageIds).delete();
      }

      // Clean sessions that fall in range
      const sessions = await db.sessions
        .where('start_time')
        .between(from, to)
        .toArray();
      for (const session of sessions) {
        await db.sessions.delete(session.id!);
      }
    },
  );

  return pageIds.length;
}

/** Delete all data - full reset */
export async function deleteAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.pages, db.sessions, db.highlights, db.topics, db.categories, db.concepts, db.relationships, db.knowledgeBoxes],
    async () => {
      await db.pages.clear();
      await db.sessions.clear();
      await db.highlights.clear();
      await db.topics.clear();
      await db.categories.clear();
      await db.concepts.clear();
      await db.relationships.clear();
      await db.knowledgeBoxes.clear();
    },
  );
}

/** Delete a single page and associated data */
export async function deleteSinglePage(pageId: number): Promise<void> {
  await pagesRepo.deletePage(pageId);
}
