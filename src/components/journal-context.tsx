"use client";

import { createContext, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { emptyJournal, type Journal, type Pole } from "@/lib/catalog";
import { loadJournal, saveJournal } from "@/lib/storage";

type JournalApi = {
  ready: boolean;
  journal: Journal;
  persistError: boolean;
  answer: (questionId: string, pole: Pole) => void;
  defer: (questionId: string) => void;
  reset: () => void;
};

const JournalContext = createContext<JournalApi | null>(null);
const serverJournal = emptyJournal();
const listeners = new Set<() => void>();

let memory = serverJournal;
let hydrated = false;

function emit() {
  for (const listener of listeners) listener();
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  memory = loadJournal();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  hydrate();
  return memory;
}

function getServerSnapshot() {
  return serverJournal;
}

function subscribeIdle() {
  return () => {};
}

function pendingOnClient() {
  return false;
}

function pendingOnServer() {
  return true;
}

function writeJournal(next: Journal) {
  memory = next;
  const saved = saveJournal(next);
  emit();
  return saved;
}

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const journal = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pending = useSyncExternalStore(subscribeIdle, pendingOnClient, pendingOnServer);
  const [persistError, setPersistError] = useState(false);

  const api = useMemo<JournalApi>(() => {
    const commit = (next: Journal) => {
      setPersistError(!writeJournal(next));
    };

    return {
      ready: !pending,
      journal,
      persistError,
      answer: (questionId, pole) => {
        commit({
          ...memory,
          answers: {
            ...memory.answers,
            [questionId]: { pole, updatedAt: new Date().toISOString() },
          },
          deferred: memory.deferred.filter((id) => id !== questionId),
        });
      },
      defer: (questionId) => {
        if (memory.answers[questionId] || memory.deferred.includes(questionId)) return;
        commit({ ...memory, deferred: [...memory.deferred, questionId] });
      },
      reset: () => commit(emptyJournal()),
    };
  }, [journal, pending, persistError]);

  return <JournalContext.Provider value={api}>{children}</JournalContext.Provider>;
}

export function useJournal() {
  const api = useContext(JournalContext);
  if (!api) {
    throw new Error("JournalProvider の外で記録を使っています");
  }
  return api;
}
