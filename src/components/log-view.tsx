"use client";

import Link from "next/link";
import { useJournal } from "@/components/journal-context";
import { JournalTransfer } from "@/components/journal-transfer";
import { ResetJournal } from "@/components/reset-journal";
import { buttonVariants } from "@/components/ui/button";
import { contexts } from "@/lib/catalog";
import { getQuestion, QUESTION_ORDER } from "@/lib/questions";
import { cn } from "cn";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function LogView() {
  const { ready, journal } = useJournal();

  if (!ready) {
    return <p className="px-5 py-24 text-center text-sm text-[#b3a898]">記録を読み込んでいます…</p>;
  }

  const entries = QUESTION_ORDER.flatMap((question) => {
    const answer = journal.answers[question.id];
    if (!answer) return [];
    return [{ question, answer }];
  }).sort((a, b) => (a.answer.updatedAt < b.answer.updatedAt ? 1 : -1));

  const retests = new Map(journal.retests.map((item) => [item.id, item]));
  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const label = dateFormatter.format(new Date(entry.answer.updatedAt));
    const group = groups.get(label) ?? [];
    group.push(entry);
    groups.set(label, group);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">
      <h1 className="font-mincho text-4xl">回答履歴</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-[#d9d0c3]">
        これまでに選んだ答えの一覧です。答えを選び直すと、意思決定モデルもすぐに作り直されます。
      </p>

      {entries.length === 0 ? (
        <div className="paper mt-8 rounded-3xl px-6 py-8">
          <p className="font-mincho text-2xl">まだ回答がありません。</p>
          <p className="mt-3 text-sm leading-7 text-[#3f3832]">
            質問は5問ずつ出ます。答えはここに記録されます。
          </p>
          <Link href="/ask" className={cn(buttonVariants(), "mt-6 h-12 px-6")}>
            はじめる
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {[...groups.entries()].map(([label, items]) => (
            <section key={label}>
              <h2 className="text-sm text-[#b3a898]">{label}</h2>
              <ul className="mt-3 grid gap-3">
                {items.map(({ question, answer }) => {
                  const stored = getQuestion(question.id);
                  if (!stored) return null;
                  const check = retests.get(question.id);
                  return (
                    <li key={question.id} className="rounded-2xl border border-white/10 px-4 py-4">
                      <p className="text-xs text-[#e25c2a]">{contexts[question.context].label}</p>
                      <p className="mt-2 text-sm leading-7">{question.situation}</p>
                      <p className="font-mincho mt-3 text-base leading-7">
                        {question.choices[answer.pole]}
                      </p>
                      {check && (
                        <p className="mt-2 text-xs leading-6 text-[#b3a898]">
                          {check.pole === check.original
                            ? "再確認でも、同じ答えを選びました。"
                            : `再確認では「${question.choices[check.pole]}」を選びました。`}
                        </p>
                      )}
                      <Link
                        href={`/ask?q=${question.id}`}
                        className="mt-3 inline-block text-sm text-[#b3a898] underline-offset-4 hover:underline"
                      >
                        選び直す
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <JournalTransfer />

      {entries.length > 0 && (
        <div className="mt-10">
          <ResetJournal />
        </div>
      )}
    </div>
  );
}
