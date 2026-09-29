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
        記録を消す
      </Button>
      <DialogContent className="paper">
        <DialogHeader>
          <DialogTitle className="font-mincho text-xl">記録を消す</DialogTitle>
          <DialogDescription>
            ここまでの選択と、そこから組んだ意思決定モデルが消えます。戻せません。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="h-10" onClick={() => setOpen(false)}>
            やめる
          </Button>
          <Button
            variant="destructive"
            className="h-10"
            onClick={() => {
              reset();
              setOpen(false);
              router.push("/");
            }}
          >
            消す
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
