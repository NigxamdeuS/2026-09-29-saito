import {
  ALL_ITEMS,
  BASE_ITEMS,
  FOLLOWUP,
  FOLLOWUP_GAP,
  isAnswerValue,
  isFollowupChoice,
  isMode,
  type FollowupChoice,
  type Mode,
} from "@/lib/mbti/items";
import type { Answers } from "@/lib/mbti/scoring";

export const MBTI_STORAGE_KEY = "nigxam.mbti.v1";
export const MBTI_FEEDBACK_KEY = "nigxam.mbti.feedback.v1";

export type Followups = Record<string, { value: FollowupChoice | "skip"; version: number }>;

export type MbtiProgress = {
  /** 選んだ段階。まだ選んでいなければ null。 */
  mode: Mode | null;
  answers: Answers;
  /** 「状況による」の補足。基本得点とは別に保存する。 */
  followups: Followups;
  /** 質問ごとの回答にかかった時間（ミリ秒）。所要時間の実測に使う。 */
  timings: Record<string, number>;
  /** 同じ質問を何回変えたか。 */
  changes: Record<string, number>;
  /** 直近で補足質問を出してから答えた基本質問の数。連続を防ぐ。 */
  followupGap: number;
  /** 「いまの状態」の質問を、答えたか飛ばしたかして終えたか。 */
  stateDone: boolean;
};

export function emptyMbti(): MbtiProgress {
  return {
    mode: null,
    answers: {},
    followups: {},
    timings: {},
    changes: {},
    followupGap: FOLLOWUP_GAP,
    stateDone: false,
  };
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
  const followups: Followups = {};
  if (raw.followups && typeof raw.followups === "object") {
    for (const [id, entry] of Object.entries(raw.followups as Record<string, unknown>)) {
      if (!answers[id] || answers[id].value !== "depends") continue;
      if (!entry || typeof entry !== "object") continue;
      const { value, version } = entry as { value?: unknown; version?: unknown };
      if (isFollowupChoice(value) && version === FOLLOWUP.version) followups[id] = { value, version };
    }
  }
  const timings: Record<string, number> = {};
  if (raw.timings && typeof raw.timings === "object") {
    for (const [id, ms] of Object.entries(raw.timings as Record<string, unknown>)) {
      if (typeof ms === "number" && Number.isFinite(ms) && ms >= 0 && ms < 30 * 60 * 1000) timings[id] = ms;
    }
  }
  const changes: Record<string, number> = {};
  if (raw.changes && typeof raw.changes === "object") {
    for (const [id, count] of Object.entries(raw.changes as Record<string, unknown>)) {
      if (typeof count === "number" && Number.isInteger(count) && count >= 0 && count < 1000) changes[id] = count;
    }
  }
  const followupGap =
    typeof raw.followupGap === "number" && Number.isInteger(raw.followupGap) && raw.followupGap >= 0
      ? raw.followupGap
      : FOLLOWUP_GAP;
  // mode を持たない保存データの回答は、すべて「詳細」の質問に含まれる。
  const legacy = BASE_ITEMS.some((item) => answers[item.id]) ? "detailed" : null;
  return {
    mode: isMode(raw.mode) ? raw.mode : legacy,
    answers,
    followups,
    timings,
    changes,
    followupGap,
    stateDone: raw.stateDone === true,
  };
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
