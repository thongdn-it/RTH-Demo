"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LogOut, User as UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV, isActive } from "@/components/layout/nav-config";
import { signOut } from "@/lib/actions/auth";
import { initials } from "@/lib/format";
import type { UserRole } from "@/lib/database.types";

export function TopBar({
  name,
  email,
  role,
  roleLabel,
  homeHref,
  unreadCount,
}: {
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  homeHref: string;
  unreadCount: number;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
        <Link
          href={homeHref}
          className="flex min-h-11 shrink-0 items-center gap-2 font-semibold"
        >
          <GraduationCap className="size-5 text-primary" aria-hidden />
          <span className="text-base">RTH Lớp học</span>
        </Link>

        <nav aria-label="Điều hướng chính" className="ms-4 hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV[role].map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {item.label}
                    {item.badge && unreadCount > 0 ? (
                      <Badge variant="destructive" className="px-1.5">
                        {unreadCount}
                      </Badge>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {roleLabel}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-full"
                aria-label="Tài khoản"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate font-medium">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserIcon aria-hidden />
                  Thông tin cá nhân
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signOut}>
                <DropdownMenuItem asChild variant="destructive">
                  <button type="submit" className="w-full">
                    <LogOut aria-hidden />
                    Đăng xuất
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
