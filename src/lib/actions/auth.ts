"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { HOME_PATH } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions/types";

const credentials = z.object({
  email: z.email("Email không hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

/** Only ever follow a same-origin path, never an attacker-supplied origin. */
function safeNext(value: string): string | null {
  // "//evil.test" and "/\evil.test" are both read as protocol-relative by
  // some browsers, so a leading slash alone is not enough.
  if (!/^\/(?![/\\])/.test(value)) return null;
  return value === "/login" ? null : value;
}

export async function signIn(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = credentials.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Thông tin đăng nhập không hợp lệ.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    // A fault on our side must not masquerade as a typo on theirs. supabase-js
    // folds both a dead socket and a 5xx into AuthRetryableFetchError, so split
    // them apart — a 500 here usually means the Auth server could not read
    // auth.users, not that the user is offline.
    if (error && isAuthRetryableFetchError(error)) {
      console.error("[signIn] auth server unreachable or failing", {
        status: error.status,
        message: error.message,
      });

      return failure(
        error.status && error.status >= 500
          ? "Máy chủ xác thực đang gặp sự cố. Vui lòng liên hệ quản trị viên."
          : "Không kết nối được tới máy chủ. Vui lòng thử lại sau.",
      );
    }

    return failure("Email hoặc mật khẩu không đúng.");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return failure("Tài khoản chưa được cấp quyền. Vui lòng liên hệ quản trị viên.");
  }

  const next = safeNext(String(formData.get("next") ?? ""));

  revalidatePath("/", "layout");
  redirect(next ?? HOME_PATH[profile.role]);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
