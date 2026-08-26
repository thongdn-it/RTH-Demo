import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardList, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentProgressCard } from "@/components/teacher/assignment-progress-card";
import { CreateAssignmentDialog } from "@/components/teacher/create-assignment-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth";
import { requestTime } from "@/lib/now";
import { getTeacherClassDetail } from "@/lib/data/teacher";
import { initials } from "@/lib/format";

export const metadata: Metadata = { title: "Chi tiết lớp" };

export default async function TeacherClassPage({
  params,
}: PageProps<"/teacher/classes/[classId]">) {
  await requireRole("teacher");
  const { classId } = await params;

  // RLS scopes `classes` to the teacher who owns it, so another teacher's class
  // simply is not there.
  const detail = await getTeacherClassDetail(classId);
  if (!detail) notFound();

  const now = await requestTime();

  return (
    <>
      <PageHeader
        title={detail.name}
        description={`${detail.students.length} học sinh · ${detail.assignments.length} bài tập`}
        backHref="/teacher"
        backLabel="Lớp học"
        action={<CreateAssignmentDialog classId={detail.id} classLabel={detail.name} />}
      />

      <Tabs defaultValue="assignments">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assignments">Bài tập</TabsTrigger>
          <TabsTrigger value="students">Học sinh</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-4">
          {detail.assignments.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Chưa có bài tập"
              description={`Tạo bài tập đầu tiên cho ${detail.name}.`}
            />
          ) : (
            <ul className="space-y-3">
              {detail.assignments.map((assignment) => (
                <li key={assignment.id}>
                  <AssignmentProgressCard assignment={assignment} now={now} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          {detail.students.length === 0 ? (
            <EmptyState icon={Users} title="Lớp chưa có học sinh" />
          ) : (
            <Card>
              <CardContent className="divide-y divide-border">
                {detail.students.map((student) => (
                  <div key={student.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="text-xs">
                        {initials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{student.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
