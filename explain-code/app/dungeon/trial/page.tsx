"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AVATARS, getAvatar, DEFAULT_AVATAR, AvatarKey } from "../../lib/dungeon/sprites";
import { generateDungeonRoom, DungeonRoom } from "../../lib/dungeon/mapgen";
import { getMonsterDef, MonsterDef } from "../../lib/dungeon/monsters";
import { SAMPLE_DUNGEON_QUESTIONS } from "../../lib/dungeon/questions";
import { GameCanvas } from "../../components/dungeon/GameCanvas";
import { DungeonHud } from "../../components/dungeon/DungeonHud";
import { BattleOverlay } from "../../components/dungeon/BattleOverlay";
import { MobileDpad } from "../../components/dungeon/MobileDpad";
import { PauseModal, GameOverModal, VictoryModal } from "../../components/dungeon/GameModals";
import { dungeonSound } from "../../lib/dungeon/sound";

const TRIAL_SEED = 12345678;

export default function DungeonTrialPage() {
  const router = useRouter();

  // Avatar preference
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(DEFAULT_AVATAR);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Game state
  const [room, setRoom] = useState<DungeonRoom>(() =>
    generateDungeonRoom(TRIAL_SEED, 0, 1, "monster")
  );
  const [hearts, setHearts] = useState<number>(3);
  const [maxHearts] = useState<number>(3);
  const [coins, setCoins] = useState<number>(0);
  const [xp, setXp] = useState<number>(0);

  // Modals & Overlay state
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isInBattle, setIsInBattle] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [screenShake, setScreenShake] = useState<number>(0);

  useEffect(() => {
    try {
      const savedAvatar = localStorage.getItem("explain_code_dungeon_avatar") as AvatarKey;
      if (savedAvatar && AVATARS.some((a) => a.key === savedAvatar)) {
        setAvatarKey(savedAvatar);
      }
      const savedSound = localStorage.getItem("explain_code_dungeon_sound");
      if (savedSound !== null) {
        setSoundEnabled(savedSound === "true");
        dungeonSound.setEnabled(savedSound === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const avatar = useMemo(() => getAvatar(avatarKey), [avatarKey]);
  const currentMonster: MonsterDef = useMemo(() => getMonsterDef("slime"), []);
  const trialQuestion = useMemo(() => SAMPLE_DUNGEON_QUESTIONS[0], []);

  const handleToggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    dungeonSound.setEnabled(next);
  }, [soundEnabled]);

  const handleEncounterEntity = useCallback(() => {
    if (!room.entity?.isCompleted) {
      setIsInBattle(true);
    }
  }, [room.entity]);

  const handleCorrectAnswer = useCallback(
    (xpAwarded?: number, coinsAwarded?: number) => {
      // Slime defeated
      const gainedCoins = coinsAwarded !== undefined ? coinsAwarded : currentMonster.coinReward;
      const gainedXp = xpAwarded !== undefined ? xpAwarded : currentMonster.xpReward;
      setCoins((prev) => prev + gainedCoins);
      setXp((prev) => prev + gainedXp);

      setRoom((prev) => {
        const nextEntity = prev.entity
          ? { ...prev.entity, hp: 0, isCompleted: true }
          : null;
        return {
          ...prev,
          entity: nextEntity,
          isDoorUnlocked: true,
        };
      });
    },
    [currentMonster]
  );

  const handleWrongAnswer = useCallback(() => {
    // Player takes damage
    setScreenShake(1);
    setTimeout(() => setScreenShake(0), 300);

    setHearts((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        setTimeout(() => setIsGameOver(true), 400);
      }
      return Math.max(0, next);
    });
  }, []);

  const handleEnterNextFloor = useCallback(() => {
    dungeonSound.playVictory();
    setIsVictory(true);
  }, []);

  const handleRetry = useCallback(() => {
    setHearts(3);
    setCoins(0);
    setXp(0);
    setIsGameOver(false);
    setIsVictory(false);
    setIsInBattle(false);
    setIsPaused(false);
    setRoom(generateDungeonRoom(TRIAL_SEED, 0, 1, "monster"));
  }, []);

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col items-center gap-4">
      {/* HUD Bar */}
      <DungeonHud
        avatar={avatar}
        floorIndex={0}
        totalFloors={1}
        dungeonTitle="ห้องฝึกซ้อมจำลอง"
        roomTitle="โหมดทดลองเล่น (Guest Trial)"
        hearts={hearts}
        maxHearts={maxHearts}
        coins={coins}
        xp={xp}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onTogglePause={() => setIsPaused(true)}
        onExit={() => router.push("/courses")}
      />

      {/* Canvas Viewport */}
      <div className="w-full flex justify-center">
        <GameCanvas
          room={room}
          avatar={avatar}
          isPaused={isPaused}
          isInBattle={isInBattle}
          onEncounterEntity={handleEncounterEntity}
          onEnterNextFloor={handleEnterNextFloor}
          onAutoPause={() => setIsPaused(true)}
          screenShake={screenShake}
        />
      </div>

      {/* Mobile On-Screen D-Pad */}
      <div className="w-full sm:hidden">
        <MobileDpad
          disabled={isPaused || isInBattle || isGameOver || isVictory}
          onMove={(dx, dy) => {
            const dirKey =
              dx < 0
                ? "ArrowLeft"
                : dx > 0
                ? "ArrowRight"
                : dy < 0
                ? "ArrowUp"
                : "ArrowDown";
            const event = new KeyboardEvent("keydown", {
              key: dirKey,
              code: dirKey,
            });
            window.dispatchEvent(event);
          }}
          onAction={() => {
            const event = new KeyboardEvent("keydown", {
              key: " ",
              code: "Space",
            });
            window.dispatchEvent(event);
          }}
        />
      </div>

      {/* Battle Overlay */}
      {isInBattle && (
        <BattleOverlay
          runId="trial"
          monster={currentMonster}
          question={trialQuestion}
          monsterHp={room.entity?.isCompleted ? 0 : 1}
          maxMonsterHp={1}
          playerHearts={hearts}
          initialFocus={3}
          maxFocus={6}
          onCorrectAnswer={handleCorrectAnswer}
          onWrongAnswer={handleWrongAnswer}
          onClose={() => setIsInBattle(false)}
        />
      )}

      {/* Pause Modal */}
      <PauseModal
        isOpen={isPaused}
        onResume={() => setIsPaused(false)}
        onExit={() => router.push("/courses")}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={isGameOver}
        onRetry={handleRetry}
        onExit={() => router.push("/courses")}
      />

      {/* Victory Modal */}
      <VictoryModal
        isOpen={isVictory}
        dungeonTitle="ห้องทดลองเล่น"
        courseTitle="โหมดทดลองเล่นสำหรับผู้เยี่ยมชม"
        totalCoins={coins}
        totalXp={xp}
        onExit={() => router.push("/courses")}
      />
    </div>
  );
}
