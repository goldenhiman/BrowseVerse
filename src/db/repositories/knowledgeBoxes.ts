import { db } from '../index';
import type { KnowledgeBox, KnowledgeBoxStatus, KnowledgeBoxNote } from '../../shared/types';
import { documentChunksRepo } from './documentChunks';

export const knowledgeBoxesRepo = {
  async create(box: Omit<KnowledgeBox, 'id'>): Promise<number> {
    return db.knowledgeBoxes.add(box as KnowledgeBox);
  },

  async update(id: number, data: Partial<KnowledgeBox>): Promise<void> {
    await db.knowledgeBoxes.update(id, { ...data, updated_at: Date.now() });
  },

  async addPage(boxId: number, pageId: number): Promise<void> {
    const box = await db.knowledgeBoxes.get(boxId);
    if (box) {
      const pageIds = [...new Set([...box.related_page_ids, pageId])];
      await db.knowledgeBoxes.update(boxId, { related_page_ids: pageIds, updated_at: Date.now() });
    }
  },

  async addTopic(boxId: number, topicId: number): Promise<void> {
    const box = await db.knowledgeBoxes.get(boxId);
    if (box) {
      const topicIds = [...new Set([...box.related_topic_ids, topicId])];
      await db.knowledgeBoxes.update(boxId, { related_topic_ids: topicIds, updated_at: Date.now() });
    }
  },

  async addNote(boxId: number, note: KnowledgeBoxNote): Promise<void> {
    const box = await db.knowledgeBoxes.get(boxId);
    if (box) {
      await db.knowledgeBoxes.update(boxId, {
        notes: [...box.notes, note],
        updated_at: Date.now(),
      });
    }
  },

  async removeNote(boxId: number, noteId: string): Promise<void> {
    const box = await db.knowledgeBoxes.get(boxId);
    if (box) {
      await db.knowledgeBoxes.update(boxId, {
        notes: box.notes.filter((n) => n.id !== noteId),
        updated_at: Date.now(),
      });
    }
  },

  async setStatus(boxId: number, status: KnowledgeBoxStatus): Promise<void> {
    await db.knowledgeBoxes.update(boxId, { status, updated_at: Date.now() });
  },

  async getAll(): Promise<KnowledgeBox[]> {
    return db.knowledgeBoxes.orderBy('updated_at').reverse().toArray();
  },

  async getByStatus(status: KnowledgeBoxStatus): Promise<KnowledgeBox[]> {
    return db.knowledgeBoxes.where('status').equals(status).toArray();
  },

  async getById(id: number): Promise<KnowledgeBox | undefined> {
    return db.knowledgeBoxes.get(id);
  },

  async deleteBox(id: number): Promise<void> {
    // Cascade delete: remove associated document chunks
    await documentChunksRepo.deleteByConstellation(id);
    await db.knowledgeBoxes.delete(id);
  },

  async count(): Promise<number> {
    return db.knowledgeBoxes.count();
  },
};
