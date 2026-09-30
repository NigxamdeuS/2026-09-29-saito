"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  INBOX_COOKIE,
  INBOX_PASSWORD,
  INBOX_SESSION_SECONDS,
  inboxToken,
  safeInboxPath,
} from "@/lib/inbox-auth";

export async function unlockInbox(formData: FormData) {
  const next = safeInboxPath(formData.get("next"));
  if (formData.get("password") !== INBOX_PASSWORD) {
    redirect(`/unlock?next=${encodeURIComponent(next)}&error=1`);
  }

  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(INBOX_COOKIE, await inboxToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/nigxam",
    maxAge: INBOX_SESSION_SECONDS,
  });
  redirect(next);
}
