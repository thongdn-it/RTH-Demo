import type { Metadata } from "next";
import { AtSign, Mail, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { ROLE_LABEL, requireUser } from "@/lib/auth";
import { getStudentClass } from "@/lib/data/student";
import { getTeacherClasses } from "@/lib/data/teacher";
import { getChildren } from "@/lib/data/parent";
import { formatDate, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Thông tin cá nhân" };

/** One line per fact — the layout that survives a 320px screen. */
function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

async function RoleContext() {
  const user = await requireUser();

  if (user.role === "student") {
    const klass = await getStudentClass(user.id);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lớp học</CardTitle>
        </CardHeader>
        <CardContent>
          {klass ? (
            <div className="space-y-1">
              <p className="font-medium">{klass.name}</p>
              <p className="text-sm text-muted-foreground">
                Giáo viên phụ trách: {klass.teacherName ?? "—"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa được xếp lớp.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (user.role === "teacher") {
    const classes = await getTeacherClasses(user.id);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lớp phụ trách</CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length ? (
            <ul className="space-y-2">
              {classes.map((klass) => (
                <li key={klass.id} className="flex items-center justify-between gap-3">
                  <span className="font-medium">{klass.name}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {klass.studentCount} học sinh
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa được phân công lớp.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const children = await getChildren(user.id);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Học sinh liên kết</CardTitle>
      </CardHeader>
      <CardContent>
        {children.length ? (
          <ul className="space-y-2">
            {children.map((child) => (
              <li key={child.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{child.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {child.className ?? "Chưa xếp lớp"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa liên kết học sinh nào.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Thông tin cá nhân" />

      <div className="space-y-4">
        <Card>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{user.name}</p>
                <Badge variant="secondary" className="mt-1">
                  {ROLE_LABEL[user.role]}
                </Badge>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="divide-y divide-border">
              <Row icon={Mail} label="Email" value={user.email} />
              <Row icon={AtSign} label="Tên đăng nhập" value={user.username} />
              <Row icon={UserRound} label="Ngày tạo tài khoản" value={formatDate(user.created_at)} />
            </div>
          </CardContent>
        </Card>

        <RoleContext />
      </div>
    </>
  );
}
