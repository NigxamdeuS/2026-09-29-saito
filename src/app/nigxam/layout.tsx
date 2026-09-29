import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "受信したお問い合わせ",
  robots: { index: false, follow: false },
};

export default function InboxLayout({ children }: LayoutProps<"/nigxam">) {
  return <div className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">{children}</div>;
}
