"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";

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
import { gradeSubmission } from "@/lib/actions/grading";
import { IDLE } from "@/lib/actions/types";

export function GradeDialog({
  submissionId,
  studentName,
  score,
  feedback,
}: {
  submissionId: string;
  studentName: string;
  score: number | null;
  feedback: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(gradeSubmission, IDLE);
  const graded = score !== null;

  useActionToast(state, "Đã lưu điểm.", () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={graded ? "outline" : "default"} size="sm" className="h-11 sm:h-9">
          {graded ? "Sửa điểm" : "Chấm bài"}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Chấm bài</DialogTitle>
          <DialogDescription>Bài nộp của {studentName}.</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="submissionId" value={submissionId} />

          {state.error ? (
            <Alert variant="destructive">
              <TriangleAlert aria-hidden />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`score-${submissionId}`}>Điểm (0 – 10)</Label>
            <Input
              id={`score-${submissionId}`}
              name="score"
              type="number"
              inputMode="decimal"
              step="0.25"
              min="0"
              max="10"
              required
              defaultValue={score ?? ""}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`feedback-${submissionId}`}>Nhận xét</Label>
            <Textarea
              id={`feedback-${submissionId}`}
              name="feedback"
              rows={4}
              maxLength={4000}
              defaultValue={feedback ?? ""}
              placeholder="Nhận xét gửi tới học sinh và phụ huynh…"
            />
          </div>

          <DialogFooter>
            <Button type="submit" className="h-11 w-full" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              Lưu điểm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
