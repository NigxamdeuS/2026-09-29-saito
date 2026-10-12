"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AXES, TRAITS } from "@/lib/mbti/content";
import { SCENES } from "@/lib/mbti/items";
import {
  COMPARE_SCENES,
  sideText,
  type AxisRow,
  type Finding,
  type PairReport,
  type Quality,
  type Report,
  type StressFinding,
} from "@/lib/mbti/report";
import { displayScore, MIDDLE_HIGH, MIDDLE_LOW } from "@/lib/mbti/scoring";
import {
  compareProfiles,
  decodeProfile,
  encodeProfile,
  MAX_NAME_LENGTH,
  scoresOf,
  type Comparison,
} from "@/lib/mbti/share";
import {
  FEEDBACK_OPTIONS,
  loadFeedback,
  saveFeedback,
  type Feedback,
  type FeedbackValue,
} from "@/lib/mbti/storage";
import { cn } from "cn";

function Findings({ items, empty }: { items: Finding[]; empty?: string }) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm leading-7 text-[#8ea3bd]">{empty ?? "はっきりした傾向が出ている項目はありませんでした。"}</p>;
  }
  return (
    <ul className="mt-4 grid gap-4">
      {items.map((item) => (
        <li key={item.text + item.basis} className="border-l-2 border-[#22d3ee]/50 pl-4">
          <p className="text-[15px] leading-8">{item.text}</p>
          <p className="mt-1 text-xs leading-6 text-[#8ea3bd]">根拠となる回答：{item.basis}</p>
        </li>
      ))}
    </ul>
  );
}

function FeedbackBar({
  id,
  feedback,
  onChange,
}: {
  id: string;
  feedback: Feedback;
  onChange: (id: string, value: FeedbackValue) => void;
}) {
  const current = feedback[id]?.value;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-[#8ea3bd]">
      <span>この分析は：</span>
      {FEEDBACK_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={current === option.value}
          onClick={() => onChange(id, option.value)}
          className={cn(
            "h-9 rounded-lg border px-3 transition-colors",
            current === option.value
              ? "border-[#22d3ee] bg-[#22d3ee] text-[#031018]"
              : "border-white/15 text-[#c5d4e6] hover:border-white/40",
          )}
        >
          {option.label}
        </button>
      ))}
      {current && <span>補足として保存しました（点数は変わりません）</span>}
    </div>
  );
}

function Section({
  id,
  number,
  title,
  lead,
  feedback,
  onFeedback,
  children,
}: {
  id: string;
  number?: number;
  title: string;
  lead?: string;
  feedback: Feedback;
  onFeedback: (id: string, value: FeedbackValue) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14" aria-labelledby={`mbti-${id}`}>
      <h2 id={`mbti-${id}`} className="flex items-baseline gap-3 text-2xl font-medium">
        {number !== undefined && (
          <span className="font-mincho text-sm text-[#22d3ee] tabular-nums">{String(number).padStart(2, "0")}</span>
        )}
        {title}
      </h2>
      {lead && <p className="mt-3 text-sm leading-7 text-[#c5d4e6]">{lead}</p>}
      {children}
      <FeedbackBar id={id} feedback={feedback} onChange={onFeedback} />
    </section>
  );
}

function AxisBar({ left, right, score }: { left: string; right: string; score: number | null }) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="font-mincho w-5 text-center text-sm">{left}</span>
      <div className="relative h-3 flex-1 rounded-full bg-white/10" aria-hidden>
        <div
          className="absolute inset-y-0 rounded-sm bg-white/[0.06]"
          style={{ left: `${MIDDLE_LOW}%`, width: `${MIDDLE_HIGH - MIDDLE_LOW}%` }}
        />
        {score !== null && (
          <div
            className="absolute -top-1 size-5 -translate-x-1/2 rounded-full border-2 border-[#031018] bg-[#22d3ee] shadow-[0_0_16px_rgba(34,211,238,0.7)]"
            style={{ left: `${score}%` }}
          />
        )}
      </div>
      <span className="font-mincho w-5 text-center text-sm">{right}</span>
    </div>
  );
}

function TraitBar({ score }: { score: number | null }) {
  return (
    <div className="relative mt-2 h-2 rounded-full bg-white/10" aria-hidden>
      {score !== null && (
        <div className="h-full rounded-full bg-gradient-to-r from-[#22d3ee] to-[#a78bfa]" style={{ width: `${score}%` }} />
      )}
    </div>
  );
}

