export type TestId = "confidence" | "dissociation";

export const TEST_IDS: TestId[] = ["confidence", "dissociation"];

export type AgeGroup = "10s" | "20s" | "30s" | "40s" | "50s" | "60s" | "none";

export const AGE_GROUPS: { id: AgeGroup; label: string }[] = [
  { id: "10s", label: "10代" },
  { id: "20s", label: "20代" },
  { id: "30s", label: "30代" },
  { id: "40s", label: "40代" },
  { id: "50s", label: "50代" },
  { id: "60s", label: "60代以上" },
  { id: "none", label: "答えない" },
];

export function isAgeGroup(value: unknown): value is AgeGroup {
  return AGE_GROUPS.some((group) => group.id === value);
}

export function ageLabel(age: AgeGroup) {
  return AGE_GROUPS.find((group) => group.id === age)?.label ?? "";
}

export type Option = { value: number; label: string };

export type Item = { text: string; section: string; reverse?: boolean };

export type ScoreKey = string;

export type ScoreDef = {
  key: ScoreKey;
  label: string;
  min: number;
  max: number;
  digits: number;
};

export type TestDef = {
  id: TestId;
  title: string;
  lead: string;
  instructions: string[];
  options: Option[];
  items: Item[];
  scores: ScoreDef[];
};

const AGREE: Option[] = [
  { value: 4, label: "強くそう思う" },
  { value: 3, label: "そう思う" },
  { value: 2, label: "そう思わない" },
  { value: 1, label: "強くそう思わない" },
];

const PERCENT: Option[] = Array.from({ length: 11 }, (_, index) => ({
  value: index * 10,
  label: `${index * 10}%`,
}));

const RSES_SECTION = "自分全体について";

const RSES_ITEMS: Item[] = [
  { text: "今の自分に、だいたい満足している。", section: RSES_SECTION },
  { text: "自分はまったくダメだと思うときがある。", section: RSES_SECTION, reverse: true },
  { text: "自分には、良いところがいくつもあると思う。", section: RSES_SECTION },
  { text: "自分は、たいていの人と同じくらいには物事ができる。", section: RSES_SECTION },
  { text: "自分には、誇れるところがあまりないと思う。", section: RSES_SECTION, reverse: true },
  { text: "自分は役に立たないと、強く感じるときがある。", section: RSES_SECTION, reverse: true },
  { text: "自分は、少なくとも他の人と同じくらい価値がある人間だと思う。", section: RSES_SECTION },
  { text: "もっと自分を認められたらいいのに、と思う。", section: RSES_SECTION, reverse: true },
  { text: "自分は何をしてもうまくいかない人間だと、よく思ってしまう。", section: RSES_SECTION, reverse: true },
  { text: "自分のことを、前向きに受け止めている。", section: RSES_SECTION },
];

export const DOMAINS: { key: ScoreKey; label: string; items: string[] }[] = [
  {
    key: "work",
    label: "仕事・勉強",
    items: [
      "任されたことは、最後までやり遂げられると思う。",
      "自分の力は、周りの人にも通用すると思う。",
      "初めてのことでも、調べれば何とかできると思う。",
    ],
  },
  {
    key: "people",
    label: "人間関係",
    items: [
      "初めて会う人とも、自然に話せると思う。",
      "周りの人から、一緒にいて楽しいと思われていると思う。",
      "意見が違う相手にも、関係を崩さずに自分の考えを伝えられる。",
    ],
  },
  {
    key: "speaking",
    label: "発言・人前で話すこと",
    items: [
      "大勢の前でも、落ち着いて話せると思う。",
      "話し合いの場で、自分から意見を言える。",
      "自分の考えは、相手にきちんと伝わっていると思う。",
    ],
  },
  {
    key: "looks",
    label: "見た目",
    items: [
      "自分の見た目に、おおむね満足している。",
      "自分に合った身だしなみが分かっていると思う。",
      "人前に出るとき、自分の外見を気にしすぎずにいられる。",
    ],
  },
  {
    key: "money",
    label: "お金・暮らし",
    items: [
      "お金のやりくりを、計画的にできていると思う。",
      "思いがけない出費があっても、何とかできると思う。",
      "暮らしに必要なことは、自分でこなせると思う。",
    ],
  },
  {
    key: "health",
    label: "体力・健康",
    items: [
      "自分の体力に自信がある。",
      "自分の体調は、自分で整えられると思う。",
      "体を動かす場面で、周りについていけると思う。",
    ],
  },
  {
    key: "decision",
    label: "決断・判断",
    items: [
      "迷ったときも、最後は自分で決められる。",
      "自分の判断は、だいたい正しいと思う。",
      "一度決めたことは、人に何か言われても簡単には揺らがない。",
    ],
  },
  {
    key: "challenge",
    label: "新しいこと・挑戦",
    items: [
      "新しいことを始めるとき、うまくやれると思える。",
      "失敗しても、またやり直せると思う。",
      "慣れない環境でも、時間をかければなじめると思う。",
    ],
  },
];

