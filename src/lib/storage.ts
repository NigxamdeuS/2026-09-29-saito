import {
  emptyJournal,
  isChoice,
  MAX_NOTE_LENGTH,
  type AnswerRecord,
  type Journal,
} from "@/lib/journal";
import { getQuestion } from "@/lib/questions";

export const STORAGE_KEY = "nigxam.v2";

export function sanitizeJournal(input: unknown): Journal {
  if (!input || typeof input !== "object") return emptyJournal();
  const raw = input as Partial<Journal>;
  if (raw.version !== 2 || !raw.answers || typeof raw.answers !== "object") {
    return emptyJournal();
  }

  const answers: Record<string, AnswerRecord> = {};
  for (const [id, value] of Object.entries(raw.answers)) {
    if (!getQuestion(id) || !value || typeof value !== "object") continue;
    const { choice, note, updatedAt } = value as Partial<AnswerRecord>;
    if (!isChoice(choice) || typeof updatedAt !== "string") continue;
    answers[id] = {
      choice,
      note: typeof note === "string" ? note.slice(0, MAX_NOTE_LENGTH) : "",
      updatedAt,
    };
  }

  return { version: 2, answers };
}

export function loadJournal(): Journal {
  if (typeof window === "undefined") return emptyJournal();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyJournal();
    return sanitizeJournal(JSON.parse(raw));
  } catch {
    return emptyJournal();
  }
}

export function saveJournal(journal: Journal): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(journal));
    return true;
  } catch {
    return false;
  }
}
