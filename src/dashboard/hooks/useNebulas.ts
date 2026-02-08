import { useLiveQuery } from 'dexie-react-hooks';
import { nebulasRepo } from '../../db/repositories/nebulas';

export function useAllNebulas() {
  return useLiveQuery(() => nebulasRepo.getAll());
}

export function useUserNebulas() {
  return useLiveQuery(() => nebulasRepo.getUserNebulas());
}

export function useNebulaTemplates() {
  return useLiveQuery(() => nebulasRepo.getTemplates());
}

export function useNebulaById(id: number | undefined) {
  return useLiveQuery(
    () => (id ? nebulasRepo.getById(id) : undefined),
    [id],
  );
}

export function useNebulaCount() {
  return useLiveQuery(() => nebulasRepo.countUserNebulas());
}