const DES_SECTION = "ふだんの体験";

const DES_ITEMS: Item[] = [
  "どこかへ向かう途中のことを、あとから思い出せない。",
  "人の話を聞いているはずなのに、気づくと一部が頭に入っていなかった。",
  "気づくとある場所にいて、どうやってそこに来たのか分からない。",
  "自分で選んだ覚えのない身なりをしていることに気づく。",
  "手に入れた覚えのないものが、身の回りにある。",
  "会ったことのない人から、知り合いのように話しかけられたり、別の名前で呼ばれたりする。",
  "自分のことを、少し離れたところから他人のように眺めている感じがする。",
  "よく知っている人なのに、誰だか分からなかったことがあると人から言われる。",
  "人生の大事な出来事を、ほとんど覚えていない。",
  "本当のことを言ったつもりなのに、嘘をついたと責められる。",
  "自分の姿を見ても、それが自分だと感じられない。",
  "周りの人や世界が、現実ではないように感じる。",
  "自分の体が、自分のものではないように感じる。",
  "昔の出来事を、今まさに起きているかのように生々しく思い出す。",
  "覚えている出来事が、本当にあったのか夢だったのか分からなくなる。",
  "よく知っている場所なのに、初めて来た場所のように感じる。",
  "何かに見入っていると、周りで起きていることに気づかなくなる。",
  "空想に入り込み、それが本当に自分に起きているように感じる。",
  "痛みを感じないようにすることができる。",
  "ぼんやりしているうちに、時間がたっていたことに気づかない。",
  "ひとりのとき、声に出して自分と話す。",
  "場面によって自分があまりに違い、別の二人の人間のように感じる。",
  "ある場面では、ふだん苦手なことが驚くほど自然にできる。",
  "あることを実際にしたのか、しようと思っただけなのか、区別がつかない。",
  "自分がした覚えのないことを、自分がしたと分かる跡が残っている。",
  "自分で書いたり作ったりしたはずなのに、覚えのないものが見つかる。",
  "頭の中で、何かをしろと命じたり、自分の行動に口を出したりする声がする。",
  "周りの人や物事が、遠く、またはかすんで感じられる。",
].map((text) => ({ text, section: DES_SECTION }));

export const DES_SUBSCALES: { key: ScoreKey; label: string; items: number[] }[] = [
  { key: "amnesia", label: "記憶の抜け（健忘）", items: [3, 4, 5, 8, 25, 26] },
  { key: "depersonalization", label: "現実感の薄れ（離人・現実感喪失）", items: [7, 11, 12, 13, 27, 28] },
  { key: "absorption", label: "のめり込み（没入）", items: [2, 14, 15, 17, 18, 20] },
];

