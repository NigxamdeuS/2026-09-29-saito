"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useJournal } from "@/components/journal-context";
import { buildModel } from "@/lib/model";
import { cn } from "cn";

const links = [
  { href: "/ask", label: "答える" },
  { href: "/model", label: "結果" },
  { href: "/log", label: "履歴" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, journal, persistError } = useJournal();
  const answered = ready ? buildModel(journal).answered : null;

  return (
    <>
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-2 sm:gap-4">
          <Link href="/" className="font-mincho shrink-0 py-2 text-lg tracking-wide">
            二重人格
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className={cn(
                  "px-1.5 py-3 underline-offset-4 hover:underline sm:px-2",
                  pathname === link.href ? "text-[#f3ebdd]" : "text-[#b3a898]",
                )}
              >
                {link.label}
              </Link>
            ))}
            {answered !== null && (
              <span className="pl-1 tabular-nums text-[#b3a898]">{answered}/100</span>
            )}
          </nav>
        </div>
      </header>
      {persistError && (
        <p
          role="alert"
          className="mx-auto w-full max-w-3xl px-5 pt-4 text-sm leading-6 text-[#e7b5a4]"
        >
          このブラウザに記録を保存できませんでした。タブを閉じると、今回の回答は消えてしまいます。
        </p>
      )}
      <main className="flex-1">{children}</main>
      <footer className="mx-auto w-full max-w-3xl px-5 py-10 text-xs leading-6 text-[#8d8478]">
        <p>
          これは医学的な診断ではありません。解離性同一性症などの疾患を判定するものではなく、状況ごとの選択から、意思決定の傾向と、それが場面によって二つに分かれる度合いを読み取るものです。
        </p>
        <Link href="/contact" className="mt-1 inline-block py-2 underline-offset-4 hover:underline">
          お問い合わせ
        </Link>
      </footer>
    </>
  );
}
