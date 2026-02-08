import { useLiveQuery } from 'dexie-react-hooks';
import { relationshipsRepo } from '../../db/repositories/relationships';
import type { EntityType } from '../../shared/types';

export function useAllRelationships() {
  return useLiveQuery(() => relationshipsRepo.getAll());
}

export function useRelationshipsForEntity(type: EntityType, id: number | undefined) {
  return useLiveQuery(
    () => (id ? relationshipsRepo.getForEntity(type, id) : Promise.resolve([])),
    [type, id],
  );
}

export function useRelationshipCount() {
  return useLiveQuery(() => relationshipsRepo.count());
}
