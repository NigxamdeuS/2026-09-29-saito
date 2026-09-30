export const INBOX_PASSWORD = "Nigxam";
export const INBOX_COOKIE = "nigxam_session";
export const INBOX_SESSION_SECONDS = 60 * 60 * 24 * 30;

export async function inboxToken(): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`nigxam-inbox:${INBOX_PASSWORD}`),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function safeInboxPath(value: unknown): string {
  if (typeof value !== "string") return "/nigxam";
  if (value !== "/nigxam" && !value.startsWith("/nigxam/")) return "/nigxam";
  return value;
}
