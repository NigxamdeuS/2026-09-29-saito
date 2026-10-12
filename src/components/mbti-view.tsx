"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MbtiResult } from "@/components/mbti-result";
import { Button } from "@/components/ui/button";
import {
  ANSWER_OPTIONS,
  baseItemsOf,
  DEPENDS_LABEL,
  FOLLOWUP,
  FOLLOWUP_GAP,
  NA_LABEL,
  nextStage,
  SCENES,
  STAGES,
  STATE_ITEMS,
  type AnswerValue,
  type FollowupChoice,
  type Item,
  type Mode,
} from "@/lib/mbti/items";
import { buildReport } from "@/lib/mbti/report";
import { emptyMbti, loadMbti, saveMbti, type MbtiProgress } from "@/lib/mbti/storage";
import { estimateMinutes } from "@/lib/mbti/validation";
import { cn } from "cn";

type Phase = "intro" | "base" | "followup" | "stageDone" | "stateIntro" | "state" | "result";

const DEFAULT_MODE: Mode = "standard";

function roundRobin(items: Item[]) {
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

/** 短い段階の質問が先に来るよう、段階の中では項目を1問ずつ混ぜる。 */
function orderOf(mode: Mode): Item[] {
  const items = baseItemsOf(mode);
  return ([1, 2, 3, 4] as const).flatMap((tier) => roundRobin(items.filter((item) => item.tier === tier)));
}

const ORDERS = Object.fromEntries(STAGES.map((stage) => [stage.key, orderOf(stage.key)])) as Record<Mode, Item[]>;

const NOTICES = [
  "公式のMBTI検査ではありません。MBTIの4軸を参考にした、このサイト独自の自己理解診断です。公式の質問や説明文は使っていません。",
  "4軸の傾向と、人との関わり方の項目ごとの回答を分析の中心にします。16タイプは、結果を理解するための補助として表示します。",
  "病気やパーソナリティ障害、二重人格などの医学的な診断は行いません。",
  "追加回答で分析する項目が増えます。長いほど必ず正確、最高精度、といった表示はしていません。",
];

const HOW_TO = [
  "理想の自分ではなく、ふだんの自分の行動に近いものを選んでください。",
  "「状況による」と「経験がない／判断できない」は、中間の「どちらともいえない」とは別に扱います。点数の真ん中や低い点にはしません。",
  "「状況による」を選ぶと、短い補足が出ることがあります。飛ばしても構いません。補足は基本の点数には使いません。",
  "恋愛の経験がなくても答えられます。恋人がいない場合は、家族や親友など親しい相手を思い浮かべてください。",
  "回答はこのブラウザの中だけに保存されます。途中でやめても続きから答えられます。",
  "短い段階の質問は、長い段階にすべて含まれています。あとから長い段階に進むと、それまでの回答を引き継いで、増えた質問だけに答えます。",
];

function answeredCount(progress: MbtiProgress, items: Item[]) {
  return items.filter((item) => progress.answers[item.id]).length;
}

function followupCount(progress: MbtiProgress) {
  return Object.keys(progress.followups).length;
}

export function MbtiView() {
  const [progress, setProgress] = useState<MbtiProgress | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [followupOf, setFollowupOf] = useState<Item | null>(null);
  const [persistError, setPersistError] = useState(false);
  const progressRef = useRef<MbtiProgress | null>(null);
  const advancing = useRef(false);
  const shownAt = useRef(0);

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

  useEffect(() => {
    shownAt.current = Date.now();
  }, [index, phase, followupOf]);

  const mode = progress?.mode ?? DEFAULT_MODE;
  const order = ORDERS[mode];
  const items = phase === "state" ? STATE_ITEMS : order;

  function elapsed() {
    return Math.min(Date.now() - shownAt.current, 10 * 60 * 1000);
  }

  function withTiming(current: MbtiProgress, id: string): MbtiProgress {
    return { ...current, timings: { ...current.timings, [id]: elapsed() } };
  }

  function finish(current: MbtiProgress) {
    if (phase === "state") {
      commit({ ...current, stateDone: true });
      setPhase("result");
      window.scrollTo({ top: 0 });
      return;
    }
    const key = current.mode ?? DEFAULT_MODE;
    if (nextStage(key)) {
      setPhase("stageDone");
    } else {
      setPhase(current.stateDone ? "result" : "stateIntro");
    }
    window.scrollTo({ top: 0 });
  }

  function advanceAfter(current: MbtiProgress, list: Item[]) {
    const unanswered = (i: number) => !current.answers[list[i].id];
    const after = list.findIndex((_, i) => i > index && unanswered(i));
    const first = list.findIndex((_, i) => unanswered(i));
    if (after !== -1) setIndex(after);
    else if (first !== -1) setIndex(first);
    else if (index < list.length - 1) setIndex(index + 1);
    else finish(current);
  }

  const choose = useCallback(
    (value: AnswerValue) => {
      const current = progressRef.current;
      if (!current || advancing.current) return;
      const list = phase === "state" ? STATE_ITEMS : ORDERS[current.mode ?? DEFAULT_MODE];
      const item = list[index];
      const previous = current.answers[item.id];
      const changed = previous && previous.value !== value;
      const followups = { ...current.followups };
      if (value !== "depends") delete followups[item.id];
      const next: MbtiProgress = withTiming(
        {
          ...current,
          answers: { ...current.answers, [item.id]: { value, version: item.version } },
          followups,
          changes: changed ? { ...current.changes, [item.id]: (current.changes[item.id] ?? 0) + 1 } : current.changes,
          followupGap: current.followupGap + 1,
        },
        item.id,
      );
      commit(next);
      advancing.current = true;
      window.setTimeout(() => {
        advancing.current = false;
        if (phase === "base" && value === "depends" && next.followupGap >= FOLLOWUP_GAP) {
          setFollowupOf(item);
          setPhase("followup");
          return;
        }
        advanceAfter(next, list);
      }, 160);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commit, index, phase],
  );

  function chooseFollowup(value: FollowupChoice | "skip") {
    const current = progressRef.current;
    const item = followupOf;
    if (!current || !item) return;
    const next: MbtiProgress = {
      ...current,
      followups: { ...current.followups, [item.id]: { value, version: FOLLOWUP.version } },
      followupGap: 0,
    };
    commit(next);
    setFollowupOf(null);
    setPhase("base");
    advanceAfter(next, ORDERS[current.mode ?? DEFAULT_MODE]);
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
      if (event.key === "9") {
        event.preventDefault();
        choose("depends");
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
    () => (progress && phase === "result" ? buildReport(progress.answers, mode, progress.followups) : null),
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

  function goToResults(current: MbtiProgress) {
    setPhase(current.stateDone ? "result" : "stateIntro");
    window.scrollTo({ top: 0 });
  }

  if (phase === "intro") {
    const answered = answeredCount(progress, order);
    const finished = answered === order.length;
    const anyAnswered = Object.keys(progress.answers).length > 0;
    const stage = STAGES.find((item) => item.key === mode)!;
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-10 md:py-16">
        <p className="text-sm text-[#22d3ee]">
          {STAGES.map((item) => baseItemsOf(item.key).length).join(" / ")}問 · 4段階から選べます
        </p>
        <h1 className="font-mincho mt-3 text-4xl leading-tight md:text-5xl">4軸タイプ診断</h1>
        <p className="mt-2 text-sm text-[#8ea3bd]">MBTIの4軸を参考にした独自の自己理解診断</p>
        <p className="mt-5 text-[15px] leading-8 text-[#cfdcec]">
          人との交流と一人の時間、物事の捉え方、判断で重視すること、計画と柔軟さの4つの軸と、会話・連絡・距離感・衝突時の対応など人との関わり方を測ります。短い段階では概要を出し、追加の回答で分析する項目が増えます。
        </p>

        <div className="mt-6 rounded-2xl border border-white/15 px-4 py-4 text-sm leading-7 text-[#cfdcec]">
          <ul className="space-y-2">
            {NOTICES.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="text-[#8ea3bd]">
                  ・
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <h2 className="font-mincho mt-10 text-xl">段階を選ぶ</h2>
        <p className="mt-2 text-sm leading-7 text-[#c5d4e6]">追加回答で分析する項目が増えます。所要時間は、このブラウザでの実測があればそれに合わせます。</p>
        <div className="mt-4 grid gap-3" role="radiogroup" aria-label="診断の段階">
          {STAGES.map((item) => {
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
                    {item.name}
                    <span className="font-mincho ml-3 text-[#22d3ee] tabular-nums">{item.label}</span>
                  </span>
                  <span className="text-xs text-[#8ea3bd] tabular-nums">
                    約{estimateMinutes(list.length, progress.timings)}分{done > 0 && ` · 回答済み ${done}/${list.length}`}
                  </span>
                </span>
                <span className="mt-1 block text-sm leading-7 text-[#c5d4e6]">{item.desc}</span>
                <span className="mt-2 block text-xs leading-6 text-[#8ea3bd]">
                  測ること：{item.measures}
                </span>
                <span className="mt-1 block text-xs leading-6 text-[#8ea3bd]">
                  新しく分かること：{item.adds.join("／")}
                </span>
                <span className="mt-1 block text-xs leading-6 text-[#66798f]">
                  まだ判断できないこと：{item.notYet.join("／")}
                </span>
              </button>
            );
          })}
        </div>

        <h2 className="font-mincho mt-10 text-xl">答え方</h2>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-[#c5d4e6]">
          {HOW_TO.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-[#8ea3bd]">
                ・
              </span>
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
                ? `続きから（基本 ${answered}/${order.length}）`
                : `${stage.name}（${stage.label}）ではじめる`}
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

  if (phase === "stageDone") {
    const upgrade = nextStage(mode);
    const remaining = upgrade ? ORDERS[upgrade.key].length - answeredCount(progress, ORDERS[upgrade.key]) : 0;
    const stage = STAGES.find((item) => item.key === mode)!;
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-10 md:py-16">
        <p className="text-sm text-[#22d3ee]">{stage.label}が終わりました</p>
        <h1 className="font-mincho mt-3 text-3xl leading-tight">ここまでの結果を見るか、次の段階へ進みます</h1>
        <p className="mt-5 text-[15px] leading-8 text-[#cfdcec]">
          追加回答で分析する項目が増えます。ここまでの回答は引き継ぎます。
        </p>
        {upgrade && (
          <div className="mt-6 rounded-2xl border border-white/15 px-4 py-4 text-sm leading-7 text-[#c5d4e6]">
            <p className="font-medium text-[#eef6ff]">
              次は{upgrade.name}（{upgrade.label}）
            </p>
            <p className="mt-1">{upgrade.desc}</p>
            <p className="mt-1 text-xs text-[#8ea3bd]">新しく分かること：{upgrade.adds.join("／")}</p>
            <p className="mt-1 text-xs text-[#66798f]">まだ判断できないこと：{upgrade.notYet.join("／")}</p>
          </div>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button className="h-12 px-6 text-base" onClick={() => goToResults(progress)}>
            ここまでの結果を見る
          </Button>
          {upgrade && (
            <Button
              variant="outline"
              className="h-12 px-6 text-base"
              onClick={() => {
                selectMode(upgrade.key);
                const list = ORDERS[upgrade.key];
                if (answeredCount(progress, list) < list.length) start(list, "base");
                else goToResults({ ...progress, mode: upgrade.key });
              }}
            >
              回答を引き継いで、次の段階へ進む{remaining > 0 ? `（あと${remaining}問）` : ""}
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
    const upgrade = nextStage(mode);
    return (
      <MbtiResult
        report={report}
        next={
          upgrade
            ? {
                label: `${upgrade.name}（${upgrade.label}）`,
                total: ORDERS[upgrade.key].length,
                remaining: ORDERS[upgrade.key].length - answeredCount(progress, ORDERS[upgrade.key]),
                desc: upgrade.desc,
                adds: upgrade.adds,
              }
            : null
        }
        answers={progress.answers}
        timings={progress.timings}
        followups={progress.followups}
        changes={progress.changes}
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

  if (phase === "followup" && followupOf) {
    const pending = followupCount(progress);
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col px-5 py-6 md:py-12">
        <div className="flex items-center justify-between text-xs text-[#8ea3bd]">
          <span>補足質問（基本の点数には使いません）</span>
          <span className="tabular-nums">基本の残り {order.length - answeredCount(progress, order)}問</span>
        </div>
        <p className="mt-3 text-sm leading-7 text-[#c5d4e6]">
          直前の質問「{followupOf.text}」に「{DEPENDS_LABEL}」と答えました。
        </p>
        <p className="mt-6 min-h-[4rem] text-2xl leading-[1.6] font-medium md:text-[1.6rem]">{FOLLOWUP.text}</p>
        <div className="mt-8 grid gap-2.5">
          {FOLLOWUP.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => chooseFollowup(option.value)}
              className="flex h-14 items-center rounded-2xl border border-white/15 px-5 text-left text-base hover:border-white/40 hover:bg-white/5"
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => chooseFollowup("skip")}
            className="mt-2 flex h-12 items-center rounded-2xl border border-dashed border-white/20 px-5 text-left text-sm text-[#c5d4e6] hover:border-white/40"
          >
            この補足は飛ばす
          </button>
        </div>
        <p className="mt-6 text-xs text-[#8ea3bd]">これまでに答えた補足は{pending}問です。補足は基本{order.length}問とは別に数えます。</p>
        {saveWarning}
      </div>
    );
  }

  const item = items[index];
  const selected = progress.answers[item.id]?.value;
  const answered = answeredCount(progress, items);
  const extras = followupCount(progress);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-5 py-6 md:py-12">
      <div className="flex items-center justify-between text-xs text-[#8ea3bd]">
        <span>{phase === "state" ? "いまの状態" : `${SCENES[item.scene]}の場面`}</span>
        <span className="tabular-nums">
          {phase === "state"
            ? `${index + 1} / ${items.length}`
            : `基本 ${answered} / ${items.length}（残り ${items.length - answered}）`}
        </span>
      </div>
      {phase === "base" && extras > 0 && (
        <p className="mt-1 text-xs text-[#8ea3bd]">補足質問は別に{extras}問答えています（基本の点数には使いません）</p>
      )}
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
          aria-pressed={selected === "depends"}
          onClick={() => choose("depends")}
          className={cn(
            "mt-2 flex h-12 items-center gap-4 rounded-2xl border border-dashed px-5 text-left text-sm transition-colors",
            selected === "depends"
              ? "border-[#22d3ee] bg-[#22d3ee] text-[#031018]"
              : "border-white/20 text-[#c5d4e6] hover:border-white/40 hover:bg-white/5",
          )}
        >
          <span aria-hidden className="hidden w-7 shrink-0 text-center text-xs text-[#8ea3bd] sm:inline">
            9
          </span>
          {DEPENDS_LABEL}
        </button>
        <button
          type="button"
          aria-pressed={selected === "na"}
          onClick={() => choose("na")}
          className={cn(
            "flex h-12 items-center gap-4 rounded-2xl border border-dashed px-5 text-left text-sm transition-colors",
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

