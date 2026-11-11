import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/app/lib/supabase";
import { BlockCellId } from "@/app/lib/curriculum";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

const DEFAULT_CELL_SCORES: Record<BlockCellId, number> = {
  T1: 50,
  E1: 50,
  F1: 50,
  T2: 50,
  E2: 50,
  F2: 50,
  T3: 50,
  E3: 50,
  F3: 50,
  T4: 50,
  E4: 50,
  F4: 50,
};

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface CreateClassroomBody {
  roomName: string;
  teacherId?: string;
  teacherUsername?: string;
  pinnedTopicId?: number;
  pinnedNote?: string;
}

export interface UpdateClassroomBody {
  roomCode: string;
  pinnedTopicId?: number | null;
  pinnedNote?: string;
}

/**
 * GET /api/teacher/classrooms
 * Fetches all classrooms, joined student records, Block Model cell averages,
 * and common question stats for the teacher.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const teacherId = searchParams.get("teacherId");
    const teacherUsername = searchParams.get("teacherUsername");
    const roomCode = searchParams.get("roomCode");

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        classrooms: [],
        students: [],
        cellAverages: [],
        questionStats: [],
        source: "local",
      });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({
        classrooms: [],
        students: [],
        cellAverages: [],
        questionStats: [],
        source: "local",
      });
    }

    // Resolve teacher record
    let resolvedTeacherId: string | null = null;
    let resolvedTeacherUsername: string = teacherUsername || "";

    if (teacherId && isValidUuid(teacherId)) {
      resolvedTeacherId = teacherId;
      const { data: t } = await admin
        .from("teachers")
        .select("id, username, display_name")
        .eq("id", teacherId)
        .maybeSingle();
      if (t) {
        resolvedTeacherUsername = t.username;
      }
    } else if (teacherUsername && teacherUsername.trim()) {
      const { data: t } = await admin
        .from("teachers")
        .select("id, username, display_name")
        .eq("username", teacherUsername.trim())
        .maybeSingle();
      if (t) {
        resolvedTeacherId = t.id;
        resolvedTeacherUsername = t.username;
      }
    }

    // Query classrooms
    let roomsQuery = admin.from("classrooms").select("*");
    if (resolvedTeacherId) {
      roomsQuery = roomsQuery.eq("teacher_id", resolvedTeacherId);
    }
    if (roomCode) {
      roomsQuery = roomsQuery.eq("room_code", roomCode.trim().toUpperCase());
    }

    const { data: dbRooms, error: roomsError } = await roomsQuery.order(
      "created_at",
      { ascending: false }
    );

    if (roomsError) {
      console.warn("Error fetching classrooms:", roomsError);
      return NextResponse.json({
        classrooms: [],
        students: [],
        cellAverages: [],
        questionStats: [],
        source: "supabase",
        error: roomsError.message,
      });
    }

    if (!dbRooms || dbRooms.length === 0) {
      return NextResponse.json({
        classrooms: [],
        students: [],
        cellAverages: [],
        questionStats: [],
        source: "supabase",
      });
    }

    const classroomIds = dbRooms.map((r) => r.id);
    const roomById = new Map(dbRooms.map((r) => [r.id, r]));

    // Fetch related student and analytical data
    const [studentsRes, statsRes, cellAvgRes, questionStatsRes] =
      await Promise.all([
        admin.from("students").select("*").in("classroom_id", classroomIds),
        admin.from("student_stats").select("*").in("classroom_id", classroomIds),
        admin
          .from("classroom_cell_avg")
          .select("*")
          .in("classroom_id", classroomIds),
        admin
          .from("classroom_question_stats")
          .select("*")
          .in("classroom_id", classroomIds),
      ]);

    const dbStudents = studentsRes.data || [];
    const dbStats = statsRes.data || [];
    const dbCellAvg = cellAvgRes.data || [];
    const dbQuestionStats = questionStatsRes.data || [];

    const statsMap = new Map(dbStats.map((s) => [s.student_id, s]));

    // Fetch student learning progress, badges, streaks, and latest cell scores
    let studentLatestCells: {
      student_id: string;
      cell_id: string;
      score: number;
    }[] = [];
    let studentProgressList: { student_id: string; topic_id: number }[] = [];
    let studentBadgesList: { student_id: string; badge_id: string }[] = [];
    let studentStreaksList: { student_id: string; streak: number }[] = [];

    if (dbStudents.length > 0) {
      const studentIds = dbStudents.map((s) => s.id);
      const [latestCells, progress, badges, streaks] = await Promise.all([
        admin
          .from("student_cell_latest")
          .select("student_id, cell_id, score")
          .in("student_id", studentIds),
        admin
          .from("topic_progress")
          .select("student_id, topic_id")
          .in("student_id", studentIds),
        admin
          .from("student_badges")
          .select("student_id, badge_id")
          .in("student_id", studentIds),
        admin
          .from("student_streaks")
          .select("student_id, streak")
          .in("student_id", studentIds),
      ]);

      studentLatestCells = latestCells.data || [];
      studentProgressList = progress.data || [];
      studentBadgesList = badges.data || [];
      studentStreaksList = streaks.data || [];
    }

    // Map student helpers
    const cellScoresByStudent = new Map<string, Record<BlockCellId, number>>();
    for (const row of studentLatestCells) {
      if (!cellScoresByStudent.has(row.student_id)) {
        cellScoresByStudent.set(row.student_id, { ...DEFAULT_CELL_SCORES });
      }
      const scores = cellScoresByStudent.get(row.student_id)!;
      if (row.cell_id in scores) {
        scores[row.cell_id as BlockCellId] = row.score;
      }
    }

    const progressByStudent = new Map<string, number[]>();
    for (const row of studentProgressList) {
      const list = progressByStudent.get(row.student_id) || [];
      if (!list.includes(row.topic_id)) {
        list.push(row.topic_id);
      }
      progressByStudent.set(row.student_id, list);
    }

    const badgesByStudent = new Map<string, string[]>();
    for (const row of studentBadgesList) {
      const list = badgesByStudent.get(row.student_id) || [];
      if (!list.includes(row.badge_id)) {
        list.push(row.badge_id);
      }
      badgesByStudent.set(row.student_id, list);
    }

    const streaksByStudent = new Map<string, number>();
    for (const row of studentStreaksList) {
      streaksByStudent.set(row.student_id, row.streak);
    }

    // Assemble students array conforming cleanly to StudentRecord interface
    const students = dbStudents.map((s) => {
      const room = roomById.get(s.classroom_id);
      const stat = statsMap.get(s.id);
      const cellScores =
        cellScoresByStudent.get(s.id) || { ...DEFAULT_CELL_SCORES };
      const completedTopics = (progressByStudent.get(s.id) || []).sort(
        (a, b) => a - b
      );
      const badges = badgesByStudent.get(s.id) || [];
      const streak = streaksByStudent.get(s.id) ?? 1;

      return {
        id: s.id,
        nickname: s.nickname,
        roomCode: room?.room_code || "",
        classroomId: s.classroom_id,
        classroom_id: s.classroom_id,
        xp: stat?.xp ?? 0,
        streak,
        completedTopics,
        cellScores,
        badges,
        history: [],
        pinHash: "",
        role: "student" as const,
      };
    });

    // Assemble classrooms array conforming cleanly to ClassroomRecord interface
    const classrooms = dbRooms.map((r) => {
      const roomStudentCount = students.filter(
        (s) => s.classroomId === r.id
      ).length;
      return {
        id: r.id,
        roomCode: r.room_code,
        room_code: r.room_code,
        roomName: r.room_name,
        room_name: r.room_name,
        teacherId: r.teacher_id,
        teacher_id: r.teacher_id,
        teacherUsername: resolvedTeacherUsername,
        pinnedReviewTopicId: r.pinned_topic_id,
        pinned_topic_id: r.pinned_topic_id,
        pinnedReviewNote: r.pinned_note || "",
        pinned_note: r.pinned_note || "",
        createdAt: r.created_at,
        created_at: r.created_at,
        studentCount: roomStudentCount,
      };
    });

    // Assemble cellAverages
    const cellAverages = dbCellAvg.map((row) => ({
      classroom_id: row.classroom_id,
      classroomId: row.classroom_id,
      roomCode: roomById.get(row.classroom_id)?.room_code || "",
      cell_id: row.cell_id,
      cellId: row.cell_id as BlockCellId,
      avg_score: Number(row.avg_score),
      avgScore: Number(row.avg_score),
      students_count: Number(row.students_count),
      studentsCount: Number(row.students_count),
    }));

    // Assemble questionStats
    const questionStats = dbQuestionStats.map((row) => ({
      classroom_id: row.classroom_id,
      classroomId: row.classroom_id,
      roomCode: roomById.get(row.classroom_id)?.room_code || "",
      question_id: row.question_id,
      questionId: row.question_id,
      cell_id: row.cell_id,
      cellId: row.cell_id as BlockCellId,
      answers: Number(row.answers),
      wrong_percent: Number(row.wrong_percent),
      wrongPercent: Number(row.wrong_percent),
    }));

    return NextResponse.json({
      classrooms,
      students,
      cellAverages,
      questionStats,
      source: "supabase",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/teacher/classrooms error:", message);
    return NextResponse.json({
      classrooms: [],
      students: [],
      cellAverages: [],
      questionStats: [],
      source: "local",
      error: message,
    });
  }
}

/**
 * POST /api/teacher/classrooms
 * Creates a new classroom with auto-generated 6-char room code.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateClassroomBody;
    const { roomName, teacherId, teacherUsername, pinnedTopicId, pinnedNote } =
      body;

    if (!roomName || !roomName.trim()) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อห้องเรียน (roomName)" },
        { status: 400 }
      );
    }

    const trimmedName = roomName.trim();
    const cleanNote =
      pinnedNote ?? "เริ่มต้นฝึกอ่านโค้ดเรื่องที่ 1 ตัวแปรและการคำนวณ";
    const cleanTopicId = pinnedTopicId ?? 1;

    // Supabase Insertion
    if (isSupabaseConfigured()) {
      const admin = getSupabaseAdmin();
      if (admin) {
        let resolvedTeacherId: string | null = null;
        let resolvedUsername = teacherUsername || "ครูตัวอย่าง";

        if (teacherId && isValidUuid(teacherId)) {
          resolvedTeacherId = teacherId;
        } else if (teacherUsername && teacherUsername.trim()) {
          const { data: t } = await admin
            .from("teachers")
            .select("id, username")
            .eq("username", teacherUsername.trim())
            .maybeSingle();
          if (t) {
            resolvedTeacherId = t.id;
            resolvedUsername = t.username;
          }
        }

        // If teacher is still unresolved, try finding any existing teacher row in database
        if (!resolvedTeacherId) {
          const { data: anyTeacher } = await admin
            .from("teachers")
            .select("id, username")
            .limit(1)
            .maybeSingle();
          if (anyTeacher) {
            resolvedTeacherId = anyTeacher.id;
            resolvedUsername = anyTeacher.username;
          }
        }

        if (resolvedTeacherId) {
          const roomCode = generateRoomCode();
          const { data: inserted, error: insertError } = await admin
            .from("classrooms")
            .insert({
              room_name: trimmedName,
              room_code: roomCode,
              teacher_id: resolvedTeacherId,
              pinned_topic_id: cleanTopicId,
              pinned_note: cleanNote,
            })
            .select()
            .single();

          if (insertError || !inserted) {
            console.warn(
              "Failed to insert classroom to Supabase:",
              insertError
            );
          } else {
            return NextResponse.json({
              success: true,
              source: "supabase",
              classroom: {
                id: inserted.id,
                roomCode: inserted.room_code,
                room_code: inserted.room_code,
                roomName: inserted.room_name,
                room_name: inserted.room_name,
                teacherId: inserted.teacher_id,
                teacher_id: inserted.teacher_id,
                teacherUsername: resolvedUsername,
                pinnedReviewTopicId: inserted.pinned_topic_id,
                pinned_topic_id: inserted.pinned_topic_id,
                pinnedReviewNote: inserted.pinned_note || "",
                pinned_note: inserted.pinned_note || "",
                createdAt: inserted.created_at,
                created_at: inserted.created_at,
              },
            });
          }
        }
      }
    }

    // Fallback mode for offline / local session
    const fallbackCode = generateRoomCode();
    const fallbackRoom = {
      id: "local-" + Date.now(),
      roomCode: fallbackCode,
      room_code: fallbackCode,
      roomName: trimmedName,
      room_name: trimmedName,
      teacherUsername: teacherUsername || "ครูตัวอย่าง",
      pinnedReviewTopicId: cleanTopicId,
      pinned_topic_id: cleanTopicId,
      pinnedReviewNote: cleanNote,
      pinned_note: cleanNote,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      source: "local",
      classroom: fallbackRoom,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/teacher/classrooms error:", message);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้างห้องเรียน", details: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/teacher/classrooms
 * Updates pinned_topic_id and pinned_note for a classroom by roomCode.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as UpdateClassroomBody;
    const { roomCode, pinnedTopicId, pinnedNote } = body;

    if (!roomCode || !roomCode.trim()) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสห้องเรียน (roomCode)" },
        { status: 400 }
      );
    }

    const cleanRoomCode = roomCode.trim().toUpperCase();

    if (isSupabaseConfigured()) {
      const admin = getSupabaseAdmin();
      if (admin) {
        const updatePayload: {
          pinned_topic_id?: number | null;
          pinned_note?: string;
        } = {};

        if (pinnedTopicId !== undefined) {
          updatePayload.pinned_topic_id = pinnedTopicId;
        }
        if (pinnedNote !== undefined) {
          updatePayload.pinned_note = pinnedNote.trim();
        }

        const { error: updateError } = await admin
          .from("classrooms")
          .update(updatePayload)
          .eq("room_code", cleanRoomCode);

        if (updateError) {
          console.warn("Failed to update classroom in Supabase:", updateError);
          return NextResponse.json(
            { error: updateError.message, source: "supabase" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          source: "supabase",
          roomCode: cleanRoomCode,
          pinnedTopicId,
          pinnedNote,
        });
      }
    }

    // Fallback mode for offline / local session
    return NextResponse.json({
      success: true,
      source: "local",
      roomCode: cleanRoomCode,
      pinnedTopicId,
      pinnedNote,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("PATCH /api/teacher/classrooms error:", message);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดตห้องเรียน", details: message },
      { status: 500 }
    );
  }
}
