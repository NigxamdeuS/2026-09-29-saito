import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const INBOX_DIR = path.join(process.cwd(), "data", "inquiries");

export type Attachment = {
  originalName: string;
  storedName: string;
  size: number;
};

export type Inquiry = {
  id: string;
  receivedAt: string;
  name: string;
  email: string;
  message: string;
  attachments: Attachment[];
};

const ID_PATTERN = /^[0-9TZ-]+-[0-9a-f]{8}$/;
const STORED_NAME_PATTERN = /^\d{2}-[^\\/]+$/;

export function isInquiryId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export async function getInquiry(id: string): Promise<Inquiry | null> {
  if (!isInquiryId(id)) return null;
  try {
    const raw = await readFile(path.join(INBOX_DIR, id, "inquiry.json"), "utf8");
    return JSON.parse(raw) as Inquiry;
  } catch {
    return null;
  }
}

export async function listInquiries(): Promise<Inquiry[]> {
  let ids: string[];
  try {
    const entries = await readdir(INBOX_DIR, { withFileTypes: true });
    ids = entries.filter((entry) => entry.isDirectory() && isInquiryId(entry.name)).map((entry) => entry.name);
  } catch {
    return [];
  }
  const inquiries = await Promise.all(ids.map(getInquiry));
  return inquiries
    .filter((inquiry): inquiry is Inquiry => inquiry !== null)
    .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
}

export async function readAttachment(id: string, storedName: string): Promise<string | null> {
  if (!isInquiryId(id) || !STORED_NAME_PATTERN.test(storedName)) return null;
  const inquiry = await getInquiry(id);
  if (!inquiry?.attachments.some((attachment) => attachment.storedName === storedName)) return null;
  try {
    return await readFile(path.join(INBOX_DIR, id, "files", storedName), "utf8");
  } catch {
    return null;
  }
}
