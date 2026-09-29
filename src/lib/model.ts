import {
  axes,
  axisOrder,
  contextOrder,
  contexts,
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
  type Prediction,
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

export type GridCell = { n: number; mean: number } | null;

export type PredictionStats = {
  n: number;
  overallHits: number;
  contextHits: number;
};

export type Consistency = {
  n: number;
  same: number;
  rate: number | null;
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
  grid: Record<AxisId, Record<ContextId, GridCell>>;
  predictions: PredictionStats;
  consistency: Consistency;
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

function patternOf(
  answered: number,
  portraits: AxisPortrait[],
  consistency: Consistency,
): Pattern {
  if (answered < 16) return "thin";
  const strong = portraits.filter((axis) => axis.kind === "split");
  const noisy = portraits.filter((axis) => axis.kind === "noisy").length;
  let pattern: Pattern = "single";
  if (strong.length >= 2 && answered >= 24) pattern = "dual";
  else if (strong.length >= 1) pattern = "splitting";
  else if (noisy >= 2) pattern = "noisy";

  // Re-asking the same situation separates a context-bound second pattern
  // from answers that simply do not reproduce.
  if (consistency.rate !== null && consistency.n >= 3) {
    if (consistency.rate < 0.5) return "noisy";
    if (pattern === "dual" && consistency.rate < 0.6) return "splitting";
  }
  return pattern;
}

function toPole(value: number): Pole {
  if (value >= 0.34) return "plus";
  if (value <= -0.34) return "minus";
  return "mid";
}

export function predictFor(
  journal: Journal,
  question: Question,
  questions: Question[] = QUESTION_ORDER,
): Prediction | null {
  const axis = families[question.family].primary;
  const all: number[] = [];
  const same: number[] = [];
  for (const other of questions) {
    if (other.id === question.id) continue;
    if (families[other.family].primary !== axis) continue;
    const answer = journal.answers[other.id];
    if (!answer) continue;
    const value = POLE_VALUE[answer.pole];
    all.push(value);
    if (other.context === question.context) same.push(value);
  }
  if (all.length === 0) return null;
  const overall = toPole(mean(all));
  return { overall, context: same.length > 0 ? toPole(mean(same)) : overall };
}

function predictionStats(journal: Journal, questions: Question[]): PredictionStats {
  const stats: PredictionStats = { n: 0, overallHits: 0, contextHits: 0 };
  for (const question of questions) {
    const answer = journal.answers[question.id];
    if (!answer?.prediction) continue;
    stats.n += 1;
    if (answer.prediction.overall === answer.pole) stats.overallHits += 1;
    if (answer.prediction.context === answer.pole) stats.contextHits += 1;
  }
  return stats;
}

function consistencyOf(journal: Journal): Consistency {
  const n = journal.retests.length;
  const same = journal.retests.filter((item) => item.pole === item.original).length;
  return { n, same, rate: n > 0 ? same / n : null };
}

function gridOf(journal: Journal, questions: Question[]) {
  const grid = {} as Record<AxisId, Record<ContextId, GridCell>>;
  for (const axis of axisOrder) {
    const row = {} as Record<ContextId, GridCell>;
    for (const context of contextOrder) {
      const values = questions
        .filter(
          (question) =>
            question.context === context &&
            families[question.family].primary === axis &&
            journal.answers[question.id],
        )
        .map((question) => POLE_VALUE[journal.answers[question.id].pole]);
      row[context] = values.length > 0 ? { n: values.length, mean: mean(values) } : null;
    }
    grid[axis] = row;
  }
  return grid;
}

function evidenceNotes(predictions: PredictionStats, consistency: Consistency) {
  const notes: string[] = [];
  if (consistency.n > 0) {
    notes.push(
      `前に出た場面を${consistency.n}問出し直し、${consistency.same}問で同じ手を選んだ。`,
    );
  }
  if (predictions.n >= 8) {
    const gain = predictions.contextHits - predictions.overallHits;
    if (gain >= 2) {
      notes.push(
        `場面を知っているモデルのほうが、次の選択をよく当てた(${predictions.contextHits}/${predictions.n} と ${predictions.overallHits}/${predictions.n})。`,
      );
    } else {
      notes.push(
        `次の選択は、場面を見ても見なくても同じくらい当たった(${predictions.contextHits}/${predictions.n} と ${predictions.overallHits}/${predictions.n})。`,
      );
    }
  }
  return notes.join("");
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
  lines.push("", "場面ごとの寄り");
  for (const context of contextOrder) {
    const leaning = model.axes
      .map((axis) => {
        const cell = model.grid[axis.axis][context];
        if (!cell || Math.abs(cell.mean) < 0.5) return null;
        return cell.mean > 0 ? axis.plusLabel : axis.minusLabel;
      })
      .filter((label): label is string => label !== null);
    if (leaning.length > 0) {
      lines.push(`${contexts[context].label}: ${leaning.join("、")}`);
    }
  }
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
  const consistency = consistencyOf(journal);
  const predictions = predictionStats(journal, questions);
  const pattern = patternOf(answered, portraits, consistency);
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
    body: bodyFor(pattern, answered, portraits) + evidenceNotes(predictions, consistency),
    axes: portraits,
    swaps,
    selves: pattern === "thin" || pattern === "noisy" ? null : selvesFrom(strongest),
    grid: gridOf(journal, questions),
    predictions,
    consistency,
  };
  return { ...model, prose: proseFor(model) };
}
