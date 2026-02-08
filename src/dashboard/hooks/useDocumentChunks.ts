import { useLiveQuery } from 'dexie-react-hooks';
import { documentChunksRepo } from '../../db/repositories/documentChunks';

/**
 * Reactively fetch all document chunks for a constellation, ordered by order_index.
 * Updates automatically when chunks are added, updated, or removed.
 */
export function useDocumentChunks(constellationId?: number) {
  return useLiveQuery(
    () =>
      constellationId
        ? documentChunksRepo.getByConstellation(constellationId)
        : [],
    [constellationId],
  );
}

/**
 * Get the count of document chunks for a constellation.
 */
export function useDocumentChunkCount(constellationId?: number) {
  return useLiveQuery(
    () =>
      constellationId
        ? documentChunksRepo.countByConstellation(constellationId)
        : 0,
    [constellationId],
  );
}
