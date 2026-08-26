import type { Metadata } from "next";
import { ClipboardList, School } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentCard } from "@/components/assignments/assignment-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth";
import { requestTime } from "@/lib/now";
import { getStudentAssignments, getStudentClass } from "@/lib/data/student";
import { submissionStatus, type SubmissionStatus } from "@/lib/data/status";
import type { AssignmentForStudent } from "@/lib/data/student";

export const metadata: Metadata = { title: "Bài tập" };

const TABS: { value: string; label: string; status: SubmissionStatus | null }[] = [
  { value: "all", label: "Tất cả", status: null },
  { value: "not_submitted", label: "Chưa nộp", status: "not_submitted" },
  { value: "submitted", label: "Đã nộp", status: "submitted" },
  { value: "graded", label: "Đã chấm", status: "graded" },
];

function AssignmentList({
  items,
  now,
  emptyLabel,
}: {
  items: AssignmentForStudent[];
  now: number;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <EmptyState icon={ClipboardList} title={emptyLabel} />;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
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
  );
}

export default async function StudentAssignmentsPage() {
  const student = await requireRole("student");
  const klass = await getStudentClass(student.id);
  const now = await requestTime();

  if (!klass) {
    return (
      <>
        <PageHeader title="Bài tập" />
        <EmptyState
          icon={School}
          title="Bạn chưa được xếp lớp"
          description="Liên hệ giáo viên hoặc quản trị viên để được thêm vào lớp học."
        />
      </>
    );
  }

  const assignments = await getStudentAssignments(klass.id, student.id);

  return (
    <>
      <PageHeader title="Bài tập" description={klass.name} />

      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-4">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="min-w-0 text-xs sm:text-sm">
              <span className="truncate">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => {
          const items = tab.status
            ? assignments.filter((item) => submissionStatus(item.submission) === tab.status)
            : assignments;

          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              <AssignmentList
                items={items}
                now={now}
                emptyLabel={
                  tab.status === null
                    ? "Chưa có bài tập nào"
                    : `Không có bài tập ở mục "${tab.label}"`
                }
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
}