export const TESTS: Record<TestId, TestDef> = {
  confidence: {
    id: "confidence",
    title: "自信度診断",
    lead: "自分全体への自信（自尊感情）と、仕事・人間関係・見た目・お金など8つの分野ごとの自信を測ります。",
    instructions: [
      "ふだんの自分に、いちばん近いものを選んでください。",
      "深く考え込まず、最初に浮かんだ答えで構いません。",
      "前半の10問は、研究で広く使われている「ローゼンバーグ自尊感情尺度」の内容を、意味を変えずに分かりやすい言葉に言い換えたものです。",
    ],
    options: AGREE,
    items: [
      ...RSES_ITEMS,
      ...DOMAINS.flatMap((domain) =>
        domain.items.map((text) => ({ text, section: domain.label })),
      ),
    ],
    scores: [
      { key: "selfEsteem", label: "自尊感情", min: 10, max: 40, digits: 1 },
      ...DOMAINS.map((domain) => ({
        key: domain.key,
        label: domain.label,
        min: 1,
        max: 4,
        digits: 1,
      })),
    ],
  },
  dissociation: {
    id: "dissociation",
    title: "解離傾向チェック",
    lead: "記憶が抜ける、自分や周りが現実ではないように感じる、といった「解離」の体験がどのくらいあるかを測ります。二重人格（解離性同一症）と関係の深い体験です。",
    instructions: [
      "それぞれの体験が、ふだんの生活の中でどのくらいの割合であるかを、0%（まったくない）から100%（いつも）の間で選んでください。",
      "お酒や薬の影響を受けているときの体験は含めないでください。",
      "質問は「解離体験尺度 第2版（DES-II, Carlson & Putnam, 1993）」の内容を、意味を変えずに分かりやすい日本語に言い換えたものです。",
      "答えていてつらくなったら、途中でやめて構いません。",
    ],
    options: PERCENT,
    items: DES_ITEMS,
    scores: [
      { key: "total", label: "解離体験の合計", min: 0, max: 100, digits: 1 },
      ...DES_SUBSCALES.map((sub) => ({
        key: sub.key,
        label: sub.label,
        min: 0,
        max: 100,
        digits: 1,
      })),
    ],
  },
};

export type Scores = Record<ScoreKey, number>;

