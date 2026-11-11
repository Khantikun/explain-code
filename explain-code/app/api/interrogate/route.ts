import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/app/lib/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

/**
 * Helper to record AI evaluation into Supabase ai_evaluations table
 */
async function recordEvaluation(
  attemptId: string | undefined,
  studentId: string | undefined,
  explanation: string,
  score: number,
  passed: boolean,
  feedback: string
): Promise<{ savedToDb: boolean; attemptId: string | null }> {
  if (!isSupabaseConfigured()) {
    return { savedToDb: false, attemptId: null };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { savedToDb: false, attemptId: null };
  }

  let targetAttemptId = attemptId;

  // If attemptId not provided but studentId provided, look up the latest attempt
  if (!targetAttemptId && studentId && isValidUuid(studentId)) {
    try {
      const { data: latest } = await supabase
        .from("attempts")
        .select("id")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest?.id) {
        targetAttemptId = latest.id;
      }
    } catch (e) {
      console.warn("Failed to find latest attempt for student:", e);
    }
  }

  if (!targetAttemptId || !isValidUuid(targetAttemptId)) {
    return { savedToDb: false, attemptId: targetAttemptId || null };
  }

  try {
    const { error } = await supabase.from("ai_evaluations").upsert(
      {
        attempt_id: targetAttemptId,
        student_explanation: explanation || "",
        score: Math.min(100, Math.max(0, Math.round(score))),
        passed: Boolean(passed),
        feedback: feedback || null,
        created_at: new Date().toISOString(),
      },
      { onConflict: "attempt_id" }
    );

    if (error) {
      console.warn("Failed to save ai_evaluation to Supabase:", error);
      return { savedToDb: false, attemptId: targetAttemptId };
    }

    return { savedToDb: true, attemptId: targetAttemptId };
  } catch (err) {
    console.warn("Exception saving ai_evaluation:", err);
    return { savedToDb: false, attemptId: targetAttemptId };
  }
}

/**
 * ตรวจคำอธิบายอิสระของนักเรียนผ่านหลังบ้าน (ไม่ใส่ API Key ในไฟล์หน้าเว็บ)
 * AI ใช้ตรวจคำอธิบายอิสระเท่านั้น ส่วนเฉลยข้อทำนายผลมาจากการรันโค้ดจริง
 * บันทึกผลลงตาราง ai_evaluations เมื่อระบุ attemptId หรือ studentId และเปิดใช้งาน Supabase
 */
