import { getInquiry, readAttachment } from "@/lib/inbox";

export async function GET(_request: Request, ctx: RouteContext<"/nigxam/[id]/files/[name]">) {
  const { id, name: storedName } = await ctx.params;
  const content = await readAttachment(id, storedName);
  if (content === null) return new Response("Not Found", { status: 404 });

  const inquiry = await getInquiry(id);
  const originalName =
    inquiry?.attachments.find((attachment) => attachment.storedName === storedName)?.originalName ?? storedName;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
