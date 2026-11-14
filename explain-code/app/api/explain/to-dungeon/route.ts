import { NextRequest, NextResponse } from "next/server";
import { generateCustomDungeonFromCode } from "@/app/lib/dungeon/to-dungeon-questions";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;

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
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
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
    const uiLang: "th" | "en" = body.uiLang === "en" ? "en" : "th";
    const explanation =
      body.explanation && typeof body.explanation === "object"
        ? body.explanation
        : null;

    if (!code.trim()) {
      return NextResponse.json(
        {
          error:
            uiLang === "en"
              ? "Please provide code before generating a dungeon."
              : "กรุณาวางโค้ดก่อนสร้างดันเจี้ยน",
        },
        { status: 400 }
      );
    }

    if (code.length > 12000) {
      return NextResponse.json(
        {
          error:
            uiLang === "en"
              ? "Code is too long (max 12,000 characters)."
              : "โค้ดยาวเกินกำหนด (จำกัดไม่เกิน 12,000 ตัวอักษร)",
        },
        { status: 400 }
      );
    }

    const dungeon = await generateCustomDungeonFromCode({
      code,
      language,
      uiLang,
      explanation,
    });

    return NextResponse.json({
      success: true,
      dungeon,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "เกิดข้อผิดพลาดในการสร้างดันเจี้ยนจากโค้ด";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
