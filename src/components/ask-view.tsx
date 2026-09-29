"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useJournal } from "@/components/journal-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { contexts, SESSION_SIZE, type Pole } from "@/lib/catalog";
import { buildModel } from "@/lib/model";
import { displayPoles, getQuestion, questionQueue } from "@/lib/questions";
import { cn } from "cn";

type Phase = "ask" | "break" | "done";

type Round = {
  ids: string[];
  cursor: number;
  saved: number;
  phase: Phase;
};

function openRound(ids: string[]): Round {
  if (ids.length === 0) return { ids: [], cursor: 0, saved: 0, phase: "done" };
  return { ids, cursor: 0, saved: 0, phase: "ask" };
}

export function AskView() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("q");
  const { ready, journal, answer, defer } = useJournal();
  const router = useRouter();
  const [round, setRound] = useState<Round | null>(null);
  const [picked, setPicked] = useState<{ id: string; pole: Pole | null }>({
    id: "",
    pole: null,
  });
  const headingRef = useRef<HTMLHeadingElement>(null);

  if (ready && !editId && round === null) {
    const queue = questionQueue(journal);
    setRound(openRound(queue.slice(0, SESSION_SIZE).map((question) => question.id)));
  }

  const questionId = editId ?? (round ? round.ids[round.cursor] : "") ?? "";
  if (questionId !== picked.id) {
    setPicked({
      id: questionId,
      pole: editId ? (journal.answers[editId]?.pole ?? null) : null,
    });
  }

  const question = questionId ? getQuestion(questionId) : undefined;
  const phase: Phase = editId ? "ask" : (round?.phase ?? "ask");

  useEffect(() => {
    headingRef.current?.focus();
    if (questionId) window.scrollTo(0, 0);
  }, [questionId, phase]);

  useEffect(() => {
    if (!question || phase !== "ask") return;
    const current = question;
    const poles = displayPoles(current.id);
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "1" || event.key === "2" || event.key === "3") {
        event.preventDefault();
        const pole = poles[Number(event.key) - 1];
        setPicked({ id: current.id, pole });
      }
      if (
        event.key === "Enter" &&
        picked.pole &&
        event.target instanceof HTMLElement &&
        event.target.tagName !== "BUTTON"
      ) {
        event.preventDefault();
        answer(current.id, picked.pole);
        if (editId) {
          router.push("/log");
          return;
        }
        setRound((state) => {
          if (!state) return state;
          const saved = state.saved + 1;
          if (state.cursor + 1 >= state.ids.length) {
            return { ...state, saved, phase: "break" };
          }
          return { ...state, saved, cursor: state.cursor + 1, phase: "ask" };
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, phase, picked.pole, editId, answer, router]);

  function advance(savedDelta: number) {
    setRound((current) => {
      if (!current) return current;
      const saved = current.saved + savedDelta;
      if (current.cursor + 1 >= current.ids.length) {
        return { ...current, saved, phase: "break" };
      }
      return { ...current, saved, cursor: current.cursor + 1, phase: "ask" };
    });
  }

  function choose(pole: Pole) {
    if (!question) return;
    answer(question.id, pole);
    if (editId) {
      router.push("/log");
      return;
    }
    advance(1);
  }

  if (!ready || (!editId && round === null)) {
    return <p className="px-5 py-24 text-center text-sm text-[#b3a898]">記録を開いています</p>;
  }

  if (editId && !question) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-16">
        <p className="font-mincho text-2xl">その問は見つからない。</p>
        <Link href="/log" className={cn(buttonVariants(), "mt-6 h-11 px-5")}>
          記録へ戻る
        </Link>
      </div>
    );
  }

  if (!editId && phase === "done") {
    return (
      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="paper rounded-3xl px-6 py-10 md:px-10">
          <h1 className="font-mincho text-4xl leading-tight">百の場面が揃った。</h1>
          <p className="mt-4 leading-8 text-[#3f3832]">
            意思決定モデルは、今の回答で組んである。記録から選び直すと、型は組み直される。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/model" className={cn(buttonVariants(), "h-12 px-6")}>
              モデルを見る
            </Link>
            <Link
              href="/log"
              className={cn(buttonVariants({ variant: "outline" }), "h-12 px-6")}
            >
              記録を見直す
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!editId && phase === "break" && round) {
    const answered = buildModel(journal).answered;
    return (
      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="paper rounded-3xl px-6 py-10 md:px-10">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-mincho text-4xl leading-tight outline-none"
          >
            {round.saved > 0
              ? `${round.ids.length}問、置いた。`
              : `${round.ids.length}問を保留した。`}
          </h1>
          <p className="mt-4 leading-8 text-[#3f3832]">
            {round.saved > 0
              ? `この区切りで答えたのは${round.saved}問。モデルはここまでで更新されている。全体では${answered}問。`
              : "答えはまだ増えていない。保留した問は、あとからもう一度来る。"}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-12 px-6"
              onClick={() => {
                const queue = questionQueue(journal);
                setRound(openRound(queue.slice(0, SESSION_SIZE).map((item) => item.id)));
              }}
            >
              もう五問
            </Button>
            <Link
              href="/model"
              className={cn(buttonVariants({ variant: "outline" }), "h-12 px-6")}
            >
              モデルを見る
            </Link>
          </div>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-[#6d645b] underline-offset-4 hover:underline"
          >
            今日はここまで
          </Link>
        </div>
      </section>
    );
  }

  if (!question || !round && !editId) {
    return <p className="px-5 py-24 text-center text-sm text-[#b3a898]">問を開いています</p>;
  }

  const poles = displayPoles(question.id);
  const answered = buildModel(journal).answered;
  const context = contexts[question.context];
  const selected = picked.pole;

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-8 md:py-14">
      <article className="paper rounded-3xl px-5 py-8 md:px-10 md:py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3 text-xs">
          <p>
            <span className="text-[#c4552a]">{context.label}</span>
            <span className="text-[#6d645b]"> / {context.hint}</span>
          </p>
          <p className="tabular-nums text-[#6d645b]">
            {editId
              ? "選び直す"
              : `この区切り ${(round?.cursor ?? 0) + 1}/${round?.ids.length ?? SESSION_SIZE} · 全体 ${answered}/100`}
          </p>
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-mincho mt-8 text-[1.55rem] leading-[1.6] font-medium outline-none md:text-[2rem]"
        >
          {question.situation}
        </h1>
        <div role="radiogroup" aria-label="この場面での選択" className="mt-8 grid gap-3">
          {poles.map((pole, index) => {
            const active = selected === pole;
            return (
              <button
                key={pole}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPicked({ id: question.id, pole })}
                className={cn(
                  "rounded-2xl border px-4 py-4 text-left text-[15px] leading-7 transition",
                  active
                    ? "border-[#1c1712] bg-[#1c1712] text-[#f3ebdd]"
                    : "border-black/10 hover:border-black/30",
                )}
              >
                <span className="font-mincho mr-3 text-sm opacity-60">{index + 1}</span>
                {question.choices[pole]}
              </button>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {editId ? (
            <Link href="/log" className="text-sm text-[#6d645b] underline-offset-4 hover:underline">
              記録へ戻る
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                defer(question.id);
                advance(0);
              }}
              className="text-left text-sm text-[#6d645b] underline-offset-4 hover:underline"
            >
              いまは保留
            </button>
          )}
          <Button className="h-12 px-6" disabled={!selected} onClick={() => selected && choose(selected)}>
            {editId ? "この選択に直す" : "この選択で進む"}
          </Button>
        </div>
      </article>
      <p className="mt-4 hidden text-center text-xs text-[#8d8478] md:block">
        1・2・3 で選び、Enter で進む
      </p>
    </section>
  );
}
