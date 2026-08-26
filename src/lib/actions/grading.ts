"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { failure, success, type ActionState } from "@/lib/actions/types";

const grade = z.object({
  submissionId: z.uuid("Bài nộp không hợp lệ."),
  score: z
    .number({ error: "Vui lòng nhập điểm." })
    .min(0, "Điểm từ 0 đến 10.")
    .max(10, "Điểm từ 0 đến 10."),
  feedback: z.string().trim().max(4000, "Nhận xét tối đa 4000 ký tự."),
});

export async function gradeSubmission(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("teacher");

  const rawScore = String(formData.get("score") ?? "").trim().replace(",", ".");

  const parsed = grade.safeParse({
    submissionId: String(formData.get("submissionId") ?? ""),
    score: rawScore === "" ? undefined : Number(rawScore),
    feedback: String(formData.get("feedback") ?? ""),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }

  const supabase = await createClient();

  // RLS restricts this to submissions in the teacher's own classes, and the
  // guard trigger stamps graded_at/graded_by and refuses edits to the work.
  const { data, error } = await supabase
    .from("submissions")
    .update({
      score: parsed.data.score,
      feedback: parsed.data.feedback || null,
    })
    .eq("id", parsed.data.submissionId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return failure("Không chấm được bài. Bài nộp này không thuộc lớp bạn phụ trách.");
  }

  revalidatePath("/teacher", "layout");
  return success();
}
