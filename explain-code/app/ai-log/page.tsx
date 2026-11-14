"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";
import { Icon } from "../components/Icons";
import { AI_USAGE_LOGS, AiUsageLogItem } from "../lib/curriculum";

type FilterCategory = "all" | AiUsageLogItem["category"];

export default function AiUsageLogPage() {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [copiedReport, setCopiedReport] = useState(false);

  const filteredLogs =
    selectedCategory === "all"
      ? AI_USAGE_LOGS
      : AI_USAGE_LOGS.filter((item) => item.category === selectedCategory);

  const handleCopyFullReport = () => {
    const lines: string[] = [
      "บันทึกการใช้ AI (AI Usage Log) — โครงการ โค้ดนี้ฉันอธิบายได้ (ExplainCode)",
      "การแข่งขัน Vibe Coding 2026: Innovating Classrooms for a Sustainable Future",
      "==================================================================",
      "",
    ];

    AI_USAGE_LOGS.forEach((log) => {
      lines.push(`${log.promptTitle}`);
      lines.push(`- หมวดหมู่: ${log.categoryLabel}`);
      lines.push(`- เครื่องมือ AI ที่ใช้: ${log.aiTool}`);
      lines.push(`- คำสั่ง (Prompt) ที่ใช้จริง: ${log.promptText}`);
      lines.push(`- ปัญหาที่พบจากผลลัพธ์ของ AI: ${log.problemFound}`);
      lines.push(`- วิธีการปรับปรุงแก้ไขของทีม: ${log.solutionApplied}`);
      lines.push(`- คำอธิบายโครงสร้างและการทำงานของโค้ด: ${log.codeExplanation}`);
      lines.push(`- ไฟล์ที่เกี่ยวข้อง: ${log.relatedFiles.join(", ")}`);
      lines.push("");
    });

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6] flex flex-col">
      <div className="no-print">
        <SiteHeader />
      </div>

      <main className="mx-auto flex-1 max-w-5xl w-full px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-6">
        {/* Header Banner */}
        <section className="rounded-2xl border-2 border-[#2f2d45] bg-[#141220] p-6 sm:p-8 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#25193b] border border-[#9b5de5]/60 px-3.5 py-1 text-xs font-extrabold text-[#ffe27a]">
                <Icon name="clipboard" className="h-3.5 w-3.5 text-[#f6c945]" />
                <span>เอกสารส่งมอบรายการที่ 4 · บันทึกการใช้ AI (AI Usage Log)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#f4efe6]">
                บันทึกการใช้ AI พัฒนาโปรเจกต์ &ldquo;โค้ดนี้ฉันอธิบายได้&rdquo;
              </h1>
              <p className="text-sm text-[#9a93ad] leading-relaxed">
                รวบรวมคำสั่ง (Prompt) ที่ใช้จริงในการพัฒนาระบบและสร้างภาพประกอบ/ไอคอน พร้อมระบุเครื่องมือ AI ที่ใช้ ปัญหาที่พบจากผลลัพธ์ของ AI วิธีการปรับปรุงแก้ไขของทีม และคำอธิบายโครงสร้างการทำงานของโค้ดตามกติกาการแข่งขัน Vibe Coding 2026 (หน้า 4–5)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 no-print">
              <button
                type="button"
                onClick={handleCopyFullReport}
                className="retro-button inline-flex items-center gap-2 rounded-xl bg-[#f6c945] px-4 py-2.5 text-xs sm:text-sm font-extrabold text-[#120f1c] hover:bg-[#ffe27a] transition-colors cursor-pointer"
              >
                <Icon name="clipboard" className="h-4 w-4" />
                <span>
                  {copiedReport
                    ? "คัดลอกบันทึก AI ทั้งหมดแล้ว!"
                    : "คัดลอกรายงาน AI Log"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-4 py-2.5 text-xs sm:text-sm font-bold text-[#f4efe6] hover:border-[#f6c945]/70 hover:bg-[#252238] transition-colors cursor-pointer"
              >
                <span>พิมพ์ / บันทึก PDF</span>
              </button>
            </div>
          </div>

          {/* Compliance Summary Strip */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-5 border-t border-[#2f2d45]">
            <div className="rounded-xl bg-[#1c1b2b] border border-[#2f2d45] p-3.5 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#281d08] border border-[#f6c945]/50 text-[#f6c945]">
                <Icon name="sparkles" className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#9a93ad]">จำนวน Prompt ที่บันทึก</div>
                <div className="text-base font-extrabold text-[#ffe27a]">
                  {AI_USAGE_LOGS.length} รายการ (เกณฑ์ขั้นต่ำ ≥ 5)
                </div>
                <div className="text-[11px] text-[#c4bdd6] mt-0.5">
                  ระบุเครื่องมือ AI ปัญหา และวิธีแก้ครบทุกข้อ
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#1c1b2b] border border-[#2f2d45] p-3.5 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#102a1e] border border-[#2fbf71]/50 text-[#86efac]">
                <Icon name="shield" className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#9a93ad]">ความปลอดภัย &amp; PDPA</div>
                <div className="text-base font-extrabold text-[#86efac]">
                  ซ่อน API Key &amp; ใช้ชื่อสมมติ
                </div>
                <div className="text-[11px] text-[#c4bdd6] mt-0.5">
                  เรียก AI เฉพาะฝั่ง Server + แฮช PIN SHA-256
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#1c1b2b] border border-[#2f2d45] p-3.5 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-[#0d0b14] border border-[#f6c945]/60">
                <Image
                  src="/logo.png"
                  alt="โลโก้ โค้ดนี้ฉันอธิบายได้"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-[#9a93ad]">ทรัพย์สินภาพและไอคอน AI</div>
                <div className="text-base font-extrabold text-[#f4efe6]">
                  บันทึก logo.png &amp; Favicon
                </div>
                <div className="text-[11px] text-[#c4bdd6] mt-0.5">
                  ตามกติกาข้อ 2.2 หน้า 4 + สไปรต์โค้ด CC0
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category Filter Tabs */}
        <section className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all" as const, label: `ทั้งหมด (${AI_USAGE_LOGS.length})` },
              { id: "architecture" as const, label: "สถาปัตยกรรมการเรียนรู้" },
              { id: "code" as const, label: "เอนจินรันโค้ด & เกม RPG" },
              { id: "security" as const, label: "API หลังบ้าน & PDPA" },
              { id: "ui" as const, label: "แดชบอร์ดครู & UI" },
              { id: "asset" as const, label: "โลโก้ & ไอคอน AI (logo.png)" },
            ].map((tab) => {
              const active = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    active
                      ? "bg-[#5a2d91] text-[#ffe27a] border border-[#f6c945]/80"
                      : "bg-[#141220] hover:bg-[#1c1b2b] text-[#c4bdd6] border border-[#2f2d45]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <Link
            href="/dungeon/credits"
            className="text-xs font-bold text-[#ffe27a] hover:underline flex items-center gap-1"
          >
            <span>ดูรายละเอียดลิขสิทธิ์ทรัพย์สิน (Credits &amp; CC0) →</span>
          </Link>
        </section>

        {/* AI Usage Log Cards */}
        <section className="space-y-5">
          {filteredLogs.map((log) => (
            <article
              key={log.id}
              className="rounded-2xl border-2 border-[#2f2d45] bg-[#141220] p-5 sm:p-6 flex flex-col gap-4 shadow-md"
            >
              {/* Top Row: Title + Category + AI Tool Badge */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#2f2d45] pb-3.5">
                <div>
                  <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-[#c084fc]">
                    {log.categoryLabel}
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#ffe27a] mt-0.5">
                    {log.promptTitle}
                  </h2>
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl bg-[#1c1b2b] border border-[#3d395a] px-3 py-1.5 text-xs font-bold text-[#f4efe6]">
                  <Icon name="sparkles" className="h-3.5 w-3.5 text-[#f6c945] shrink-0" />
                  <span>เครื่องมือ AI: {log.aiTool}</span>
                </div>
              </div>

              {/* Special Visual Preview for Prompt 7 (logo.png & Favicon) */}
              {log.category === "asset" && (
                <div className="rounded-xl bg-[#1c1b2b] border border-[#f6c945]/40 p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="h-16 w-16 rounded-2xl bg-[#0d0b14] border-2 border-[#f6c945] p-1.5 flex items-center justify-center shadow-md">
                      <Image
                        src="/logo.png"
                        alt="ตัวอย่างโลโก้ logo.png"
                        width={64}
                        height={64}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-[#0d0b14] border border-[#3d395a] p-1 flex items-center justify-center">
                      <Image
                        src="/logo.png"
                        alt="ตัวอย่าง Favicon 32x32"
                        width={32}
                        height={32}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-[#c4bdd6] space-y-1">
                    <div className="font-extrabold text-[#ffe27a]">
                      บันทึกการใช้ Generative AI สร้างภาพประกอบและไอคอนตามกติกาข้อ 2.2 (หน้า 4)
                    </div>
                    <p>
                      ไฟล์ต้นฉบับ <code className="text-[#f4efe6]">public/logo.png</code> ถูกนำไปแปลงด้วยสคริปต์รักษาสัดส่วนภาพ (Square Padding + LANCZOS Resampling) เพื่อสร้าง <code className="text-[#f4efe6]">app/favicon.ico</code> (16×16, 32×32, 48×48, 64×64), <code className="text-[#f4efe6]">app/icon.png</code> (192×192) และ <code className="text-[#f4efe6]">app/apple-icon.png</code> (180×180)
                    </p>
                  </div>
                </div>
              )}

              {/* Prompt Text */}
              <div className="rounded-xl bg-[#0d0b14] border border-[#2f2d45] p-4 text-sm text-[#f4efe6] leading-relaxed">
                <div className="text-xs font-extrabold text-[#c084fc] mb-1">
                  คำสั่ง (Prompt) ที่ใช้สั่งงาน AI จริง:
                </div>
                <p className="font-medium">&ldquo;{log.promptText}&rdquo;</p>
              </div>

              {/* Problem Found & Solution Applied */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div className="rounded-xl bg-[#2d141c] border border-[#c0283a]/50 p-4 text-[#fca5a5]">
                  <div className="font-extrabold flex items-center gap-1.5 mb-1">
                    <span>⚠️ ปัญหา/ข้อจำกัดที่พบจากผลลัพธ์ของ AI:</span>
                  </div>
                  <p className="text-[#f4efe6]/90 leading-relaxed">{log.problemFound}</p>
                </div>

                <div className="rounded-xl bg-[#102a1e] border border-[#2fbf71]/50 p-4 text-[#86efac]">
                  <div className="font-extrabold flex items-center gap-1.5 mb-1">
                    <span>🛠️ วิธีการที่ทีมปรับปรุงแก้ไขและพัฒนาต่อ:</span>
                  </div>
                  <p className="text-[#f4efe6]/90 leading-relaxed">{log.solutionApplied}</p>
                </div>
              </div>

              {/* Code Structure & Explanation (Rubric Part 4: 10 points) */}
              <div className="rounded-xl bg-[#1c1b2b] border border-[#3d395a] p-4 text-xs sm:text-sm">
                <div className="font-extrabold text-[#ffe27a] mb-1">
                  🔍 คำอธิบายโครงสร้างและการทำงานของโค้ด (Code Structure &amp; Execution Flow):
                </div>
                <p className="text-[#c4bdd6] leading-relaxed">{log.codeExplanation}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#9a93ad]">ไฟล์ที่เกี่ยวข้อง:</span>
                  {log.relatedFiles.map((file) => (
                    <code
                      key={file}
                      className="rounded-md bg-[#0d0b14] border border-[#2f2d45] px-2 py-0.5 text-[11px] font-bold text-[#ffe27a]"
                    >
                      {file}
                    </code>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
