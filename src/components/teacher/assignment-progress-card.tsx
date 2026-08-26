import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatRelative, isOverdue } from "@/lib/format";
import type { AssignmentSummary } from "@/lib/data/teacher";

export function AssignmentProgressCard({
  assignment,
  now,
  showClassName = false,
}: {
  assignment: AssignmentSummary;
  now: number;
  showClassName?: boolean;
}) {
  const pendingGrading = assignment.submittedCount - assignment.gradedCount;

  return (
    <Link
      href={`/teacher/assignments/${assignment.id}`}
      className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="transition-colors hover:bg-accent/40">
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-pretty">{assignment.title}</p>
              {showClassName ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{assignment.className}</p>
              ) : null}
            </div>
            {pendingGrading > 0 ? (
              <Badge variant="secondary">{pendingGrading} chờ chấm</Badge>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5 shrink-0" aria-hidden />
            <span>Hạn nộp {formatDateTime(assignment.due_at)}</span>
            <span aria-hidden>·</span>
            <span>{formatRelative(assignment.due_at, now)}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span>
              <span className="font-semibold tabular-nums">
                {assignment.submittedCount}/{assignment.studentCount}
              </span>
              <span className="text-muted-foreground"> đã nộp</span>
            </span>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            <span>
              <span className="font-semibold tabular-nums">{assignment.gradedCount}</span>
              <span className="text-muted-foreground"> đã chấm</span>
            </span>
            {isOverdue(assignment.due_at, now) ? (
              <Badge variant="outline">Hết hạn</Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
