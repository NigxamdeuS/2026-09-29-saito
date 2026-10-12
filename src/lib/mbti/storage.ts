import { ALL_ITEMS, isAnswerValue } from "@/lib/mbti/items";
import type { Answers } from "@/lib/mbti/scoring";

export const MBTI_STORAGE_KEY = "nigxam.mbti.v1";
export const MBTI_FEEDBACK_KEY = "nigxam.mbti.feedback.v1";

export type MbtiProgress = {
  answers: Answers;
  /** 「いまの状態」の質問を、答えたか飛ばしたかして終えたか。 */
  stateDone: boolean;
};

export function emptyMbti(): MbtiProgress {
  return { answers: {}, stateDone: false };
}

export function sanitizeMbti(input: unknown): MbtiProgress {
  if (!input || typeof input !== "object") return emptyMbti();
  const raw = input as Partial<MbtiProgress>;
  const answers: Answers = {};
  if (raw.answers && typeof raw.answers === "object") {
    for (const item of ALL_ITEMS) {
      const answer = (raw.answers as Record<string, unknown>)[item.id];
      if (!answer || typeof answer !== "object") continue;
      const { value, version } = answer as { value?: unknown; version?: unknown };
      if (isAnswerValue(value) && version === item.version) answers[item.id] = { value, version };
    }
  }
  return { answers, stateDone: raw.stateDone === true };
}

export function loadMbti(): MbtiProgress {
  if (typeof window === "undefined") return emptyMbti();
  try {
    return sanitizeMbti(JSON.parse(window.localStorage.getItem(MBTI_STORAGE_KEY) ?? "null"));
  } catch {
    return emptyMbti();
  }
}

export function saveMbti(progress: MbtiProgress): boolean {
  try {
    window.localStorage.setItem(MBTI_STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export type FeedbackValue = "fits" | "differs" | "depends";

export const FEEDBACK_OPTIONS: { value: FeedbackValue; label: string }[] = [
  { value: "fits", label: "当てはまる" },
  { value: "differs", label: "違う" },
  { value: "depends", label: "場面による" },
];

export type Feedback = Record<string, { value: FeedbackValue; at: string }>;

export function loadFeedback(): Feedback {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MBTI_FEEDBACK_KEY) ?? "{}");
    const feedback: Feedback = {};
    if (parsed && typeof parsed === "object") {
      for (const [key, entry] of Object.entries(parsed as Record<string, unknown>)) {
        const { value, at } = (entry ?? {}) as { value?: unknown; at?: unknown };
        if (FEEDBACK_OPTIONS.some((option) => option.value === value) && typeof at === "string") {
          feedback[key] = { value: value as FeedbackValue, at };
        }
      }
    }
    return feedback;
  } catch {
    return {};
  }
}

export function saveFeedback(feedback: Feedback): boolean {
  try {
    window.localStorage.setItem(MBTI_FEEDBACK_KEY, JSON.stringify(feedback));
    return true;
  } catch {
    return false;
  }
}
