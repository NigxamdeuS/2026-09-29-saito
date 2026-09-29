export const axes = {
  tempo: { name: "速さ", plus: "先に動く", minus: "置いてから動く" },
  stake: { name: "誰のため", plus: "自分の側を守る", minus: "相手の側に寄る" },
  truth: { name: "言葉", plus: "ずれを言葉にする", minus: "場を壊さない" },
  risk: { name: "振れ幅", plus: "振れ幅を取る", minus: "確実な方を残す" },
  rule: { name: "線", plus: "決めた線を守る", minus: "状況で線を動かす" },
  horizon: { name: "時間", plus: "あとの自分を優先する", minus: "今の負担を下げる" },
  feel: { name: "根拠", plus: "感覚を先に採る", minus: "説明できるまで保留する" },
  show: { name: "見え方", plus: "外に出す", minus: "内に置く" },
} as const;

export type AxisId = keyof typeof axes;
export const axisOrder = Object.keys(axes) as AxisId[];

export const contexts = {
  work: { label: "仕事", hint: "役割があるとき" },
  close: { label: "親しい人", hint: "関係が続く相手" },
  public: { label: "人前", hint: "あとで評価が残る場所" },
  money: { label: "お金", hint: "損得が数字になるとき" },
  alone: { label: "一人", hint: "誰にも説明しなくていいとき" },
} as const;

export type ContextId = keyof typeof contexts;
export const contextOrder = Object.keys(contexts) as ContextId[];

export const families = {
  unfinished: {
    label: "未完成",
    primary: "tempo",
    plus: "出してから直す",
    minus: "整うまで止める",
  },
  contradict: {
    label: "誤り",
    primary: "truth",
    plus: "誤りをその場で正す",
    minus: "誤りを表に出さない",
  },
  favor: {
    label: "割り込み",
    primary: "stake",
    plus: "自分の予定を守る",
    minus: "予定をずらして受ける",
  },
  bet: {
    label: "賭け",
    primary: "risk",
    plus: "振れ幅を取る",
    minus: "確実な方を残す",
  },
  bend: {
    label: "例外",
    primary: "rule",
    plus: "決めた線を守る",
    minus: "状況で線を動かす",
  },
  later: {
    label: "先送り",
    primary: "horizon",
    plus: "あとの自分を優先する",
    minus: "今の負担を下げる",
  },
  hunch: {
    label: "違和感",
    primary: "feel",
    plus: "感覚を先に採る",
    minus: "説明できるまで保留する",
  },
  credit: {
    label: "寄与",
    primary: "show",
    plus: "寄与を言葉にする",
    minus: "評価は相手に任せる",
  },
  lead: {
    label: "進行",
    primary: "show",
    plus: "自分で決めて進める",
    minus: "決める役を持たない",
  },
  exit: {
    label: "引き際",
    primary: "risk",
    plus: "挽回を狙って残る",
    minus: "損を確定して引く",
  },
  secret: {
    label: "伏せること",
    primary: "show",
    plus: "伏せずに出す",
    minus: "伏せたままにする",
  },
  lend: {
    label: "貸す線",
    primary: "rule",
    plus: "線を守って出さない",
    minus: "線を動かして出す",
  },
  chase: {
    label: "沈黙",
    primary: "tempo",
    plus: "自分から追う",
    minus: "相手の番として待つ",
  },
  apology: {
    label: "謝罪",
    primary: "horizon",
    plus: "範囲を整えてから",
    minus: "まず謝って軽くする",
  },
  decline: {
    label: "依頼",
    primary: "stake",
    plus: "断る",
    minus: "受ける",
  },
  reopen: {
    label: "閉じた決定",
    primary: "feel",
    plus: "感覚を採って開ける",
    minus: "感覚では動かさない",
  },
  air: {
    label: "空気",
    primary: "truth",
    plus: "ずれを言葉にする",
    minus: "合わせて持ち帰る",
  },
  plan: {
    label: "手順",
    primary: "rule",
    plus: "決めた手順を守る",
    minus: "その場で手順を捨てる",
  },
  costly: {
    label: "助ける代償",
    primary: "stake",
    plus: "自分の限度で止める",
    minus: "損でも助ける",
  },
  face: {
    label: "反応",
    primary: "show",
    plus: "反応を外に出す",
    minus: "平らにして持ち帰る",
  },
} as const;

export type FamilyId = keyof typeof families;
export const familyOrder = Object.keys(families) as FamilyId[];

export type Pole = "plus" | "mid" | "minus";

export type AnswerRecord = {
  pole: Pole;
  updatedAt: string;
};

export type Journal = {
  version: 1;
  answers: Record<string, AnswerRecord>;
  deferred: string[];
};

export const SESSION_SIZE = 5;
export const TOTAL_QUESTIONS = familyOrder.length * contextOrder.length;

export function emptyJournal(): Journal {
  return { version: 1, answers: {}, deferred: [] };
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
