import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, History } from "lucide-react";

import { AssignmentProgressCard } from "@/components/teacher/assignment-progress-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { requestTime } from "@/lib/now";
import { getTeacherAssignments } from "@/lib/data/teacher";

export const metadata: Metadata = { title: "Bài tập" };

export default async function TeacherAssignmentsPage() {
  const teacher = await requireRole("teacher");
  const assignments = await getTeacherAssignments(teacher.id);
  const now = await requestTime();

  const pendingGrading = assignments.reduce(
    (sum, assignment) => sum + (assignment.submittedCount - assignment.gradedCount),
    0,
  );

  return (
    <>
      <PageHeader
        title="Bài tập đã giao"
        description={
          pendingGrading > 0
            ? `${assignments.length} bài tập · ${pendingGrading} bài nộp chờ chấm`
            : `${assignments.length} bài tập · đã chấm hết bài nộp`
        }
        action={
          <Button asChild variant="outline" className="h-11">
            <Link href="/teacher/grading-history">
              <History aria-hidden />
              Lịch sử chấm điểm
            </Link>
          </Button>
        }
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Chưa giao bài tập nào"
          description="Vào một lớp bạn phụ trách để tạo bài tập đầu tiên."
        />
      ) : (
        <ul className="space-y-3">
          {assignments.map((assignment) => (
            <li key={assignment.id}>
              <AssignmentProgressCard assignment={assignment} now={now} showClassName />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
