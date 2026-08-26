import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type SubmissionStatus } from "@/lib/data/status";

const VARIANT: Record<SubmissionStatus, "outline" | "secondary" | "default"> = {
  not_submitted: "outline",
  submitted: "secondary",
  graded: "default",
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function DueBadge({ dueAt, now }: { dueAt: string; now: number }) {
  const overdue = new Date(dueAt).getTime() < now;
  if (!overdue) return null;
  return <Badge variant="destructive">Quá hạn</Badge>;
}

export function LateBadge({
  dueAt,
  submittedAt,
}: {
  dueAt: string;
  submittedAt: string;
}) {
  if (new Date(submittedAt).getTime() <= new Date(dueAt).getTime()) return null;
  return <Badge variant="destructive">Nộp muộn</Badge>;
}
