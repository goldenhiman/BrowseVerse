import { useLiveQuery } from 'dexie-react-hooks';
import { artifactsRepo } from '../../db/repositories/artifacts';

export function useArtifactsByNebula(nebulaId: number | undefined) {
  return useLiveQuery(
    () => (nebulaId ? artifactsRepo.getByNebula(nebulaId) : []),
    [nebulaId],
  );
}

export function useArtifactByRun(runId: number | undefined) {
  return useLiveQuery(
    () => (runId ? artifactsRepo.getByRun(runId) : undefined),
    [runId],
  );
}
