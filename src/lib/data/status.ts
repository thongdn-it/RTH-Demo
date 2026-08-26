export type SubmissionStatus = "not_submitted" | "submitted" | "graded";

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  not_submitted: "Chưa nộp",
  submitted: "Đã nộp",
  graded: "Đã chấm",
};

export function submissionStatus(
  submission: { graded_at: string | null } | null | undefined,
): SubmissionStatus {
  if (!submission) return "not_submitted";
  return submission.graded_at ? "graded" : "submitted";
}

/** Vietnamese collation, so "Đỗ" sorts where a reader expects it to. */
export function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, "vi");
}
