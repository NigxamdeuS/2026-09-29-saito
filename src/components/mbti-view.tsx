"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MbtiResult } from "@/components/mbti-result";
import { Button } from "@/components/ui/button";
import {
  ANSWER_OPTIONS,
  baseItemsOf,
  MODES,
  NA_LABEL,
  nextMode,
  SCENES,
  STATE_ITEMS,
  type AnswerValue,
  type Item,
  type Mode,
} from "@/lib/mbti/items";
import { buildReport } from "@/lib/mbti/report";
import { emptyMbti, loadMbti, saveMbti, type MbtiProgress } from "@/lib/mbti/storage";
import { cn } from "cn";

type Phase = "intro" | "base" | "stateIntro" | "state" | "result";

const DEFAULT_MODE: Mode = "standard";

/** 同じ項目の質問が続かないよう、項目ごとに1問ずつ順番に並べる。 */
function orderOf(mode: Mode): Item[] {
  const items = baseItemsOf(mode);
  const groups = new Map<string, Item[]>();
  for (const item of items) groups.set(item.measure, [...(groups.get(item.measure) ?? []), item]);
  const queues = [...groups.values()];
  const order: Item[] = [];
  while (order.length < items.length) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) order.push(next);
    }
  }
  return order;
}

const ORDERS = Object.fromEntries(MODES.map((mode) => [mode.key, orderOf(mode.key)])) as Record<Mode, Item[]>;

function minutesOf(count: number) {
  return Math.max(1, Math.round(count / 7));
}

const NOTICES = [
  "公式のMBTI検査ではありません。MBTIの4軸を参考にした、このサイト独自の自己理解診断です。公式の質問や説明文は使っていません。",
  "4軸の傾向と、人との関わり方の項目ごとの回答を分析の中心にします。16タイプは、結果を理解するための補助として表示します。",
  "病気やパーソナリティ障害、二重人格などの医学的な診断は行いません。",
  "精度はまだ検証していないため、平均との比較や正確さを示す数値は出しません。",
];

const HOW_TO = [
  "理想の自分ではなく、ふだんの自分の行動に近いものを選んでください。",
  "場面が想像できないときや経験がないときは、「判断できない／経験がない」を選べます。「どちらともいえない」とは別に扱います。",
  "恋愛の経験がなくても答えられます。恋人がいない場合は、家族や親友など親しい相手を思い浮かべてください。",
  "回答はこのブラウザの中だけに保存されます。途中でやめても続きから答えられます。",
  "短い段階の質問は、長い段階にすべて含まれています。あとから長い段階に進むと、それまでの回答を引き継いで、増えた質問だけに答えます。",
];

function answeredCount(progress: MbtiProgress, items: Item[]) {
  return items.filter((item) => progress.answers[item.id]).length;
}