function List({ title, items, empty }: { title: string; items: Finding[]; empty?: string }) {
  return (
    <div className="mt-6">
      <h4 className="text-sm font-medium text-[#eef6ff]">{title}</h4>
      <Findings items={items} empty={empty} />
    </div>
  );
}

function EvidenceList({ row }: { row: AxisRow }) {
  if (row.evidence.length === 0) return null;
  return (
    <details className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-sm">
      <summary className="cursor-pointer py-1 text-xs text-[#8ea3bd]">このスコアにつながった回答を見る</summary>
      <ul className="mt-2 grid gap-2 pb-2">
        {row.evidence.map((item) => (
          <li key={item.text} className="leading-7">
            <span className="font-mincho mr-2 text-xs text-[#22d3ee]">{item.toward}</span>
            「{item.text}」
            <span className="ml-1 text-xs text-[#8ea3bd]">→ {item.answer}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function PairList({ pairs }: { pairs: PairReport[] }) {
  if (pairs.length === 0) {
    return <p className="mt-3 text-sm leading-7 text-[#8ea3bd]">回答が少ない軸があるため、組み合わせの分析は保留しています。</p>;
  }
  return (
    <div className="mt-5 grid gap-5">
      {pairs.map((pair) => (
        <div key={pair.title} className="rounded-2xl border border-white/10 px-4 py-4 md:px-5">
          <p className="text-xs text-[#22d3ee]">{pair.title}</p>
          {pair.styles.length > 1 && (
            <p className="mt-2 text-sm leading-7 text-[#c5d4e6]">
              片方の軸が中央付近のため、次の{pair.styles.length}つのスタイルを場面に応じて使い分けている可能性があります。
            </p>
          )}
          {pair.styles.map((style) => (
            <div key={style.title} className="mt-3">
              <h3 className="font-medium">{style.title}</h3>
              <p className="mt-1 text-[15px] leading-8">{style.desc}</p>
              <p className="mt-1 text-sm leading-7 text-[#c5d4e6]">活かしやすい役割：{style.role}</p>
              <p className="text-sm leading-7 text-[#c5d4e6]">気をつけたい点：{style.watch}</p>
            </div>
          ))}
          <p className="mt-2 text-xs leading-6 text-[#8ea3bd]">根拠となる回答：{pair.basis}</p>
        </div>
      ))}
    </div>
  );
}

function StressList({ items }: { items: StressFinding[] }) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm leading-7 text-[#8ea3bd]">はっきりした傾向が出ている項目はありませんでした。</p>;
  }
  return (
    <ul className="mt-4 grid gap-4">
      {items.map((item) => (
        <li key={item.text} className="border-l-2 border-[#a78bfa]/60 pl-4">
          <p className="text-[15px] leading-8">{item.text}</p>
          <p className="mt-1 text-sm leading-7 text-[#c5d4e6]">回復しやすい方法：{item.recover}</p>
          <p className="mt-1 text-xs leading-6 text-[#8ea3bd]">根拠となる回答：{item.basis}</p>
        </li>
      ))}
    </ul>
  );
}

function QualityPanel({ quality }: { quality: Quality }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/15 px-4 py-4 text-sm leading-7">
      <h2 className="font-medium">回答の状況</h2>
      <p className="mt-1 text-[#c5d4e6]">
        {quality.total}問中{quality.answered}問に回答（「判断できない／経験がない」{quality.na}問、「どちらともいえない」
        {quality.neutral}問）
      </p>
      {quality.notes.length === 0 ? (
        <p className="mt-1 text-xs text-[#8ea3bd]">結果の読み取りに影響しそうな回答の偏りはありませんでした。</p>
      ) : (
        <Findings items={quality.notes} />
      )}
      <p className="mt-2 text-xs leading-6 text-[#8ea3bd]">
        回答の偏りは、正しい・間違いを判定するものではありません。結果をどのくらい強く受け取るかの目安として見てください。
      </p>
    </div>
  );
}

function ComparisonView({ comparison, partner }: { comparison: Comparison; partner: string }) {
  const blocks = [comparison.values, ...comparison.topics];
  return (
    <div className="mt-6 grid gap-5">
      <p className="text-sm leading-7 text-[#c5d4e6]">
        違いがあることは、そのまま相性が悪いという意味ではありません。違いが分かっていれば、話し合って合わせ方を決められます。
      </p>
      {blocks.map((block) => (
        <div key={block.label} className="rounded-2xl border border-white/10 px-4 py-4">
          <h4 className="font-medium">{block.label}</h4>
          <dl className="mt-3 grid gap-3 text-sm leading-7">
            <div>
              <dt className="text-xs text-[#22d3ee]">共通点</dt>
              <dd>{block.common.length > 0 ? block.common.join(" ") : "はっきりした共通点はありません。"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#a78bfa]">違い</dt>
              <dd>{block.differences.length > 0 ? block.differences.join(" ") : "大きな違いはありません。"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#8ea3bd]">話し合うとよいこと</dt>
              <dd>
                {block.talks.length > 0
                  ? block.talks.join("、")
                  : "今のやり方でお互いに無理がないか、ときどき確かめ合うと安心です。"}
              </dd>
            </div>
          </dl>
        </div>
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="paper rounded-2xl px-4 py-4">
          <h4 className="font-medium">補い合える部分</h4>
          <ul className="mt-2 space-y-2 text-sm leading-7">
            {comparison.complements.length > 0
              ? comparison.complements.map((text) => <li key={text}>{text}</li>)
              : <li>4軸の向きが近く、得意な場面が重なりやすい組み合わせです。同じ場面で力を合わせやすい一方、苦手な場面も重なりやすい点に気をつけましょう。</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#a78bfa]/40 px-4 py-4">
          <h4 className="font-medium">調整が必要な部分</h4>
          <ul className="mt-2 space-y-2 text-sm leading-7">
            {comparison.adjustments.length > 0
              ? comparison.adjustments.map((text) => <li key={text}>{text}</li>)
              : <li>関わり方の項目で、大きく離れているものはありませんでした。</li>}
          </ul>
        </div>
      </div>
      <p className="text-xs leading-6 text-[#8ea3bd]">
        {partner}の結果は、共有コードに入っている項目ごとのスコアだけを使っています。総合的な相性の点数は出していません。
      </p>
    </div>
  );
}

export function MbtiResult({
  report,
  onRetake,
  onReview,
}: {
  report: Report;
  onRetake: () => void;
  onReview: () => void;
}) {
  const [feedback, setFeedback] = useState<Feedback>({});
  const [feedbackError, setFeedbackError] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  const [partner, setPartner] = useState<{ name: string; comparison: Comparison } | null>(null);
  const [partnerError, setPartnerError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setFeedback(loadFeedback()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function recordFeedback(id: string, value: FeedbackValue) {
    const next = { ...feedback, [id]: { value, at: new Date().toISOString() } };
    setFeedback(next);
    setFeedbackError(!saveFeedback(next));
  }

  const scores = scoresOf(report.results);
  const sectionProps = { feedback, onFeedback: recordFeedback };
  const { type } = report;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">
      <p className="text-sm text-[#22d3ee]">4軸タイプ診断の結果</p>
      <p className="mt-1 text-xs leading-6 text-[#8ea3bd]">
        MBTIの4軸を参考にした独自の自己理解診断です。公式のMBTI検査ではありません。文章は、あらかじめ定めた説明ルールをもとにプログラムで組み立てています。
      </p>

      <div className="paper mt-5 rounded-3xl px-6 py-8 md:px-10">
        <p className="text-xs text-[#8ea3bd]">参考タイプ（結果を理解するための補助です）</p>
        <p className="font-mincho mt-3 text-6xl leading-none tracking-[0.2em] md:text-7xl">
          {type.letters.map((letter, i) => (
            <span key={AXES[i].key} className={letter ? undefined : "text-[#66798f]"}>
              {letter ?? "?"}
            </span>
          ))}
        </p>
        {type.heldAxes.length > 0 && (
          <p className="mt-4 text-sm leading-7 text-[#c5d4e6]">
            回答が少ない軸があるため、タイプは保留しています（{type.heldAxes.join("・")}）。
          </p>
        )}
        {type.candidates.length > 0 && (
          <div className="mt-4 text-sm leading-7 text-[#c5d4e6]">
            <p>境界に近い軸があるため、近い候補タイプもあります。</p>
            <ul className="mt-1">
              {type.candidates.map((candidate) => (
                <li key={candidate.type + candidate.axis}>
                  <span className="font-mincho tracking-widest text-[#eef6ff]">{candidate.type}</span>
                  <span className="ml-2 text-xs text-[#8ea3bd]">
                    {AXES.find((axis) => axis.key === candidate.axis)!.letters.join("／")}の軸が中央付近
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-5 text-xs leading-6 text-[#8ea3bd]">
          タイプだけで人柄や相性は決まりません。下の4軸のスコアと、項目ごとの分析を中心に見てください。
        </p>
      </div>

      {report.held.length > 0 && (
        <p className="mt-6 rounded-2xl border border-white/15 px-4 py-3 text-sm leading-7 text-[#c5d4e6]">
          次の項目は、未回答や「判断できない／経験がない」が多いため結果を保留しています：{report.held.join("、")}
        </p>
      )}

      <QualityPanel quality={report.quality} />

      <Section id="summary" number={1} title="あなたの傾向の要約" {...sectionProps}>
        <Findings items={report.summary} />
      </Section>

      <Section
        id="axes"
        number={2}
        title="4軸のスコア"
        lead="スコアは0〜100の「尺度上の傾向スコア」です。確率や正答率、人口の中での順位ではありません。帯の中央の明るい部分（40〜60）は、両方の傾向がある範囲です。"
        {...sectionProps}
      >
        <ul className="mt-6 grid gap-8">
          {report.axes.map((row) => (
            <li key={row.def.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{row.def.title}</h3>
                <span className="text-xs tabular-nums text-[#8ea3bd]">
                  {row.score === null
                    ? "保留"
                    : `尺度上の傾向スコア ${displayScore(row.score)}（${sideText(row.def, row.score)}）`}
                </span>
              </div>
              <AxisBar left={row.def.letters[0]} right={row.def.letters[1]} score={row.score} />
              <p className="mt-3 text-[15px] leading-8">{row.text}</p>
              {row.strength && (
                <p className="mt-1 text-sm leading-7 text-[#c5d4e6]">
                  強み：{row.strength}　／　負担になりやすい面：{row.strain}
                </p>
              )}
              <EvidenceList row={row} />
            </li>
          ))}
        </ul>
        <div className="mt-8 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {TRAITS.map((def) => {
            const score = report.results[def.key].score;
            return (
              <div key={def.key} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span>{def.title}</span>
                  <span className="text-xs tabular-nums text-[#8ea3bd]">
                    {score === null ? "保留" : displayScore(score)}
                  </span>
                </div>
                <TraitBar score={score} />
                <p className="mt-1 text-xs leading-5 text-[#8ea3bd]">
                  0：{def.low.label} ／ 100：{def.high.label}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        id="pairs"
        number={3}
        title="2つの軸の組み合わせから見るスタイル"
        lead="軸を一つずつ見るだけでなく、2つの軸を組み合わせたときの物事への向き合い方です。"
        {...sectionProps}
      >
        <PairList pairs={report.pairs} />
      </Section>

      <Section id="thinking" number={4} title="物事の捉え方と意思決定" {...sectionProps}>
        <Findings items={report.thinking} />
      </Section>

      <Section id="people" number={5} title="人と関わるときの特徴" {...sectionProps}>
        <Findings items={report.people} />
      </Section>

      <Section id="strengths" number={6} title="強みが発揮されやすい場面" {...sectionProps}>
        <Findings items={report.strengths} />
      </Section>

      <Section id="strains" number={7} title="負担を感じやすい環境" {...sectionProps}>
        <Findings items={report.strains} />
      </Section>

      <Section
        id="stress"
        number={8}
        title="負担が続いたときの反応と、回復のしかた"
        lead="誰でも負担が続くと、ふだんの傾向が強く出たり、逆の形で出たりします。早めに気づくための目安です。"
        {...sectionProps}
      >
        <StressList items={report.stress} />
      </Section>

      <Section id="misreads" number={9} title="周囲から誤解されやすい行動" {...sectionProps}>
        <Findings items={report.misreads} />
      </Section>

      <Section
        id="asks"
        number={10}
        title="周りの人に伝えておくとよいこと"
        lead="あなたの傾向を、身近な人に伝えるときの言い方の例です。そのまま使っても、自分の言葉に直しても構いません。"
        {...sectionProps}
      >
        <Findings items={report.asks} />
      </Section>

      <Section
        id="scenes"
        number={11}
        title="職場、友人、恋愛での傾向の違い"
        lead="場面ごとの質問だけで4軸を見たものです。回答が揺れていても嘘や矛盾とは考えず、場面による違いの可能性として扱います。"
        {...sectionProps}
      >
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-xs text-[#8ea3bd]">
                <th className="py-2 text-left font-normal">軸</th>
                {COMPARE_SCENES.map((scene) => (
                  <th key={scene} className="py-2 text-left font-normal">
                    {SCENES[scene]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.sceneTable.map((row) => (
                <tr key={row.def.key} className="border-t border-white/10">
                  <td className="py-2.5">{row.def.letters.join("／")}</td>
                  {COMPARE_SCENES.map((scene) => {
                    const side = row.cells[scene];
                    return (
                      <td key={scene} className="py-2.5">
                        {side === undefined
                          ? "—"
                          : side === "mid"
                            ? "両方"
                            : `${side === "low" ? row.def.letters[0] : row.def.letters[1]}寄り`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[#8ea3bd]">「—」は、その場面の回答が少ない、または質問がない軸です。</p>
        <Findings items={report.sceneNotes} empty="場面によって向きが大きく変わる項目はありませんでした。" />
      </Section>

      <Section
        id="combos"
        number={12}
        title="回答から読み取れる特徴の組み合わせ"
        lead="一つの項目だけでなく、項目どうしの組み合わせから読み取れることです。"
        {...sectionProps}
      >
        <Findings items={report.combos} empty="特に目立つ組み合わせはありませんでした。" />
      </Section>

      <Section
        id="growth"
        number={13}
        title="伸ばしやすい力"
        lead="はっきり出ている傾向の反対側にある力です。苦手を直すためではなく、場面に応じて選べる行動を増やすための視点です。"
        {...sectionProps}
      >
        <Findings items={report.growth} />
      </Section>

      <Section id="actions" number={14} title="試してみるとよい具体的な行動" {...sectionProps}>
        <Findings items={report.actions} />
      </Section>

      <Section
        id="values"
        title="大切にしていること・いまの状態"
        lead="価値観と「いまの状態」は、性格の傾向とは別の項目として扱っています。いまの状態は基本診断の点数に加えていません。"
        {...sectionProps}
      >
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium">大切にしていること</h3>
            <ul className="mt-3 grid gap-3">
              {report.values.map((value) => (
                <li key={value.label} className="text-sm">
                  <div className="flex justify-between">
                    <span>{value.label}</span>
                    <span className="text-xs tabular-nums text-[#8ea3bd]">
                      {value.score === null ? "保留" : displayScore(value.score)}
                    </span>
                  </div>
                  <TraitBar score={value.score} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium">いまの状態</h3>
            <ul className="mt-3 grid gap-3">
              {report.states.map((state) => (
                <li key={state.label} className="text-sm">
                  <div className="flex justify-between">
                    <span>{state.label}</span>
                    <span className="text-xs tabular-nums text-[#8ea3bd]">
                      {state.score === null ? "未回答" : displayScore(state.score)}
                    </span>
                  </div>
                  <TraitBar score={state.score} />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Findings items={report.stateNotes} empty="いまの状態が結果に強く影響していそうな回答はありませんでした。" />
      </Section>

      <section className="mt-16" aria-labelledby="mbti-match">
        <h2 id="mbti-match" className="flex items-baseline gap-3 text-2xl font-medium">
          <span className="font-mincho text-sm text-[#22d3ee]">15</span>
          どんな人と合いやすいか
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#c5d4e6]">
          回答ではっきり出た関わり方の項目から、相手の特徴を、観察できる行動で示しています。タイプどうしの相性の順位は作っていません。ここに書いた特徴に当てはまらない人と合わない、という意味でもありません。
        </p>
        {report.domains.map((domain) => (
          <div key={domain.key} className="mt-10 rounded-3xl border border-white/10 px-5 py-6 md:px-7">
            <h3 className="text-xl font-medium">{domain.label}</h3>
            {domain.note && <p className="mt-2 text-xs leading-6 text-[#8ea3bd]">{domain.note}</p>}
            {domain.comfortable.length === 0 ? (
              <p className="mt-4 text-sm leading-7 text-[#c5d4e6]">
                この場面に関わる項目に、はっきりした偏りは出ていません。相手に合わせて関わり方を変えやすい可能性があります。決まった相手像に絞るより、お互いの希望を話しながら合わせていくとよいでしょう。
              </p>
            ) : (
              <>
                <List title="居心地がよくなりやすい相手" items={domain.comfortable} />
                <List
                  title="互いに補い合いやすい相手"
                  items={domain.complement}
                  empty="補い合いを考えられるほど、4軸のはっきりした偏りは出ていません。"
                />
                <List title="すれ違いが起こりやすい相手" items={domain.friction} />
                <List title="合いやすい理由" items={domain.reasons} />
                <List title="注意が必要な場面" items={domain.cautions} />
                <List title="関係をよくする具体的な接し方" items={domain.tips} />
                <List title="初対面や会話で確認できるポイント" items={domain.checks} />
              </>
            )}
            <FeedbackBar id={`domain-${domain.key}`} feedback={feedback} onChange={recordFeedback} />
          </div>
        ))}
        <p className="mt-4 text-xs leading-6 text-[#8ea3bd]">
          参考タイプ（{type.type ?? "保留"}）は、相手を選ぶ基準ではありません。「このタイプが運命の相手」「このタイプとは合わない」といった判断はしていません。
        </p>
      </section>

      <section className="mt-16" aria-labelledby="mbti-compare">
        <h2 id="mbti-compare" className="flex items-baseline gap-3 text-2xl font-medium">
          <span className="font-mincho text-sm text-[#22d3ee]">16</span>
          二人の結果を比べる
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#c5d4e6]">
          共有コードを相手と交換すると、二人の結果を項目ごとに比べられます。コードに入るのは項目ごとのスコアと、入力した呼び名だけです。個々の回答や「いまの状態」は入りません。コードは、ボタンを押したときにだけ作られ、どこにも送信されません。
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 px-4 py-5">
          <h3 className="text-sm font-medium">自分の共有コード</h3>
          <label className="mt-3 block text-xs text-[#8ea3bd]" htmlFor="mbti-name">
            相手に表示される呼び名（任意・{MAX_NAME_LENGTH}文字まで）
          </label>
          <input
            id="mbti-name"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(event) => {
              setName(event.target.value);
              setCode(null);
            }}
            className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 text-base outline-none focus:border-[#22d3ee] sm:max-w-xs"
          />
          <div className="mt-3">
            <Button className="h-11 px-5" onClick={() => setCode(encodeProfile(name, scores))}>
              共有コードを作る
            </Button>
          </div>
          {code && (
            <div className="mt-4">
              <textarea
                readOnly
                value={code}
                rows={3}
                aria-label="自分の共有コード"
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 font-mono text-xs break-all outline-none"
                onFocus={(event) => event.target.select()}
              />
              <Button
                variant="outline"
                className="mt-2 h-10 px-4"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? "コピーしました" : "コピー"}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 px-4 py-5">
          <h3 className="text-sm font-medium">相手の共有コード</h3>
          <textarea
            value={partnerCode}
            onChange={(event) => {
              setPartnerCode(event.target.value);
              setPartnerError(false);
            }}
            rows={3}
            placeholder="NGX1- で始まるコードを貼り付けてください"
            aria-label="相手の共有コード"
            className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 font-mono text-xs outline-none focus:border-[#22d3ee]"
          />
          <Button
            className="mt-2 h-11 px-5"
            disabled={partnerCode.trim() === ""}
            onClick={() => {
              const profile = decodeProfile(partnerCode);
              if (!profile) {
                setPartner(null);
                setPartnerError(true);
                return;
              }
              const partnerName = profile.name || "相手";
              setPartner({ name: partnerName, comparison: compareProfiles(scores, profile.scores, partnerName) });
            }}
          >
            比べる
          </Button>
          {partnerError && (
            <p role="alert" className="mt-2 text-sm text-[#fca5a5]">
              コードを読み取れませんでした。最後まで正しく貼り付けられているか確かめてください。
            </p>
          )}
        </div>

        {partner && (
          <>
            <ComparisonView comparison={partner.comparison} partner={partner.name} />
            <FeedbackBar id="compare" feedback={feedback} onChange={recordFeedback} />
          </>
        )}
      </section>

      {feedbackError && (
        <p role="alert" className="mt-6 text-sm text-[#fca5a5]">
          フィードバックをこのブラウザに保存できませんでした。
        </p>
      )}

      <div className="mt-14 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" className="h-12 px-6" onClick={onReview}>
          回答を見直す
        </Button>
        <Button variant="outline" className="h-12 px-6" onClick={onRetake}>
          回答を消して最初から受ける
        </Button>
      </div>
    </div>
  );
}
