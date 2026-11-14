import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/app/lib/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export interface AttemptAnswerPayload {
  questionId: string;
  cellId: string;
  chosenOptionId?: string | null;
  isCorrect: boolean;
  tries: number;
  xpEarned: number;
}

export interface CreateAttemptPayload {
  studentId: string;
  topicId: number;
  scorePercent: number;
  earnedXp: number;
  updatedCellScores?: Partial<Record<string, number>>;
  badgeId?: string;
  extraBadgeIds?: string[];
  answers?: AttemptAnswerPayload[];
  aiEvaluation?: {
    studentExplanation: string;
    score: number;
    passed: boolean;
    feedback: string;
  };
}

/**
 * POST /api/attempts
 * Records student practice completion, updates cell scores, topic progress, badges, and streaks.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateAttemptPayload;
    const {
      studentId,
      topicId,
      scorePercent,
      earnedXp,
      updatedCellScores,
      badgeId,
      extraBadgeIds,
      answers,
    } = body;

    if (!studentId || topicId === undefined || scorePercent === undefined) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน: ต้องระบุ studentId, topicId และ scorePercent" },
        { status: 400 }
      );
    }

    // Fallback mode if Supabase is not configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        source: "local",
        attemptId: `local-${Date.now()}`,
      });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        source: "local",
        attemptId: `local-${Date.now()}`,
      });
    }

    // If studentId is a mock / local ID (not a valid UUID), treat as local fallback
    if (!isValidUuid(studentId)) {
      return NextResponse.json({
        success: true,
        source: "local",
        attemptId: `local-${Date.now()}`,
        warning: "studentId is not a UUID, saved in local session",
      });
    }

    const safeScore = Math.min(100, Math.max(0, Math.round(Number(scorePercent) || 0)));
    const safeXp = Math.max(0, Math.round(Number(earnedXp) || 0));
    const safeTopicId = Number(topicId);

    // 1. Insert into attempts table
    const { data: attemptRow, error: attemptError } = await supabase
      .from("attempts")
      .insert({
        student_id: studentId,
        topic_id: safeTopicId,
        score_percent: safeScore,
        xp_earned: safeXp,
      })
      .select("id")
      .single();

    if (attemptError || !attemptRow) {
      console.warn("Failed to insert attempt into Supabase:", attemptError);
      return NextResponse.json({
        success: true,
        source: "local",
        attemptId: `local-${Date.now()}`,
        warning: attemptError?.message || "Failed to insert attempt",
      });
    }

    const attemptId = attemptRow.id;

    // 2. Insert batch into attempt_cell_scores
    if (updatedCellScores && typeof updatedCellScores === "object") {
      const cellEntries = Object.entries(updatedCellScores).filter(
        ([cellId, score]) =>
          typeof cellId === "string" &&
          cellId.trim().length > 0 &&
          typeof score === "number" &&
          !isNaN(score)
      );

      if (cellEntries.length > 0) {
        const cellRows = cellEntries.map(([cellId, score]) => ({
          attempt_id: attemptId,
          cell_id: cellId.trim().toUpperCase(),
          score: Math.min(100, Math.max(0, Math.round(score as number))),
        }));

        const { error: cellError } = await supabase
          .from("attempt_cell_scores")
          .insert(cellRows);

        if (cellError) {
          console.warn("Failed to insert attempt_cell_scores:", cellError);
        }
      }
    }

    // 3. Insert batch into attempt_answers if answers are provided
    if (Array.isArray(answers) && answers.length > 0) {
      const answerRows = answers
        .filter((ans) => ans && ans.questionId && ans.cellId)
        .map((ans) => ({
          attempt_id: attemptId,
          question_id: String(ans.questionId),
          cell_id: String(ans.cellId).trim().toUpperCase(),
          chosen_option_id: ans.chosenOptionId ? String(ans.chosenOptionId) : null,
          is_correct: Boolean(ans.isCorrect),
          tries: Math.max(1, Math.round(Number(ans.tries) || 1)),
          xp_earned: Math.max(0, Math.round(Number(ans.xpEarned) || 0)),
        }));

      if (answerRows.length > 0) {
        const { error: answersError } = await supabase
          .from("attempt_answers")
          .insert(answerRows);

        if (answersError) {
          console.warn("Failed to insert attempt_answers:", answersError);
        }
      }
    }

    // 3.5. Insert AI evaluation if provided
    if (body.aiEvaluation && typeof body.aiEvaluation === "object") {
      try {
        const { error: aiError } = await supabase.from("ai_evaluations").upsert(
          {
            attempt_id: attemptId,
            student_explanation: body.aiEvaluation.studentExplanation || "",
            score: Math.min(100, Math.max(0, Math.round(Number(body.aiEvaluation.score) || 0))),
            passed: Boolean(body.aiEvaluation.passed),
            feedback: body.aiEvaluation.feedback || null,
            created_at: new Date().toISOString(),
          },
          { onConflict: "attempt_id" }
        );
        if (aiError) {
          console.warn("Failed to insert ai_evaluations:", aiError);
        }
      } catch (e) {
        console.warn("ai_evaluations insert exception:", e);
      }
    }

    // 4. Upsert into topic_progress table (keep best_score_percent)
    try {
      const { data: existingProgress } = await supabase
        .from("topic_progress")
        .select("best_score_percent")
        .eq("student_id", studentId)
        .eq("topic_id", safeTopicId)
        .maybeSingle();

      const bestScore = existingProgress
        ? Math.max(existingProgress.best_score_percent, safeScore)
        : safeScore;

      const { error: progError } = await supabase
        .from("topic_progress")
        .upsert(
          {
            student_id: studentId,
            topic_id: safeTopicId,
            best_score_percent: bestScore,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "student_id,topic_id" }
        );

      if (progError) {
        console.warn("Failed to upsert topic_progress:", progError);
      }
    } catch (e) {
      console.warn("topic_progress upsert exception:", e);
    }

    // 5. If badgeId or extraBadgeIds, insert/upsert into student_badges
    const allBadgeIds = Array.from(
      new Set(
        [
          badgeId,
          ...(Array.isArray(extraBadgeIds) ? extraBadgeIds : []),
        ]
          .map((b) => (typeof b === "string" ? b.trim() : ""))
          .filter(Boolean)
      )
    );

    if (allBadgeIds.length > 0) {
      try {
        const nowIso = new Date().toISOString();
        const badgeRows = allBadgeIds.map((bId) => ({
          student_id: studentId,
          badge_id: bId,
          earned_at: nowIso,
        }));
        const { error: badgeError } = await supabase
          .from("student_badges")
          .upsert(badgeRows, {
            onConflict: "student_id,badge_id",
            ignoreDuplicates: true,
          });

        if (badgeError) {
          console.warn("Failed to insert student_badges:", badgeError);
        }
      } catch (e) {
        console.warn("student_badges upsert exception:", e);
      }
    }

    // 6. Insert/upsert into activity_days (day = today in YYYY-MM-DD)
    const today = new Date().toISOString().slice(0, 10);
    try {
      const { error: actError } = await supabase
        .from("activity_days")
        .upsert(
          {
            student_id: studentId,
            day: today,
          },
          { onConflict: "student_id,day", ignoreDuplicates: true }
        );

      if (actError) {
        console.warn("Failed to insert activity_day:", actError);
      }
    } catch (e) {
      console.warn("activity_days upsert exception:", e);
    }

    // 7. Query latest stats for student (student_stats, student_streaks, student_cell_latest, topic_progress, student_badges)
    let stats: {
      xp: number;
      streak: number;
      topicsCompleted: number;
      completedTopics?: number[];
      badgesCount: number;
      badges?: string[];
      cellScores: Partial<Record<string, number>>;
    } = {
      xp: safeXp,
      streak: 1,
      topicsCompleted: 1,
      completedTopics: [safeTopicId],
      badgesCount: allBadgeIds.length,
      badges: allBadgeIds,
      cellScores: updatedCellScores || {},
    };

    try {
      const [statsRes, streakRes, cellsRes, progRes, badgeRes] = await Promise.all([
        supabase
          .from("student_stats")
          .select("*")
          .eq("student_id", studentId)
          .maybeSingle(),
        supabase
          .from("student_streaks")
          .select("*")
          .eq("student_id", studentId)
          .maybeSingle(),
        supabase
          .from("student_cell_latest")
          .select("cell_id, score")
          .eq("student_id", studentId),
        supabase
          .from("topic_progress")
          .select("topic_id")
          .eq("student_id", studentId),
        supabase
          .from("student_badges")
          .select("badge_id")
          .eq("student_id", studentId),
      ]);

      const cellScoresMap: Record<string, number> = {};
      if (updatedCellScores) {
        for (const [k, v] of Object.entries(updatedCellScores)) {
          if (typeof v === "number") {
            cellScoresMap[k] = v;
          }
        }
      }
      if (cellsRes.data) {
        for (const c of cellsRes.data) {
          if (c.cell_id) {
            cellScoresMap[c.cell_id] = c.score;
          }
        }
      }

      const completedTopicsList =
        progRes.data && progRes.data.length > 0
          ? progRes.data.map((p) => Number(p.topic_id))
          : [safeTopicId];

      const badgesList =
        badgeRes.data && badgeRes.data.length > 0
          ? badgeRes.data.map((b) => String(b.badge_id))
          : (badgeId ? [badgeId] : []);

      stats = {
        xp: statsRes.data?.xp ?? safeXp,
        streak: streakRes.data?.streak ?? 1,
        topicsCompleted: statsRes.data?.topics_completed ?? completedTopicsList.length,
        completedTopics: completedTopicsList,
        badgesCount: statsRes.data?.badges_count ?? badgesList.length,
        badges: badgesList,
        cellScores: cellScoresMap,
      };
    } catch (e) {
      console.warn("Failed to query student stats views:", e);
    }

    return NextResponse.json({
      success: true,
      attemptId,
      stats,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/attempts error:", message);
    return NextResponse.json(
      {
        success: true,
        source: "local",
        attemptId: `local-${Date.now()}`,
        warning: message,
      },
      { status: 200 }
    );
  }
}

/**
 * GET /api/attempts
 * Query parameters: studentId or topicId
 * Returns attempts list ordered by created_at desc
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const topicId = searchParams.get("topicId");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        source: "local",
        attempts: [],
      });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        source: "local",
        attempts: [],
      });
    }

    if (studentId && !isValidUuid(studentId)) {
      return NextResponse.json({
        success: true,
        source: "local",
        attempts: [],
      });
    }

    // Try detailed query with relation embeds
    let query = supabase
      .from("attempts")
      .select(`
        id,
        student_id,
        topic_id,
        score_percent,
        xp_earned,
        created_at,
        attempt_cell_scores (cell_id, score),
        attempt_answers (question_id, cell_id, chosen_option_id, is_correct, tries, xp_earned),
        ai_evaluations (score, passed, feedback, created_at)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (studentId) {
      query = query.eq("student_id", studentId);
    }
    if (topicId) {
      query = query.eq("topic_id", Number(topicId));
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Detailed attempts query failed, trying basic select:", error);

      let basicQuery = supabase
        .from("attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (studentId) basicQuery = basicQuery.eq("student_id", studentId);
      if (topicId) basicQuery = basicQuery.eq("topic_id", Number(topicId));

      const basicRes = await basicQuery;
      if (basicRes.error) {
        return NextResponse.json({
          success: true,
          source: "local",
          attempts: [],
          warning: basicRes.error.message,
        });
      }

      return NextResponse.json({
        success: true,
        attempts: basicRes.data || [],
      });
    }

    const attemptsList = data || [];

    // If studentId provided, also query latest student stats
    let stats: Record<string, any> | undefined;
    if (studentId && isValidUuid(studentId)) {
      try {
        const [statsRes, streakRes, cellsRes, progRes, badgeRes] = await Promise.all([
          supabase.from("student_stats").select("*").eq("student_id", studentId).maybeSingle(),
          supabase.from("student_streaks").select("*").eq("student_id", studentId).maybeSingle(),
          supabase.from("student_cell_latest").select("cell_id, score").eq("student_id", studentId),
          supabase.from("topic_progress").select("topic_id").eq("student_id", studentId),
          supabase.from("student_badges").select("badge_id").eq("student_id", studentId),
        ]);

        const cellScoresMap: Record<string, number> = {};
        if (cellsRes.data) {
          for (const c of cellsRes.data) {
            if (c.cell_id) cellScoresMap[c.cell_id] = c.score;
          }
        }

        stats = {
          xp: statsRes.data?.xp ?? 0,
          streak: streakRes.data?.streak ?? 1,
          topicsCompleted: statsRes.data?.topics_completed ?? (progRes.data?.length || 0),
          completedTopics: progRes.data ? progRes.data.map((p) => Number(p.topic_id)) : [],
          badgesCount: statsRes.data?.badges_count ?? (badgeRes.data?.length || 0),
          badges: badgeRes.data ? badgeRes.data.map((b) => String(b.badge_id)) : [],
          cellScores: cellScoresMap,
        };
      } catch (e) {
        console.warn("Failed to query student stats in GET /api/attempts:", e);
      }
    }

    return NextResponse.json({
      success: true,
      attempts: attemptsList,
      stats,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/attempts error:", message);
    return NextResponse.json(
      { success: true, source: "local", attempts: [], warning: message },
      { status: 200 }
    );
  }
}
