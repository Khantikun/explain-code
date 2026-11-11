import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/app/lib/supabase";
import { getServerUserSession } from "@/app/lib/supabase/server";
import { SAMPLE_DUNGEON_QUESTIONS } from "@/app/lib/dungeon/questions";

// Simple in-memory rate limiting map (IP/User -> last answer timestamp)
const rateLimitMap = new Map<string, number>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

interface AnswerPayload {
  runId: string;
  questionId: string;
  selectedIndex: number;
}

export async function POST(req: NextRequest) {
  try {
    const now = Date.now();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // Rate limiting: at most 1 submit per 300ms
    const lastRequestTime = rateLimitMap.get(ip) || 0;
    if (now - lastRequestTime < 300) {
      return NextResponse.json(
        { error: "ส่งคำตอบถี่เกินไป กรุณารอสักครู่ (Rate limit exceeded)" },
        { status: 429 }
      );
    }
    rateLimitMap.set(ip, now);

    // Clean up old rate limit records periodically
    if (rateLimitMap.size > 2000) {
      rateLimitMap.clear();
    }

    const body = (await req.json()) as AnswerPayload;
    const { runId, questionId, selectedIndex } = body;

    if (!questionId || selectedIndex === undefined) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน: ต้องระบุ questionId และ selectedIndex" },
        { status: 400 }
      );
    }

    const session = await getServerUserSession();
    const userId = session?.userId || "guest";

    // 1. Resolve Question authoritatively (Server-side ONLY)
    let correctIndex: number = -1;
    let explanation: string = "";
    let difficulty: string = "easy";
    let isBoss: boolean = false;

    // Check Supabase if configured and questionId is a valid UUID
    const admin = getSupabaseAdmin();
    const db = admin as any;
    if (isSupabaseConfigured() && db && isValidUuid(questionId)) {
      const { data: dbQuestion, error: qErr } = await db
        .from("dungeon_questions")
        .select("correct_index, explanation, difficulty, is_boss")
        .eq("id", questionId)
        .maybeSingle();

      if (dbQuestion && !qErr) {
        correctIndex = dbQuestion.correct_index;
        explanation = dbQuestion.explanation;
        difficulty = dbQuestion.difficulty;
        isBoss = dbQuestion.is_boss;
      }
    }

    // Fallback to local sample questions if not found in database or offline
    if (correctIndex === -1) {
      const sample = SAMPLE_DUNGEON_QUESTIONS.find((q) => q.id === questionId);
      if (sample) {
        correctIndex = sample.correctIndex;
        explanation = sample.explanation;
        difficulty = sample.difficulty;
      } else {
        // Default fallback question index 1
        correctIndex = 1;
        explanation = "คำตอบถูกต้องตามหลักการทำงานของ Block Model";
      }
    }

    const isCorrect = selectedIndex === correctIndex;

    // 2. Anti-Farming check: Has this question already been answered correctly in this run?
    let xpAwarded = 0;
    let coinsAwarded = 0;

    if (isCorrect) {
      // Calculate reward based on difficulty
      if (isBoss) {
        xpAwarded = 150;
        coinsAwarded = 100;
      } else if (difficulty === "hard") {
        xpAwarded = 60;
        coinsAwarded = 35;
      } else if (difficulty === "medium") {
        xpAwarded = 40;
        coinsAwarded = 20;
      } else {
        xpAwarded = 25;
        coinsAwarded = 10;
      }

      // Check if already answered in this run
      if (db && isValidUuid(runId) && isValidUuid(questionId)) {
        const { data: existingAttempts } = await db
          .from("room_attempts")
          .select("id")
          .eq("run_id", runId)
          .eq("question_id", questionId)
          .eq("is_correct", true);

        if (existingAttempts && existingAttempts.length > 0) {
          // Prevent XP farming: already answered in this run!
          xpAwarded = 0;
          coinsAwarded = 0;
        }
      }
    }

    // 3. Update Run State and Record Attempt in DB (if authenticated and run exists)
    let heartsLeft = 3;
    let isGameOver = false;

    if (
      db &&
      isValidUuid(runId) &&
      isValidUuid(questionId) &&
      session &&
      isValidUuid(session.userId)
    ) {
      // Record room attempt
      await db.from("room_attempts").insert({
        run_id: runId,
        user_id: session.userId,
        question_id: questionId,
        selected_index: selectedIndex,
        is_correct: isCorrect,
        xp_awarded: xpAwarded,
        coins_awarded: coinsAwarded,
      });

      // Fetch current run
      const { data: runData } = await db
        .from("dungeon_runs")
        .select("hearts_left, xp_earned, coins_earned, status")
        .eq("id", runId)
        .maybeSingle();

      if (runData) {
        heartsLeft = runData.hearts_left;
        if (!isCorrect) {
          heartsLeft = Math.max(0, heartsLeft - 1);
          if (heartsLeft === 0) {
            isGameOver = true;
          }
        }

        // Update run
        await db
          .from("dungeon_runs")
          .update({
            hearts_left: heartsLeft,
            xp_earned: runData.xp_earned + xpAwarded,
            coins_earned: runData.coins_earned + coinsAwarded,
            status: isGameOver ? "game_over" : runData.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", runId);

        // Update player stats
        if (isCorrect && (xpAwarded > 0 || coinsAwarded > 0)) {
          const { data: stats } = await db
            .from("player_stats")
            .select("xp, coins, total_monsters_defeated, level")
            .eq("user_id", session.userId)
            .maybeSingle();

          const currentXp = stats?.xp || 0;
          const currentCoins = stats?.coins || 0;
          const monstersDefeated = stats?.total_monsters_defeated || 0;
          const newXp = currentXp + xpAwarded;
          const newCoins = currentCoins + coinsAwarded;
          const newLevel = Math.floor(newXp / 100) + 1;

          await db.from("player_stats").upsert({
            user_id: session.userId,
            xp: newXp,
            coins: newCoins,
            level: newLevel,
            total_monsters_defeated: monstersDefeated + 1,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    // 4. Return result (NEVER returns correct_index)
    return NextResponse.json({
      success: true,
      isCorrect,
      explanation,
      xpAwarded,
      coinsAwarded,
      heartsLeft,
      isGameOver,
      isDoorUnlocked: isCorrect,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตรวจสอบคำตอบ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
