import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/index';
import { pagesRepo } from '../../db/repositories/pages';

export function useRecentPages(limit = 50, offset = 0) {
  return useLiveQuery(() => pagesRepo.getRecent(limit, offset), [limit, offset]);
}

export function usePagesByDateRange(from: number, to: number) {
  return useLiveQuery(() => pagesRepo.getByDateRange(from, to), [from, to]);
}

export function usePagesByDomain(domain: string) {
  return useLiveQuery(() => pagesRepo.getByDomain(domain), [domain]);
}

export function usePageCount() {
  return useLiveQuery(() => pagesRepo.count());
}

export function usePagesToday() {
  return useLiveQuery(() => pagesRepo.countToday());
}

export function useTopDomains(limit = 10, since?: number) {
  return useLiveQuery(() => pagesRepo.getTopDomains(limit, since), [limit, since]);
}

export function useTotalDwellTimeToday() {
  return useLiveQuery(() => pagesRepo.totalDwellTimeToday());
}

export function usePageById(id: number | undefined) {
  return useLiveQuery(() => (id ? pagesRepo.getById(id) : undefined), [id]);
}

export function usePageSearch(query: string) {
  return useLiveQuery(
    () => (query.length >= 2 ? pagesRepo.search(query) : Promise.resolve([])),
    [query],
  );
}
