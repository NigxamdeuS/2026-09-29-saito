import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { formatBytes } from "@/lib/contact";
import { formatDateTime } from "@/lib/format-date";
import { getInquiry, readAttachment } from "@/lib/inbox";

export default async function InquiryPage({ params }: PageProps<"/nigxam/[id]">) {
  await connection();
  const { id } = await params;
  const inquiry = await getInquiry(id);
  if (!inquiry) notFound();

  const contents = await Promise.all(
    inquiry.attachments.map((attachment) => readAttachment(id, attachment.storedName)),
  );

  return (
    <>
      <Link href="/nigxam" className="text-sm text-[#b3a898] underline-offset-4 hover:underline">
        ← 一覧に戻る
      </Link>

      <div className="paper mt-6 rounded-3xl px-5 py-8 md:px-10">
        <dl className="grid gap-3 text-sm sm:grid-cols-[7rem_1fr]">
          <dt className="text-[#6d645b]">受信日時</dt>
          <dd className="tabular-nums">{formatDateTime(inquiry.receivedAt)}</dd>
          <dt className="text-[#6d645b]">お名前</dt>
          <dd>{inquiry.name || "（未入力）"}</dd>
          <dt className="text-[#6d645b]">メールアドレス</dt>
          <dd>
            <a href={`mailto:${inquiry.email}`} className="underline underline-offset-4">
              {inquiry.email}
            </a>
          </dd>
        </dl>
        <h1 className="mt-8 text-sm text-[#6d645b]">お問い合わせ内容</h1>
        <p className="mt-2 text-[15px] leading-8 whitespace-pre-wrap">{inquiry.message}</p>
      </div>

      <section className="mt-10">
        <h2 className="font-mincho text-2xl">添付ファイル</h2>
        {inquiry.attachments.length === 0 ? (
          <p className="mt-4 text-sm text-[#b3a898]">添付ファイルはありません。</p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {inquiry.attachments.map((attachment, index) => (
              <li key={attachment.storedName} className="rounded-2xl border border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-sm">
                  <span className="min-w-0 truncate">{attachment.originalName}</span>
                  <span className="flex shrink-0 items-center gap-4 text-xs text-[#b3a898]">
                    <span className="tabular-nums">{formatBytes(attachment.size)}</span>
                    <a
                      href={`/nigxam/${id}/files/${encodeURIComponent(attachment.storedName)}`}
                      className="underline-offset-4 hover:underline"
                    >
                      ダウンロード
                    </a>
                  </span>
                </div>
                <pre className="max-h-96 overflow-auto px-4 py-3 font-mono text-xs leading-6 whitespace-pre-wrap text-[#ddd4c6]">
                  {contents[index] ?? "（ファイルを読み込めませんでした）"}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
