import Link from "next/link";
import { connection } from "next/server";
import { formatDateTime } from "@/lib/format-date";
import { listInquiries } from "@/lib/inbox";

export default async function InboxPage() {
  await connection();
  const inquiries = await listInquiries();

  return (
    <>
      <h1 className="font-mincho text-4xl">受信したお問い合わせ</h1>
      <p className="mt-4 text-sm text-[#b3a898]">
        {inquiries.length === 0 ? "まだお問い合わせは届いていません。" : `${inquiries.length}件（新しい順）`}
      </p>

      {inquiries.length > 0 && (
        <ul className="mt-8 grid gap-3">
          {inquiries.map((inquiry) => (
            <li key={inquiry.id}>
              <Link
                href={`/nigxam/${inquiry.id}`}
                className="block rounded-2xl border border-white/10 px-4 py-4 transition hover:border-white/30"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-[#b3a898]">
                  <span className="tabular-nums">{formatDateTime(inquiry.receivedAt)}</span>
                  {inquiry.attachments.length > 0 && <span>添付 {inquiry.attachments.length}件</span>}
                </div>
                <p className="mt-2 text-sm">
                  {inquiry.name || "（名前なし）"}
                  <span className="ml-2 text-[#b3a898]">{inquiry.email}</span>
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-7 text-[#d9d0c3]">{inquiry.message}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
