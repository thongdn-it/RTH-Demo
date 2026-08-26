"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import { formatDateTime } from "@/lib/format";
import type { NotificationItem } from "@/lib/data/parent";

const TYPE_LABEL = {
  assignment_created: "Bài tập mới",
  grade_created: "Có điểm",
  grade_updated: "Cập nhật điểm",
} as const;

export function NotificationList({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {unreadCount > 0 ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-11"
            disabled={pending}
            onClick={() => startTransition(() => markAllNotificationsRead())}
          >
            <CheckCheck aria-hidden />
            Đánh dấu tất cả đã đọc
          </Button>
        </div>
      ) : null}

      <ul className="space-y-3">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <Link
              href={`/parent/children/${notification.student_id}`}
              onClick={() => {
                if (notification.is_read) return;
                startTransition(() => markNotificationRead(notification.id));
              }}
              className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card
                className={cn(
                  "transition-colors hover:bg-accent/40",
                  notification.is_read ? "" : "ring-primary/30",
                )}
              >
                <CardContent>
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        notification.is_read ? "bg-transparent" : "bg-primary",
                      )}
                      aria-hidden
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-pretty">{notification.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground text-pretty">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {TYPE_LABEL[notification.type]}
                        {notification.studentName ? ` · ${notification.studentName}` : ""} ·{" "}
                        {formatDateTime(notification.created_at)}
                      </p>
                    </div>

                    {notification.is_read ? null : (
                      <Bell className="size-4 shrink-0 text-primary" aria-hidden />
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
