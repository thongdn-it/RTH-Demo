import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth";
import { getTeacherClasses } from "@/lib/data/teacher";

export const metadata: Metadata = { title: "Lớp học" };

export default async function TeacherHomePage() {
  const teacher = await requireRole("teacher");
  const classes = await getTeacherClasses(teacher.id);

  return (
    <>
      <PageHeader
        title="Lớp học của tôi"
        description={`${teacher.name} · ${classes.length} lớp phụ trách`}
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Chưa được phân công lớp"
          description="Quản trị viên sẽ phân công lớp cho bạn."
        />
      ) : (
        <ul className="space-y-3">
          {classes.map((klass) => (
            <li key={klass.id}>
              <Link
                href={`/teacher/classes/${klass.id}`}
                className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Card className="transition-colors hover:bg-accent/40">
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{klass.name}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {klass.studentCount} học sinh · {klass.assignmentCount} bài tập
                        </p>
                      </div>
                      <ChevronRight
                        className="size-5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
