import { AXES, BIPOLARS, COMPARE_TOPICS, TRAITS, VALUES, type BipolarDef } from "@/lib/mbti/content";
import type { MeasureKey } from "@/lib/mbti/items";
import { poleOf, sideText } from "@/lib/mbti/report";
import { displayScore, sideOf, type Results } from "@/lib/mbti/scoring";

/** 共有コードに入れるのは項目ごとのスコアだけ。個々の回答と「いまの状態」は入れない。 */
export const SHARED_KEYS: MeasureKey[] = [
  ...BIPOLARS.map((def) => def.key),
  ...VALUES.map((value) => value.key),
];

const PREFIX = "NGX1-";
export const MAX_NAME_LENGTH = 20;

export type Scores = Partial<Record<MeasureKey, number | null>>;
export type SharedProfile = { name: string; scores: Scores };

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string) {
  const base64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function scoresOf(results: Results): Scores {
  return Object.fromEntries(SHARED_KEYS.map((key) => [key, results[key].score])) as Scores;
}

export function encodeProfile(name: string, scores: Scores) {
  const payload = {
    v: 1,
    n: name.trim().slice(0, MAX_NAME_LENGTH),
    s: SHARED_KEYS.map((key) => {
      const score = scores[key];
      return typeof score === "number" ? displayScore(score) : null;
    }),
  };
  return PREFIX + toBase64Url(JSON.stringify(payload));
}

export function decodeProfile(code: string): SharedProfile | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  try {
    const payload = JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length)));
    if (payload?.v !== 1 || !Array.isArray(payload.s) || payload.s.length !== SHARED_KEYS.length) return null;
    const scores: Scores = {};
    for (const [index, key] of SHARED_KEYS.entries()) {
      const value = payload.s[index];
      if (value === null) scores[key] = null;
      else if (typeof value === "number" && value >= 0 && value <= 100) scores[key] = value;
      else return null;
    }
    const name = typeof payload.n === "string" ? payload.n.slice(0, MAX_NAME_LENGTH) : "";
    return { name, scores };
  } catch {
    return null;
  }
}

export type TopicComparison = { label: string; common: string[]; differences: string[]; talks: string[] };

export type Comparison = {
  values: TopicComparison;
  topics: TopicComparison[];
  complements: string[];
  adjustments: string[];
};

const CLOSE_GAP = 20;
const LARGE_GAP = 40;

function compareMeasure(def: BipolarDef, mine: Scores, theirs: Scores, partner: string) {
  const a = mine[def.key];
  const b = theirs[def.key];
  if (typeof a !== "number" || typeof b !== "number") {
    return { common: null, difference: `${def.title}：どちらかの回答が保留のため、比べていません。`, talk: null };
  }
  const sa = sideOf(a);
  const sb = sideOf(b);
  if (sa === sb || Math.abs(a - b) < CLOSE_GAP) {
    const label = sa === "mid" || sa !== sb ? "両方の傾向があり、近い位置" : `「${poleOf(def, sa)!.label}」傾向`;
    return { common: `${def.title}：二人とも${label}です。`, difference: null, talk: null };
  }
  return {
    common: null,
    difference: `${def.title}：あなたは${sideText(def, a)}、${partner}は${sideText(def, b)}です。`,
    talk: def.talk,
  };
}

export function compareProfiles(mine: Scores, theirs: Scores, partnerName: string): Comparison {
  const partner = partnerName.trim() || "相手";

  const values: TopicComparison = { label: "共通する価値観", common: [], differences: [], talks: [] };
  for (const value of VALUES) {
    const a = mine[value.key];
    const b = theirs[value.key];
    if (typeof a !== "number" || typeof b !== "number") continue;
    if (a >= 75 && b >= 75) values.common.push(`二人とも「${value.label}」を大切にしています。`);
    else if (Math.abs(a - b) >= 50) {
      values.differences.push(
        `「${value.label}」を大切にする度合いに違いがあります（あなた ${displayScore(a)}、${partner} ${displayScore(b)}）。`,
      );
    }
  }
  if (values.differences.length > 0) {
    values.talks.push("それぞれが何を大切にしたいかを、休日の過ごし方やお金の使い方など、具体的な場面で話してみる");
  }

  const topics = COMPARE_TOPICS.map((topic) => {
    const result: TopicComparison = { label: topic.label, common: [], differences: [], talks: [] };
    for (const key of topic.measures) {
      const def = BIPOLARS.find((item) => item.key === key)!;
      const compared = compareMeasure(def, mine, theirs, partner);
      if (compared.common) result.common.push(compared.common);
      if (compared.difference) result.differences.push(compared.difference);
      if (compared.talk) result.talks.push(compared.talk);
    }
    return result;
  });

  const complements: string[] = [];
  for (const def of AXES) {
    const a = mine[def.key];
    const b = theirs[def.key];
    if (typeof a !== "number" || typeof b !== "number") continue;
    const sa = sideOf(a);
    const sb = sideOf(b);
    if ((sa === "low" && sb === "high") || (sa === "high" && sb === "low")) {
      complements.push(
        `${def.title}：あなたは${poleOf(def, sa)!.strength}、${partner}は${poleOf(def, sb)!.strength}で力を出しやすく、役割を分け合えます。`,
      );
    }
  }

  const adjustments: string[] = [];
  for (const def of TRAITS) {
    const a = mine[def.key];
    const b = theirs[def.key];
    if (typeof a !== "number" || typeof b !== "number") continue;
    if (Math.abs(a - b) >= LARGE_GAP) adjustments.push(`${def.title}：${def.talk}`);
  }

  return { values, topics, complements, adjustments };
}
