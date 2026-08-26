import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";

/**
 * Everything inside this group is behind a session. The check runs here *and*
 * in each page's `requireRole`, because a layout is not a security boundary —
 * it can be skipped on a client-side navigation to a nested route.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
