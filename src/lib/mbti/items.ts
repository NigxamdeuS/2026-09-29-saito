export type Scene = "daily" | "work" | "friends" | "close";

export const SCENES: Record<Scene, string> = {
  daily: "日常",
  work: "職場・学校",
  friends: "友人",
  close: "恋愛・親しい関係",
};

export type AxisKey = "EI" | "SN" | "TF" | "JP";
export type TraitKey =
  | "conversation"
  | "initiative"
  | "alone"
  | "contact"
  | "affection"
  | "support"
  | "conflict"
  | "assert"
  | "plans";
export type ValueKey = "stability" | "freedom" | "growth" | "connection";
export type StateKey = "fatigue" | "seekNew" | "seekClose";
export type BipolarKey = AxisKey | TraitKey;
export type MeasureKey = BipolarKey | ValueKey | StateKey;

/** 質問が聞いている内容の種類。普段の行動・好み・感じ方・考えを混ぜずに書く。 */
export type Kind = "act" | "like" | "feel" | "think";

export const KINDS: Record<Kind, string> = {
  act: "普段の行動",
  like: "好み",
  feel: "感じ方",
  think: "考え・価値観",
};

/** その質問を置いた理由。 */
export type Purpose = "core" | "facet" | "scene";

export const PURPOSES: Record<Purpose, string> = {
  core: "項目の基本の向きを測る",
  facet: "同じ軸を別の側面から確かめる",
  scene: "別の場面でも同じ傾向か確かめる（場面差の分析に使う）",
};

export type Tier = 1 | 2 | 3 | 4;

export type Item = {
  id: string;
  measure: MeasureKey;
  /** 1: 当てはまるほど尺度の高い側（軸では右の文字）へ。-1: 逆転項目。 */
  direction: 1 | -1;
  weight: number;
  scene: Scene;
  /** 質問文や採点を変えたら上げる。版が違う古い回答は使わない。 */
  version: number;
  /** この段階以上で出題する。 */
  tier: Tier;
  kind: Kind;
  purpose: Purpose;
  /** 軸・項目の中の側面。 */
  facet?: string;
  text: string;
};

type Row = [
  id: string,
  direction: 1 | -1,
  scene: Scene,
  tier: Tier,
  kind: Kind,
  purpose: Purpose,
  text: string,
  facet?: string,
  version?: number,
];

function define(measure: MeasureKey, rows: Row[]): Item[] {
  return rows.map(([id, direction, scene, tier, kind, purpose, text, facet, version]) => ({
    id,
    measure,
    direction,
    weight: 1,
    scene,
    version: version ?? 1,
    tier,
    kind,
    purpose,
    ...(facet ? { facet } : {}),
    text,
  }));
}

