"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AVATARS, getAvatar, DEFAULT_AVATAR, AvatarKey } from "../../lib/dungeon/sprites";
import { hashString, dungeonNameForCourse } from "../../lib/dungeon/seed";
import { generateDungeonRoom, DungeonRoom } from "../../lib/dungeon/mapgen";
import { getMonsterDef, MonsterDef } from "../../lib/dungeon/monsters";
import { getQuestionForFloor, DungeonQuestion } from "../../lib/dungeon/questions";
import { GameCanvas } from "../../components/dungeon/GameCanvas";
import { DungeonHud } from "../../components/dungeon/DungeonHud";
import { BattleOverlay } from "../../components/dungeon/BattleOverlay";
import { MobileDpad } from "../../components/dungeon/MobileDpad";
import { PauseModal, GameOverModal, VictoryModal } from "../../components/dungeon/GameModals";
import { dungeonSound } from "../../lib/dungeon/sound";
import { Course, Lesson } from "../../lib/supabase";
import { loadLocalCourses, loadLocalLessons } from "../../lib/lms-data";

function DungeonPlayContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params?.courseId || "");

  // Avatar and sound
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(DEFAULT_AVATAR);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Course & floor data
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Game state
  const [runId, setRunId] = useState<string>(() => `run-${courseId}-${Date.now()}`);
  const [floorIndex, setFloorIndex] = useState<number>(0);
  const [hearts, setHearts] = useState<number>(3);
  const [maxHearts] = useState<number>(3);
  const [coins, setCoins] = useState<number>(0);
  const [xp, setXp] = useState<number>(0);
  const [screenShake, setScreenShake] = useState<number>(0);

  // Modals & Overlay state
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isInBattle, setIsInBattle] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);

  // Load course and user preferences
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

    async function fetchCourseData() {
      const allCourses = loadLocalCourses();
      const allLessons = loadLocalLessons();
      const foundCourse = allCourses.find((c) => c.id === courseId) || allCourses[0];
      setCourse(foundCourse);

      const relevantLessons = allLessons.filter(
        (l) => l.course_id === foundCourse?.id && l.is_published
      );
      setCourseLessons(relevantLessons.length > 0 ? relevantLessons : [allLessons[0]]);
      setLoading(false);

      // Initialize authoritative run on server
      try {
        const res = await fetch("/api/dungeon/start-run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            totalFloors: Math.max(1, relevantLessons.length),
          }),
        });
        if (res.ok) {
          const runData = await res.json();
          if (runData.runId) {
            setRunId(runData.runId);
          }
        }
      } catch {
        // fallback
      }
    }

    void fetchCourseData();
  }, [courseId]);

  const totalFloors = Math.max(1, courseLessons.length);
  const courseSeed = useMemo(() => hashString(courseId || "default"), [courseId]);
  const dungeonTitle = useMemo(() => dungeonNameForCourse(courseId || "default"), [courseId]);

  // Current floor dungeon room
  const [room, setRoom] = useState<DungeonRoom>(() =>
    generateDungeonRoom(courseSeed, 0, totalFloors)
  );

  // Update room when floor changes
  useEffect(() => {
    setRoom(generateDungeonRoom(courseSeed, floorIndex, totalFloors));
  }, [courseSeed, floorIndex, totalFloors]);

  const avatar = useMemo(() => getAvatar(avatarKey), [avatarKey]);
  const isBossFloor = floorIndex >= totalFloors - 1;

  const currentMonster: MonsterDef = useMemo(() => {
    if (room.entity?.monsterType) {
      return getMonsterDef(room.entity.monsterType);
    }
    return getMonsterDef(isBossFloor ? "boss" : "slime");
  }, [room.entity?.monsterType, isBossFloor]);

  const currentQuestion: DungeonQuestion = useMemo(
    () => getQuestionForFloor(floorIndex, isBossFloor),
    [floorIndex, isBossFloor]
  );

  const currentLessonTitle = courseLessons[floorIndex]?.title || `ชั้นที่ ${floorIndex + 1}`;

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
      // Award rewards
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
    // Player hurt
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
    if (floorIndex < totalFloors - 1) {
      dungeonSound.playDoorOpen();
      setFloorIndex((prev) => prev + 1);
    } else {
      dungeonSound.playVictory();
      setIsVictory(true);
    }
  }, [floorIndex, totalFloors]);

  const handleRetry = useCallback(() => {
    setHearts(3);
    setFloorIndex(0);
    setIsGameOver(false);
    setIsVictory(false);
    setIsInBattle(false);
    setIsPaused(false);
    setRoom(generateDungeonRoom(courseSeed, 0, totalFloors));
  }, [courseSeed, totalFloors]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#ffe27a] pixel-font text-sm">
        GENERATING DUNGEON...
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col items-center gap-4">
      {/* HUD Bar */}
      <DungeonHud
        avatar={avatar}
        floorIndex={floorIndex}
        totalFloors={totalFloors}
        dungeonTitle={dungeonTitle}
        roomTitle={currentLessonTitle}
        hearts={hearts}
        maxHearts={maxHearts}
        coins={coins}
        xp={xp}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onTogglePause={() => setIsPaused(true)}
        onExit={() => router.push("/dungeon")}
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

      {/* Instructions / Status hint */}
      <div className="w-full max-w-[640px] flex items-center justify-between text-xs text-[#9a93ad] px-1 select-none">
        <span className="hidden sm:inline">
          เดินด้วย <strong>WASD</strong> หรือ <strong>ลูกศร</strong> · โต้ตอบด้วย <strong>Space/Enter</strong>
        </span>
        <span className="text-[#ffe27a] font-bold">
          {room.isDoorUnlocked
            ? "ประตูเปิดแล้ว! เดินขึ้นไปที่ประตูเพื่อไปชั้นถัดไป"
            : isBossFloor
            ? "ประจันหน้ากับบอสใหญ่ท้ายคอร์ส!"
            : "เดินไปชนเป้าหมายเพื่อตอบคำถาม"}
        </span>
      </div>

      {/* Mobile On-Screen D-Pad */}
      <div className="w-full sm:hidden">
        <MobileDpad
          disabled={isPaused || isInBattle || isGameOver || isVictory}
          onMove={(dx, dy) => {
            const event = new KeyboardEvent("keydown", {
              key:
                dx < 0
                  ? "ArrowLeft"
                  : dx > 0
                  ? "ArrowRight"
                  : dy < 0
                  ? "ArrowUp"
                  : "ArrowDown",
            });
            window.dispatchEvent(event);
          }}
          onAction={() => {
            const event = new KeyboardEvent("keydown", { key: " " });
            window.dispatchEvent(event);
          }}
        />
      </div>

      {/* Battle Overlay */}
      {isInBattle && (
        <BattleOverlay
          runId={runId}
          monster={currentMonster}
          question={currentQuestion}
          monsterHp={room.entity?.isCompleted ? 0 : currentMonster.maxHp}
          maxMonsterHp={currentMonster.maxHp}
          playerHearts={hearts}
          onCorrectAnswer={handleCorrectAnswer}
          onWrongAnswer={handleWrongAnswer}
          onClose={() => setIsInBattle(false)}
        />
      )}

      {/* Pause Modal */}
      <PauseModal
        isOpen={isPaused}
        onResume={() => setIsPaused(false)}
        onExit={() => router.push("/dungeon")}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={isGameOver}
        onRetry={handleRetry}
        onExit={() => router.push("/dungeon")}
      />

      {/* Victory Modal */}
      <VictoryModal
        isOpen={isVictory}
        dungeonTitle={dungeonTitle}
        courseTitle={course?.title || "คอร์สเรียน"}
        totalCoins={coins}
        totalXp={xp}
        onExit={() => router.push("/dungeon")}
      />
    </div>
  );
}

export default function DungeonPlayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-[#ffe27a] pixel-font text-sm">
          LOADING DUNGEON...
        </div>
      }
    >
      <DungeonPlayContent />
    </Suspense>
  );
}
