import {
  axes,
  axisOrder,
  families,
  familyOrder,
  joinContexts,
  sortContexts,
  TOTAL_QUESTIONS,
  type AxisId,
  type ContextId,
  type FamilyId,
  type Journal,
  type Pole,
} from "@/lib/catalog";
import { QUESTION_ORDER, type Question } from "@/lib/questions";

const POLE_VALUE: Record<Pole, number> = { plus: 1, mid: 0, minus: -1 };

export type AxisKind = "thin" | "single" | "noisy" | "split";
export type Pattern = "thin" | "single" | "noisy" | "splitting" | "dual";
export type Possibility = "保留" | "低い" | "判断しない" | "ありうる" | "高い";

export type ContextCluster = {
  mean: number;
  contexts: ContextId[];
};

export type AxisPortrait = {
  axis: AxisId;
  name: string;
  plusLabel: string;
  minusLabel: string;
  n: number;
  mean: number | null;
  sd: number | null;
  kind: AxisKind;
  split: number;
  low: ContextCluster | null;
  high: ContextCluster | null;
};

export type Swap = {
  family: FamilyId;
  label: string;
  plusName: string;
  minusName: string;
  plusContexts: ContextId[];
  minusContexts: ContextId[];
};

export type SelfSide = {
  contexts: string;
  behavior: string;
};

export type DecisionModel = {
  answered: number;
  total: number;
  pattern: Pattern;
  possibility: Possibility;
  headline: string;
  body: string;
  axes: AxisPortrait[];
  swaps: Swap[];
  selves: { name: string; a: SelfSide; b: SelfSide } | null;
  prose: string;
};

type Sample = {
  context: ContextId;
  value: number;
};

type ContextStat = {
  context: ContextId;
  n: number;
  mean: number;
  values: number[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length === 0) return 0;
  const center = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - center) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}

function weightedMean(stats: ContextStat[]) {
  const total = stats.reduce((sum, stat) => sum + stat.n, 0);
  if (total === 0) return 0;
  return stats.reduce((sum, stat) => sum + stat.mean * stat.n, 0) / total;
}

function contextStats(samples: Sample[]): ContextStat[] {
  const grouped = new Map<ContextId, number[]>();
  for (const sample of samples) {
    const values = grouped.get(sample.context) ?? [];
    values.push(sample.value);
    grouped.set(sample.context, values);
  }
  return [...grouped.entries()].map(([context, values]) => ({
    context,
    n: values.length,
    mean: mean(values),
    values,
  }));
}

function samplesFor(axis: AxisId, journal: Journal, questions: Question[]) {
  const samples: Sample[] = [];
  for (const question of questions) {
    if (families[question.family].primary !== axis) continue;
    const answer = journal.answers[question.id];
    if (!answer) continue;
    samples.push({
      context: question.context,
      value: POLE_VALUE[answer.pole],
    });
  }
  return samples;
}

