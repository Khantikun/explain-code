"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { AVATARS, getAvatar, DEFAULT_AVATAR, AvatarKey, COIN_SPRITE, HEART_SPRITE } from "../../lib/dungeon/sprites";
import { hashString } from "../../lib/dungeon/seed";
import { generateDungeonRoom, DungeonRoom } from "../../lib/dungeon/mapgen";
import { getMonsterDef, MonsterDef } from "../../lib/dungeon/monsters";
import { getQuestionForFloor, DungeonQuestion } from "../../lib/dungeon/questions";
import { GameCanvas } from "./GameCanvas";
import { BattleOverlay } from "./BattleOverlay";
import { MobileDpad } from "./MobileDpad";
import { PixelSpriteView } from "./PixelSpriteView";
import { Icon } from "../Icons";
import { dungeonSound } from "../../lib/dungeon/sound";
import { Course, Lesson, LessonProgress } from "../../lib/supabase";
import {
  loadLocalLessonProgress,
  saveLocalLessonProgress,
  loadLocalEnrollments,
  saveLocalEnrollments,
} from "../../lib/lms-data";
import { getClientSession } from "../SiteHeader";

interface LessonDungeonRoomProps {
  course: Course;
  lesson: Lesson;
  lessonIndex: number;
  totalLessons: number;
  isCompleted: boolean;
  onLessonCompleted: () => void;
  onSwitchToContent?: () => void;
  nextLessonUrl?: string;
}

