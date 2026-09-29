export const MAX_FILES = 50;
export const MAX_FILE_BYTES = 1024 * 1024;
export const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
export const MAX_MESSAGE_LENGTH = 5000;
export const MAX_NAME_LENGTH = 100;
export const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".tsv", ".log", ".json"];

export type ContactField = "name" | "email" | "message" | "files";

export type ContactState = {
  status: "idle" | "ok" | "error";
  message: string;
  errors: Partial<Record<ContactField, string>>;
};

export const initialContactState: ContactState = {
  status: "idle",
  message: "",
  errors: {},
};

type FileLike = { name: string; size: number };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function hasTextExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function validateFileList(files: FileLike[]): string | null {
  if (files.length > MAX_FILES) {
    return `添付できるファイルは${MAX_FILES}個までです。`;
  }
  for (const file of files) {
    if (!hasTextExtension(file.name)) {
      return `「${file.name}」はテキストファイルではありません。${TEXT_EXTENSIONS.join("・")} のファイルを選んでください。`;
    }
    if (file.size === 0) {
      return `「${file.name}」は空のファイルです。`;
    }
    if (file.size > MAX_FILE_BYTES) {
      return `「${file.name}」が大きすぎます。1ファイルあたり${formatBytes(MAX_FILE_BYTES)}までです。`;
    }
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    return `添付ファイルの合計が大きすぎます。合計${formatBytes(MAX_TOTAL_BYTES)}までです。`;
  }
  return null;
}

export function isTextContent(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

export function validateFields(input: {
  name: string;
  email: string;
  message: string;
}): Partial<Record<ContactField, string>> {
  const errors: Partial<Record<ContactField, string>> = {};
  if (input.name.length > MAX_NAME_LENGTH) {
    errors.name = `お名前は${MAX_NAME_LENGTH}文字以内で入力してください。`;
  }
  if (!input.email) {
    errors.email = "メールアドレスを入力してください。";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254) {
    errors.email = "メールアドレスの形式が正しくありません。";
  }
  if (!input.message) {
    errors.message = "お問い合わせ内容を入力してください。";
  } else if (input.message.length > MAX_MESSAGE_LENGTH) {
    errors.message = `お問い合わせ内容は${MAX_MESSAGE_LENGTH}文字以内で入力してください。`;
  }
  return errors;
}

export function safeFileName(name: string, index: number): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[<>:"|?*\u0000-\u001f]/g, "_").replace(/^\.+/, "").slice(0, 120);
  return `${String(index + 1).padStart(2, "0")}-${cleaned || "file.txt"}`;
}
