import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/app/lib/supabase";
import { getServerUserSession } from "@/app/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/history
 * ดึงประวัติการอธิบายโค้ดของผู้ใช้ที่ล็อกอินอยู่
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerUserSession();
    const { searchParams } = new URL(req.url);
    const userId = session?.userId || searchParams.get("userId") || "";

    if (!userId) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบเพื่อดูประวัติการอธิบายโค้ด" },
        { status: 401 }
      );
    }

    if (isSupabaseConfigured() && UUID_REGEX.test(userId)) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const { data, error } = await supabase
            .from("code_explanations")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);

          if (!error && data) {
            return NextResponse.json({
              success: true,
              source: "supabase",
              items: data,
            });
          }
        }
      } catch (e) {
        console.warn("GET /api/history supabase notice:", e);
      }
    }

    return NextResponse.json({
      success: true,
      source: "local",
      items: [],
    });
  } catch (err) {
    console.error("GET /api/history error:", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดประวัติได้" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/history?id=...
 * ลบรายการประวัติการอธิบายโค้ดของผู้ใช้
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerUserSession();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    const userId = session?.userId || searchParams.get("userId") || "";

    if (!userId || !id) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน หรือยังไม่ได้เข้าสู่ระบบ" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured() && UUID_REGEX.test(userId) && UUID_REGEX.test(id)) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          await supabase
            .from("code_explanations")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);
        }
      } catch (e) {
        console.warn("DELETE /api/history supabase notice:", e);
      }
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    console.error("DELETE /api/history error:", err);
    return NextResponse.json(
      { error: "ไม่สามารถลบประวัติได้" },
      { status: 500 }
    );
  }
}
