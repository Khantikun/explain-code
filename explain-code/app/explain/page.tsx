"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  SiteHeader,
  getClientSession,
  ClientAuthSession,
} from "../components/SiteHeader";
import { Icon } from "../components/Icons";
import { ExplainCodeResult } from "../lib/explain-code";
import { appendLocalExplanationHistory } from "../lib/lms-data";

const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C / C++" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML / CSS" },
];

const SAMPLE_SNIPPETS: Record<string, string> = {
  javascript: `function calculateDiscount(prices, isMember) {
  let subtotal = 0;
  for (let i = 0; i < prices.length; i++) {
    subtotal += prices[i];
  }
  if (isMember && subtotal >= 500) {
    return subtotal * 0.85;
  }
  return subtotal;
}
console.log(calculateDiscount([200, 350, 100], true));`,
  python: `def filter_passed_students(scores):
    passed = []
    for name, score in scores.items():
        if score >= 60:
            passed.append(name)
    return passed

print(filter_passed_students({"Tonkla": 78, "Mali": 52, "Namo": 90}))`,
  typescript: `async function fetchUserProfile(userId: string) {
  const response = await fetch(\`/api/users/\${userId}\`);
  if (!response.ok) {
    throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
  }
  const data = await response.json();
  return data;
}`,
};

