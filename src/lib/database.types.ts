/**
 * Shape of the `public` schema, matching what the generator produces for
 * supabase/migrations. Keep it in step with the migrations, or regenerate:
 *
 *   npx supabase gen types typescript --local > src/lib/database.types.ts
 *
 * The `Relationships` entries are not decoration: supabase-js reads them to
 * type embedded selects such as `select("*, submissions(*)")`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "student" | "teacher" | "parent";
export type SubmissionType = "file" | "link";
export type NotificationType =
  | "assignment_created"
  | "grade_created"
  | "grade_updated";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          name: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          name: string;
          role: UserRole;
          created_at?: string;
        };
        Update: {
          username?: string;
          email?: string;
          name?: string;
          role?: UserRole;
        };
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          name: string;
          teacher_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          teacher_id: string;
          created_at?: string;
        };
        Update: { name?: string; teacher_id?: string };
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      class_students: {
        Row: { class_id: string; student_id: string };
        Insert: { class_id: string; student_id: string };
        Update: { class_id?: string; student_id?: string };
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_students_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      parent_students: {
        Row: { parent_id: string; student_id: string };
        Insert: { parent_id: string; student_id: string };
        Update: { parent_id?: string; student_id?: string };
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_students_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          class_id: string;
          title: string;
          description: string | null;
          due_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          title: string;
          description?: string | null;
          due_at: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          due_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          submission_type: SubmissionType;
          storage_path: string | null;
          external_url: string | null;
          submitted_at: string;
          updated_at: string;
          score: number | null;
          feedback: string | null;
          graded_at: string | null;
          graded_by: string | null;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          student_id: string;
          submission_type: SubmissionType;
          storage_path?: string | null;
          external_url?: string | null;
        };
        Update: {
          submission_type?: SubmissionType;
          storage_path?: string | null;
          external_url?: string | null;
          score?: number | null;
          feedback?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_graded_by_fkey";
            columns: ["graded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      grading_history: {
        Row: {
          id: string;
          submission_id: string;
          assignment_id: string;
          student_id: string;
          teacher_id: string;
          previous_score: number | null;
          previous_feedback: string | null;
          score: number;
          feedback: string | null;
          graded_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          assignment_id: string;
          student_id: string;
          teacher_id: string;
          previous_score?: number | null;
          previous_feedback?: string | null;
          score: number;
          feedback?: string | null;
          graded_at?: string;
        };
        Update: {
          previous_score?: number | null;
          previous_feedback?: string | null;
          score?: number;
          feedback?: string | null;
          graded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grading_history_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grading_history_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grading_history_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grading_history_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_user_id: string;
          student_id: string;
          assignment_id: string | null;
          submission_id: string | null;
          type: NotificationType;
          title: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_user_id: string;
          student_id: string;
          assignment_id?: string | null;
          submission_id?: string | null;
          type: NotificationType;
          title: string;
          message: string;
          is_read?: boolean;
        };
        Update: { is_read?: boolean };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_user_id_fkey";
            columns: ["recipient_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      user_role: UserRole;
      submission_type: SubmissionType;
      notification_type: NotificationType;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
