import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { NotificationList } from "@/components/parent/notification-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth";
import { getNotifications } from "@/lib/data/parent";

export const metadata: Metadata = { title: "Thông báo" };

export default async function ParentNotificationsPage() {
  const parent = await requireRole("parent");
  const notifications = await getNotifications(parent.id);
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <>
      <PageHeader
        title="Thông báo"
        description={
          unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Bạn đã đọc hết thông báo"
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Chưa có thông báo"
          description="Bạn sẽ nhận được thông báo khi con có bài tập mới hoặc được chấm điểm."
        />
      ) : (
        <NotificationList notifications={notifications} unreadCount={unreadCount} />
      )}
    </>
  );
}