export default function ExplainCodePage() {
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [language, setLanguage] = useState<string>("javascript");
  const [code, setCode] = useState<string>(SAMPLE_SNIPPETS.javascript);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [guestQuota, setGuestQuota] = useState<{
    limit: number;
    used: number;
    remaining: number;
  } | null>(null);
  const [result, setResult] = useState<ExplainCodeResult | null>(null);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    setSession(getClientSession());
    const onAuthChange = () => setSession(getClientSession());
    window.addEventListener("explain-code-auth-change", onAuthChange);
    return () =>
      window.removeEventListener("explain-code-auth-change", onAuthChange);
  }, []);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (SAMPLE_SNIPPETS[newLang] && (!code.trim() || Object.values(SAMPLE_SNIPPETS).includes(code))) {
      setCode(SAMPLE_SNIPPETS[newLang]);
    }
  };

  const handleExplain = async () => {
    setError(null);
    setQuotaExceeded(false);
    setSavedNotice(false);

    if (!code.trim()) {
      setError("กรุณาวางโค้ดที่ต้องการให้อธิบายก่อนกดปุ่ม");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          userId: session?.userId || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "เกิดข้อผิดพลาดในการอธิบายโค้ด");
        if (data.quotaExceeded) {
          setQuotaExceeded(true);
        }
        return;
      }

      setResult(data.explanation);
      if (data.guestQuota) {
        setGuestQuota(data.guestQuota);
      }

      if (session?.userId && data.savedHistoryItem) {
        appendLocalExplanationHistory(data.savedHistoryItem);
        setSavedNotice(true);
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header Section */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0ec] px-3 py-1 text-xs font-bold text-[#2a4d3e]">
              <Icon name="sparkles" className="h-3.5 w-3.5" />
              เครื่องมือช่วยแกะและอธิบายโค้ดทีละบรรทัด
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#1e1e1c]">
              อธิบายโค้ด (Code Explainer)
            </h1>
            <p className="mt-1 text-sm text-[#524f49]">
              วางโค้ดที่คุณได้จาก AI หรือโค้ดที่กำลังศึกษา ระบบจะช่วยสรุปภาพรวม แยกอธิบายทีละบรรทัด และชี้จุดที่ควรระวัง
            </p>
          </div>

          {session ? (
            <Link
              href="/my-history"
              className="inline-flex items-center gap-2 rounded-xl border border-[#d8d1c5] bg-white px-4 py-2.5 text-xs font-bold text-[#2a4d3e] shadow-2xs hover:bg-[#f2efe8] transition-colors"
            >
              <Icon name="clock" className="h-4 w-4" />
              <span>ดูประวัติการอธิบายโค้ดของฉัน</span>
            </Link>
          ) : (
            <div className="rounded-xl border border-[#e5dfd3] bg-white px-4 py-2.5 text-xs text-[#524f49] shadow-2xs">
              <span className="font-bold text-[#2a4d3e]">โหมดผู้เยี่ยมชม (ใช้ฟรี 5 ครั้ง/วัน)</span>
              {guestQuota && (
                <span className="ml-2 rounded-md bg-[#f4f1ea] px-2 py-0.5 font-mono font-bold text-[#1e1e1c]">
                  คงเหลือ {guestQuota.remaining}/{guestQuota.limit} ครั้ง
                </span>
              )}
              <div className="mt-1">
                <Link
                  href="/login?redirect=/explain"
                  className="font-bold text-[#2a4d3e] underline hover:text-[#1f3b2f]"
                >
                  เข้าสู่ระบบ
                </Link>{" "}
                เพื่อใช้งานไม่จำกัดและบันทึกประวัติอัตโนมัติ
              </div>
            </div>
          )}
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Code Input */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#e5dfd3] bg-white p-5 shadow-xs">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#524f49]">
                  1. เลือกภาษาโปรแกรม
                </label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2 text-xs font-bold text-[#1e1e1c] focus:border-[#2a4d3e] focus:outline-hidden"
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#524f49]">
                  2. วางโค้ดที่ต้องการให้อธิบาย
                </label>
                <div className="flex items-center gap-2">
                  {SAMPLE_SNIPPETS[language] && (
                    <button
                      type="button"
                      onClick={() => setCode(SAMPLE_SNIPPETS[language])}
                      className="text-[11px] font-semibold text-[#2a4d3e] underline hover:text-[#1f3b2f] cursor-pointer"
                    >
                      ใช้โค้ดตัวอย่าง
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCode("")}
                    className="text-[11px] font-semibold text-[#6e6a63] hover:text-[#991b1b] cursor-pointer"
                  >
                    ล้างโค้ด
                  </button>
                </div>
              </div>

              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={13}
                placeholder="วางโค้ดของคุณที่นี่..."
                className="w-full rounded-xl border border-[#d8d1c5] bg-[#1e1e1c] p-4 font-mono text-xs leading-relaxed text-[#f8f8f2] focus:border-[#2a4d3e] focus:outline-hidden"
              />

              {error && (
                <div className="mt-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3.5 text-xs font-medium text-[#991b1b]">
                  <p>{error}</p>
                  {quotaExceeded && (
                    <Link
                      href="/login?redirect=/explain"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#991b1b] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#7f1d1d]"
                    >
                      เข้าสู่ระบบ / สมัครสมาชิกเพื่อใช้งานต่อ
                    </Link>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleExplain}
                disabled={isLoading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2a4d3e] py-3.5 text-sm font-bold text-white shadow-xs hover:bg-[#1f3b2f] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <Icon name="sparkles" className="h-4 w-4" />
                <span>
                  {isLoading ? "กำลังวิเคราะห์และอธิบายโค้ด..." : "อธิบายโค้ด"}
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Explanation Output */}
          <div className="lg:col-span-7">
            {isLoading ? (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-2xl border border-[#e5dfd3] bg-white p-8 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e8f0ec] border-t-[#2a4d3e]" />
                <p className="mt-4 text-sm font-bold text-[#1e1e1c]">
                  กำลังแกะโครงสร้างและอธิบายโค้ดทีละบรรทัด...
                </p>
                <p className="mt-1 text-xs text-[#6e6a63]">
                  ระบบกำลังสรุปแนวคิดสำคัญ ขั้นตอนการทำงาน และจุดที่ควรระวัง
                </p>
              </div>
            ) : result ? (
              <div className="space-y-5">
                {savedNotice && (
                  <div className="flex items-center justify-between rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-xs font-semibold text-[#166534]">
                    <span>บันทึกคำอธิบายโค้ดนี้ลงใน &ldquo;ประวัติของฉัน&rdquo; เรียบร้อยแล้ว</span>
                    <Link
                      href="/my-history"
                      className="underline font-bold hover:text-[#14532d]"
                    >
                      เปิดดูประวัติ →
                    </Link>
                  </div>
                )}

                {/* 1. ภาพรวมของโค้ด */}
                <div className="rounded-2xl border border-[#e5dfd3] bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h2 className="text-base font-bold text-[#1e1e1c] flex items-center gap-2">
                      <Icon name="book" className="h-4 w-4 text-[#2a4d3e]" />
                      <span>สรุปภาพรวมการทำงาน</span>
                    </h2>
                    <span className="rounded-lg bg-[#e8f0ec] px-2.5 py-1 text-[11px] font-bold uppercase text-[#2a4d3e]">
                      {result.language}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#3d3b36]">
                    {result.summary}
                  </p>

                  {/* แนวคิดสำคัญ */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.keyConcepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg border border-[#d8d1c5] bg-[#faf8f4] px-2.5 py-1 text-xs font-semibold text-[#2a4d3e]"
                      >
                        #{concept}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 2. ลำดับขั้นตอนการทำงาน */}
                <div className="rounded-2xl border border-[#e5dfd3] bg-white p-6 shadow-xs">
                  <h3 className="text-sm font-bold text-[#1e1e1c] mb-3 flex items-center gap-2">
                    <Icon name="play" className="h-4 w-4 text-[#2a4d3e]" />
                    <span>ลำดับขั้นตอนการทำงาน (Execution Flow)</span>
                  </h3>
                  <ul className="space-y-2 text-xs sm:text-sm text-[#3d3b36]">
                    {result.stepByStepFlow.map((step, idx) => (
                      <li
                        key={idx}
                        className="rounded-xl bg-[#faf8f4] px-3.5 py-2.5 border border-[#ece7dc]"
                      >
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. คำอธิบายทีละบรรทัด */}
                <div className="rounded-2xl border border-[#e5dfd3] bg-white p-6 shadow-xs">
                  <h3 className="text-sm font-bold text-[#1e1e1c] mb-3 flex items-center gap-2">
                    <Icon name="code" className="h-4 w-4 text-[#2a4d3e]" />
                    <span>แกะโค้ดทีละบรรทัด (Line-by-Line Explanation)</span>
                  </h3>
                  <div className="space-y-2.5">
                    {result.lineByLine.map((item) => (
                      <div
                        key={item.lineNumber}
                        className="rounded-xl border border-[#e5dfd3] bg-[#faf8f4] p-3.5"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-md bg-[#2a4d3e] px-1.5 font-mono text-[11px] font-bold text-white">
                            L{item.lineNumber}
                          </span>
                          <code className="flex-1 overflow-x-auto font-mono text-xs font-semibold text-[#1e1e1c]">
                            {item.code}
                          </code>
                        </div>
                        <p className="mt-2 pl-9 text-xs leading-relaxed text-[#524f49]">
                          → {item.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. จุดที่ควรระวัง */}
                <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#92400e] mb-2 flex items-center gap-1.5">
                    <Icon name="alert" className="h-4 w-4" />
                    <span>จุดสังเกตและสิ่งที่ควรระวัง (Pitfalls &amp; Tips)</span>
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[#78350f]">
                    {result.potentialPitfalls.map((pitfall, idx) => (
                      <li key={idx}>{pitfall}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8d1c5] bg-white/70 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f0ec] text-[#2a4d3e]">
                  <Icon name="code" className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-base font-bold text-[#1e1e1c]">
                  พร้อมช่วยคุณแกะและอธิบายโค้ด
                </h2>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-[#6e6a63]">
                  วางโค้ดทางด้านซ้าย เลือกภาษาโปรแกรม แล้วกดปุ่ม &ldquo;อธิบายโค้ด&rdquo; เพื่อดูคำอธิบายแบบละเอียดทีละบรรทัด
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
