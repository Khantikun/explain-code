"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader, setClientSession } from "../components/SiteHeader";
import { Icon } from "../components/Icons";
import {
  INITIAL_CLASSROOMS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  validatePdpaIdentifier,
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

  // Unified Login fields (ตรวจ Role นักเรียน/ครู จากฐานข้อมูลและในเครื่องอัตโนมัติ)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginSecret, setLoginSecret] = useState("");
  const [showLoginSecret, setShowLoginSecret] = useState(false);

  // Register role selection
  const [registerRole, setRegisterRole] = useState<"student" | "teacher">(
    initialRole
  );

  // Student Register fields
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [showStudentPin, setShowStudentPin] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [pdpaAccepted, setPdpaAccepted] = useState(true);

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMessage(null);
    setFieldErrors({});
  }, [mode, registerRole]);

  const clearFieldError = (fieldKey: string) => {
    setFieldErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

  // ตรวจสอบชื่อเล่นตามหลัก PDPA แบบ Real-time
  const nicknamePdpaCheck = nickname.trim()
    ? validatePdpaIdentifier(nickname)
    : null;

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
   * ฟังก์ชันเข้าสู่ระบบแบบรวมศูนย์ (รองรับทั้งการกรอกปกติและปุ่ม 1-Click Demo Login)
   */
  const executeUnifiedLogin = async (idToUse: string, secretToUse: string) => {
    setMessage(null);
    setFieldErrors({});

    const cleanId = idToUse.trim();
    const cleanSecret = secretToUse.trim();

    const newErrors: Record<string, string> = {};
    if (!cleanId) {
      newErrors.loginIdentifier = "กรุณากรอกชื่อเล่นสมมติ (นักเรียน) หรือชื่อผู้ใช้ (ครู)";
    }
    if (!cleanSecret) {
      newErrors.loginSecret = "กรุณากรอกรหัส PIN 4 หลัก หรือรหัสผ่าน";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setMessage({
        type: "error",
        text:
          !cleanId && !cleanSecret
            ? "กรุณากรอกชื่อผู้ใช้/ชื่อเล่นสมมติ และรหัสผ่าน/PIN ก่อนกดเข้าสู่ระบบ"
            : newErrors.loginIdentifier || newErrors.loginSecret,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let localStudents = INITIAL_STUDENTS;
      let localTeachers = INITIAL_TEACHERS;
      try {
        const rawS = localStorage.getItem("explain_code_students_v2");
        if (rawS) localStudents = JSON.parse(rawS);
        const rawT = localStorage.getItem("explain_code_teachers_v2");
        if (rawT) localTeachers = JSON.parse(rawT);
      } catch {
        // ignore storage parse error
      }

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unified-login",
          identifier: cleanId,
          secret: cleanSecret,
          localStudents,
          localTeachers,
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

  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeUnifiedLogin(loginIdentifier, loginSecret);
  };

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFieldErrors({});

    const cleanNick = nickname.trim();
    const cleanPin = pin.trim();
    const cleanRoom = roomCode.trim().toUpperCase() || "VIBE26";

    const newErrors: Record<string, string> = {};
    if (!cleanNick) {
      newErrors.nickname = "กรุณาตั้งชื่อเล่นสมมติของคุณ (ห้ามเว้นว่าง)";
    }
    if (!cleanPin) {
      newErrors.pin = "กรุณาตั้งรหัส PIN ตัวเลข 4 หลัก (ห้ามเว้นว่าง)";
    } else if (cleanPin.length !== 4) {
      newErrors.pin = `รหัส PIN ต้องมีครบ 4 หลัก (ตอนนี้กรอกไป ${cleanPin.length} หลัก)`;
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setMessage({
        type: "error",
        text:
          !cleanNick && !cleanPin
            ? "กรุณากรอกชื่อเล่นสมมติ และตั้งรหัส PIN 4 หลักให้ครบถ้วนก่อนสมัครสมาชิก"
            : newErrors.nickname || newErrors.pin,
      });
      return;
    }

    const pdpaResult = validatePdpaIdentifier(cleanNick);
    if (!pdpaResult.valid) {
      setMessage({
        type: "error",
        text:
          pdpaResult.reason ||
          "ตามหลัก PDPA 2562 กรุณาใช้ชื่อเล่นสมมติเท่านั้น ห้ามใช้ชื่อจริง อีเมล หรือเบอร์โทรศัพท์",
      });
      return;
    }

    if (!pdpaAccepted) {
      setMessage({
        type: "error",
        text: "กรุณาติ๊กยืนยันการใช้ชื่อเล่นสมมติตามหลักการคุ้มครองข้อมูลส่วนบุคคล (PDPA)",
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
    setFieldErrors({});

    const cleanUser = username.trim();
    const cleanPwd = password.trim();
    const cleanDisplay = (displayName || cleanUser).trim();

    const newErrors: Record<string, string> = {};
    if (!cleanUser) {
      newErrors.username = "กรุณาตั้งชื่อผู้ใช้ครู (ห้ามเว้นว่าง)";
    }
    if (!cleanPwd) {
      newErrors.password = "กรุณาตั้งรหัสผ่านสำหรับบัญชีครู (ห้ามเว้นว่าง)";
    } else if (cleanPwd.length < 4) {
      newErrors.password = "รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setMessage({
        type: "error",
        text:
          !cleanUser && !cleanPwd
            ? "กรุณากรอกชื่อผู้ใช้ครู และตั้งรหัสผ่าน (อย่างน้อย 4 ตัวอักษร) ให้ครบถ้วน"
            : newErrors.username || newErrors.password,
      });
      return;
    }

    if (/@/.test(cleanUser)) {
      setMessage({
        type: "error",
        text: "ตามหลัก PDPA พ.ศ. 2562 กรุณาตั้งชื่อผู้ใช้ (Username) แทนการใช้อีเมลส่วนตัว",
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
    <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6]">
      <SiteHeader />

      <main className="mx-auto max-w-xl px-4 py-8 sm:py-10 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#f6c945]/70 bg-[#1c1b2b] px-4 py-2 text-xs sm:text-sm font-extrabold text-[#ffe27a] shadow-sm hover:border-[#f6c945] hover:bg-[#281d08] transition-colors"
          >
            <Icon name="home" className="h-4 w-4 text-[#f6c945]" />
            <span>← กลับไปหน้าแรก</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-6 sm:p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden border border-[#f6c945]/60 bg-[#0d0b14] shadow-md">
              <Image
                src="/logo.png"
                alt="โค้ดนี้ฉันอธิบายได้"
                width={56}
                height={56}
                className="h-full w-full object-contain"
              />
            </div>

            <h1 className="mt-3 text-2xl font-extrabold text-[#f4efe6]">
              {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิกใหม่"}
            </h1>
            <p className="mt-1 text-sm text-[#9a93ad]">
              {mode === "login"
                ? "ใช้ชื่อเล่นสมมติหรือชื่อผู้ใช้ ระบบตรวจสอบบทบาท (นักเรียน/ครู) ให้อัตโนมัติ"
                : "ไม่ต้องใช้อีเมล ไม่เก็บชื่อจริง หรือเบอร์โทรศัพท์ ปลอดภัยสำหรับผู้เรียนทุกคน"}
            </p>
            {redirectPath && (
              <p className="mt-2 rounded-lg border border-[#f6c945]/40 bg-[#281d08] px-3 py-1.5 text-xs font-medium text-[#ffe27a]">
                เมื่อเข้าสู่ระบบสำเร็จ ระบบจะพาคุณกลับไปยังหน้า{" "}
                <code className="font-mono font-bold text-[#f6c945]">
                  {redirectPath}
                </code>{" "}
                อัตโนมัติ
              </p>
            )}
          </div>

          {/* สลับโหมด เข้าสู่ระบบ / สมัครสมาชิกใหม่ */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-[#2f2d45] bg-[#0d0b14] p-1.5">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage(null);
                setFieldErrors({});
              }}
              className={`rounded-lg py-2.5 text-sm font-extrabold transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-[#25193b] text-[#ffe27a] border border-[#9b5de5]/70 shadow-xs"
                  : "text-[#9a93ad] hover:text-[#f4efe6]"
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setMessage(null);
                setFieldErrors({});
              }}
              className={`rounded-lg py-2.5 text-sm font-extrabold transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-[#281d08] text-[#ffe27a] border border-[#f6c945]/70 shadow-xs"
                  : "text-[#9a93ad] hover:text-[#f4efe6]"
              }`}
            >
              สมัครสมาชิกใหม่
            </button>
          </div>

          {message && (
            <div
              role="alert"
              className={`mb-5 flex items-start gap-3 rounded-xl border-2 p-4 shadow-md ${
                message.type === "error"
                  ? "border-[#c0283a] bg-[#2d141c] text-[#fca5a5]"
                  : "border-[#2fbf71] bg-[#102a1e] text-[#86efac]"
              }`}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/30 text-sm">
                {message.type === "error" ? "⚠️" : "✅"}
              </span>
              <div className="flex-1 text-xs leading-relaxed">
                <p className="font-extrabold text-sm mb-0.5">
                  {message.type === "error"
                    ? "แจ้งเตือนการกรอกข้อมูล"
                    : "ดำเนินการสำเร็จ"}
                </p>
                <p className="font-bold opacity-95">{message.text}</p>
              </div>
              <button
                type="button"
                onClick={() => setMessage(null)}
                aria-label="ปิดกล่องแจ้งเตือน"
                className="rounded-lg px-2 py-1 text-xs font-extrabold opacity-75 hover:bg-black/25 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* ==================== โหมดเข้าสู่ระบบ ==================== */}
          {mode === "login" ? (
            <div className="space-y-5">
              <form
                onSubmit={handleUnifiedLogin}
                noValidate
                className="space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#c4bdd6]">
                      ชื่อเล่นสมมติ (นักเรียน) หรือ ชื่อผู้ใช้ (ครู)
                    </label>
                    <span className="text-[11px] font-semibold text-[#86efac]">
                      ✓ ไม่ต้องใช้อีเมล
                    </span>
                  </div>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => {
                      setLoginIdentifier(e.target.value);
                      clearFieldError("loginIdentifier");
                    }}
                    placeholder="เช่น ต้นกล้า_สายโค้ด, แมวส้ม หรือ ครูสมชาย"
                    className={`w-full rounded-xl border bg-[#1c1b2b] px-3.5 py-2.5 text-sm font-bold text-[#f4efe6] placeholder:font-normal placeholder:text-[#9a93ad]/60 focus:bg-[#252238] focus:outline-hidden ${
                      fieldErrors.loginIdentifier
                        ? "border-[#c0283a] bg-[#2d141c]/30 focus:border-[#c0283a]"
                        : "border-[#3d395a] focus:border-[#f6c945]"
                    }`}
                  />
                  {fieldErrors.loginIdentifier && (
                    <p className="mt-1.5 text-xs font-bold text-[#fca5a5] flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{fieldErrors.loginIdentifier}</span>
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#c4bdd6]">
                      รหัส PIN 4 หลัก (นักเรียน) หรือ รหัสผ่าน (ครู)
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginSecret ? "text" : "password"}
                      value={loginSecret}
                      onChange={(e) => {
                        setLoginSecret(e.target.value);
                        clearFieldError("loginSecret");
                      }}
                      placeholder="กรอกรหัส PIN 4 หลัก หรือรหัสผ่าน"
                      className={`w-full rounded-xl border bg-[#1c1b2b] px-3.5 py-2.5 pr-16 text-sm font-bold text-[#f4efe6] placeholder:font-normal placeholder:text-[#9a93ad]/60 focus:bg-[#252238] focus:outline-hidden ${
                        fieldErrors.loginSecret
                          ? "border-[#c0283a] bg-[#2d141c]/30 focus:border-[#c0283a]"
                          : "border-[#3d395a] focus:border-[#f6c945]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginSecret(!showLoginSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-[#252238] px-2 py-1 text-xs font-bold text-[#ffe27a] hover:bg-[#322c4a] cursor-pointer"
                    >
                      {showLoginSecret ? "ซ่อน" : "แสดง"}
                    </button>
                  </div>
                  {fieldErrors.loginSecret && (
                    <p className="mt-1.5 text-xs font-bold text-[#fca5a5] flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{fieldErrors.loginSecret}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="retro-button w-full rounded-xl bg-[#2fbf71] py-3 text-sm font-extrabold text-[#0b0b14] shadow-md hover:bg-[#34d37d] disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Icon name="play" className="h-4 w-4" filled />
                  <span>{isSubmitting ? "กำลังตรวจสอบสิทธิ์..." : "เข้าสู่ระบบ"}</span>
                </button>
              </form>
            </div>
          ) : (
            /* ==================== โหมดสมัครสมาชิกใหม่ ==================== */
            <div>
              <div className="mb-5">
                <label className="block text-xs font-bold text-[#c4bdd6] mb-2">
                  เลือกบทบาทที่ต้องการสมัครสมาชิก:
                </label>
                <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-[#2f2d45] bg-[#1c1b2b] p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterRole("student");
                      setMessage(null);
                      setFieldErrors({});
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-extrabold transition-all cursor-pointer ${
                      registerRole === "student"
                        ? "bg-[#9b5de5] text-[#f4efe6] shadow-md"
                        : "text-[#9a93ad] hover:text-[#f4efe6]"
                    }`}
                  >
                    <Icon name="user" className="h-4 w-4" />
                    <span>นักเรียน (Student)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterRole("teacher");
                      setMessage(null);
                      setFieldErrors({});
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-extrabold transition-all cursor-pointer ${
                      registerRole === "teacher"
                        ? "bg-[#9b5de5] text-[#f4efe6] shadow-md"
                        : "text-[#9a93ad] hover:text-[#f4efe6]"
                    }`}
                  >
                    <Icon name="users" className="h-4 w-4" />
                    <span>ครูผู้สอน (Teacher)</span>
                  </button>
                </div>
              </div>

              {registerRole === "student" ? (
                <form
                  onSubmit={handleStudentRegister}
                  noValidate
                  className="space-y-4"
                >
                  {/* 1. ชื่อเล่นสมมติ */}
                  <div>
                    <label className="block text-xs font-bold text-[#c4bdd6] mb-1.5">
                      1. ตั้งชื่อเล่นสมมติ
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => {
                        setNickname(e.target.value);
                        clearFieldError("nickname");
                      }}
                      placeholder="เช่น แมวส้ม_สายโค้ด"
                      className={`w-full rounded-xl border bg-[#1c1b2b] px-3.5 py-2.5 text-sm font-bold text-[#f4efe6] placeholder:font-normal placeholder:text-[#9a93ad]/60 focus:bg-[#252238] focus:outline-hidden ${
                        fieldErrors.nickname
                          ? "border-[#c0283a] bg-[#2d141c]/30 focus:border-[#c0283a]"
                          : nicknamePdpaCheck
                          ? nicknamePdpaCheck.valid
                            ? "border-[#2fbf71]"
                            : "border-[#c0283a]"
                          : "border-[#3d395a] focus:border-[#f6c945]"
                      }`}
                    />
                    {fieldErrors.nickname && (
                      <p className="mt-1.5 text-xs font-bold text-[#fca5a5] flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>{fieldErrors.nickname}</span>
                      </p>
                    )}
                    {/* แถบตรวจสอบ PDPA แบบ Real-time */}
                    {nicknamePdpaCheck && (
                      <p
                        className={`mt-1.5 text-xs font-bold flex items-center gap-1.5 ${
                          nicknamePdpaCheck.valid
                            ? "text-[#86efac]"
                            : "text-[#fca5a5]"
                        }`}
                      >
                        <span>
                          {nicknamePdpaCheck.valid
                            ? "✓ ผ่านเกณฑ์ PDPA พ.ศ. 2562: ชื่อเล่นสมมติปลอดภัย ไม่มีข้อมูลระบุตัวตนจริง"
                            : `⚠️ ${nicknamePdpaCheck.reason}`}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* 2. รหัส PIN 4 หลัก + ตัวบอกจำนวนหลัก */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[#c4bdd6]">
                        2. ตั้งรหัส PIN 4 หลัก (ตัวเลข 0–9)
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2, 3].map((idx) => (
                          <span
                            key={idx}
                            className={`h-2.5 w-2.5 rounded-full transition-colors ${
                              pin.length > idx
                                ? "bg-[#2fbf71]"
                                : "bg-[#3d395a]"
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-[11px] font-bold text-[#9a93ad]">
                          {pin.length}/4 หลัก
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type={showStudentPin ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => {
                          setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                          clearFieldError("pin");
                        }}
                        placeholder="•••• (เช่น 1234)"
                        className={`w-full rounded-xl border bg-[#1c1b2b] px-3.5 py-2.5 pr-16 text-sm font-bold tracking-widest text-[#f4efe6] placeholder:tracking-normal placeholder:font-normal placeholder:text-[#9a93ad]/60 focus:bg-[#252238] focus:outline-hidden ${
                          fieldErrors.pin
                            ? "border-[#c0283a] bg-[#2d141c]/30 focus:border-[#c0283a]"
                            : "border-[#3d395a] focus:border-[#f6c945]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentPin(!showStudentPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-[#252238] px-2 py-1 text-xs font-bold text-[#ffe27a] hover:bg-[#322c4a] cursor-pointer"
                      >
                        {showStudentPin ? "ซ่อน" : "แสดง"}
                      </button>
                    </div>
                    {fieldErrors.pin && (
                      <p className="mt-1.5 text-xs font-bold text-[#fca5a5] flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>{fieldErrors.pin}</span>
                      </p>
                    )}
                  </div>

                  {/* 3. รหัสห้องเรียน (ไม่บังคับ) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[#c4bdd6]">
                        3. รหัสห้องเรียนจากครู (ไม่บังคับ)
                      </label>
                      <span className="text-[11px] font-semibold text-[#9a93ad]">
                        เว้นว่างได้หากเรียนด้วยตัวเอง
                      </span>
                    </div>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) =>
                        setRoomCode(e.target.value.toUpperCase())
                      }
                      placeholder="เว้นว่างได้ หรือกรอกรหัสห้องจากครู (เช่น ABC123)"
                      className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3.5 py-2.5 text-sm font-mono font-extrabold uppercase text-[#ffe27a] placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:bg-[#252238] focus:outline-hidden"
                    />
                  </div>

                  {/* รับทราบหลักการ PDPA แบบมินิมอล */}
                  <label className="flex items-center gap-2 px-1 py-0.5 text-xs text-[#9a93ad] hover:text-[#c4bdd6] transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pdpaAccepted}
                      onChange={(e) => setPdpaAccepted(e.target.checked)}
                      className="h-3.5 w-3.5 shrink-0 accent-[#2fbf71] rounded cursor-pointer"
                    />
                    <span>
                      รับทราบหลัก <strong className="text-[#c4bdd6]">PDPA</strong> · ระบบเก็บเฉพาะชื่อเล่นสมมติและรหัส PIN (ไม่เก็บข้อมูลส่วนตัวจริง)
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="retro-button w-full rounded-xl bg-[#2fbf71] py-3 text-sm font-extrabold text-[#0b0b14] shadow-md hover:bg-[#34d37d] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isSubmitting ? "กำลังสร้างบัญชีนักเรียน..." : "สมัครสมาชิกนักเรียนและเริ่มลุยเลย"}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={handleTeacherRegister}
                  noValidate
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-[#c4bdd6] mb-1.5">
                      ตั้งชื่อผู้ใช้ครู (Username · ไม่ต้องใช้อีเมลส่วนตัว)
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        clearFieldError("username");
                      }}
                      placeholder="เช่น ครูสมศรี_คอมพิวเตอร์"
                      className={`w-full rounded-xl border bg-[#1c1b2b] px-3.5 py-2.5 text-sm font-bold text-[#f4efe6] placeholder:font-normal placeholder:text-[#9a93ad]/60 focus:bg-[#252238] focus:outline-hidden ${
                        fieldErrors.username
                          ? "border-[#c0283a] bg-[#2d141c]/30 focus:border-[#c0283a]"
                          : "border-[#3d395a] focus:border-[#f6c945]"
                      }`}
                    />
                    {fieldErrors.username && (
                      <p className="mt-1.5 text-xs font-bold text-[#fca5a5] flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>{fieldErrors.username}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#c4bdd6] mb-1.5">
                      ชื่อที่แสดงในห้องเรียน (Display Name)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="เช่น ครูสมศรี (วิชาวิทยาการคำนวณ)"
                      className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:bg-[#252238] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#c4bdd6] mb-1.5">
                      ตั้งรหัสผ่าน (อย่างน้อย 4 ตัวอักษร · เข้ารหัส SHA-256)
                    </label>
                    <div className="relative">
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearFieldError("password");
                        }}
                        placeholder="••••••••"
                        className={`w-full rounded-xl border bg-[#1c1b2b] px-3.5 py-2.5 pr-16 text-sm font-bold text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:bg-[#252238] focus:outline-hidden ${
                          fieldErrors.password
                            ? "border-[#c0283a] bg-[#2d141c]/30 focus:border-[#c0283a]"
                            : "border-[#3d395a] focus:border-[#f6c945]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowRegisterPassword(!showRegisterPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-[#252238] px-2 py-1 text-xs font-bold text-[#ffe27a] hover:bg-[#322c4a] cursor-pointer"
                      >
                        {showRegisterPassword ? "ซ่อน" : "แสดง"}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1.5 text-xs font-bold text-[#fca5a5] flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>{fieldErrors.password}</span>
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#3d395a] bg-[#1c1b2b] p-3.5">
                    <label className="block text-xs font-bold text-[#f6c945] mb-1">
                      รหัสเชิญครูเพื่ออนุมัติทันที (Teacher Invite Code)
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="เช่น TEACHER2026 (กรอกไว้ให้แล้วสำหรับทดสอบ)"
                      className="w-full rounded-lg border border-[#3d395a] bg-[#141220] px-3 py-2 text-xs font-mono font-bold text-[#ffe27a] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                    />
                    <p className="mt-1.5 text-[11px] text-[#9a93ad]">
                      * รหัสเชิญเริ่มต้นสำหรับกรรมการและครูผู้สอนคือ{" "}
                      <code className="text-[#2fbf71] font-bold">TEACHER2026</code>{" "}
                      เพื่อรับสิทธิ์สร้างคอร์สและห้องเรียนทันที
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="retro-button w-full rounded-xl bg-[#2fbf71] py-3 text-sm font-extrabold text-[#0b0b14] shadow-md hover:bg-[#34d37d] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isSubmitting ? "กำลังสมัครบัญชีครู..." : "สมัครบัญชีครูผู้สอนและเปิดห้องเรียน"}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 border-t border-[#2f2d45] pt-5">
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#f6c945]/75 bg-[#1c1b2b] px-4 py-3 text-sm font-extrabold text-[#ffe27a] shadow-md hover:border-[#f6c945] hover:bg-[#281d08] transition-all"
            >
              <Icon name="home" className="h-4 w-4 text-[#f6c945]" />
              <span>กลับไปหน้าแรก</span>
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
        <div className="min-h-screen bg-[#0d0b14] p-8 text-center text-sm text-[#9a93ad]">
          กำลังโหลดหน้าเข้าสู่ระบบ...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