export const BASE_ITEMS: Item[] = [
  ...define("EI", [
    ["EI-01", 1, "daily", 1, "act", "core", "予定のない休日は、一人で過ごすことが多い。", "recharge"],
    ["EI-10", -1, "daily", 1, "feel", "core", "疲れたとき、人と会って話すことで気分が回復することが多い。", "recharge"],
    ["EI-07", 1, "close", 1, "act", "core", "親しい相手と話すときも、自分の考えは頭の中でまとめてから話すことが多い。", "process"],
    ["EI-02", -1, "daily", 1, "act", "core", "悩みごとがあるとき、人に話しながら考えを整理することが多い。", "process"],
    ["EI-09", 1, "friends", 1, "feel", "core", "友人との集まりは、大勢より少人数のほうが落ち着く。", "breadth"],
    ["EI-12", -1, "close", 1, "act", "core", "親しい相手と過ごすときは、二人きりより仲間を交えてにぎやかに過ごすことが多い。", "breadth"],
    ["EI-04", 1, "friends", 2, "like", "facet", "人と会う予定が続くと、一人で過ごす日を間に入れたくなる。", "recharge"],
    ["EI-03", -1, "friends", 2, "feel", "facet", "大勢の集まりのあとは、疲れよりも元気が出ていることが多い。", "recharge"],
    ["EI-11", 1, "work", 2, "act", "facet", "新しいことを始めるときは、人に相談するより先に一人で調べることが多い。", "process"],
    ["EI-18", -1, "work", 2, "feel", "facet", "アイデアは、人と話し合いながら出すほうが浮かびやすい。", "process"],
    ["EI-21", 1, "work", 2, "act", "facet", "大人数の場では、話の輪に入るより、近くの一人とゆっくり話すことが多い。", "breadth"],
    ["EI-08", -1, "work", 2, "feel", "facet", "職場や学校で一日誰とも話さないと、物足りなさを感じる。", "breadth"],
    ["EI-13", 1, "work", 4, "like", "scene", "職場や学校で人と話す時間が長かった日は、帰ったら一人で静かに過ごしたい。", "recharge"],
    ["EI-14", 1, "close", 4, "like", "scene", "親しい相手と過ごした楽しい日のあとでも、一人の時間で気持ちを整えたくなる。", "recharge"],
    ["EI-15", -1, "friends", 4, "feel", "scene", "気分が落ち込んだときは、友人に会いに出かけると元気になりやすい。", "recharge"],
    ["EI-06", 1, "work", 4, "act", "scene", "作業するときは、周りに人がいない静かな場所を選ぶことが多い。", "process", 2],
    ["EI-17", -1, "daily", 4, "act", "scene", "考えごとは、一人で悩むより、誰かと話しているうちにまとまることが多い。", "process"],
    ["EI-19", -1, "friends", 4, "feel", "scene", "思いついたことは、すぐ友人に話して反応を聞きたくなる。", "process"],
    ["EI-20", 1, "friends", 4, "like", "scene", "知り合いを広く増やすより、少数の人と深く付き合いたい。", "breadth"],
    ["EI-24", -1, "close", 4, "like", "scene", "親しい相手には、自分の友人や知り合いも紹介したい。", "breadth", 2],
  ]),
  ...define("SN", [
    ["SN-02", 1, "work", 1, "like", "core", "仕事や勉強では、細かい手順より先に、全体の目的を知りたい。", "detail"],
    ["SN-01", -1, "daily", 1, "like", "core", "説明を聞くときは、具体的な例や手順があるほうが分かりやすい。", "detail"],
    ["SN-03", 1, "friends", 1, "like", "core", "友人と「もし〜だったら」という想像の話をするのが好きだ。", "focus"],
    ["SN-10", -1, "daily", 1, "act", "core", "先のことより、今目の前にあることに意識が向きやすい。", "focus"],
    ["SN-08", 1, "work", 1, "feel", "core", "決まったやり方があっても、別の方法を試したくなることが多い。", "method"],
    ["SN-05", -1, "work", 1, "act", "core", "実績のあるやり方があれば、それに沿って進めることが多い。", "method"],
    ["SN-11", 1, "work", 2, "act", "facet", "資料や説明を読むときは、細かい点より全体の流れを先につかもうとする。", "detail"],
    ["SN-09", -1, "friends", 2, "like", "facet", "友人の話を聞くときは、何があったのかを順を追って知りたい。", "detail"],
    ["SN-07", 1, "close", 2, "act", "facet", "親しい相手とは、今日の出来事より、これから先のことを話すことが多い。", "focus"],
    ["SN-12", -1, "close", 2, "act", "facet", "親しい相手と予定を立てるときは、場所や時間など具体的なことから話し始める。", "focus"],
    ["SN-20", 1, "daily", 2, "feel", "facet", "料理や作業では、手順どおりより自分なりの工夫を加えたくなる。", "method"],
    ["SN-23", -1, "daily", 2, "feel", "facet", "使い慣れた道具や方法があれば、新しいものに変える必要は感じにくい。", "method"],
    ["SN-06", 1, "daily", 4, "act", "scene", "一つの出来事から、別の物事とのつながりを考えはじめることが多い。", "detail"],
    ["SN-14", -1, "work", 4, "like", "scene", "作業の指示は、何をどの順番でするかまで具体的に示してもらえるほうがやりやすい。", "detail"],
    ["SN-15", -1, "friends", 4, "act", "scene", "旅行の思い出を話すときは、行った場所や食べたものなど、具体的なことをよく覚えている。", "detail"],
    ["SN-16", 1, "daily", 4, "act", "scene", "将来どうなっていたいかを、あれこれ想像することが多い。", "focus"],
    ["SN-17", 1, "work", 4, "act", "scene", "今の作業をしながら、この先どう発展させられるかを考えることが多い。", "focus"],
    ["SN-18", -1, "friends", 4, "act", "scene", "友人との会話は、将来の話より、最近あった出来事の話が多い。", "focus"],
    ["SN-22", 1, "friends", 4, "like", "scene", "友人と遊ぶときは、行ったことのない場所や新しい遊び方を試したい。", "method"],
    ["SN-24", -1, "close", 4, "feel", "scene", "親しい相手と過ごすときは、いつもの店やいつもの過ごし方が落ち着く。", "method"],
  ]),
  ...define("TF", [
    ["TF-02", 1, "daily", 1, "think", "core", "何かを決めるとき、関わる人がどう感じるかを大きく考える。", "basis"],
    ["TF-01", -1, "work", 1, "think", "core", "意見が分かれたときは、どちらの筋が通っているかを重視して決める。", "basis"],
    ["TF-03", 1, "friends", 1, "act", "core", "友人が間違っていると思っても、伝える前に言い方や時機を考える。", "delivery"],
    ["TF-04", -1, "work", 1, "act", "core", "人に意見を伝えるときは、言い方より内容の正確さを優先することが多い。", "delivery"],
    ["TF-05", 1, "close", 1, "act", "core", "親しい相手と意見が違うとき、どちらが正しいかより相手の気持ちを先に考える。", "harmony"],
    ["TF-11", -1, "close", 1, "think", "core", "親しい相手との話し合いでも、筋道を立てて考えることを大切にする。", "harmony"],
    ["TF-07", 1, "work", 2, "think", "facet", "評価や決定をするときは、その人の事情や努力も考えに入れたい。", "basis"],
    ["TF-10", -1, "work", 2, "act", "facet", "決める前に、良い点と悪い点を並べて比べることが多い。", "basis"],
    ["TF-16", 1, "work", 2, "act", "facet", "人の仕事に意見するときは、まず良かった点を伝えてから改善点を話す。", "delivery"],
    ["TF-19", -1, "daily", 2, "like", "facet", "遠回しな言い方より、はっきり言ってもらうほうが分かりやすい。", "delivery", 2],
    ["TF-12", 1, "friends", 2, "feel", "facet", "みんなで何かを決めるときは、全員が納得しているかが気になる。", "harmony"],
    ["TF-22", -1, "friends", 2, "like", "facet", "友人同士でもめたときは、どちらの言い分が正しいかをはっきりさせたい。", "harmony"],
    ["TF-13", 1, "daily", 4, "act", "scene", "買い物で迷ったときは、自分の気持ちがしっくりくるほうを選ぶ。", "basis", 2],
    ["TF-06", -1, "daily", 4, "think", "scene", "決まりごとは、例外を作らずに当てはめるべきだと思う。", "basis", 2],
    ["TF-15", -1, "daily", 4, "think", "scene", "大事な決定は、気持ちより、根拠となる事実や数字をもとにしたい。", "basis"],
    ["TF-17", 1, "close", 4, "act", "scene", "親しい相手に言いにくいことを伝えるときは、傷つけない言い方をかなり考える。", "delivery"],
    ["TF-18", 1, "friends", 4, "act", "scene", "友人の相談には、意見を言うより先に、気持ちに寄り添う言葉をかけることが多い。", "delivery"],
    ["TF-20", -1, "work", 4, "think", "scene", "相手のためになるなら、言いにくい指摘でもそのまま伝えるほうがよいと思う。", "delivery"],
    ["TF-21", 1, "work", 4, "feel", "scene", "職場や学校で意見が対立すると、内容より、場の雰囲気が悪くなることが気になる。", "harmony"],
    ["TF-24", -1, "daily", 4, "think", "scene", "みんなの気持ちがそろわなくても、筋の通った案なら進めるべきだと思う。", "harmony"],
  ]),
  ...define("JP", [
    ["JP-03", 1, "friends", 1, "like", "core", "友人との予定は、当日の気分で決めるほうが楽しい。", "schedule"],
    ["JP-01", -1, "daily", 1, "like", "core", "出かけるときは、行き先や時間を前もって決めておきたい。", "schedule"],
    ["JP-02", 1, "work", 1, "act", "core", "締め切りが近づいてから、集中して取り組むことが多い。", "pace", 2],
    ["JP-04", -1, "work", 1, "like", "core", "やるべきことは、早めに終わらせてから休みたい。", "pace"],
    ["JP-05", 1, "daily", 1, "like", "core", "物事を決めるとき、できるだけ選択肢を残しておきたい。", "closure"],
    ["JP-09", -1, "daily", 1, "feel", "core", "決めるべきことが決まらないままだと、落ち着かない。", "closure"],
    ["JP-10", 1, "friends", 2, "act", "facet", "急な誘いでも、予定が空いていれば気軽に乗ることが多い。", "schedule"],
    ["JP-07", -1, "close", 2, "like", "facet", "親しい相手と過ごす日は、だいたいの流れを先に決めておきたい。", "schedule"],
    ["JP-08", 1, "work", 2, "act", "facet", "計画どおりに進めるより、状況に合わせてやり方を変えることが多い。", "pace"],
    ["JP-06", -1, "daily", 2, "act", "facet", "やることは、順番を決めてから始めることが多い。", "pace"],
    ["JP-12", 1, "close", 2, "like", "facet", "親しい相手とのこれからのことは、決めすぎずに様子を見ながら考えたい。", "closure"],
    ["JP-11", -1, "work", 2, "like", "facet", "一度決めたことは、なるべくその通りに進めたい。", "closure"],
    ["JP-14", 1, "close", 4, "like", "scene", "親しい相手との外出は、行き先をその場で決めるのも楽しい。", "schedule"],
    ["JP-15", -1, "friends", 4, "like", "scene", "友人と遊ぶ日は、集合時間や行き先を前日までに決めておきたい。", "schedule"],
    ["JP-16", -1, "work", 4, "act", "scene", "一週間の予定を、前もって手帳やアプリで整理しておくことが多い。", "schedule"],
    ["JP-17", 1, "daily", 4, "act", "scene", "家事や用事は、気が向いたときにまとめて片づけることが多い。", "pace"],
    ["JP-18", 1, "work", 4, "act", "scene", "いくつかの作業を、その日の気分で行き来しながら進めることが多い。", "pace"],
    ["JP-19", -1, "work", 4, "act", "scene", "大きな課題は、締め切りから逆算して少しずつ進める。", "pace"],
    ["JP-21", 1, "friends", 4, "like", "scene", "旅行の行き先は、直前まで決めずに選択肢を残しておきたい。", "closure", 2],
    ["JP-24", -1, "close", 4, "feel", "scene", "親しい相手とのこれからのことは、はっきり決めておくほうが安心する。", "closure"],
  ]),
  ...define("initiative", [
    ["IN-01", 1, "friends", 1, "act", "core", "会いたい人がいると、自分から声をかけて予定を立てることが多い。"],
    ["IN-02", -1, "work", 1, "act", "core", "職場や学校では、食事や集まりに自分から人を誘うことは少ない。"],
    ["IN-03", -1, "close", 1, "like", "core", "親しい相手とは、相手から誘ってもらうほうが気が楽だ。"],
    ["IN-04", 1, "daily", 3, "act", "scene", "行きたい店や場所を見つけると、誰かを誘って行くことが多い。"],
    ["IN-05", 1, "close", 4, "act", "scene", "親しい相手と会う予定は、自分から提案することが多い。"],
    ["IN-06", -1, "friends", 4, "act", "scene", "友人との集まりは、誰かが声をかけてくれるのを待つことが多い。"],
  ]),
  ...define("assert", [
    ["AS-01", -1, "work", 1, "act", "core", "頼まれごとを断りたいときも、引き受けてしまうことが多い。", "refuse", 2],
    ["AS-02", 1, "friends", 1, "act", "core", "一人で抱えきれないときは、友人に手伝いを頼むことが多い。", "rely", 2],
    ["AS-03", -1, "close", 1, "act", "core", "親しい相手に不満があっても、言わずにがまんすることが多い。", "honest", 2],
    ["AS-05", 1, "close", 3, "act", "scene", "親しい相手にしてほしいことは、言葉にして伝えることが多い。", "honest", 2],
    ["AS-07", 1, "friends", 4, "act", "scene", "友人からの誘いでも、行きたくないときは断ることが多い。", "refuse"],
    ["AS-08", -1, "work", 4, "act", "scene", "職場や学校で困っても、人に頼らず一人で何とかしようとすることが多い。", "rely"],
  ]),
  ...define("conversation", [
    ["CV-01", 1, "friends", 2, "like", "core", "友人とは、近況報告より、考えや気持ちについて深く話すほうが満足する。"],
    ["CV-02", -1, "daily", 2, "like", "core", "人との会話は、短く気軽なやり取りのほうが心地よい。"],
    ["CV-03", 1, "close", 2, "like", "core", "親しい相手とは、じっくり話す時間がほしい。", undefined, 2],
    ["CV-04", -1, "work", 3, "like", "scene", "職場や学校の人とは、天気や近況などの軽い会話くらいがちょうどよい。"],
    ["CV-05", -1, "friends", 4, "like", "scene", "友人と会ったときは、深い話より、たわいない話で笑っているほうが楽しい。"],
    ["CV-06", 1, "daily", 4, "act", "scene", "興味のある話題なら、一つのことを長く話し込むことが多い。", undefined, 2],
  ]),
  ...define("plans", [
    ["PL-01", 1, "friends", 2, "feel", "core", "待ち合わせに相手が10分遅れると、かなり気になる。"],
    ["PL-02", -1, "close", 2, "feel", "core", "決まっていた予定が直前に変わっても、あまり気にならない。"],
    ["PL-03", 1, "work", 2, "think", "core", "一度した約束は、状況が変わっても守るべきだと思う。"],
    ["PL-04", -1, "friends", 4, "feel", "scene", "友人が待ち合わせに少し遅れても、あまり気にならない。"],
    ["PL-05", -1, "work", 4, "feel", "scene", "職場や学校の予定が急に変わっても、あまり気にならない。", undefined, 2],
    ["PL-06", 1, "close", 4, "feel", "scene", "親しい相手との約束を直前に変えられると、かなり気持ちが沈む。"],
  ]),
  ...define("alone", [
    ["AL-01", 1, "close", 3, "feel", "core", "親しい相手とでも、毎日会うより一人で過ごす日があるほうが落ち着く。"],
    ["AL-02", -1, "friends", 3, "feel", "core", "友人と長い時間一緒にいても、一人になりたいと感じることは少ない。"],
    ["AL-03", 1, "work", 3, "like", "core", "職場や学校の休み時間は、一人で過ごせるほうが休まる。"],
    ["AL-04", -1, "daily", 4, "feel", "scene", "休日に一人で過ごしていると、だんだん寂しくなってくる。"],
    ["AL-05", -1, "close", 4, "like", "scene", "親しい相手とは、できるだけ多くの時間を一緒に過ごしたい。"],
    ["AL-06", 1, "friends", 4, "like", "scene", "友人との旅行でも、一人で過ごせる時間が少しあるとありがたい。"],
  ]),
  ...define("contact", [
    ["CT-01", 1, "close", 3, "like", "core", "親しい相手とは、会わない日も短い連絡を取り合いたい。"],
    ["CT-02", -1, "friends", 3, "feel", "core", "友人とは、何か月か連絡を取らなくても特に気にならない。"],
    ["CT-03", 1, "daily", 3, "feel", "core", "自分が送った連絡に、その日のうちに返事がないと気になる。"],
    ["CT-04", -1, "friends", 4, "feel", "scene", "相手からの返信が遅くても、忙しいのだろうと思って待てる。"],
    ["CT-05", 1, "friends", 4, "like", "scene", "友人とは、用事がなくてもときどきメッセージを送り合いたい。"],
    ["CT-06", -1, "close", 4, "think", "scene", "親しい相手とでも、連絡は必要なときだけで十分だと思う。"],
  ]),
  ...define("affection", [
    ["AF-01", 1, "close", 3, "act", "core", "親しい相手には、うれしい・ありがとうという気持ちを言葉で伝えることが多い。"],
    ["AF-02", -1, "friends", 3, "act", "core", "友人への感謝は、言葉より、手伝うなどの行動で示すことが多い。"],
    ["AF-03", 1, "daily", 3, "act", "core", "家族や身近な人に、感謝を言葉で伝えることが多い。", undefined, 2],
    ["AF-04", -1, "close", 4, "think", "scene", "親しい相手への気持ちは、言葉にしなくても伝わっていると思うことが多い。"],
    ["AF-05", -1, "work", 4, "act", "scene", "職場や学校でお礼をするときは、言葉よりちょっとした手助けで返すことが多い。"],
    ["AF-06", 1, "friends", 4, "act", "scene", "友人をほめたり、感謝を伝えたりすることを、言葉でよくするほうだ。"],
  ]),
  ...define("support", [
    ["SP-01", 1, "friends", 3, "like", "core", "悩みを話すときは、解決策より、まず気持ちを分かってほしい。"],
    ["SP-02", -1, "work", 3, "like", "core", "困ったことを相談したときは、具体的な助言をもらえるほうがありがたい。"],
    ["SP-03", 1, "close", 3, "like", "core", "落ち込んでいるとき、親しい相手にはただ話を聞いてほしい。"],
    ["SP-04", -1, "friends", 4, "like", "scene", "友人に悩みを話すときは、どうすればよいかの意見がほしい。"],
    ["SP-05", -1, "daily", 4, "feel", "scene", "落ち込んだときは、話を聞いてもらうより、次に何をするか決めたほうが楽になる。", undefined, 2],
    ["SP-06", 1, "work", 4, "feel", "scene", "仕事や勉強で失敗したときは、まず「大変だったね」と言ってもらえると救われる。"],
  ]),
  ...define("conflict", [
    ["CF-01", 1, "close", 3, "like", "core", "親しい相手と気まずくなったら、なるべく早く話し合いたい。"],
    ["CF-02", -1, "friends", 3, "like", "core", "友人と意見がぶつかったら、いったん距離を置いて気持ちを落ち着かせたい。"],
    ["CF-03", 1, "work", 3, "like", "core", "職場や学校で意見が対立したときは、その場で違いをはっきりさせたい。"],
    ["CF-04", -1, "close", 4, "like", "scene", "親しい相手とけんかしたときは、一晩おいてから話したい。"],
    ["CF-05", -1, "work", 4, "act", "scene", "職場や学校で気まずいことがあると、時間がたつのを待つことが多い。", undefined, 2],
    ["CF-06", 1, "friends", 4, "like", "scene", "友人との間に誤解がありそうなときは、すぐに確かめたい。"],
  ]),
  ...define("stability", [
    ["VS-01", 1, "daily", 3, "think", "core", "生活が安定していて、先の見通しが立つことを大切にしている。"],
    ["VS-02", 1, "work", 3, "like", "core", "仕事や学校では、変化が多い環境より、落ち着いて続けられる環境を選びたい。"],
    ["VS-03", -1, "daily", 3, "feel", "core", "先が読めない暮らしでも、それはそれで楽しめると思う。"],
    ["VS-04", -1, "close", 4, "like", "scene", "親しい関係にも、ときどき新しい変化がほしい。"],
  ]),
  ...define("freedom", [
    ["VF-01", 1, "daily", 3, "think", "core", "自分のやり方やペースで過ごせる自由を大切にしている。"],
    ["VF-02", 1, "close", 3, "think", "core", "親しい関係でも、自分で決められることは自分で決めたい。"],
    ["VF-03", -1, "work", 3, "like", "core", "自由に任されるより、決められた枠の中で動くほうが安心する。"],
    ["VF-04", -1, "friends", 4, "like", "scene", "友人と過ごすときは、自分のペースより相手に合わせるほうが楽だ。"],
  ]),
  ...define("growth", [
    ["VG-01", 1, "work", 3, "think", "core", "新しいことを学び続けることを大切にしている。", undefined, 2],
    ["VG-02", 1, "daily", 3, "like", "core", "多少大変でも、自分を成長させてくれる経験を選びたい。"],
    ["VG-03", -1, "work", 3, "think", "core", "今できることを無理なく続けられれば、それで十分だと思う。"],
    ["VG-04", -1, "friends", 4, "like", "scene", "友人とは、高め合うより、気楽に過ごせる関係がいい。"],
  ]),
  ...define("connection", [
    ["VC-01", 1, "friends", 3, "think", "core", "人とのつながりや、支え合える関係を大切にしている。"],
    ["VC-02", 1, "close", 3, "think", "core", "大切な人と支え合えることが、人生でいちばん大事なことの一つだと思う。"],
    ["VC-03", -1, "daily", 3, "like", "core", "人との関わりより、自分の目標や楽しみを優先したいことが多い。"],
    ["VC-04", -1, "work", 4, "think", "scene", "職場や学校の人間関係は、必要な範囲で十分だと思う。"],
  ]),
];

