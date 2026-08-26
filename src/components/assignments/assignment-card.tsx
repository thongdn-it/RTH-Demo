import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DueBadge, LateBadge, StatusBadge } from "@/components/shared/status-badge";
import { submissionStatus } from "@/lib/data/status";
import { formatDateTime, formatRelative, formatScore } from "@/lib/format";
import type { Tables } from "@/lib/database.types";

export function AssignmentCard({
  href,
  assignment,
  submission,
  now,
  meta,
}: {
  href: string;
  assignment: Tables<"assignments">;
  submission: Tables<"submissions"> | null;
  now: number;
  /** Extra line under the title — the class name on cross-class listings. */
  meta?: string;
}) {
  const status = submissionStatus(submission);

  return (
    <Link href={href} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card className="transition-colors hover:bg-accent/40">
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-pretty">{assignment.title}</p>
              {meta ? <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p> : null}
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5 shrink-0" aria-hidden />
            <span>Hạn nộp {formatDateTime(assignment.due_at)}</span>
            <span aria-hidden>·</span>
            <span>{formatRelative(assignment.due_at, now)}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {status === "not_submitted" ? (
              <DueBadge dueAt={assignment.due_at} now={now} />
            ) : null}
            {submission ? (
              <LateBadge dueAt={assignment.due_at} submittedAt={submission.submitted_at} />
            ) : null}
            {status === "graded" && submission ? (
              <span className="text-sm">
                <span className="text-muted-foreground">Điểm: </span>
                <span className="font-semibold">{formatScore(submission.score)}</span>
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
