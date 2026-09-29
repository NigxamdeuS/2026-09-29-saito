"use client";

import Link from "next/link";
import { useJournal } from "@/components/journal-context";
import { buttonVariants } from "@/components/ui/button";
import { axes, axisOrder } from "@/lib/catalog";
import { buildModel, type AxisKind } from "@/lib/model";
import { cn } from "cn";

const kindLabel: Record<AxisKind, string> = {
  thin: "回答不足",
  single: "一貫している",
  noisy: "ぶれがある",
  split: "場面で分かれる",
};

export function HomeView() {
  const { ready, journal } = useJournal();
  const model = buildModel(journal);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-10 pb-8 md:pt-20">
      <p className="text-sm text-[#e25c2a]">場面別の意思決定テスト</p>
      <h1 className="font-mincho mt-4 text-5xl leading-none font-medium md:text-7xl">
        Nigxam
      </h1>
      <p className="font-mincho mt-8 max-w-xl text-2xl leading-snug md:text-[2rem] md:leading-snug">
        こんなとき、あなたならどうしますか。
      </p>
      <div className="mt-8 max-w-xl space-y-4 text-[15px] leading-8 text-[#ddd4c6]">
        <p>
          一般的な性格診断ではありません。100の場面に少しずつ答えていくと、選んだ答えが積み重なって、あなたの意思決定の傾向が見えてきます。
        </p>
        <p>
          その傾向はいつも同じなのか、それとも場面によって別の傾向が顔を出すのか。判定は、同じ種類の場面の回答がそろってから行います。質問は5問ずつ出ます。
        </p>
        <p>
          あなたが答える前に、モデルは次の選択を予測しています。また、ときどき以前の質問をもう一度出して、同じ答えを選ぶかを確かめます。予測の的中率と答えの一貫性が、判定の裏づけになります。
        </p>
      </div>

      {!ready ? (
        <p className="mt-10 text-sm text-[#b3a898]">記録を読み込んでいます…</p>
      ) : (
        <>
          {model.answered > 0 && (
            <div className="paper mt-10 rounded-3xl px-6 py-6 md:px-8">
              <p className="text-xs text-[#6d645b]">二重人格の可能性</p>
              <p className="font-mincho mt-2 text-3xl">{model.possibility}</p>
              <p className="mt-3 text-sm leading-7 text-[#3f3832]">{model.headline}</p>
              <p className="mt-4 text-sm tabular-nums text-[#6d645b]">
                {model.answered} / {model.total}
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={model.answered === model.total ? "/log" : "/ask"}
              className={cn(buttonVariants({ size: "lg" }), "h-12 px-6")}
            >
              {model.answered === 0
                ? "はじめる"
                : model.answered === model.total
                  ? "回答を見直す"
                  : "続きから答える"}
            </Link>
            <Link
              href="/model"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 px-6",
              )}
            >
              結果を見る
            </Link>
          </div>

          <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {axisOrder.map((id) => {
              const axis = model.axes.find((item) => item.axis === id);
              const unread = !axis || axis.n === 0;
              return (
                <li key={id} className="border-t border-white/15 pt-3">
                  <p className="text-sm">{axes[id].name}</p>
                  <p className="mt-1 text-xs text-[#b3a898]">
                    {unread ? "未回答" : kindLabel[axis.kind]}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs leading-6 text-[#8d8478]">
            この8つは性格タイプの名前ではありません。{axisOrder.map((id) => axes[id].name).join("・")}
            は、場面ごとの選び方を読み取るための軸です。
          </p>
        </>
      )}
    </div>
  );
}