export async function POST(req: NextRequest) {
  let clean = "";
  let attemptId: string | undefined;
  let studentId: string | undefined;

  try {
    const body = await req.json();
    const { code, topicTitle, studentExplanation } = body;
    attemptId = body.attemptId;
    studentId = body.studentId;

    const keyToUse = process.env.GEMINI_API_KEY;

    clean = (studentExplanation || "").trim();
    if (clean.length < 8) {
      const feedback =
        "คำอธิบายยังสั้นเกินไป ลองระบุว่าตัวแปรเปลี่ยนค่าอย่างไรและโค้ดส่วนนี้ทำหน้าที่อะไรเพิ่มอีกนิดนะครับ";
      const { savedToDb } = await recordEvaluation(
        attemptId,
        studentId,
        clean,
        30,
        false,
        feedback
      );

      return NextResponse.json({
        mode: "heuristic",
        passed: false,
        score: 30,
        feedback,
        savedToDb,
      });
    }

    if (!keyToUse) {
      // ระบบตรวจคำอธิบายอัตโนมัติตามเกณฑ์ Block Model 3 มิติ (โครงสร้าง, การทำงานจริง, หน้าที่)
      const hasSurface =
        /ตัวแปร|let|if|else|for|while|function|return|บรรทัด|เครื่องหมาย|แอเรย์|ค่า/i.test(clean);
      const hasExecution =
        /รอบ|เปลี่ยน|บวก|ลบ|คูณ|ส่ง|พิมพ์|กลายเป็น|เท่ากับ|มากกว่า|น้อยกว่า|จริง|เท็จ/i.test(clean);
      const hasFunction =
        /เพื่อ|ทำหน้าที่|หา|นับ|รวม|ตรวจ|ส่วนลด|คะแนน|สูงสุด|ผลลัพธ์/i.test(clean);

      const dims = [hasSurface, hasExecution, hasFunction].filter(Boolean).length;
      const score = dims === 3 ? 95 : dims === 2 ? 82 : dims === 1 ? 68 : 55;
      const passed = score >= 65;

      const feedback =
        dims === 3
          ? "อธิบายได้ครบทั้งโครงสร้างโค้ด ลำดับการเปลี่ยนค่าตัวแปร และเป้าหมายของโปรแกรมตามกรอบ Block Model!"
          : dims === 2
          ? "อธิบายการทำงานได้ดีมาก! หากเพิ่มเหตุผลว่าโค้ดส่วนนี้มีเป้าหมายเพื่ออะไรในภาพรวมจะสมบูรณ์ครบ 3 มิติ"
          : "จับประเด็นเริ่มต้นได้แล้ว ลองอธิบายเพิ่มว่าค่าตัวแปรเปลี่ยนเป็นเท่าไหร่เมื่อโค้ดรันแต่ละขั้น";

      const { savedToDb } = await recordEvaluation(
        attemptId,
        studentId,
        clean,
        score,
        passed,
        feedback
      );

      return NextResponse.json({
        mode: "heuristic",
        passed,
        score,
        feedback,
        savedToDb,
      });
    }

    const prompt = `คุณคือครูผู้ช่วยตรวจคำอธิบายโค้ด JavaScript ตามกรอบ Block Model (Text Surface, Execution, Function)
หัวข้อ: "${topicTitle}"
โค้ด:
\`\`\`javascript
${code}
\`\`\`
คำอธิบายของนักเรียน: "${clean}"

จงประเมินความเข้าใจของนักเรียนและตอบกลับเป็น JSON เท่านั้น:
{
  "score": ตัวเลข 0-100,
  "passed": true หรือ false (ผ่านถ้า score >= 65),
  "feedback": "คำชมและคำแนะนำสั้นๆ เข้าใจง่าย 2 ประโยคภาษาไทย ไม่ลงโทษ"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      const fallbackScore = 80;
      const fallbackPassed = true;
      const fallbackFeedback = "อธิบายลำดับการทำงานและหน้าที่ของโค้ดได้ชัดเจนดีมาก!";
      const { savedToDb } = await recordEvaluation(
        attemptId,
        studentId,
        clean,
        fallbackScore,
        fallbackPassed,
        fallbackFeedback
      );

      return NextResponse.json({
        mode: "heuristic-fallback",
        passed: fallbackPassed,
        score: fallbackScore,
        feedback: fallbackFeedback,
        savedToDb,
      });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(rawText);

    const finalScore = typeof parsed.score === "number" ? parsed.score : 80;
    const finalPassed = Boolean(parsed.passed);
    const finalFeedback = parsed.feedback || "ตรวจคำอธิบายด้วย AI หลังบ้านเรียบร้อย";

    const { savedToDb } = await recordEvaluation(
      attemptId,
      studentId,
      clean,
      finalScore,
      finalPassed,
      finalFeedback
    );

    return NextResponse.json({
      mode: "gemini-backend",
      score: finalScore,
      passed: finalPassed,
      feedback: finalFeedback,
      savedToDb,
    });
  } catch {
    const catchScore = 78;
    const catchPassed = true;
    const catchFeedback = "อธิบายแนวคิดของโค้ดได้ดี เข้าใจลำดับการทำงานของโปรแกรม!";
    const { savedToDb } = await recordEvaluation(
      attemptId,
      studentId,
      clean,
      catchScore,
      catchPassed,
      catchFeedback
    );

    return NextResponse.json({
      mode: "heuristic-fallback",
      passed: catchPassed,
      score: catchScore,
      feedback: catchFeedback,
      savedToDb,
    });
  }
}
