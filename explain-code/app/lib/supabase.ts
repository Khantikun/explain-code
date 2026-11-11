import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Database Entity Interfaces
// Matching DATABASE_DESIGN.md schema specification
// ============================================================================

export type UserRole = "student" | "teacher";

export type Profile = {
  id: string; // references auth.users(id)
  role: UserRole;
  created_at: string;
};

export type Teacher = {
  id: string; // references profiles(id)
  username: string; // citext
  display_name: string;
  password_hash?: string;
};

export type Classroom = {
  id: string;
  room_code: string;
  room_name: string;
  teacher_id: string;
  teacher_username?: string;
  pinned_topic_id: number | null;
  pinned_note: string;
  created_at: string;
};

export type Student = {
  id: string; // references profiles(id)
  nickname: string; // citext
  classroom_id: string;
  room_code?: string;
  pin_hash?: string;
  created_at: string;
};

export type Topic = {
  id: number;
  short_name: string;
  title: string;
  is_boss: boolean;
};

export type BlockCell = {
  id: string; // T1..F4
  level: 1 | 2 | 3 | 4;
  dimension: "T" | "E" | "F";
  related_topic_id: number | null;
};

export type Badge = {
  id: string;
  topic_id: number;
  name: string;
  description: string;
};

export type Attempt = {
  id: string;
  student_id: string;
  topic_id: number;
  score_percent: number;
  xp_earned: number;
  created_at: string;
};

export type AttemptCellScore = {
  attempt_id: string;
  cell_id: string;
  score: number;
};

export type AttemptAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  cell_id: string;
  chosen_option_id: string | null;
  is_correct: boolean;
  tries: number;
  xp_earned: number;
};

export type AiEvaluation = {
  attempt_id: string;
  student_explanation: string;
  score: number | null;
  passed: boolean;
  feedback: string | null;
  created_at: string;
};

export type TopicProgress = {
  student_id: string;
  topic_id: number;
  best_score_percent: number;
  completed_at: string;
};

export type StudentBadge = {
  student_id: string;
  badge_id: string;
  earned_at: string;
};

export type ActivityDay = {
  student_id: string;
  day: string; // YYYY-MM-DD
};

export type AiUsageLog = {
  id: string;
  student_id: string;
  prompt_title: string;
  prompt_text: string;
  problem_found: string;
  solution_applied: string;
  created_at: string;
};

// Views
export type StudentCellLatest = {
  student_id: string;
  cell_id: string;
  score: number;
  created_at: string;
};

export type StudentStats = {
  student_id: string;
  nickname: string;
  classroom_id: string;
  xp: number;
  topics_completed: number;
  badges_count: number;
};

export type StudentStreak = {
  student_id: string;
  streak: number;
};

export type ClassroomCellAvg = {
  classroom_id: string;
  cell_id: string;
  avg_score: number;
  students_count: number;
};

export type ClassroomQuestionStat = {
  classroom_id: string;
  question_id: string;
  cell_id: string;
  answers: number;
  wrong_percent: number;
};

// ============================================================================
// Supabase Database Schema Definition for TypeScript
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      teachers: {
        Row: Teacher;
        Insert: Omit<Teacher, "id"> & { id?: string };
        Update: Partial<Teacher>;
        Relationships: [];
      };
      classrooms: {
        Row: Classroom;
        Insert: Omit<Classroom, "id" | "room_code" | "created_at"> & {
          id?: string;
          room_code?: string;
          created_at?: string;
        };
        Update: Partial<Classroom>;
        Relationships: [];
      };
      students: {
        Row: Student;
        Insert: Omit<Student, "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Student>;
        Relationships: [];
      };
      topics: {
        Row: Topic;
        Insert: Topic;
        Update: Partial<Topic>;
        Relationships: [];
      };
      block_cells: {
        Row: BlockCell;
        Insert: BlockCell;
        Update: Partial<BlockCell>;
        Relationships: [];
      };
      badges: {
        Row: Badge;
        Insert: Badge;
        Update: Partial<Badge>;
        Relationships: [];
      };
      attempts: {
        Row: Attempt;
        Insert: Omit<Attempt, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Attempt>;
        Relationships: [];
      };
      attempt_cell_scores: {
        Row: AttemptCellScore;
        Insert: AttemptCellScore;
        Update: Partial<AttemptCellScore>;
        Relationships: [];
      };
      attempt_answers: {
        Row: AttemptAnswer;
        Insert: Omit<AttemptAnswer, "id"> & { id?: string };
        Update: Partial<AttemptAnswer>;
        Relationships: [];
      };
      ai_evaluations: {
        Row: AiEvaluation;
        Insert: Omit<AiEvaluation, "created_at"> & { created_at?: string };
        Update: Partial<AiEvaluation>;
        Relationships: [];
      };
      topic_progress: {
        Row: TopicProgress;
        Insert: Omit<TopicProgress, "completed_at"> & { completed_at?: string };
        Update: Partial<TopicProgress>;
        Relationships: [];
      };
      student_badges: {
        Row: StudentBadge;
        Insert: Omit<StudentBadge, "earned_at"> & { earned_at?: string };
        Update: Partial<StudentBadge>;
        Relationships: [];
      };
      activity_days: {
        Row: ActivityDay;
        Insert: ActivityDay;
        Update: Partial<ActivityDay>;
        Relationships: [];
      };
      ai_usage_logs: {
        Row: AiUsageLog;
        Insert: Omit<AiUsageLog, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<AiUsageLog>;
        Relationships: [];
      };
    };
    Views: {
      student_cell_latest: {
        Row: StudentCellLatest;
        Relationships: [];
      };
      student_stats: {
        Row: StudentStats;
        Relationships: [];
      };
      student_streaks: {
        Row: StudentStreak;
        Relationships: [];
      };
      classroom_cell_avg: {
        Row: ClassroomCellAvg;
        Relationships: [];
      };
      classroom_question_stats: {
        Row: ClassroomQuestionStat;
        Relationships: [];
      };
    };
    Functions: {
      gen_room_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_teacher_of: {
        Args: { room: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
    };
  };
}

// ============================================================================
// Helper Utilities & Client Initialization
// ============================================================================

/**
 * Normalizes Supabase URL by removing redundant /rest/v1 or trailing slashes
 * which can cause API calls to break if configured erroneously in .env.local
 */
export function normalizeSupabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  url = url.replace(/\/rest\/v1\/?$/, "");
  url = url.replace(/\/+$/, "");
  return url;
}

/**
 * Checks whether Supabase environment variables are properly provided
 */
export function isSupabaseConfigured(): boolean {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (url.includes("your-project-id") || anonKey.includes("your_anon_key")) return false;

  return true;
}

/**
 * Client-side/Browser Supabase client.
 * Returns null if Supabase environment variables are not configured.
 */
export const supabase: SupabaseClient<Database> | null = (() => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
  return createClient<Database>(url, anonKey);
})();

/**
 * Accessor function for browser Supabase client
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  return supabase;
}

/**
 * Server-side Supabase client using service role key (or anon key fallback).
 * Never exposes service role key to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = normalizeSupabaseUrl(rawUrl);
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return null;
  }

  // On client side, never expose service role key
  const serviceKey =
    typeof window === "undefined"
      ? (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!serviceKey || serviceKey.includes("your_service_role_key")) {
    return null;
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Static instance of server-side admin client (null when running in browser)
 */
export const supabaseAdmin: SupabaseClient<Database> | null =
  typeof window === "undefined" ? getSupabaseAdmin() : null;
