"use client";

import { useState } from "react";
import Link from "next/link";
import { useJournal } from "@/components/journal-context";
import { ResetJournal } from "@/components/reset-journal";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  answeredCount,
  categorySummaries,
  choiceLabel,
  comparisons,
  heldCount,
  journalText,
  type AnswerRecord,
} from "@/lib/journal";
import { TOTAL_QUESTIONS, type Question } from "@/lib/questions";
import { cn } from "cn";

function AnswerLine({ question, answer }: { question: Question; answer: AnswerRecord | undefined }) {
  return (
    <div>
      <p className="text-xs text-[#b3a898]">
        第{question.number}問 · {question.topic}
      </p>
      <p className={cn("mt-1 text-sm leading-7", !answer && "text-[#8d8478]")}>
        {answer ? choiceLabel(question, answer.choice) : "未回答"}
      </p>
      {answer?.note && (
        <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-[#d9d0c3]">{answer.note}</p>
      )}
    </div>
  );
}

export function SummaryView() {
  const { ready, journal } = useJournal();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  if (!ready) {
    return <p className="px-5 py-24 text-center text-sm text-[#b3a898]">記録を読み込んでいます…</p>;
  }

  const answered = answeredCount(journal);
  const text = journalText(journal);
  const pairs = comparisons(journal).filter(
    (pair) => pair.answer || pair.bases.some((base) => base.answer),
  );

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">
      <p className="text-sm text-[#e25c2a]">まとめ</p>
      <div className="paper mt-4 rounded-3xl px-6 py-8 md:px-10 md:py-10">
        <p className="text-xs text-[#6d645b]">ここまでの回答</p>
        <p className="font-mincho mt-2 text-5xl leading-none tabular-nums">
          {answered} / {TOTAL_QUESTIONS}
        </p>
        <p className="mt-3 text-sm text-[#3f3832]">うち保留 {heldCount(journal)}問</p>
        <p className="mt-6 text-sm leading-7 text-[#3f3832]">
          番号は点数ではないため、合計点や判定は出しません。ここでは、答えを振り返るための材料を並べています。
        </p>
      </div>

      <section className="mt-12">
        <h2 className="font-mincho text-2xl">分野ごとの回答数</h2>
        <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
          {categorySummaries(journal).map((summary) => (
            <li
              key={summary.category}
              className="flex items-baseline justify-between gap-3 border-t border-white/10 py-3 text-sm"
            >
              <span>{summary.category}</span>
              <span className="tabular-nums text-[#b3a898]">
                {summary.answered}/{summary.total}
                {summary.held > 0 && ` · 保留 ${summary.held}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-mincho text-2xl">条件を変えた質問</h2>
        <p className="mt-3 text-sm leading-7 text-[#d9d0c3]">
          第91問から第100問は、前に出た場面の相手・立場・負担などを変えた質問です。元の質問と並べています。答えが変わることだけで、矛盾や病気を意味するわけではありません。
        </p>
        {pairs.length === 0 ? (
          <p className="mt-6 text-sm text-[#b3a898]">
            まだ比べられる回答がありません。
          </p>
        ) : (
          <ul className="mt-6 grid gap-4">
            {pairs.map((pair) => (
              <li key={pair.question.id} className="rounded-2xl border border-white/10 px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-3">
                    {pair.bases.map((base) => (
                      <AnswerLine key={base.question.id} question={base.question} answer={base.answer} />
                    ))}
                  </div>
                  <div className="border-t border-white/10 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
                    <AnswerLine question={pair.question} answer={pair.answer} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-mincho text-2xl">テキストで書き出す</h2>
        <p className="mt-3 text-sm leading-7 text-[#d9d0c3]">
          100問すべてを、質問・選択肢・回答・理由の形で書き出します。まだ答えていない質問は、回答欄が空になります。
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button className="h-11 px-5" onClick={copyText}>
            {copied ? "コピーしました" : "テキストでコピー"}
          </Button>
          <Link
            href={answered === TOTAL_QUESTIONS ? "/log" : "/ask"}
            className={cn(buttonVariants({ variant: "outline" }), "h-11 px-5")}
          >
            {answered === TOTAL_QUESTIONS ? "回答を見直す" : "質問に戻る"}
          </Link>
        </div>
        {copyError && (
          <p className="mt-3 text-sm text-[#e7b5a4]">
            コピーできませんでした。下のテキストを選択してコピーしてください。
          </p>
        )}
        <pre className="mt-5 max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 px-4 py-4 font-sans text-sm leading-7 text-[#ddd4c6]">
          {text}
        </pre>
      </section>

      <div className="mt-10">
        <ResetJournal />
      </div>
    </div>
  );
}
