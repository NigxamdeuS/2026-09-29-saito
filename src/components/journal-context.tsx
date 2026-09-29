"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [journal, setJournal] = useState<Journal>(emptyJournal);
  const [ready, setReady] = useState(false);
  const [persistError, setPersistError] = useState(false);
  const journalRef = useRef(journal);

  useEffect(() => {
    const loaded = loadJournal();
    journalRef.current = loaded;
    const timer = window.setTimeout(() => {
      setJournal(loaded);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const api = useMemo<JournalApi>(() => {
    const commit = (next: Journal) => {
      journalRef.current = next;
      setJournal(next);
      setPersistError(!saveJournal(next));
    };

    return {
      ready,
      journal,
      persistError,
      answer: (questionId, pole) => {
        const current = journalRef.current;
        commit({
          ...current,
          answers: {
            ...current.answers,
            [questionId]: { pole, updatedAt: new Date().toISOString() },
          },
          deferred: current.deferred.filter((id) => id !== questionId),
        });
      },
      defer: (questionId) => {
        const current = journalRef.current;
        if (current.answers[questionId] || current.deferred.includes(questionId)) return;
        commit({ ...current, deferred: [...current.deferred, questionId] });
      },
      reset: () => commit(emptyJournal()),
    };
  }, [journal, persistError, ready]);

  return <JournalContext.Provider value={api}>{children}</JournalContext.Provider>;
}

export function useJournal() {
  const api = useContext(JournalContext);
  if (!api) {
    throw new Error("JournalProvider の外で記録を使っています");
  }
  return api;
}
