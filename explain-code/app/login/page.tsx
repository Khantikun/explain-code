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

  const [mode, setMode] = useState<"login" | "register">(initialMode);

  // Unified Login fields (ไม่แยกปุ่มนักเรียน/ครูตอนเข้าสู่ระบบ ระบบตรวจ Role จากฐานข้อมูลอัตโนมัติ)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginSecret, setLoginSecret] = useState("");
  const [showLoginSecret, setShowLoginSecret] = useState(false);

  // Register role selection (เลือกบทบาทเฉพาะตอนสมัครสมาชิกใหม่)
  const [registerRole, setRegisterRole] = useState<"student" | "teacher">(
    initialRole
  );

  // Student Register fields
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [roomCode, setRoomCode] = useState("VIBE26");

  // Teacher Register fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("TEACHER2026");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    setMessage(null);
  }, [mode, registerRole]);

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

  /**
   * เข้าสู่ระบบแบบรวมศูนย์ (Unified Login):
   * ไม่ต้องกดเลือกปุ่มนักเรียนหรือครู ระบบตรวจสอบจากฐานข้อมูลและบัญชีในเครื่องให้อัตโนมัติ
   */
  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const cleanId = loginIdentifier.trim();
    const cleanSecret = loginSecret.trim();

    if (!cleanId || !cleanSecret) {
      setMessage({
        type: "error",
        text: "กรุณากรอกชื่อผู้ใช้/ชื่อเล่น และรหัสผ่าน/PIN",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unified-login",
          identifier: cleanId,
          secret: cleanSecret,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text:
            data.error ||
            "ไม่พบบัญชีผู้ใช้ หรือรหัสผ่าน/PIN ไม่ถูกต้อง",
        });
        return;
      }

      if (data.role === "teacher") {
        const teacherObj = data.teacher || {
          id: `tch-${cleanId}`,
          username: cleanId,
          displayName: cleanId,
          teacherStatus: data.teacherStatus || "approved",
        };
        setClientSession({
          role: "teacher",
          userId: teacherObj.id,
          username: teacherObj.username || cleanId,
          displayName: teacherObj.displayName || cleanId,
          teacherStatus:
            teacherObj.teacherStatus || data.teacherStatus || "approved",
        });
        navigateAfterAuth("teacher", teacherObj.teacherStatus);
      } else {
        const studentObj = data.student || {
          id: `stu-${cleanId}`,
          nickname: cleanId,
          roomCode: "VIBE26",
        };
        setClientSession({
          role: "student",
          userId: studentObj.id,
          username: studentObj.nickname || cleanId,
          displayName: studentObj.nickname || cleanId,
          roomCode: studentObj.roomCode || "VIBE26",
        });
        navigateAfterAuth("student");
      }
    } catch {
      setMessage({
        type: "error",
        text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentRegister = async (e: React.FormEvent) => {
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
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register-student",
          nickname: cleanNick,
          pin: cleanPin,
          roomCode: cleanRoom,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "ไม่สามารถสมัครสมาชิกได้ กรุณาตรวจสอบข้อมูลอีกครั้ง",
        });
        return;
      }

      const studentObj = data.student || {
        id: `stu-${cleanNick}`,
        nickname: cleanNick,
        roomCode: cleanRoom,
      };

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

  const handleTeacherRegister = async (e: React.FormEvent) => {
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
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register-teacher",
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
          text: data.error || "ไม่สามารถสมัครบัญชีครูได้",
        });
        return;
      }

      const teacherObj = data.teacher || {
        id: `tch-${cleanUser}`,
        username: cleanUser,
        displayName: cleanDisplay,
        teacherStatus: data.teacherStatus || "approved",
      };

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
        teacherStatus:
          teacherObj.teacherStatus || data.teacherStatus || "approved",
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

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c]">
      <SiteHeader />

      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-[#e5dfd3] bg-white p-6 sm:p-8 shadow-xs">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0ec] px-3 py-1 text-xs font-bold text-[#2a4d3e]">
              <Icon name="shield" className="h-3.5 w-3.5" />
              ระบบยืนยันตัวตนอัตโนมัติ (PDPA &amp; Supabase Auth)
            </span>
            <h1 className="mt-3 text-2xl font-bold text-[#1e1e1c]">
              {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิกใหม่"}
            </h1>
            <p className="mt-1 text-sm text-[#6e6a63]">
              {mode === "login"
                ? "กรอกชื่อผู้ใช้หรือชื่อเล่นของคุณ ระบบจะตรวจสอบบทบาท (นักเรียน/ครู) ให้อัตโนมัติ"
                : "เลือกบทบาทที่ต้องการสมัครเพื่อเริ่มบันทึกประวัติการเรียนรู้"}
            </p>
            {redirectPath && (
              <p className="mt-2 rounded-lg bg-[#fef9c3] px-3 py-1.5 text-xs font-medium text-[#854d0e]">
                เมื่อเข้าสู่ระบบสำเร็จ ระบบจะพาคุณกลับไปยังหน้า{" "}
                <code className="font-mono font-bold">{redirectPath}</code> อัตโนมัติ
              </p>
            )}
          </div>

          {/* สลับโหมด เข้าสู่ระบบ / สมัครสมาชิกใหม่ */}
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

          {/* ==================== โหมดเข้าสู่ระบบ (ฟอร์มเดียว ไม่แยกปุ่มนักเรียน/ครู) ==================== */}
          {mode === "login" ? (
            <form onSubmit={handleUnifiedLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                  ชื่อเล่นสมมติ หรือ ชื่อผู้ใช้ (Username)
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="กรอกชื่อเล่นหรือชื่อผู้ใช้ของคุณ"
                  required
                  className="w-full rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2.5 text-sm text-[#1e1e1c] focus:border-[#2a4d3e] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                  รหัสผ่าน หรือ รหัส PIN 4 หลัก
                </label>
                <div className="relative">
                  <input
                    type={showLoginSecret ? "text" : "password"}
                    value={loginSecret}
                    onChange={(e) => setLoginSecret(e.target.value)}
                    placeholder="กรอกรหัสผ่านหรือ PIN"
                    required
                    className="w-full rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2.5 pr-16 text-sm text-[#1e1e1c] focus:border-[#2a4d3e] focus:bg-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginSecret(!showLoginSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6e6a63] hover:text-[#1e1e1c] cursor-pointer"
                  >
                    {showLoginSecret ? "ซ่อน" : "แสดง"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#2a4d3e] py-3 text-sm font-bold text-white shadow-xs hover:bg-[#1f3b2f] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isSubmitting ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
              </button>

              <div className="pt-3 border-t border-[#ece7dc] flex flex-wrap items-center justify-center gap-3 text-xs">
                <span className="text-[#6e6a63]">บัญชีทดสอบ:</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginIdentifier("ต้นกล้า_สายโค้ด");
                    setLoginSecret("1234");
                  }}
                  className="font-semibold text-[#2a4d3e] underline hover:text-[#1f3b2f] cursor-pointer"
                >
                  ต้นกล้า_สายโค้ด (PIN: 1234)
                </button>
                <span className="text-[#d8d1c5]">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginIdentifier("ครูสมชาย");
                    setLoginSecret("12345678");
                  }}
                  className="font-semibold text-[#2a4d3e] underline hover:text-[#1f3b2f] cursor-pointer"
                >
                  ครูสมชาย (รหัส: 12345678)
                </button>
              </div>
            </form>
          ) : (
            /* ==================== โหมดสมัครสมาชิกใหม่ (เลือกบทบาทตอนสมัคร) ==================== */
            <div>
              <div className="mb-5">
                <label className="block text-xs font-bold text-[#3d3b36] mb-2">
                  เลือกบทบาทที่ต้องการสมัครสมาชิก:
                </label>
                <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-[#f4f1ea] p-1.5">
                  <button
                    type="button"
                    onClick={() => setRegisterRole("student")}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all cursor-pointer ${
                      registerRole === "student"
                        ? "bg-[#2a4d3e] text-white shadow-xs"
                        : "text-[#524f49] hover:text-[#1e1e1c]"
                    }`}
                  >
                    <Icon name="user" className="h-4 w-4" />
                    <span>นักเรียน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegisterRole("teacher")}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all cursor-pointer ${
                      registerRole === "teacher"
                        ? "bg-[#2a4d3e] text-white shadow-xs"
                        : "text-[#524f49] hover:text-[#1e1e1c]"
                    }`}
                  >
                    <Icon name="users" className="h-4 w-4" />
                    <span>ครูผู้สอน</span>
                  </button>
                </div>
              </div>

              {registerRole === "student" ? (
                <form onSubmit={handleStudentRegister} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                      ตั้งชื่อเล่นสมมติ (ห้ามใช้อีเมลหรือชื่อ-นามสกุลจริงตาม PDPA)
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
                      ตั้งรหัส PIN 4 หลัก (ตัวเลข)
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

                  <div>
                    <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                      รหัสห้องเรียนจากครู (ค่าเริ่มต้น VIBE26 สำหรับห้องเรียนเปิด)
                    </label>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) =>
                        setRoomCode(e.target.value.toUpperCase())
                      }
                      placeholder="เช่น VIBE26"
                      required
                      className="w-full rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2.5 text-sm font-mono uppercase text-[#1e1e1c] focus:border-[#2a4d3e] focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-[#2a4d3e] py-3 text-sm font-bold text-white shadow-xs hover:bg-[#1f3b2f] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิกนักเรียน"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleTeacherRegister} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                      ตั้งชื่อผู้ใช้ครู (Username)
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

                  <div>
                    <label className="block text-xs font-bold text-[#3d3b36] mb-1.5">
                      ตั้งรหัสผ่าน (อย่างน้อย 4 ตัวอักษร)
                    </label>
                    <div className="relative">
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2.5 pr-16 text-sm text-[#1e1e1c] focus:border-[#2a4d3e] focus:bg-white focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowRegisterPassword(!showRegisterPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6e6a63] hover:text-[#1e1e1c] cursor-pointer"
                      >
                        {showRegisterPassword ? "ซ่อน" : "แสดง"}
                      </button>
                    </div>
                  </div>

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

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-[#2a4d3e] py-3 text-sm font-bold text-white shadow-xs hover:bg-[#1f3b2f] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isSubmitting ? "กำลังสมัคร..." : "สมัครบัญชีครูผู้สอน"}
                  </button>
                </form>
              )}
            </div>
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
