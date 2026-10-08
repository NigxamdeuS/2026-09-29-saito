"use server";

import {
  isAgeGroup,
  isCompleteAnswers,
  scoreTest,
  TEST_IDS,
  type TestId,
  type TestStats,
} from "@/lib/diagnosis";
import { loadStats, removeEntry, saveEntry } from "@/lib/diagnosis-stats";

const SUBMISSION_ID = /^[0-9a-f-]{36}$/;

function isTestId(value: unknown): value is TestId {
  return TEST_IDS.includes(value as TestId);
}

export type StatsResult = { ok: true; stats: TestStats } | { ok: false };

export async function submitDiagnosis(input: {
  testId: unknown;
  submissionId: unknown;
  age: unknown;
  answers: unknown;
}): Promise<StatsResult> {
  const { testId, submissionId, age, answers } = input;
  if (
    !isTestId(testId) ||
    typeof submissionId !== "string" ||
    !SUBMISSION_ID.test(submissionId) ||
    !isAgeGroup(age) ||
    !isCompleteAnswers(testId, answers)
  ) {
    return { ok: false };
  }
  try {
    await saveEntry(testId, submissionId, {
      age,
      scores: scoreTest(testId, answers),
      at: new Date().toISOString(),
    });
    return { ok: true, stats: await loadStats(testId) };
  } catch (error) {
    console.error("診断結果の集計に失敗しました", error);
    return { ok: false };
  }
}

export async function withdrawDiagnosis(input: {
  testId: unknown;
  submissionId: unknown;
}): Promise<StatsResult> {
  const { testId, submissionId } = input;
  if (!isTestId(testId) || typeof submissionId !== "string" || !SUBMISSION_ID.test(submissionId)) {
    return { ok: false };
  }
  try {
    await removeEntry(testId, submissionId);
    return { ok: true, stats: await loadStats(testId) };
  } catch (error) {
    console.error("診断結果の取り消しに失敗しました", error);
    return { ok: false };
  }
}

export async function fetchDiagnosisStats(testId: unknown): Promise<StatsResult> {
  if (!isTestId(testId)) return { ok: false };
  try {
    return { ok: true, stats: await loadStats(testId) };
  } catch (error) {
    console.error("診断結果の集計を読み込めませんでした", error);
    return { ok: false };
  }
}