export function isCompleteAnswers(testId: TestId, answers: unknown): answers is number[] {
  const test = TESTS[testId];
  return (
    Array.isArray(answers) &&
    answers.length === test.items.length &&
    answers.every((value) => test.options.some((option) => option.value === value))
  );
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function scoreTest(testId: TestId, answers: number[]): Scores {
  if (testId === "confidence") {
    const scores: Scores = {
      selfEsteem: RSES_ITEMS.reduce(
        (sum, item, index) => sum + (item.reverse ? 5 - answers[index] : answers[index]),
        0,
      ),
    };
    DOMAINS.forEach((domain, domainIndex) => {
      const start = RSES_ITEMS.length + domainIndex * domain.items.length;
      scores[domain.key] = mean(answers.slice(start, start + domain.items.length));
    });
    return scores;
  }

  const scores: Scores = { total: mean(answers) };
  for (const sub of DES_SUBSCALES) {
    scores[sub.key] = mean(sub.items.map((number) => answers[number - 1]));
  }
  return scores;
}

export function formatScore(def: ScoreDef, value: number) {
  return value.toFixed(def.digits);
}

/** 小塩ほか（2014）の5件法換算の推定値（項目平均）を、4件法の合計点（10〜40点）に戻す。 */
export function rsesFromFivePoint(itemMean: number) {
  return ((itemMean - 3) * 3) / 4 + 2.5;
}

export type Reference = { label: string; value: number; note?: string; ages: AgeGroup[] };

export const SELF_ESTEEM_REFERENCES: Reference[] = [
  { label: "中高生（12〜18歳）", value: rsesFromFivePoint(2.88) * 10, ages: ["10s"] },
  { label: "大学生・専門学校生など", value: rsesFromFivePoint(3.08) * 10, ages: ["10s", "20s"] },
  {
    label: "社会人（18〜60歳、学生を除く）",
    value: rsesFromFivePoint(3.28) * 10,
    ages: ["20s", "30s", "40s", "50s"],
  },
  { label: "高齢者（60歳以上）", value: rsesFromFivePoint(3.37) * 10, ages: ["60s"] },
];

export const SELF_ESTEEM_SOURCE =
  "小塩真司ほか（2014）「自尊感情平均値に及ぼす年齢と調査年の影響」教育心理学研究 62巻。1980〜2013年の日本の256研究・48,927人のメタ分析による推定値を、このサイトの4段階・40点満点に換算した目安です。";

export const DISSOCIATION_REFERENCES: Reference[] = [
  {
    label: "日本の一般成人 1,029人（平均44.6歳）",
    value: 9.04,
    note: "半数は2.9以下、上位25%は10.0以上",
    ages: ["20s", "30s", "40s", "50s", "60s"],
  },
  { label: "海外の一般の人 5,916人（メタ分析）", value: 11.57, ages: [] },
  { label: "解離性障害と診断された人 3,073人（メタ分析）", value: 41.22, ages: [] },
];

export const DISSOCIATION_SOURCE =
  "日本の成人：Ikeda（2025）BMC Psychiatry 25巻。海外：van IJzendoorn & Schuengel（1996）Psychological Methods 1巻。若い人ほど点数が高めに出る傾向が報告されています。";

export type Band = { min: number; label: string; text: string };

export const DISSOCIATION_BANDS: Band[] = [
  {
    min: 0,
    label: "一般的な範囲",
    text: "一般の人によく見られる程度です。ぼんやりする、のめり込むといった体験は、多くの人にあります。",
  },
  {
    min: 12,
    label: "やや多め",
    text: "一般の平均より多めですが、多くの場合は普通の範囲に収まります。",
  },
  {
    min: 20,
    label: "多め",
    text: "解離の体験がはっきりある程度です。日常生活で困っていることがあれば、専門家に相談すると整理しやすくなります。",
  },
  {
    min: 30,
    label: "かなり多い",
    text: "解離性の障害がある人に見られる程度の体験があります。病気かどうかはこの点数だけでは決まらないため、精神科や心療内科で相談することをおすすめします。",
  },
  {
    min: 45,
    label: "非常に多い",
    text: "解離性同一症などで見られることが多い水準です。病気かどうかはこの点数だけでは決まりませんが、精神科や心療内科で詳しく話を聞いてもらうことを強くおすすめします。",
  },
];

export function dissociationBand(total: number): Band {
  return [...DISSOCIATION_BANDS].reverse().find((band) => total >= band.min)!;
}

export const BAND_SOURCE =
  "区分は、原著者が専門的な評価をすすめる30点（Carlson & Putnam, 1993）と、その下の段階を加えた NovoPsych の目安（Leeds ほか 2022、Schimmenti ほか 2016 に基づく）によります。";

export type SelfEsteemLevel = { label: string; text: string };

export function selfEsteemLevel(score: number): SelfEsteemLevel {
  const adult = SELF_ESTEEM_REFERENCES[2].value;
  if (score >= adult + 5) {
    return { label: "高め", text: "自分を肯定的に受け止められている状態です。" };
  }
  if (score >= adult - 3) {
    return { label: "平均的", text: "日本の平均に近い、ごく一般的な水準です。" };
  }
  if (score >= adult - 8) {
    return {
      label: "やや低め",
      text: "自分に厳しく評価しがちな状態です。日本では、特に若い世代で低めに出やすいことが知られています。",
    };
  }
  return {
    label: "低め",
    text: "自分をかなり厳しく評価している状態です。落ち込みが続いてつらいときは、身近な人や専門家に相談してください。",
  };
}

export const MIN_GROUP_SIZE = 5;

export type StatEntry = { age: AgeGroup; scores: Scores; at: string };

export type GroupStats = { n: number; means: Scores };

export type TestStats = { all: GroupStats; byAge: Partial<Record<AgeGroup, GroupStats>> };

export function aggregate(testId: TestId, entries: StatEntry[]): TestStats {
  const keys = TESTS[testId].scores.map((score) => score.key);
  function summarize(list: StatEntry[]): GroupStats {
    const means: Scores = {};
    if (list.length >= MIN_GROUP_SIZE) {
      for (const key of keys) means[key] = mean(list.map((entry) => entry.scores[key]));
    }
    return { n: list.length, means };
  }
  const byAge: TestStats["byAge"] = {};
  for (const group of AGE_GROUPS) {
    if (group.id === "none") continue;
    const list = entries.filter((entry) => entry.age === group.id);
    if (list.length > 0) byAge[group.id] = summarize(list);
  }
  return { all: summarize(entries), byAge };
}
