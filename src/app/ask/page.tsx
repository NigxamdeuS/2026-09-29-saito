import { Suspense } from "react";
import { AskView } from "@/components/ask-view";

export const metadata = {
  title: "答える",
};

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <p className="px-5 py-24 text-center text-sm text-[#8ea3bd]">質問を読み込んでいます…</p>
      }
    >
      <AskView />
    </Suspense>
  );
}
