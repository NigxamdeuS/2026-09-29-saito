"use client";

import Link from "next/link";
import { useJournal } from "@/components/journal-context";
import { buttonVariants } from "@/components/ui/button";
import { axes, axisOrder } from "@/lib/catalog";
import { buildModel, type AxisKind } from "@/lib/model";
import { cn } from "cn";

const kindLabel: Record<AxisKind, string> = {
  thin: "まだ薄い",
  single: "一つの側",
  noisy: "揺れている",
  split: "分かれている",
};

export function HomeView() {
  const { ready, journal } = useJournal();
  const model = buildModel(journal);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-10 pb-8 md:pt-20">
      <p className="text-sm text-[#e25c2a]">状況ごとの選択</p>
      <h1 className="font-mincho mt-4 text-5xl leading-none font-medium md:text-7xl">
        二重人格
      </h1>
      <p className="font-mincho mt-8 max-w-xl text-2xl leading-snug md:text-[2rem] md:leading-snug">
        こういう状況で、あなたは何を選びやすいか。
      </p>
      <div className="mt-8 max-w-xl space-y-4 text-[15px] leading-8 text-[#ddd4c6]">
        <p>
          一般的な性格診断ではない。百の場面に、少しずつ答える。選んだ手が重なるほど、自分の意思決定の型ができる。
        </p>
        <p>
          一つの型なのか。場所によって、もう一つの型が顔を出すのか。可能性は、同じ種類の場面がそろってから判断する。一区切りは五問。
        </p>
      </div>

      {!ready ? (
        <p className="mt-10 text-sm text-[#b3a898]">記録を開いています</p>
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
                ? "問いに入る"
                : model.answered === model.total
                  ? "記録から選び直す"
                  : "続きの問へ"}
            </Link>
            <Link
              href="/model"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 px-6",
              )}
            >
              モデルを見る
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
                    {unread ? "まだない" : kindLabel[axis.kind]}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs leading-6 text-[#8d8478]">
            この八つは類型の名前ではない。速さ、誰のため、言葉、振れ幅、線、時間、根拠、見え方。場面への手の伸び方を読む軸。
          </p>
        </>
      )}
    </div>
  );
}
