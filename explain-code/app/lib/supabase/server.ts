import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  Database,
  normalizeSupabaseUrl,
  TeacherApprovalStatus,
  UserRole,
} from "../supabase";

export const APP_SESSION_COOKIE = "explain_code_session";

export interface AppUserSession {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  teacherStatus?: TeacherApprovalStatus;
  roomCode?: string;
}

export async function createSupabaseServerClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component where cookies cannot be modified directly
        }
      },
    },
  });
}

/**
 * อ่านข้อมูล Session ปัจจุบันจากทั้ง Cookie ของระบบเดิม และ Supabase Auth SSR
 */
export async function getServerUserSession(): Promise<AppUserSession | null> {
  try {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(APP_SESSION_COOKIE)?.value;
    if (rawCookie) {
      const parsed = JSON.parse(
        Buffer.from(rawCookie, "base64").toString("utf-8")
      ) as AppUserSession;
      if (parsed && parsed.userId && parsed.role) {
        return parsed;
      }
    }

    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        const role: UserRole =
          meta.role === "teacher" || meta.role === "admin"
            ? meta.role
            : "student";
        const displayName =
          meta.display_name ||
          meta.nickname ||
          meta.username ||
          user.email?.split("@")[0] ||
          "ผู้ใช้งาน";
        return {
          userId: user.id,
          username: meta.username || meta.nickname || displayName,
          displayName,
          role,
          teacherStatus:
            meta.teacher_approved === "true" || role !== "teacher"
              ? "approved"
              : "pending",
        };
      }
    }
  } catch {
    // ignore parse or network errors
  }
  return null;
}
