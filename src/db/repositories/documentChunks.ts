// ============================================================
// Document Chunks Repository
// CRUD operations for constellation living document chunks
// ============================================================

import { db } from '../index';
import type { DocumentChunk, DocumentSectionType } from '../../shared/types';

export const documentChunksRepo = {
  /**
   * Get all chunks for a constellation, ordered by order_index.
   */
  async getByConstellation(constellationId: number): Promise<DocumentChunk[]> {
    return db.documentChunks
      .where('constellation_id')
      .equals(constellationId)
      .sortBy('order_index');
  },

  /**
   * Get a single chunk by its unique section_key within a constellation.
   */
  async getByKey(constellationId: number, sectionKey: string): Promise<DocumentChunk | undefined> {
    return db.documentChunks
      .where('[constellation_id+section_key]')
      .equals([constellationId, sectionKey])
      .first();
  },

  /**
   * Create or update a chunk. If a chunk with the same section_key exists,
   * update it and increment its version. Otherwise create a new one.
   */
  async upsertChunk(
    constellationId: number,
    sectionKey: string,
    data: {
      section_type: DocumentSectionType;
      order_index: number;
      title: string;
      content: string;
      source_page_ids?: number[];
      source_topic_ids?: number[];
    },
  ): Promise<number> {
    const existing = await this.getByKey(constellationId, sectionKey);
    const now = Date.now();

    if (existing?.id) {
      await db.documentChunks.update(existing.id, {
        title: data.title,
        content: data.content,
        order_index: data.order_index,
        source_page_ids: data.source_page_ids ?? existing.source_page_ids,
        source_topic_ids: data.source_topic_ids ?? existing.source_topic_ids,
        updated_at: now,
        version: existing.version + 1,
      });
      return existing.id;
    }

    return db.documentChunks.add({
      constellation_id: constellationId,
      section_type: data.section_type,
      section_key: sectionKey,
      order_index: data.order_index,
      title: data.title,
      content: data.content,
      source_page_ids: data.source_page_ids ?? [],
      source_topic_ids: data.source_topic_ids ?? [],
      created_at: now,
      updated_at: now,
      version: 1,
    });
  },

  /**
   * Append content to an existing chunk (used for progress_log).
   * Creates the chunk if it doesn't exist yet.
   */
  async appendToChunk(
    constellationId: number,
    sectionKey: string,
    appendContent: string,
    meta?: {
      section_type?: DocumentSectionType;
      order_index?: number;
      title?: string;
      source_page_ids?: number[];
      source_topic_ids?: number[];
    },
  ): Promise<void> {
    const existing = await this.getByKey(constellationId, sectionKey);
    const now = Date.now();

    if (existing?.id) {
      const newContent = existing.content
        ? `${existing.content}\n\n${appendContent}`
        : appendContent;
      const newPageIds = meta?.source_page_ids
        ? [...new Set([...existing.source_page_ids, ...meta.source_page_ids])]
        : existing.source_page_ids;
      const newTopicIds = meta?.source_topic_ids
        ? [...new Set([...existing.source_topic_ids, ...meta.source_topic_ids])]
        : existing.source_topic_ids;

      await db.documentChunks.update(existing.id, {
        content: newContent,
        source_page_ids: newPageIds,
        source_topic_ids: newTopicIds,
        updated_at: now,
        version: existing.version + 1,
      });
    } else {
      await db.documentChunks.add({
        constellation_id: constellationId,
        section_type: meta?.section_type ?? 'progress_log',
        section_key: sectionKey,
        order_index: meta?.order_index ?? 400,
        title: meta?.title ?? 'Progress Log',
        content: appendContent,
        source_page_ids: meta?.source_page_ids ?? [],
        source_topic_ids: meta?.source_topic_ids ?? [],
        created_at: now,
        updated_at: now,
        version: 1,
      });
    }
  },

  /**
   * Delete all chunks for a constellation (cascade delete).
   */
  async deleteByConstellation(constellationId: number): Promise<void> {
    await db.documentChunks
      .where('constellation_id')
      .equals(constellationId)
      .delete();
  },

  /**
   * Get the union of all source_page_ids across all chunks for a constellation.
   * Used to determine which pages are already "covered" by the document.
   */
  async getCoveredPageIds(constellationId: number): Promise<Set<number>> {
    const chunks = await this.getByConstellation(constellationId);
    const ids = new Set<number>();
    for (const chunk of chunks) {
      for (const pid of chunk.source_page_ids) {
        ids.add(pid);
      }
    }
    return ids;
  },

  /**
   * Get the union of all source_topic_ids across all chunks.
   */
  async getCoveredTopicIds(constellationId: number): Promise<Set<number>> {
    const chunks = await this.getByConstellation(constellationId);
    const ids = new Set<number>();
    for (const chunk of chunks) {
      for (const tid of chunk.source_topic_ids) {
        ids.add(tid);
      }
    }
    return ids;
  },

  /**
   * Count chunks for a constellation.
   */
  async countByConstellation(constellationId: number): Promise<number> {
    return db.documentChunks
      .where('constellation_id')
      .equals(constellationId)
      .count();
  },
};
