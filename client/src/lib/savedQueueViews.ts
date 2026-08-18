import type { QueueFilterState } from "./queueFilters";

export type SavedQueueView = { id: string; name: string; filters: QueueFilterState };

export function createSavedQueueView(id: string, name: string, filters: QueueFilterState): SavedQueueView {
  return { id, name: name.trim(), filters };
}

export function removeSavedQueueView(views: SavedQueueView[], id: string) {
  return views.filter(view => view.id !== id);
}