/** 性格の傾向とは分けて扱う「いまの状態」の質問。基本診断の点数・問題数には含めない。 */
export const STATE_ITEMS: Item[] = [
  ...define("fatigue", [
    ["ST-01", 1, "daily", 1, "feel", "core", "最近、疲れがたまっていると感じる。"],
    ["ST-02", 1, "daily", 1, "feel", "core", "最近、気分が沈みやすい。"],
  ]),
  ...define("seekNew", [["ST-03", 1, "daily", 1, "feel", "core", "今は、新しい人と知り合う機会がほしい。"]]),
  ...define("seekClose", [["ST-04", 1, "close", 1, "feel", "core", "今は、親しい人との関係を深めたい。", undefined, 2]]),
];

export const ALL_ITEMS = [...BASE_ITEMS, ...STATE_ITEMS];

export type Mode = "quick" | "standard" | "detailed" | "complete";

/** 画面で分析ごとに出し分けるための名前。 */
export type AnalysisKey =
  | "summary"
  | "axes"
  | "pairs"
  | "social"
  | "honesty"
  | "strengths"
  | "burden"
  | "actions"
  | "combos"
  | "facets"
  | "decision"
  | "asks"
  | "growth"
  | "changes"
  | "values"
  | "match"
  | "compare"
  | "scenes"
  | "honestyDetail"
  | "comboScenes";

