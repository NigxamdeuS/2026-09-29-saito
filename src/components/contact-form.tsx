"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { submitContact } from "@/app/contact/actions";
import { Button } from "@/components/ui/button";
import {
  formatBytes,
  initialContactState,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_MESSAGE_LENGTH,
  MAX_TOTAL_BYTES,
  TEXT_EXTENSIONS,
  validateFileList,
  type ContactField,
  type ContactState,
} from "@/lib/contact";
import { cn } from "cn";

const fieldClass =
  "mt-2 w-full rounded-xl border border-black/15 bg-white/60 px-3 py-2.5 text-base leading-7 sm:text-[15px] outline-none transition focus:border-[#c4552a] focus:ring-3 focus:ring-[#c4552a]/20 aria-invalid:border-[#b3261e]";

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function FieldError({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} className="mt-2 text-sm leading-6 text-[#b3261e]">
      {text}
    </p>
  );
}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initialContactState);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [handled, setHandled] = useState(state);
  const [errors, setErrors] = useState<ContactState["errors"]>({});
  const inputRef = useRef<HTMLInputElement>(null);

  if (state !== handled) {
    setHandled(state);
    setErrors(state.status === "error" ? state.errors : {});
    if (state.status === "ok") {
      setName("");
      setEmail("");
      setMessage("");
      setFiles([]);
      setFileError(null);
    }
  }

  function clearError(field: ContactField) {
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const known = new Set(files.map(fileKey));
    const next = [...files, ...[...list].filter((file) => !known.has(fileKey(file)))];
    const error = validateFileList(next);
    setFileError(error);
    clearError("files");
    if (!error) setFiles(next);
  }

  function removeFile(key: string) {
    setFiles((current) => current.filter((file) => fileKey(file) !== key));
    setFileError(null);
    clearError("files");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData();
    data.set("name", name);
    data.set("email", email);
    data.set("message", message);
    for (const file of files) data.append("files", file);
    startTransition(() => formAction(data));
  }

  const filesError = fileError ?? errors.files;
  const total = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <form onSubmit={onSubmit} noValidate className="paper rounded-3xl px-5 py-8 md:px-10 md:py-10">
      {state.status === "ok" && (
        <p role="status" className="mb-6 rounded-xl bg-[#8eae98]/25 px-4 py-3 text-sm leading-6">
          {state.message}内容を確認のうえ、ご連絡します。
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="mb-6 rounded-xl bg-[#b3261e]/10 px-4 py-3 text-sm leading-6 text-[#8c1d17]">
          {state.message}
        </p>
      )}

      <div className="grid gap-6">
        <div>
          <label htmlFor="contact-name" className="text-sm font-medium">
            お名前<span className="ml-2 text-xs font-normal text-[#6d645b]">任意</span>
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearError("name");
            }}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            className={fieldClass}
          />
          <FieldError id="contact-name-error" text={errors.name} />
        </div>

        <div>
          <label htmlFor="contact-email" className="text-sm font-medium">
            メールアドレス<span className="ml-2 text-xs font-normal text-[#c4552a]">必須</span>
          </label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError("email");
            }}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            className={fieldClass}
          />
          <FieldError id="contact-email-error" text={errors.email} />
        </div>

        <div>
          <label htmlFor="contact-message" className="text-sm font-medium">
            お問い合わせ内容<span className="ml-2 text-xs font-normal text-[#c4552a]">必須</span>
          </label>
          <textarea
            id="contact-message"
            required
            rows={7}
            maxLength={MAX_MESSAGE_LENGTH}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              clearError("message");
            }}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "contact-message-error" : "contact-message-count"}
            className={cn(fieldClass, "resize-y")}
          />
          <p id="contact-message-count" className="mt-1 text-right text-xs tabular-nums text-[#6d645b]">
            {message.length} / {MAX_MESSAGE_LENGTH}
          </p>
          <FieldError id="contact-message-error" text={errors.message} />
        </div>

        <div>
          <p className="text-sm font-medium">
            添付ファイル<span className="ml-2 text-xs font-normal text-[#6d645b]">任意</span>
          </p>
          <p className="mt-1 text-xs leading-6 text-[#6d645b]">
            テキストファイル（{TEXT_EXTENSIONS.join("・")}）を{MAX_FILES}個まで添付できます。1ファイル
            {formatBytes(MAX_FILE_BYTES)}まで、合計{formatBytes(MAX_TOTAL_BYTES)}までです。
          </p>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
            className={cn(
              "mt-3 rounded-2xl border border-dashed px-4 py-6 text-center transition",
              dragging ? "border-[#c4552a] bg-[#c4552a]/5" : "border-black/20",
            )}
          >
            <p className="text-sm text-[#3f3832]">ここにファイルをドラッグ＆ドロップ</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-10 px-4"
              disabled={files.length >= MAX_FILES}
              onClick={() => inputRef.current?.click()}
            >
              ファイルを選択
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={[...TEXT_EXTENSIONS, "text/plain"].join(",")}
              className="sr-only"
              aria-label="添付ファイルを選択"
              aria-describedby={filesError ? "contact-files-error" : undefined}
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
          <FieldError id="contact-files-error" text={filesError ?? undefined} />

          {files.length > 0 && (
            <>
              <ul className="mt-4 grid gap-2">
                {files.map((file) => {
                  const key = fileKey(file);
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/50 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">{file.name}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="text-xs tabular-nums text-[#6d645b]">{formatBytes(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(key)}
                          className="-my-2 -mr-2 px-2 py-2 text-xs text-[#6d645b] underline-offset-4 hover:underline"
                          aria-label={`${file.name} を外す`}
                        >
                          外す
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-right text-xs tabular-nums text-[#6d645b]">
                {files.length} / {MAX_FILES}個 · 合計 {formatBytes(total)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button type="submit" className="h-12 px-8" disabled={pending}>
          {pending ? "送信しています…" : "送信する"}
        </Button>
      </div>
    </form>
  );
}
