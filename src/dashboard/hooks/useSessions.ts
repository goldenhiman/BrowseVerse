import { useLiveQuery } from 'dexie-react-hooks';
import { sessionsRepo } from '../../db/repositories/sessions';

export function useRecentSessions(limit = 20) {
  return useLiveQuery(() => sessionsRepo.getRecent(limit), [limit]);
}

export function useCurrentSession() {
  return useLiveQuery(() => sessionsRepo.getCurrent());
}

export function useSessionsByDateRange(from: number, to: number) {
  return useLiveQuery(() => sessionsRepo.getByDateRange(from, to), [from, to]);
}

export function useSessionCount() {
  return useLiveQuery(() => sessionsRepo.count());
}

export function useSessionById(id: number | undefined) {
  return useLiveQuery(
    () => (id ? sessionsRepo.getById(id) : undefined),
    [id],
  );
}
