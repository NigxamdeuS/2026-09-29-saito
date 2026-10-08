import type { Metadata } from "next";
import { JournalProvider } from "@/components/journal-context";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nigxam",
    template: "%s — Nigxam",
  },
  description:
    "自信度と解離傾向（二重人格に関係する体験）を、研究で使われている質問紙をもとに別々に測り、研究の平均や同じ年代の平均と比べられるサイトです。",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <JournalProvider>
          <Shell>{children}</Shell>
        </JournalProvider>
      </body>
    </html>
  );
}
