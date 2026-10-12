import {
  ASSERT_FACETS,
  AXES,
  BIPOLARS,
  bipolarDef,
  COMBOS,
  DOMAINS,
  FACETS,
  PAIRS,
  STATES,
  VALUES,
  type AxisDef,
  type BipolarDef,
  type DomainKey,
  type FacetDef,
  type PairStyle,
  type Pole,
  type Side,
} from "@/lib/mbti/content";
import {
  addedItemsOf,
  answerLabel,
  baseItemsOf,
  FOLLOWUP,
  hasAnalysis,
  isScore,
  itemsOf,
  previousStage,
  stageOf,
  STAGES,
  type AnalysisKey,
  type BipolarKey,
  type MeasureKey,
  type Mode,
  type Scene,
} from "@/lib/mbti/items";
import {
  breakdownOf,
  displayScore,
  sceneGaps,
  sceneLabel,
  sceneScores,
  SCORE_FORMULA,
  scoreAll,
  scoreItems,
  sideOf,
  typeOf,
  type Answers,
  type BreakdownRow,
  type Results,
  type TypeResult,
} from "@/lib/mbti/scoring";
import type { Followups } from "@/lib/mbti/storage";
import { completedStage } from "@/lib/mbti/validation";

/** 解釈（text）と、その根拠になった回答の傾向（basis）を分けて持つ。 */
export type Finding = { text: string; basis: string };

/** スコアを動かした質問と、その回答。 */
export type Evidence = { text: string; answer: string; toward: string };

export type AxisRow = {
  def: AxisDef;
  score: number | null;
  side: Side | null;
  degree: string | null;
  text: string;
  strength?: string;
  strain?: string;
  evidence: Evidence[];
};

export type PairReport = { title: string; styles: PairStyle[]; basis: string };

export type StressFinding = Finding & { recover: string };

export type Quality = {
  answered: number;
  total: number;
  na: number;
  depends: number;
  neutral: number;
  notes: Finding[];
};

export type DomainReport = {
  key: DomainKey;
  label: string;
  note?: string;
  comfortable: Finding[];
  complement: Finding[];
  friction: Finding[];
  reasons: Finding[];
  cautions: Finding[];
  tips: Finding[];
  checks: Finding[];
};

export type FacetRow = { def: FacetDef; score: number | null; side: Side | null };

export type FacetReport = { axis: AxisDef; rows: FacetRow[]; note: Finding };

/** 側面を分析するのに必要な、1側面あたりの質問数（60問では各4問）。 */
export const FACET_MIN_ITEMS = 4;
export const ASSERT_FACET_MIN_ITEMS = 2;

export type AssertFacetRow = { def: FacetDef; score: number | null; side: Side | null };

export type Report = {
  mode: Mode;
  results: Results;
  type: TypeResult;
  held: string[];
  /** この段階では出題していない項目。 */
  unmeasured: string[];
  /** 回答済みの質問から完了しているいちばん長い段階。 */
  completed: Mode | null;
  facets: FacetReport[];
  assertFacets: AssertFacetRow[];
  summary: Finding[];
  axes: AxisRow[];
  pairs: PairReport[];
  thinking: Finding[];
  people: Finding[];
  strengths: Finding[];
  strains: Finding[];
  stress: StressFinding[];
  misreads: Finding[];
  asks: Finding[];
  growth: Finding[];
  changes: Finding[];
  quality: Quality;
  sceneTable: { def: AxisDef; cells: Partial<Record<Scene, Side>> }[];
  sceneNotes: Finding[];
  followupNotes: Finding[];
  combos: Finding[];
  actions: Finding[];
  values: { label: string; score: number | null; measured: boolean }[];
  states: { label: string; score: number | null }[];
  stateNotes: Finding[];
  domains: DomainReport[];
  breakdown: BreakdownRow[];
  formula: string;
  available: AnalysisKey[];
};

export const COMPARE_SCENES: Scene[] = ["work", "friends", "close"];

export function poleOf(def: BipolarDef, side: Side | null): Pole | null {
  if (side === "low") return def.low;
  if (side === "high") return def.high;
  return null;
}

