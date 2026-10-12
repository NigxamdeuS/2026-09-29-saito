import { AXES, type Side } from "@/lib/mbti/content";
import {
  ALL_ITEMS,
  itemsOf,
  SCENES,
  type AnswerValue,
  type AxisKey,
  type Item,
  type MeasureKey,
  type Mode,
  type Scene,
} from "@/lib/mbti/items";

export type Answers = Record<string, { value: AnswerValue; version: number }>;

export type MeasureResult = {
  /** 0〜100の尺度上の傾向スコア。回答が足りないときは null（保留）。 */
  score: number | null;
  answered: number;
  na: number;
  total: number;
};

export const MIN_ANSWERED_RATIO = 0.6;
export const MIDDLE_LOW = 40;
export const MIDDLE_HIGH = 60;

function currentValue(item: Item, answers: Answers): AnswerValue | undefined {
  const answer = answers[item.id];
  return answer && answer.version === item.version ? answer.value : undefined;
}

export function scoreItems(items: Item[], answers: Answers, minAnswered?: number): MeasureResult {
  let sum = 0;
  let max = 0;
  let answered = 0;
  let na = 0;
  for (const item of items) {
    const value = currentValue(item, answers);
    if (value === undefined) continue;
    if (value === "na") {
      na += 1;
      continue;
    }
    sum += item.weight * (item.direction === 1 ? value - 1 : 5 - value);
    max += item.weight * 4;
    answered += 1;
  }
  const required = minAnswered ?? Math.max(1, Math.ceil(items.length * MIN_ANSWERED_RATIO));
  return {
    score: answered >= required && max > 0 ? (sum / max) * 100 : null,
    answered,
    na,
    total: items.length,
  };
}

export type Results = Record<MeasureKey, MeasureResult>;

/** その段階の質問だけで採点する。その段階で出題しない項目は total が 0 になる。 */
export function scoreAll(answers: Answers, mode: Mode = "complete"): Results {
  const keys = [...new Set(ALL_ITEMS.map((item) => item.measure))];
  return Object.fromEntries(
    keys.map((key) => {
      const items = itemsOf(key, mode);
      return [key, items.length > 0 ? scoreItems(items, answers) : { score: null, answered: 0, na: 0, total: 0 }];
    }),
  ) as Results;
}

export function sideOf(score: number | null): Side | null {
  if (score === null) return null;
  if (score < MIDDLE_LOW) return "low";
  if (score > MIDDLE_HIGH) return "high";
  return "mid";
}

export function displayScore(score: number) {
  return Math.round(score);
}

export type TypeResult = {
  /** 4文字すべてが決まったときのみ。50ちょうどの軸があるときや保留の軸があるときは null。 */
  type: string | null;
  letters: (string | null)[];
  /** 中央付近の軸を反対にした、近い候補タイプ。 */
  candidates: { type: string; axis: AxisKey }[];
  heldAxes: AxisKey[];
};

export function typeOf(results: Results): TypeResult {
  const letters = AXES.map((axis) => {
    const score = results[axis.key].score;
    if (score === null || score === 50) return null;
    return score > 50 ? axis.letters[1] : axis.letters[0];
  });
  const heldAxes = AXES.filter((axis) => results[axis.key].score === null).map((axis) => axis.key);
  const type = letters.every((letter) => letter !== null) ? letters.join("") : null;
  const candidates: TypeResult["candidates"] = [];
  if (heldAxes.length === 0) {
    const base = AXES.map((axis, i) => letters[i] ?? axis.letters[0]);
    const tie = AXES.find((_, i) => letters[i] === null);
    if (tie) candidates.push({ type: base.join(""), axis: tie.key });
    AXES.forEach((axis, i) => {
      if (sideOf(results[axis.key].score) !== "mid") return;
      const flipped = [...base];
      flipped[i] = base[i] === axis.letters[0] ? axis.letters[1] : axis.letters[0];
      candidates.push({ type: flipped.join(""), axis: axis.key });
    });
  }
  return { type, letters, candidates, heldAxes };
}

const SCENE_ORDER: Scene[] = ["daily", "work", "friends", "close"];

/** 場面ごとの尺度上の傾向スコア。軸は1場面2問以上の回答があるときだけ出す。 */
export function sceneScores(
  measure: MeasureKey,
  answers: Answers,
  mode: Mode = "complete",
): Partial<Record<Scene, number>> {
  const items = itemsOf(measure, mode);
  const isAxis = AXES.some((axis) => axis.key === measure);
  const scores: Partial<Record<Scene, number>> = {};
  for (const scene of SCENE_ORDER) {
    const group = items.filter((item) => item.scene === scene);
    if (group.length === 0) continue;
    const result = scoreItems(group, answers, isAxis ? 2 : 1);
    if (result.score !== null) scores[scene] = result.score;
  }
  return scores;
}

export type SceneGap = { measure: MeasureKey; high: Scene; low: Scene; gap: number };

/** 同じ項目で、場面によって回答の向きが大きく違うもの。嘘や矛盾ではなく、場面による違いの可能性として扱う。 */
export function sceneGaps(measures: MeasureKey[], answers: Answers, mode: Mode = "complete"): SceneGap[] {
  const gaps: SceneGap[] = [];
  for (const measure of measures) {
    const entries = Object.entries(sceneScores(measure, answers, mode)) as [Scene, number][];
    if (entries.length < 2) continue;
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    const [high, highScore] = sorted[0];
    const [low, lowScore] = sorted[sorted.length - 1];
    if (highScore > MIDDLE_HIGH && lowScore < MIDDLE_LOW && highScore - lowScore >= 40) {
      gaps.push({ measure, high, low, gap: highScore - lowScore });
    }
  }
  return gaps.sort((a, b) => b.gap - a.gap);
}

export function sceneLabel(scene: Scene) {
  return SCENES[scene];
}