export type StageDef = {
  key: Mode;
  tier: Tier;
  /** 画面用の短い名前（クイックなど）。 */
  name: string;
  /** 問題数の表示（30問など）。 */
  label: string;
  /** 開始画面の説明。検証していない精度の表現は入れない。 */
  desc: string;
  /** 何を測るか。 */
  measures: string;
  /** この段階で新しく分かるようになること。 */
  adds: string[];
  /** この段階ではまだ判断できないこと。 */
  notYet: string[];
  /** 分析に必要な回答数。 */
  requirement: string;
  /** この段階で使えるようになる分析。 */
  analyses: AnalysisKey[];
};

export const STAGES: StageDef[] = [
  {
    key: "quick",
    tier: 1,
    name: "クイック",
    label: "30問",
    desc: "4軸の向きと、自分から誘うか・本音を伝えやすいかの大まかな傾向。追加回答で分析する項目が増えます。",
    measures: "4軸（各6問・3つの側面から1問ずつ両方向）と、自分から誘うか（3問）、断る・頼る・本音を伝える（各1問）",
    adds: [
      "4軸の向きと、中央付近の軸",
      "参考タイプと、境界に近い候補タイプ",
      "2つの軸の組み合わせから見るスタイル",
      "自分から人に関わるか、本音を伝えやすいかの大まかな傾向",
    ],
    notYet: [
      "軸の中の側面ごとの違い",
      "意思決定の詳しい特徴、会話の深さ、約束への考え方",
      "価値観・距離感・連絡・感情の伝え方・衝突対応",
      "どんな人と合いやすいか",
      "職場・友人・恋愛での違い",
    ],
    requirement: "4軸は各6問中4問以上、関わり方の項目は3問中2問以上の採点できる回答",
    analyses: ["summary", "axes", "pairs", "social", "honesty", "strengths", "burden", "actions", "combos"],
  },
  {
    key: "standard",
    tier: 2,
    name: "スタンダード",
    label: "60問",
    desc: "4軸を複数の側面から確認し、意思決定・会話の深さ・約束への考え方まで分析。追加回答で分析する項目が増えます。",
    measures: "4軸を各12問に（3つの側面×4問）、会話の深さ（3問）、約束・予定の変更（3問）を追加",
    adds: [
      "4軸それぞれの3つの側面（気力の回復、判断の基準、決めるタイミングなど）",
      "物事の捉え方と意思決定の詳しい特徴",
      "会話の深さと、約束・予定の変更への考え方",
      "30問の範囲で見た結果からの変化",
      "負担が続いたときの反応、周りに伝えておくとよいこと、伸ばしやすい力",
    ],
    notYet: [
      "価値観・距離感・連絡・感情の伝え方・衝突対応",
      "どんな人と合いやすいか",
      "職場・友人・恋愛での違い",
    ],
    requirement: "各側面4問中3問以上（両方向の質問を含む）",
    analyses: ["facets", "decision", "asks", "growth", "changes"],
  },
  {
    key: "detailed",
    tier: 3,
    name: "詳細",
    label: "90問",
    desc: "価値観・距離感・連絡・感情の伝え方・衝突対応を追加し、合いやすい相手の行動を提案。追加回答で分析する項目が増えます。",
    measures:
      "価値観4項目（各3問）、一人の時間・連絡・好意の伝え方・悩みの共有・衝突対応（各3問）、自分から誘う・本音を伝える・会話の深さに場面を1問ずつ追加",
    adds: [
      "大切にしている価値観",
      "心地よい距離感と連絡の頻度",
      "感情の伝え方（好意・悩みの共有）と、意見が違うときの対応",
      "恋愛・友人・仕事で、心地よく関われそうな相手の行動",
      "共有コードを使った二人の比較",
    ],
    notYet: ["職場・友人・恋愛ごとの傾向の違い", "断る・頼る・本音を伝えるの内訳", "場面ごとの内訳を加えた特徴の組み合わせ"],
    requirement: "各項目3問中2問以上",
    analyses: ["values", "match", "compare"],
  },
  {
    key: "complete",
    tier: 4,
    name: "完全版",
    label: "150問",
    desc: "職場・友人・恋愛の場面差と、特徴の組み合わせを詳しく分析。追加回答で分析する項目が増えます。",
    measures:
      "4軸を各20問に（職場・友人・恋愛の場面ごとに3問以上）、関わり方の各項目を6問に（2つ以上の場面で2問ずつ）、価値観を各4問に",
    adds: [
      "職場・友人・恋愛での傾向の違い",
      "場面ごとの内訳を加えた特徴の組み合わせ",
      "断る・頼る・本音を伝えるの内訳（各2問）",
      "側面ごとの結果を、各6〜7問で安定させる",
    ],
    notYet: [
      "実際の二人の相性（相手の回答がない場合は、相手像の提案にとどまります）",
      "この結果が実際の行動とどのくらい一致するか（まだ検証していません）",
    ],
    requirement: "場面の比較は、軸は1場面3問以上、関わり方の項目は1場面2問以上の採点できる回答",
    analyses: ["scenes", "honestyDetail", "comboScenes"],
  },
];

