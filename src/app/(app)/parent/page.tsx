import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth";
import { getChildren } from "@/lib/data/parent";
import { formatScore, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Con của tôi" };

export default async function ParentHomePage() {
  const parent = await requireRole("parent");
  const children = await getChildren(parent.id);

  return (
    <>
      <PageHeader
        title="Con của tôi"
        description={`${parent.name} · ${children.length} học sinh được liên kết`}
      />

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Chưa liên kết học sinh"
          description="Liên hệ nhà trường để liên kết tài khoản của bạn với học sinh."
        />
      ) : (
        <ul className="space-y-3">
          {children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/parent/children/${child.id}`}
                className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Card className="transition-colors hover:bg-accent/40">
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback className="text-sm">
                          {initials(child.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{child.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {child.className ?? "Chưa xếp lớp"}
                        </p>
                      </div>

                      <ChevronRight
                        className="size-5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
                      <div>
                        <p className="text-lg font-semibold tabular-nums">
                          {child.assignmentCount}
                        </p>
                        <p className="text-xs text-muted-foreground">Bài tập</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold tabular-nums">
                          {child.submittedCount}
                        </p>
                        <p className="text-xs text-muted-foreground">Đã nộp</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold tabular-nums">
                          {formatScore(child.averageScore)}
                        </p>
                        <p className="text-xs text-muted-foreground">Điểm TB</p>
                      </div>
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
