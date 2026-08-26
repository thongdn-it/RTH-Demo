import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import { byName, submissionStatus } from "@/lib/data/status";

export type Child = {
  id: string;
  name: string;
  username: string;
  email: string;
  className: string | null;
};

export type ChildSummary = Child & {
  assignmentCount: number;
  submittedCount: number;
  gradedCount: number;
  averageScore: number | null;
};

async function loadChildren(parentId: string): Promise<Child[]> {
  const supabase = await createClient();

  const { data: links, error } = await supabase
    .from("parent_students")
    .select("student:users!parent_students_student_id_fkey(id, name, username, email)")
    .eq("parent_id", parentId);

  if (error) throw error;

  const students = (links ?? [])
    .map((link) => link.student)
    .filter((student): student is NonNullable<typeof student> => student !== null)
    .sort(byName);

  if (students.length === 0) return [];

  const { data: roster, error: rosterError } = await supabase
    .from("class_students")
    .select("student_id, classes(name)")
    .in(
      "student_id",
      students.map((student) => student.id),
    );

  if (rosterError) throw rosterError;

  const classByStudent = new Map(
    (roster ?? []).map((row) => [row.student_id, row.classes?.name ?? null]),
  );

  return students.map((student) => ({
    ...student,
    className: classByStudent.get(student.id) ?? null,
  }));
}

export async function getChildren(parentId: string): Promise<ChildSummary[]> {
  const supabase = await createClient();
  const children = await loadChildren(parentId);

  if (children.length === 0) return [];

  const childIds = children.map((child) => child.id);

  const [{ data: submissions, error: submissionError }, { data: roster, error: rosterError }] =
    await Promise.all([
      supabase
        .from("submissions")
        .select("student_id, score, graded_at")
        .in("student_id", childIds),
      supabase
        .from("class_students")
        .select("student_id, class_id")
        .in("student_id", childIds),
    ]);

  if (submissionError) throw submissionError;
  if (rosterError) throw rosterError;

  const classIds = [...new Set((roster ?? []).map((row) => row.class_id))];

  const { data: assignments, error: assignmentError } = classIds.length
    ? await supabase.from("assignments").select("id, class_id").in("class_id", classIds)
    : { data: [], error: null };

  if (assignmentError) throw assignmentError;

  const classByStudent = new Map((roster ?? []).map((row) => [row.student_id, row.class_id]));

  return children.map((child) => {
    const classId = classByStudent.get(child.id);
    const mine = (submissions ?? []).filter((s) => s.student_id === child.id);
    const graded = mine.filter((s) => s.graded_at !== null && s.score !== null);
    const total = graded.reduce((sum, s) => sum + Number(s.score), 0);

    return {
      ...child,
      assignmentCount: (assignments ?? []).filter((a) => a.class_id === classId).length,
      submittedCount: mine.length,
      gradedCount: graded.length,
      averageScore: graded.length ? total / graded.length : null,
    };
  });
}

export type ChildAssignment = Tables<"assignments"> & {
  submission: Tables<"submissions"> | null;
};

export type ChildDetail = {
  child: Child;
  teacherName: string | null;
  assignments: ChildAssignment[];
  averageScore: number | null;
};

export async function getChildDetail(
  parentId: string,
  studentId: string,
): Promise<ChildDetail | null> {
  const supabase = await createClient();

  const children = await loadChildren(parentId);
  const child = children.find((candidate) => candidate.id === studentId);
  if (!child) return null;

  const { data: link, error: linkError } = await supabase
    .from("class_students")
    .select("class_id, classes(id, name, teacher:users!classes_teacher_id_fkey(name))")
    .eq("student_id", studentId)
    .maybeSingle();

  if (linkError) throw linkError;
  if (!link) {
    return { child, teacherName: null, assignments: [], averageScore: null };
  }

  const { data, error } = await supabase
    .from("assignments")
    .select("*, submissions(*)")
    .eq("class_id", link.class_id)
    .eq("submissions.student_id", studentId)
    .order("due_at", { ascending: false });

  if (error) throw error;

  const assignments = (data ?? []).map(({ submissions, ...assignment }) => ({
    ...assignment,
    submission: submissions[0] ?? null,
  }));

  const scores = assignments.flatMap((item) =>
    submissionStatus(item.submission) === "graded" && item.submission?.score != null
      ? [Number(item.submission.score)]
      : [],
  );

  return {
    child,
    teacherName: link.classes?.teacher?.name ?? null,
    assignments,
    averageScore: scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : null,
  };
}

export type NotificationItem = Tables<"notifications"> & {
  studentName: string | null;
};

export async function getNotifications(
  userId: string,
  limit = 50,
): Promise<NotificationItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*, student:users!notifications_student_id_fkey(name)")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map(({ student, ...notification }) => ({
    ...notification,
    studentName: student?.name ?? null,
  }));
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}
