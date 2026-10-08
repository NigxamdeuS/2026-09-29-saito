"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchDiagnosisStats, submitDiagnosis, withdrawDiagnosis } from "@/app/diagnosis-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AGE_GROUPS,
  ageLabel,
  BAND_SOURCE,
  DISSOCIATION_REFERENCES,
  DISSOCIATION_SOURCE,
  dissociationBand,
  formatScore,
  MIN_GROUP_SIZE,
  scoreTest,
  SELF_ESTEEM_REFERENCES,
  SELF_ESTEEM_SOURCE,
  selfEsteemLevel,
  TESTS,
  type AgeGroup,
  type Reference,
  type ScoreDef,
  type Scores,
  type TestId,
  type TestStats,
} from "@/lib/diagnosis";
import {
  answeredItems,
  emptyProgress,
  isComplete,
  loadProgress,
  saveProgress,
  type Progress,
} from "@/lib/diagnosis-storage";
import { cn } from "cn";

type Phase = "intro" | "question" | "result";
type StatsState = { status: "idle" | "loading" | "error" } | { status: "ok"; stats: TestStats };

const OTHER_TEST: Record<TestId, { href: string; label: string }> = {
  confidence: { href: "/dissociation", label: "解離傾向チェックへ" },
  dissociation: { href: "/confidence", label: "自信度診断へ" },
};

