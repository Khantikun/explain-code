"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { Icon } from "../Icons";

interface MobileDpadProps {
  onMove: (dx: number, dy: number) => void;
  onAction: () => void;
  disabled?: boolean;
}

export function MobileDpad({ onMove, onAction, disabled = false }: MobileDpadProps) {
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (disabled) stopHold();
    return () => stopHold();
  }, [disabled, stopHold]);

  const startMoveHold = useCallback(
    (dx: number, dy: number) => {
      if (disabled) return;
      stopHold();
      onMove(dx, dy);
      holdTimerRef.current = setInterval(() => {
        onMove(dx, dy);
      }, 160);
    },
    [disabled, onMove, stopHold]
  );

  const handleActionPress = useCallback(() => {
    if (!disabled) {
      onAction();
    }
  }, [disabled, onAction]);

  return (
    <div
      className="w-full max-w-[640px] mx-auto flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 select-none touch-none"
      style={{ touchAction: "none" }}
    >
      {/* 4-Way D-Pad (Hold-to-move supported) */}
      <div className="relative w-32 h-32 sm:w-36 sm:h-36">
        {/* UP */}
        <button
          type="button"
          disabled={disabled}
          onPointerDown={() => startMoveHold(0, -1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-t-xl bg-[#252238] active:bg-[#5a2d91] border-2 border-[#4a4766] flex items-center justify-center text-base sm:text-lg text-[#f4efe6] shadow-sm select-none active:scale-95 transition-transform"
          aria-label="เดินขึ้น"
        >
          ▲
        </button>

        {/* DOWN */}
        <button
          type="button"
          disabled={disabled}
          onPointerDown={() => startMoveHold(0, 1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-b-xl bg-[#252238] active:bg-[#5a2d91] border-2 border-[#4a4766] flex items-center justify-center text-base sm:text-lg text-[#f4efe6] shadow-sm select-none active:scale-95 transition-transform"
          aria-label="เดินลง"
        >
          ▼
        </button>

        {/* LEFT */}
        <button
          type="button"
          disabled={disabled}
          onPointerDown={() => startMoveHold(-1, 0)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="absolute top-1/2 -translate-y-1/2 left-0 w-10 h-10 sm:w-12 sm:h-12 rounded-l-xl bg-[#252238] active:bg-[#5a2d91] border-2 border-[#4a4766] flex items-center justify-center text-base sm:text-lg text-[#f4efe6] shadow-sm select-none active:scale-95 transition-transform"
          aria-label="เดินซ้าย"
        >
          ◀
        </button>

        {/* RIGHT */}
        <button
          type="button"
          disabled={disabled}
          onPointerDown={() => startMoveHold(1, 0)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="absolute top-1/2 -translate-y-1/2 right-0 w-10 h-10 sm:w-12 sm:h-12 rounded-r-xl bg-[#252238] active:bg-[#5a2d91] border-2 border-[#4a4766] flex items-center justify-center text-base sm:text-lg text-[#f4efe6] shadow-sm select-none active:scale-95 transition-transform"
          aria-label="เดินขวา"
        >
          ▶
        </button>

        {/* Center Pad */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-[#1c1b2b] border border-[#2f2d45] flex items-center justify-center">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#4a4766]" />
        </div>
      </div>

      {/* Action Button (Interact / Attack / Open) */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onPointerDown={handleActionPress}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#f6c945] active:bg-[#ffe27a] border-4 border-[#120f1c] shadow-[0_4px_0_#120f1c] active:translate-y-1 active:shadow-none flex flex-col items-center justify-center text-[#120f1c] cursor-pointer select-none transition-all"
          aria-label="ปุ่มกระทำ โต้ตอบ หรือโจมตี"
        >
          <Icon name="sword" size={16} />
          <span className="pixel-font text-[9px] sm:text-[10px] font-black uppercase mt-0.5">ACT</span>
        </button>
        <span className="text-[10px] text-[#9a93ad] font-bold">โต้ตอบ / คุย</span>
      </div>
    </div>
  );
}
