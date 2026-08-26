import { Bell, BookOpen, ClipboardList, House, User, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { UserRole } from "@/lib/database.types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Show the unread-notification badge on this item. */
  badge?: boolean;
};

/**
 * Three destinations per role: enough to fill a bottom bar without crowding a
 * 320px screen, and the same list doubles as the desktop nav.
 */
export const NAV: Record<UserRole, NavItem[]> = {
  student: [
    { href: "/student", label: "Tổng quan", icon: House },
    { href: "/student/assignments", label: "Bài tập", icon: ClipboardList },
    { href: "/profile", label: "Cá nhân", icon: User },
  ],
  teacher: [
    { href: "/teacher", label: "Lớp học", icon: BookOpen },
    { href: "/teacher/assignments", label: "Bài tập", icon: ClipboardList },
    { href: "/profile", label: "Cá nhân", icon: User },
  ],
  parent: [
    { href: "/parent", label: "Con của tôi", icon: Users },
    { href: "/parent/notifications", label: "Thông báo", icon: Bell, badge: true },
    { href: "/profile", label: "Cá nhân", icon: User },
  ],
};

export function isActive(pathname: string, href: string): boolean {
  if (href === "/profile") return pathname === href;
  // "/student" must not light up while the user is on "/student/assignments".
  const siblings = Object.values(NAV)
    .flat()
    .map((item) => item.href)
    .filter((candidate) => candidate !== href && candidate.startsWith(`${href}/`));

  if (siblings.some((sibling) => pathname === sibling || pathname.startsWith(`${sibling}/`))) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
