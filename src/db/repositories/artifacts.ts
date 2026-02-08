import { db } from '../index';
import type { Artifact } from '../../shared/types';

export const artifactsRepo = {
  async create(artifact: Omit<Artifact, 'id'>): Promise<number> {
    return db.artifacts.add(artifact as Artifact);
  },

  async getById(id: number): Promise<Artifact | undefined> {
    return db.artifacts.get(id);
  },

  async getByRun(runId: number): Promise<Artifact | undefined> {
    return db.artifacts.where('run_id').equals(runId).first();
  },

  async getByNebula(nebulaId: number): Promise<Artifact[]> {
    return db.artifacts
      .where('nebula_id')
      .equals(nebulaId)
      .reverse()
      .sortBy('created_at');
  },

  async deleteByRun(runId: number): Promise<void> {
    await db.artifacts.where('run_id').equals(runId).delete();
  },

  async deleteByNebula(nebulaId: number): Promise<void> {
    await db.artifacts.where('nebula_id').equals(nebulaId).delete();
  },

  async count(): Promise<number> {
    return db.artifacts.count();
  },
};
