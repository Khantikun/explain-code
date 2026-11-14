import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  TeacherApprovalStatus,
  UserRole,
} from "@/app/lib/supabase";
import { APP_SESSION_COOKIE, AppUserSession } from "@/app/lib/supabase/server";
import {
  BlockCellId,
  INITIAL_CLASSROOMS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  StudentRecord,
  TOPICS,
  validatePdpaIdentifier,
} from "@/app/lib/curriculum";

function sha256(input: string): string {
  return createHash("sha256").update(input.trim()).digest("hex");
}

const SERVER_PEPPER = process.env.SERVER_PEPPER || "_explain_code_pepper_2026";
const TEACHER_INVITE_CODE = process.env.TEACHER_INVITE_CODE || "TEACHER2026";

function withSessionCookie(
  res: NextResponse,
  session: AppUserSession | null
): NextResponse {
  if (!session) {
    res.cookies.delete(APP_SESSION_COOKIE);
    return res;
  }
  const encoded = Buffer.from(JSON.stringify(session), "utf-8").toString(
    "base64"
  );
  res.cookies.set(APP_SESSION_COOKIE, encoded, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 days
  });
  return res;
}

function getPepperedPin(pin: string): string {
  return `${pin.trim()}${SERVER_PEPPER}`;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getTopicTitle(topicId: number): string {
  const topic = TOPICS.find((t) => t.id === topicId);
  return topic?.title || `เรื่องที่ ${topicId}`;
}

function formatAttemptTimestamp(isoStr?: string): string {
  if (!isoStr) return "เมื่อสักครู่";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "เมื่อสักครู่";
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

function getDefaultCellScores(): Record<BlockCellId, number> {
  return {
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
}

/**
 * ประกอบข้อมูล StudentRecord จากตารางและ views ใน Supabase ให้ครบถ้วน
 */
async function buildStudentRecord(
  supabase: any,
  studentRow: any,
  fallbackPinHash: string = ""
): Promise<StudentRecord> {
  // ดึงรหัสห้องเรียน
  let resolvedRoomCode = (studentRow as any).room_code || "";
  if (studentRow.classroom_id) {
    try {
      const { data: classRow } = await supabase
        .from("classrooms")
        .select("room_code")
        .eq("id", studentRow.classroom_id)
        .maybeSingle();
      if (classRow?.room_code) {
        resolvedRoomCode = classRow.room_code;
      }
    } catch (e) {
      console.warn("Classroom lookup notice:", e);
    }
  }

  // ด่านที่ผ่านแล้วจาก topic_progress
  let completedTopics: number[] = (studentRow as any).completed_topics || [];
  try {
    const { data: progRows } = await supabase
      .from("topic_progress")
      .select("topic_id")
      .eq("student_id", studentRow.id);
    if (progRows && progRows.length > 0) {
      completedTopics = progRows.map((p: any) => p.topic_id);
    }
  } catch (e) {
    console.warn("topic_progress lookup notice:", e);
  }

  // ตราที่ได้รับจาก student_badges
  let badges: string[] = (studentRow as any).badges || [];
  try {
    const { data: badgeRows } = await supabase
      .from("student_badges")
      .select("badge_id")
      .eq("student_id", studentRow.id);
    if (badgeRows && badgeRows.length > 0) {
      badges = badgeRows.map((b: any) => b.badge_id);
    }
  } catch (e) {
    console.warn("student_badges lookup notice:", e);
  }

  // คะแนนล่าสุดรายช่องจาก student_cell_latest view
  const cellScores: Record<BlockCellId, number> = {
    ...getDefaultCellScores(),
    ...((studentRow as any).cell_scores || {}),
  };
  try {
    const { data: cellRows } = await supabase
      .from("student_cell_latest")
      .select("cell_id, score")
      .eq("student_id", studentRow.id);
    if (cellRows && cellRows.length > 0) {
      for (const cr of cellRows) {
        if (cr.cell_id && cr.cell_id in cellScores) {
          cellScores[cr.cell_id as BlockCellId] = cr.score;
        }
      }
    }
  } catch (e) {
    console.warn("student_cell_latest lookup notice:", e);
  }

  // ค่า XP รวมจาก student_stats view
  let xp = (studentRow as any).xp ?? 0;
  try {
    const { data: statRow } = await supabase
      .from("student_stats")
      .select("xp")
      .eq("student_id", studentRow.id)
      .maybeSingle();
    if (statRow?.xp !== undefined && statRow.xp !== null) {
      xp = statRow.xp;
    }
  } catch (e) {
    console.warn("student_stats lookup notice:", e);
  }

  // ค่า streak จาก student_streaks view
  let streak = (studentRow as any).streak ?? 1;
  try {
    const { data: streakRow } = await supabase
      .from("student_streaks")
      .select("streak")
      .eq("student_id", studentRow.id)
      .maybeSingle();
    if (streakRow?.streak !== undefined && streakRow.streak !== null) {
      streak = streakRow.streak;
    }
  } catch (e) {
    console.warn("student_streaks lookup notice:", e);
  }

  // ประวัติ attempts ย้อนหลัง 10 รายการ
  let history: StudentRecord["history"] = (studentRow as any).history || [];
  try {
    const { data: attemptRows } = await supabase
      .from("attempts")
      .select("topic_id, score_percent, xp_earned, created_at")
      .eq("student_id", studentRow.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (attemptRows && attemptRows.length > 0) {
      history = attemptRows.map((a: any) => ({
        topicId: a.topic_id,
        topicTitle: getTopicTitle(a.topic_id),
        scorePercent: a.score_percent,
        xpEarned: a.xp_earned,
        timestamp: formatAttemptTimestamp(a.created_at),
      }));
    }
  } catch (e) {
    console.warn("attempts history lookup notice:", e);
  }

  return {
    id: studentRow.id,
    nickname: studentRow.nickname,
    pinHash: studentRow.pin_hash || fallbackPinHash,
    role: "student",
    roomCode: resolvedRoomCode,
    xp,
    streak,
    completedTopics,
    cellScores,
    badges,
    history,
  };
}

/**
 * ระบบยืนยันตัวตนตาม Role (นักเรียน student / ครู teacher)
 * - แฮช PIN 4 หลักและรหัสผ่านครูด้วย SHA-256 / Pepper ที่ฝั่งหลังบ้านตามหลัก PDPA 2562
 * - เชื่อมต่อ Supabase PostgreSQL อัตโนมัติ (ตาราง profiles, teachers, students, classrooms, views)
 * - รองรับ graceful fallback หากไม่ได้ตั้งค่าหรือเกิด network issue
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      nickname,
      pin,
      roomCode,
      username,
      password,
      displayName,
      inviteCode,
    } = body;

    // ออกจากระบบและล้าง Session Cookie
    if (action === "logout") {
      const res = NextResponse.json({ authenticated: false, loggedOut: true });
      return withSessionCookie(res, null);
    }

    // อนุมัติบัญชีครูด้วยรหัสเชิญครู (Invite Code) หรือโดย Admin
    if (action === "approve-teacher") {
      const cleanCode = String(inviteCode || "").trim();
      const targetTeacherId = String(body.teacherId || body.userId || "").trim();
      const targetUsername = String(body.username || "ครูผู้สอน").trim();
      const targetDisplayName = String(body.displayName || targetUsername).trim();

      if (cleanCode !== TEACHER_INVITE_CODE) {
        return NextResponse.json(
          { error: "รหัสเชิญครูไม่ถูกต้อง (รหัสเริ่มต้นสำหรับทดสอบคือ TEACHER2026)" },
          { status: 403 }
        );
      }

      if (isSupabaseConfigured() && targetTeacherId && isValidUuid(targetTeacherId)) {
        try {
          const supabase = getSupabaseAdmin();
          if (supabase) {
            await supabase
              .from("profiles")
              .update({ teacher_status: "approved" })
              .eq("id", targetTeacherId);
          }
        } catch (e) {
          console.warn("Update teacher_status notice:", e);
        }
      }

      const res = NextResponse.json({
        approved: true,
        teacherStatus: "approved",
      });
      return withSessionCookie(res, {
        userId: targetTeacherId || `tch-${targetUsername}`,
        username: targetUsername,
        displayName: targetDisplayName,
        role: "teacher",
        teacherStatus: "approved",
      });
    }

    // ==================== 0. เข้าสู่ระบบแบบรวมศูนย์ (Unified Login: ตรวจ Role อัตโนมัติ) ====================
    if (action === "unified-login") {
      const identifier = String(body.identifier || username || nickname || "").trim();
      const secret = String(body.secret || password || pin || "").trim();

      if (!identifier || !secret) {
        return NextResponse.json(
          { error: "กรุณากรอกชื่อผู้ใช้/ชื่อเล่น และรหัสผ่าน/PIN" },
          { status: 400 }
        );
      }

      const secretHash = sha256(secret);
      const pepperedSecretHash = sha256(getPepperedPin(secret));

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          if (supabase) {
            // 1) ตรวจสอบในตาราง teachers ก่อน
            const { data: teacherRows } = await supabase
              .from("teachers")
              .select("*")
              .ilike("username", identifier);

            if (teacherRows && teacherRows.length > 0) {
              const tRow = teacherRows[0];
              if (tRow.password_hash && tRow.password_hash !== secretHash) {
                return NextResponse.json(
                  { error: "รหัสผ่านไม่ถูกต้อง" },
                  { status: 401 }
                );
              }

              let teacherStatus: TeacherApprovalStatus = "approved";
              try {
                const { data: prof } = await supabase
                  .from("profiles")
                  .select("teacher_status")
                  .eq("id", tRow.id)
                  .maybeSingle();
                if (prof?.teacher_status) {
                  teacherStatus = prof.teacher_status as TeacherApprovalStatus;
                }
              } catch {
                // ignore
              }

              const tDisplayName = tRow.display_name || tRow.username;
              const res = NextResponse.json({
                authenticated: true,
                source: "supabase",
                role: "teacher",
                teacherStatus,
                teacher: {
                  id: tRow.id,
                  username: tRow.username,
                  displayName: tDisplayName,
                  role: "teacher",
                  teacherStatus,
                },
              });
              return withSessionCookie(res, {
                userId: tRow.id,
                username: tRow.username,
                displayName: tDisplayName,
                role: "teacher",
                teacherStatus,
              });
            }

            // 2) ตรวจสอบในตาราง students
            const { data: studentRows } = await supabase
              .from("students")
              .select("*")
              .ilike("nickname", identifier);

            if (studentRows && studentRows.length > 0) {
              const studentRow = studentRows[0];
              const validPin =
                !studentRow.pin_hash ||
                studentRow.pin_hash === secretHash ||
                studentRow.pin_hash === pepperedSecretHash;

              if (!validPin) {
                return NextResponse.json(
                  { error: "รหัสผ่าน / PIN ไม่ถูกต้อง" },
                  { status: 401 }
                );
              }

              const studentRecord = await buildStudentRecord(
                supabase,
                studentRow,
                secretHash
              );

              const res = NextResponse.json({
                authenticated: true,
                source: "supabase",
                role: "student",
                student: studentRecord,
              });
              return withSessionCookie(res, {
                userId: studentRecord.id,
                username: studentRecord.nickname,
                displayName: studentRecord.nickname,
                role: "student",
                roomCode: studentRecord.roomCode,
              });
            }
          }
        } catch (err) {
          console.warn("Supabase unified-login check notice:", err);
        }
      }

      // 3) Fallback ตรวจสอบกับข้อมูลบัญชีในเครื่อง (Local Registered Accounts) และบัญชีเริ่มต้น (Demo Accounts)
      const clientTeachers = Array.isArray(body.localTeachers) ? body.localTeachers : [];
      const allTeachers = [...clientTeachers, ...INITIAL_TEACHERS];
      const matchedTeacher = allTeachers.find(
        (t: any) =>
          typeof t?.username === "string" &&
          t.username.toLowerCase() === identifier.toLowerCase()
      );
      if (matchedTeacher) {
        if (
          matchedTeacher.passwordHash &&
          matchedTeacher.passwordHash !== secretHash &&
          secret !== "12345678"
        ) {
          return NextResponse.json(
            { error: "รหัสผ่านไม่ถูกต้อง (บัญชีครูตัวอย่างใช้รหัสผ่าน: 12345678)" },
            { status: 401 }
          );
        }
        const res = NextResponse.json({
          authenticated: true,
          source: "local",
          role: "teacher",
          teacherStatus: "approved",
          teacher: {
            id: matchedTeacher.id || `tch-${matchedTeacher.username}`,
            username: matchedTeacher.username,
            displayName: matchedTeacher.displayName || matchedTeacher.username,
            role: "teacher",
            teacherStatus: "approved",
          },
        });
        return withSessionCookie(res, {
          userId: matchedTeacher.id || `tch-${matchedTeacher.username}`,
          username: matchedTeacher.username,
          displayName: matchedTeacher.displayName || matchedTeacher.username,
          role: "teacher",
          teacherStatus: "approved",
        });
      }

      const clientStudents = Array.isArray(body.localStudents) ? body.localStudents : [];
      const allStudents = [...clientStudents, ...INITIAL_STUDENTS];
      const matchedStudent = allStudents.find(
        (s: any) =>
          typeof s?.nickname === "string" &&
          s.nickname.toLowerCase() === identifier.toLowerCase()
      );
      if (matchedStudent) {
        if (
          matchedStudent.pinHash &&
          matchedStudent.pinHash !== secretHash &&
          matchedStudent.pinHash !== pepperedSecretHash &&
          secret !== "1234"
        ) {
          return NextResponse.json(
            { error: "รหัส PIN ไม่ถูกต้อง (บัญชีนักเรียนตัวอย่างใช้ PIN: 1234)" },
            { status: 401 }
          );
        }
        const res = NextResponse.json({
          authenticated: true,
          source: "local",
          role: "student",
          student: matchedStudent,
        });
        return withSessionCookie(res, {
          userId: matchedStudent.id || `stu-${matchedStudent.nickname}`,
          username: matchedStudent.nickname,
          displayName: matchedStudent.nickname,
          role: "student",
          roomCode: matchedStudent.roomCode || "VIBE26",
        });
      }

      return NextResponse.json(
        {
          error:
            "ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาตรวจสอบชื่อผู้ใช้ หรือสลับไปที่แท็บ 'สมัครสมาชิกใหม่'",
        },
        { status: 404 }
      );
    }

    // กรณีเรียกแฮช PIN พื้นฐาน
    if (!action && pin) {
      return NextResponse.json({
        pinHash: sha256(String(pin)),
        pdpaCompliant: true,
      });
    }

    // ==================== 1. เข้าสู่ระบบฝั่งนักเรียน (Role: student) ====================
    if (action === "login-student") {
      if (!nickname || !pin || String(pin).trim().length !== 4) {
        return NextResponse.json(
          { error: "กรุณากรอกชื่อเล่นสมมติและรหัส PIN 4 หลัก" },
          { status: 400 }
        );
      }

      const nick = String(nickname).trim();
      const pinStr = String(pin).trim();

      if (/@/.test(nick)) {
        return NextResponse.json(
          { error: "ตามหลัก PDPA 2562 กรุณาใช้ชื่อเล่นสมมติเท่านั้น ห้ามใช้อีเมล" },
          { status: 400 }
        );
      }

      const pinHash = sha256(pinStr);
      const pepperedPinHash = sha256(getPepperedPin(pinStr));

      // ตรวจสอบจาก Supabase หากเชื่อมต่อแล้ว
      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          if (supabase) {
            // ค้นหานักเรียนด้วย nickname (case-insensitive)
            const { data: studentRows, error: stuError } = await supabase
              .from("students")
              .select("*")
              .ilike("nickname", nick);

            if (stuError) {
              console.warn("Supabase query error on students:", stuError);
            } else if (studentRows && studentRows.length > 0) {
              const studentRow = studentRows[0];

              // ตรวจสอบความถูกต้องของ PIN
              const validPin =
                !studentRow.pin_hash ||
                studentRow.pin_hash === pinHash ||
                studentRow.pin_hash === pepperedPinHash;

              if (!validPin) {
                return NextResponse.json(
                  { error: "รหัส PIN 4 หลักไม่ถูกต้องสำหรับชื่อเล่นนี้" },
                  { status: 401 }
                );
              }

              const studentRecord = await buildStudentRecord(supabase, studentRow, pinHash);

              const res = NextResponse.json({
                authenticated: true,
                source: "supabase",
                role: "student",
                pinHash,
                student: studentRecord,
              });
              return withSessionCookie(res, {
                userId: studentRecord.id,
                username: studentRecord.nickname,
                displayName: studentRecord.nickname,
                role: "student",
                roomCode: studentRecord.roomCode,
              });
            }
          }
        } catch (err) {
          console.warn("Supabase student login fallback due to error:", err);
        }
      }

      const fallbackRes = NextResponse.json({
        authenticated: true,
        source: "local",
        role: "student",
        pinHash,
      });
      return withSessionCookie(fallbackRes, {
        userId: `stu-${nick}`,
        username: nick,
        displayName: nick,
        role: "student",
      });
    }

    // ==================== 1.5. ซิงค์ข้อมูลนักเรียนล่าสุดจาก Supabase (Role: student) ====================
    if (action === "sync-student" || action === "get-student") {
      const studentId = body.studentId || body.userId;
      const nick = body.nickname ? String(body.nickname).trim() : "";

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          if (supabase) {
            let query = supabase.from("students").select("*");
            if (studentId && isValidUuid(studentId)) {
              query = query.eq("id", studentId);
            } else if (nick) {
              query = query.ilike("nickname", nick);
            } else {
              return NextResponse.json(
                { error: "ต้องระบุ studentId หรือ nickname" },
                { status: 400 }
              );
            }

            const { data: studentRows, error: stuError } = await query;
            if (!stuError && studentRows && studentRows.length > 0) {
              const studentRecord = await buildStudentRecord(supabase, studentRows[0]);
              return NextResponse.json({
                authenticated: true,
                source: "supabase",
                role: "student",
                student: studentRecord,
              });
            }
          }
        } catch (e) {
          console.warn("sync-student error:", e);
        }
      }

      return NextResponse.json({
        authenticated: true,
        source: "local",
        role: "student",
      });
    }

    // ==================== 2. สมัครเข้าเล่นใหม่ฝั่งนักเรียน (Role: student) ====================
    if (action === "register-student") {
      if (!nickname || !pin || String(pin).trim().length !== 4 || !roomCode) {
        return NextResponse.json(
          { error: "กรุณากรอกชื่อเล่นสมมติ, PIN 4 หลัก และรหัสห้องจากครูให้ครบถ้วน" },
          { status: 400 }
        );
      }

      const nick = String(nickname).trim();
      const pinStr = String(pin).trim();
      const cleanRoom = String(roomCode).trim().toUpperCase();

      const pdpaCheck = validatePdpaIdentifier(nick);
      if (!pdpaCheck.valid) {
        return NextResponse.json(
          { error: pdpaCheck.reason || "กรุณาใช้ชื่อเล่นสมมติตามหลัก PDPA พ.ศ. 2562" },
          { status: 400 }
        );
      }

      const pinHash = sha256(pinStr);
      const knownDefaultRoom = INITIAL_CLASSROOMS.some(
        (c) => c.roomCode.toUpperCase() === cleanRoom
      );

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          if (supabase) {
            // 1. ตรวจสอบรหัสห้องในตาราง classrooms
            const { data: classRows, error: classErr } = await supabase
              .from("classrooms")
              .select("*")
              .ilike("room_code", cleanRoom);

            if (classErr) {
              console.warn("Classroom lookup error:", classErr);
            }

            if ((!classRows || classRows.length === 0) && !knownDefaultRoom) {
              return NextResponse.json(
                { error: `ไม่พบห้องเรียนรหัส "${cleanRoom}" ในระบบ กรุณาตรวจสอบรหัสห้องกับครูผู้สอน (หรือใช้ VIBE26 / ABC123 / JS2026)` },
                { status: 404 }
              );
            }

            const classroom = classRows && classRows.length > 0 ? classRows[0] : null;

            // 2. ตรวจสอบว่าชื่อเล่นมีอยู่แล้วในตาราง students หรือไม่
            const { data: existingStudents, error: existErr } = await supabase
              .from("students")
              .select("id")
              .ilike("nickname", nick);

            if (existErr) {
              console.warn("Existing student check error:", existErr);
            }

            if (existingStudents && existingStudents.length > 0) {
              return NextResponse.json(
                { error: `ชื่อเล่น "${nick}" มีในระบบแล้ว กรุณาเปลี่ยนชื่อเล่นสมมติ หรือสลับไปแท็บ "เข้าสู่ระบบ"` },
                { status: 409 }
              );
            }

            // 3. สร้าง Supabase Auth user หรือกำหนด UUID ให้นักเรียน
            let studentId: string | null = null;
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const studentEmail = `stu_${Date.now()}_${randomSuffix}@students.invalid`;
            const pepperedPin = getPepperedPin(pinStr);

            try {
              const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
                email: studentEmail,
                password: pepperedPin,
                email_confirm: true,
                user_metadata: { role: "student", nickname: nick },
              });
              if (authData?.user?.id) {
                studentId = authData.user.id;
              } else if (authErr) {
                console.warn("Supabase Auth admin createUser notice:", authErr.message);
              }
            } catch (e) {
              console.warn("Auth user creation not available/skipped:", e);
            }

            if (!studentId) {
              studentId = crypto.randomUUID();
            }

            // 4. บันทึกลง profiles (role: 'student')
            try {
              await supabase.from("profiles").insert({
                id: studentId,
                role: "student",
              });
            } catch (e) {
              console.warn("profiles insert notice:", e);
            }

            // 5. บันทึกลงตาราง students
            let stuInserted = false;
            if (classroom?.id) {
              try {
                const { error: insertErr1 } = await supabase.from("students").insert({
                  id: studentId,
                  nickname: nick,
                  classroom_id: classroom.id,
                  pin_hash: pinHash,
                });
                if (!insertErr1) {
                  stuInserted = true;
                } else {
                  console.warn("students insert with pin_hash notice:", insertErr1.message);
                  const { error: insertErr2 } = await supabase.from("students").insert({
                    id: studentId,
                    nickname: nick,
                    classroom_id: classroom.id,
                  });
                  if (!insertErr2) {
                    stuInserted = true;
                  }
                }
              } catch (e) {
                console.warn("students insert attempt notice:", e);
              }
            }

            if (!stuInserted) {
              // รองรับ legacy flat schema ถ้าตารางมีโครงสร้างเดิม
              try {
                await (supabase as any).from("students").insert({
                  id: studentId,
                  nickname: nick,
                  pin_hash: pinHash,
                  role: "student",
                  room_code: cleanRoom,
                  xp: 0,
                  streak: 1,
                  completed_topics: [],
                  cell_scores: getDefaultCellScores(),
                  badges: [],
                  history: [],
                });
              } catch (e) {
                console.warn("Legacy students insert notice:", e);
              }
            }

            // 6. กำหนด activity_days สำหรับวันนี้
            try {
              const todayStr = new Date().toISOString().split("T")[0];
              await supabase.from("activity_days").insert({
                student_id: studentId,
                day: todayStr,
              });
            } catch (e) {
              console.warn("activity_days initialization notice:", e);
            }

            const newStudent: StudentRecord = {
              id: studentId,
              nickname: nick,
              pinHash,
              role: "student",
              roomCode: cleanRoom,
              xp: 0,
              streak: 1,
              completedTopics: [],
              cellScores: getDefaultCellScores(),
              badges: [],
              history: [],
            };

            const res = NextResponse.json({
              authenticated: true,
              source: "supabase",
              role: "student",
              pinHash,
              student: newStudent,
            });
            return withSessionCookie(res, {
              userId: newStudent.id,
              username: newStudent.nickname,
              displayName: newStudent.nickname,
              role: "student",
              roomCode: newStudent.roomCode,
            });
          }
        } catch (err) {
          console.warn("Supabase student register fallback due to error:", err);
        }
      }

      const fallbackStudent: StudentRecord = {
        id: `stu-${nick}`,
        nickname: nick,
        pinHash,
        role: "student",
        roomCode: cleanRoom,
        xp: 0,
        streak: 1,
        completedTopics: [],
        cellScores: getDefaultCellScores(),
        badges: [],
        history: [],
      };

      const fallbackRegRes = NextResponse.json({
        authenticated: true,
        source: "local",
        role: "student",
        pinHash,
        student: fallbackStudent,
      });
      return withSessionCookie(fallbackRegRes, {
        userId: fallbackStudent.id,
        username: fallbackStudent.nickname,
        displayName: fallbackStudent.nickname,
        role: "student",
        roomCode: cleanRoom,
      });
    }

    // ==================== 3. เข้าสู่ระบบฝั่งครูผู้สอน (Role: teacher) ====================
    if (action === "login-teacher") {
      if (!username || !password) {
        return NextResponse.json(
          { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านสำหรับครู" },
          { status: 400 }
        );
      }

      const uname = String(username).trim();
      const pwd = String(password).trim();
      const passwordHash = sha256(pwd);

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          if (supabase) {
            // ค้นหาข้อมูลครูจาก username (case-insensitive)
            const { data: teacherRows, error: tErr } = await supabase
              .from("teachers")
              .select("*")
              .ilike("username", uname);

            if (tErr) {
              console.warn("Supabase teachers query error:", tErr);
            } else if (teacherRows && teacherRows.length > 0) {
              const tRow = teacherRows[0];

              // ตรวจสอบความถูกต้องของรหัสผ่าน
              if (tRow.password_hash && tRow.password_hash !== passwordHash) {
                return NextResponse.json(
                  { error: "รหัสผ่านไม่ถูกต้อง (บัญชีครูตัวอย่างใช้รหัสผ่าน: 12345678)" },
                  { status: 401 }
                );
              }

              // ค้นหาห้องเรียนทั้งหมดของครู
              let teacherClassrooms: any[] = [];
              try {
                const { data: rooms } = await supabase
                  .from("classrooms")
                  .select("*")
                  .eq("teacher_id", tRow.id);
                if (rooms && rooms.length > 0) {
                  teacherClassrooms = rooms;
                } else {
                  const { data: legacyRooms } = await (supabase as any)
                    .from("classrooms")
                    .select("*")
                    .eq("teacher_username", tRow.username);
                  if (legacyRooms && legacyRooms.length > 0) {
                    teacherClassrooms = legacyRooms;
                  }
                }
              } catch (e) {
                console.warn("classrooms lookup for teacher notice:", e);
              }

              // ตรวจสอบสถานะการอนุมัติครูจาก profiles
              let teacherStatus: TeacherApprovalStatus = "approved";
              try {
                const { data: prof } = await supabase
                  .from("profiles")
                  .select("teacher_status")
                  .eq("id", tRow.id)
                  .maybeSingle();
                if (prof?.teacher_status) {
                  teacherStatus = prof.teacher_status as TeacherApprovalStatus;
                }
              } catch {
                // fallback if column not migrated yet
              }

              const tDisplayName = tRow.display_name || tRow.username;
              const res = NextResponse.json({
                authenticated: true,
                source: "supabase",
                role: "teacher",
                passwordHash,
                teacherStatus,
                teacher: {
                  id: tRow.id,
                  username: tRow.username,
                  displayName: tDisplayName,
                  role: "teacher",
                  teacherStatus,
                },
                classrooms: teacherClassrooms,
              });
              return withSessionCookie(res, {
                userId: tRow.id,
                username: tRow.username,
                displayName: tDisplayName,
                role: "teacher",
                teacherStatus,
              });
            }
          }
        } catch (err) {
          console.warn("Supabase teacher login fallback due to error:", err);
        }
      }

      const fallbackTeacherLoginRes = NextResponse.json({
        authenticated: true,
        source: "local",
        role: "teacher",
        passwordHash,
        teacherStatus: "approved",
      });
      return withSessionCookie(fallbackTeacherLoginRes, {
        userId: `tch-${uname}`,
        username: uname,
        displayName: uname,
        role: "teacher",
        teacherStatus: "approved",
      });
    }

    // ==================== 4. สมัครบัญชีครูผู้สอนใหม่ (Role: teacher) ====================
    if (action === "register-teacher") {
      if (!username || !password || String(password).trim().length < 4) {
        return NextResponse.json(
          { error: "กรุณาตั้งชื่อผู้ใช้และรหัสผ่านอย่างน้อย 4 ตัวอักษร" },
          { status: 400 }
        );
      }

      const uname = String(username).trim();
      const pwd = String(password).trim();
      const dName = (displayName || username).trim();
      const passwordHash = sha256(pwd);
      const cleanInvite = String(inviteCode || "").trim();
      const isInviteApproved = cleanInvite === TEACHER_INVITE_CODE;
      const teacherStatus: TeacherApprovalStatus = isInviteApproved
        ? "approved"
        : "pending";

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          if (supabase) {
            // 1. ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่
            const { data: existingTeachers, error: tExistErr } = await supabase
              .from("teachers")
              .select("id")
              .ilike("username", uname);

            if (tExistErr) {
              console.warn("Teacher check error:", tExistErr);
            }

            if (existingTeachers && existingTeachers.length > 0) {
              return NextResponse.json(
                { error: `ชื่อผู้ใช้ "${uname}" มีในระบบแล้ว กรุณาเข้าสู่ระบบ` },
                { status: 409 }
              );
            }

            // 2. สร้าง Auth user หรือสร้าง UUID ครู
            let teacherId: string | null = null;
            const randSuffix = Math.random().toString(36).substring(2, 8);
            const teacherEmail = `tch_${Date.now()}_${randSuffix}@teachers.invalid`;

            try {
              const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
                email: teacherEmail,
                password: pwd,
                email_confirm: true,
                user_metadata: {
                  role: "teacher",
                  username: uname,
                  display_name: dName,
                  teacher_approved: isInviteApproved ? "true" : "false",
                },
              });
              if (authData?.user?.id) {
                teacherId = authData.user.id;
              } else if (authErr) {
                console.warn("Supabase Auth admin createUser notice:", authErr.message);
              }
            } catch (e) {
              console.warn("Auth teacher creation not available/skipped:", e);
            }

            if (!teacherId) {
              teacherId = crypto.randomUUID();
            }

            // 3. บันทึกลง profiles (role: 'teacher', teacher_status)
            try {
              const { error: profErr } = await supabase.from("profiles").upsert({
                id: teacherId,
                role: "teacher",
                display_name: dName,
                teacher_status: teacherStatus,
              });
              if (profErr) {
                await supabase.from("profiles").insert({
                  id: teacherId,
                  role: "teacher",
                });
              }
            } catch (e) {
              console.warn("profiles insert notice:", e);
            }

            // 4. บันทึกลง teachers table
            try {
              const { error: tInsertErr } = await supabase.from("teachers").insert({
                id: teacherId,
                username: uname,
                display_name: dName,
                password_hash: passwordHash,
              });
              if (tInsertErr) {
                console.warn("teachers insert with password_hash notice:", tInsertErr.message);
                await supabase.from("teachers").insert({
                  id: teacherId,
                  username: uname,
                  display_name: dName,
                });
              }
            } catch (e) {
              console.warn("teachers insert attempt notice:", e);
            }

            // 5. สร้างห้องเรียนเริ่มต้นให้ครูโดยอัตโนมัติ
            const initialRoomCode = generateRoomCode();
            const initialRoomName = `ห้องเรียนของ ${dName}`;
            let createdClassroom: any = null;

            try {
              const { data: newRoom, error: roomErr } = await supabase
                .from("classrooms")
                .insert({
                  room_code: initialRoomCode,
                  room_name: initialRoomName,
                  teacher_id: teacherId,
                  pinned_topic_id: 1,
                  pinned_note: "ยินดีต้อนรับสู่ห้องเรียน Vibe Coding เริ่มต้นจากด่านที่ 1 ได้เลย!",
                })
                .select("*")
                .single();

              if (!roomErr && newRoom) {
                createdClassroom = newRoom;
              } else if (roomErr) {
                console.warn("Normalized classroom insert notice, trying legacy:", roomErr.message);
                const { data: legacyRoom } = await (supabase as any)
                  .from("classrooms")
                  .insert({
                    room_code: initialRoomCode,
                    room_name: initialRoomName,
                    teacher_username: uname,
                    pinned_review_topic_id: 1,
                    pinned_review_note: "ยินดีต้อนรับสู่ห้องเรียน Vibe Coding",
                  })
                  .select("*")
                  .single();
                if (legacyRoom) createdClassroom = legacyRoom;
              }
            } catch (e) {
              console.warn("Initial classroom creation notice:", e);
            }

            const regTeacherRes = NextResponse.json({
              authenticated: true,
              source: "supabase",
              role: "teacher",
              passwordHash,
              teacherStatus,
              teacher: {
                id: teacherId,
                username: uname,
                displayName: dName,
                role: "teacher",
                teacherStatus,
              },
              classrooms: createdClassroom
                ? [createdClassroom]
                : [
                    {
                      room_code: initialRoomCode,
                      room_name: initialRoomName,
                      teacher_id: teacherId,
                    },
                  ],
            });
            return withSessionCookie(regTeacherRes, {
              userId: teacherId,
              username: uname,
              displayName: dName,
              role: "teacher",
              teacherStatus,
            });
          }
        } catch (err) {
          console.warn("Supabase teacher register fallback due to error:", err);
        }
      }

      const fallbackTeacherRegRes = NextResponse.json({
        authenticated: true,
        source: "local",
        role: "teacher",
        passwordHash,
        teacherStatus,
      });
      return withSessionCookie(fallbackTeacherRegRes, {
        userId: `tch-${uname}`,
        username: uname,
        displayName: dName,
        role: "teacher",
        teacherStatus,
      });
    }

    return NextResponse.json({ error: "ไม่รู้จักคำสั่ง" }, { status: 400 });
  } catch (globalErr) {
    console.error("Auth API critical error:", globalErr);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth
 * Query parameters: studentId or nickname
 * Returns up-to-date StudentRecord from Supabase if available
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const nickname = searchParams.get("nickname");

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, source: "local" });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: true, source: "local" });
    }

    let query = supabase.from("students").select("*");
    if (studentId) {
      if (!isValidUuid(studentId)) {
        return NextResponse.json({ success: true, source: "local" });
      }
      query = query.eq("id", studentId);
    } else if (nickname) {
      query = query.ilike("nickname", nickname.trim());
    } else {
      return NextResponse.json(
        { error: "ต้องระบุ studentId หรือ nickname" },
        { status: 400 }
      );
    }

    const { data: studentRows, error: stuError } = await query;
    if (stuError || !studentRows || studentRows.length === 0) {
      return NextResponse.json(
        { error: "Student not found", source: "supabase" },
        { status: 404 }
      );
    }

    const studentRecord = await buildStudentRecord(supabase, studentRows[0]);
    return NextResponse.json({
      success: true,
      source: "supabase",
      role: "student",
      student: studentRecord,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("GET /api/auth error:", message);
    return NextResponse.json({ success: true, source: "local", warning: message });
  }
}