export function isMode(value: unknown): value is Mode {
  return STAGES.some((stage) => stage.key === value);
}

export function stageOf(key: Mode) {
  return STAGES.find((stage) => stage.key === key)!;
}

export function nextStage(key: Mode) {
  return STAGES.find((stage) => stage.tier === stageOf(key).tier + 1) ?? null;
}

export function previousStage(key: Mode) {
  return STAGES.find((stage) => stage.tier === stageOf(key).tier - 1) ?? null;
}

/** その段階で使える分析か。 */
export function hasAnalysis(mode: Mode, key: AnalysisKey) {
  return STAGES.some((stage) => stage.tier <= stageOf(mode).tier && stage.analyses.includes(key));
}

/** その分析が使えるようになる段階。 */
export function stageForAnalysis(key: AnalysisKey) {
  return STAGES.find((stage) => stage.analyses.includes(key))!;
}

function inMode(item: Item, mode: Mode) {
  return item.tier <= stageOf(mode).tier;
}

/** その段階で出題する、ある項目の質問。 */
export function itemsOf(measure: MeasureKey, mode: Mode = "complete") {
  return ALL_ITEMS.filter((item) => item.measure === measure && inMode(item, mode));
}

/** その段階で出題する基本診断の質問。 */
export function baseItemsOf(mode: Mode) {
  return BASE_ITEMS.filter((item) => inMode(item, mode));
}

