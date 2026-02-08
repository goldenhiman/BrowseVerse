import { useLiveQuery } from 'dexie-react-hooks';
import { knowledgeBoxesRepo } from '../../db/repositories/knowledgeBoxes';
import type { KnowledgeBoxStatus } from '../../shared/types';

export function useAllKnowledgeBoxes() {
  return useLiveQuery(() => knowledgeBoxesRepo.getAll());
}

export function useKnowledgeBoxesByStatus(status: KnowledgeBoxStatus) {
  return useLiveQuery(() => knowledgeBoxesRepo.getByStatus(status), [status]);
}

export function useKnowledgeBoxById(id: number | undefined) {
  return useLiveQuery(
    () => (id ? knowledgeBoxesRepo.getById(id) : undefined),
    [id],
  );
}

export function useKnowledgeBoxCount() {
  return useLiveQuery(() => knowledgeBoxesRepo.count());
}
