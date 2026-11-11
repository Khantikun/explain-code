"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader, setClientSession } from "../components/SiteHeader";
import { Icon } from "../components/Icons";
import {
  INITIAL_CLASSROOMS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
} from "../lib/curriculum";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "";
  const initialRole =
    searchParams.get("role") === "teacher" ? "teacher" : "student";
  const initialMode =
    searchParams.get("mode") === "register" ? "register" : "login";

  const [role, setRole] = useState<"student" | "teacher">(initialRole);
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  // Student fields
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [roomCode, setRoomCode] = useState("VIBE26");

  // Teacher fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("TEACHER2026");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    setMessage(null);
  }, [role, mode]);

  const navigateAfterAuth = (
    authedRole: "student" | "teacher",
    teacherStatus?: string
  ) => {
    if (redirectPath && redirectPath.startsWith("/")) {
      router.push(redirectPath);
    } else if (authedRole === "teacher") {
      router.push("/teacher");
    } else {
      router.push("/my-learning");
    }
    router.refresh();
    void teacherStatus;
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const cleanNick = nickname.trim();
    const cleanPin = pin.trim();
    const cleanRoom = roomCode.trim().toUpperCase() || "VIBE26";

    if (!cleanNick || cleanPin.length !== 4) {
      setMessage({
        type: "error",
        text: "กรุณากรอกชื่อเล่นสมมติ และรหัส PIN 4 หลักให้ครบถ้วน",
      });
      return;
    }

    if (/@/.test(cleanNick)) {
      setMessage({
        type: "error",
        text: "ตามหลัก PDPA 2562 กรุณาใช้ชื่อเล่นสมมติเท่านั้น ห้ามใช้อีเมล",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const action = mode === "login" ? "login-student" : "register-student";
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          nickname: cleanNick,
          pin: cleanPin,
          roomCode: cleanRoom,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "ไม่สามารถยืนยันตัวตนได้ กรุณาตรวจสอบข้อมูลอีกครั้ง",
        });
        return;
      }

      const studentObj = data.student || {
        id: `stu-${cleanNick}`,
        nickname: cleanNick,
        roomCode: cleanRoom,
      };

      // ซิงค์ลง LocalStorage เดิมเพื่อให้หน้าฝึก PRIMM เดิมใช้งานร่วมกันได้ทันที
      try {
        const rawStudents = localStorage.getItem("explain_code_students_v2");
        const list = rawStudents ? JSON.parse(rawStudents) : INITIAL_STUDENTS;
        const exists = list.some(
          (s: any) =>
            s.id === studentObj.id ||
            s.nickname?.toLowerCase() === cleanNick.toLowerCase()
        );
        if (!exists && data.student) {
          localStorage.setItem(
            "explain_code_students_v2",
            JSON.stringify([...list, data.student])
          );
        }
      } catch {
        // ignore
      }

      setClientSession({
        role: "student",
        userId: studentObj.id,
        username: studentObj.nickname || cleanNick,
        displayName: studentObj.nickname || cleanNick,
        roomCode: studentObj.roomCode || cleanRoom,
      });

      navigateAfterAuth("student");
    } catch {
      setMessage({
        type: "error",
        text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const cleanUser = username.trim();
    const cleanPwd = password.trim();
    const cleanDisplay = (displayName || cleanUser).trim();

    if (!cleanUser || cleanPwd.length < 4) {
      setMessage({
        type: "error",
        text: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านอย่างน้อย 4 ตัวอักษร",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const action = mode === "login" ? "login-teacher" : "register-teacher";
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          username: cleanUser,
          password: cleanPwd,
          displayName: cleanDisplay,
          inviteCode: inviteCode.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "ไม่สามารถเข้าสู่ระบบครูได้",
        });
        return;
      }

      const teacherObj = data.teacher || {
        id: `tch-${cleanUser}`,
        username: cleanUser,
        displayName: cleanDisplay,
        teacherStatus: data.teacherStatus || "approved",
      };

      // ซิงค์ลง LocalStorage เดิมเพื่อให้หน้า TeacherDashboard เดิมทำงานร่วมกันได้
      try {
        const rawTeachers = localStorage.getItem("explain_code_teachers_v2");
        const list = rawTeachers ? JSON.parse(rawTeachers) : INITIAL_TEACHERS;
        if (
          !list.some(
            (t: any) => t.username?.toLowerCase() === cleanUser.toLowerCase()
          )
        ) {
          localStorage.setItem(
            "explain_code_teachers_v2",
            JSON.stringify([
              ...list,
              {
                id: teacherObj.id,
                username: cleanUser,
                passwordHash: data.passwordHash || "",
                displayName: teacherObj.displayName || cleanDisplay,
                role: "teacher",
              },
            ])
          );
        }
        if (!localStorage.getItem("explain_code_rooms_v2")) {
          localStorage.setItem(
            "explain_code_rooms_v2",
            JSON.stringify(INITIAL_CLASSROOMS)
          );
        }
      } catch {
        // ignore
      }

      setClientSession({
        role: "teacher",
        userId: teacherObj.id,
        username: teacherObj.username || cleanUser,
        displayName: teacherObj.displayName || cleanDisplay,
        teacherStatus: teacherObj.teacherStatus || data.teacherStatus || "approved",
      });

      navigateAfterAuth("teacher", teacherObj.teacherStatus);
    } catch {
      setMessage({
        type: "error",
        text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoStudent = () => {
    setRole("student");
    setMode("login");
    setNickname("ต้นกล้า_สายโค้ด");
    setPin("1234");
  };

  const fillDemoTeacher = () => {
    setRole("teacher");
    setMode("login");
    setUsername("ครูสมชาย");
    setPassword("12345678");
  };

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c]">
      <SiteHeader />

      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-[#e5dfd3] bg-white p-6 sm:p-8 shadow-xs">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0ec] px-3 py-1 text-xs font-bold text-[#2a4d3e]">
              <Icon name="shield" className="h-3.5 w-3.5" />
              ระบบบัญชีแยกตามบทบาท (PDPA &amp; Supabase Auth)
            </span>
            <h1 className="mt-3 text-2xl font-bold text-[#1e1e1c]">
              {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิกใหม่"}
            </h1>
            <p className="mt-1 text-sm text-[#6e6a63]">
              เลือกบทบาทของคุณเพื่อบันทึกประวัติการเรียนรู้และประวัติการอธิบายโค้ด
            </p>
            {redirectPath && (
              <p className="mt-2 rounded-lg bg-[#fef9c3] px-3 py-1.5 text-xs font-medium text-[#854d0e]">
                เมื่อเข้าสู่ระบบสำเร็จ ระบบจะพาคุณกลับไปยังหน้า{" "}
                <code className="font-mono font-bold">{redirectPath}</code> อัตโนมัติ
              </p>
            )}
          </div>

          {/* เลือกบทบาท: นักเรียน หรือ ครูผู้สอน */}
          <div className="mb-5 grid grid-cols-2 gap-2.5 rounded-xl bg-[#f4f1ea] p-1.5">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all cursor-pointer ${
                role === "student"
                  ? "bg-[#2a4d3e] text-white shadow-xs"
                  : "text-[#524f49] hover:text-[#1e1e1c]"
              }`}
            >
              <Icon name="user" className="h-4 w-4" />
              <span>สำหรับนักเรียน</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("teacher")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all cursor-pointer ${
                role === "teacher"
                  ? "bg-[#2a4d3e] text-white shadow-xs"
                  : "text-[#524f49] hover:text-[#1e1e1c]"
              }`}
            >
              <Icon name="users" className="h-4 w-4" />
              <span>สำหรับครูผู้สอน</span>
            </button>
          </div>

          {/* สลับโหมด เข้าสู่ระบบ / สมัครสมาชิก */}
          <div className="mb-6 flex border-b border-[#e5dfd3]">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                mode === "login"
                  ? "border-[#2a4d3e] text-[#2a4d3e]"
                  : "border-transparent text-[#6e6a63] hover:text-[#1e1e1c]"
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                mode === "register"
                  ? "border-[#2a4d3e] text-[#2a4d3e]"
                  : "border-transparent text-[#6e6a63] hover:text-[#1e1e1c]"
              }`}
            >
              สมัครสมาชิกใหม่
            </button>
          </div>

          {message && (
            <div
              className={`mb-5 rounded-xl border p-3.5 text-xs font-medium ${
                message.type === "error"
                  ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
                  : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* ฟอร์มนักเรียน */}
          {role === "student" ? (
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                  ชื่อเล่นสมมติ (ห้ามใช้อีเมลหรือชื่อ-นามสกุลจริงตาม PDPA)
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="เช่น ต้นกล้า_สายโค้ด"
                  required
                  className="w-full rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2.5 text-sm text-[#1e1e1c] focus:border-[#2a4d3e] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                  รหัส PIN 4 หลัก (ตัวเลข)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="••••"
                  required
                  className="w-full rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2.5 text-sm tracking-widest text-[#1e1e1c] focus:border-[#2a4d3e] focus:bg-white focus:outline-hidden"
                />
              </div>

              {mode === "register" && (
                <div>
                  <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                    รหัสห้องเรียนจากครู (ค่าเริ่มต้น VIBE26 สำหรับห้องเรียนเปิด)
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="เช่น VIBE26"
                    required
                    className="w-full rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2.5 text-sm font-mono uppercase text-[#1e1e1c] focus:border-[#2a4d3e] focus:bg-white focus:outline-hidden"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#2a4d3e] py-3 text-sm font-bold text-white shadow-xs hover:bg-[#1f3b2f] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isSubmitting
                  ? "กำลังตรวจสอบ..."
                  : mode === "login"
                  ? "เข้าสู่ระบบนักเรียน"
                  : "สมัครสมาชิกนักเรียน"}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={fillDemoStudent}
                  className="text-xs font-semibold text-[#2a4d3e] underline hover:text-[#1f3b2f] cursor-pointer"
                >
                  ทดลองกรอกบัญชีนักเรียนตัวอย่าง (ต้นกล้า_สายโค้ด / PIN: 1234)
                </button>
              </div>
            </form>
          ) : (
            /* ฟอร์มครูผู้สอน */
            <form onSubmit={handleTeacherSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                  ชื่อผู้ใช้ครู (Username)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น ครูสมชาย"
                  required
                  className="w-full rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2.5 text-sm text-[#1e1e1c] focus:border-[#2a4d3e] focus:bg-white focus:outline-hidden"
                />
              </div>

              {mode === "register" && (
                <div>
                  <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                    ชื่อที่แสดงให้นักเรียนเห็น (Display Name)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="เช่น ครูสมชาย ใจดี (วิทยาการคำนวณ)"
                    className="w-full rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2.5 text-sm text-[#1e1e1c] focus:border-[#2a4d3e] focus:bg-white focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                  รหัสผ่าน (อย่างน้อย 4 ตัวอักษร)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2.5 pr-16 text-sm text-[#1e1e1c] focus:border-[#2a4d3e] focus:bg-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6e6a63] hover:text-[#1e1e1c] cursor-pointer"
                  >
                    {showPassword ? "ซ่อน" : "แสดง"}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <div className="rounded-xl border border-[#d8d1c5] bg-[#f8f6f0] p-3.5">
                  <label className="block text-xs font-bold text-[#2a4d3e] mb-1">
                    รหัสเชิญครูเพื่ออนุมัติทันที (Teacher Invite Code)
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="เช่น TEACHER2026 (เว้นว่างได้หากรอแอดมินอนุมัติ)"
                    className="w-full rounded-lg border border-[#d8d1c5] bg-white px-3 py-2 text-xs font-mono text-[#1e1e1c] focus:border-[#2a4d3e] focus:outline-hidden"
                  />
                  <p className="mt-1.5 text-[11px] text-[#6e6a63]">
                    * หากรหัสเชิญถูกต้อง บัญชีครูจะได้สถานะ{" "}
                    <strong className="text-[#166534]">approved</strong> ทันที
                    หากเว้นว่างจะได้สถานะ{" "}
                    <strong className="text-[#9a3412]">pending</strong> รอการอนุมัติ
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#2a4d3e] py-3 text-sm font-bold text-white shadow-xs hover:bg-[#1f3b2f] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isSubmitting
                  ? "กำลังตรวจสอบ..."
                  : mode === "login"
                  ? "เข้าสู่ระบบครูผู้สอน"
                  : "สมัครบัญชีครูผู้สอน"}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={fillDemoTeacher}
                  className="text-xs font-semibold text-[#2a4d3e] underline hover:text-[#1f3b2f] cursor-pointer"
                >
                  ทดลองกรอกบัญชีครูตัวอย่าง (ครูสมชาย / รหัสผ่าน: 12345678)
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 border-t border-[#e5dfd3] pt-4 text-center">
            <Link
              href="/"
              className="text-xs font-semibold text-[#6e6a63] hover:text-[#1e1e1c]"
            >
              ← กลับไปหน้าแรก (ใช้งานแบบไม่ต้องล็อกอิน)
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f4] p-8 text-center text-sm text-[#6e6a63]">
          กำลังโหลดหน้าเข้าสู่ระบบ...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
