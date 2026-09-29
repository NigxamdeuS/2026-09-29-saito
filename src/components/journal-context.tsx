"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { emptyJournal, type Journal, type Pole } from "@/lib/catalog";
import { predictFor } from "@/lib/model";
import { getQuestion } from "@/lib/questions";
import { loadJournal, saveJournal } from "@/lib/storage";

type JournalApi = {
  ready: boolean;
  journal: Journal;
  persistError: boolean;
  answer: (questionId: string, pole: Pole) => void;
  retest: (questionId: string, pole: Pole) => void;
  defer: (questionId: string) => void;
  replace: (next: Journal) => void;
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
        const previous = current.answers[questionId];
        const question = getQuestion(questionId);
        const prediction =
          previous?.prediction ??
          (question && !previous ? predictFor(current, question) ?? undefined : undefined);
        commit({
          ...current,
          answers: {
            ...current.answers,
            [questionId]: prediction
              ? { pole, updatedAt: new Date().toISOString(), prediction }
              : { pole, updatedAt: new Date().toISOString() },
          },
          deferred: current.deferred.filter((id) => id !== questionId),
        });
      },
      retest: (questionId, pole) => {
        const current = journalRef.current;
        const original = current.answers[questionId];
        if (!original || current.retests.some((item) => item.id === questionId)) return;
        commit({
          ...current,
          retests: [
            ...current.retests,
            { id: questionId, pole, original: original.pole, at: new Date().toISOString() },
          ],
        });
      },
      defer: (questionId) => {
        const current = journalRef.current;
        if (current.answers[questionId] || current.deferred.includes(questionId)) return;
        commit({ ...current, deferred: [...current.deferred, questionId] });
      },
      replace: (next) => commit(next),
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
