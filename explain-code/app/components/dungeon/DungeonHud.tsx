"use client";

import React from "react";
import { AvatarDef, HEART_SPRITE, COIN_SPRITE } from "../../lib/dungeon/sprites";
import { PixelSpriteView } from "./PixelSpriteView";
import { Icon } from "../Icons";

interface DungeonHudProps {
  avatar: AvatarDef;
  floorIndex: number;
  totalFloors: number;
  dungeonTitle: string;
  roomTitle: string;
  hearts: number;
  maxHearts: number;
  coins: number;
  xp: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onTogglePause: () => void;
  onExit: () => void;
}

export function DungeonHud({
  avatar,
  floorIndex,
  totalFloors,
  dungeonTitle,
  roomTitle,
  hearts,
  maxHearts,
  coins,
  xp,
  soundEnabled,
  onToggleSound,
  onTogglePause,
  onExit,
}: DungeonHudProps) {
  const heartIcons: React.ReactNode[] = [];
  for (let i = 0; i < maxHearts; i++) {
    const isFull = i < hearts;
    heartIcons.push(
      <span
        key={i}
        className={`inline-block transition-transform ${isFull ? "scale-100" : "opacity-25 grayscale scale-90"}`}
      >
        <PixelSpriteView sprite={HEART_SPRITE} size={20} />
      </span>
    );
  }

  return (
    <header className="w-full max-w-[640px] mx-auto bg-[#1c1b2b] border-2 border-[#4a4766] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-md">
      {/* Left: Player Profile & Hearts */}
      <div className="flex items-center gap-3">
        <div className="p-1 rounded bg-[#120f1c] border border-[#4a4766] flex items-center justify-center">
          <PixelSpriteView sprite={avatar.sprite} size={28} />
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#f4efe6] text-xs">{avatar.name}</span>
            <span className="pixel-font text-[10px] bg-[#2f2d45] px-1 rounded text-[#ffe27a]">
              Lv. 1
            </span>
          </div>
          <div className="flex items-center gap-1.5" title={`หัวใจ ${hearts}/${maxHearts}`}>
            {heartIcons}
          </div>
        </div>
      </div>

      {/* Center: Floor Indicator */}
      <div className="flex flex-col items-center justify-center text-center">
        <span className="pixel-font text-[11px] text-[#ffe27a] font-bold">
          FLOOR {floorIndex + 1}/{totalFloors}
        </span>
        <span className="text-[11px] text-[#9a93ad] font-semibold truncate max-w-[150px] sm:max-w-[200px]">
          {roomTitle}
        </span>
      </div>

      {/* Right: Coins, XP and Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 text-xs pixel-font font-bold">
          <span className="flex items-center gap-1 text-[#f6c945]">
            <PixelSpriteView sprite={COIN_SPRITE} size={14} />
            <span>{coins}</span>
          </span>
          <span className="text-[#9a93ad] hidden sm:inline">|</span>
          <span className="text-[#2fbf71] hidden sm:inline">{xp} XP</span>
        </div>

        <div className="flex items-center gap-1 border-l border-[#4a4766] pl-2">
          <button
            type="button"
            onClick={onToggleSound}
            className="p-1.5 rounded-lg bg-[#252238] hover:bg-[#322c4a] text-[#f4efe6] text-xs cursor-pointer transition-colors"
            title={soundEnabled ? "ปิดเสียง" : "เปิดเสียง"}
          >
            <Icon name={soundEnabled ? "volume-2" : "volume-x"} size={14} />
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            className="p-1.5 rounded-lg bg-[#252238] hover:bg-[#322c4a] text-[#f4efe6] text-xs cursor-pointer transition-colors"
            title="หยุดชั่วคราว"
          >
            <Icon name="pause" size={14} />
          </button>
          <button
            type="button"
            onClick={onExit}
            className="p-1.5 rounded-lg bg-[#252238] hover:bg-[#c0283a] text-[#f4efe6] text-xs cursor-pointer transition-colors"
            title="ออกจากดันเจี้ยน"
          >
            <Icon name="logout" size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
