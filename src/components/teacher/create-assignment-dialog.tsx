"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Plus, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/components/shared/use-action-toast";
import { createAssignment } from "@/lib/actions/assignments";
import { IDLE } from "@/lib/actions/types";
import { isoToLocalInput } from "@/lib/format";

/** A week out, end of day — the deadline a teacher usually means. */
function defaultDueAt(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return `${isoToLocalInput(date.toISOString()).slice(0, 11)}23:59`;
}

export function CreateAssignmentDialog({
  classId,
  classLabel,
}: {
  classId: string;
  classLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createAssignment, IDLE);

  useActionToast(state, "Đã tạo bài tập.", () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11">
          <Plus aria-hidden />
          Tạo bài tập
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Tạo bài tập</DialogTitle>
          <DialogDescription>Bài tập sẽ được giao cho {classLabel}.</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="classId" value={classId} />

          {state.error ? (
            <Alert variant="destructive">
              <TriangleAlert aria-hidden />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="Toán — Ôn tập chương II"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              maxLength={4000}
              placeholder="Yêu cầu, phạm vi bài làm, cách nộp…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueAt">Hạn nộp</Label>
            <Input
              id="dueAt"
              name="dueAt"
              type="datetime-local"
              required
              defaultValue={defaultDueAt()}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">Theo giờ Việt Nam (GMT+7).</p>
          </div>

          <DialogFooter>
            <Button type="submit" className="h-11 w-full" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              Tạo bài tập
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
