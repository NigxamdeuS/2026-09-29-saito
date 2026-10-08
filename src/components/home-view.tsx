"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TESTS, TEST_IDS, type TestId } from "@/lib/diagnosis";
import { answeredItems, isComplete, loadProgress } from "@/lib/diagnosis-storage";
import { cn } from "cn";

const CARDS: Record<TestId, { href: string; points: string[] }> = {
  confidence: {
    href: "/confidence",
    points: ["自分全体への自信を40点満点で", "仕事・人間関係・見た目など8分野の自信", "研究の平均・同じ年代の平均と比べる"],
  },
  dissociation: {
    href: "/dissociation",
    points: ["記憶の抜け・現実感の薄れなどの体験の多さ", "二重人格（解離性同一症）と関係の深い傾向", "日本の成人の平均・同じ年代の平均と比べる"],
  },
};

type Status = { answered: number; done: boolean };

export function HomeView() {
  const [status, setStatus] = useState<Partial<Record<TestId, Status>>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next: Partial<Record<TestId, Status>> = {};
      for (const id of TEST_IDS) {
        const progress = loadProgress(id);
        next[id] = { answered: answeredItems(progress), done: isComplete(progress) };
      }
      setStatus(next);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-10 pb-8 md:pt-20">
      <h1 className="font-mincho text-5xl leading-none font-medium md:text-7xl">Nigxam</h1>
      <p className="mt-6 max-w-xl text-[15px] leading-8 text-[#ddd4c6]">
        研究で使われている質問紙をもとに、自分の自信の強さと、解離（二重人格に関係する体験）の傾向を、別々に測ります。結果は研究の平均や、同じ年代の人の平均と比べられます。
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {TEST_IDS.map((id) => {
          const test = TESTS[id];
          const card = CARDS[id];
          const state = status[id];
          return (
            <Link
              key={id}
              href={card.href}
              className={cn(
                "group flex flex-col rounded-3xl px-6 py-6 transition-transform hover:-translate-y-0.5",
                id === "confidence" ? "paper" : "border border-white/15 bg-white/[0.03]",
              )}
            >
              <span className={cn("text-xs", id === "confidence" ? "text-[#6d645b]" : "text-[#b3a898]")}>
                {test.items.length}問 · 約{Math.ceil(test.items.length / 6)}分
              </span>
              <span className="font-mincho mt-2 text-3xl">{test.title}</span>
              <ul
                className={cn(
                  "mt-4 flex-1 space-y-1.5 text-sm leading-6",
                  id === "confidence" ? "text-[#3f3832]" : "text-[#d9d0c3]",
                )}
              >
                {card.points.map((point) => (
                  <li key={point}>・{point}</li>
                ))}
              </ul>
              <span
                className={cn(
                  "mt-6 inline-flex h-12 items-center justify-center rounded-xl text-base font-medium",
                  id === "confidence" ? "bg-[#1c1712] text-[#f3ebdd]" : "bg-[#e25c2a] text-[#1c100c]",
                )}
              >
                {state?.done
                  ? "結果を見る"
                  : state && state.answered > 0
                    ? `続きから（${state.answered}/${test.items.length}）`
                    : "はじめる"}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 max-w-xl rounded-2xl border border-white/15 px-4 py-4 text-sm leading-7 text-[#ddd4c6]">
        <p>どちらも医療機関での診断の代わりにはなりません。</p>
        <p>
          解離傾向チェックの点数が高くても、それだけで二重人格（解離性同一症）だと決まるわけではありません。気になるときは、精神科や心療内科で相談してください。
        </p>
      </div>

      <p className="mt-10 text-sm text-[#b3a898]">
        具体的な場面での行動を考える質問集もあります（診断ではありません）：
        <Link href="/scenes" className="ml-1 text-[#f3ebdd] underline underline-offset-4">
          場面で選ぶ100問
        </Link>
      </p>
    </div>
  );
}
