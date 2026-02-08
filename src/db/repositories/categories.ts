import { db } from '../index';
import type { Category, CategoryTrend } from '../../shared/types';

export const categoriesRepo = {
  async create(category: Omit<Category, 'id'>): Promise<number> {
    return db.categories.add(category as Category);
  },

  async update(id: number, data: Partial<Category>): Promise<void> {
    await db.categories.update(id, { ...data, updated_at: Date.now() });
  },

  async upsertByName(name: string, data: Partial<Category>): Promise<number> {
    const existing = await db.categories.where('name').equals(name).first();
    if (existing?.id) {
      await db.categories.update(existing.id, { ...data, updated_at: Date.now() });
      return existing.id;
    }
    const now = Date.now();
    return db.categories.add({
      name,
      description: data.description || '',
      system_generated: data.system_generated ?? true,
      topic_ids: data.topic_ids || [],
      trend: data.trend || 'flat',
      created_at: now,
      updated_at: now,
    });
  },

  async addTopicToCategory(categoryId: number, topicId: number): Promise<void> {
    const category = await db.categories.get(categoryId);
    if (category) {
      const topicIds = [...new Set([...category.topic_ids, topicId])];
      await db.categories.update(categoryId, { topic_ids: topicIds, updated_at: Date.now() });
    }
  },

  async getAll(): Promise<Category[]> {
    return db.categories.orderBy('updated_at').reverse().toArray();
  },

  async getById(id: number): Promise<Category | undefined> {
    return db.categories.get(id);
  },

  async getByIds(ids: number[]): Promise<Category[]> {
    return db.categories.where('id').anyOf(ids).toArray();
  },

  async deleteCategory(id: number): Promise<void> {
    await db.categories.delete(id);
  },

  async count(): Promise<number> {
    return db.categories.count();
  },
};
