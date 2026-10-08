"use client";

import Link from "next/link";
import { useJournal } from "@/components/journal-context";
import { buttonVariants } from "@/components/ui/button";
import { answeredCount, heldCount } from "@/lib/journal";
import { TOTAL_QUESTIONS } from "@/lib/questions";
import { cn } from "cn";

const howTo = [
  "その場に自分がいたら、実際に取りそうな行動を「1・2・3」から一つ選んでください。",
  "正解や不正解、選択肢の優劣はありません。番号は点数ではありません。",
  "どれも当てはまらない、条件が足りず決められない場合は「保留」として、理由を書けます。",
  "理由欄には、迷った点や、どんな条件なら別の行動を選ぶかを書いても構いません。",
  "仮定の場面での回答が、実際の行動と一致するとは限りません。",
  "似た場面でも、相手・立場・負担などの条件が異なる質問があります。答えが変わることだけで、矛盾や病気を意味するわけではありません。",
  "100問を一度に答える必要はありません。自分のペースで進めてください。",
];

export function ScenesView() {
  const { ready, journal } = useJournal();
  const answered = answeredCount(journal);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-10 pb-8 md:pt-20">
      <p className="text-sm text-[#e25c2a]">おまけの質問集</p>
      <h1 className="font-mincho mt-4 text-4xl leading-tight font-medium md:text-5xl">
        場面で選ぶ100問（3択）
      </h1>
      <div className="mt-8 max-w-xl space-y-4 text-[15px] leading-8 text-[#ddd4c6]">
        <p>
          仕事、友人関係、地域の集まりなどの具体的な場面で、自分がどんな行動を選びそうかを考える質問集です。
        </p>
        <p>
          何を優先するか、相手との関係や忙しさによって選び方がどう変わるかを振り返るために作成しました。
        </p>
      </div>
      <div className="mt-6 max-w-xl rounded-2xl border border-white/15 px-4 py-4 text-sm leading-7 text-[#ddd4c6]">
        <p>この質問集は、医学的・心理学的に精度を検証した検査ではありません。</p>
        <p>
          解離性同一症（DID）の有無や確率を判定したり、性格を確定したりすることはできません。
        </p>
      </div>

      {!ready ? (
        <p className="mt-10 text-sm text-[#b3a898]">記録を読み込んでいます…</p>
      ) : (
        <>
          {answered > 0 && (
            <div className="paper mt-10 rounded-3xl px-6 py-6 md:px-8">
              <p className="text-xs text-[#6d645b]">ここまでの回答</p>
              <p className="font-mincho mt-2 text-3xl tabular-nums">
                {answered} / {TOTAL_QUESTIONS}
              </p>
              <p className="mt-2 text-sm text-[#3f3832]">うち保留 {heldCount(journal)}問</p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={answered === TOTAL_QUESTIONS ? "/log" : "/ask"}
              className={cn(buttonVariants({ size: "lg" }), "h-12 px-6")}
            >
              {answered === 0
                ? "はじめる"
                : answered === TOTAL_QUESTIONS
                  ? "回答を見直す"
                  : "続きから答える"}
            </Link>
            {answered > 0 && (
              <Link
                href="/model"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6")}
              >
                まとめを見る
              </Link>
            )}
          </div>
        </>
      )}

      <section className="mt-14 max-w-xl">
        <h2 className="font-mincho text-2xl">答え方</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-[#ddd4c6]">
          {howTo.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-[#b3a898]">
                ・
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
