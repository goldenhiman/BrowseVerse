import { db } from '../index';
import type { NebulaRun, NebulaRunStatus } from '../../shared/types';
import { artifactsRepo } from './artifacts';

export const nebulaRunsRepo = {
  async create(run: Omit<NebulaRun, 'id'>): Promise<number> {
    return db.nebulaRuns.add(run as NebulaRun);
  },

  async update(id: number, data: Partial<NebulaRun>): Promise<void> {
    await db.nebulaRuns.update(id, data);
  },

  async setStatus(id: number, status: NebulaRunStatus, extra?: Partial<NebulaRun>): Promise<void> {
    await db.nebulaRuns.update(id, { status, ...extra });
  },

  async getById(id: number): Promise<NebulaRun | undefined> {
    return db.nebulaRuns.get(id);
  },

  async getByNebula(nebulaId: number): Promise<NebulaRun[]> {
    return db.nebulaRuns
      .where('nebula_id')
      .equals(nebulaId)
      .reverse()
      .sortBy('created_at');
  },

  async getByStatus(status: NebulaRunStatus): Promise<NebulaRun[]> {
    return db.nebulaRuns.where('status').equals(status).toArray();
  },

  async deleteByNebula(nebulaId: number): Promise<void> {
    const runs = await db.nebulaRuns.where('nebula_id').equals(nebulaId).toArray();
    for (const run of runs) {
      if (run.id) {
        await artifactsRepo.deleteByRun(run.id);
      }
    }
    await db.nebulaRuns.where('nebula_id').equals(nebulaId).delete();
  },

  async deleteRun(id: number): Promise<void> {
    await artifactsRepo.deleteByRun(id);
    await db.nebulaRuns.delete(id);
  },

  async countByNebula(nebulaId: number): Promise<number> {
    return db.nebulaRuns.where('nebula_id').equals(nebulaId).count();
  },

  /** Get the most recent runs across all nebulas, newest first */
  async getRecent(limit: number = 20): Promise<NebulaRun[]> {
    return db.nebulaRuns.orderBy('created_at').reverse().limit(limit).toArray();
  },
};
