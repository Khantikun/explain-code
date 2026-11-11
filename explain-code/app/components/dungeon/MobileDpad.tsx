"use client";

import React, { useCallback } from "react";

interface MobileDpadProps {
  onMove: (dx: number, dy: number) => void;
  onAction: () => void;
  disabled?: boolean;
}

export function MobileDpad({ onMove, onAction, disabled = false }: MobileDpadProps) {
  const handleTouch = useCallback(
    (e: React.TouchEvent | React.MouseEvent, action: () => void) => {
      e.preventDefault();
      if (!disabled) {
        action();
      }
    },
    [disabled]
  );

  return (
    <div
      className="w-full max-w-[640px] mx-auto flex items-center justify-between px-4 py-3 select-none touch-none"
      style={{ touchAction: "none" }}
    >
      {/* 4-Way D-Pad */}
      <div className="relative w-36 h-36">
        {/* UP */}
        <button
          type="button"
          disabled={disabled}
          onTouchStart={(e) => handleTouch(e, () => onMove(0, -1))}
          onClick={(e) => handleTouch(e, () => onMove(0, -1))}
          className="absolute top-0 left-12 w-12 h-12 rounded-t-xl bg-[#252238] active:bg-[#5a2d91] border-2 border-[#4a4766] flex items-center justify-center text-lg text-[#f4efe6] shadow-sm select-none active:scale-95 transition-transform"
          aria-label="เดินขึ้น"
        >
          ▲
        </button>

        {/* DOWN */}
        <button
          type="button"
          disabled={disabled}
          onTouchStart={(e) => handleTouch(e, () => onMove(0, 1))}
          onClick={(e) => handleTouch(e, () => onMove(0, 1))}
          className="absolute bottom-0 left-12 w-12 h-12 rounded-b-xl bg-[#252238] active:bg-[#5a2d91] border-2 border-[#4a4766] flex items-center justify-center text-lg text-[#f4efe6] shadow-sm select-none active:scale-95 transition-transform"
          aria-label="เดินลง"
        >
          ▼
        </button>

        {/* LEFT */}
        <button
          type="button"
          disabled={disabled}
          onTouchStart={(e) => handleTouch(e, () => onMove(-1, 0))}
          onClick={(e) => handleTouch(e, () => onMove(-1, 0))}
          className="absolute top-12 left-0 w-12 h-12 rounded-l-xl bg-[#252238] active:bg-[#5a2d91] border-2 border-[#4a4766] flex items-center justify-center text-lg text-[#f4efe6] shadow-sm select-none active:scale-95 transition-transform"
          aria-label="เดินซ้าย"
        >
          ◀
        </button>

        {/* RIGHT */}
        <button
          type="button"
          disabled={disabled}
          onTouchStart={(e) => handleTouch(e, () => onMove(1, 0))}
          onClick={(e) => handleTouch(e, () => onMove(1, 0))}
          className="absolute top-12 right-0 w-12 h-12 rounded-r-xl bg-[#252238] active:bg-[#5a2d91] border-2 border-[#4a4766] flex items-center justify-center text-lg text-[#f4efe6] shadow-sm select-none active:scale-95 transition-transform"
          aria-label="เดินขวา"
        >
          ▶
        </button>

        {/* Center Pad */}
        <div className="absolute top-12 left-12 w-12 h-12 bg-[#1c1b2b] border border-[#2f2d45] flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-[#4a4766]" />
        </div>
      </div>

      {/* Action Button (⚔️ Interact / Attack / Open) */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onTouchStart={(e) => handleTouch(e, onAction)}
          onClick={(e) => handleTouch(e, onAction)}
          className="w-20 h-20 rounded-full bg-[#f6c945] active:bg-[#ffe27a] border-4 border-[#120f1c] shadow-[0_4px_0_#120f1c] active:translate-y-1 active:shadow-none flex flex-col items-center justify-center text-[#120f1c] cursor-pointer select-none transition-all"
          aria-label="ปุ่มกระทำ โต้ตอบ หรือโจมตี"
        >
          <span className="text-xl">⚔️</span>
          <span className="pixel-font text-[10px] font-black uppercase">ACT</span>
        </button>
        <span className="text-[10px] text-[#9a93ad] font-bold">โต้ตอบ / คุย</span>
      </div>
    </div>
  );
}