/** 中央（50）からの離れ具合を言葉にしたもの。 */
export function degreeOf(score: number) {
  const distance = Math.abs(score - 50);
  if (distance > 35) return "とてもはっきり";
  if (distance > 20) return "はっきり";
  if (distance > 10) return "やや";
  return "中央付近";
}

export function sideText(def: BipolarDef, score: number | null) {
  const side = sideOf(score);
  if (side === null || score === null) return "回答が少ないため保留";
  if ("letters" in def) {
    const axis = def as AxisDef;
    if (side === "mid") return `${axis.letters[0]}と${axis.letters[1]}の両方の傾向`;
    return `${degreeOf(score)}${side === "low" ? axis.letters[0] : axis.letters[1]}寄り`;
  }
  if (side === "mid") return "両方の傾向";
  return `${poleOf(def, side)!.label}（${degreeOf(score)}）`;
}

export function basisOf(def: BipolarDef, score: number | null) {
  const name = "letters" in def ? (def as AxisDef).letters.join("／") : def.title;
  if (score === null) return `${name}：回答が少ないため保留`;
  return `${name}：${sideText(def, score)}（尺度上の傾向スコア ${displayScore(score)}）`;
}

function middleText(def: BipolarDef) {
  return `「${def.low.label}」面と「${def.high.label}」面の両方があり、場面や相手によって使い分けている可能性があります。`;
}

function describe(def: BipolarDef, score: number | null) {
  const side = sideOf(score);
  if (side === null) return "回答が少ない（または「判断できない」が多い）ため、この項目の結果は保留しています。";
  if (side === "mid") return middleText(def);
  return poleOf(def, side)!.desc;
}

/** はっきり出ている項目を、中央からの離れ具合が大きい順に。 */
function clearest(keys: BipolarKey[], results: Results) {
  return keys
    .filter((key) => {
      const side = sideOf(results[key].score);
      return side === "low" || side === "high";
    })
    .sort((a, b) => Math.abs(results[b].score! - 50) - Math.abs(results[a].score! - 50));
}

function finding(def: BipolarDef, results: Results, pick: (pole: Pole) => string): Finding {
  const score = results[def.key].score;
  return { text: pick(poleOf(def, sideOf(score))!), basis: basisOf(def, score) };
}

const ALL_BIPOLAR = BIPOLARS.map((def) => def.key);

/** 軸のスコアを、どの質問への回答が動かしたか。寄っている側を押した回答を強い順に。 */
function evidenceOf(def: AxisDef, answers: Answers, side: Side | null, mode: Mode): Evidence[] {
  if (side === null) return [];
  const rows = itemsOf(def.key, mode).flatMap((item) => {
    const answer = answers[item.id];
    if (!answer || answer.version !== item.version || !isScore(answer.value)) return [];
    const pull = item.direction === 1 ? answer.value - 3 : 3 - answer.value;
    return pull === 0 ? [] : [{ item, value: answer.value, pull }];
  });
  const pick = (sign: 1 | -1, count: number) =>
    rows
      .filter((row) => row.pull * sign > 0)
      .sort((a, b) => b.pull * sign - a.pull * sign)
      .slice(0, count);
  const chosen = side === "high" ? pick(1, 3) : side === "low" ? pick(-1, 3) : [...pick(-1, 2), ...pick(1, 2)];
  return chosen.map((row) => ({
    text: row.item.text,
    answer: answerLabel(row.value),
    toward: row.pull > 0 ? def.letters[1] : def.letters[0],
  }));
}

function lettersOf(def: AxisDef, score: number | null) {
  const side = sideOf(score);
  if (side === null) return null;
  if (side === "mid") return [...def.letters];
  return [side === "low" ? def.letters[0] : def.letters[1]];
}

