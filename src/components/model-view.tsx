"use client";

import { useState } from "react";
import Link from "next/link";
import { useJournal } from "@/components/journal-context";
import { ResetJournal } from "@/components/reset-journal";
import { Button, buttonVariants } from "@/components/ui/button";
import { axes, axisOrder, contextOrder, contexts, joinContexts } from "@/lib/catalog";
import { buildModel, type AxisPortrait, type DecisionModel } from "@/lib/model";
import { cn } from "cn";

const kindLabel = {
  thin: "回答不足",
  single: "一貫している",
  noisy: "同じ場面の中でもぶれる",
  split: "場面によって分かれる",
} as const;

function percent(value: number) {
  return `${((value + 1) / 2) * 100}%`;
}

function AxisTrack({ axis }: { axis: AxisPortrait }) {
  const dots =
    axis.kind === "split" && axis.low && axis.high
      ? [
          { value: axis.low.mean, tone: "sage" as const },
          { value: axis.high.mean, tone: "heat" as const },
        ]
      : axis.mean === null
        ? []
        : [{ value: axis.mean, tone: "ink" as const }];

  const plusContexts =
    axis.high && axis.low
      ? axis.high.mean >= 0
        ? axis.high.contexts
        : axis.low.contexts
      : [];
  const minusContexts =
    axis.high && axis.low
      ? axis.high.mean >= 0
        ? axis.low.contexts
        : axis.high.contexts
      : [];

  return (
    <li className="border-t border-white/10 py-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base">{axis.name}</h3>
        <p className="text-xs text-[#b3a898]">
          {kindLabel[axis.kind]} · 回答 {axis.n}問
        </p>
      </div>
      <div className="mt-4 flex justify-between gap-4 text-xs leading-5 text-[#d9d0c3]">
        <span className="max-w-[46%]">{axis.minusLabel}</span>
        <span className="max-w-[46%] text-right">{axis.plusLabel}</span>
      </div>
      <div className="relative mt-3 h-3">
        <div className="absolute top-1/2 right-0 left-0 h-px bg-white/20" />
        {dots.map((dot) => (
          <span
            key={`${dot.tone}-${dot.value}`}
            className={cn(
              "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
              dot.tone === "heat" && "bg-[#e25c2a]",
              dot.tone === "sage" && "bg-[#8eae98]",
              dot.tone === "ink" && "bg-[#f3ebdd]",
            )}
            style={{ left: percent(dot.value) }}
          />
        ))}
      </div>
      {axis.kind === "split" && (
        <p className="mt-3 text-xs leading-6 text-[#d9d0c3]">
          <span className="text-[#e25c2a]">{joinContexts(plusContexts)}</span>
          {"では「"}
          {axis.plusLabel}
          {"」、"}
          <span className="text-[#8eae98]">{joinContexts(minusContexts)}</span>
          {"では「"}
          {axis.minusLabel}
          {"」。"}
        </p>
      )}
      {axis.kind === "noisy" && (
        <p className="mt-3 text-xs leading-6 text-[#b3a898]">
          同じ種類の場面の中でも、選ぶ側が入れ替わっています。
        </p>
      )}
      {axis.n === 0 && (
        <p className="mt-3 text-xs text-[#8d8478]">この軸に関する回答は、まだありません。</p>
      )}
    </li>
  );
}

