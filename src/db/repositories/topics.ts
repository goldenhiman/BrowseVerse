import { db } from '../index';
import type { Topic, TopicLifecycle } from '../../shared/types';

export const topicsRepo = {
  async create(topic: Omit<Topic, 'id'>): Promise<number> {
    return db.topics.add(topic as Topic);
  },

  async update(id: number, data: Partial<Topic>): Promise<void> {
    await db.topics.update(id, { ...data, updated_at: Date.now() });
  },

  async upsertByName(name: string, data: Partial<Topic>): Promise<number> {
    const existing = await db.topics.where('name').equals(name).first();
    if (existing?.id) {
      await db.topics.update(existing.id, { ...data, updated_at: Date.now() });
      return existing.id;
    }
    const now = Date.now();
    return db.topics.add({
      name,
      description: data.description || '',
      page_ids: data.page_ids || [],
      lifecycle_state: data.lifecycle_state || 'emerging',
      confidence_score: data.confidence_score || 0,
      created_at: now,
      updated_at: now,
    });
  },

  async addPageToTopic(topicId: number, pageId: number): Promise<void> {
    const topic = await db.topics.get(topicId);
    if (topic) {
      const pageIds = [...new Set([...topic.page_ids, pageId])];
      await db.topics.update(topicId, { page_ids: pageIds, updated_at: Date.now() });
    }
  },

  async getAll(): Promise<Topic[]> {
    return db.topics.orderBy('updated_at').reverse().toArray();
  },

  async getByLifecycle(state: TopicLifecycle): Promise<Topic[]> {
    return db.topics.where('lifecycle_state').equals(state).toArray();
  },

  async getById(id: number): Promise<Topic | undefined> {
    return db.topics.get(id);
  },

  async getByIds(ids: number[]): Promise<Topic[]> {
    return db.topics.where('id').anyOf(ids).toArray();
  },

  async deleteTopic(id: number): Promise<void> {
    await db.topics.delete(id);
  },

  async count(): Promise<number> {
    return db.topics.count();
  },
};
