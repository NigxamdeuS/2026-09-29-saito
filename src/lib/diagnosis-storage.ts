import { isAgeGroup, TESTS, type AgeGroup, type TestId } from "@/lib/diagnosis";

export const DIAGNOSIS_STORAGE_KEY = "nigxam.diagnosis.v1";

export type Progress = {
  age: AgeGroup | null;
  share: boolean;
  answers: (number | null)[];
  submissionId: string | null;
  submitted: boolean;
};

export function emptyProgress(testId: TestId): Progress {
  return {
    age: null,
    share: true,
    answers: TESTS[testId].items.map(() => null),
    submissionId: null,
    submitted: false,
  };
}

export function sanitizeProgress(testId: TestId, input: unknown): Progress {
  const empty = emptyProgress(testId);
  if (!input || typeof input !== "object") return empty;
  const raw = input as Partial<Progress>;
  const values = TESTS[testId].options.map((option) => option.value);
  const answers = empty.answers.map((_, index) => {
    const value = Array.isArray(raw.answers) ? raw.answers[index] : null;
    return typeof value === "number" && values.includes(value) ? value : null;
  });
  return {
    age: isAgeGroup(raw.age) ? raw.age : null,
    share: raw.share !== false,
    answers,
    submissionId:
      typeof raw.submissionId === "string" && /^[0-9a-f-]{36}$/.test(raw.submissionId)
        ? raw.submissionId
        : null,
    submitted: raw.submitted === true,
  };
}

function readAll(): Record<string, unknown> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DIAGNOSIS_STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function loadProgress(testId: TestId): Progress {
  if (typeof window === "undefined") return emptyProgress(testId);
  return sanitizeProgress(testId, readAll()[testId]);
}

export function saveProgress(testId: TestId, progress: Progress): boolean {
  try {
    window.localStorage.setItem(
      DIAGNOSIS_STORAGE_KEY,
      JSON.stringify({ ...readAll(), [testId]: progress }),
    );
    return true;
  } catch {
    return false;
  }
}

export function isComplete(progress: Progress) {
  return progress.answers.every((value) => value !== null);
}

export function answeredItems(progress: Progress) {
  return progress.answers.filter((value) => value !== null).length;
}
