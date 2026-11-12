import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/app/lib/supabase";
import { getServerUserSession } from "@/app/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "ต้องระบุ courseId ในคำขอ" },
        { status: 400 }
      );
    }

    const session = await getServerUserSession();
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์เข้าถึง: เฉพาะครูผู้สอนหรือแอดมินเท่านั้น" },
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();
    const db = admin as any;

    if (isSupabaseConfigured() && db && isValidUuid(courseId)) {
      // 1. Fetch questions for this course
      const { data: questions, error: qErr } = await db
        .from("dungeon_questions")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: true });

      if (qErr) {
        return NextResponse.json({ error: qErr.message }, { status: 500 });
      }

      // 2. Fetch error analytics from room_attempts
      const { data: attempts } = await db
        .from("room_attempts")
        .select("question_id, is_correct");

      const statsMap: Record<
        string,
        { totalAttempts: number; wrongCount: number; wrongPercent: number }
      > = {};

      if (Array.isArray(attempts)) {
        attempts.forEach((att: any) => {
          const qid = att.question_id;
          if (!statsMap[qid]) {
            statsMap[qid] = { totalAttempts: 0, wrongCount: 0, wrongPercent: 0 };
          }
          statsMap[qid].totalAttempts += 1;
          if (!att.is_correct) {
            statsMap[qid].wrongCount += 1;
          }
        });

        Object.keys(statsMap).forEach((qid) => {
          const st = statsMap[qid];
          st.wrongPercent =
            st.totalAttempts > 0
              ? Math.round((st.wrongCount / st.totalAttempts) * 100)
              : 0;
        });
      }

      return NextResponse.json({
        success: true,
        questions: questions || [],
        stats: statsMap,
      });
    }

    // Fallback if Supabase is offline
    return NextResponse.json({
      success: true,
      questions: [],
      stats: {},
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการดึงข้อมูลคำถาม";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerUserSession();
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์เข้าถึง: เฉพาะครูผู้สอนหรือแอดมินเท่านั้น" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      id,
      courseId,
      lessonId,
      question,
      codeSnippet,
      choices,
      correctIndex,
      explanation,
      difficulty = "easy",
      blockModelCell = "Execution-Flow",
      monsterType = "slime",
      isBoss = false,
    } = body;

    if (!courseId || !question || !Array.isArray(choices) || correctIndex === undefined) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน: ต้องระบุ courseId, question, choices (4 ตัวเลือก) และ correctIndex" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const db = admin as any;

    if (isSupabaseConfigured() && db && isValidUuid(courseId)) {
      const payload: any = {
        course_id: courseId,
        lesson_id: lessonId || null,
        question,
        code_snippet: codeSnippet || null,
        choices,
        correct_index: correctIndex,
        explanation: explanation || "คำตอบถูกต้องตามหลักการทำงานของ Block Model",
        difficulty,
        block_model_cell: blockModelCell,
        monster_type: monsterType,
        is_boss: isBoss,
        created_by: session.userId,
        updated_at: new Date().toISOString(),
      };

      if (id) {
        payload.id = id;
      }

      const { data, error } = await db
        .from("dungeon_questions")
        .upsert(payload)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, question: data });
    }

    return NextResponse.json({
      success: true,
      question: {
        id: id || `dq-${Date.now()}`,
        course_id: courseId,
        lesson_id: lessonId,
        question,
        code_snippet: codeSnippet,
        choices,
        correct_index: correctIndex,
        explanation,
        difficulty,
        monster_type: monsterType,
        is_boss: isBoss,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกคำถาม";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { error: "ต้องระบุ questionId ในคำขอ" },
        { status: 400 }
      );
    }

    const session = await getServerUserSession();
    if (!session || (session.role !== "teacher" && session.role !== "admin")) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์เข้าถึง: เฉพาะครูผู้สอนหรือแอดมินเท่านั้น" },
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();
    const db = admin as any;

    if (isSupabaseConfigured() && db && isValidUuid(questionId)) {
      const { error } = await db
        .from("dungeon_questions")
        .delete()
        .eq("id", questionId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, deleted: questionId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบคำถาม";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
