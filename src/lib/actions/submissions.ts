"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { failure, success, type ActionState } from "@/lib/actions/types";

const BUCKET = "submissions";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const base = z.object({
  assignmentId: z.uuid("Bài tập không hợp lệ."),
  submissionType: z.enum(["file", "link"], { error: "Hình thức nộp không hợp lệ." }),
});

/** Storage keys must stay ASCII; "Bài tập Toán.pdf" would not survive a URL. */
function safeFileName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[-.]+|-+$/g, "");

  return cleaned.slice(-100) || "bai-nop";
}

function parseHttpUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function submitWork(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const student = await requireRole("student");

  const parsed = base.safeParse({
    assignmentId: String(formData.get("assignmentId") ?? ""),
    submissionType: String(formData.get("submissionType") ?? ""),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }

  const { assignmentId, submissionType } = parsed.data;
  const supabase = await createClient();

  // RLS already scopes this to the student's own row; the filter keeps the
  // intent explicit and the query narrow.
  const { data: existing } = await supabase
    .from("submissions")
    .select("id, storage_path, graded_at")
    .eq("assignment_id", assignmentId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (existing?.graded_at) {
    return failure("Bài đã được chấm nên không thể nộp lại.");
  }

  let storagePath: string | null = null;
  let externalUrl: string | null = null;

  if (submissionType === "link") {
    externalUrl = parseHttpUrl(String(formData.get("externalUrl") ?? ""));
    if (!externalUrl) {
      return failure("Đường dẫn không hợp lệ. Hãy dùng link bắt đầu bằng http:// hoặc https://");
    }
  } else {
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return failure("Vui lòng chọn file cần nộp.");
    }
    if (file.size > MAX_FILE_BYTES) {
      return failure("File tối đa 10 MB.");
    }

    // The path is what the storage policies authorize against:
    // {assignment_id}/{student_id}/{file}
    storagePath = `${assignmentId}/${student.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      return failure("Không tải được file lên. Vui lòng thử lại.");
    }
  }

  const payload = {
    submission_type: submissionType,
    storage_path: storagePath,
    external_url: externalUrl,
  };

  const { error } = existing
    ? await supabase.from("submissions").update(payload).eq("id", existing.id)
    : await supabase.from("submissions").insert({
        ...payload,
        assignment_id: assignmentId,
        student_id: student.id,
      });

  if (error) {
    if (storagePath) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
    }
    return failure("Không lưu được bài nộp. Vui lòng thử lại.");
  }

  // The replaced file is only garbage once the row no longer points at it.
  if (existing?.storage_path && existing.storage_path !== storagePath) {
    await supabase.storage.from(BUCKET).remove([existing.storage_path]);
  }

  revalidatePath("/student", "layout");
  return success();
}
