import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

function sha256(input: string): string {
  return createHash("sha256").update(input.trim()).digest("hex");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function supabaseFetch(path: string, options: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * ระบบยืนยันตัวตนตาม Role (นักเรียน student / ครู teacher)
 * - แฮช PIN 4 หลักและรหัสผ่านครูด้วย SHA-256 ที่ฝั่งหลังบ้านตามหลัก PDPA 2562
 * - เชื่อมต่อตาราง students, teachers, classrooms ใน Supabase อัตโนมัติหากตั้งค่า .env.local
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, role, nickname, pin, roomCode, username, password, displayName } = body;

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

      const pinHash = sha256(String(pin));

      // ตรวจสอบจาก Supabase หากเชื่อมต่อแล้ว
      const sbRows = await supabaseFetch(
        `students?nickname=eq.${encodeURIComponent(nickname.trim())}&select=*`
      );
      if (Array.isArray(sbRows) && sbRows.length > 0) {
        const studentRow = sbRows[0];
        if (studentRow.pin_hash !== pinHash) {
          return NextResponse.json(
            { error: "รหัส PIN 4 หลักไม่ถูกต้องสำหรับชื่อเล่นนี้" },
            { status: 401 }
          );
        }
        return NextResponse.json({
          authenticated: true,
          source: "supabase",
          role: "student",
          pinHash,
          student: {
            id: studentRow.id,
            nickname: studentRow.nickname,
            pinHash: studentRow.pin_hash,
            roomCode: studentRow.room_code,
            xp: studentRow.xp,
            streak: studentRow.streak,
            completedTopics: studentRow.completed_topics || [],
            cellScores: studentRow.cell_scores,
            badges: studentRow.badges || [],
            history: studentRow.history || [],
          },
        });
      }

      return NextResponse.json({
        authenticated: true,
        source: "local",
        role: "student",
        pinHash,
      });
    }

    // ==================== 2. สมัครเข้าเล่นใหม่ฝั่งนักเรียนด้วยรหัสห้อง (Role: student) ====================
    if (action === "register-student") {
      if (!nickname || !pin || String(pin).trim().length !== 4 || !roomCode) {
        return NextResponse.json(
          { error: "กรุณากรอกชื่อเล่นสมมติ, PIN 4 หลัก และรหัสห้องจากครูให้ครบถ้วน" },
          { status: 400 }
        );
      }

      const pinHash = sha256(String(pin));
      const cleanRoom = String(roomCode).trim().toUpperCase();

      // บันทึกลง Supabase หากเชื่อมต่อแล้ว
      if (SUPABASE_URL && SUPABASE_KEY) {
        const inserted = await supabaseFetch(`students`, {
          method: "POST",
          body: JSON.stringify({
            nickname: nickname.trim(),
            pin_hash: pinHash,
            role: "student",
            room_code: cleanRoom,
            xp: 0,
            streak: 1,
            completed_topics: [],
          }),
        });

        if (Array.isArray(inserted) && inserted.length > 0) {
          const st = inserted[0];
          return NextResponse.json({
            authenticated: true,
            source: "supabase",
            role: "student",
            pinHash,
            student: {
              id: st.id,
              nickname: st.nickname,
              pinHash: st.pin_hash,
              roomCode: st.room_code,
              xp: st.xp,
              streak: st.streak,
              completedTopics: st.completed_topics || [],
              cellScores: st.cell_scores,
              badges: st.badges || [],
              history: st.history || [],
            },
          });
        }
      }

      return NextResponse.json({
        authenticated: true,
        source: "local",
        role: "student",
        pinHash,
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

      const passwordHash = sha256(String(password));

      // ตรวจสอบจากตาราง teachers ใน Supabase หากเชื่อมต่อแล้ว
      const sbTeachers = await supabaseFetch(
        `teachers?username=eq.${encodeURIComponent(username.trim())}&select=*`
      );
      if (Array.isArray(sbTeachers) && sbTeachers.length > 0) {
        const tRow = sbTeachers[0];
        if (tRow.password_hash !== passwordHash) {
          return NextResponse.json(
            { error: "รหัสผ่านของบัญชีครูไม่ถูกต้อง" },
            { status: 401 }
          );
        }
        return NextResponse.json({
          authenticated: true,
          source: "supabase",
          role: "teacher",
          passwordHash,
          teacher: {
            id: tRow.id,
            username: tRow.username,
            displayName: tRow.display_name,
            role: "teacher",
          },
        });
      }

      return NextResponse.json({
        authenticated: true,
        source: "local",
        role: role === "teacher" ? "teacher" : "teacher",
        passwordHash,
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

      const passwordHash = sha256(String(password));

      if (SUPABASE_URL && SUPABASE_KEY) {
        await supabaseFetch(`teachers`, {
          method: "POST",
          body: JSON.stringify({
            username: username.trim(),
            password_hash: passwordHash,
            display_name: (displayName || username).trim(),
            role: "teacher",
          }),
        });
      }

      return NextResponse.json({
        authenticated: true,
        role: "teacher",
        passwordHash,
      });
    }

    return NextResponse.json({ error: "ไม่รู้จักคำสั่ง" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" },
      { status: 500 }
    );
  }
}
