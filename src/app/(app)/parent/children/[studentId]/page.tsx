import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, ClipboardList } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { SubmissionSummary } from "@/components/assignments/submission-summary";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { DueBadge, LateBadge, StatusBadge } from "@/components/shared/status-badge";
import { requireRole } from "@/lib/auth";
import { requestTime } from "@/lib/now";
import { getChildDetail, type ChildAssignment } from "@/lib/data/parent";
import { submissionStatus } from "@/lib/data/status";
import { formatDateTime, formatRelative, formatScore } from "@/lib/format";

export const metadata: Metadata = { title: "Thông tin học sinh" };

async function ChildAssignmentCard({
  item,
  now,
}: {
  item: ChildAssignment;
  now: number;
}) {
  const status = submissionStatus(item.submission);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 font-medium text-pretty">{item.title}</p>
          <StatusBadge status={status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
          <span>Hạn nộp {formatDateTime(item.due_at)}</span>
          <span aria-hidden>·</span>
          <span>{formatRelative(item.due_at, now)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status === "not_submitted" ? <DueBadge dueAt={item.due_at} now={now} /> : null}
          {item.submission ? (
            <LateBadge dueAt={item.due_at} submittedAt={item.submission.submitted_at} />
          ) : null}
        </div>

        {item.submission ? (
          <div className="border-t border-border pt-3">
            <SubmissionSummary submission={item.submission} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function ParentChildPage({
  params,
}: PageProps<"/parent/children/[studentId]">) {
  const parent = await requireRole("parent");
  const { studentId } = await params;

  // Returns null unless this student is linked to this parent — checked here
  // and again by RLS on every row the page reads.
  const detail = await getChildDetail(parent.id, studentId);
  if (!detail) notFound();

  const { child, teacherName, assignments, averageScore } = detail;
  const now = await requestTime();
  const graded = assignments.filter(
    (item) => submissionStatus(item.submission) === "graded",
  ).length;

  return (
    <>
      <PageHeader
        title={child.name}
        description={`${child.className ?? "Chưa xếp lớp"}${teacherName ? ` · Giáo viên ${teacherName}` : ""}`}
        backHref="/parent"
        backLabel="Con của tôi"
      />

      <div className="space-y-6">
        <Card>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xl font-semibold tabular-nums">{assignments.length}</p>
                <p className="text-xs text-muted-foreground">Bài tập</p>
              </div>
              <div>
                <p className="text-xl font-semibold tabular-nums">{graded}</p>
                <p className="text-xs text-muted-foreground">Đã chấm</p>
              </div>
              <div>
                <p className="text-xl font-semibold tabular-nums">
                  {formatScore(averageScore)}
                </p>
                <p className="text-xs text-muted-foreground">Điểm TB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-3 font-semibold">Bài tập và điểm</h2>

          {assignments.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Lớp chưa có bài tập nào" />
          ) : (
            <ul className="space-y-3">
              {assignments.map((item) => (
                <li key={item.id}>
                  <ChildAssignmentCard item={item} now={now} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