function ContextGrid({ model }: { model: DecisionModel }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full table-fixed border-collapse text-xs">
        <caption className="sr-only">軸ごと・場面ごとの傾向</caption>
        <thead>
          <tr className="text-[#b3a898]">
            <th scope="col" className="w-[3.75rem] px-2 py-3 text-left font-normal sm:w-[5rem]">
              <span className="sr-only">軸</span>
            </th>
            {contextOrder.map((context) => (
              <th
                key={context}
                scope="col"
                className="px-0.5 py-3 text-center text-[10px] font-normal whitespace-nowrap min-[360px]:text-[11px] sm:text-xs"
              >
                {contexts[context].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {axisOrder.map((axis) => (
            <tr key={axis} className="border-t border-white/5">
              <th
                scope="row"
                className="px-2 py-2 text-left text-[11px] font-normal whitespace-nowrap text-[#ddd4c6] sm:text-xs"
              >
                {axes[axis].name}
              </th>
              {contextOrder.map((context) => {
                const cell = model.grid[axis][context];
                const strength = cell ? Math.abs(cell.mean) : 0;
                const side = !cell || strength < 0.34 ? "mid" : cell.mean > 0 ? "plus" : "minus";
                const label = !cell
                  ? "未回答"
                  : side === "mid"
                    ? "中間"
                    : side === "plus"
                      ? axes[axis].plus
                      : axes[axis].minus;
                return (
                  <td key={context} className="p-1">
                    <div
                      title={`${axes[axis].name} × ${contexts[context].label}: ${label}${cell ? `(${cell.n}問)` : ""}`}
                      aria-label={`${contexts[context].label}の${axes[axis].name}: ${label}`}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-md tabular-nums",
                        !cell && "border border-dashed border-white/10 text-[#6d645b]",
                        side === "plus" && "text-[#fff3ec]",
                        side === "minus" && "text-[#eef6f1]",
                        side === "mid" && cell && "bg-white/10 text-[#ddd4c6]",
                      )}
                      style={
                        side === "plus"
                          ? { backgroundColor: `rgba(226, 92, 42, ${0.3 + strength * 0.6})` }
                          : side === "minus"
                            ? { backgroundColor: `rgba(142, 174, 152, ${0.25 + strength * 0.55})` }
                            : undefined
                      }
                    >
                      {cell ? (side === "plus" ? "＋" : side === "minus" ? "−" : "・") : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-white/10 px-3 py-3 text-xs leading-6 text-[#b3a898]">
        <span className="text-[#e25c2a]">＋</span>は「{axes.tempo.plus}」「{axes.stake.plus}」などの側、
        <span className="text-[#8eae98]">−</span>はその反対側です。列によって色が入れ替わるほど、場面ごとに傾向が分かれていることを示します。
      </p>
    </div>
  );
}

function Evidence({ model }: { model: DecisionModel }) {
  const { predictions, consistency } = model;
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <section className="rounded-2xl border border-white/10 px-4 py-5">
        <h3 className="text-sm">次の選択の予測</h3>
        {predictions.n === 0 ? (
          <p className="mt-3 text-xs leading-6 text-[#b3a898]">
            同じ軸の回答が1問たまると、あなたが答える前にモデルが予測を立てるようになります。
          </p>
        ) : (
          <dl className="mt-3 grid gap-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-[#d9d0c3]">場面を考慮した予測</dt>
              <dd className="tabular-nums">
                {predictions.contextHits} / {predictions.n}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#d9d0c3]">場面を考慮しない予測</dt>
              <dd className="tabular-nums">
                {predictions.overallHits} / {predictions.n}
              </dd>
            </div>
            <p className="mt-1 leading-6 text-[#b3a898]">
              場面を考慮した予測のほうがよく当たるなら、選び方が場面に結びついていると考えられます。
            </p>
          </dl>
        )}
      </section>
      <section className="rounded-2xl border border-white/10 px-4 py-5">
        <h3 className="text-sm">再確認での一致</h3>
        {consistency.n === 0 ? (
          <p className="mt-3 text-xs leading-6 text-[#b3a898]">
            15問を超えると、10問ごとに以前の質問を1問ずつ再出題します。一致率が低い場合は、場面による違いではなく、答えのぶれとして扱います。
          </p>
        ) : (
          <>
            <p className="mt-3 text-xs tabular-nums">
              {consistency.n}問中 {consistency.same}問で同じ答え
            </p>
            <p className="mt-2 text-xs leading-6 text-[#b3a898]">
              {consistency.n < 3
                ? "3問そろうと、判定に使います。"
                : (consistency.rate ?? 0) < 0.5
                  ? "同じ場面でも答えが変わっています。現時点では、場面による分かれ方としては扱いません。"
                  : "同じ場面では、同じ答えを選んでいます。"}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

export function ModelView() {
  const { ready, journal } = useJournal();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const model = buildModel(journal);

  async function copyProse() {
    try {
      await navigator.clipboard.writeText(model.prose);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  if (!ready) {
    return <p className="px-5 py-24 text-center text-sm text-[#b3a898]">記録を読み込んでいます…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">
      <p className="text-sm text-[#e25c2a]">意思決定モデル</p>
      <div className="paper mt-4 rounded-3xl px-6 py-8 md:px-10 md:py-10">
        <p className="text-xs text-[#6d645b]">二重人格の可能性</p>
        <p className="font-mincho mt-2 text-5xl leading-none">{model.possibility}</p>
        <h1 className="font-mincho mt-6 text-2xl leading-snug md:text-3xl">{model.headline}</h1>
        <p className="mt-4 text-sm leading-8 text-[#3f3832]">{model.body}</p>
        <p className="mt-6 text-sm tabular-nums text-[#6d645b]">
          {model.answered} / {model.total}
        </p>
      </div>

      {model.selves && (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <section className="rounded-3xl border border-[#e25c2a]/40 bg-[#231814] px-5 py-6">
            <p className="text-xs text-[#e7b5a4]">{model.selves.name}</p>
            <h2 className="mt-3 text-sm leading-6">{model.selves.a.contexts}</h2>
            <p className="font-mincho mt-3 text-2xl leading-snug">{model.selves.a.behavior}</p>
          </section>
          <section className="rounded-3xl border border-[#8eae98]/40 bg-[#171c19] px-5 py-6">
            <p className="text-xs text-[#b7cfc0]">{model.selves.name}</p>
            <h2 className="mt-3 text-sm leading-6">{model.selves.b.contexts}</h2>
            <p className="font-mincho mt-3 text-2xl leading-snug">{model.selves.b.behavior}</p>
          </section>
        </div>
      )}

      <section className="mt-12">
        <h2 className="font-mincho text-2xl">場面ごとの傾向</h2>
        <p className="mt-3 text-sm leading-7 text-[#d9d0c3]">
          8つの軸を、5つの場面ごとに並べました。傾向が一貫していれば、各行の色は場面をまたいでそろいます。
        </p>
        <ContextGrid model={model} />
      </section>

      <section className="mt-12">
        <h2 className="font-mincho text-2xl">判定の裏づけ</h2>
        <p className="mt-3 text-sm leading-7 text-[#d9d0c3]">
          選び方の分かれ方が本物かどうかは、2つの方法で確かめます。場面を考慮すると予測がよく当たるか。同じ質問をもう一度出したとき、同じ答えを選ぶか。
        </p>
        <Evidence model={model} />
      </section>

      <section className="mt-12">
        <h2 className="font-mincho text-2xl">8つの軸</h2>
        <ul className="mt-4">
          {model.axes.map((axis) => (
            <AxisTrack key={axis.axis} axis={axis} />
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-mincho text-2xl">場面によって逆を選んだもの</h2>
        <p className="mt-3 text-sm leading-7 text-[#d9d0c3]">
          同じ種類の迷いに対して、場面によって反対の答えを選んでいるものです。回答が少ないうちは、判定には使いません。
        </p>
        {model.swaps.length === 0 ? (
          <p className="mt-6 text-sm text-[#b3a898]">
            {model.answered === 0
              ? "まだ回答がありません。"
              : "今のところ、同じ種類の迷いで反対の答えを選んだものはありません。"}
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {model.swaps.map((swap) => (
              <li key={swap.family} className="rounded-2xl border border-white/10 px-4 py-4">
                <p className="text-xs text-[#b3a898]">{swap.label}</p>
                <p className="mt-2 text-sm leading-7">
                  {joinContexts(swap.plusContexts)}では「{swap.plusName}」、
                  {joinContexts(swap.minusContexts)}では「{swap.minusName}」。
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-mincho text-2xl">テキストで書き出す</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button className="h-11 px-5" onClick={copyProse}>
            {copied ? "コピーしました" : "結果をテキストでコピー"}
          </Button>
          <Link
            href={model.answered === model.total ? "/log" : "/ask"}
            className={cn(buttonVariants({ variant: "outline" }), "h-11 px-5")}
          >
            {model.answered === model.total ? "回答を見直す" : "質問に戻る"}
          </Link>
        </div>
        {copyError && (
          <p className="mt-3 text-sm text-[#e7b5a4]">
            コピーできませんでした。下のテキストを選択してコピーしてください。
          </p>
        )}
        <pre className="mt-5 whitespace-pre-wrap rounded-2xl border border-white/10 px-4 py-4 font-sans text-sm leading-7 text-[#ddd4c6]">
          {model.prose}
        </pre>
      </section>

      <div className="mt-10">
        <ResetJournal />
      </div>
    </div>
  );
}
