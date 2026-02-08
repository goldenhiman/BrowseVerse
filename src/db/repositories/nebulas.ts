import { db } from '../index';
import type { Nebula } from '../../shared/types';
import { nebulaRunsRepo } from './nebulaRuns';

export const nebulasRepo = {
  async create(nebula: Omit<Nebula, 'id'>): Promise<number> {
    return db.nebulas.add(nebula as Nebula);
  },

  async update(id: number, data: Partial<Nebula>): Promise<void> {
    await db.nebulas.update(id, { ...data, updated_at: Date.now() });
  },

  async getById(id: number): Promise<Nebula | undefined> {
    return db.nebulas.get(id);
  },

  async getAll(): Promise<Nebula[]> {
    return db.nebulas.orderBy('updated_at').reverse().toArray();
  },

  async getUserNebulas(): Promise<Nebula[]> {
    // Boolean values aren't valid IndexedDB keys, so use filter() instead of where()
    const all = await db.nebulas.orderBy('updated_at').reverse().toArray();
    return all.filter((n) => !n.is_template);
  },

  async getTemplates(): Promise<Nebula[]> {
    const all = await db.nebulas.toArray();
    return all.filter((n) => n.is_template);
  },

  async duplicate(id: number, overrides?: Partial<Nebula>): Promise<number> {
    const source = await db.nebulas.get(id);
    if (!source) throw new Error(`Nebula ${id} not found`);
    const now = Date.now();
    const { id: _id, ...rest } = source;
    return db.nebulas.add({
      ...rest,
      is_template: false,
      template_id: String(id),
      created_at: now,
      updated_at: now,
      ...overrides,
    } as Nebula);
  },

  async deleteNebula(id: number): Promise<void> {
    // Cascade delete: remove associated runs and artifacts
    await nebulaRunsRepo.deleteByNebula(id);
    await db.nebulas.delete(id);
  },

  async count(): Promise<number> {
    return db.nebulas.count();
  },

  async countUserNebulas(): Promise<number> {
    const all = await db.nebulas.toArray();
    return all.filter((n) => !n.is_template).length;
  },
};
