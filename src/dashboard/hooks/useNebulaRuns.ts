import { useLiveQuery } from 'dexie-react-hooks';
import { nebulaRunsRepo } from '../../db/repositories/nebulaRuns';
import { nebulasRepo } from '../../db/repositories/nebulas';
import { artifactsRepo } from '../../db/repositories/artifacts';
import type { NebulaRun, Nebula, Artifact } from '../../shared/types';

export function useRunsByNebula(nebulaId: number | undefined) {
  return useLiveQuery(
    () => (nebulaId ? nebulaRunsRepo.getByNebula(nebulaId) : []),
    [nebulaId],
  );
}

export function useRunById(id: number | undefined) {
  return useLiveQuery(
    () => (id ? nebulaRunsRepo.getById(id) : undefined),
    [id],
  );
}

export function useRunCountByNebula(nebulaId: number | undefined) {
  return useLiveQuery(
    () => (nebulaId ? nebulaRunsRepo.countByNebula(nebulaId) : 0),
    [nebulaId],
  );
}

export interface RecentRunRow {
  run: NebulaRun;
  nebula: Nebula | undefined;
  artifact: Artifact | undefined;
}

/** Get recent runs across all nebulas, joined with nebula name and artifact info */
export function useRecentRuns(limit: number = 20) {
  return useLiveQuery(async (): Promise<RecentRunRow[]> => {
    const runs = await nebulaRunsRepo.getRecent(limit);
    const rows: RecentRunRow[] = [];
    for (const run of runs) {
      const nebula = await nebulasRepo.getById(run.nebula_id);
      const artifact = run.id ? await artifactsRepo.getByRun(run.id) : undefined;
      rows.push({ run, nebula, artifact });
    }
    return rows;
  });
}
