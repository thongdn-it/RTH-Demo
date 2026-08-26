import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables, UserRole } from "@/lib/database.types";

export type AppUser = Tables<"users">;

export const HOME_PATH: Record<UserRole, string> = {
  student: "/student",
  teacher: "/teacher",
  parent: "/parent",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  student: "Học sinh",
  teacher: "Giáo viên",
  parent: "Phụ huynh",
};

/**
 * `getUser()` revalidates the token with the Auth server on every call, so
 * unlike `getSession()` it cannot be spoofed by a forged cookie. Wrapped in
 * `cache` so a single render pays for it once.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return profile ?? null;
});

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Every page and every Server Action starts here. A user who reaches a route
 * that is not theirs is sent to their own home rather than shown an error —
 * there is nothing for them to fix.
 */
export async function requireRole(role: UserRole): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== role) redirect(HOME_PATH[user.role]);
  return user;
}