function analyzeAxis(
  axis: AxisId,
  journal: Journal,
  questions: Question[],
): AxisPortrait {
  const meta = axes[axis];
  const samples = samplesFor(axis, journal, questions);
  const n = samples.length;
  const portrait: AxisPortrait = {
    axis,
    name: meta.name,
    plusLabel: meta.plus,
    minusLabel: meta.minus,
    n,
    mean: n > 0 ? mean(samples.map((sample) => sample.value)) : null,
    sd: n > 0 ? standardDeviation(samples.map((sample) => sample.value)) : null,
    kind: "thin",
    split: 0,
    low: null,
    high: null,
  };

  if (n < 4 || portrait.sd === null) return portrait;

  const multi = contextStats(samples).filter((stat) => stat.n >= 2);
  if (multi.length < 2) {
    portrait.kind = portrait.sd >= 0.55 ? "noisy" : "single";
    return portrait;
  }

  const polarized = multi.filter((stat) => Math.abs(stat.mean) >= 0.35);
  const lowStats = polarized.filter((stat) => stat.mean < 0);
  const highStats = polarized.filter((stat) => stat.mean > 0);
  if (lowStats.length === 0 || highStats.length === 0) {
    portrait.kind = portrait.sd >= 0.55 ? "noisy" : "single";
    return portrait;
  }

  const lowMean = weightedMean(lowStats);
  const highMean = weightedMean(highStats);
  const gap = highMean - lowMean;
  const clustered = new Set(
    [...lowStats, ...highStats].map((stat) => stat.context),
  );
  const residuals = samples
    .filter((sample) => clustered.has(sample.context))
    .map((sample) => {
      const stat = polarized.find((item) => item.context === sample.context);
      return sample.value - (stat?.mean ?? sample.value);
    });
  const withinSd = standardDeviation(residuals);
  const gapScore = clamp((gap - 0.8) / 1.2, 0, 1);
  const tightScore = clamp((0.5 - withinSd) / 0.5, 0, 1);
  const lowCount = lowStats.reduce((sum, stat) => sum + stat.n, 0);
  const highCount = highStats.reduce((sum, stat) => sum + stat.n, 0);
  const separated =
    gap >= 0.9 &&
    highMean >= 0.4 &&
    lowMean <= -0.4 &&
    lowCount >= 2 &&
    highCount >= 2 &&
    withinSd <= 0.45;

  portrait.split = gapScore * tightScore;
  portrait.low = {
    mean: lowMean,
    contexts: sortContexts(lowStats.map((stat) => stat.context)),
  };
  portrait.high = {
    mean: highMean,
    contexts: sortContexts(highStats.map((stat) => stat.context)),
  };
  portrait.kind = separated && portrait.split >= 0.45
    ? "split"
    : portrait.sd >= 0.55
      ? "noisy"
      : "single";

  if (portrait.kind !== "split") {
    portrait.low = null;
    portrait.high = null;
    portrait.split = 0;
  }

  return portrait;
}

function collectSwaps(journal: Journal, questions: Question[]): Swap[] {
  const swaps: Swap[] = [];
  for (const family of familyOrder) {
    const meta = families[family];
    const plusContexts: ContextId[] = [];
    const minusContexts: ContextId[] = [];
    for (const question of questions) {
      if (question.family !== family) continue;
      const answer = journal.answers[question.id];
      if (!answer || answer.pole === "mid") continue;
      if (answer.pole === "plus") plusContexts.push(question.context);
      else minusContexts.push(question.context);
    }
    if (plusContexts.length === 0 || minusContexts.length === 0) continue;
    swaps.push({
      family,
      label: meta.label,
      plusName: meta.plus,
      minusName: meta.minus,
      plusContexts: sortContexts(plusContexts),
      minusContexts: sortContexts(minusContexts),
    });
  }
  return swaps.sort(
    (a, b) =>
      b.plusContexts.length +
      b.minusContexts.length -
      (a.plusContexts.length + a.minusContexts.length),
  );
}

function describeSplit(axis: AxisPortrait): string {
  if (axis.kind !== "split" || !axis.low || !axis.high) return "";
  const plusContexts =
    axis.high.mean >= 0 ? axis.high.contexts : axis.low.contexts;
  const minusContexts =
    axis.high.mean >= 0 ? axis.low.contexts : axis.high.contexts;
  return `${axis.name}は分かれている。${joinContexts(plusContexts)}では「${axis.plusLabel}」。${joinContexts(minusContexts)}では「${axis.minusLabel}」。`;
}

function lean(axis: AxisPortrait): string {
  if (axis.mean === null || axis.n === 0) return `${axis.name}は、まだ読めない。`;
  if (axis.kind === "split") return describeSplit(axis);
  if (axis.kind === "noisy") {
    return `${axis.name}は、同じ種類の場面の中でも揺れている。`;
  }
  if (axis.kind === "thin") {
    return `${axis.name}は、まだ薄い。`;
  }
  if (axis.mean >= 0.45) return `${axis.name}は「${axis.plusLabel}」側に寄っている。`;
  if (axis.mean <= -0.45) return `${axis.name}は「${axis.minusLabel}」側に寄っている。`;
  return `${axis.name}は、どちらにも決め切らない中間にある。`;
}

function selvesFrom(axis: AxisPortrait | undefined) {
  if (!axis || axis.kind !== "split" || !axis.low || !axis.high) return null;
  const plusContexts =
    axis.high.mean >= 0 ? axis.high.contexts : axis.low.contexts;
  const minusContexts =
    axis.high.mean >= 0 ? axis.low.contexts : axis.high.contexts;
  return {
    name: axis.name,
    a: { contexts: joinContexts(plusContexts), behavior: axis.plusLabel },
    b: { contexts: joinContexts(minusContexts), behavior: axis.minusLabel },
  };
}

