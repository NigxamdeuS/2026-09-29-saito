import { ContactForm } from "@/components/contact-form";

export const metadata = {
  title: "お問い合わせ",
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">
      <h1 className="font-mincho text-4xl">お問い合わせ</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-[#d9d0c3]">
        ご意見・ご質問・不具合のご報告などはこちらからお送りください。ログやメモなどのテキストファイルは、まとめて添付できます。
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}
