"use client";

import React from "react";
import Link from "next/link";
import { PixelSpriteView } from "./PixelSpriteView";
import { HEART_SPRITE, COIN_SPRITE } from "../../lib/dungeon/sprites";

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onExit: () => void;
}

export function PauseModal({ isOpen, onResume, onExit }: PauseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="retro-panel rounded-2xl max-w-sm w-full p-6 text-center space-y-5 text-[#f4efe6]">
        <div className="space-y-1">
          <span className="pixel-font text-xs text-[#ffe27a]">GAME PAUSED</span>
          <h2 className="text-xl font-black">⏸️ หยุดเกมชั่วคราว</h2>
          <p className="text-xs text-[#9a93ad]">
            เกมหยุดอัตโนมัติเมื่อคุณสลับแท็บหรือกดปุ่มหยุด
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="retro-button w-full py-3 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#120f1c] font-black pixel-font text-xs cursor-pointer"
          >
            RESUME (เล่นต่อ) ▶
          </button>
          <button
            type="button"
            onClick={onExit}
            className="retro-button w-full py-2.5 rounded-xl bg-[#252238] hover:bg-[#c0283a] text-[#f4efe6] font-bold text-xs cursor-pointer"
          >
            🚪 ออกจากดันเจี้ยน
          </button>
        </div>
      </div>
    </div>
  );
}

interface GameOverModalProps {
  isOpen: boolean;
  onRetry: () => void;
  onExit: () => void;
}

export function GameOverModal({ isOpen, onRetry, onExit }: GameOverModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs select-none">
      <div className="retro-panel rounded-2xl max-w-md w-full p-6 text-center space-y-5 text-[#f4efe6] border-2 border-[#c0283a]">
        <div className="space-y-2">
          <div className="text-4xl">💔</div>
          <span className="pixel-font text-xs text-[#ff4d6d] font-bold">GAME OVER</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#f4efe6]">
            หัวใจหมดแล้ว!
          </h2>
          <p className="text-xs text-[#9a93ad] leading-relaxed">
            คุณหมดพลังในดันเจี้ยนและถูกพากลับมาพักผ่อน แต่ไม่ต้องเป็นห่วง!
            <strong> ข้อมูลบทเรียนและความคืบหน้าในการเรียนรู้ของคุณไม่สูญหาย</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="retro-button flex-1 py-3 rounded-xl bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] font-black pixel-font text-xs cursor-pointer"
          >
            🔄 RETRY (ลองใหม่)
          </button>
          <button
            type="button"
            onClick={onExit}
            className="retro-button flex-1 py-3 rounded-xl bg-[#252238] hover:bg-[#322c4a] text-[#f4efe6] font-bold text-xs cursor-pointer"
          >
            ← กลับหน้าฮับ
          </button>
        </div>
      </div>
    </div>
  );
}

interface VictoryModalProps {
  isOpen: boolean;
  dungeonTitle: string;
  courseTitle: string;
  totalCoins: number;
  totalXp: number;
  onExit: () => void;
}

export function VictoryModal({
  isOpen,
  dungeonTitle,
  courseTitle,
  totalCoins,
  totalXp,
  onExit,
}: VictoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs select-none">
      <div className="retro-panel rounded-2xl max-w-md w-full p-6 text-center space-y-6 text-[#f4efe6] border-2 border-[#f6c945] animate-in zoom-in-95 duration-200">
        <div className="space-y-2">
          <div className="text-5xl animate-bounce">🏆</div>
          <span className="pixel-font text-xs text-[#f6c945] font-black uppercase">
            DUNGEON CONQUERED!
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#ffe27a]">
            พิชิตดันเจี้ยนสำเร็จ!
          </h2>
          <p className="text-xs text-[#9a93ad]">
            ยินดีด้วย! คุณผ่านบทเรียนทั้งหมดและปราบบอสแห่ง {dungeonTitle} เรียบร้อยแล้ว
          </p>
        </div>

        {/* Reward Box */}
        <div className="bg-[#120f1c] border border-[#4a4766] rounded-xl p-4 flex items-center justify-around text-xs">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[#9a93ad] text-[11px]">เหรียญทองที่ได้รับ</span>
            <div className="flex items-center gap-1 text-[#f6c945] pixel-font font-bold text-sm">
              <PixelSpriteView sprite={COIN_SPRITE} size={16} />
              <span>+{totalCoins} G</span>
            </div>
          </div>

          <div className="h-8 w-px bg-[#4a4766]" />

          <div className="flex flex-col items-center gap-1">
            <span className="text-[#9a93ad] text-[11px]">ค่าประสบการณ์รวม</span>
            <div className="text-[#2fbf71] pixel-font font-bold text-sm">
              +{totalXp} XP
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="retro-button w-full py-3.5 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#120f1c] font-black pixel-font text-xs cursor-pointer shadow-lg transition-transform hover:scale-102"
        >
          CLAIM REWARD &amp; RETURN (รับรางวัล) →
        </button>
      </div>
    </div>
  );
}
