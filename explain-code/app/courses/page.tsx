"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SiteHeader,
  getClientSession,
  ClientAuthSession,
} from "../components/SiteHeader";
import { Icon, StatusCircle } from "../components/Icons";
import { BlockModelGrid } from "../components/BlockModelGrid";
import { TopicDungeonArena } from "../components/dungeon/TopicDungeonArena";
import { DungeonRunScreen } from "../components/DungeonRunScreen";
import { PixelSpriteView } from "../components/dungeon/PixelSpriteView";
import { useUiLanguage } from "../components/LanguageProvider";
import { getMonsterDef, MonsterType } from "../lib/dungeon/monsters";
import {
  AVATARS,
  AvatarKey,
  DEFAULT_AVATAR,
  getAvatar,
} from "../lib/dungeon/sprites";
import { dungeonSound } from "../lib/dungeon/sound";
import {
  TOPICS,
  BLOCK_MODEL_CELLS,
  BlockCellId,
  INITIAL_STUDENTS,
  StudentRecord,
  getMasteryStatus,
} from "../lib/curriculum";
import {
  LANGUAGE_TRACKS,
  LearningLanguage,
  getTopicsByLanguage,
  runCodeByLanguage,
} from "../lib/language-tracks";
import { Course, Enrollment, Lesson } from "../lib/supabase";
import {
  loadLocalCourses,
  loadLocalEnrollments,
  loadLocalLessons,
  saveLocalCourses,
  saveLocalEnrollments,
  saveLocalLessons,
} from "../lib/lms-data";

type LearningTab = "quest" | "hero-select" | "practice" | "custom" | "learn";

const GUEST_CELL_SCORES: Record<BlockCellId, number> = {
  T1: 0,
  T2: 0,
  T3: 0,
  T4: 0,
  E1: 0,
  E2: 0,
  E3: 0,
  E4: 0,
  F1: 0,
  F2: 0,
  F3: 0,
  F4: 0,
};

const GUEST_STUDENT: StudentRecord = {
  id: "guest",
  nickname: "Guest",
  pinHash: "",
  roomCode: "",
  xp: 0,
  streak: 0,
  completedTopics: [],
  badges: [],
  cellScores: GUEST_CELL_SCORES,
  history: [],
};

interface LeaderboardEntry {
  displayName: string;
  avatar?: string;
  level: number;
  xp: number;
  totalMonstersDefeated: number;
  totalDungeonsCleared: number;
}

const STORAGE_STUDENTS_KEY = "explain_code_students_v2";
const STORAGE_AVATAR_KEY = "explain_code_dungeon_avatar";
const STORAGE_SOUND_KEY = "explain_code_dungeon_sound";

const SUPPORTED_LANGUAGES: LearningLanguage[] = [
  "javascript",
  "python",
  "sql",
  "typescript",
  "cpp",
  "java",
];

function isValidLearningLanguage(val: string | null): val is LearningLanguage {
  return Boolean(val && SUPPORTED_LANGUAGES.includes(val as LearningLanguage));
}

function getFloorMonsterType(idx: number, isBoss: boolean): MonsterType {
  if (isBoss) return "boss";
  const cycle: MonsterType[] = ["slime", "skeleton", "goblin"];
  return cycle[idx % cycle.length];
}

function getJoinCodePlaceholder(lang: LearningLanguage): string {
  switch (lang) {
    case "python":
      return "PY2026";
    case "sql":
      return "SQL2026";
    case "typescript":
      return "TS2026";
    case "cpp":
      return "CPP2026";
    case "java":
      return "JAVA2026";
    default:
      return "JS2026";
  }
}

function formatAttemptTimestamp(isoStr?: string): string {
  if (!isoStr) return "เมื่อสักครู่";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "เมื่อสักครู่";
  }
}

function isCourseForLanguage(
  course: Course,
  courseLessons: Lesson[],
  lang: LearningLanguage
): boolean {
  const titleUpper = `${course.title} ${course.description} ${course.join_code}`.toUpperCase();
  const titleWithoutJs = titleUpper.replace(/JAVASCRIPT/g, "");
  const codeUpper = course.join_code.toUpperCase();
  const lessonLangs = courseLessons.map((l) =>
    l.programming_language.toLowerCase().trim()
  );

  if (lang === "python") {
    return (
      course.id.includes("python") ||
      titleUpper.includes("PYTHON") ||
      codeUpper.startsWith("PY") ||
      lessonLangs.includes("python")
    );
  }
  if (lang === "sql") {
    return (
      course.id.includes("sql") ||
      titleUpper.includes("SQL") ||
      codeUpper.startsWith("SQL") ||
      lessonLangs.includes("sql")
    );
  }
  if (lang === "typescript") {
    return (
      course.id.includes("typescript") ||
      course.id.includes("-ts-") ||
      titleUpper.includes("TYPESCRIPT") ||
      codeUpper.startsWith("TS") ||
      lessonLangs.includes("typescript")
    );
  }
  if (lang === "cpp") {
    return (
      course.id.includes("cpp") ||
      titleUpper.includes("C++") ||
      codeUpper.startsWith("CPP") ||
      lessonLangs.includes("cpp") ||
      lessonLangs.includes("c++")
    );
  }
  if (lang === "java") {
    return (
      course.id.includes("java") ||
      /\bJAVA\b/.test(titleWithoutJs) ||
      codeUpper.startsWith("JAVA") ||
      lessonLangs.includes("java")
    );
  }

  const isOtherTrack =
    isCourseForLanguage(course, courseLessons, "python") ||
    isCourseForLanguage(course, courseLessons, "sql") ||
    isCourseForLanguage(course, courseLessons, "typescript") ||
    isCourseForLanguage(course, courseLessons, "cpp") ||
    isCourseForLanguage(course, courseLessons, "java");
  return !isOtherTrack || lessonLangs.includes("javascript");
}

function CoursesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useUiLanguage();
  const rawLangParam = searchParams.get("lang");
  const langParam = isValidLearningLanguage(rawLangParam) ? rawLangParam : null;

  const [selectedLanguage, setSelectedLanguage] =
    useState<LearningLanguage | null>(langParam);
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<LearningTab>("quest");

  // Dungeon Hub merged preferences: Avatar & Leaderboard
  const [selectedAvatarKey, setSelectedAvatarKey] =
    useState<AvatarKey>(DEFAULT_AVATAR);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Student & quest state (empty until logged in; guests never load or save progress)
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [currentStudentId, setCurrentStudentId] = useState<string>("stu-1");
  const [selectedTopicId, setSelectedTopicId] = useState<number>(1);
  const [unlockAllDemo, setUnlockAllDemo] = useState<boolean>(false);
  const [playAttemptNonce, setPlayAttemptNonce] = useState<number>(0);
  const [guestNotice, setGuestNotice] = useState<string | null>(null);

  // Code runner sandbox state
  const [playgroundCode, setPlaygroundCode] = useState<string>(
    LANGUAGE_TRACKS[0].defaultPlaygroundCode
  );
  const [playgroundOutput, setPlaygroundOutput] = useState<string>("");

  // Courses & lessons (LMS)
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinMsg, setJoinMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Sync ?lang=... query param
  useEffect(() => {
    if (langParam) {
      setSelectedLanguage(langParam);
      const track = LANGUAGE_TRACKS.find((tr) => tr.id === langParam);
      const langTopics = getTopicsByLanguage(langParam);
      if (track) {
        setPlaygroundCode(track.defaultPlaygroundCode);
        setPlaygroundOutput("");
      }
      if (langTopics.length > 0) {
        setSelectedTopicId(langTopics[0].id);
      }
    } else {
      setSelectedLanguage(null);
    }
  }, [langParam]);

  const handleSelectLanguage = (lang: LearningLanguage) => {
    const track = LANGUAGE_TRACKS.find((tr) => tr.id === lang);
    const langTopics = getTopicsByLanguage(lang);
    setSelectedLanguage(lang);
    setActiveTab("quest");
    setGuestNotice(null);
    if (track) {
      setPlaygroundCode(track.defaultPlaygroundCode);
      setPlaygroundOutput("");
    }
    if (langTopics.length > 0) {
      setSelectedTopicId(langTopics[0].id);
    }
    router.push(`/courses?lang=${lang}`);
  };

  const handleStartTopic = (topicId: number) => {
    setGuestNotice(null);
    setSelectedTopicId(topicId);
    setActiveTab("hero-select");
  };

  const handleConfirmHeroAndPlay = (key?: AvatarKey) => {
    const chosen = key || selectedAvatarKey;
    setSelectedAvatarKey(chosen);
    try {
      localStorage.setItem(STORAGE_AVATAR_KEY, chosen);
    } catch {
      // ignore
    }
    setPlayAttemptNonce((n) => n + 1);
    setActiveTab("practice");
  };

  const saveStudentsToStorage = (updated: StudentRecord[]) => {
    if (!getClientSession()) return;
    setStudents(updated);
    try {
      localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const syncStudentData = useCallback(
    async (targetId?: string) => {
      if (!getClientSession()) return;
      const sid = targetId || currentStudentId;
      if (!sid) return;

      try {
        const authRes = await fetch(
          `/api/auth?studentId=${encodeURIComponent(sid)}`
        );
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.source === "supabase" && authData.student) {
            const sbStudent: StudentRecord = authData.student;
            setStudents((prev) => {
              const exists = prev.some((s) => s.id === sbStudent.id);
              const nextList = exists
                ? prev.map((s) =>
                    s.id === sbStudent.id ? { ...s, ...sbStudent } : s
                  )
                : [...prev, sbStudent];
              try {
                localStorage.setItem(
                  STORAGE_STUDENTS_KEY,
                  JSON.stringify(nextList)
                );
              } catch {}
              return nextList;
            });
            return;
          }
        }

        const attRes = await fetch(
          `/api/attempts?studentId=${encodeURIComponent(sid)}`
        );
        if (attRes.ok) {
          const attData = await attRes.json();
          if (Array.isArray(attData.attempts) && attData.attempts.length > 0) {
            const allTopics = LANGUAGE_TRACKS.flatMap((tr) =>
              getTopicsByLanguage(tr.id)
            );
            const formattedHistory = attData.attempts.map((att: any) => ({
              topicId: att.topic_id,
              topicTitle:
                allTopics.find((tp) => tp.id === att.topic_id)?.title ||
                TOPICS.find((tp) => tp.id === att.topic_id)?.title ||
                `เรื่องที่ ${att.topic_id}`,
              scorePercent: att.score_percent,
              xpEarned: att.xp_earned,
              timestamp: formatAttemptTimestamp(att.created_at),
            }));

            setStudents((prev) => {
              const stu = prev.find((s) => s.id === sid);
              if (!stu) return prev;
              const synced: StudentRecord = {
                ...stu,
                history: formattedHistory,
              };
              const nextList = prev.map((s) =>
                s.id === synced.id ? synced : s
              );
              try {
                localStorage.setItem(
                  STORAGE_STUDENTS_KEY,
                  JSON.stringify(nextList)
                );
              } catch {}
              return nextList;
            });
          }
        }
      } catch {
        // offline fallback
      }
    },
    [currentStudentId]
  );

  useEffect(() => {
    const current = getClientSession();
    setSession(current);

    const handleAuthChange = () => {
      const updatedSession = getClientSession();
      setSession(updatedSession);
      if (updatedSession) {
        if (updatedSession.role === "student" && updatedSession.userId) {
          setCurrentStudentId(updatedSession.userId);
        }
        try {
          const savedStudents = localStorage.getItem(STORAGE_STUDENTS_KEY);
          if (savedStudents) {
            setStudents(JSON.parse(savedStudents));
          } else {
            setStudents(INITIAL_STUDENTS);
            localStorage.setItem(
              STORAGE_STUDENTS_KEY,
              JSON.stringify(INITIAL_STUDENTS)
            );
          }
        } catch {
          // ignore
        }
        if (updatedSession.role === "student" && updatedSession.userId) {
          void syncStudentData(updatedSession.userId);
        }
      } else {
        setStudents([]);
      }
    };

    window.addEventListener("explain-code-auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    try {
      const savedAvatar = localStorage.getItem(STORAGE_AVATAR_KEY) as AvatarKey;
      if (savedAvatar && AVATARS.some((a) => a.key === savedAvatar)) {
        setSelectedAvatarKey(savedAvatar);
      }
      const savedSound = localStorage.getItem(STORAGE_SOUND_KEY);
      if (savedSound !== null) {
        const enabled = savedSound === "true";
        dungeonSound.setEnabled(enabled);
      }

      if (current) {
        const savedStudents = localStorage.getItem(STORAGE_STUDENTS_KEY);
        if (savedStudents) {
          setStudents(JSON.parse(savedStudents));
        } else {
          setStudents(INITIAL_STUDENTS);
          localStorage.setItem(
            STORAGE_STUDENTS_KEY,
            JSON.stringify(INITIAL_STUDENTS)
          );
        }
      } else {
        setStudents([]);
      }
    } catch {
      // ignore
    }

    if (current?.role === "student" && current.userId) {
      setCurrentStudentId(current.userId);
      void syncStudentData(current.userId);
    }

    const localCourses = loadLocalCourses();
    const localLessons = loadLocalLessons();
    const localEnrolls = current ? loadLocalEnrollments() : [];
    setCourses(localCourses);
    setLessons(localLessons);
    setEnrollments(localEnrolls);

    const syncFromServer = async () => {
      try {
        const res = await fetch(
          `/api/lms?studentId=${encodeURIComponent(current?.userId || "")}`
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data.courses)) {
          const mergedCourses = [
            ...data.courses,
            ...localCourses.filter(
              (lc) => !data.courses.some((dc: Course) => dc.id === lc.id)
            ),
          ];
          const mergedLessons = [
            ...(data.lessons || []),
            ...localLessons.filter(
              (ll) =>
                !(data.lessons || []).some((dl: Lesson) => dl.id === ll.id)
            ),
          ];
          setCourses(mergedCourses);
          setLessons(mergedLessons);
          saveLocalCourses(mergedCourses);
          saveLocalLessons(mergedLessons);

          if (current && Array.isArray(data.enrollments) && data.enrollments.length > 0) {
            const mergedEnrolls = [
              ...data.enrollments,
              ...localEnrolls.filter(
                (le) =>
                  !data.enrollments.some(
                    (de: Enrollment) =>
                      de.course_id === le.course_id &&
                      de.student_id === le.student_id
                  )
              ),
            ];
            setEnrollments(mergedEnrolls);
            saveLocalEnrollments(mergedEnrolls);
          }
        }
      } catch {
        // use local fallback
      }
    };

    void syncFromServer();

    const loadLeaderboard = async () => {
      try {
        const lbRes = await fetch("/api/dungeon/leaderboard");
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          if (Array.isArray(lbData.leaderboard)) {
            setLeaderboard(lbData.leaderboard);
          }
        }
      } catch {
        // ignore leaderboard error
      }
    };
    void loadLeaderboard();

    return () => {
      window.removeEventListener("explain-code-auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [syncStudentData]);

  const currentStudent: StudentRecord = session
    ? students.find((s) => s.id === currentStudentId) || {
        id: session.userId,
        nickname: session.displayName || session.username,
        pinHash: "0000",
        roomCode: session.roomCode || "M401",
        xp: 0,
        streak: 0,
        completedTopics: [],
        badges: [],
        cellScores: { ...GUEST_CELL_SCORES },
        history: [],
      }
    : GUEST_STUDENT;

  const currentAvatar = getAvatar(selectedAvatarKey);
  const currentLanguage: LearningLanguage = selectedLanguage || "javascript";
  const currentTrackMeta =
    LANGUAGE_TRACKS.find((tr) => tr.id === currentLanguage) ||
    LANGUAGE_TRACKS[0];
  const currentLanguageTopics = getTopicsByLanguage(currentLanguage);

  const activeTopicIndex = Math.max(
    0,
    currentLanguageTopics.findIndex((tp) => tp.id === selectedTopicId)
  );
  const activeTopic =
    currentLanguageTopics[activeTopicIndex] || currentLanguageTopics[0];

  const studentLevel = Math.floor(currentStudent.xp / 100) + 1;
  const studentAvgMastery = Math.round(
    Object.values(currentStudent.cellScores).reduce((a, b) => a + b, 0) / 12
  );

  const sortedStudentCells = [...BLOCK_MODEL_CELLS].sort(
    (a, b) =>
      (currentStudent.cellScores[b.id] ?? 0) -
      (currentStudent.cellScores[a.id] ?? 0)
  );
  const strongStudentCells = sortedStudentCells.filter(
    (c) => (currentStudent.cellScores[c.id] ?? 0) >= 80
  );
  const reviewStudentCells = sortedStudentCells
    .filter((c) => (currentStudent.cellScores[c.id] ?? 0) < 60)
    .reverse();

  const isTopicUnlocked = (topicId: number, idx: number): boolean => {
    if (unlockAllDemo) return true;
    if (idx === 0) return true;
    if (topicId === 7) {
      return currentStudent.completedTopics.length >= 4;
    }
    const prevTopic = currentLanguageTopics[idx - 1];
    return prevTopic
      ? currentStudent.completedTopics.includes(prevTopic.id)
      : true;
  };

  const handleCompleteTopic = (result: {
    topicId: number;
    earnedXp: number;
    updatedCellScores: Partial<Record<BlockCellId, number>>;
    badgeId: string;
    scorePercent: number;
    answers?: {
      questionId: string;
      cellId: string;
      chosenOptionId?: string | null;
      isCorrect: boolean;
      tries: number;
      xpEarned: number;
    }[];
    aiEvaluation?: {
      studentExplanation: string;
      score: number;
      passed: boolean;
      feedback: string;
    };
  }) => {
    const topicObj = currentLanguageTopics.find(
      (tp) => tp.id === result.topicId
    );
    const currentStudentSnapshot = currentStudent;

    const nextCompleted = currentStudentSnapshot.completedTopics.includes(
      result.topicId
    )
      ? currentStudentSnapshot.completedTopics
      : [...currentStudentSnapshot.completedTopics, result.topicId];

    const nextBadges = currentStudentSnapshot.badges.includes(result.badgeId)
      ? currentStudentSnapshot.badges
      : [...currentStudentSnapshot.badges, result.badgeId];

    const nextCells = { ...currentStudentSnapshot.cellScores };
    Object.entries(result.updatedCellScores).forEach(([cellKey, val]) => {
      const k = cellKey as BlockCellId;
      if (typeof val === "number") {
        nextCells[k] = Math.max(nextCells[k] || 0, val);
      }
    });

    const newHistoryItem = {
      topicId: result.topicId,
      topicTitle:
        topicObj?.title ||
        `${currentTrackMeta.name} เรื่องที่ ${result.topicId}`,
      scorePercent: result.scorePercent,
      xpEarned: result.earnedXp,
      timestamp: "เมื่อสักครู่",
    };

    const nextHistory = [newHistoryItem, ...currentStudentSnapshot.history];

    const optimisticStudent: StudentRecord = {
      ...currentStudentSnapshot,
      xp: currentStudentSnapshot.xp + result.earnedXp,
      completedTopics: nextCompleted,
      badges: nextBadges,
      cellScores: nextCells,
      history: nextHistory,
    };

    const updatedStudents = students.map((stu) =>
      stu.id === currentStudentSnapshot.id ? optimisticStudent : stu
    );
    if (!updatedStudents.some((stu) => stu.id === currentStudentSnapshot.id)) {
      updatedStudents.push(optimisticStudent);
    }

    if (!session) {
      setGuestNotice(
        t(
          "คุณผ่านด่านนี้ในโหมดทดลอง (Guest) — ความคืบหน้าจะไม่ถูกบันทึก เข้าสู่ระบบเพื่อเก็บ XP และปลดล็อกด่านถัดไป",
          "Cleared in Guest mode — progress is not saved. Log in to save XP and unlock the next floor."
        )
      );
      setPlayAttemptNonce((n) => n + 1);
      setActiveTab("quest");
      return;
    }

    saveStudentsToStorage(updatedStudents);
    setActiveTab("learn");

    void (async () => {
      try {
        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: currentStudentSnapshot.id,
            topicId: result.topicId,
            scorePercent: result.scorePercent,
            earnedXp: result.earnedXp,
            updatedCellScores: result.updatedCellScores,
            badgeId: result.badgeId,
            answers: result.answers,
            aiEvaluation: result.aiEvaluation,
          }),
        });
        if (res.ok) {
          await syncStudentData(currentStudentSnapshot.id);
        }
      } catch {
        // ignore offline error
      }
    })();
  };

  const publishedCourses = courses.filter((c) => c.is_published);
  const languageFilteredCourses = publishedCourses.filter((c) => {
    const cLessons = lessons.filter(
      (l) => l.course_id === c.id && l.is_published
    );
    return isCourseForLanguage(c, cLessons, currentLanguage);
  });

  const handleEnrollCourse = async (course: Course) => {
    if (!session) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/courses/${course.id}`)}`
      );
      return;
    }

    const courseLessons = lessons
      .filter((l) => l.course_id === course.id && l.is_published)
      .sort((a, b) => a.order_index - b.order_index);
    const firstLessonId = courseLessons[0]?.id || null;

    const already = enrollments.find(
      (e) => e.course_id === course.id && e.student_id === session.userId
    );

    if (!already) {
      const newEnroll: Enrollment = {
        id: `enr-${Date.now()}`,
        course_id: course.id,
        student_id: session.userId,
        enrolled_at: new Date().toISOString(),
        last_accessed_lesson_id: firstLessonId,
        last_accessed_at: new Date().toISOString(),
      };
      const updated = [newEnroll, ...enrollments];
      setEnrollments(updated);
      saveLocalEnrollments(updated);

      try {
        await fetch("/api/lms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "enroll",
            courseId: course.id,
            studentId: session.userId,
            lastAccessedLessonId: firstLessonId,
          }),
        });
      } catch {
        // ignore
      }
    }

    router.push(`/courses/${course.id}`);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinMsg(null);
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    const matched = publishedCourses.find(
      (c) => c.join_code.toUpperCase() === cleanCode
    );
    if (!matched) {
      setJoinMsg({
        type: "error",
        text: t(
          `ไม่พบรหัส "${cleanCode}" (ลอง: JS2026, PY2026, SQL2026, TS2026, CPP2026, JAVA2026)`,
          `Code "${cleanCode}" not found (Try: JS2026, PY2026, SQL2026, TS2026, CPP2026, JAVA2026)`
        ),
      });
      return;
    }

    setJoinMsg({
      type: "success",
      text: t(
        `พบ "${matched.title}" กำลังเข้าสู่คอร์ส...`,
        `Found "${matched.title}" — entering...`
      ),
    });
    await handleEnrollCourse(matched);
  };

  // ==========================================================================
  // STEP 1: Language Picker (Must choose a language before entering Dungeon)
  // ==========================================================================
  if (!selectedLanguage) {
    const bossSprite = getMonsterDef("boss").sprite;
    return (
      <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6] flex flex-col">
        <SiteHeader />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-10 flex flex-col gap-6">
          {/* Crisp Step 1 Header */}
          <section className="rounded-3xl border border-[#2f2d45] bg-[#141220] p-5 sm:p-7 text-center shadow-xl">
            <div className="flex justify-center mb-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f6c945]/40 bg-[#1c1b2b] px-3.5 py-1 text-xs font-extrabold text-[#ffe27a]">
                <Icon name="gamepad" className="h-3.5 w-3.5 text-[#ffe27a]" />
                <span>
                  {t(
                    "ขั้นตอนที่ 1 · เลือกภาษาเข้าสู่ดันเจี้ยน",
                    "STEP 1 · CHOOSE YOUR LANGUAGE"
                  )}
                </span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#f4efe6]">
              {t(
                "เลือกภาษาเพื่อเข้าสู่ดันเจี้ยน",
                "Choose Your Language to Enter the Dungeon"
              )}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#9a93ad]">
              {t(
                "เลือก 1 ภาษาด้านล่างเพื่อเริ่มผจญภัย 2D RPG และคอร์สเรียน",
                "Pick 1 programming language below to unlock its 2D RPG floors and courses."
              )}
            </p>
          </section>

          {/* 6 Crisp Language Cards */}
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {LANGUAGE_TRACKS.map((track) => {
              const trackTopics = getTopicsByLanguage(track.id);
              const trackCourses = publishedCourses.filter((c) => {
                const cLessons = lessons.filter(
                  (l) => l.course_id === c.id && l.is_published
                );
                return isCourseForLanguage(c, cLessons, track.id);
              });

              return (
                <div
                  key={track.id}
                  className="rounded-3xl border border-[#2f2d45] bg-[#1c1b2b] p-5 flex flex-col justify-between gap-4 text-[#f4efe6] shadow-lg hover:border-[#f6c945]/60 transition-colors"
                >
                  <div className="flex flex-col gap-3">
                    {/* Badge + Floor/Boss Count Pill */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="rounded-full border border-[#2f2d45] bg-[#141220] px-3 py-1 text-xs font-extrabold text-[#ffe27a]">
                        {track.shortBadge}
                      </span>
                      <span className="rounded-full bg-[#141220] border border-[#2f2d45] px-2.5 py-0.5 text-[11px] font-bold text-[#9a93ad]">
                        {t(
                          `${trackTopics.length} ชั้น · 1 บอส · ${trackCourses.length} คอร์ส`,
                          `${trackTopics.length} Floors · 1 Boss · ${trackCourses.length} Course${trackCourses.length === 1 ? "" : "s"}`
                        )}
                      </span>
                    </div>

                    {/* Language Name + Realm Name + Boss Sprite */}
                    <div className="rounded-2xl border border-[#2f2d45] bg-[#0d0b14] p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-extrabold text-[#f4efe6]">
                          {track.name}
                        </div>
                        <h2 className="text-sm font-extrabold text-[#ffe27a] truncate">
                          {t(track.dungeonRealmName, track.dungeonRealmNameEn)}
                        </h2>
                      </div>
                      <div className="shrink-0 flex flex-col items-center gap-0.5 rounded-xl bg-[#1c1b2b] border border-[#9b5de5]/50 px-2 py-1">
                        <PixelSpriteView sprite={bossSprite} size={28} animateBounce />
                        <span className="pixel-font text-[8px] font-bold text-[#e9d5ff]">
                          BOSS
                        </span>
                      </div>
                    </div>

                    {/* 1 Short Punchy Sentence */}
                    <p className="text-xs font-semibold text-[#9a93ad] line-clamp-2">
                      {t(track.tagline, track.taglineEn || track.tagline)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectLanguage(track.id)}
                    className="retro-button w-full rounded-2xl bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] py-3 px-4 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Icon name="play" className="h-4 w-4" filled />
                    <span>
                      {t(
                        `ลุยดันเจี้ยน ${track.name} →`,
                        `Enter ${track.name} Dungeon →`
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </section>

          {/* Compact Course Join Code Bar */}
          <section className="rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="text-xs sm:text-sm font-bold text-[#ffe27a]">
              {t(
                "มีรหัสคอร์สเรียนจากครูแล้ว?",
                "Have a teacher course join code?"
              )}
            </div>

            <form
              onSubmit={handleJoinByCode}
              className="flex w-full sm:w-auto flex-col gap-1"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) =>
                    setJoinCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder={t("เช่น JS2026, PY2026", "e.g. JS2026, PY2026")}
                  className="w-full sm:w-48 rounded-xl border border-[#2f2d45] bg-[#0d0b14] px-3 py-2 text-xs font-mono font-bold uppercase text-[#f4efe6] placeholder:text-[#7c7491] focus:border-[#ffe27a] focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="retro-button rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] px-4 py-2 text-xs font-extrabold text-[#120f1c] cursor-pointer shrink-0"
                >
                  {t("เข้าร่วม", "Join")}
                </button>
              </div>
              {joinMsg && (
                <p
                  className={`text-xs font-bold ${
                    joinMsg.type === "error"
                      ? "text-[#ff6b81]"
                      : "text-[#2fbf71]"
                  }`}
                >
                  {joinMsg.text}
                </p>
              )}
            </form>
          </section>
        </main>
      </div>
    );
  }

  // ==========================================================================
  // STEP 2: Learning Dungeon Mode (For Selected Language)
  // ==========================================================================
  const clearedCount = currentLanguageTopics.filter((tp) =>
    currentStudent.completedTopics.includes(tp.id)
  ).length;

  return (
    <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6] flex flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 flex flex-col">
        {/* SINGLE UNIFIED DUNGEON CARD CONTAINER */}
        <div className="rounded-3xl border border-[#2f2d45] bg-[#141220] text-[#f4efe6] p-5 sm:p-7 shadow-xl flex flex-col gap-5">
          {/* ==================== TAB 1: DUNGEON MAP ==================== */}
          {activeTab === "quest" && (
            <div className="flex flex-col gap-6">
              {guestNotice && !session && (
                <div className="rounded-2xl bg-[#1c1b2b] p-4 border border-[#f6c945]/50 flex flex-wrap items-center justify-between gap-3 text-xs text-[#ffe27a]">
                  <span className="font-bold">{guestNotice}</span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/login?redirect=${encodeURIComponent(
                        `/courses?lang=${currentLanguage}`
                      )}`}
                      className="retro-button rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#120f1c] px-3 py-1.5 font-extrabold"
                    >
                      {t("เข้าสู่ระบบ", "Log in")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setGuestNotice(null)}
                      className="px-2 py-1 text-[#9a93ad] hover:text-[#f4efe6] cursor-pointer"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Subsection A: Topics / Dungeon Floors Grid */}
              <section className="flex flex-col gap-4 pb-6 border-b border-[#2f2d45]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#ffe27a]">
                    {t(
                      `ชั้นดันเจี้ยน ${currentTrackMeta.name} (${clearedCount}/${currentLanguageTopics.length})`,
                      `${currentTrackMeta.name} Dungeon Floors (${clearedCount}/${currentLanguageTopics.length})`
                    )}
                  </h2>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setUnlockAllDemo(!unlockAllDemo)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                        unlockAllDemo
                          ? "bg-[#152922] border-[#2fbf71] text-[#86efac]"
                          : "bg-[#1c1b2b] border-[#2f2d45] text-[#ffe27a] hover:border-[#f6c945]/50"
                      }`}
                    >
                      {unlockAllDemo
                        ? t("✓ ปลดล็อกทั้งหมดแล้ว", "✓ All Unlocked")
                        : t("ปลดล็อกทั้งหมด (Demo)", "Unlock All (Demo)")}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nextTopic =
                          currentLanguageTopics.find(
                            (tp) => !currentStudent.completedTopics.includes(tp.id)
                          ) || currentLanguageTopics[0];
                        handleStartTopic(nextTopic.id);
                      }}
                      className="retro-button bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] px-4 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer"
                    >
                      {t("ลุยชั้นถัดไป →", "Play Next Floor →")}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentLanguageTopics.map((topic, idx) => {
                    const isPassed = currentStudent.completedTopics.includes(
                      topic.id
                    );
                    const unlocked = isTopicUnlocked(topic.id, idx);
                    const isBoss = Boolean(topic.isBoss);
                    const monsterType = getFloorMonsterType(idx, isBoss);
                    const monsterDef = getMonsterDef(monsterType);

                    return (
                      <div
                        key={topic.id}
                        className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition ${
                          isBoss
                            ? unlocked
                              ? "bg-gradient-to-br from-[#2a1746] to-[#1c1b2b] border-[#9b5de5] md:col-span-2 lg:col-span-3"
                              : "bg-[#1c1b2b] border-[#2f2d45] md:col-span-2 lg:col-span-3 opacity-80"
                            : isPassed
                            ? "bg-[#152922] border-[#2fbf71]"
                            : unlocked
                            ? "bg-[#1c1b2b] border-[#f6c945]/60"
                            : "bg-[#1c1b2b] border-[#2f2d45] opacity-75"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 rounded-xl p-2 border border-[#2f2d45] bg-[#0d0b14] flex flex-col items-center min-w-[54px]">
                            <PixelSpriteView
                              sprite={monsterDef.sprite}
                              size={34}
                              animateBounce={unlocked && !isPassed}
                            />
                            <span className="pixel-font text-[8px] font-bold text-[#ffe27a] mt-0.5">
                              {isBoss ? "BOSS" : `FL.${idx + 1}`}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isBoss
                                  ? "bg-[#5a2d91] text-[#ffe27a]"
                                  : isPassed
                                  ? "bg-[#1a7a4a] text-[#dcfce7]"
                                  : unlocked
                                  ? "bg-[#f6c945] text-[#120f1c]"
                                  : "bg-[#2f2d45] text-[#9a93ad]"
                              }`}
                            >
                              {isPassed
                                ? t("พิชิตแล้ว", "Cleared")
                                : unlocked
                                ? isBoss
                                  ? t("บอสพร้อมลุย!", "Boss Ready!")
                                  : t("พร้อมลุย", "Ready")
                                : t("ล็อกอยู่", "Locked")}
                            </span>
                            <h3 className="text-sm sm:text-base font-extrabold text-[#f4efe6] mt-1 truncate">
                              {topic.title}
                            </h3>
                            <div className="text-[11px] font-bold text-[#ffe27a] mt-0.5 flex items-center gap-1 truncate">
                              <Icon name="shield" size={12} />
                              <span className="truncate">{topic.badgeReward.name}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!unlocked}
                          onClick={() => handleStartTopic(topic.id)}
                          className={`retro-button w-full px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                            isBoss
                              ? "bg-[#9b5de5] hover:bg-[#b07af0] text-white"
                              : isPassed
                              ? "bg-[#2fbf71] hover:bg-[#34d37d] text-[#120f1c]"
                              : "bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c]"
                          }`}
                        >
                          <Icon name={unlocked ? "gamepad" : "lock"} size={15} />
                          <span>
                            {isPassed
                              ? t("เล่นซ้ำ", "Replay")
                              : unlocked
                              ? isBoss
                                ? t("ท้าทายบอส!", "Fight Boss!")
                                : t("ลุยชั้นนี้", "Play")
                              : t("ล็อกอยู่", "Locked")}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Subsection B: Course Dungeons + Compact Join Code */}
              <section className="flex flex-col gap-4 pb-6 border-b border-[#2f2d45]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-extrabold text-[#ffe27a] flex items-center gap-2">
                    <Icon name="book" className="h-5 w-5 text-[#2fbf71]" />
                    <span>
                      {t(
                        `ดันเจี้ยนประจำคอร์ส (${currentTrackMeta.name})`,
                        `${currentTrackMeta.name} Course Dungeons`
                      )}
                    </span>
                  </h2>

                  <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) =>
                        setJoinCodeInput(e.target.value.toUpperCase())
                      }
                      placeholder={t(
                        `รหัสคอร์ส เช่น ${getJoinCodePlaceholder(currentLanguage)}`,
                        `Code e.g. ${getJoinCodePlaceholder(currentLanguage)}`
                      )}
                      className="w-36 sm:w-44 rounded-xl border border-[#2f2d45] bg-[#0d0b14] px-3 py-1.5 text-xs font-mono font-bold uppercase text-[#f4efe6] placeholder:text-[#7c7491] focus:border-[#f6c945] focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      className="retro-button rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] px-3.5 py-1.5 text-xs font-extrabold text-[#120f1c] cursor-pointer"
                    >
                      {t("เข้าร่วม", "Join")}
                    </button>
                  </form>
                </div>

                {joinMsg && (
                  <p
                    className={`text-xs font-bold ${
                      joinMsg.type === "error"
                        ? "text-[#ff6b81]"
                        : "text-[#2fbf71]"
                    }`}
                  >
                    {joinMsg.text}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {languageFilteredCourses.map((course) => {
                    const courseLessons = lessons.filter(
                      (l) => l.course_id === course.id && l.is_published
                    );
                    const isEnrolled = Boolean(
                      session &&
                        enrollments.some(
                          (e) =>
                            e.course_id === course.id &&
                            e.student_id === session.userId
                        )
                    );

                    return (
                      <div
                        key={course.id}
                        className="flex flex-col justify-between rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-4 gap-3 hover:border-[#2fbf71]/60 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="rounded-full bg-[#152922] border border-[#2fbf71]/40 px-2.5 py-0.5 text-[11px] font-extrabold text-[#86efac]">
                              {courseLessons.length} {t("บทเรียน", "lessons")}
                            </span>
                            <span className="rounded-lg border border-[#2f2d45] bg-[#0d0b14] px-2 py-0.5 text-[11px] font-mono font-bold text-[#ffe27a]">
                              {course.join_code}
                            </span>
                          </div>
                          <h3 className="text-base font-extrabold text-[#f4efe6]">
                            {course.title}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#2f2d45]">
                          <span className="text-xs font-semibold text-[#9a93ad]">
                            {course.teacher_name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/dungeon/${course.id}`}
                              className="rounded-xl border border-[#5a2d91] bg-[#252238] hover:bg-[#322c4a] px-3 py-1.5 text-xs font-extrabold flex items-center gap-1 text-[#e9d5ff] transition-colors"
                            >
                              <Icon name="gamepad" size={13} />
                              <span>{t("ดันเจี้ยน", "Dungeon")}</span>
                            </Link>
                            <Link
                              href={`/courses/${course.id}`}
                              className="rounded-xl border border-[#2f2d45] bg-[#0d0b14] hover:border-[#4a4766] px-3 py-1.5 text-xs font-extrabold text-[#f4efe6] transition-colors"
                            >
                              {t("บทเรียน", "Lessons")}
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleEnrollCourse(course)}
                              className="rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] px-3 py-1.5 text-xs font-extrabold text-[#120f1c] cursor-pointer transition-colors"
                            >
                              {isEnrolled
                                ? t("เรียนต่อ →", "Continue →")
                                : t("เข้าร่วม", "Enroll")}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Subsection C: Compact Hall of Fame Leaderboard */}
              <section className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#2f2d45]">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#ffe27a] flex items-center gap-2">
                    <Icon name="trophy" size={18} className="text-[#ffe27a]" />
                    <span>{t("ทำเนียบผู้พิชิต (Hall of Fame)", "Hall of Fame")}</span>
                  </h2>
                  <div className="flex items-center gap-3 text-[11px]">
                    <Link
                      href="/dungeon/trial"
                      className="text-[#e9d5ff] hover:text-[#ffe27a] font-bold"
                    >
                      {t("ทดลอง 1 ห้อง →", "1-Room Trial →")}
                    </Link>
                    <Link
                      href="/dungeon/credits"
                      className="text-[#9a93ad] hover:text-[#ffe27a] underline"
                    >
                      {t("Credits & Licenses", "Credits & Licenses")}
                    </Link>
                  </div>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[#9a93ad]">
                    {t(
                      "ยังไม่มีข้อมูลอันดับ — มาร่วมเป็นผู้พิชิตคนแรกกันเลย!",
                      "No leaderboard entries yet — be the first adventurer!"
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-[#2f2d45]">
                    {leaderboard.slice(0, 5).map((entry, idx) => {
                      const entryAvatar = getAvatar(entry.avatar);
                      return (
                        <div
                          key={idx}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs px-1"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`pixel-font text-xs font-black w-6 text-center ${
                                idx === 0
                                  ? "text-[#f6c945]"
                                  : idx === 1
                                  ? "text-[#e8e1cf]"
                                  : idx === 2
                                  ? "text-[#ffb347]"
                                  : "text-[#9a93ad]"
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <div className="p-1 rounded bg-[#0d0b14] border border-[#2f2d45] shrink-0">
                              <PixelSpriteView sprite={entryAvatar.sprite} size={22} />
                            </div>
                            <div>
                              <span className="font-bold text-[#f4efe6] block">
                                {entry.displayName}
                              </span>
                              <span className="text-[10px] text-[#9a93ad] pixel-font">
                                Lv.{entry.level} · {entry.totalMonstersDefeated}{" "}
                                {t("มอนสเตอร์", "defeated")}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[#2fbf71] font-black pixel-font block">
                              {entry.xp} XP
                            </span>
                            <span className="text-[10px] text-[#9a93ad]">
                              {entry.totalDungeonsCleared} {t("ดันเจี้ยน", "cleared")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ==================== HERO SELECTION SCREEN ==================== */}
          {activeTab === "hero-select" && activeTopic && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Top Navigation Bar: Back button + Floor target info */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#2f2d45]">
                <button
                  type="button"
                  onClick={() => setActiveTab("quest")}
                  className="retro-button px-3.5 py-2 rounded-xl border border-[#2f2d45] bg-[#0d0b14] hover:bg-[#1c1b2b] text-xs font-bold text-[#f4efe6] flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span>← {t("กลับแผนที่ดันเจี้ยน", "Back to Dungeon Map")}</span>
                </button>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`pixel-font text-[10px] px-2.5 py-1 rounded-lg font-bold border ${
                      activeTopic.isBoss
                        ? "bg-[#5a2d91] text-[#ffe27a] border-[#9b5de5]"
                        : "bg-[#0d0b14] text-[#ffe27a] border-[#2f2d45]"
                    }`}
                  >
                    {activeTopic.isBoss
                      ? "BOSS FLOOR"
                      : `FLOOR ${activeTopicIndex + 1}/${currentLanguageTopics.length}`}
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-[#f4efe6] max-w-[280px] sm:max-w-md truncate">
                    {activeTopic.title}
                  </span>
                </div>
              </div>

              {/* Floor Challenge Brief & Target Monster Info */}
              {(() => {
                const floorMonster = getMonsterDef(
                  getFloorMonsterType(activeTopicIndex, Boolean(activeTopic.isBoss))
                );
                return (
                  <div className="rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-[#0d0b14] border border-[#2f2d45] shrink-0">
                        <PixelSpriteView
                          sprite={floorMonster.sprite}
                          size={46}
                          animateBounce
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="pixel-font text-[10px] text-[#ffe27a] uppercase bg-[#0d0b14] px-2 py-0.5 rounded border border-[#2f2d45]">
                            {t("ผู้พิทักษ์ประจำชั้น", "Floor Guardian")}
                          </span>
                          <span className="text-[10px] bg-[#2fbf71]/20 text-[#2fbf71] px-2 py-0.5 rounded border border-[#2fbf71]/40 font-bold">
                            +{floorMonster.xpReward} XP
                          </span>
                          <span className="text-[10px] bg-[#f6c945]/20 text-[#f6c945] px-2 py-0.5 rounded border border-[#f6c945]/40 font-bold">
                            +{floorMonster.coinReward} G
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-[#f4efe6] mt-1">
                          {floorMonster.name}
                        </h3>
                        <p className="text-xs text-[#9a93ad] mt-0.5">
                          {activeTopic.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#ffe27a] font-bold bg-[#0d0b14] px-3 py-2 rounded-xl border border-[#2f2d45] shrink-0">
                      <Icon name="shield" size={15} />
                      <span>{t("รางวัลเมื่อพิชิต:", "Badge Reward:")} {activeTopic.badgeReward.name}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Title Section */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-[#f4efe6] flex items-center gap-2">
                    <Icon name="user" className="h-5 w-5 text-[#f6c945]" />
                    <span>{t("เลือกตัวละครของคุณก่อนลุยชั้นนี้", "Choose Your Hero Before Entering Floor")}</span>
                  </h3>
                  <span className="text-xs text-[#9a93ad]">
                    {t("คลิกที่การ์ดเพื่อเลือกตัวละคร", "Click a hero card to select")}
                  </span>
                </div>
                <p className="text-xs text-[#9a93ad] leading-relaxed">
                  {t(
                    "ตัวละครพิกเซลแต่ละตัวมีบุคลิกและความถนัดเฉพาะตัว เลือกผู้กล้าที่คุณมั่นใจเพื่อลงสู่สนามประลองโค้ด",
                    "Each pixel hero possesses distinct attributes. Choose the adventurer you wish to send into battle."
                  )}
                </p>
              </div>

              {/* 4 Hero Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {AVATARS.map((av) => {
                  const isSelected = av.key === selectedAvatarKey;
                  return (
                    <button
                      key={av.key}
                      type="button"
                      onClick={() => {
                        setSelectedAvatarKey(av.key);
                        try {
                          localStorage.setItem(STORAGE_AVATAR_KEY, av.key);
                        } catch {}
                      }}
                      className={`retro-card p-4 sm:p-5 rounded-2xl text-left cursor-pointer flex flex-col justify-between gap-4 transition-all relative ${
                        isSelected
                          ? "border-[#f6c945] bg-gradient-to-b from-[#2a1746] to-[#1c1b2b] shadow-[0_0_20px_rgba(246,201,69,0.3)] ring-2 ring-[#f6c945]"
                          : "border-[#2f2d45] bg-[#141220] hover:bg-[#1c1b2b] hover:border-[#3d395a]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-[#0d0b14] border-[#f6c945]"
                              : "bg-[#0d0b14] border-[#2f2d45]"
                          }`}
                        >
                          <PixelSpriteView
                            sprite={av.sprite}
                            size={44}
                            animateBounce={isSelected}
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-[#f4efe6] text-sm truncate">
                            {av.name}
                          </h4>
                          <span className="pixel-font text-[10px] text-[#ffe27a] uppercase block mt-0.5">
                            CLASS: {av.key}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#9a93ad] leading-relaxed line-clamp-3">
                        {av.description}
                      </p>

                      <div className="pt-3 border-t border-[#2f2d45] flex items-center justify-between text-xs">
                        <span
                          className={`text-[11px] font-bold ${
                            isSelected ? "text-[#f6c945]" : "text-[#9a93ad]"
                          }`}
                        >
                          {isSelected
                            ? t("✓ เลือกตัวนี้แล้ว", "✓ Selected")
                            : t("กดเพื่อเลือก", "Click to select")}
                        </span>
                        {isSelected && (
                          <span className="pixel-font text-[9px] bg-[#f6c945] text-[#120f1c] px-2 py-0.5 rounded font-black">
                            READY
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Confirm Bar */}
              <div className="pt-4 border-t border-[#2f2d45] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs">
                  <div className="p-1 rounded bg-[#0d0b14] border border-[#2f2d45]">
                    <PixelSpriteView
                      sprite={getAvatar(selectedAvatarKey).sprite}
                      size={26}
                    />
                  </div>
                  <div>
                    <span className="text-[#9a93ad] block text-[11px]">
                      {t("ตัวละครที่เตรียมออกศึก:", "Chosen Hero:")}
                    </span>
                    <strong className="text-[#f6c945] font-extrabold text-xs sm:text-sm">
                      {getAvatar(selectedAvatarKey).name}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab("quest")}
                    className="retro-button flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-[#2f2d45] bg-[#0d0b14] hover:bg-[#1c1b2b] text-xs font-bold text-[#f4efe6] cursor-pointer"
                  >
                    {t("← เลือกด่านอื่น", "← Pick Another Floor")}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmHeroAndPlay()}
                    className="retro-button flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] text-xs sm:text-sm font-black pixel-font flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-transform hover:scale-[1.02]"
                  >
                    <Icon name="gamepad" size={16} />
                    <span>
                      {t(
                        `ยืนยัน & เริ่มลุยชั้นนี้ (${getAvatar(selectedAvatarKey).name}) →`,
                        `Confirm & Enter Floor (${getAvatar(selectedAvatarKey).name}) →`
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: PLAY FLOOR ==================== */}
          {activeTab === "practice" && activeTopic && (
            <TopicDungeonArena
              key={`${currentLanguage}-${activeTopic.id}-${playAttemptNonce}`}
              topic={activeTopic}
              language={currentLanguage}
              topicIndex={activeTopicIndex}
              totalTopics={currentLanguageTopics.length}
              currentStudent={currentStudent}
              studentId={currentStudent?.id}
              avatarKey={selectedAvatarKey}
              onChangeHero={() => setActiveTab("hero-select")}
              embedded
              onBackToMap={() => setActiveTab("quest")}
              onCompleteTopic={handleCompleteTopic}
            />
          )}

          {/* ==================== TAB 3: CUSTOM CODE DUNGEON ==================== */}
          {activeTab === "custom" && (
            <DungeonRunScreen
              embedded
              onBackToPortal={() => setActiveTab("quest")}
              onRecordAttempt={(summary) => {
                if (!session) return;
                const currentStudentSnapshot = currentStudent;
                const nextCells = { ...currentStudentSnapshot.cellScores };
                Object.entries(summary.cellScores).forEach(([cellKey, val]) => {
                  const k = cellKey as BlockCellId;
                  if (typeof val === "number") {
                    nextCells[k] = Math.max(nextCells[k] || 0, val);
                  }
                });
                const updatedStudent: StudentRecord = {
                  ...currentStudentSnapshot,
                  xp: currentStudentSnapshot.xp + summary.earnedXp,
                  cellScores: nextCells,
                  history: [
                    {
                      topicId: 0,
                      topicTitle: `Custom Code: ${summary.spellName}`,
                      scorePercent: summary.integrityLeft,
                      xpEarned: summary.earnedXp,
                      timestamp: "เมื่อสักครู่",
                    },
                    ...currentStudentSnapshot.history,
                  ],
                };
                const updatedList = students.map((stu) =>
                  stu.id === currentStudentSnapshot.id ? updatedStudent : stu
                );
                if (!updatedList.some((stu) => stu.id === currentStudentSnapshot.id)) {
                  updatedList.push(updatedStudent);
                }
                saveStudentsToStorage(updatedList);
              }}
            />
          )}

          {/* ==================== TAB 4: SKILLS & SANDBOX ==================== */}
          {activeTab === "learn" && (
            <div className="flex flex-col gap-5">
              {/* Compact Profile & Mastery Summary */}
              <section className="rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-5 flex flex-wrap items-center justify-between gap-4">
                {session ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[#0d0b14] border border-[#2f2d45]">
                        <PixelSpriteView sprite={currentAvatar.sprite} size={36} />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-[#f4efe6]">
                          {currentStudent.nickname} · Lv.{studentLevel}
                        </h2>
                        <p className="text-xs font-semibold text-[#9a93ad]">
                          {currentStudent.xp} XP · {t("สตรีค", "Streak")}{" "}
                          {currentStudent.streak} {t("วัน", "days")} ·{" "}
                          {t("ความเข้าใจเฉลี่ย", "Avg Mastery")}{" "}
                          {studentAvgMastery}% (
                          {getMasteryStatus(studentAvgMastery).label})
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-extrabold">
                      <span className="px-3 py-1 rounded-xl bg-[#24163b] border border-[#9b5de5]/40 text-[#e9d5ff]">
                        T1–T4: {t("โครงสร้างโค้ด", "Text Surface")}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-[#281d08] border border-[#f6c945]/40 text-[#ffe27a]">
                        E1–E4: {t("การรันจริง", "Execution")}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-[#152922] border border-[#2fbf71]/40 text-[#86efac]">
                        F1–F4: {t("หน้าที่โค้ด", "Function")}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                    <span className="text-xs sm:text-sm font-bold text-[#9a93ad]">
                      {t(
                        "เข้าสู่ระบบเพื่อบันทึกคะแนน 12 ช่อง ตราเกียรติยศ และประวัติการฝึก",
                        "Log in to save your 12-cell mastery, badges, and practice history."
                      )}
                    </span>
                    <Link
                      href={`/login?redirect=${encodeURIComponent(
                        `/courses?lang=${currentLanguage}`
                      )}`}
                      className="retro-button rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] px-4 py-2 text-xs font-extrabold text-[#120f1c]"
                    >
                      {t("เข้าสู่ระบบ", "Log in")}
                    </Link>
                  </div>
                )}
              </section>

              {/* 12-Cell Block Model Grid */}
              <BlockModelGrid
                cellScores={currentStudent.cellScores}
                title={t(
                  `Block Model 12 ช่อง (${currentTrackMeta.name})`,
                  `12-Cell Block Model (${currentTrackMeta.name})`
                )}
                onSelectTopic={(topicId) => {
                  const target =
                    currentLanguageTopics.find((tp) => tp.id === topicId) ||
                    currentLanguageTopics[0];
                  handleStartTopic(target.id);
                }}
              />

              {/* Code Runner Sandbox */}
              <section className="rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-extrabold text-[#ffe27a] flex items-center gap-2">
                    <Icon name="code" size={18} className="text-[#2fbf71]" />
                    <span>
                      {t(
                        `ทดลองรันโค้ด ${currentTrackMeta.name}`,
                        `${currentTrackMeta.name} Code Sandbox`
                      )}
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const res = runCodeByLanguage(
                        playgroundCode,
                        currentLanguage
                      );
                      setPlaygroundOutput(
                        res.success
                          ? res.finalOutput ||
                              t("(ไม่มีข้อความแสดงผล)", "(No output)")
                          : `${t("ข้อผิดพลาด:", "Error:")} ${res.error}`
                      );
                    }}
                    className="retro-button px-4 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer text-[#120f1c]"
                  >
                    <Icon name="play" size={15} />
                    <span>{t("รันโค้ด", "Run Code")}</span>
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={playgroundCode}
                  onChange={(e) => setPlaygroundCode(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#0d0b14] border border-[#2f2d45] focus:border-[#f6c945] focus:outline-hidden font-code text-xs sm:text-sm font-bold text-[#ffe27a]"
                />

                {playgroundOutput && (
                  <div className="p-3.5 rounded-xl bg-[#152922] border border-[#2fbf71]/50 text-[#86efac]">
                    <div className="text-[11px] font-extrabold">
                      {t("ผลลัพธ์:", "Output:")}
                    </div>
                    <pre className="font-code font-extrabold text-sm mt-0.5">
                      {playgroundOutput}
                    </pre>
                  </div>
                )}
              </section>

              {/* Logged-in Student Details: Strong/Review Cells, Badges & Recent History */}
              {session && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[#2fbf71]/40 bg-[#152922]/70 p-4 text-[#86efac]">
                      <div className="flex items-center gap-2 font-extrabold text-sm">
                        <Icon name="check" size={17} />
                        <span>{t("จุดแข็ง (≥80%)", "Strengths (≥80%)")}</span>
                      </div>
                      <div className="mt-2.5 space-y-1.5">
                        {strongStudentCells.length > 0 ? (
                          strongStudentCells.slice(0, 4).map((c) => (
                            <div
                              key={c.id}
                              className="p-2 rounded-xl bg-[#0d0b14]/70 border border-[#2fbf71]/30 flex items-center justify-between text-xs font-bold text-[#f4efe6]"
                            >
                              <span>
                                {c.id} · {c.shortTitle}
                              </span>
                              <span className="font-extrabold text-[#86efac]">
                                {currentStudent.cellScores[c.id]}%
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#c4bdd6]">
                            {t(
                              "ลุยด่านเพิ่มเพื่อปลดล็อกช่อง ≥80%",
                              "Clear more floors to unlock 80%+ cells."
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#ff4d6d]/40 bg-[#361416]/60 p-4 text-[#fca5a5]">
                      <div className="flex items-center gap-2 font-extrabold text-sm">
                        <Icon name="bulb" size={17} />
                        <span>{t("ควรทบทวน (<60%)", "Needs Review (<60%)")}</span>
                      </div>
                      <div className="mt-2.5 space-y-1.5">
                        {reviewStudentCells.length > 0 ? (
                          reviewStudentCells.slice(0, 4).map((c) => (
                            <div
                              key={c.id}
                              className="p-2 rounded-xl bg-[#0d0b14]/70 border border-[#ff4d6d]/30 flex items-center justify-between gap-2 text-xs font-bold text-[#f4efe6]"
                            >
                              <span>
                                {c.id} · {c.shortTitle} (
                                {currentStudent.cellScores[c.id]}%)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const target =
                                    currentLanguageTopics.find(
                                      (tp) => tp.id === c.relatedTopicId
                                    ) || currentLanguageTopics[0];
                                  handleStartTopic(target.id);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#c0283a] hover:bg-[#ff4d6d] text-white text-[11px] font-extrabold cursor-pointer"
                              >
                                {t("ฝึก →", "Practice →")}
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs font-bold text-[#c4bdd6]">
                            {t(
                              "ผ่านเกณฑ์ 60% ทุกช่องแล้ว!",
                              "Above 60% across all cells!"
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-4 flex flex-col gap-3">
                      <h3 className="text-sm font-extrabold text-[#ffe27a] flex items-center gap-2">
                        <Icon name="shield" size={17} className="text-[#f6c945]" />
                        <span>
                          {t("ตราความสำเร็จ", "Badges")} (
                          {
                            currentLanguageTopics.filter((tp) =>
                              currentStudent.badges.includes(tp.badgeReward.id)
                            ).length
                          }
                          /{currentLanguageTopics.length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentLanguageTopics.map((tp) => {
                          const unlocked = currentStudent.badges.includes(
                            tp.badgeReward.id
                          );
                          return (
                            <div
                              key={tp.badgeReward.id}
                              className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                                unlocked
                                  ? "bg-[#152922] border-[#2fbf71]/50 text-[#86efac]"
                                  : "bg-[#0d0b14] border-[#2f2d45] text-[#9a93ad] opacity-65"
                              }`}
                            >
                              <StatusCircle
                                variant={unlocked ? "badge" : "locked"}
                                size="sm"
                                label={tp.badgeReward.name}
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold truncate">
                                  {tp.badgeReward.name}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-4 flex flex-col gap-3">
                      <h3 className="text-sm font-extrabold text-[#ffe27a] flex items-center gap-2">
                        <Icon name="chart" size={17} className="text-[#2fbf71]" />
                        <span>{t("ประวัติการเล่นล่าสุด", "Recent History")}</span>
                      </h3>
                      {currentStudent.history.length > 0 ? (
                        <div className="space-y-2">
                          {currentStudent.history.slice(0, 5).map((h, i) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-xl bg-[#0d0b14] border border-[#2f2d45] flex items-center justify-between gap-2"
                            >
                              <div>
                                <div className="text-xs font-extrabold text-[#f4efe6]">
                                  {h.topicTitle}
                                </div>
                                <div className="text-[11px] text-[#9a93ad]">
                                  {h.timestamp} · {h.scorePercent}%
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-lg bg-[#281d08] text-[#ffe27a] border border-[#f6c945]/40 text-xs font-extrabold">
                                +{h.xpEarned} XP
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#9a93ad]">
                          {t(
                            "ยังไม่มีประวัติการเล่น ลองลุยด่านแรกได้เลย!",
                            "No runs yet — enter Floor 1 to get started!"
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0b14] p-8 text-center text-sm font-bold text-[#ffe27a]">
          Loading Learning Dungeon...
        </div>
      }
    >
      <CoursesContent />
    </Suspense>
  );
}
