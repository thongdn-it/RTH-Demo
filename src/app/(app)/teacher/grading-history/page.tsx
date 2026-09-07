import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, History } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getTeacherGradingHistory } from "@/lib/data/teacher";
import { formatDateTime, formatScore } from "@/lib/format";

export const metadata: Metadata = { title: "Lịch sử chấm điểm" };

export default async function TeacherGradingHistoryPage() {
  const teacher = await requireRole("teacher");
  const history = await getTeacherGradingHistory(teacher.id);

  return (
    <>
      <PageHeader
        title="Lịch sử chấm điểm"
        description="Các lần chấm và sửa điểm trong những lớp bạn phụ trách"
        action={
          <Button asChild variant="outline" className="h-11">
            <Link href="/teacher/assignments">Bài tập</Link>
          </Button>
        }
      />

      {history.length === 0 ? (
        <EmptyState
          icon={History}
          title="Chưa có lịch sử chấm điểm"
          description="Các lần chấm hoặc sửa điểm sẽ được lưu tự động tại đây."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border">
            {history.map((entry) => {
              const isFirstGrade = entry.previous_score === null;

              return (
                <article key={entry.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-pretty">{entry.assignmentTitle}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.className} · {entry.studentName}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                      <Badge variant={isFirstGrade ? "default" : "secondary"}>
                        {isFirstGrade ? "Chấm lần đầu" : "Sửa điểm"}
                      </Badge>
                      <time
                        dateTime={entry.graded_at}
                        className="text-xs text-muted-foreground"
                      >
                        {formatDateTime(entry.graded_at)}
                      </time>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Điểm</span>
                    <span className="font-medium tabular-nums">
                      {isFirstGrade ? "Chưa có" : formatScore(entry.previous_score)}
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                    <span className="font-semibold tabular-nums">{formatScore(entry.score)}</span>
                  </div>

                  {entry.previous_feedback || entry.feedback ? (
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      {entry.previous_feedback ? (
                        <div className="rounded-lg bg-muted/60 p-3">
                          <p className="text-xs font-medium text-muted-foreground">Nhận xét cũ</p>
                          <p className="mt-1 whitespace-pre-line">{entry.previous_feedback}</p>
                        </div>
                      ) : null}
                      {entry.feedback ? (
                        <div className="rounded-lg bg-accent/60 p-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Nhận xét sau khi lưu
                          </p>
                          <p className="mt-1 whitespace-pre-line">{entry.feedback}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </CardContent>
        </Card>
      )}
    </>
  );
}
