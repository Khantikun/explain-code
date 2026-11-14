"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SiteHeader,
  getClientSession,
  ClientAuthSession,
} from "../components/SiteHeader";
import { useUiLanguage } from "../components/LanguageProvider";
import { Icon } from "../components/Icons";
import { ExplainCodeResult } from "../lib/explain-code";
import { appendLocalExplanationHistory } from "../lib/lms-data";
import { saveCustomDungeon } from "../lib/custom-dungeon";

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
    throw new Error("Unable to fetch user profile");
  }
  const data = await response.json();
  return data;
}`,
  java: `public class GradeCalculator {
  public static String getGrade(int score) {
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    return "F";
  }

  public static void main(String[] args) {
    int[] scores = {85, 72, 58};
    for (int s : scores) {
      System.out.println(s + " -> " + getGrade(s));
    }
  }
}`,
  cpp: `#include <iostream>
#include <vector>
using namespace std;

int sumEvenNumbers(const vector<int>& nums) {
  int total = 0;
  for (int n : nums) {
    if (n % 2 == 0) {
      total += n;
    }
  }
  return total;
}

int main() {
  vector<int> values = {3, 8, 11, 14, 6};
  cout << "Even sum: " << sumEvenNumbers(values) << endl;
  return 0;
}`,
  sql: `SELECT
  c.course_name,
  COUNT(e.student_id) AS total_students,
  ROUND(AVG(e.score), 2) AS avg_score
FROM courses c
JOIN enrollments e ON c.id = e.course_id
WHERE e.score >= 50
GROUP BY c.course_name
ORDER BY avg_score DESC;`,
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    .card { padding: 16px; border-radius: 12px; background: #1c1b2b; color: #f4efe6; }
    .badge { display: inline-block; padding: 4px 10px; background: #2fbf71; color: #0b0b14; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">New</span>
    <h2>ExplainCode Lesson</h2>
  </div>
</body>
</html>`,
};

