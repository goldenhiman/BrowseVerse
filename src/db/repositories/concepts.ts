import { db } from '../index';
import type { Concept } from '../../shared/types';

export const conceptsRepo = {
  async create(concept: Omit<Concept, 'id'>): Promise<number> {
    return db.concepts.add(concept as Concept);
  },

  async getAll(): Promise<Concept[]> {
    return db.concepts.orderBy('created_at').reverse().toArray();
  },

  async getById(id: number): Promise<Concept | undefined> {
    return db.concepts.get(id);
  },

  async getByIds(ids: number[]): Promise<Concept[]> {
    return db.concepts.where('id').anyOf(ids).toArray();
  },

  async deleteConcept(id: number): Promise<void> {
    await db.concepts.delete(id);
  },

  async count(): Promise<number> {
    return db.concepts.count();
  },
};