export function MbtiView() {
  const [progress, setProgress] = useState<MbtiProgress | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [persistError, setPersistError] = useState(false);
  const progressRef = useRef<MbtiProgress | null>(null);
  const advancing = useRef(false);

  const commit = useCallback((next: MbtiProgress) => {
    progressRef.current = next;
    setProgress(next);
    setPersistError(!saveMbti(next));
  }, []);

  useEffect(() => {
    const loaded = loadMbti();
    progressRef.current = loaded;
    const timer = window.setTimeout(() => {
      setProgress(loaded);
      if (loaded.mode) {
        const order = ORDERS[loaded.mode];
        if (answeredCount(loaded, order) === order.length && loaded.stateDone) setPhase("result");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const mode = progress?.mode ?? DEFAULT_MODE;
  const order = ORDERS[mode];
  const items = phase === "state" ? STATE_ITEMS : order;

  const choose = useCallback(
    (value: AnswerValue) => {
      const current = progressRef.current;
      if (!current || advancing.current) return;
      const list = phase === "state" ? STATE_ITEMS : ORDERS[current.mode ?? DEFAULT_MODE];
      const item = list[index];
      const next: MbtiProgress = {
        ...current,
        answers: { ...current.answers, [item.id]: { value, version: item.version } },
      };
      commit(next);
      advancing.current = true;
      window.setTimeout(() => {
        advancing.current = false;
        const open = (i: number) => !next.answers[list[i].id];
        const after = list.findIndex((_, i) => i > index && open(i));
        const first = list.findIndex((_, i) => open(i));
        if (after !== -1) setIndex(after);
        else if (first !== -1) setIndex(first);
        else if (index < list.length - 1) setIndex(index + 1);
        else finish(next);
      }, 160);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commit, index, phase],
  );

  function finish(current: MbtiProgress) {
    if (phase === "state") commit({ ...current, stateDone: true });
    setPhase(phase === "base" && !current.stateDone ? "stateIntro" : "result");
    window.scrollTo({ top: 0 });
  }

  useEffect(() => {
    if (phase !== "base" && phase !== "state") return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "0") {
        event.preventDefault();
        choose("na");
        return;
      }
      const value = Number(event.key);
      if (Number.isInteger(value) && value >= 1 && value <= 5) {
        event.preventDefault();
        choose(value as AnswerValue);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, phase]);

  const report = useMemo(
    () => (progress && phase === "result" ? buildReport(progress.answers, mode) : null),
    [progress, phase, mode],
  );

  if (!progress) {
    return <p className="px-5 py-24 text-center text-sm text-[#8ea3bd]">読み込んでいます…</p>;
  }

  const saveWarning = persistError && (
    <p role="alert" className="mt-4 text-sm leading-6 text-[#fca5a5]">
      このブラウザに回答を保存できませんでした。タブを閉じると、回答は消えてしまいます。
    </p>
  );

  function start(list: Item[], nextPhase: Phase) {
    const current = progressRef.current!;
    const first = list.findIndex((item) => !current.answers[item.id]);
    setIndex(first === -1 ? 0 : first);
    setPhase(nextPhase);
    window.scrollTo({ top: 0 });
  }

  function selectMode(key: Mode) {
    commit({ ...progressRef.current!, mode: key });
  }

  if (phase === "intro") {
    const answered = answeredCount(progress, order);
    const finished = answered === order.length;
    const anyAnswered = Object.keys(progress.answers).length > 0;
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-10 md:py-16">
        <p className="text-sm text-[#22d3ee]">
          {MODES.map((item) => baseItemsOf(item.key).length).join(" / ")}問 · 4段階から選べます
        </p>
        <h1 className="font-mincho mt-3 text-4xl leading-tight md:text-5xl">4軸タイプ診断</h1>
        <p className="mt-2 text-sm text-[#8ea3bd]">MBTIの4軸を参考にした独自の自己理解診断</p>
        <p className="mt-5 text-[15px] leading-8 text-[#cfdcec]">
          人との交流と一人の時間、物事の捉え方、判断で重視すること、計画と柔軟さの4つの軸と、会話・連絡・距離感・衝突時の対応など人との関わり方を測ります。どんな人と合いやすいかや、二人の結果の比べ方も表示します。
        </p>

        <div className="mt-6 rounded-2xl border border-white/15 px-4 py-4 text-sm leading-7 text-[#cfdcec]">
          <ul className="space-y-2">
            {NOTICES.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="text-[#8ea3bd]">・</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <h2 className="font-mincho mt-10 text-xl">段階を選ぶ</h2>
        <p className="mt-2 text-sm leading-7 text-[#c5d4e6]">
          質問が多いほど、一つひとつの結果が安定し、読み取れることも増えます。
        </p>
        <div className="mt-4 grid gap-3" role="radiogroup" aria-label="診断の段階">
          {MODES.map((item) => {
            const list = ORDERS[item.key];
            const done = answeredCount(progress, list);
            const selected = item.key === mode;
            return (
              <button
                key={item.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectMode(item.key)}
                className={cn(
                  "rounded-2xl border px-5 py-4 text-left transition-colors",
                  selected
                    ? "border-[#22d3ee] bg-[#22d3ee]/10 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
                    : "border-white/15 hover:border-white/40",
                )}
              >
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-lg font-medium">
                    {item.label}
                    <span className="font-mincho ml-3 text-[#22d3ee] tabular-nums">{list.length}問</span>
                  </span>
                  <span className="text-xs text-[#8ea3bd] tabular-nums">
                    約{minutesOf(list.length)}分{done > 0 && ` · 回答済み ${done}/${list.length}`}
                  </span>
                </span>
                <span className="mt-1 block text-sm leading-7 text-[#c5d4e6]">{item.desc}</span>
              </button>
            );
          })}
        </div>

        <h2 className="font-mincho mt-10 text-xl">答え方</h2>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-[#c5d4e6]">
          {HOW_TO.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-[#8ea3bd]">・</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            className="h-12 px-6 text-base"
            onClick={() => {
              if (!progress.mode) selectMode(mode);
              if (finished) setPhase(progress.stateDone ? "result" : "stateIntro");
              else start(order, "base");
            }}
          >
            {finished
              ? "結果を見る"
              : answered > 0
                ? `続きから（${answered}/${order.length}）`
                : `${MODES.find((item) => item.key === mode)!.label}ではじめる`}
          </Button>
          {anyAnswered && (
            <Button
              variant="outline"
              className="h-12 px-6 text-base"
              onClick={() => {
                commit({ ...emptyMbti(), mode: progress.mode });
                setIndex(0);
              }}
            >
              回答をすべて消す
            </Button>
          )}
        </div>
        {saveWarning}
      </div>
    );
  }

  if (phase === "stateIntro") {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-10 md:py-16">
        <p className="text-sm text-[#22d3ee]">基本の{order.length}問が終わりました</p>
        <h1 className="font-mincho mt-3 text-3xl leading-tight">いまの状態について（{STATE_ITEMS.length}問）</h1>
        <p className="mt-5 text-[15px] leading-8 text-[#cfdcec]">
          最後に、最近の疲れや、今どんな関係を求めているかを聞きます。性格の傾向とは別に扱い、基本診断の点数には加えません。疲れが結果に影響していそうなときに、そのことを結果の中でお知らせするために使います。
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button className="h-12 px-6 text-base" onClick={() => start(STATE_ITEMS, "state")}>
            答える
          </Button>
          <Button
            variant="outline"
            className="h-12 px-6 text-base"
            onClick={() => {
              commit({ ...progress, stateDone: true });
              setPhase("result");
            }}
          >
            答えずに結果を見る
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "result" && report) {
    const upgrade = nextMode(mode);
    return (
      <MbtiResult
        report={report}
        next={
          upgrade
            ? {
                label: upgrade.label,
                total: ORDERS[upgrade.key].length,
                remaining: ORDERS[upgrade.key].length - answeredCount(progress, ORDERS[upgrade.key]),
                desc: upgrade.desc,
              }
            : null
        }
        onUpgrade={() => {
          if (!upgrade) return;
          selectMode(upgrade.key);
          const list = ORDERS[upgrade.key];
          if (answeredCount(progress, list) < list.length) start(list, "base");
          else window.scrollTo({ top: 0 });
        }}
        onRetake={() => {
          commit({ ...emptyMbti(), mode: progress.mode });
          setIndex(0);
          setPhase("intro");
          window.scrollTo({ top: 0 });
        }}
        onChangeMode={() => {
          setPhase("intro");
          window.scrollTo({ top: 0 });
        }}
        onReview={() => start(order, "base")}
      />
    );
  }

  const item = items[index];
  const selected = progress.answers[item.id]?.value;
  const answered = answeredCount(progress, items);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-5 py-6 md:py-12">
      <div className="flex items-center justify-between text-xs text-[#8ea3bd]">
        <span>{phase === "state" ? "いまの状態" : `${SCENES[item.scene]}の場面`}</span>
        <span className="tabular-nums">
          {index + 1} / {items.length}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div
          className="h-full rounded-full bg-[#22d3ee] transition-[width] duration-300"
          style={{ width: `${(answered / items.length) * 100}%` }}
        />
      </div>

      <p
        key={item.id}
        className="mt-10 min-h-[6rem] text-2xl leading-[1.6] font-medium animate-in fade-in duration-300 md:text-[1.6rem]"
      >
        {item.text}
      </p>

      <div className="mt-8 grid gap-2.5">
        {ANSWER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected === option.value}
            onClick={() => choose(option.value)}
            className={cn(
              "flex h-14 items-center gap-4 rounded-2xl border px-5 text-left text-base transition-colors",
              selected === option.value
                ? "border-[#22d3ee] bg-[#22d3ee] text-[#031018]"
                : "border-white/15 hover:border-white/40 hover:bg-white/5",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "hidden size-7 shrink-0 items-center justify-center rounded-full border text-xs sm:flex",
                selected === option.value ? "border-[#031018]/40" : "border-white/20 text-[#8ea3bd]",
              )}
            >
              {option.value}
            </span>
            {option.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={selected === "na"}
          onClick={() => choose("na")}
          className={cn(
            "mt-2 flex h-12 items-center gap-4 rounded-2xl border border-dashed px-5 text-left text-sm transition-colors",
            selected === "na"
              ? "border-[#22d3ee] bg-[#22d3ee] text-[#031018]"
              : "border-white/20 text-[#c5d4e6] hover:border-white/40 hover:bg-white/5",
          )}
        >
          <span aria-hidden className="hidden w-7 shrink-0 text-center text-xs text-[#8ea3bd] sm:inline">
            0
          </span>
          {NA_LABEL}
        </button>
      </div>

      <div className="mt-8 flex items-center justify-between text-sm">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
          className="py-3 text-[#8ea3bd] underline-offset-4 hover:underline disabled:opacity-40"
        >
          ← 前の質問
        </button>
        {answered === items.length ? (
          <button
            type="button"
            onClick={() => finish(progress)}
            className="py-3 text-[#22d3ee] underline-offset-4 hover:underline"
          >
            次へ進む →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPhase("intro")}
            className="py-3 text-[#8ea3bd] underline-offset-4 hover:underline"
          >
            中断する（回答は保存されます）
          </button>
        )}
      </div>
      {saveWarning}
    </div>
  );
}
