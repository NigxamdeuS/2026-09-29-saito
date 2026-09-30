import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { safeInboxPath } from "@/lib/inbox-auth";
import { unlockInbox } from "./actions";

export const metadata: Metadata = {
  title: "パスワード",
  robots: { index: false, follow: false },
};

export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  const params = await searchParams;
  const next = safeInboxPath(params.next);
  const failed = params.error === "1";

  return (
    <div className="mx-auto w-full max-w-md px-5 py-16 md:py-24">
      <form action={unlockInbox} className="paper rounded-3xl px-5 py-8 md:px-8">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="unlock-password" className="text-sm font-medium">
          パスワード
        </label>
        <input
          id="unlock-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={failed}
          aria-describedby={failed ? "unlock-error" : undefined}
          className="mt-2 w-full rounded-xl border border-black/15 bg-white/60 px-3 py-2.5 text-base leading-7 outline-none transition focus:border-[#c4552a] focus:ring-3 focus:ring-[#c4552a]/20 aria-invalid:border-[#b3261e] sm:text-[15px]"
        />
        {failed && (
          <p id="unlock-error" role="alert" className="mt-2 text-sm leading-6 text-[#b3261e]">
            パスワードが違います。
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <Button type="submit" className="h-11 px-6">
            開く
          </Button>
        </div>
      </form>
    </div>
  );
}
