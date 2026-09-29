import { Suspense } from "react";
import { AskView } from "@/components/ask-view";

export const metadata = {
  title: "問う",
};

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <p className="px-5 py-24 text-center text-sm text-[#b3a898]">問を開いています</p>
      }
    >
      <AskView />
    </Suspense>
  );
}
