import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import { byName } from "@/lib/data/status";

export type TeacherClassSummary = {
  id: string;
  name: string;
  studentCount: number;
  assignmentCount: number;
};

export type ClassMember = {
  id: string;
  name: string;
  username: string;
  email: string;
};

export type AssignmentSummary = Tables<"assignments"> & {
  className: string;
  studentCount: number;
  submittedCount: number;
  gradedCount: number;
};

export async function getTeacherClasses(
  teacherId: string,
): Promise<TeacherClassSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("classes")
    .select("id, name, class_students(student_id), assignments(id)")
    .eq("teacher_id", teacherId)
    .order("name");

  if (error) throw error;

  return (data ?? []).map((klass) => ({
    id: klass.id,
    name: klass.name,
    studentCount: klass.class_students.length,
    assignmentCount: klass.assignments.length,
  }));
}

export type TeacherClassDetail = {
  id: string;
  name: string;
  students: ClassMember[];
  assignments: AssignmentSummary[];
};

export async function getTeacherClassDetail(
  classId: string,
): Promise<TeacherClassDetail | null> {
  const supabase = await createClient();

  const { data: klass, error: classError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .maybeSingle();

  if (classError) throw classError;
  if (!klass) return null;

  const [{ data: roster, error: rosterError }, { data: assignments, error: assignmentError }] =
    await Promise.all([
      supabase
        .from("class_students")
        .select("student:users(id, name, username, email)")
        .eq("class_id", classId),
      supabase
        .from("assignments")
        .select("*, submissions(id, graded_at)")
        .eq("class_id", classId)
        .order("due_at", { ascending: false }),
    ]);

  if (rosterError) throw rosterError;
  if (assignmentError) throw assignmentError;

  const students = (roster ?? [])
    .map((row) => row.student)
    .filter((student): student is ClassMember => student !== null)
    .sort(byName);

  return {
    id: klass.id,
    name: klass.name,
    students,
    assignments: (assignments ?? []).map(({ submissions, ...assignment }) => ({
      ...assignment,
      className: klass.name,
      studentCount: students.length,
      submittedCount: submissions.length,
      gradedCount: submissions.filter((s) => s.graded_at !== null).length,
    })),
  };
}

/** Every assignment across every class this teacher is responsible for. */
export async function getTeacherAssignments(
  teacherId: string,
): Promise<AssignmentSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assignments")
    .select(
      "*, classes!inner(id, name, teacher_id, class_students(student_id)), submissions(id, graded_at)",
    )
    .eq("classes.teacher_id", teacherId)
    .order("due_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(({ classes, submissions, ...assignment }) => ({
    ...assignment,
    className: classes?.name ?? "—",
    studentCount: classes?.class_students.length ?? 0,
    submittedCount: submissions.length,
    gradedCount: submissions.filter((s) => s.graded_at !== null).length,
  }));
}

export type SubmissionRow = {
  student: ClassMember;
  submission: Tables<"submissions"> | null;
};

export type TeacherAssignmentDetail = {
  assignment: Tables<"assignments">;
  classId: string;
  className: string;
  rows: SubmissionRow[];
};

export async function getTeacherAssignmentDetail(
  assignmentId: string,
): Promise<TeacherAssignmentDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assignments")
    .select("*, classes(id, name)")
    .eq("id", assignmentId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.classes) return null;

  const { classes, ...assignment } = data;

  const [{ data: roster, error: rosterError }, { data: submissions, error: submissionError }] =
    await Promise.all([
      supabase
        .from("class_students")
        .select("student:users(id, name, username, email)")
        .eq("class_id", classes.id),
      supabase.from("submissions").select("*").eq("assignment_id", assignmentId),
    ]);

  if (rosterError) throw rosterError;
  if (submissionError) throw submissionError;

  const byStudent = new Map(
    (submissions ?? []).map((submission) => [submission.student_id, submission]),
  );

  const rows = (roster ?? [])
    .map((row) => row.student)
    .filter((student): student is ClassMember => student !== null)
    .sort(byName)
    .map((student) => ({
      student,
      submission: byStudent.get(student.id) ?? null,
    }));

  return {
    assignment,
    classId: classes.id,
    className: classes.name,
    rows,
  };
}
