import { NextRequest, NextResponse } from "next/server";
import { explainCodeSnippet } from "@/app/lib/explain-code";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/app/lib/supabase";
import { getServerUserSession } from "@/app/lib/supabase/server";

// ============================================================================
// Rate Limiting & Guest Quota Configuration
// ============================================================================
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 นาที
const RATE_LIMIT_MAX_REQUESTS = 10; // สูงสุด 10 ครั้งต่อนาทีต่อ IP
const GUEST_DAILY_LIMIT = 5; // ผู้ใช้ที่ไม่ล็อกอินใช้ฟรีได้ 5 ครั้ง/วัน
const GUEST_QUOTA_COOKIE = "explain_code_guest_quota";

interface RateBucket {
  count: number;
  resetAt: number;
}

const ipRateBuckets = new Map<string, RateBucket>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = ipRateBuckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    ipRateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    // 1. ตรวจสอบ Rate Limit พื้นฐานต่อ IP
    const clientIp = getClientIp(req);
    const rate = checkRateLimit(clientIp);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `คุณส่งคำขอเร็วเกินไป กรุณารอสักครู่ (${rate.retryAfterSec} วินาที) แล้วลองใหม่อีกครั้ง`,
          rateLimited: true,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const code = String(body.code || "");
    const language = String(body.language || "javascript");

    if (!code.trim()) {
      return NextResponse.json(
        { error: "กรุณาวางโค้ดที่ต้องการให้อธิบาย" },
        { status: 400 }
      );
    }

    if (code.length > 12000) {
      return NextResponse.json(
        { error: "โค้ดยาวเกินกำหนด (จำกัดไม่เกิน 12,000 ตัวอักษรต่อครั้ง)" },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบสถานะการล็อกอิน (จาก Cookie Session หรือ client userId)
    const serverSession = await getServerUserSession();
    const effectiveUserId = serverSession?.userId || body.userId || null;
    const isAuthenticated = Boolean(effectiveUserId);

    // 3. หากยังไม่ล็อกอิน (Guest) ให้ตรวจสอบโควตาใช้ฟรี 5 ครั้ง/วัน
    const todayStr = new Date().toISOString().split("T")[0];
    let guestUsedCount = 0;

    if (!isAuthenticated) {
      const rawQuota = req.cookies.get(GUEST_QUOTA_COOKIE)?.value;
      if (rawQuota) {
        try {
          const parsed = JSON.parse(rawQuota);
          if (parsed.date === todayStr && typeof parsed.count === "number") {
            guestUsedCount = parsed.count;
          }
        } catch {
          guestUsedCount = 0;
        }
      }

      if (guestUsedCount >= GUEST_DAILY_LIMIT) {
        return NextResponse.json(
          {
            error: `คุณใช้สิทธิ์อธิบายโค้ดฟรีครบ ${GUEST_DAILY_LIMIT} ครั้งสำหรับวันนี้แล้ว กรุณาเข้าสู่ระบบเพื่อใช้งานต่อแบบไม่จำกัดและบันทึกประวัติของคุณ`,
            quotaExceeded: true,
            guestLimit: GUEST_DAILY_LIMIT,
            guestUsed: guestUsedCount,
          },
          { status: 403 }
        );
      }
      guestUsedCount += 1;
    }

    // 4. เรียกฟังก์ชัน Service เดียวจาก app/lib/explain-code.ts
    const result = await explainCodeSnippet({ code, language });

    // 5. หากผู้ใช้ล็อกอินอยู่ ให้บันทึกประวัติลงตาราง code_explanations ใน Supabase
    let savedHistoryItem: any = null;
    if (isAuthenticated && effectiveUserId) {
      savedHistoryItem = {
        id: crypto.randomUUID(),
        user_id: effectiveUserId,
        language: result.language,
        code_snippet: code,
        summary: result.summary,
        line_by_line: result.lineByLine,
        key_concepts: result.keyConcepts,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured() && UUID_REGEX.test(effectiveUserId)) {
        try {
          const supabase = getSupabaseAdmin();
          if (supabase) {
            const { data: inserted, error: dbErr } = await supabase
              .from("code_explanations")
              .insert({
                user_id: effectiveUserId,
                language: result.language,
                code_snippet: code,
                summary: result.summary,
                line_by_line: result.lineByLine,
                key_concepts: result.keyConcepts,
              })
              .select("*")
              .single();

            if (!dbErr && inserted) {
              savedHistoryItem = inserted;
            }
          }
        } catch (e) {
          console.warn("Save code_explanations to Supabase notice:", e);
        }
      }
    }

    const response = NextResponse.json({
      success: true,
      explanation: result,
      savedHistoryItem,
      isAuthenticated,
      guestQuota: !isAuthenticated
        ? {
            limit: GUEST_DAILY_LIMIT,
            used: guestUsedCount,
            remaining: Math.max(0, GUEST_DAILY_LIMIT - guestUsedCount),
          }
        : null,
    });

    if (!isAuthenticated) {
      response.cookies.set(
        GUEST_QUOTA_COOKIE,
        JSON.stringify({ date: todayStr, count: guestUsedCount }),
        {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24,
        }
      );
    }

    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอธิบายโค้ด";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
