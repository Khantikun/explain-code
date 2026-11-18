"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icons";
import { useUiLanguage } from "./LanguageProvider";
import { PixelSpriteView } from "./dungeon/PixelSpriteView";
import { AVATARS, BOSS_SPRITE, SLIME_SPRITE } from "../lib/dungeon/sprites";

const PREVIEW_LINES = [
  {
    line: 1,
    code: "let total = 0;",
    th: "สร้างตัวแปร total เพื่อสะสมผลรวมเริ่มต้นที่ 0",
    en: "Initialize total accumulator at 0",
  },
  {
    line: 2,
    code: "for (const n of scores) {",
    th: "วนลูปหยิบค่าคะแนนทีละตัวจาก scores",
    en: "Loop through each score in scores",
  },
  {
    line: 3,
    code: "  if (n >= 50) total += n;",
    th: "เช็กเงื่อนไข >= 50 แล้วบวกเข้า total",
    en: "Check n >= 50, then add to total",
  },
];

export function LandingHeroPreview() {
  const { t } = useUiLanguage();
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % PREVIEW_LINES.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, []);

  const current = PREVIEW_LINES[activeIdx];

  return (
    <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-[#3d395a] bg-[#141220]/90 p-3.5 text-left shadow-xl backdrop-blur-xs hero-fade-in">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#2f2d45]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff4d6d]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f6c945]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2fbf71]/80" />
          <span className="ml-2 text-[11px] font-bold text-[#9a93ad]">
            {t("ตัวอย่างการแกะโค้ดทีละบรรทัด", "Live Line-by-Line Preview")}
          </span>
        </div>
        <Link
          href="/explain"
          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#f6c945] hover:underline"
        >
          <Icon name="sparkles" size={12} />
          <span>{t("ลองวางโค้ดของคุณ →", "Try Your Code →")}</span>
        </Link>
      </div>

      <div className="space-y-1 font-mono text-xs">
        {PREVIEW_LINES.map((item, idx) => {
          const isActive = idx === activeIdx;
          return (
            <button
              key={item.line}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`w-full text-left flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer ${
                isActive
                  ? "bg-[#5a2d91]/35 border border-[#9b5de5]/60 text-[#ffe27a]"
                  : "text-[#9a93ad] hover:bg-[#1c1b2b]"
              }`}
            >
              <span className="w-4 text-right text-[10px] opacity-70">{item.line}</span>
              <span className="truncate">{item.code}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 rounded-xl border border-[#2fbf71]/40 bg-[#102a1e]/80 px-3 py-2 text-xs text-[#86efac] flex items-center gap-2 transition-all">
        <Icon name="bulb" size={14} className="shrink-0 text-[#f6c945]" />
        <span>
          <strong className="text-[#ffe27a]">L{current.line}:</strong>{" "}
          {t(current.th, current.en)}
        </span>
      </div>
    </div>
  );
}

interface LandingDungeonBackdropProps {
  torchActive: boolean;
}

/**
 * พื้นหลังดันเจี้ยนพร้อมลูกเล่นส่องไฟ (Spotlight):
 * ตัวละครและมอนสเตอร์จะซ่อนอยู่ในเงามืด และสว่างขึ้นมาเมื่อนำเมาส์ไปชี้หรือคลิก/แตะ
 */
export function LandingDungeonBackdrop({ torchActive }: LandingDungeonBackdropProps) {
  const { t } = useUiLanguage();
  const [litHero, setLitHero] = useState(false);
  const [litMonster, setLitMonster] = useState(false);

  return (
    <>
      {/* Ambient Hero Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[560px] rounded-full bg-[#9b5de5]/20 blur-3xl"
      />

      {/* Cursor-following Dungeon Torchlight */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
          torchActive ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(240px circle at var(--torch-x, 50%) var(--torch-y, 30%), rgba(246, 201, 69, 0.13), rgba(155, 93, 229, 0.06) 45%, transparent 72%)",
        }}
      />

      {/* Ambient Floating Code Tokens */}
      <div
        aria-hidden="true"
        className="pointer-events-none hidden md:block absolute top-8 left-12 lg:left-24 font-mono text-[11px] font-bold text-[#9b5de5]/30 ambient-float select-none"
      >
        {"{ code => mastery }"}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none hidden md:block absolute top-10 right-12 lg:right-24 font-mono text-[11px] font-bold text-[#f6c945]/25 ambient-float [animation-delay:1.1s] select-none"
      >
        {"if (understand) levelUp();"}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none hidden lg:block absolute top-64 left-6 font-mono text-[11px] font-bold text-[#2fbf71]/25 ambient-float [animation-delay:1.8s] select-none"
      >
        {"for (const line of code)"}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none hidden lg:block absolute top-72 right-6 font-mono text-[11px] font-bold text-[#c084fc]/25 ambient-float [animation-delay:2.4s] select-none"
      >
        {"return insight;"}
      </div>

      {/* Left Side: Hero Characters (Hover or Click to Illuminate) */}
      <button
        type="button"
        onClick={() => setLitHero((prev) => !prev)}
        title={t("ชี้หรือคลิกเพื่อส่องไฟดูตัวละคร", "Hover or click to illuminate heroes")}
        aria-label={t("ส่องไฟดูตัวละคร", "Illuminate hero characters")}
        aria-pressed={litHero}
        className="group hidden sm:flex flex-col items-center gap-3 absolute top-14 left-2 lg:left-6 z-10 p-4 rounded-full cursor-pointer select-none focus:outline-hidden"
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-full blur-2xl transition-all duration-300 ${
            litHero
              ? "opacity-100 scale-110 bg-[radial-gradient(circle,rgba(246,201,69,0.45)_0%,rgba(155,93,229,0.22)_55%,transparent_75%)]"
              : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-110 bg-[radial-gradient(circle,rgba(246,201,69,0.42)_0%,rgba(155,93,229,0.2)_55%,transparent_75%)]"
          }`}
        />
        <div
          className={`relative ambient-float transition-all duration-300 ${
            litHero
              ? "opacity-100 brightness-105 grayscale-0 scale-105 drop-shadow-[0_10px_22px_rgba(246,201,69,0.45)]"
              : "opacity-10 brightness-[0.12] grayscale scale-95 group-hover:opacity-100 group-hover:brightness-105 group-hover:grayscale-0 group-hover:scale-105 group-hover:drop-shadow-[0_10px_22px_rgba(246,201,69,0.45)]"
          }`}
        >
          <PixelSpriteView sprite={AVATARS[0].sprite} size={68} />
        </div>
        <div
          className={`relative -ml-6 ambient-float [animation-delay:1.5s] transition-all duration-300 ${
            litHero
              ? "opacity-95 brightness-105 grayscale-0 scale-105 drop-shadow-[0_8px_18px_rgba(155,93,229,0.45)]"
              : "opacity-10 brightness-[0.12] grayscale scale-95 group-hover:opacity-95 group-hover:brightness-105 group-hover:grayscale-0 group-hover:scale-105 group-hover:drop-shadow-[0_8px_18px_rgba(155,93,229,0.45)]"
          }`}
        >
          <PixelSpriteView sprite={AVATARS[1].sprite} size={50} />
        </div>
        <span
          className={`relative mt-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold transition-all duration-300 ${
            litHero
              ? "opacity-100 border-[#f6c945]/60 bg-[#1c1b2b]/90 text-[#ffe27a]"
              : "opacity-20 border-[#3d395a]/40 bg-[#141220]/60 text-[#9a93ad] group-hover:opacity-100 group-hover:border-[#f6c945]/60 group-hover:bg-[#1c1b2b]/90 group-hover:text-[#ffe27a]"
          }`}
        >
          {"hero.explain()"}
        </span>
      </button>

      {/* Right Side: Monsters (Hover or Click to Illuminate) */}
      <button
        type="button"
        onClick={() => setLitMonster((prev) => !prev)}
        title={t("ชี้หรือคลิกเพื่อส่องไฟดูมอนสเตอร์", "Hover or click to illuminate monsters")}
        aria-label={t("ส่องไฟดูมอนสเตอร์", "Illuminate monsters")}
        aria-pressed={litMonster}
        className="group hidden sm:flex flex-col items-center gap-3 absolute top-16 right-2 lg:right-6 z-10 p-4 rounded-full cursor-pointer select-none focus:outline-hidden"
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-full blur-2xl transition-all duration-300 ${
            litMonster
              ? "opacity-100 scale-110 bg-[radial-gradient(circle,rgba(255,77,109,0.42)_0%,rgba(47,191,113,0.18)_55%,transparent_75%)]"
              : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-110 bg-[radial-gradient(circle,rgba(255,77,109,0.4)_0%,rgba(47,191,113,0.18)_55%,transparent_75%)]"
          }`}
        />
        <div
          className={`relative ambient-float [animation-delay:0.8s] -scale-x-100 transition-all duration-300 ${
            litMonster
              ? "opacity-100 brightness-105 grayscale-0 scale-105 drop-shadow-[0_10px_22px_rgba(255,77,109,0.45)]"
              : "opacity-10 brightness-[0.12] grayscale scale-95 group-hover:opacity-100 group-hover:brightness-105 group-hover:grayscale-0 group-hover:scale-105 group-hover:drop-shadow-[0_10px_22px_rgba(255,77,109,0.45)]"
          }`}
        >
          <PixelSpriteView sprite={BOSS_SPRITE} size={72} />
        </div>
        <div
          className={`relative -mr-6 ambient-float [animation-delay:2.1s] transition-all duration-300 ${
            litMonster
              ? "opacity-95 brightness-105 grayscale-0 scale-105 drop-shadow-[0_8px_18px_rgba(47,191,113,0.45)]"
              : "opacity-10 brightness-[0.12] grayscale scale-95 group-hover:opacity-95 group-hover:brightness-105 group-hover:grayscale-0 group-hover:scale-105 group-hover:drop-shadow-[0_8px_18px_rgba(47,191,113,0.45)]"
          }`}
        >
          <PixelSpriteView sprite={SLIME_SPRITE} size={46} />
        </div>
        <span
          className={`relative mt-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold transition-all duration-300 ${
            litMonster
              ? "opacity-100 border-[#ff4d6d]/60 bg-[#2d141c]/90 text-[#fca5a5]"
              : "opacity-20 border-[#3d395a]/40 bg-[#141220]/60 text-[#9a93ad] group-hover:opacity-100 group-hover:border-[#ff4d6d]/60 group-hover:bg-[#2d141c]/90 group-hover:text-[#fca5a5]"
          }`}
        >
          {"while (bug) {}"}
        </span>
      </button>
    </>
  );
}
