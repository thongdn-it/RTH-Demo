import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type StudentClass = {
  id: string;
  name: string;
  teacherName: string | null;
  teacherEmail: string | null;
};

export type AssignmentForStudent = Tables<"assignments"> & {
  submission: Tables<"submissions"> | null;
};

/** A student belongs to exactly one class, so this is a single row or nothing. */
export async function getStudentClass(
  studentId: string,
): Promise<StudentClass | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("class_students")
    .select(
      "classes(id, name, teacher:users!classes_teacher_id_fkey(id, name, email))",
    )
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.classes) return null;

  return {
    id: data.classes.id,
    name: data.classes.name,
    teacherName: data.classes.teacher?.name ?? null,
    teacherEmail: data.classes.teacher?.email ?? null,
  };
}

export async function getStudentAssignments(
  classId: string,
  studentId: string,
): Promise<AssignmentForStudent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assignments")
    .select("*, submissions(*)")
    .eq("class_id", classId)
    .eq("submissions.student_id", studentId)
    .order("due_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(({ submissions, ...assignment }) => ({
    ...assignment,
    submission: submissions[0] ?? null,
  }));
}

export type StudentAssignmentDetail = {
  assignment: Tables<"assignments">;
  className: string;
  submission: Tables<"submissions"> | null;
};

export async function getStudentAssignmentDetail(
  assignmentId: string,
  studentId: string,
): Promise<StudentAssignmentDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assignments")
    .select("*, classes(id, name), submissions(*)")
    .eq("id", assignmentId)
    .eq("submissions.student_id", studentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { classes, submissions, ...assignment } = data;

  return {
    assignment,
    className: classes?.name ?? "—",
    submission: submissions[0] ?? null,
  };
}