export function DiagnosisView({ testId }: { testId: TestId }) {
  const test = TESTS[testId];
  const [progress, setProgress] = useState<Progress | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState<StatsState>({ status: "idle" });
  const [persistError, setPersistError] = useState(false);
  const progressRef = useRef<Progress | null>(null);
  const advancing = useRef(false);

  const commit = useCallback(
    (next: Progress) => {
      progressRef.current = next;
      setProgress(next);
      setPersistError(!saveProgress(testId, next));
    },
    [testId],
  );

  const syncStats = useCallback(
    async (current: Progress) => {
      setStats({ status: "loading" });
      const answers = current.answers as number[];
      let submissionId = current.submissionId;
      if (current.share && current.age && !current.submitted) {
        submissionId ??= crypto.randomUUID();
        const result = await submitDiagnosis({ testId, submissionId, age: current.age, answers });
        if (result.ok) {
          commit({ ...(progressRef.current ?? current), submissionId, submitted: true });
          setStats({ status: "ok", stats: result.stats });
          return;
        }
      } else if (!current.share && current.submitted && submissionId) {
        const result = await withdrawDiagnosis({ testId, submissionId });
        if (result.ok) {
          commit({ ...(progressRef.current ?? current), submitted: false });
          setStats({ status: "ok", stats: result.stats });
          return;
        }
      }
      const result = await fetchDiagnosisStats(testId);
      setStats(result.ok ? { status: "ok", stats: result.stats } : { status: "error" });
    },
    [commit, testId],
  );

  useEffect(() => {
    const loaded = loadProgress(testId);
    progressRef.current = loaded;
    const timer = window.setTimeout(() => {
      setProgress(loaded);
      if (isComplete(loaded)) {
        setPhase("result");
        void syncStats(loaded);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [syncStats, testId]);

  const choose = useCallback(
    (value: number) => {
      const current = progressRef.current;
      if (!current || advancing.current) return;
      const answers = [...current.answers];
      answers[index] = value;
      const next = { ...current, answers, submitted: false };
      commit(next);
      advancing.current = true;
      window.setTimeout(() => {
        advancing.current = false;
        const nextIndex = answers.findIndex((answer, i) => i > index && answer === null);
        const firstOpen = answers.findIndex((answer) => answer === null);
        if (nextIndex !== -1) {
          setIndex(nextIndex);
        } else if (firstOpen !== -1) {
          setIndex(firstOpen);
        } else {
          setPhase("result");
          window.scrollTo({ top: 0 });
          void syncStats(next);
        }
      }, 160);
    },
    [commit, index, syncStats],
  );

  useEffect(() => {
    if (phase !== "question" || test.options.length > 9) return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const position = Number(event.key);
      if (Number.isInteger(position) && position >= 1 && position <= test.options.length) {
        event.preventDefault();
        choose(test.options[position - 1].value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, phase, test.options]);

  if (!progress) {
    return <p className="px-5 py-24 text-center text-sm text-[#b3a898]">読み込んでいます…</p>;
  }

  const saveWarning = persistError && (
    <p role="alert" className="mt-4 text-sm leading-6 text-[#e7b5a4]">
      このブラウザに回答を保存できませんでした。タブを閉じると、回答は消えてしまいます。
    </p>
  );

  if (phase === "intro") {
    const answered = answeredItems(progress);
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-10 md:py-16">
        <p className="text-sm text-[#e25c2a]">{test.items.length}問 · 約{Math.ceil(test.items.length / 6)}分</p>
        <h1 className="font-mincho mt-3 text-4xl leading-tight md:text-5xl">{test.title}</h1>
        <p className="mt-5 text-[15px] leading-8 text-[#ddd4c6]">{test.lead}</p>
        <ul className="mt-6 space-y-2 text-sm leading-7 text-[#d9d0c3]">
          {test.instructions.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-[#b3a898]">・</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <fieldset className="mt-10">
          <legend className="font-mincho text-xl">年代を選んでください</legend>
          <p className="mt-1 text-xs leading-6 text-[#b3a898]">同じ年代の平均と比べるために使います。</p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {AGE_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                aria-pressed={progress.age === group.id}
                onClick={() => commit({ ...progress, age: group.id, submitted: false })}
                className={cn(
                  "h-12 rounded-xl border text-sm transition-colors",
                  progress.age === group.id
                    ? "border-[#e25c2a] bg-[#e25c2a] text-[#1c100c]"
                    : "border-white/15 hover:border-white/40",
                )}
              >
                {group.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#d9d0c3]">
          <input
            type="checkbox"
            checked={progress.share}
            onChange={(event) => commit({ ...progress, share: event.target.checked })}
            className="mt-1 size-4 accent-[#e25c2a]"
          />
          <span>
            結果を匿名の平均値づくりに加える
            <span className="block text-xs text-[#b3a898]">
              送るのは年代と点数だけです。名前・メールアドレス・個々の回答は送りません。
            </span>
          </span>
        </label>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            className="h-12 px-6 text-base"
            disabled={!progress.age}
            onClick={() => {
              const firstOpen = progress.answers.findIndex((answer) => answer === null);
              setIndex(firstOpen === -1 ? 0 : firstOpen);
              setPhase("question");
            }}
          >
            {answered > 0 ? `続きから（${answered}/${test.items.length}）` : "はじめる"}
          </Button>
          {answered > 0 && (
            <Button
              variant="outline"
              className="h-12 px-6 text-base"
              onClick={() => {
                commit({ ...emptyProgress(testId), age: progress.age, share: progress.share, submissionId: progress.submissionId, submitted: false });
                setIndex(0);
              }}
            >
              最初からやり直す
            </Button>
          )}
        </div>
        {!progress.age && <p className="mt-3 text-xs text-[#b3a898]">年代を選ぶと始められます。</p>}
        {saveWarning}
      </div>
    );
  }

  if (phase === "question") {
    const item = test.items[index];
    const selected = progress.answers[index];
    const answered = answeredItems(progress);
    const isPercent = test.options.length > 9;
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col px-5 py-6 md:py-12">
        <div className="flex items-center justify-between text-xs text-[#b3a898]">
          <span>{item.section}</span>
          <span className="tabular-nums">
            {index + 1} / {test.items.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div
            className="h-full rounded-full bg-[#e25c2a] transition-[width] duration-300"
            style={{ width: `${(answered / test.items.length) * 100}%` }}
          />
        </div>

        <p
          key={index}
          className="font-mincho mt-10 min-h-[7.5rem] text-2xl leading-[1.6] animate-in fade-in duration-300 md:text-[1.75rem]"
        >
          {item.text}
        </p>

        {isPercent ? (
          <div className="mt-8">
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
              {test.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={selected === option.value}
                  onClick={() => choose(option.value)}
                  className={cn(
                    "h-14 rounded-xl border text-sm tabular-nums transition-colors",
                    selected === option.value
                      ? "border-[#e25c2a] bg-[#e25c2a] text-[#1c100c]"
                      : "border-white/15 hover:border-white/40 hover:bg-white/5",
                  )}
                >
                  {option.value}
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-xs text-[#b3a898]">
              <span>0% まったくない</span>
              <span>50% 半分くらい</span>
              <span>100% いつも</span>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-3">
            {test.options.map((option, position) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected === option.value}
                onClick={() => choose(option.value)}
                className={cn(
                  "flex h-16 items-center gap-4 rounded-2xl border px-5 text-left text-base transition-colors",
                  selected === option.value
                    ? "border-[#e25c2a] bg-[#e25c2a] text-[#1c100c]"
                    : "border-white/15 hover:border-white/40 hover:bg-white/5",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "hidden size-7 shrink-0 items-center justify-center rounded-full border text-xs sm:flex",
                    selected === option.value ? "border-[#1c100c]/40" : "border-white/20 text-[#b3a898]",
                  )}
                >
                  {position + 1}
                </span>
                {option.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            className="py-3 text-[#b3a898] underline-offset-4 hover:underline disabled:opacity-40"
          >
            ← 前の質問
          </button>
          <button
            type="button"
            onClick={() => setPhase("intro")}
            className="py-3 text-[#b3a898] underline-offset-4 hover:underline"
          >
            中断する（回答は保存されます）
          </button>
        </div>
        {saveWarning}
      </div>
    );
  }

  const scores = scoreTest(testId, progress.answers as number[]);
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">
      <p className="text-sm text-[#e25c2a]">{test.title}の結果</p>
      {testId === "confidence" ? (
        <ConfidenceResult scores={scores} age={progress.age} stats={stats} />
      ) : (
        <DissociationResult scores={scores} age={progress.age} stats={stats} />
      )}

      <section className="mt-12 rounded-2xl border border-white/10 px-5 py-5">
        <h2 className="text-sm font-medium">比べる年代と集計</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {AGE_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              aria-pressed={progress.age === group.id}
              onClick={() => {
                const next = { ...progress, age: group.id, submitted: false };
                commit(next);
                void syncStats(next);
              }}
              className={cn(
                "h-10 rounded-lg border px-3 text-sm",
                progress.age === group.id
                  ? "border-[#e25c2a] bg-[#e25c2a] text-[#1c100c]"
                  : "border-white/15 hover:border-white/40",
              )}
            >
              {group.label}
            </button>
          ))}
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#d9d0c3]">
          <input
            type="checkbox"
            checked={progress.share}
            onChange={(event) => {
              const next = { ...progress, share: event.target.checked };
              commit(next);
              void syncStats(next);
            }}
            className="mt-1 size-4 accent-[#e25c2a]"
          />
          <span>
            この結果を匿名の平均値づくりに加える（年代と点数だけを送ります。外すと取り消されます）
          </span>
        </label>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          className="h-12 px-6"
          onClick={() => {
            commit({ ...progress, answers: emptyProgress(testId).answers, submitted: false });
            setIndex(0);
            setStats({ status: "idle" });
            setPhase("question");
          }}
        >
          もう一度受ける
        </Button>
        <Link
          href={OTHER_TEST[testId].href}
          className={cn(buttonVariants(), "h-12 px-6")}
        >
          {OTHER_TEST[testId].label}
        </Link>
      </div>
      {saveWarning}
    </div>
  );
}

type ResultProps = { scores: Scores; age: AgeGroup | null; stats: StatsState };

function siteRows(def: ScoreDef, age: AgeGroup | null, stats: StatsState): CompareItem[] {
  if (stats.status !== "ok") return [];
  const rows: CompareItem[] = [];
  const group = age && age !== "none" ? stats.stats.byAge[age] : undefined;
  if (age && age !== "none") {
    rows.push({
      label: `このサイトの${ageLabel(age)}`,
      value: group?.means[def.key],
      detail: group ? `${group.n}人` : "0人",
      site: true,
    });
  }
  rows.push({
    label: "このサイトの全年代",
    value: stats.stats.all.means[def.key],
    detail: `${stats.stats.all.n}人`,
    site: true,
  });
  return rows;
}

function referenceRows(references: Reference[], age: AgeGroup | null): CompareItem[] {
  return references.map((reference) => ({
    label: reference.label,
    value: reference.value,
    detail: reference.note,
    highlight: age !== null && reference.ages.includes(age),
  }));
}

function StatsNote({ stats }: { stats: StatsState }) {
  if (stats.status === "loading") {
    return <p className="mt-3 text-xs text-[#b3a898]">このサイトの平均を読み込んでいます…</p>;
  }
  if (stats.status === "error") {
    return <p className="mt-3 text-xs text-[#e7b5a4]">このサイトの平均を読み込めませんでした。</p>;
  }
  return (
    <p className="mt-3 text-xs leading-6 text-[#b3a898]">
      このサイトの平均は、集計に参加した人が{MIN_GROUP_SIZE}人以上そろってから表示します。参加者はこのサイトを訪れた人に限られるため、世の中全体の平均とは異なることがあります。
    </p>
  );
}

function ConfidenceResult({ scores, age, stats }: ResultProps) {
  const test = TESTS.confidence;
  const selfEsteem = scores.selfEsteem;
  const level = selfEsteemLevel(selfEsteem);
  const domainDefs = test.scores.slice(1);
  const ranked = [...domainDefs].sort((a, b) => scores[b.key] - scores[a.key]);
  const strongest = ranked.filter((def) => scores[def.key] === scores[ranked[0].key]);
  const weakest = ranked.filter((def) => scores[def.key] === scores[ranked[ranked.length - 1].key]);
  const group = stats.status === "ok" && age && age !== "none" ? stats.stats.byAge[age] : undefined;
  const domainSiteMeans = group?.means ?? (stats.status === "ok" ? stats.stats.all.means : {});
  const domainSiteLabel =
    group && Object.keys(group.means).length > 0 && age ? `このサイトの${ageLabel(age)}平均` : "このサイトの平均";

  return (
    <>
      <div className="paper mt-4 rounded-3xl px-6 py-8 md:px-10">
        <p className="text-xs text-[#6d645b]">自分全体への自信（自尊感情）</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-mincho text-6xl leading-none tabular-nums">{selfEsteem}</span>
          <span className="text-sm text-[#6d645b]">/ 40点</span>
          <span className="ml-3 rounded-full bg-[#1c1712] px-3 py-1 text-sm text-[#f3ebdd]">{level.label}</span>
        </p>
        <p className="mt-4 text-sm leading-7 text-[#3f3832]">{level.text}</p>
      </div>

      <section className="mt-10">
        <h2 className="font-mincho text-2xl">平均と比べる</h2>
        <CompareChart
          def={test.scores[0]}
          you={selfEsteem}
          rows={[...referenceRows(SELF_ESTEEM_REFERENCES, age), ...siteRows(test.scores[0], age, stats)]}
        />
        <p className="mt-3 text-xs leading-6 text-[#b3a898]">
          研究の平均：{SELF_ESTEEM_SOURCE}20代は「大学生など」と「社会人」の間にあたります。
        </p>
        <StatsNote stats={stats} />
      </section>

      <section className="mt-12">
        <h2 className="font-mincho text-2xl">分野ごとの自信</h2>
        <p className="mt-3 text-sm leading-7 text-[#d9d0c3]">
          いちばん自信があるのは{strongest.map((def) => `「${def.label}」`).join("")}、
          いちばん自信が低いのは{weakest.map((def) => `「${def.label}」`).join("")}です。
        </p>
        <ul className="mt-6 grid gap-5">
          {domainDefs.map((def) => (
            <li key={def.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{def.label}</span>
                <span className="tabular-nums text-[#b3a898]">
                  {formatScore(def, scores[def.key])} / 4
                </span>
              </div>
              <Bar def={def} value={scores[def.key]} marker={domainSiteMeans[def.key]} />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-6 text-[#b3a898]">
          各分野3問の平均です（1＝強くそう思わない〜4＝強くそう思う）。
          {Object.keys(domainSiteMeans).length > 0
            ? `白い線は${domainSiteLabel}です。`
            : "このサイトの平均がそろうと、白い線で表示します。"}
          分野ごとの質問はこのサイト独自のもので、研究による平均値はありません。
        </p>
      </section>
    </>
  );
}

function DissociationResult({ scores, age, stats }: ResultProps) {
  const test = TESTS.dissociation;
  const total = scores.total;
  const band = dissociationBand(total);
  const group = stats.status === "ok" && age && age !== "none" ? stats.stats.byAge[age] : undefined;
  const subSiteMeans = group?.means ?? (stats.status === "ok" ? stats.stats.all.means : {});

  return (
    <>
      <div className="paper mt-4 rounded-3xl px-6 py-8 md:px-10">
        <p className="text-xs text-[#6d645b]">解離体験の合計（28問の平均）</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-mincho text-6xl leading-none tabular-nums">
            {formatScore(test.scores[0], total)}
          </span>
          <span className="text-sm text-[#6d645b]">/ 100</span>
          <span className="ml-3 rounded-full bg-[#1c1712] px-3 py-1 text-sm text-[#f3ebdd]">{band.label}</span>
        </p>
        <p className="mt-4 text-sm leading-7 text-[#3f3832]">{band.text}</p>
        <p className="mt-4 text-xs leading-6 text-[#6d645b]">
          これは診断ではありません。二重人格（解離性同一症）かどうかは、医師による面接でしか判断できません。
        </p>
      </div>

      {total >= 20 && (
        <div className="mt-6 rounded-2xl border border-[#e25c2a]/50 px-5 py-4 text-sm leading-7 text-[#ddd4c6]">
          <p>
            記憶が抜ける、自分が自分でないように感じるといったことで困っているときは、精神科・心療内科で相談できます。
          </p>
          <p className="mt-1">
            どこに相談すればよいか分からないときは「こころの健康相談統一ダイヤル」
            <a href="tel:0570064556" className="underline underline-offset-4">0570-064-556</a>
            （つながると、お住まいの地域の公的な相談窓口に案内されます）。
          </p>
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-mincho text-2xl">平均と比べる</h2>
        <CompareChart
          def={test.scores[0]}
          you={total}
          rows={[...referenceRows(DISSOCIATION_REFERENCES, age), ...siteRows(test.scores[0], age, stats)]}
        />
        <p className="mt-3 text-xs leading-6 text-[#b3a898]">
          研究の平均：{DISSOCIATION_SOURCE}
          研究で使われた日本語版とこのサイトの訳は文言が異なるため、比べる数値は目安です。
        </p>
        <StatsNote stats={stats} />
      </section>

      <section className="mt-12">
        <h2 className="font-mincho text-2xl">体験の種類ごと</h2>
        <ul className="mt-6 grid gap-5">
          {test.scores.slice(1).map((def) => (
            <li key={def.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{def.label}</span>
                <span className="tabular-nums text-[#b3a898]">{formatScore(def, scores[def.key])}</span>
              </div>
              <Bar def={def} value={scores[def.key]} marker={subSiteMeans[def.key]} />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-6 text-[#b3a898]">
          各6問の平均です。「のめり込み」は多くの人にある体験で、「記憶の抜け」「現実感の薄れ」が高いほど解離性の障害との関係が強いとされています。
          {Object.keys(subSiteMeans).length > 0 && "白い線はこのサイトの平均です。"}
        </p>
        <p className="mt-2 text-xs leading-6 text-[#b3a898]">{BAND_SOURCE}</p>
      </section>
    </>
  );
}

type CompareItem = {
  label: string;
  value: number | undefined;
  detail?: string;
  highlight?: boolean;
  site?: boolean;
};

function CompareChart({ def, you, rows }: { def: ScoreDef; you: number; rows: CompareItem[] }) {
  const all: CompareItem[] = [{ label: "あなた", value: you, highlight: true }, ...rows];
  return (
    <ul className="mt-5 grid gap-4">
      {all.map((row) => {
        const diff = row.label !== "あなた" && row.value !== undefined ? you - row.value : null;
        return (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn(row.highlight ? "text-[#f3ebdd]" : "text-[#d9d0c3]")}>
                {row.label}
                {row.detail && <span className="ml-2 text-xs text-[#8d8478]">{row.detail}</span>}
              </span>
              <span className="shrink-0 tabular-nums">
                {row.value === undefined ? (
                  <span className="text-xs text-[#8d8478]">
                    {row.site ? `${MIN_GROUP_SIZE}人未満` : "—"}
                  </span>
                ) : (
                  <>
                    {formatScore(def, row.value)}
                    {diff !== null && (
                      <span className="ml-2 text-xs text-[#b3a898]">
                        （あなたは{diff >= 0 ? "+" : ""}
                        {diff.toFixed(1)}）
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
            {row.value !== undefined && (
              <Bar def={def} value={row.value} tone={row.label === "あなた" ? "you" : row.highlight ? "near" : "other"} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Bar({
  def,
  value,
  marker,
  tone = "you",
}: {
  def: ScoreDef;
  value: number;
  marker?: number;
  tone?: "you" | "near" | "other";
}) {
  const position = (score: number) =>
    `${Math.min(100, Math.max(0, ((score - def.min) / (def.max - def.min)) * 100))}%`;
  return (
    <div className="relative mt-1.5 h-2.5 rounded-full bg-white/10" aria-hidden>
      <div
        className={cn(
          "h-full rounded-full",
          tone === "you" ? "bg-[#e25c2a]" : tone === "near" ? "bg-[#d9b99a]" : "bg-[#6f665c]",
        )}
        style={{ width: position(value) }}
      />
      {marker !== undefined && (
        <div
          className="absolute -top-1 h-4.5 w-0.5 rounded bg-[#f3ebdd]"
          style={{ left: position(marker) }}
        />
      )}
    </div>
  );
}
