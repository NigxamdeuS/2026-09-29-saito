"use client";

import Link from "next/link";
import { useJournal } from "@/components/journal-context";
import { JournalTransfer } from "@/components/journal-transfer";
import { ResetJournal } from "@/components/reset-journal";
import { buttonVariants } from "@/components/ui/button";
import { choiceLabel } from "@/lib/journal";
import { QUESTIONS, TOTAL_QUESTIONS } from "@/lib/questions";
import { cn } from "cn";

export function LogView() {
  const { ready, journal } = useJournal();

  if (!ready) {
    return <p className="px-5 py-24 text-center text-sm text-[#b3a898]">記録を読み込んでいます…</p>;
  }

  const groups = new Map<string, typeof QUESTIONS>();
  for (const question of QUESTIONS) {
    if (!journal.answers[question.id]) continue;
    const group = groups.get(question.category) ?? [];
    group.push(question);
    groups.set(question.category, group);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">
      <h1 className="font-mincho text-4xl">回答履歴</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-[#d9d0c3]">
        これまでの答えと理由を、問題の番号順に並べています。答えや理由は、あとから書き直せます。
      </p>

      {groups.size === 0 ? (
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
          {[...groups.entries()].map(([category, items]) => (
            <section key={category}>
              <h2 className="text-sm text-[#b3a898]">{category}</h2>
              <ul className="mt-3 grid gap-3">
                {items.map((question) => {
                  const answer = journal.answers[question.id];
                  return (
                    <li key={question.id} className="rounded-2xl border border-white/10 px-4 py-4">
                      <p className="text-xs text-[#e25c2a]">
                        第{question.number}問／{TOTAL_QUESTIONS} · {question.topic}
                      </p>
                      <p className="mt-2 text-sm leading-7">{question.situation}</p>
                      <p className="font-mincho mt-3 text-base leading-7">
                        {choiceLabel(question, answer.choice)}
                      </p>
                      {answer.note && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#d9d0c3]">
                          <span className="text-xs text-[#b3a898]">理由・補足：</span>
                          {answer.note}
                        </p>
                      )}
                      <Link
                        href={`/ask?q=${question.id}`}
                        className="mt-3 inline-block text-sm text-[#b3a898] underline-offset-4 hover:underline"
                      >
                        書き直す
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

      {groups.size > 0 && (
        <div className="mt-10">
          <ResetJournal />
        </div>
      )}
    </div>
  );
}
