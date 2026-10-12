import { BASE_ITEMS, STAGES, type Item, type Mode } from "@/lib/mbti/items";
import { currentValue, scoredValue, type Answers } from "@/lib/mbti/scoring";
import type { Followups } from "@/lib/mbti/storage";

/** 1問あたりの仮の所要時間（ミリ秒）。実測が足りないときに使う。 */
export const DEFAULT_MS_PER_ITEM = 8000;

export function estimateMinutes(count: number, timings: Record<string, number>) {
  const samples = Object.values(timings).filter((ms) => ms >= 1500 && ms <= 120_000);
  const ms =
    samples.length >= 10
      ? [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)]
      : DEFAULT_MS_PER_ITEM;
  return Math.max(1, Math.round((count * ms) / 60_000));
}

export function completedStage(answers: Answers): Mode | null {
  const ranked = [...STAGES].reverse();
  for (const stage of ranked) {
    const items = BASE_ITEMS.filter((item) => item.tier <= stage.tier);
    if (items.every((item) => currentValue(item, answers) !== undefined)) return stage.key;
  }
  return null;
}

export type ItemStat = {
  id: string;
  n: number;
  mean: number | null;
  sd: number | null;
  rest: number | null;
};

/** 逆転を戻した 1〜5 の行列。行=回答者、列=質問。 */
export function scoredMatrix(items: Item[], respondents: Answers[]) {
  return respondents.map((answers) => items.map((item) => scoredValue(item, answers)));
}

function meanOf(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sdOf(values: number[]) {
  if (values.length < 2) return null;
  const mean = meanOf(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

function pearson(a: number[], b: number[]) {
  if (a.length < 3) return null;
  const ma = meanOf(a);
  const mb = meanOf(b);
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  const den = Math.sqrt(va * vb);
  return den === 0 ? null : cov / den;
}

/**
 * Cronbach's α。列に欠測がある行は、その列の統計では除外する（尺度全体はリストワイズ）。
 * 回答者が3人未満、または完答が2人未満のときは null。
 */
export function cronbachAlpha(matrix: (number | null)[][]): number | null {
  if (matrix.length < 3 || (matrix[0]?.length ?? 0) < 2) return null;
  const complete = matrix.filter((row) => row.every((value) => value !== null)) as number[][];
  if (complete.length < 3) return null;
  const k = complete[0].length;
  const itemVars = Array.from({ length: k }, (_, j) => {
    const values = complete.map((row) => row[j]);
    const sd = sdOf(values);
    return sd === null ? 0 : sd * sd;
  });
  const totals = complete.map((row) => row.reduce((sum, value) => sum + value, 0));
  const totalSd = sdOf(totals);
  if (totalSd === null || totalSd === 0) return null;
  const alpha = (k / (k - 1)) * (1 - itemVars.reduce((sum, v) => sum + v, 0) / (totalSd * totalSd));
  return Number.isFinite(alpha) ? alpha : null;
}

export function itemStats(items: Item[], respondents: Answers[]): ItemStat[] {
  const matrix = scoredMatrix(items, respondents);
  return items.map((item, j) => {
    const values = matrix.map((row) => row[j]).filter((value): value is number => value !== null);
    const rest = matrix
      .map((row) => {
        if (row[j] === null) return null;
        const others = row.filter((value, i) => i !== j && value !== null) as number[];
        if (others.length === 0) return null;
        return { item: row[j]!, rest: others.reduce((sum, value) => sum + value, 0) };
      })
      .filter((row): row is { item: number; rest: number } => row !== null);
    return {
      id: item.id,
      n: values.length,
      mean: values.length > 0 ? meanOf(values) : null,
      sd: sdOf(values),
      rest: pearson(
        rest.map((row) => row.item),
        rest.map((row) => row.rest),
      ),
    };
  });
}

export type ExportPayload = {
  v: 1;
  exportedAt: string;
  mode: Mode | null;
  items: {
    id: string;
    measure: string;
    direction: 1 | -1;
    weight: number;
    scene: string;
    version: number;
    tier: number;
    kind: string;
    purpose: string;
    facet?: string;
    text: string;
    value: Answers[string]["value"] | null;
    followup: Followups[string]["value"] | null;
    ms: number | null;
    changes: number;
  }[];
};

/** 検証用の書き出し。個人を特定する情報は入れない。 */
export function exportPayload(
  mode: Mode | null,
  answers: Answers,
  followups: Followups,
  timings: Record<string, number>,
  changes: Record<string, number>,
): ExportPayload {
  return {
    v: 1,
    exportedAt: new Date().toISOString(),
    mode,
    items: BASE_ITEMS.map((item) => ({
      id: item.id,
      measure: item.measure,
      direction: item.direction,
      weight: item.weight,
      scene: item.scene,
      version: item.version,
      tier: item.tier,
      kind: item.kind,
      purpose: item.purpose,
      ...(item.facet ? { facet: item.facet } : {}),
      text: item.text,
      value: currentValue(item, answers) ?? null,
      followup: followups[item.id]?.value ?? null,
      ms: timings[item.id] ?? null,
      changes: changes[item.id] ?? 0,
    })),
  };
}
