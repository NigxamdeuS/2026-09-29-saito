"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useJournal } from "@/components/journal-context";
import { buildModel } from "@/lib/model";
import { cn } from "cn";

const links = [
  { href: "/ask", label: "問う" },
  { href: "/model", label: "モデル" },
  { href: "/log", label: "記録" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, journal, persistError } = useJournal();
  const answered = ready ? buildModel(journal).answered : null;

  return (
    <>
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="font-mincho text-lg tracking-wide">
            二重人格
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className={cn(
                  "underline-offset-4 hover:underline",
                  pathname === link.href ? "text-[#f3ebdd]" : "text-[#b3a898]",
                )}
              >
                {link.label}
              </Link>
            ))}
            {answered !== null && (
              <span className="tabular-nums text-[#b3a898]">{answered}/100</span>
            )}
          </nav>
        </div>
      </header>
      {persistError && (
        <p
          role="alert"
          className="mx-auto w-full max-w-3xl px-5 pt-4 text-sm leading-6 text-[#e7b5a4]"
        >
          このブラウザには記録を残せませんでした。タブを閉じると、今回の選択は消えます。
        </p>
      )}
      <main className="flex-1">{children}</main>
      <footer className="mx-auto w-full max-w-3xl px-5 py-10 text-xs leading-6 text-[#8d8478]">
        これは医学的な診断ではない。解離性同一性症などの疾患を判定せず、状況ごとの選択から、意思決定の型と、その型が二つに分かれる度合いを読む。
      </footer>
    </>
  );
}
