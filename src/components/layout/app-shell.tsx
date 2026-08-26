import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { getUnreadNotificationCount } from "@/lib/data/parent";
import { HOME_PATH, ROLE_LABEL, type AppUser } from "@/lib/auth";

export async function AppShell({
  user,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  const unreadCount = await getUnreadNotificationCount(user.id);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar
        name={user.name}
        email={user.email}
        role={user.role}
        roleLabel={ROLE_LABEL[user.role]}
        homeHref={HOME_PATH[user.role]}
        unreadCount={unreadCount}
      />

      {/* pb-24 keeps content clear of the mobile bottom bar. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 md:pb-12">
        {children}
      </main>

      <footer className="hidden border-t border-border md:block">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted-foreground">
          RTH Lớp học — bản demo. Tài khoản do quản trị viên cấp.
        </div>
      </footer>

      <BottomNav role={user.role} unreadCount={unreadCount} />
    </div>
  );
}
