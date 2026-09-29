import {
  emptyJournal,
  isPole,
  type AnswerRecord,
  type Journal,
  type Prediction,
  type Retest,
} from "@/lib/catalog";

export const STORAGE_KEY = "nijuu.v1";

function sanitizePrediction(input: unknown): Prediction | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Partial<Prediction>;
  if (!isPole(raw.overall) || !isPole(raw.context)) return undefined;
  return { overall: raw.overall, context: raw.context };
}

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
    const prediction = sanitizePrediction((value as AnswerRecord).prediction);
    answers[id] = prediction ? { pole, updatedAt, prediction } : { pole, updatedAt };
  }

  const deferred = Array.isArray(raw.deferred)
    ? raw.deferred.filter((id): id is string => typeof id === "string" && !answers[id])
    : [];

  const retests: Retest[] = [];
  if (Array.isArray(raw.retests)) {
    for (const value of raw.retests) {
      if (!value || typeof value !== "object") continue;
      const item = value as Partial<Retest>;
      if (typeof item.id !== "string" || !answers[item.id]) continue;
      if (!isPole(item.pole) || !isPole(item.original) || typeof item.at !== "string") continue;
      if (retests.some((existing) => existing.id === item.id)) continue;
      retests.push({ id: item.id, pole: item.pole, original: item.original, at: item.at });
    }
  }

  return { version: 1, answers, deferred, retests };
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