/** その段階で新しく加わる基本診断の質問。 */
export function addedItemsOf(mode: Mode) {
  return BASE_ITEMS.filter((item) => item.tier === stageOf(mode).tier);
}

export function itemById(id: string) {
  return ALL_ITEMS.find((item) => item.id === id);
}

/** 画面と既存コード向けの別名。 */
export const MODES = STAGES;
export const modeOf = stageOf;
export const nextMode = nextStage;

/** その段階の結果の根拠となる質問ID。 */
export function evidenceIdsOf(mode: Mode) {
  return baseItemsOf(mode).map((item) => item.id);
}

export type Score = 1 | 2 | 3 | 4 | 5;
/** depends: 状況による。na: 経験がない／判断できない。どちらも採点に入れない。 */
export type AnswerValue = Score | "depends" | "na";

export const ANSWER_OPTIONS: { value: Score; label: string }[] = [
  { value: 1, label: "まったく当てはまらない" },
  { value: 2, label: "あまり当てはまらない" },
  { value: 3, label: "どちらともいえない" },
  { value: 4, label: "やや当てはまる" },
  { value: 5, label: "とても当てはまる" },
];

export const DEPENDS_LABEL = "状況による";
export const NA_LABEL = "経験がない／判断できない";

export function isScore(value: unknown): value is Score {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function isAnswerValue(value: unknown): value is AnswerValue {
  return value === "na" || value === "depends" || isScore(value);
}

export function answerLabel(value: AnswerValue) {
  if (value === "na") return NA_LABEL;
  if (value === "depends") return DEPENDS_LABEL;
  return ANSWER_OPTIONS.find((option) => option.value === value)!.label;
}

export type FollowupChoice = "close" | "new" | "work" | "private" | "energy" | "tired";

/** 「状況による」を選んだときの補足質問。基本得点には使わず、場面差の説明だけに使う。 */
export const FOLLOWUP = {
  id: "FU-1",
  version: 1,
  text: "この質問は、どんなときに当てはまりやすいですか？",
  options: [
    { value: "close", label: "親しい人が相手のとき" },
    { value: "new", label: "初対面や、慣れない人が相手のとき" },
    { value: "work", label: "職場・学校にいるとき" },
    { value: "private", label: "プライベートのとき" },
    { value: "energy", label: "気持ちや体力に余裕があるとき" },
    { value: "tired", label: "疲れているとき" },
  ] as { value: FollowupChoice; label: string }[],
};

export function isFollowupChoice(value: unknown): value is FollowupChoice | "skip" {
  return value === "skip" || FOLLOWUP.options.some((option) => option.value === value);
}

/** 補足質問を出したあと、次の補足質問まで最低これだけ基本質問をはさむ。 */
export const FOLLOWUP_GAP = 3;
