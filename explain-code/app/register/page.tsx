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

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "";
  const initialRole =
    searchParams.get("role") === "teacher" ? "teacher" : "student";

  const [registerRole, setRegisterRole] = useState<"student" | "teacher">(
    initialRole
  );

  // Student Register fields
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showStudentPin, setShowStudentPin] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [pdpaAccepted, setPdpaAccepted] = useState(true);

  // Teacher Register fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
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
  }, [registerRole]);

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

  const navigateAfterAuth = (authedRole: "student" | "teacher") => {
    if (redirectPath && redirectPath.startsWith("/")) {
      router.push(redirectPath);
    } else if (authedRole === "teacher") {
      router.push("/teacher");
    } else {
      router.push("/my-learning");
    }
    router.refresh();
  };

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFieldErrors({});

    const cleanNick = nickname.trim();
    const cleanPin = pin.trim();
    const cleanConfirmPin = confirmPin.trim();
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
    if (!cleanConfirmPin) {
      newErrors.confirmPin = "กรุณายืนยันรหัส PIN 4 หลักอีกครั้ง (ห้ามเว้นว่าง)";
    } else if (cleanPin.length === 4 && cleanConfirmPin !== cleanPin) {
      newErrors.confirmPin = "รหัส PIN ทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setMessage({
        type: "error",
        text:
          !cleanNick && !cleanPin
            ? "กรุณากรอกชื่อเล่นสมมติ และตั้งรหัส PIN 4 หลักให้ครบถ้วนก่อนสมัครสมาชิก"
            : newErrors.nickname || newErrors.pin || newErrors.confirmPin,
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
    const cleanConfirmPwd = confirmPassword.trim();
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
    if (!cleanConfirmPwd) {
      newErrors.confirmPassword = "กรุณายืนยันรหัสผ่านอีกครั้ง (ห้ามเว้นว่าง)";
    } else if (cleanPwd.length >= 4 && cleanConfirmPwd !== cleanPwd) {
      newErrors.confirmPassword = "รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setMessage({
        type: "error",
        text:
          !cleanUser && !cleanPwd
            ? "กรุณากรอกชื่อผู้ใช้ครู และตั้งรหัสผ่าน (อย่างน้อย 4 ตัวอักษร) ให้ครบถ้วน"
            : newErrors.username || newErrors.password || newErrors.confirmPassword,
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

    if (!pdpaAccepted) {
      setMessage({
        type: "error",
        text: "กรุณาติ๊กรับทราบหลักการคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนสมัครสมาชิก",
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

      navigateAfterAuth("teacher");
    } catch {
      setMessage({
        type: "error",
        text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginHref = redirectPath
    ? `/login?redirect=${encodeURIComponent(redirectPath)}`
    : "/login";

  return (
    <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6]">
      <SiteHeader />

      <main className="mx-auto max-w-xl px-4 py-8 sm:py-10 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#f6c945]/70 bg-[#1c1b2b] px-4 py-2 text-xs sm:text-sm font-extrabold text-[#ffe27a] shadow-sm hover:border-[#f6c945] hover:bg-[#281d08] transition-colors"
          >
            <Icon name="home" className="h-4 w-4 text-[#f6c945]" />
            <span>← กลับไปหน้าแรก</span>
          </Link>
          <Link
            href={loginHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-4 py-2 text-xs sm:text-sm font-extrabold text-[#f4efe6] hover:border-[#9b5de5] hover:bg-[#25193b] transition-colors"
          >
            <span>มีบัญชีแล้ว? เข้าสู่ระบบ →</span>
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
              สมัครสมาชิกใหม่
            </h1>
            <p className="mt-1 text-sm text-[#9a93ad]">
              ไม่ต้องใช้อีเมล ไม่เก็บชื่อจริง หรือเบอร์โทรศัพท์ ปลอดภัยสำหรับผู้เรียนทุกคน
            </p>
            {redirectPath && (
              <p className="mt-2 rounded-lg border border-[#f6c945]/40 bg-[#281d08] px-3 py-1.5 text-xs font-medium text-[#ffe27a]">
                เมื่อสมัครสมาชิกสำเร็จ ระบบจะพาคุณกลับไปยังหน้า{" "}
                <code className="font-mono font-bold text-[#f6c945]">
                  {redirectPath}
                </code>{" "}
                อัตโนมัติ
              </p>
            )}
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
                            pin.length > idx ? "bg-[#2fbf71]" : "bg-[#3d395a]"
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

                {/* 3. ยืนยันรหัส PIN 4 หลัก */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#c4bdd6]">
                      3. ยืนยันรหัส PIN 4 หลักอีกครั้ง
                    </label>
                    {confirmPin.length > 0 && pin.length === 4 ? (
                      confirmPin === pin ? (
                        <span className="text-[11px] font-bold text-[#86efac]">
                          ✓ รหัส PIN ตรงกัน
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[#fca5a5]">
                          ✕ รหัส PIN ยังไม่ตรงกัน
                        </span>
                      )
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2, 3].map((idx) => (
                          <span
                            key={idx}
                            className={`h-2.5 w-2.5 rounded-full transition-colors ${
                              confirmPin.length > idx
                                ? "bg-[#2fbf71]"
                                : "bg-[#3d395a]"
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-[11px] font-bold text-[#9a93ad]">
                          {confirmPin.length}/4 หลัก
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showStudentPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => {
                        setConfirmPin(
                          e.target.value.replace(/\D/g, "").slice(0, 4)
                        );
                        clearFieldError("confirmPin");
                      }}
                      placeholder="กรอกรหัส PIN 4 หลักอีกครั้ง"
                      className={`w-full rounded-xl border bg-[#1c1b2b] px-3.5 py-2.5 pr-16 text-sm font-bold tracking-widest text-[#f4efe6] placeholder:tracking-normal placeholder:font-normal placeholder:text-[#9a93ad]/60 focus:bg-[#252238] focus:outline-hidden ${
                        fieldErrors.confirmPin
                          ? "border-[#c0283a] bg-[#2d141c]/30 focus:border-[#c0283a]"
                          : confirmPin.length === 4 && confirmPin === pin
                          ? "border-[#2fbf71]"
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
                  {fieldErrors.confirmPin && (
                    <p className="mt-1.5 text-xs font-bold text-[#fca5a5] flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{fieldErrors.confirmPin}</span>
                    </p>
                  )}
                </div>

                {/* 4. รหัสห้องเรียน (ไม่บังคับ) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#c4bdd6]">
                      4. รหัสห้องเรียนจากครู (ไม่บังคับ)
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
                    <strong className="text-[#c4bdd6]">รับทราบ</strong> ·
                    ระบบเก็บเฉพาะชื่อเล่นสมมติและรหัส PIN (ไม่เก็บข้อมูลส่วนตัวจริง)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="retro-button w-full rounded-xl bg-[#2fbf71] py-3 text-sm font-extrabold text-[#0b0b14] shadow-md hover:bg-[#34d37d] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isSubmitting
                    ? "กำลังสร้างบัญชีนักเรียน..."
                    : "สมัครสมาชิกนักเรียนและเริ่มลุยเลย"}
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#c4bdd6]">
                      ตั้งรหัสผ่าน (อย่างน้อย 4 ตัวอักษร · เข้ารหัส SHA-256)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2, 3].map((idx) => (
                        <span
                          key={idx}
                          className={`h-2.5 w-2.5 rounded-full transition-colors ${
                            password.length > idx
                              ? "bg-[#2fbf71]"
                              : "bg-[#3d395a]"
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-[11px] font-bold text-[#9a93ad]">
                        {Math.min(password.length, 4)}/4 หลัก
                      </span>
                    </div>
                  </div>
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

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#c4bdd6]">
                      ยืนยันรหัสผ่านอีกครั้ง
                    </label>
                    {confirmPassword.length > 0 && password.length >= 4 && (
                      confirmPassword === password ? (
                        <span className="text-[11px] font-bold text-[#86efac]">
                          ✓ รหัสผ่านตรงกัน
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[#fca5a5]">
                          ✕ รหัสผ่านยังไม่ตรงกัน
                        </span>
                      )
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showRegisterPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearFieldError("confirmPassword");
                      }}
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      className={`w-full rounded-xl border bg-[#1c1b2b] px-3.5 py-2.5 pr-16 text-sm font-bold text-[#f4efe6] placeholder:font-normal placeholder:text-[#9a93ad]/60 focus:bg-[#252238] focus:outline-hidden ${
                        fieldErrors.confirmPassword
                          ? "border-[#c0283a] bg-[#2d141c]/30 focus:border-[#c0283a]"
                          : confirmPassword.length >= 4 &&
                            confirmPassword === password
                          ? "border-[#2fbf71]"
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
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1.5 text-xs font-bold text-[#fca5a5] flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{fieldErrors.confirmPassword}</span>
                    </p>
                  )}
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
                    <strong className="text-[#c4bdd6]">รับทราบ</strong> ·
                    ระบบเก็บเฉพาะชื่อเล่นสมมติและรหัส PIN (ไม่เก็บข้อมูลส่วนตัวจริง)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="retro-button w-full rounded-xl bg-[#2fbf71] py-3 text-sm font-extrabold text-[#0b0b14] shadow-md hover:bg-[#34d37d] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isSubmitting
                    ? "กำลังสมัครบัญชีครู..."
                    : "สมัครบัญชีครูผู้สอนและเปิดห้องเรียน"}
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 border-t border-[#2f2d45] pt-5 flex flex-col gap-3">
            <p className="text-center text-xs text-[#9a93ad]">
              มีบัญชีอยู่แล้ว?{" "}
              <Link
                href={loginHref}
                className="font-extrabold text-[#ffe27a] underline hover:text-white"
              >
                ไปหน้าเข้าสู่ระบบ →
              </Link>
            </p>
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0b14] p-8 text-center text-sm text-[#9a93ad]">
          กำลังโหลดหน้าสมัครสมาชิก...
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
