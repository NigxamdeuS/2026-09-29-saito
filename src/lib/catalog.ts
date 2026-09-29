export const axes = {
  tempo: { name: "速さ", plus: "すぐ動く", minus: "様子を見てから動く" },
  stake: { name: "誰を優先", plus: "自分を優先する", minus: "相手を優先する" },
  truth: { name: "率直さ", plus: "違和感を口にする", minus: "場の空気を守る" },
  risk: { name: "リスク", plus: "リスクを取る", minus: "確実な方を選ぶ" },
  rule: { name: "ルール", plus: "ルールを守る", minus: "状況に応じて曲げる" },
  horizon: { name: "時間軸", plus: "先のことを優先する", minus: "今の負担を減らす" },
  feel: { name: "直感", plus: "直感を優先する", minus: "根拠がそろうまで待つ" },
  show: { name: "自己表現", plus: "表に出す", minus: "内に秘める" },
} as const;

export type AxisId = keyof typeof axes;
export const axisOrder = Object.keys(axes) as AxisId[];

export const contexts = {
  work: { label: "仕事", hint: "役割を担っているとき" },
  close: { label: "親しい人", hint: "これからも付き合いが続く相手" },
  public: { label: "人前", hint: "人の目があり、評価が残る場" },
  money: { label: "お金", hint: "損得が金額で見えるとき" },
  alone: { label: "一人", hint: "誰にも説明しなくていいとき" },
} as const;

export type ContextId = keyof typeof contexts;
export const contextOrder = Object.keys(contexts) as ContextId[];

export const families = {
  unfinished: {
    label: "未完成のもの",
    primary: "tempo",
    plus: "未完成のまま出す",
    minus: "仕上がるまで出さない",
  },
  contradict: {
    label: "誰かの間違い",
    primary: "truth",
    plus: "その場で訂正する",
    minus: "表立って訂正しない",
  },
  favor: {
    label: "急な頼みごと",
    primary: "stake",
    plus: "自分の予定を守る",
    minus: "予定をずらして応じる",
  },
  bet: {
    label: "賭けるかどうか",
    primary: "risk",
    plus: "リスクを取る",
    minus: "確実な方を選ぶ",
  },
  bend: {
    label: "ルールの例外",
    primary: "rule",
    plus: "ルールを守る",
    minus: "例外を認める",
  },
  later: {
    label: "先送り",
    primary: "horizon",
    plus: "今のうちにやっておく",
    minus: "今は楽な方を選ぶ",
  },
  hunch: {
    label: "説明できない違和感",
    primary: "feel",
    plus: "直感に従う",
    minus: "根拠がなければ動かない",
  },
  credit: {
    label: "自分の貢献",
    primary: "show",
    plus: "自分の貢献を伝える",
    minus: "評価は相手に任せる",
  },
  lead: {
    label: "まとめ役",
    primary: "show",
    plus: "自分が決めて進める",
    minus: "決める役は引き受けない",
  },
  exit: {
    label: "引き際",
    primary: "risk",
    plus: "粘って巻き返しを狙う",
    minus: "損を受け入れて手を引く",
  },
  secret: {
    label: "言いにくいこと",
    primary: "show",
    plus: "隠さずに話す",
    minus: "伏せておく",
  },
  lend: {
    label: "貸し借りのルール",
    primary: "rule",
    plus: "ルールを守って貸さない",
    minus: "ルールを曲げて貸す",
  },
  chase: {
    label: "返事がないとき",
    primary: "tempo",
    plus: "自分から連絡する",
    minus: "相手の返事を待つ",
  },
  apology: {
    label: "謝り方",
    primary: "horizon",
    plus: "状況を整理してから謝る",
    minus: "まず謝る",
  },
  decline: {
    label: "頼まれごと",
    primary: "stake",
    plus: "断る",
    minus: "引き受ける",
  },
  reopen: {
    label: "決めたことの見直し",
    primary: "feel",
    plus: "直感に従って見直す",
    minus: "決めたことは動かさない",
  },
  air: {
    label: "場の空気",
    primary: "truth",
    plus: "違和感を口にする",
    minus: "空気に合わせる",
  },
  plan: {
    label: "段取り",
    primary: "rule",
    plus: "決めた手順を守る",
    minus: "その場で手順を変える",
  },
  costly: {
    label: "損をする手助け",
    primary: "stake",
    plus: "無理のない範囲にとどめる",
    minus: "損をしてでも助ける",
  },
  face: {
    label: "感情の出し方",
    primary: "show",
    plus: "感情を表に出す",
    minus: "平静を装う",
  },
} as const;

export type FamilyId = keyof typeof families;
export const familyOrder = Object.keys(families) as FamilyId[];

export type Pole = "plus" | "mid" | "minus";

export type Prediction = {
  overall: Pole;
  context: Pole;
};

export type AnswerRecord = {
  pole: Pole;
  updatedAt: string;
  prediction?: Prediction;
};

export type Retest = {
  id: string;
  pole: Pole;
  original: Pole;
  at: string;
};

export type Journal = {
  version: 1;
  answers: Record<string, AnswerRecord>;
  deferred: string[];
  retests: Retest[];
};

export const SESSION_SIZE = 5;
export const TOTAL_QUESTIONS = familyOrder.length * contextOrder.length;
export const RETEST_START = 15;
export const RETEST_EVERY = 10;

export function emptyJournal(): Journal {
  return { version: 1, answers: {}, deferred: [], retests: [] };
}

export function isPole(value: unknown): value is Pole {
  return value === "plus" || value === "mid" || value === "minus";
}

export function sortContexts(ids: ContextId[]): ContextId[] {
  return [...ids].sort(
    (a, b) => contextOrder.indexOf(a) - contextOrder.indexOf(b),
  );
}

export function joinContexts(ids: ContextId[]): string {
  return sortContexts(ids)
    .map((id) => contexts[id].label)
    .join("・");
}
