import type { Metadata } from "next";
import { JournalProvider } from "@/components/journal-context";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "二重人格",
    template: "%s — 二重人格",
  },
  description:
    "百の状況に少しずつ答え、自分の意思決定モデルを組む。二重人格の可能性は、選択が場所ごとに分かれてから判断する。",
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
