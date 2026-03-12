import { writable } from 'svelte/store';
import type { SessionSummary } from './types';

function createSessionStore() {
  const { subscribe, update } = writable<Record<string, SessionSummary>>({});

  function upsert(summary: SessionSummary) {
    update((sessions) => ({ ...sessions, [summary.id]: summary }));
  }

  function remove(id: string) {
    update((sessions) => {
      const next = { ...sessions };
      delete next[id];
      return next;
    });
  }

  return { subscribe, upsert, remove };
}

export const sessionStore = createSessionStore();
