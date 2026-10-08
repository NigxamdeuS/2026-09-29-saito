"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useJournal } from "@/components/journal-context";
import { cn } from "cn";

const links = [
  { href: "/confidence", label: "自信度", match: ["/confidence"] },
  { href: "/dissociation", label: "解離傾向", match: ["/dissociation"] },
  { href: "/scenes", label: "場面100問", match: ["/scenes", "/ask", "/model", "/log"] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { persistError } = useJournal();

  return (
    <>
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-2 sm:gap-4">
          <Link href="/" className="font-mincho shrink-0 py-2 text-lg tracking-wide">
            Nigxam
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            {links.map((link) => {
              const active = link.match.includes(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "px-1.5 py-3 underline-offset-4 hover:underline sm:px-2",
                    active ? "text-[#f3ebdd]" : "text-[#b3a898]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
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
          このサイトの診断は、医療機関での診断の代わりにはなりません。解離性同一症（DID）などの病気があるかどうかを判定するものではありません。
        </p>
        <Link href="/contact" className="mt-1 inline-block py-2 underline-offset-4 hover:underline">
          お問い合わせ
        </Link>
      </footer>
    </>
  );
}
