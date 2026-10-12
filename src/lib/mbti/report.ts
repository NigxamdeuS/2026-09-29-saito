import {
  AXES,
  BIPOLARS,
  bipolarDef,
  COMBOS,
  DOMAINS,
  PAIRS,
  STATES,
  VALUES,
  type AxisDef,
  type BipolarDef,
  type DomainKey,
  type PairStyle,
  type Pole,
  type Side,
} from "@/lib/mbti/content";
import {
  ANSWER_OPTIONS,
  BASE_ITEMS,
  itemsOf,
  type BipolarKey,
  type MeasureKey,
  type Scene,
} from "@/lib/mbti/items";
import {
  displayScore,
  sceneGaps,
  sceneLabel,
  sceneScores,
  scoreAll,
  scoreItems,
  sideOf,
  typeOf,
  type Answers,
  type Results,
  type TypeResult,
} from "@/lib/mbti/scoring";

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

export type Report = {
  results: Results;
  type: TypeResult;
  held: string[];
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
  quality: Quality;
  sceneTable: { def: AxisDef; cells: Partial<Record<Scene, Side>> }[];
  sceneNotes: Finding[];
  combos: Finding[];
  actions: Finding[];
  values: { label: string; score: number | null }[];
  states: { label: string; score: number | null }[];
  stateNotes: Finding[];
  domains: DomainReport[];
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

function answerLabel(value: number) {
  return ANSWER_OPTIONS.find((option) => option.value === value)!.label;
}

/** 軸のスコアを、どの質問への回答が動かしたか。寄っている側を押した回答を強い順に。 */
function evidenceOf(def: AxisDef, answers: Answers, side: Side | null): Evidence[] {
  if (side === null) return [];
  const rows = itemsOf(def.key).flatMap((item) => {
    const answer = answers[item.id];
    if (!answer || answer.version !== item.version || answer.value === "na") return [];
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

function qualityOf(answers: Answers, results: Results): Quality {
  let na = 0;
  let neutral = 0;
  let sum = 0;
  let numeric = 0;
  for (const item of BASE_ITEMS) {
    const answer = answers[item.id];
    if (!answer || answer.version !== item.version) continue;
    if (answer.value === "na") {
      na += 1;
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
        basis: `「どちらともいえない」${neutral}問／回答${numeric}問`,
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
  if (na >= 10) {
    notes.push({
      text: "「判断できない／経験がない」の回答が多めでした。その質問は採点に入れていないため、残りの質問だけで出した結果になっています。経験の少ない場面については、結果を控えめに受け取ってください。",
      basis: `「判断できない／経験がない」${na}問`,
    });
  }
  for (const def of AXES) {
    if (results[def.key].score === null) continue;
    const items = itemsOf(def.key);
    const forward = scoreItems(items.filter((item) => item.direction === 1), answers, 3).score;
    const reverse = scoreItems(items.filter((item) => item.direction === -1), answers, 3).score;
    if (forward === null || reverse === null || Math.abs(forward - reverse) < 40) continue;
    notes.push({
      text: `「${def.title}」では、言い方が逆向きの質問どうしで、答えの向きがそろっていませんでした。質問の受け取り方や、場面による違いが影響している可能性があります。この軸の結果は控えめに受け取ってください。`,
      basis: `${def.letters[1]}側を聞く質問だけのスコア ${displayScore(forward)} ／ ${def.letters[0]}側を聞く質問だけのスコア ${displayScore(reverse)}`,
    });
  }
  const answered = BASE_ITEMS.filter((item) => answers[item.id]?.version === item.version).length;
  return { answered, total: BASE_ITEMS.length, na, neutral, notes };
}

export function buildReport(answers: Answers): Report {
  const results = scoreAll(answers);
  const type = typeOf(results);
  const scoreOf = (key: MeasureKey) => results[key].score;

  const held = BIPOLARS.filter((def) => scoreOf(def.key) === null).map((def) => def.title);

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
      evidence: evidenceOf(def, answers, sideOf(score)),
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

  const thinking: Finding[] = (["SN", "TF", "JP"] as const).map((key) => ({
    text: describe(bipolarDef(key), scoreOf(key)),
    basis: basisOf(bipolarDef(key), scoreOf(key)),
  }));

  const people: Finding[] = (["EI", "conversation", "initiative", "affection", "assert"] as const).map(
    (key) => ({ text: describe(bipolarDef(key), scoreOf(key)), basis: basisOf(bipolarDef(key), scoreOf(key)) }),
  );

  const strengths = top.slice(0, 5).map((key) =>
    finding(bipolarDef(key), results, (pole) => `${pole.strength}で力を発揮しやすいと考えられます。`),
  );
  const strains = top.slice(0, 5).map((key) =>
    finding(bipolarDef(key), results, (pole) => `${pole.strain}では、負担を感じやすい可能性があります。`),
  );
  const misreads = top.slice(0, 4).map((key) => finding(bipolarDef(key), results, (pole) => pole.misread));

  const stress: StressFinding[] = top
    .filter((key) => poleOf(bipolarDef(key), sideOf(scoreOf(key)))!.stress)
    .slice(0, 4)
    .map((key) => {
      const def = bipolarDef(key);
      const pole = poleOf(def, sideOf(scoreOf(key)))!;
      return { text: pole.stress!, recover: pole.recover!, basis: basisOf(def, scoreOf(key)) };
    });

  const asks = top.slice(0, 6).map((key) => finding(bipolarDef(key), results, (pole) => pole.ask));

  const growth: Finding[] = top.slice(0, 3).map((key) => {
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
    const scores = sceneScores(def.key, answers);
    const cells: Partial<Record<Scene, Side>> = {};
    for (const scene of COMPARE_SCENES) {
      const side = sideOf(scores[scene] ?? null);
      if (side) cells[scene] = side;
    }
    return { def, cells };
  });

  const sceneNotes: Finding[] = sceneGaps(ALL_BIPOLAR, answers)
    .slice(0, 4)
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

  const values = VALUES.map((value) => ({ label: value.label, score: scoreOf(value.key) })).sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1),
  );
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

  const domains: DomainReport[] = DOMAINS.map((domain) => {
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
    return {
      key: domain.key,
      label: domain.label,
      note: domain.note,
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

  return {
    results,
    type,
    held,
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
    quality: qualityOf(answers, results),
    sceneTable,
    sceneNotes,
    combos,
    actions,
    values,
    states,
    stateNotes,
    domains,
  };
}

export function answeredBase(answers: Answers) {
  return BASE_ITEMS.filter((item) => answers[item.id]?.version === item.version).length;
}
