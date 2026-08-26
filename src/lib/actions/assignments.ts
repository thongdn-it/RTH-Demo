"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { localInputToIso } from "@/lib/format";
import { failure, success, type ActionState } from "@/lib/actions/types";

const newAssignment = z.object({
  classId: z.uuid("Lớp không hợp lệ."),
  title: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tiêu đề bài tập.")
    .max(200, "Tiêu đề tối đa 200 ký tự."),
  description: z.string().trim().max(4000, "Mô tả tối đa 4000 ký tự."),
  dueAt: z.string().min(1, "Vui lòng chọn hạn nộp."),
});

export async function createAssignment(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Role first, then ownership of the class — enforced again by RLS on insert.
  await requireRole("teacher");

  const parsed = newAssignment.safeParse({
    classId: String(formData.get("classId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }

  const dueAt = localInputToIso(parsed.data.dueAt);
  if (!dueAt) return failure("Hạn nộp không hợp lệ.");

  const supabase = await createClient();

  const { error } = await supabase.from("assignments").insert({
    class_id: parsed.data.classId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    due_at: dueAt,
  });

  if (error) {
    return failure(
      "Không tạo được bài tập. Bạn chỉ có thể tạo bài tập cho lớp mình phụ trách.",
    );
  }

  revalidatePath("/teacher", "layout");
  return success();
}
