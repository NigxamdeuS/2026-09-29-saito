"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useJournal } from "@/components/journal-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ResetJournal() {
  const { reset } = useJournal();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        className="h-9 px-2 text-[#b3a898]"
        onClick={() => setOpen(true)}
      >
        記録を消去
      </Button>
      <DialogContent className="paper">
        <DialogHeader>
          <DialogTitle className="font-mincho text-xl">記録を消去しますか？</DialogTitle>
          <DialogDescription>
            これまでの回答と理由がすべて消えます。元には戻せません。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="h-10" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button
            variant="destructive"
            className="h-10"
            onClick={() => {
              reset();
              setOpen(false);
              router.push("/scenes");
            }}
          >
            消去する
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
