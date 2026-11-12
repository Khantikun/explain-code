import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/app/lib/supabase";
import { getServerUserSession } from "@/app/lib/supabase/server";
import { hashString } from "@/app/lib/dungeon/seed";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { courseId, totalFloors = 1 } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน: ต้องระบุ courseId" },
        { status: 400 }
      );
    }

    const session = await getServerUserSession();
    const seed = hashString(courseId);

    // If Supabase is connected and user is authenticated and courseId is a valid UUID
    const admin = getSupabaseAdmin();
    const db = admin as any;
    if (isSupabaseConfigured() && db && session && isValidUuid(courseId) && isValidUuid(session.userId)) {
      // Create new dungeon run record
      const { data: run, error: runErr } = await db
        .from("dungeon_runs")
        .insert({
          user_id: session.userId,
          course_id: courseId,
          current_floor: 0,
          total_floors: totalFloors,
          hearts_left: 3,
          status: "in_progress",
          run_seed: seed,
        })
        .select()
        .single();

      if (!runErr && run) {
        return NextResponse.json({
          success: true,
          runId: run.id,
          currentFloor: run.current_floor,
          totalFloors: run.total_floors,
          heartsLeft: run.hearts_left,
          seed,
        });
      }
    }

    // Guest / Offline fallback run
    const guestRunId = `run-${seed}-${Date.now()}`;
    return NextResponse.json({
      success: true,
      runId: guestRunId,
      currentFloor: 0,
      totalFloors,
      heartsLeft: 3,
      seed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเริ่มต้นดันเจี้ยน";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
