"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AVATARS, getAvatar, DEFAULT_AVATAR, AvatarKey } from "../../lib/dungeon/sprites";
import { hashString, dungeonNameForCourse } from "../../lib/dungeon/seed";
import { generateDungeonRoom, DungeonRoom } from "../../lib/dungeon/mapgen";
import { getMonsterDef, MonsterDef } from "../../lib/dungeon/monsters";
import { getQuestionForFloor, DungeonQuestion } from "../../lib/dungeon/questions";
import { LANGUAGE_TRACKS, LearningLanguage } from "../../lib/language-tracks";
import { GameCanvas } from "../../components/dungeon/GameCanvas";
import { DungeonHud } from "../../components/dungeon/DungeonHud";
import { BattleOverlay } from "../../components/dungeon/BattleOverlay";
import { MobileDpad } from "../../components/dungeon/MobileDpad";
import { PauseModal, GameOverModal, VictoryModal } from "../../components/dungeon/GameModals";
import { dungeonSound } from "../../lib/dungeon/sound";
import { Course, Lesson, LessonProgress } from "../../lib/supabase";
import {
  loadLocalCourses,
  loadLocalLessons,
  loadLocalLessonProgress,
  saveLocalLessonProgress,
  loadLocalEnrollments,
  saveLocalEnrollments,
} from "../../lib/lms-data";
import { getClientSession } from "../../components/SiteHeader";
import { useUiLanguage } from "../../components/LanguageProvider";

function detectCourseLanguage(course: Course | null, courseLessons: Lesson[]): LearningLanguage {
  const lessonLang = courseLessons
    .find((l) => l?.programming_language)
    ?.programming_language?.toLowerCase();

  if (lessonLang === "python") return "python";
  if (lessonLang === "sql") return "sql";
  if (lessonLang === "typescript" || lessonLang === "ts") return "typescript";
  if (lessonLang === "cpp" || lessonLang === "c++") return "cpp";
  if (lessonLang === "java") return "java";
  if (lessonLang === "javascript" || lessonLang === "js") return "javascript";

  if (!course) return "javascript";
  const haystack = `${course.id} ${course.join_code} ${course.title}`.toUpperCase();
  if (
    course.id.includes("-ts-") ||
    course.join_code.toUpperCase().startsWith("TS") ||
    haystack.includes("TYPESCRIPT")
  ) {
    return "typescript";
  }
  if (
    course.id.includes("-cpp-") ||
    course.join_code.toUpperCase().startsWith("CPP") ||
    haystack.includes("C++") ||
    haystack.includes("CPP")
  ) {
    return "cpp";
  }
  if (
    course.id.includes("python") ||
    course.join_code.toUpperCase().startsWith("PY") ||
    haystack.includes("PYTHON")
  ) {
    return "python";
  }
  if (
    course.id.includes("sql") ||
    course.join_code.toUpperCase().startsWith("SQL") ||
    haystack.includes("SQL")
  ) {
    return "sql";
  }
  if (
    course.id.includes("-java-") ||
    course.join_code.toUpperCase().startsWith("JAVA") ||
    /\bJAVA\b/.test(haystack)
  ) {
    return "java";
  }
  return "javascript";
}

function DungeonPlayContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uiLang, t } = useUiLanguage();
  const isEn = uiLang === "en";

  const courseId = String(params?.courseId || "");
  const initialFloor = Math.max(0, parseInt(searchParams.get("floor") || "0", 10) || 0);

  // Avatar and sound
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(DEFAULT_AVATAR);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Course & floor data
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Game state
  const [runId, setRunId] = useState<string>(() => `run-${courseId}-${Date.now()}`);
  const [floorIndex, setFloorIndex] = useState<number>(initialFloor);
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

      const relevantLessons = allLessons
        .filter((l) => l.course_id === foundCourse?.id && l.is_published)
        .sort((a, b) => a.order_index - b.order_index);
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

  const courseLang = useMemo(
    () => detectCourseLanguage(course, courseLessons),
    [course, courseLessons]
  );

  const trackMeta = useMemo(
    () => LANGUAGE_TRACKS.find((tr) => tr.id === courseLang) || LANGUAGE_TRACKS[0],
    [courseLang]
  );

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
    () => getQuestionForFloor(floorIndex, isBossFloor, courseLang, course?.id || courseId),
    [floorIndex, isBossFloor, courseLang, course?.id, courseId]
  );

  const currentLessonTitle =
    courseLessons[floorIndex]?.title ||
    t(`ชั้นที่ ${floorIndex + 1}`, `Floor ${floorIndex + 1}`);

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
      setCoins((prev) => prev + gainedCoins);
      setXp((prev) => prev + gainedXp);

      // Two-Way Progress Sync: Mark current lesson completed in local storage
      const currentLesson = courseLessons[floorIndex];
      const session = getClientSession();
      if (currentLesson && session) {
        const nowIso = new Date().toISOString();
        const progs = loadLocalLessonProgress();
        const existingIdx = progs.findIndex(
          (p) => p.lesson_id === currentLesson.id && p.student_id === session.userId
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
              course_id: courseId,
              lesson_id: currentLesson.id,
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

        const enrolls = loadLocalEnrollments();
        const existingEnrollIdx = enrolls.findIndex(
          (e) => e.course_id === courseId && e.student_id === session.userId
        );
        if (existingEnrollIdx >= 0) {
          const updatedEnrolls = [...enrolls];
          updatedEnrolls[existingEnrollIdx] = {
            ...updatedEnrolls[existingEnrollIdx],
            last_accessed_lesson_id: currentLesson.id,
            last_accessed_at: nowIso,
          };
          saveLocalEnrollments(updatedEnrolls);
        }
      }

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
    [currentMonster, courseLessons, floorIndex, courseId]
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
    setCoins(0);
    setXp(0);
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
        dungeonTitle={isEn ? trackMeta.dungeonRealmNameEn : `${trackMeta.dungeonRealmName} · ${dungeonTitle}`}
        roomTitle={currentLessonTitle}
        hearts={hearts}
        maxHearts={maxHearts}
        coins={coins}
        xp={xp}
        soundEnabled={soundEnabled}
        languageName={trackMeta.name}
        languageBadge={trackMeta.name}
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
          runId={runId}
          monster={currentMonster}
          question={currentQuestion}
          monsterHp={room.entity?.isCompleted ? 0 : currentMonster.maxHp}
          maxMonsterHp={currentMonster.maxHp}
          playerHearts={hearts}
          initialFocus={3}
          maxFocus={6}
          courseId={courseId}
          lessonId={courseLessons[floorIndex]?.id}
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
        dungeonTitle={dungeonTitle}
        courseTitle={course?.title || t("คอร์สเรียน", "Course")}
        totalCoins={coins}
        totalXp={xp}
        onExit={() => router.push("/courses")}
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
