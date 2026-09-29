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
    "100の場面に少しずつ答えて、自分の意思決定の傾向を読み取ります。二重人格の可能性は、場面によって選び方が分かれているかを確かめてから判定します。",
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