export default function ExplainCodePage() {
  const router = useRouter();
  const { t, uiLang } = useUiLanguage();
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
  const [isCreatingDungeon, setIsCreatingDungeon] = useState<boolean>(false);
  const [dungeonError, setDungeonError] = useState<string | null>(null);

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
    setDungeonError(null);
    setQuotaExceeded(false);
    setSavedNotice(false);

    if (!code.trim()) {
      setError(
        t(
          "กรุณาวางโค้ดที่ต้องการให้อธิบายก่อนกดปุ่ม",
          "Please paste the code you want explained first."
        )
      );
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
          uiLang,
          userId: session?.userId || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("เกิดข้อผิดพลาดในการอธิบายโค้ด", "Failed to explain the code."));
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
      setError(
        t(
          "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง",
          "Unable to connect to the server. Please try again."
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDungeon = async () => {
    if (!code.trim() || !result) return;
    setDungeonError(null);
    setIsCreatingDungeon(true);
    try {
      const res = await fetch("/api/explain/to-dungeon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          uiLang,
          explanation: result,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.dungeon) {
        setDungeonError(
          data.error ||
            t(
              "ไม่สามารถสร้างดันเจี้ยนจากโค้ดนี้ได้",
              "Failed to generate a dungeon from this code."
            )
        );
        return;
      }

      saveCustomDungeon(data.dungeon);
      router.push(
        `/courses?lang=${encodeURIComponent(data.dungeon.language)}&customDungeon=${encodeURIComponent(data.dungeon.id)}`
      );
    } catch {
      setDungeonError(
        t(
          "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อสร้างดันเจี้ยนได้",
          "Unable to connect to the server to create the dungeon."
        )
      );
    } finally {
      setIsCreatingDungeon(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6] flex flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* Header Section */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3d395a] bg-[#1c1b2b] px-3 py-1 text-xs font-bold text-[#f6c945]">
              <Icon name="sparkles" className="h-3.5 w-3.5" />
              {t(
                "เครื่องมือช่วยแกะและอธิบายโค้ดทีละบรรทัด",
                "Line-by-Line Code Breakdown & Explainer"
              )}
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#f4efe6]">
              {t("อธิบายโค้ด (Code Explainer)", "Code Explainer")}
            </h1>
            <p className="mt-1 text-sm text-[#9a93ad]">
              {t(
                "วางโค้ดที่คุณได้จาก AI หรือโค้ดที่กำลังศึกษา ระบบจะช่วยสรุปภาพรวม แยกอธิบายทีละบรรทัด และชี้จุดที่ควรระวัง",
                "Paste AI-generated code or any snippet you are studying. Get a clear overview, line-by-line explanation, and key pitfalls."
              )}
            </p>
          </div>

          {session ? (
            <Link
              href="/my-history"
              className="inline-flex shrink-0 self-start md:self-auto items-center gap-2 rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-4 py-2.5 text-xs font-bold text-[#f6c945] shadow-md hover:border-[#f6c945] hover:bg-[#252238] transition-colors whitespace-nowrap"
            >
              <Icon name="clock" className="h-4 w-4" />
              <span>{t("ดูประวัติการอธิบายโค้ดของฉัน", "View My Explanation History")}</span>
            </Link>
          ) : (
            <div className="shrink-0 self-start md:self-auto rounded-xl border border-[#2f2d45] bg-[#141220] px-4 py-2.5 text-xs text-[#c4bdd6] shadow-md">
              <span className="font-bold text-[#f6c945]">
                {t("โหมดผู้เยี่ยมชม (ใช้ฟรี 5 ครั้ง/วัน)", "Guest Mode (5 free uses/day)")}
              </span>
              {guestQuota && (
                <span className="ml-2 rounded-md border border-[#3d395a] bg-[#1c1b2b] px-2 py-0.5 font-mono font-bold text-[#f4efe6]">
                  {t(
                    `คงเหลือ ${guestQuota.remaining}/${guestQuota.limit} ครั้ง`,
                    `${guestQuota.remaining}/${guestQuota.limit} left`
                  )}
                </span>
              )}
              <div className="mt-1">
                <Link
                  href="/login?redirect=/explain"
                  className="font-bold text-[#2fbf71] underline hover:text-[#34d37d]"
                >
                  {t("เข้าสู่ระบบ", "Log in")}
                </Link>{" "}
                {t(
                  "เพื่อใช้งานไม่จำกัดและบันทึกประวัติอัตโนมัติ",
                  "for unlimited access and automatic history saving"
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Code Input */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-5 shadow-lg">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#9a93ad]">
                  {t("1. เลือกภาษาโปรแกรม", "1. Select Programming Language")}
                </label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3.5 py-2 text-xs font-bold text-[#f4efe6] focus:border-[#f6c945] focus:outline-hidden"
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#9a93ad]">
                  {t("2. วางโค้ดที่ต้องการให้อธิบาย", "2. Paste Code to Explain")}
                </label>
                <div className="flex items-center gap-3">
                  {SAMPLE_SNIPPETS[language] && (
                    <button
                      type="button"
                      onClick={() => setCode(SAMPLE_SNIPPETS[language])}
                      className="text-[11px] font-semibold text-[#f6c945] underline hover:text-[#ffe27a] cursor-pointer whitespace-nowrap"
                    >
                      {t("ใช้โค้ดตัวอย่าง", "Load Sample")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCode("")}
                    className="text-[11px] font-semibold text-[#9a93ad] hover:text-[#fca5a5] cursor-pointer whitespace-nowrap"
                  >
                    {t("ล้างโค้ด", "Clear")}
                  </button>
                </div>
              </div>

              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={13}
                placeholder={t("วางโค้ดของคุณที่นี่...", "Paste your code here...")}
                className="w-full rounded-xl border border-[#3d395a] bg-[#120f1c] p-4 font-mono text-xs leading-relaxed text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:ring-1 focus:ring-[#f6c945] focus:outline-hidden"
              />

              {error && (
                <div className="mt-4 rounded-xl border border-[#c0283a]/50 bg-[#2d141c] p-3.5 text-xs font-medium text-[#fca5a5]">
                  <p>{error}</p>
                  {quotaExceeded && (
                    <Link
                      href="/login?redirect=/explain"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#c0283a] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#dc3548]"
                    >
                      {t("เข้าสู่ระบบ / สมัครสมาชิกเพื่อใช้งานต่อ", "Log in / Sign up to continue")}
                    </Link>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleExplain}
                disabled={isLoading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2fbf71] py-3.5 text-sm font-extrabold text-[#0b0b14] shadow-md hover:bg-[#34d37d] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <Icon name="sparkles" className="h-4 w-4" />
                <span>
                  {isLoading
                    ? t("กำลังวิเคราะห์และอธิบายโค้ด...", "Analyzing & explaining code...")
                    : t("อธิบายโค้ด", "Explain Code")}
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Explanation Output */}
          <div className="lg:col-span-7">
            {isLoading ? (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-2xl border border-[#2f2d45] bg-[#141220] p-8 text-center shadow-lg">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2f2d45] border-t-[#f6c945]" />
                <p className="mt-4 text-sm font-bold text-[#f4efe6]">
                  {t(
                    "กำลังแกะโครงสร้างและอธิบายโค้ดทีละบรรทัด...",
                    "Breaking down structure and explaining line by line..."
                  )}
                </p>
                <p className="mt-1 text-xs text-[#9a93ad]">
                  {t(
                    "ระบบกำลังสรุปแนวคิดสำคัญ ขั้นตอนการทำงาน และจุดที่ควรระวัง",
                    "Summarizing key concepts, execution flow, and potential pitfalls."
                  )}
                </p>
              </div>
            ) : result ? (
              <div className="space-y-5">
                {savedNotice && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2fbf71]/40 bg-[#102a1e] px-4 py-3 text-xs font-semibold text-[#86efac]">
                    <span>
                      {t(
                        "บันทึกคำอธิบายโค้ดนี้ลงใน “ประวัติของฉัน” เรียบร้อยแล้ว",
                        "Saved this explanation to “My History”."
                      )}
                    </span>
                    <Link
                      href="/my-history"
                      className="underline font-bold hover:text-[#bbf7d0] whitespace-nowrap"
                    >
                      {t("เปิดดูประวัติ →", "Open History →")}
                    </Link>
                  </div>
                )}

                {/* 1. ภาพรวมของโค้ด */}
                <div className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-6 shadow-lg">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h2 className="text-base font-bold text-[#f4efe6] flex items-center gap-2">
                      <Icon name="book" className="h-4 w-4 text-[#f6c945]" />
                      <span>{t("สรุปภาพรวมการทำงาน", "Code Summary")}</span>
                    </h2>
                    <span className="rounded-lg border border-[#9b5de5]/40 bg-[#5a2d91]/30 px-2.5 py-1 text-[11px] font-bold uppercase text-[#ffe27a]">
                      {result.language}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#e8e1cf]">
                    {result.summary}
                  </p>

                  {/* แนวคิดสำคัญ */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.keyConcepts.map((concept, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg border border-[#3d395a] bg-[#1c1b2b] px-2.5 py-1 text-xs font-semibold text-[#c084fc]"
                      >
                        #{concept}
                      </span>
                    ))}
                  </div>

                  {/* ปุ่มเปลี่ยนโค้ดเป็นดันเจี้ยน */}
                  <div className="mt-5 pt-4 border-t border-[#2f2d45] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-[#c4bdd6]">
                      <span className="font-bold text-[#ffe27a]">
                        {t(
                          "อยากทดสอบความเข้าใจโค้ดนี้แบบเกม RPG?",
                          "Want to test your understanding in an RPG Dungeon?"
                        )}
                      </span>
                      <p className="text-[11px] text-[#9a93ad] mt-0.5">
                        {t(
                          "ระบบจะสร้างด่านถาม-ตอบ 3 เฟสจากโค้ดชุดนี้ให้คุณลุยทันที",
                          "Generates a 3-phase battle challenge directly from this code."
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateDungeon}
                      disabled={isCreatingDungeon}
                      className="retro-button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#9b5de5] hover:bg-[#b07af0] px-4 py-2.5 text-xs font-extrabold text-white shadow-md disabled:opacity-60 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <Icon name="gamepad" className="h-4 w-4" />
                      <span>
                        {isCreatingDungeon
                          ? t("กำลังสร้างดันเจี้ยน...", "Generating Dungeon...")
                          : t("สร้างดันเจี้ยนจากโค้ดนี้ →", "Play as Dungeon →")}
                      </span>
                    </button>
                  </div>
                  {dungeonError && (
                    <p className="mt-2 text-xs font-medium text-[#fca5a5]">
                      {dungeonError}
                    </p>
                  )}
                </div>

                {/* 2. ลำดับขั้นตอนการทำงาน */}
                <div className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-6 shadow-lg">
                  <h3 className="text-sm font-bold text-[#f4efe6] mb-3 flex items-center gap-2">
                    <Icon name="play" className="h-4 w-4 text-[#2fbf71]" />
                    <span>{t("ลำดับขั้นตอนการทำงาน (Execution Flow)", "Execution Flow")}</span>
                  </h3>
                  <ul className="space-y-2 text-xs sm:text-sm text-[#e8e1cf]">
                    {result.stepByStepFlow.map((step, idx) => (
                      <li
                        key={idx}
                        className="rounded-xl border border-[#2f2d45] bg-[#1c1b2b] px-3.5 py-2.5 text-[#f4efe6]"
                      >
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. คำอธิบายทีละบรรทัด */}
                <div className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-6 shadow-lg">
                  <h3 className="text-sm font-bold text-[#f4efe6] mb-3 flex items-center gap-2">
                    <Icon name="code" className="h-4 w-4 text-[#f6c945]" />
                    <span>{t("แกะโค้ดทีละบรรทัด (Line-by-Line Explanation)", "Line-by-Line Explanation")}</span>
                  </h3>
                  <div className="space-y-3">
                    {result.lineByLine.map((item) => (
                      <div
                        key={item.lineNumber}
                        className="rounded-xl border border-[#2f2d45] bg-[#1c1b2b] p-3.5 transition-all hover:border-[#9b5de5]"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-md border border-[#9b5de5]/50 bg-[#5a2d91] px-1.5 font-mono text-[11px] font-bold text-[#ffe27a]">
                            L{item.lineNumber}
                          </span>
                          <div className="flex-1 overflow-x-auto rounded-lg border border-[#2f2d45] bg-[#120f1c] px-2.5 py-1">
                            <code className="font-mono text-xs font-semibold text-[#f4efe6]">
                              {item.code}
                            </code>
                          </div>
                        </div>
                        <p className="mt-2 pl-9 text-xs leading-relaxed text-[#c4bdd6]">
                          → {item.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. จุดที่ควรระวัง */}
                <div className="rounded-2xl border border-[#f6c945]/40 bg-[#281d08] p-5 shadow-lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#f6c945] mb-2 flex items-center gap-1.5">
                    <Icon name="alert" className="h-4 w-4 text-[#f6c945]" />
                    <span>{t("จุดสังเกตและสิ่งที่ควรระวัง (Pitfalls & Tips)", "Pitfalls & Tips")}</span>
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[#ffe27a] leading-relaxed">
                    {result.potentialPitfalls.map((pitfall, idx) => (
                      <li key={idx}>{pitfall}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#3d395a] bg-[#141220] p-8 text-center shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3d395a] bg-[#1c1b2b] text-[#f6c945]">
                  <Icon name="code" className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-base font-bold text-[#f4efe6]">
                  {t("พร้อมช่วยคุณแกะและอธิบายโค้ด", "Ready to Break Down Your Code")}
                </h2>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-[#9a93ad]">
                  {t(
                    "วางโค้ดทางด้านซ้าย เลือกภาษาโปรแกรม แล้วกดปุ่ม “อธิบายโค้ด” เพื่อดูคำอธิบายแบบละเอียดทีละบรรทัด",
                    "Paste your code on the left, choose the language, and click “Explain Code” for a detailed line-by-line breakdown."
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