function facetsOf(answers: Answers, mode: Mode): FacetReport[] {
  return AXES.flatMap((axis) => {
    const items = itemsOf(axis.key, mode);
    const groups = FACETS[axis.key].map((def) => ({ def, items: items.filter((item) => item.facet === def.key) }));
    if (groups.some((group) => group.items.length < FACET_MIN_ITEMS)) return [];
    const rows: FacetRow[] = groups.map(({ def, items: group }) => {
      const score = scoreItems(group, answers).score;
      return { def, score, side: sideOf(score) };
    });
    const label = (row: FacetRow) => `「${row.def.title}」は「${row.side === "low" ? row.def.low : row.def.high}」寄り`;
    const lows = rows.filter((row) => row.side === "low");
    const highs = rows.filter((row) => row.side === "high");
    const mids = rows.filter((row) => row.side === "mid");
    let text: string;
    if (lows.length > 0 && highs.length > 0) {
      text = `${axis.letters.join("／")}の中でも、${[...lows, ...highs].map(label).join("、")}で、側面によって向きが分かれています。軸全体のスコアだけでは見えない違いです。どの側面で、どちらのやり方が出やすいかを知っておくと、自分の行動を説明しやすくなります。`;
    } else if (lows.length + highs.length === rows.length) {
      const letter = lows.length > 0 ? axis.letters[0] : axis.letters[1];
      text = `3つの側面すべてが${letter}寄りで、この軸の傾向は側面を通して一貫しています。`;
    } else if (mids.length === rows.length) {
      text = "3つの側面すべてが中央付近です。この軸については、内容や場面によって両方のやり方を使い分けている可能性があります。";
    } else {
      text = `${[...lows, ...highs].map(label).join("、")}ですが、${mids
        .map((row) => `「${row.def.title}」`)
        .join("、")}は中央付近です。側面によって、傾向のはっきりさに違いがあります。`;
    }
    return [
      {
        axis,
        rows,
        note: {
          text,
          basis: rows
            .map((row) => `${row.def.title}：${row.score === null ? "保留" : displayScore(row.score)}`)
            .join(" ／ "),
        },
      },
    ];
  });
}

function qualityOf(answers: Answers, results: Results, mode: Mode): Quality {
  const baseItems = baseItemsOf(mode);
  let na = 0;
  let depends = 0;
  let neutral = 0;
  let sum = 0;
  let numeric = 0;
  for (const item of baseItems) {
    const answer = answers[item.id];
    if (!answer || answer.version !== item.version) continue;
    if (answer.value === "na") {
      na += 1;
      continue;
    }
    if (answer.value === "depends") {
      depends += 1;
      continue;
    }
    numeric += 1;
    sum += answer.value;
    if (answer.value === 3) neutral += 1;
  }
  const notes: Finding[] = [];
  if (numeric > 0) {
    const mean = sum / numeric;
    if (neutral / numeric >= 0.4) {
      notes.push({
        text: "「どちらともいえない」の回答が多めでした。中央の回答が多いと、どの項目もスコアが中央付近に寄りやすくなります。迷った質問は、ふだんの自分に少しでも近いほうを選ぶと、傾向が読み取りやすくなります。",
        basis: `「どちらともいえない」${neutral}問／採点した回答${numeric}問`,
      });
    }
    if (mean >= 3.9 || mean <= 2.1) {
      const side = mean >= 3.9 ? "当てはまる" : "当てはまらない";
      notes.push({
        text: `内容にかかわらず「${side}」側の回答が多めでした。この診断は、同じ項目を逆の言い方でも聞いているため、どちらの質問にも「${side}」と答えると、結果が中央付近に寄りやすくなります。`,
        basis: `回答の平均 ${mean.toFixed(1)}（1〜5、逆転前の値）`,
      });
    }
  }
  if (na >= Math.max(5, Math.round(baseItems.length / 8))) {
    notes.push({
      text: "「経験がない／判断できない」の回答が多めでした。その質問は採点に入れていないため、残りの質問だけで出した結果になっています。経験の少ない場面については、結果を控えめに受け取ってください。短い診断であること自体は、回答の信用できない理由にはしていません。",
      basis: `「経験がない／判断できない」${na}問／${baseItems.length}問`,
    });
  }
  if (depends >= Math.max(4, Math.round(baseItems.length / 10))) {
    notes.push({
      text: "「状況による」の回答が多めでした。この選択は中間点にも低得点にもしていません。補足で答えた違いは、場面差の説明にだけ使っています。",
      basis: `「状況による」${depends}問／${baseItems.length}問`,
    });
  }
  for (const def of AXES) {
    if (results[def.key].score === null) continue;
    const items = itemsOf(def.key, mode);
    const forward = scoreItems(
      items.filter((item) => item.direction === 1),
      answers,
      3,
    ).score;
    const reverse = scoreItems(
      items.filter((item) => item.direction === -1),
      answers,
      3,
    ).score;
    if (forward === null || reverse === null || Math.abs(forward - reverse) < 40) continue;
    notes.push({
      text: `「${def.title}」では、言い方が逆向きの質問どうしで、答えの向きがそろっていませんでした。質問の受け取り方や、場面による違いが影響している可能性があります。この軸の結果は控えめに受け取ってください。`,
      basis: `${def.letters[1]}側を聞く質問だけのスコア ${displayScore(forward)} ／ ${def.letters[0]}側を聞く質問だけのスコア ${displayScore(reverse)}`,
    });
  }
  return { answered: answeredBase(answers, mode), total: baseItems.length, na, depends, neutral, notes };
}

