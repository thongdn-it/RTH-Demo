import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, School } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentCard } from "@/components/assignments/assignment-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth";
import { requestTime } from "@/lib/now";
import { getStudentAssignments, getStudentClass } from "@/lib/data/student";
import { submissionStatus } from "@/lib/data/status";
import { formatScore } from "@/lib/format";

export const metadata: Metadata = { title: "Tổng quan" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function StudentHomePage() {
  const student = await requireRole("student");
  const klass = await getStudentClass(student.id);
  const now = await requestTime();

  if (!klass) {
    return (
      <>
        <PageHeader title={`Chào ${student.name}`} />
        <EmptyState
          icon={School}
          title="Bạn chưa được xếp lớp"
          description="Liên hệ giáo viên hoặc quản trị viên để được thêm vào lớp học."
        />
      </>
    );
  }

  const assignments = await getStudentAssignments(klass.id, student.id);

  const scores = assignments.flatMap((item) =>
    item.submission?.score != null ? [Number(item.submission.score)] : [],
  );

  const average = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : null;

  const pending = assignments
    .filter((item) => submissionStatus(item.submission) === "not_submitted")
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
    .slice(0, 3);

  return (
    <>
      <PageHeader
        title={`Chào ${student.name}`}
        description={`${klass.name} · Giáo viên ${klass.teacherName ?? "—"}`}
      />

      <div className="space-y-6">
        <Card>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Bài tập" value={String(assignments.length)} />
              <Stat
                label="Đã nộp"
                value={String(assignments.filter((item) => item.submission !== null).length)}
              />
              <Stat label="Điểm trung bình" value={formatScore(average)} />
            </div>
          </CardContent>
        </Card>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Bài tập cần nộp</h2>
            <Button asChild variant="ghost" className="h-11">
              <Link href="/student/assignments">Xem tất cả</Link>
            </Button>
          </div>

          {assignments.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Chưa có bài tập nào"
              description={`Giáo viên của ${klass.name} chưa giao bài tập.`}
            />
          ) : pending.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Bạn đã nộp hết bài tập"
              description="Không còn bài nào đang chờ nộp."
            />
          ) : (
            <ul className="space-y-3">
              {pending.map((item) => (
                <li key={item.id}>
                  <AssignmentCard
                    href={`/student/assignments/${item.id}`}
                    assignment={item}
                    submission={item.submission}
                    now={now}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
