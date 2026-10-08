"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useJournal } from "@/components/journal-context";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  answeredCount,
  heldCount,
  MAX_NOTE_LENGTH,
  nextRound,
  type Choice,
  type Journal,
} from "@/lib/journal";
import { getQuestion, TOTAL_QUESTIONS } from "@/lib/questions";
import { cn } from "cn";

type Phase = "ask" | "break" | "done";

type Round = {
  ids: string[];
  cursor: number;
  saved: number;
  phase: Phase;
};

type Draft = {
  key: string;
  choice: Choice | null;
  note: string;
};

function openRound(journal: Journal): Round {
  const ids = nextRound(journal);
  return { ids, cursor: 0, saved: 0, phase: ids.length === 0 ? "done" : "ask" };
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable)
  );
}

export function AskView() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("q");
  const { ready, journal, answer } = useJournal();
  const router = useRouter();
  const [round, setRound] = useState<Round | null>(null);
  const [draft, setDraft] = useState<Draft>({ key: "", choice: null, note: "" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  if (ready && !editId && round === null) {
    setRound(openRound(journal));
  }

  const questionId = editId ?? round?.ids[round.cursor] ?? "";
  if (ready && questionId !== draft.key) {
    const saved = editId ? journal.answers[editId] : undefined;
    setDraft({ key: questionId, choice: saved?.choice ?? null, note: saved?.note ?? "" });
  }

  const question = questionId ? getQuestion(questionId) : undefined;
  const phase: Phase = editId ? "ask" : (round?.phase ?? "ask");

  useEffect(() => {
    headingRef.current?.focus();
    if (questionId) window.scrollTo(0, 0);
  }, [phase, questionId]);

  function submit() {
    if (!question || draft.choice === null) return;
    answer(question.id, draft.choice, draft.note);
    if (editId) {
      router.push("/log");
      return;
    }
    setRound((current) => {
      if (!current) return current;
      const saved = current.saved + 1;
      if (current.cursor + 1 >= current.ids.length) return { ...current, saved, phase: "break" };
      return { ...current, saved, cursor: current.cursor + 1 };
    });
  }

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    if (!question || phase !== "ask") return;
    const key = question.id;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.key === "1" || event.key === "2" || event.key === "3") {
        event.preventDefault();
        const choice = Number(event.key) as Choice;
        setDraft((current) => (current.key === key ? { ...current, choice } : current));
      }
      if (
        event.key === "Enter" &&
        event.target instanceof HTMLElement &&
        event.target.tagName !== "BUTTON" &&
        event.target.tagName !== "A"
      ) {
        event.preventDefault();
        submitRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, phase]);

  if (!ready || (!editId && round === null)) {
    return <p className="px-5 py-24 text-center text-sm text-[#b3a898]">記録を読み込んでいます…</p>;
  }

  if (editId && !question) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-16">
        <p className="font-mincho text-2xl">この質問は見つかりませんでした。</p>
        <Link href="/log" className={cn(buttonVariants(), "mt-6 h-11 px-5")}>
          履歴に戻る
        </Link>
      </div>
    );
  }

  if (!editId && phase === "done") {
    return (
      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="paper rounded-3xl px-6 py-10 md:px-10">
          <h1 className="font-mincho text-4xl leading-tight">100問すべてに答えました。</h1>
          <p className="mt-4 leading-8 text-[#3f3832]">
            まとめでは、条件を変えた質問での答えを並べて見られます。履歴から、答えや理由を書き直すこともできます。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/model" className={cn(buttonVariants(), "h-12 px-6")}>
              まとめを見る
            </Link>
            <Link href="/log" className={cn(buttonVariants({ variant: "outline" }), "h-12 px-6")}>
              回答を見直す
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!editId && phase === "break" && round) {
    const answered = answeredCount(journal);
    return (
      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <div className="paper rounded-3xl px-6 py-10 md:px-10">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-mincho text-4xl leading-tight outline-none"
          >
            {`今回の${round.ids.length}問が終わりました。`}
          </h1>
          <p className="mt-4 leading-8 text-[#3f3832]">
            {`ここまでの回答は${answered}/${TOTAL_QUESTIONS}問です（うち保留${heldCount(journal)}問）。100問を一度に答える必要はありません。続きは、次に開いたときにここから始まります。`}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {answered < TOTAL_QUESTIONS && (
              <Button className="h-12 px-6" onClick={() => setRound(openRound(journal))}>
                次の5問へ
              </Button>
            )}
            <Link
              href="/model"
              className={cn(
                buttonVariants({ variant: answered < TOTAL_QUESTIONS ? "outline" : "default" }),
                "h-12 px-6",
              )}
            >
              まとめを見る
            </Link>
          </div>
          <Link
            href="/scenes"
            className="mt-6 inline-block text-sm text-[#6d645b] underline-offset-4 hover:underline"
          >
            今日はここまでにする
          </Link>
        </div>
      </section>
    );
  }

  if (!question) {
    return <p className="px-5 py-24 text-center text-sm text-[#b3a898]">質問を読み込んでいます…</p>;
  }

  const options: { choice: Choice; label: string; text: string }[] = [
    ...question.choices.map((text, index) => ({
      choice: (index + 1) as Choice,
      label: String(index + 1),
      text,
    })),
    { choice: "hold", label: "保留", text: "どれも当てはまらない・条件が足りず決められない" },
  ];

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-8 md:py-14">
      <article className="paper rounded-3xl px-5 py-8 md:px-10 md:py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3 text-xs">
          <p>
            <span className="text-[#c4552a]">{question.category}</span>
            <span className="text-[#6d645b]">／{question.topic}</span>
          </p>
          <p className="tabular-nums text-[#6d645b]">
            {editId
              ? `第${question.number}問／${TOTAL_QUESTIONS} · 選び直し`
              : `第${question.number}問／${TOTAL_QUESTIONS} · 今回 ${(round?.cursor ?? 0) + 1}/${round?.ids.length ?? 0}`}
          </p>
        </div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-mincho mt-8 text-[1.45rem] leading-[1.65] font-medium outline-none md:text-[1.85rem]"
        >
          {question.situation}
        </h1>
        <div role="radiogroup" aria-label="この場面で取りそうな行動" className="mt-8 grid gap-3">
          {options.map((option) => {
            const active = draft.choice === option.choice;
            const hold = option.choice === "hold";
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDraft((current) => ({ ...current, choice: option.choice }))}
                className={cn(
                  "flex items-baseline rounded-2xl border px-4 py-4 text-left text-[15px] leading-7 transition",
                  hold && "border-dashed",
                  active
                    ? "border-[#1c1712] bg-[#1c1712] text-[#f3ebdd]"
                    : hold
                      ? "border-black/20 text-[#3f3832] hover:border-black/40"
                      : "border-black/10 hover:border-black/30",
                )}
              >
                <span className="font-mincho mr-3 shrink-0 text-sm opacity-60">{option.label}</span>
                <span className={cn(hold && "text-sm")}>{option.text}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-6">
          <label htmlFor="answer-note" className="text-sm font-medium">
            理由・補足<span className="ml-2 text-xs font-normal text-[#6d645b]">任意</span>
          </label>
          <p id="answer-note-help" className="mt-1 text-xs leading-6 text-[#6d645b]">
            {draft.choice === "hold"
              ? "決められなかった理由や、足りなかった条件を書けます。"
              : "迷った点や、どんな条件なら別の行動を選ぶかを書いても構いません。"}
          </p>
          <textarea
            id="answer-note"
            rows={3}
            maxLength={MAX_NOTE_LENGTH}
            value={draft.note}
            onChange={(event) => {
              const note = event.target.value;
              setDraft((current) => ({ ...current, note }));
            }}
            aria-describedby="answer-note-help"
            className="mt-2 w-full resize-y rounded-xl border border-black/15 bg-white/60 px-3 py-2.5 text-base leading-7 outline-none transition focus:border-[#c4552a] focus:ring-3 focus:ring-[#c4552a]/20 sm:text-[15px]"
          />
        </div>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={editId ? "/log" : "/"}
            className="text-sm text-[#6d645b] underline-offset-4 hover:underline"
          >
            {editId ? "履歴に戻る" : "今日はここまでにする"}
          </Link>
          <Button className="h-12 px-6" disabled={draft.choice === null} onClick={submit}>
            {editId ? "この答えに変更する" : "この答えで次へ"}
          </Button>
        </div>
      </article>
      <p className="mt-4 hidden text-center text-xs text-[#8d8478] md:block">
        1・2・3 キーで選択し、Enter キーで次へ進めます（理由の欄に入力中は使えません）
      </p>
    </section>
  );
}
