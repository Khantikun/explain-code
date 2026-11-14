"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader, setClientSession } from "../components/SiteHeader";
import { Icon } from "../components/Icons";
import { INITIAL_STUDENTS, INITIAL_TEACHERS } from "../lib/curriculum";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "";
  const modeParam = searchParams.get("mode");
  const roleParam = searchParams.get("role");

  useEffect(() => {
    if (modeParam === "register") {
      const params = new URLSearchParams();
      if (redirectPath) params.set("redirect", redirectPath);
      if (roleParam) params.set("role", roleParam);
      const qs = params.toString();
      router.replace(qs ? `/register?${qs}` : "/register");
    }
  }, [modeParam, redirectPath, roleParam, router]);

  // Unified Login fields (ตรวจ Role นักเรียน/ครู จากฐานข้อมูลและในเครื่องอัตโนมัติ)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginSecret, setLoginSecret] = useState("");
  const [showLoginSecret, setShowLoginSecret] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (fieldKey: string) => {
    setFieldErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

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

  /**
   * ฟังก์ชันเข้าสู่ระบบแบบรวมศูนย์
   */
  const executeUnifiedLogin = async (idToUse: string, secretToUse: string) => {
    setMessage(null);
    setFieldErrors({});

    const cleanId = idToUse.trim();
    const cleanSecret = secretToUse.trim();

    const newErrors: Record<string, string> = {};
    if (!cleanId) {
      newErrors.loginIdentifier =
        "กรุณากรอกชื่อเล่นสมมติ (นักเรียน) หรือชื่อผู้ใช้ (ครู)";
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
          text: data.error || "ไม่พบบัญชีผู้ใช้ หรือรหัสผ่าน/PIN ไม่ถูกต้อง",
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
        navigateAfterAuth("teacher");
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

  const registerHref = (() => {
    const params = new URLSearchParams();
    if (redirectPath) params.set("redirect", redirectPath);
    if (roleParam) params.set("role", roleParam);
    const qs = params.toString();
    return qs ? `/register?${qs}` : "/register";
  })();

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
            href={registerHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2fbf71]/70 bg-[#102a1e] px-4 py-2 text-xs sm:text-sm font-extrabold text-[#86efac] hover:bg-[#153827] transition-colors"
          >
            <Icon name="user" className="h-4 w-4" />
            <span>ยังไม่มีบัญชี? สมัครสมาชิก →</span>
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
              เข้าสู่ระบบ
            </h1>
            <p className="mt-1 text-sm text-[#9a93ad]">
              ใช้ชื่อเล่นสมมติหรือชื่อผู้ใช้ ระบบตรวจสอบบทบาท (นักเรียน/ครู) ให้อัตโนมัติ
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
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3].map((idx) => (
                      <span
                        key={idx}
                        className={`h-2.5 w-2.5 rounded-full transition-colors ${
                          loginSecret.length > idx
                            ? "bg-[#2fbf71]"
                            : "bg-[#3d395a]"
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-[11px] font-bold text-[#9a93ad]">
                      {Math.min(loginSecret.length, 4)}/4 หลัก
                    </span>
                  </div>
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
                <span>
                  {isSubmitting ? "กำลังตรวจสอบสิทธิ์..." : "เข้าสู่ระบบ"}
                </span>
              </button>
            </form>
          </div>

          <div className="mt-6 border-t border-[#2f2d45] pt-5 flex flex-col gap-3">
            <p className="text-center text-xs text-[#9a93ad]">
              ยังไม่มีบัญชีใช่ไหม?{" "}
              <Link
                href={registerHref}
                className="font-extrabold text-[#86efac] underline hover:text-white"
              >
                ไปหน้าสมัครสมาชิกใหม่ →
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
