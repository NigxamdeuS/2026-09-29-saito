"use client";

import { useRef, useState } from "react";
import { useJournal } from "@/components/journal-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Journal } from "@/lib/journal";
import { sanitizeJournal } from "@/lib/storage";

export function JournalTransfer() {
  const { journal, replace } = useJournal();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Journal | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const answered = Object.keys(journal.answers).length;

  function exportJournal() {
    const blob = new Blob([JSON.stringify(journal, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nigxam-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: "ok", text: `${answered}問分の記録を書き出しました。` });
  }

  async function readFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const cleaned = sanitizeJournal(parsed);
      if (Object.keys(cleaned.answers).length === 0) {
        setMessage({ tone: "error", text: "このファイルには、読み込める回答がありませんでした。" });
        return;
      }
      setPending(cleaned);
      setMessage(null);
    } catch {
      setMessage({
        tone: "error",
        text: "ファイルを読み込めませんでした。このアプリから書き出した JSON ファイルを選んでください。",
      });
    }
  }

  return (
    <section className="mt-12 rounded-2xl border border-white/10 px-4 py-5">
      <h2 className="text-sm">記録のバックアップと移行</h2>
      <p className="mt-2 text-xs leading-6 text-[#b3a898]">
        記録はこのブラウザの中にだけ保存されています。別の端末に移したいときや、控えを残しておきたいときに使ってください。
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="h-10" disabled={answered === 0} onClick={exportJournal}>
          記録を書き出す
        </Button>
        <Button variant="outline" className="h-10" onClick={() => inputRef.current?.click()}>
          記録を読み込む
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="記録ファイル"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void readFile(file);
          }}
        />
      </div>
      {message && (
        <p
          role="status"
          className={message.tone === "ok" ? "mt-3 text-xs text-[#b7cfc0]" : "mt-3 text-xs text-[#e7b5a4]"}
        >
          {message.text}
        </p>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="paper">
          <DialogHeader>
            <DialogTitle className="font-mincho text-xl">記録を置き換えますか？</DialogTitle>
            <DialogDescription>
              読み込んだ記録は{pending ? Object.keys(pending.answers).length : 0}問分です。今の
              {answered}問分の記録は、読み込んだ記録に置き換わります。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="h-10" onClick={() => setPending(null)}>
              キャンセル
            </Button>
            <Button
              className="h-10"
              onClick={() => {
                if (!pending) return;
                const count = Object.keys(pending.answers).length;
                replace(pending);
                setPending(null);
                setMessage({ tone: "ok", text: `${count}問分の記録を読み込みました。` });
              }}
            >
              置き換える
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
