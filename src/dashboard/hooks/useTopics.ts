import { useLiveQuery } from 'dexie-react-hooks';
import { topicsRepo } from '../../db/repositories/topics';
import type { TopicLifecycle } from '../../shared/types';

export function useAllTopics() {
  return useLiveQuery(() => topicsRepo.getAll());
}

export function useTopicsByLifecycle(state: TopicLifecycle) {
  return useLiveQuery(() => topicsRepo.getByLifecycle(state), [state]);
}

export function useTopicById(id: number | undefined) {
  return useLiveQuery(
    () => (id ? topicsRepo.getById(id) : undefined),
    [id],
  );
}

export function useTopicCount() {
  return useLiveQuery(() => topicsRepo.count());
}
