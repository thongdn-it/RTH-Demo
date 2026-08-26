import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmissionSummary } from "@/components/assignments/submission-summary";
import { SubmitForm } from "@/components/assignments/submit-form";
import { DueBadge, LateBadge, StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth";
import { requestTime } from "@/lib/now";
import { getStudentAssignmentDetail } from "@/lib/data/student";
import { submissionStatus } from "@/lib/data/status";
import { formatDateTime, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Chi tiết bài tập" };

export default async function StudentAssignmentPage({
  params,
}: PageProps<"/student/assignments/[assignmentId]">) {
  const student = await requireRole("student");
  const { assignmentId } = await params;

  // RLS returns nothing for an assignment outside this student's class, so a
  // guessed id is indistinguishable from one that does not exist.
  const detail = await getStudentAssignmentDetail(assignmentId, student.id);
  if (!detail) notFound();

  const { assignment, className, submission } = detail;
  const status = submissionStatus(submission);
  const now = await requestTime();

  return (
    <>
      <PageHeader
        title={assignment.title}
        description={className}
        backHref="/student/assignments"
        backLabel="Bài tập"
      />

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              {status === "not_submitted" ? (
                <DueBadge dueAt={assignment.due_at} now={now} />
              ) : null}
              {submission ? (
                <LateBadge dueAt={assignment.due_at} submittedAt={submission.submitted_at} />
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="size-4 shrink-0" aria-hidden />
              <span>
                Hạn nộp {formatDateTime(assignment.due_at)} ·{" "}
                {formatRelative(assignment.due_at, now)}
              </span>
            </div>

            {assignment.description ? (
              <p className="text-sm whitespace-pre-line text-pretty">
                {assignment.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Không có mô tả chi tiết.</p>
            )}
          </CardContent>
        </Card>

        {submission ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bài đã nộp</CardTitle>
            </CardHeader>
            <CardContent>
              <SubmissionSummary submission={submission} />
            </CardContent>
          </Card>
        ) : null}

        {status === "graded" ? (
          <Alert>
            <AlertTitle>Bài đã được chấm</AlertTitle>
            <AlertDescription>
              Bài nộp đã có điểm nên không thể chỉnh sửa. Liên hệ giáo viên nếu cần nộp lại.
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {submission ? "Cập nhật bài nộp" : "Nộp bài"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SubmitForm assignmentId={assignment.id} current={submission} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
