import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubmissionSummary } from "@/components/assignments/submission-summary";
import { GradeDialog } from "@/components/teacher/grade-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LateBadge, StatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth";
import { requestTime } from "@/lib/now";
import { getTeacherAssignmentDetail, type SubmissionRow } from "@/lib/data/teacher";
import { submissionStatus } from "@/lib/data/status";
import { formatDateTime, formatRelative, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Chấm bài" };

function StudentRow({ row, dueAt }: { row: SubmissionRow; dueAt: string }) {
  const { student, submission } = row;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className="text-xs">{initials(student.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{student.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={submissionStatus(submission)} />
            {submission ? (
              <LateBadge dueAt={dueAt} submittedAt={submission.submitted_at} />
            ) : null}
          </div>
        </div>

        {submission ? (
          <GradeDialog
            submissionId={submission.id}
            studentName={student.name}
            score={submission.score}
            feedback={submission.feedback}
          />
        ) : null}
      </div>

      {submission ? (
        <div className="mt-3">
          <SubmissionSummary submission={submission} />
        </div>
      ) : null}
    </div>
  );
}

function RowList({ rows, dueAt, emptyLabel }: { rows: SubmissionRow[]; dueAt: string; emptyLabel: string }) {
  if (rows.length === 0) {
    return <EmptyState icon={Users} title={emptyLabel} />;
  }

  return (
    <Card>
      <CardContent className="divide-y divide-border">
        {rows.map((row) => (
          <StudentRow key={row.student.id} row={row} dueAt={dueAt} />
        ))}
      </CardContent>
    </Card>
  );
}

export default async function TeacherAssignmentPage({
  params,
}: PageProps<"/teacher/assignments/[assignmentId]">) {
  await requireRole("teacher");
  const { assignmentId } = await params;

  const detail = await getTeacherAssignmentDetail(assignmentId);
  if (!detail) notFound();

  const { assignment, classId, className, rows } = detail;
  const submitted = rows.filter((row) => row.submission !== null);
  const missing = rows.filter((row) => row.submission === null);
  const now = await requestTime();

  return (
    <>
      <PageHeader
        title={assignment.title}
        description={className}
        backHref={`/teacher/classes/${classId}`}
        backLabel={className}
      />

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3">
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
            ) : null}

            <p className="text-sm">
              <span className="font-semibold tabular-nums">
                {submitted.length}/{rows.length}
              </span>
              <span className="text-muted-foreground"> đã nộp · </span>
              <span className="font-semibold tabular-nums">
                {rows.filter((row) => row.submission?.graded_at).length}
              </span>
              <span className="text-muted-foreground"> đã chấm</span>
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="submitted">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="submitted" className="min-w-0 text-xs sm:text-sm">
              <span className="truncate">Đã nộp ({submitted.length})</span>
            </TabsTrigger>
            <TabsTrigger value="missing" className="min-w-0 text-xs sm:text-sm">
              <span className="truncate">Chưa nộp ({missing.length})</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="min-w-0 text-xs sm:text-sm">
              <span className="truncate">Tất cả</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submitted" className="mt-4">
            <RowList rows={submitted} dueAt={assignment.due_at} emptyLabel="Chưa có bài nộp nào" />
          </TabsContent>
          <TabsContent value="missing" className="mt-4">
            <RowList
              rows={missing}
              dueAt={assignment.due_at}
              emptyLabel="Tất cả học sinh đã nộp bài"
            />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <RowList rows={rows} dueAt={assignment.due_at} emptyLabel="Lớp chưa có học sinh" />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