export function LessonDungeonRoom({
  course,
  lesson,
  lessonIndex,
  totalLessons,
  isCompleted,
  onLessonCompleted,
  onSwitchToContent,
  nextLessonUrl,
}: LessonDungeonRoomProps) {
  // Avatar and sound
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(DEFAULT_AVATAR);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Game state for this room
  const [hearts, setHearts] = useState<number>(3);
  const [coinsEarned, setCoinsEarned] = useState<number>(0);
  const [xpEarned, setXpEarned] = useState<number>(0);
  const [screenShake, setScreenShake] = useState<number>(0);
  const [isRoomConquered, setIsRoomConquered] = useState<boolean>(isCompleted);

  // Overlays
  const [isInBattle, setIsInBattle] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  // Load avatar and sound preference
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

  const courseSeed = useMemo(() => hashString(course.id || "default"), [course.id]);
  const isBossFloor = lessonIndex >= totalLessons - 1;

  // Generate deterministic room for this lesson
  const [room, setRoom] = useState<DungeonRoom>(() => {
    const r = generateDungeonRoom(courseSeed, lessonIndex, totalLessons);
    if (isCompleted && r.entity) {
      return {
        ...r,
        entity: { ...r.entity, hp: 0, isCompleted: true },
        isDoorUnlocked: true,
      };
    }
    return r;
  });

  const avatar = useMemo(() => getAvatar(avatarKey), [avatarKey]);

  const currentMonster: MonsterDef = useMemo(() => {
    if (room.entity?.monsterType) {
      return getMonsterDef(room.entity.monsterType);
    }
    return getMonsterDef(isBossFloor ? "boss" : "slime");
  }, [room.entity?.monsterType, isBossFloor]);

  const currentQuestion: DungeonQuestion = useMemo(
    () => getQuestionForFloor(lessonIndex, isBossFloor),
    [lessonIndex, isBossFloor]
  );

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
      const gainedCoins = coinsAwarded !== undefined ? coinsAwarded : currentMonster.coinReward;
      const gainedXp = xpAwarded !== undefined ? xpAwarded : currentMonster.xpReward;
      setCoinsEarned((prev) => prev + gainedCoins);
      setXpEarned((prev) => prev + gainedXp);
      setIsRoomConquered(true);

      // Unlock door in room
      setRoom((prev) => ({
        ...prev,
        entity: prev.entity ? { ...prev.entity, hp: 0, isCompleted: true } : null,
        isDoorUnlocked: true,
      }));

      // Update LMS Progress locally
      const session = getClientSession();
      if (session) {
        const nowIso = new Date().toISOString();
        const progs = loadLocalLessonProgress();
        const existingIdx = progs.findIndex(
          (p) => p.lesson_id === lesson.id && p.student_id === session.userId
        );
        let updatedProgs: LessonProgress[];
        if (existingIdx >= 0) {
          updatedProgs = [...progs];
          updatedProgs[existingIdx] = {
            ...updatedProgs[existingIdx],
            is_completed: true,
            quiz_score: 100,
            completed_at: nowIso,
            updated_at: nowIso,
          };
        } else {
          updatedProgs = [
            {
              id: `prog-${Date.now()}`,
              student_id: session.userId,
              course_id: course.id,
              lesson_id: lesson.id,
              is_completed: true,
              quiz_score: 100,
              opened_at: nowIso,
              completed_at: nowIso,
              updated_at: nowIso,
            },
            ...progs,
          ];
        }
        saveLocalLessonProgress(updatedProgs);

        // Update enrollments
        const enrolls = loadLocalEnrollments();
        const existingEnrollIdx = enrolls.findIndex(
          (e) => e.course_id === course.id && e.student_id === session.userId
        );
        if (existingEnrollIdx >= 0) {
          const updatedEnrolls = [...enrolls];
          updatedEnrolls[existingEnrollIdx] = {
            ...updatedEnrolls[existingEnrollIdx],
            last_accessed_lesson_id: lesson.id,
            last_accessed_at: nowIso,
          };
          saveLocalEnrollments(updatedEnrolls);
        }
      }

      onLessonCompleted();
    },
    [currentMonster, course.id, lesson.id, onLessonCompleted]
  );

  const handleWrongAnswer = useCallback(() => {
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

  const handleRetryRoom = useCallback(() => {
    setHearts(3);
    setIsGameOver(false);
    setIsInBattle(false);
    setRoom(generateDungeonRoom(courseSeed, lessonIndex, totalLessons));
  }, [courseSeed, lessonIndex, totalLessons]);

  const handleEnterDoor = useCallback(() => {
    dungeonSound.playDoorOpen();
  }, []);

  return (
    <div className="rounded-2xl border-2 border-[#4a4766] bg-[#120f1c] text-[#f4efe6] overflow-hidden shadow-lg select-none">
      {/* Lesson Dungeon Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#1c1b2b] border-b border-[#2f2d45]">
        <div className="flex items-center gap-3">
          <PixelSpriteView sprite={avatar.sprite} size={28} />
          <div>
            <div className="flex items-center gap-2">
              <span className="pixel-font text-[10px] text-[#ffe27a] uppercase">
                ชั้นที่ {lessonIndex + 1}/{totalLessons}
              </span>
              {isBossFloor && (
                <span className="pixel-font text-[9px] bg-[#5a2d91] text-[#ffe27a] px-1.5 py-0.5 rounded font-black">
                  BOSS ROOM
                </span>
              )}
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[#f4efe6] line-clamp-1">
              ห้องดันเจี้ยน: {lesson.title}
            </h3>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-3">
          {/* Hearts */}
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`transition-opacity ${i < hearts ? "opacity-100 scale-100" : "opacity-30 scale-90"}`}
              >
                <PixelSpriteView sprite={HEART_SPRITE} size={14} />
              </span>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className="p-1.5 rounded-lg bg-[#252238] hover:bg-[#322c4a] text-[#f4efe6] text-xs cursor-pointer transition-colors"
            title={soundEnabled ? "ปิดเสียง" : "เปิดเสียง"}
          >
            <Icon name={soundEnabled ? "volume-2" : "volume-x"} size={14} />
          </button>

          {/* Switch back button */}
          {onSwitchToContent && (
            <button
              type="button"
              onClick={onSwitchToContent}
              className="px-2.5 py-1 rounded-lg border border-[#4a4766] bg-[#252238] text-[11px] font-bold text-[#ffe27a] hover:bg-[#322c4a] cursor-pointer"
            >
              อ่านบทเรียน
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="p-3 sm:p-5 flex flex-col items-center gap-3">
        <div className="relative w-full max-w-[560px] aspect-[4/3] rounded-xl overflow-hidden border-2 border-[#2f2d45] shadow-inner bg-[#0b0a12]">
          <GameCanvas
            room={room}
            avatar={avatar}
            isPaused={isGameOver}
            isInBattle={isInBattle}
            onEncounterEntity={handleEncounterEntity}
            onEnterNextFloor={handleEnterDoor}
            onAutoPause={() => {}}
            screenShake={screenShake}
          />

          {/* Game Over Screen inside room */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center gap-3">
              <span className="pixel-font text-xs text-[#ff4d6d] font-bold">GAME OVER</span>
              <h4 className="text-sm sm:text-base font-bold text-[#f4efe6]">
                หัวใจหมดในการต่อสู้บทเรียนนี้
              </h4>
              <button
                type="button"
                onClick={handleRetryRoom}
                className="retro-button px-4 py-2 rounded-xl bg-[#f6c945] text-[#120f1c] font-black pixel-font text-xs cursor-pointer"
              >
                RETRY (ลองใหม่)
              </button>
            </div>
          )}
        </div>

        {/* Hint banner */}
        <div className="w-full max-w-[560px] flex items-center justify-between text-[11px] text-[#9a93ad]">
          <span className="hidden sm:inline">
            เดินด้วย <strong>WASD</strong> หรือ <strong>ลูกศร</strong> · โต้ตอบด้วย <strong>Space/Enter</strong>
          </span>
          <span className="text-[#ffe27a] font-bold">
            {room.isDoorUnlocked
              ? "ประตูเปิดแล้ว! คุณพิชิตห้องนี้สำเร็จ"
              : `เดินไปประจันหน้ากับ ${currentMonster.name} เพื่อตอบคำถาม`}
          </span>
        </div>

        {/* Room Cleared Celebration Card */}
        {isRoomConquered && (
          <div className="w-full max-w-[560px] p-3.5 rounded-xl border border-[#2fbf71]/50 bg-[#1a7a4a]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#2fbf71] font-bold">
              <Icon name="check" size={16} />
              <span>พิชิตห้องดันเจี้ยนบทนี้สำเร็จ! บันทึกผลเรียนจบเรียบร้อย</span>
            </div>

            <div className="flex items-center gap-2">
              {nextLessonUrl ? (
                <Link
                  href={nextLessonUrl}
                  className="px-3 py-1.5 rounded-lg bg-[#2fbf71] text-[#120f1c] font-black text-xs hover:bg-[#34d37d] transition-colors"
                >
                  บทเรียนถัดไป →
                </Link>
              ) : (
                <Link
                  href={`/courses/${course.id}`}
                  className="px-3 py-1.5 rounded-lg bg-[#2fbf71] text-[#120f1c] font-black text-xs hover:bg-[#34d37d] transition-colors"
                >
                  กลับสู่หน้าคอร์ส
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Mobile On-Screen D-Pad */}
        <div className="w-full sm:hidden pt-2">
          <MobileDpad
            disabled={isInBattle || isGameOver}
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
      </div>

      {/* Battle Overlay for this room */}
      {isInBattle && (
        <BattleOverlay
          runId={`lesson-${lesson.id}`}
          monster={currentMonster}
          question={currentQuestion}
          monsterHp={room.entity?.isCompleted ? 0 : currentMonster.maxHp}
          maxMonsterHp={currentMonster.maxHp}
          playerHearts={hearts}
          courseId={course.id}
          lessonId={lesson.id}
          onCorrectAnswer={handleCorrectAnswer}
          onWrongAnswer={handleWrongAnswer}
          onClose={() => setIsInBattle(false)}
        />
      )}
    </div>
  );
}