function patternOf(answered: number, portraits: AxisPortrait[]): Pattern {
  if (answered < 16) return "thin";
  const strong = portraits.filter((axis) => axis.kind === "split");
  const noisy = portraits.filter((axis) => axis.kind === "noisy").length;
  if (strong.length >= 2 && answered >= 24) return "dual";
  if (strong.length >= 1) return "splitting";
  if (noisy >= 2) return "noisy";
  return "single";
}

const headlines: Record<Pattern, string> = {
  thin: "まだ、可能性は判断しない",
  single: "場面が変わっても、選ぶ側は安定している",
  noisy: "型になる前のばらつきが先に出ている",
  splitting: "いくつかの場面で、選ぶ側が分かれはじめている",
  dual: "状況によって、もう一つの判断の型が顔を出す",
};

const possibilities: Record<Pattern, Possibility> = {
  thin: "保留",
  single: "低い",
  noisy: "判断しない",
  splitting: "ありうる",
  dual: "高い",
};

function bodyFor(
  pattern: Pattern,
  answered: number,
  portraits: AxisPortrait[],
): string {
  const evidence = portraits
    .filter((axis) => axis.kind === "split")
    .sort((a, b) => b.split - a.split)
    .slice(0, 2)
    .map(describeSplit)
    .join("");

  if (pattern === "thin") {
    return `同じ種類の場面がそろうまで、二重人格の可能性は判断しない。100問のうち${answered}問。入れ替わりの断片は、あれば下に残す。それはまだ判定ではない。`;
  }
  if (pattern === "single") {
    return `いま読める軸では、場面が変わっても同じ側に手が伸びている。一つの判断の型として読める。回答は${answered}問。まだ出ていない種類の場面で、分かれる余地は残っている。`;
  }
  if (pattern === "noisy") {
    return "選ぶ側が、同じ種類の場面の中でも入れ替わっている。まだ型になる前のばらつきです。二重人格の可能性は、このばらつきが場所ごとに分かれるまで判断しない。";
  }
  if (pattern === "splitting") {
    return `${evidence}一つの型には収まりきらない。ただ、同じ分かれ方が複数の軸で揃い、材料が厚くなるまでは「ありうる」にとどめる。疾患の診断ではない。`;
  }
  return `${evidence}ばらつきではなく、状況に結びついた二つの型として読める。これは疾患の診断ではない。選択の蓄積が、二つに分かれたというモデル上の判断です。`;
}

function proseFor(model: Omit<DecisionModel, "prose">) {
  const lines = [
    "二重人格 — 意思決定モデル",
    `回答 ${model.answered}/${model.total}`,
    `二重人格の可能性: ${model.possibility}`,
    model.headline,
    model.body,
    "",
    "軸",
    ...model.axes.map((axis) => lean(axis)),
  ];
  if (model.swaps.length > 0) {
    lines.push("", "逆を選んだ組");
    for (const swap of model.swaps) {
      lines.push(
        `${swap.label}: ${joinContexts(swap.plusContexts)}では「${swap.plusName}」。${joinContexts(swap.minusContexts)}では「${swap.minusName}」。`,
      );
    }
  }
  lines.push(
    "",
    "これは医学的な診断ではない。解離性同一性症などの疾患を判定せず、状況ごとの選択から意思決定の型を読んでいる。",
  );
  return lines.join("\n");
}

export function buildModel(
  journal: Journal,
  questions: Question[] = QUESTION_ORDER,
): DecisionModel {
  const answered = questions.filter((question) => journal.answers[question.id]).length;
  const portraits = axisOrder.map((axis) => analyzeAxis(axis, journal, questions));
  const pattern = patternOf(answered, portraits);
  const swaps = collectSwaps(journal, questions);
  const strongest = portraits
    .filter((axis) => axis.kind === "split")
    .sort((a, b) => b.split - a.split)[0];
  const model: Omit<DecisionModel, "prose"> = {
    answered,
    total: TOTAL_QUESTIONS,
    pattern,
    possibility: possibilities[pattern],
    headline: headlines[pattern],
    body: bodyFor(pattern, answered, portraits),
    axes: portraits,
    swaps,
    selves: pattern === "thin" ? null : selvesFrom(strongest),
  };
  return { ...model, prose: proseFor(model) };
}
