"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useActionToast } from "@/components/shared/use-action-toast";
import { submitWork } from "@/lib/actions/submissions";
import { IDLE } from "@/lib/actions/types";
import type { SubmissionType, Tables } from "@/lib/database.types";

export function SubmitForm({
  assignmentId,
  current,
}: {
  assignmentId: string;
  current: Tables<"submissions"> | null;
}) {
  const [state, formAction, pending] = useActionState(submitWork, IDLE);
  const [type, setType] = useState<SubmissionType>(current?.submission_type ?? "link");

  useActionToast(state, current ? "Đã cập nhật bài nộp." : "Đã nộp bài.");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="submissionType" value={type} />

      {state.error ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <RadioGroup
        value={type}
        onValueChange={(value) => setType(value as SubmissionType)}
        className="grid grid-cols-2 gap-3"
      >
        {(
          [
            { value: "link", label: "Nộp đường dẫn" },
            { value: "file", label: "Tải file lên" },
          ] as const
        ).map((option) => (
          <Label
            key={option.value}
            htmlFor={`submission-type-${option.value}`}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent"
          >
            <RadioGroupItem value={option.value} id={`submission-type-${option.value}`} />
            <span className="min-w-0 truncate">{option.label}</span>
          </Label>
        ))}
      </RadioGroup>

      {type === "link" ? (
        <div className="space-y-2">
          <Label htmlFor="externalUrl">Đường dẫn bài làm</Label>
          <Input
            id="externalUrl"
            name="externalUrl"
            type="url"
            inputMode="url"
            placeholder="https://drive.google.com/..."
            defaultValue={current?.external_url ?? ""}
            required
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Nhớ mở quyền xem cho giáo viên trước khi nộp.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="file">File bài làm</Label>
          <Input
            id="file"
            name="file"
            type="file"
            required
            className="h-11 py-2 file:mr-3 file:text-sm"
          />
          <p className="text-xs text-muted-foreground">Tối đa 10 MB cho mỗi file.</p>
        </div>
      )}

      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
        {current ? "Cập nhật bài nộp" : "Nộp bài"}
      </Button>
    </form>
  );
}
