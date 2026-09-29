"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isTextContent,
  safeFileName,
  validateFields,
  validateFileList,
  type ContactState,
} from "@/lib/contact";
import { INBOX_DIR } from "@/lib/inbox";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitContact(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const fields = {
    name: text(formData, "name"),
    email: text(formData, "email"),
    message: text(formData, "message"),
  };
  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File && !(item.name === "" && item.size === 0));

  const errors = validateFields(fields);
  const fileError = validateFileList(files);
  if (fileError) errors.files = fileError;
  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "入力内容を確認してください。", errors };
  }

  const contents: Uint8Array[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isTextContent(bytes)) {
      return {
        status: "error",
        message: "入力内容を確認してください。",
        errors: { files: `「${file.name}」は UTF-8 のテキストとして読み込めませんでした。` },
      };
    }
    contents.push(bytes);
  }

  const receivedAt = new Date();
  const id = `${receivedAt.toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const dir = path.join(INBOX_DIR, id);
  const attachments = files.map((file, index) => ({
    originalName: file.name,
    storedName: safeFileName(file.name, index),
    size: file.size,
  }));

  try {
    await mkdir(path.join(dir, "files"), { recursive: true });
    await Promise.all(
      attachments.map((attachment, index) =>
        writeFile(path.join(dir, "files", attachment.storedName), contents[index]),
      ),
    );
    await writeFile(
      path.join(dir, "inquiry.json"),
      JSON.stringify({ id, receivedAt: receivedAt.toISOString(), ...fields, attachments }, null, 2),
    );
  } catch (error) {
    console.error("お問い合わせの保存に失敗しました", error);
    return {
      status: "error",
      message: "送信できませんでした。時間をおいて、もう一度お試しください。",
      errors: {},
    };
  }

  return {
    status: "ok",
    message:
      attachments.length > 0
        ? `お問い合わせを受け付けました（添付ファイル${attachments.length}件）。`
        : "お問い合わせを受け付けました。",
    errors: {},
  };
}