function open(mode: Mode, key: AnalysisKey) {
  return hasAnalysis(mode, key);
}

function changeNotes(answers: Answers, mode: Mode): Finding[] {
  const previous = previousStage(mode);
  if (!previous) return [];
  const before = scoreAll(answers, previous.key);
  const after = scoreAll(answers, mode);
  const added = addedItemsOf(mode);
  const notes: Finding[] = [];
  notes.push({
    text: `${previous.label}から${stageOf(mode).label}へ進み、${added.length}問の回答が加わりました。加えた質問は、同じ項目を別の側面・別の場面から確認するものです。`,
    basis: `追加した質問ID：${added.map((item) => item.id).join("、")}`,
  });
  for (const def of BIPOLARS) {
    const a = before[def.key];
    const b = after[def.key];
    if (a.total === 0 && b.total > 0) {
      notes.push({
        text:
          b.score === null
            ? `「${def.title}」はこの段階で初めて測りましたが、採点できる回答が足りないため保留しています。`
            : `「${def.title}」はこの段階で初めて測り、「${sideText(def, b.score)}」という結果になりました。`,
        basis: basisOf(def, b.score),
      });
      continue;
    }
    if (a.total === 0 || b.total === 0) continue;
    if (a.score === null && b.score !== null) {
      notes.push({
        text: `「${def.title}」は、追加の回答で結果が出ました（${sideText(def, b.score)}）。`,
        basis: `${previous.label}時点は保留 ／ ${basisOf(def, b.score)}`,
      });
    } else if (a.score !== null && b.score !== null && Math.abs(a.score - b.score) >= 8) {
      notes.push({
        text: `「${def.title}」は、${previous.label}までの結果（${sideText(def, a.score)}）から、追加回答のあと「${sideText(def, b.score)}」になりました。`,
        basis: `${previous.label} ${displayScore(a.score)} → ${stageOf(mode).label} ${displayScore(b.score)}`,
      });
    }
  }
  for (const value of VALUES) {
    const a = before[value.key];
    const b = after[value.key];
    if (a.total === 0 && b.total > 0 && b.score !== null) {
      notes.push({
        text: `大切にしていること「${value.label}」は、この段階で初めて測りました（尺度上の傾向スコア ${displayScore(b.score)}）。`,
        basis: `価値観「${value.label}」：${displayScore(b.score)}`,
      });
    }
  }
  return notes;
}

function followupNotes(answers: Answers, followups: Followups): Finding[] {
  const counts = Object.fromEntries(FOLLOWUP.options.map((option) => [option.value, 0])) as Record<
    (typeof FOLLOWUP.options)[number]["value"],
    number
  >;
  let skip = 0;
  let used = 0;
  for (const [id, entry] of Object.entries(followups)) {
    if (answers[id]?.value !== "depends") continue;
    if (entry.value === "skip") {
      skip += 1;
      continue;
    }
    counts[entry.value] += 1;
    used += 1;
  }
  if (used + skip === 0) return [];
  const ranked = FOLLOWUP.options.filter((option) => counts[option.value] > 0).sort((a, b) => counts[b.value] - counts[a.value]);
  const notes: Finding[] = [
    {
      text: `「状況による」を選んだ質問に、補足で答えたのは${used}問です（スキップ${skip}問）。補足は基本の点数には入れていません。`,
      basis: `補足回答 ${used}問、スキップ ${skip}問`,
    },
  ];
  if (ranked.length > 0) {
    notes.push({
      text: `当てはまりやすいと答えた状況は、${ranked
        .map((option) => `「${option.label}」（${counts[option.value]}問）`)
        .join("、")}でした。同じ質問でも、相手や場面が変わると答えが分かれやすい可能性があります。`,
      basis: ranked.map((option) => `${option.label} ${counts[option.value]}`).join(" ／ "),
    });
  }
  return notes;
}

