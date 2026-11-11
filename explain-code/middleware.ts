import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeSupabaseUrl } from "./app/lib/supabase";

const APP_SESSION_COOKIE = "explain_code_session";

// เส้นทางที่บังคับต้องล็อกอินก่อนเข้าใช้งาน
const PROTECTED_PREFIXES = ["/my-learning", "/my-history", "/teacher"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

  let supabaseUser = null;

  // 1. Refresh Supabase Auth session via @supabase/ssr
  if (url && anonKey && !url.includes("your-project-id")) {
    try {
      const supabase = createServerClient(url, anonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      supabaseUser = user;
    } catch {
      // Fallback to custom app session cookie if Supabase Auth network is unreachable
    }
  }

  // 2. ตรวจสอบ App Session Cookie (รองรับทั้งระบบล็อกอินเดิมและ Supabase Auth)
  let appSession: {
    userId?: string;
    role?: string;
    teacherStatus?: string;
  } | null = null;

  const rawCookie = request.cookies.get(APP_SESSION_COOKIE)?.value;
  if (rawCookie) {
    try {
      appSession = JSON.parse(
        Buffer.from(rawCookie, "base64").toString("utf-8")
      );
    } catch {
      appSession = null;
    }
  }

  const isAuthenticated = Boolean(supabaseUser || appSession?.userId);
  const userRole =
    appSession?.role ||
    (supabaseUser?.user_metadata?.role as string) ||
    "student";

  const { pathname, search } = request.nextUrl;

  // 3. ตรวจเส้นทางที่ต้องล็อกอิน (Protected Routes)
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    if (pathname.startsWith("/teacher")) {
      loginUrl.searchParams.set("role", "teacher");
    }
    return NextResponse.redirect(loginUrl);
  }

  // 4. ตรวจสิทธิ์เฉพาะหน้า /teacher (ต้องเป็น teacher หรือ admin เท่านั้น)
  if (
    (pathname === "/teacher" || pathname.startsWith("/teacher/")) &&
    isAuthenticated &&
    userRole !== "teacher" &&
    userRole !== "admin"
  ) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.searchParams.set("notice", "teacher_only");
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
