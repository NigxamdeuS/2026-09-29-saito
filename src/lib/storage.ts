import {
  emptyJournal,
  isPole,
  type AnswerRecord,
  type Journal,
} from "@/lib/catalog";

export const STORAGE_KEY = "nijuu.v1";

export function sanitizeJournal(input: unknown): Journal {
  if (!input || typeof input !== "object") return emptyJournal();
  const raw = input as Partial<Journal>;
  if (raw.version !== 1 || !raw.answers || typeof raw.answers !== "object") {
    return emptyJournal();
  }

  const answers: Record<string, AnswerRecord> = {};
  for (const [id, value] of Object.entries(raw.answers)) {
    if (!value || typeof value !== "object") continue;
    const pole = (value as AnswerRecord).pole;
    const updatedAt = (value as AnswerRecord).updatedAt;
    if (!isPole(pole) || typeof updatedAt !== "string") continue;
    answers[id] = { pole, updatedAt };
  }

  const deferred = Array.isArray(raw.deferred)
    ? raw.deferred.filter((id): id is string => typeof id === "string")
    : [];

  return { version: 1, answers, deferred };
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
