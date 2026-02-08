import { useLiveQuery } from 'dexie-react-hooks';
import { categoriesRepo } from '../../db/repositories/categories';

export function useAllCategories() {
  return useLiveQuery(() => categoriesRepo.getAll());
}

export function useCategoryById(id: number | undefined) {
  return useLiveQuery(
    () => (id ? categoriesRepo.getById(id) : undefined),
    [id],
  );
}

export function useCategoryCount() {
  return useLiveQuery(() => categoriesRepo.count());
}