function assertFacetsOf(answers: Answers, mode: Mode): AssertFacetRow[] {
  if (!open(mode, "honestyDetail")) return [];
  const items = itemsOf("assert", mode);
  const rows = ASSERT_FACETS.map((def) => {
    const group = items.filter((item) => item.facet === def.key);
    if (group.length < ASSERT_FACET_MIN_ITEMS) return null;
    const score = scoreItems(group, answers, ASSERT_FACET_MIN_ITEMS).score;
    return { def, score, side: sideOf(score) };
  }).filter((row): row is AssertFacetRow => row !== null);
  return rows;
}

export function buildReport(answers: Answers, mode: Mode = "complete", followups: Followups = {}): Report {
  const results = scoreAll(answers, mode);
  const type = typeOf(results);
  const scoreOf = (key: MeasureKey) => results[key].score;
  const measured = (key: MeasureKey) => results[key].total > 0;

  const held = BIPOLARS.filter((def) => measured(def.key) && scoreOf(def.key) === null).map((def) => def.title);
  const unmeasured = [
    ...BIPOLARS.filter((def) => !measured(def.key)).map((def) => def.title),
    ...(VALUES.some((value) => !measured(value.key)) ? ["大切にしていること（価値観）"] : []),
  ];

  const top = clearest(ALL_BIPOLAR, results);
  const summary: Finding[] = [];
  if (top.length > 0) {
    const picked = top.slice(0, 3).map((key) => bipolarDef(key));
    summary.push({
      text: `回答の中では、${picked
        .map((def) => `「${poleOf(def, sideOf(scoreOf(def.key)))!.label}」`)
        .join("、")}という傾向が比較的はっきり出ています。`,
      basis: picked.map((def) => basisOf(def, scoreOf(def.key))).join(" ／ "),
    });
  }
  const middles = BIPOLARS.filter((def) => sideOf(scoreOf(def.key)) === "mid");
  if (middles.length > 0) {
    summary.push({
      text: `${middles
        .slice(0, 3)
        .map((def) => `「${def.title.replace(/^[A-Z]／[A-Z]：/, "")}」`)
        .join("、")}などは中央付近で、どちらか一方に決めず、場面によって使い分けている可能性があります。`,
      basis: middles.slice(0, 3).map((def) => basisOf(def, scoreOf(def.key))).join(" ／ "),
    });
  }
  if (summary.length === 0) {
    summary.push({ text: "回答が少ないため、まだ要約を作れません。", basis: "未回答・判断できない回答が多い" });
  }

  const axes: AxisRow[] = AXES.map((def) => {
    const score = scoreOf(def.key);
    const pole = poleOf(def, sideOf(score));
    return {
      def,
      score,
      side: sideOf(score),
      degree: score === null ? null : degreeOf(score),
      text: describe(def, score),
      strength: pole?.strength,
      strain: pole?.strain,
      evidence: evidenceOf(def, answers, sideOf(score), mode),
    };
  });

  const pairs: PairReport[] = PAIRS.flatMap((pair) => {
    const [a, b] = pair.axes.map((key) => AXES.find((axis) => axis.key === key)!);
    const la = lettersOf(a, scoreOf(a.key));
    const lb = lettersOf(b, scoreOf(b.key));
    if (!la || !lb) return [];
    return [
      {
        title: pair.title,
        styles: la.flatMap((x) => lb.map((y) => pair.styles[x + y])),
        basis: `${basisOf(a, scoreOf(a.key))} ／ ${basisOf(b, scoreOf(b.key))}`,
      },
    ];
  });

  const thinking: Finding[] = open(mode, "decision")
    ? (["SN", "TF", "JP"] as const).map((key) => ({
        text: describe(bipolarDef(key), scoreOf(key)),
        basis: basisOf(bipolarDef(key), scoreOf(key)),
      }))
    : [];

  const people: Finding[] = (["EI", "conversation", "initiative", "affection", "assert"] as const)
    .filter(measured)
    .map((key) => ({ text: describe(bipolarDef(key), scoreOf(key)), basis: basisOf(bipolarDef(key), scoreOf(key)) }));

  const strengths = top.slice(0, 5).map((key) =>
    finding(bipolarDef(key), results, (pole) => `${pole.strength}で力を発揮しやすいと考えられます。`),
  );
  const strains = top.slice(0, 5).map((key) =>
    finding(bipolarDef(key), results, (pole) => `${pole.strain}では、負担を感じやすい可能性があります。`),
  );
  const misreads = top.slice(0, 4).map((key) => finding(bipolarDef(key), results, (pole) => pole.misread));

  const stress: StressFinding[] = !open(mode, "asks")
    ? []
    : top
    .filter((key) => poleOf(bipolarDef(key), sideOf(scoreOf(key)))!.stress)
    .slice(0, 4)
    .map((key) => {
      const def = bipolarDef(key);
      const pole = poleOf(def, sideOf(scoreOf(key)))!;
      return { text: pole.stress!, recover: pole.recover!, basis: basisOf(def, scoreOf(key)) };
    });

  const asks = open(mode, "asks")
    ? top.slice(0, 6).map((key) => finding(bipolarDef(key), results, (pole) => pole.ask))
    : [];

  const growth: Finding[] = !open(mode, "growth")
    ? []
    : top.slice(0, 3).map((key) => {
    const def = bipolarDef(key);
    const side = sideOf(scoreOf(key));
    const own = poleOf(def, side)!;
    const other = side === "low" ? def.high : def.low;
    return {
      text: `「${own.label}」という面が${degreeOf(scoreOf(key)!)}出ています。${other.strength}では、反対側の「${other.label}」という面が役立つこともあります。いつもの強みはそのままに、必要な場面で少し取り入れると、選べる行動が増えます。`,
      basis: basisOf(def, scoreOf(key)),
    };
  });

  const sceneTable = AXES.map((def) => {
    const scores = sceneScores(def.key, answers, mode);
    const cells: Partial<Record<Scene, Side>> = {};
    for (const scene of COMPARE_SCENES) {
      const side = sideOf(scores[scene] ?? null);
      if (side) cells[scene] = side;
    }
    return { def, cells };
  });

  const sceneNotes: Finding[] = !open(mode, "scenes")
    ? []
    : sceneGaps(ALL_BIPOLAR, answers, mode)
    .slice(0, 6)
    .map((gap) => {
      const def = bipolarDef(gap.measure as BipolarKey);
      return {
        text: `「${def.title}」は、${sceneLabel(gap.high)}の質問では「${def.high.label}」寄り、${sceneLabel(gap.low)}の質問では「${def.low.label}」寄りの回答でした。嘘や矛盾ではなく、場面によって行動が変わっている可能性があります。`,
        basis: `${sceneLabel(gap.high)}と${sceneLabel(gap.low)}の質問の回答の違い`,
      };
    });

  const combos: Finding[] = COMBOS.filter((rule) =>
    Object.entries(rule.when).every(([key, side]) => sideOf(scoreOf(key as BipolarKey)) === side),
  ).map((rule) => ({
    text: rule.text,
    basis: Object.keys(rule.when)
      .map((key) => basisOf(bipolarDef(key as BipolarKey), scoreOf(key as BipolarKey)))
      .join(" ／ "),
  }));

  const actions = top.slice(0, 5).map((key) => finding(bipolarDef(key), results, (pole) => pole.action));

  const values = VALUES.map((value) => ({
    label: value.label,
    score: scoreOf(value.key),
    measured: measured(value.key),
  })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const states = STATES.map((state) => ({ label: state.label, score: scoreOf(state.key) }));

  const stateNotes: Finding[] = [];
  const fatigue = scoreOf("fatigue");
  if (sideOf(fatigue) === "high") {
    const affected = (["alone", "EI"] as const).filter((key) => sideOf(scoreOf(key)) === "high");
    stateNotes.push({
      text:
        affected.length > 0
          ? "最近の疲れや気分の沈みを感じているという回答がありました。一人の時間を求める結果には、性格の傾向だけでなく、今の疲れが影響している可能性もあります。"
          : "最近の疲れや気分の沈みを感じているという回答がありました。疲れているときは、ふだんと違う答え方になることがあります。落ち着いた時期にもう一度答えて比べてみるのも一つの方法です。",
      basis: `いまの状態：最近の疲れや気分の沈み（尺度上の傾向スコア ${displayScore(fatigue!)}）`,
    });
  }

  const domains: DomainReport[] = !open(mode, "match")
    ? []
    : DOMAINS.map((domain) => {
    const keys = clearest(domain.measures, results).slice(0, 3);
    const defs = keys.map((key) => bipolarDef(key));
    const complement = domain.complementAxes
      .filter((key) => {
        const side = sideOf(scoreOf(key));
        return side === "low" || side === "high";
      })
      .map((key) => {
        const def = bipolarDef(key);
        const side = sideOf(scoreOf(key));
        const own = poleOf(def, side)!;
        const other = side === "low" ? def.high : def.low;
        return {
          text: `${other.label}人。${other.strength}を得意としやすく、${own.strength}を得意とするあなたと役割を分け合えます。`,
          basis: basisOf(def, scoreOf(key)),
        };
      });
    const missing = domain.measures.filter((key) => !measured(key));
    return {
      key: domain.key,
      label: domain.label,
      note: [
        "一人分の回答からの相手像の提案です。実際の二人の相性を測定したものではありません。MBTIタイプや性別だけでは決めていません。",
        domain.note,
        missing.length > 0
          ? `この段階では「${missing.map((key) => bipolarDef(key).title).join("」「")}」を測っていないため、それ以外の項目から考えています。`
          : undefined,
      ]
        .filter(Boolean)
        .join(" ") || undefined,
      comfortable: defs.map((def) => finding(def, results, (pole) => pole.fit)),
      complement,
      friction: defs.map((def) => finding(def, results, (pole) => pole.clash)),
      reasons: defs.map((def) =>
        finding(
          def,
          results,
          (pole) => `あなたには「${pole.label}」という傾向があるため、${pole.fit}といると無理をせずに過ごしやすいと考えられます。`,
        ),
      ),
      cautions: defs.map((def) => finding(def, results, (pole) => pole.caution)),
      tips: defs.map((def) => finding(def, results, (pole) => pole.tip)),
      checks: defs.map((def) => finding(def, results, (pole) => pole.check)),
    };
  });

  const sceneTableRows = open(mode, "scenes") ? sceneTable : [];
  const available = STAGES.filter((stage) => stage.tier <= stageOf(mode).tier).flatMap((stage) => stage.analyses);

  return {
    mode,
    results,
    type,
    held,
    unmeasured,
    completed: completedStage(answers),
    facets: open(mode, "facets") ? facetsOf(answers, mode) : [],
    assertFacets: assertFacetsOf(answers, mode),
    summary,
    axes,
    pairs,
    thinking,
    people,
    strengths,
    strains,
    stress,
    misreads,
    asks,
    growth,
    changes: open(mode, "changes") ? changeNotes(answers, mode) : [],
    quality: qualityOf(answers, results, mode),
    sceneTable: sceneTableRows,
    sceneNotes: open(mode, "scenes") ? [...sceneNotes, ...followupNotes(answers, followups)] : followupNotes(answers, followups),
    followupNotes: followupNotes(answers, followups),
    combos,
    actions,
    values,
    states,
    stateNotes,
    domains,
    breakdown: breakdownOf(results),
    formula: SCORE_FORMULA,
    available,
  };
}

export function answeredBase(answers: Answers, mode: Mode) {
  return baseItemsOf(mode).filter((item) => answers[item.id]?.version === item.version).length;
}
