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
import { PracticeArena } from "../components/PracticeArena";
import {
  TOPICS,
  BLOCK_MODEL_CELLS,
  BlockCellId,
  INITIAL_CLASSROOMS,
  INITIAL_STUDENTS,
  ClassroomRecord,
  StudentRecord,
  AI_USAGE_LOGS,
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

type LearningTab = "quest" | "practice" | "learn" | "profile" | "ailog";

const STORAGE_STUDENTS_KEY = "explain_code_students_v2";
const STORAGE_ROOMS_KEY = "explain_code_rooms_v2";

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
  if (lang === "python") {
    return (
      course.id.includes("python") ||
      titleUpper.includes("PYTHON") ||
      course.join_code.toUpperCase().startsWith("PY") ||
      courseLessons.some((l) => l.programming_language.toLowerCase() === "python")
    );
  }
  if (lang === "sql") {
    return (
      course.id.includes("sql") ||
      titleUpper.includes("SQL") ||
      course.join_code.toUpperCase().startsWith("SQL") ||
      courseLessons.some((l) => l.programming_language.toLowerCase() === "sql")
    );
  }
  // javascript (default for courses that are not python/sql)
  const isPyOrSql =
    course.id.includes("python") ||
    course.id.includes("sql") ||
    titleUpper.includes("PYTHON") ||
    titleUpper.includes("SQL") ||
    courseLessons.some((l) =>
      ["python", "sql"].includes(l.programming_language.toLowerCase())
    );
  return !isPyOrSql;
}

function CoursesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const langParam = searchParams.get("lang") as LearningLanguage | null;

  const [selectedLanguage, setSelectedLanguage] =
    useState<LearningLanguage | null>(
      langParam && ["javascript", "python", "sql"].includes(langParam)
        ? langParam
        : null
    );
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<LearningTab>("quest");

  // ข้อมูลเควสต์ PRIMM & Block Model 12 ช่อง
  const [classrooms, setClassrooms] =
    useState<ClassroomRecord[]>(INITIAL_CLASSROOMS);
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [currentStudentId, setCurrentStudentId] = useState<string>("stu-1");
  const [selectedTopicId, setSelectedTopicId] = useState<number>(1);
  const [unlockAllDemo, setUnlockAllDemo] = useState<boolean>(false);

  // ห้องทดลองรันโค้ดตามภาษาที่เลือก
  const [playgroundCode, setPlaygroundCode] = useState<string>(
    LANGUAGE_TRACKS[0].defaultPlaygroundCode
  );
  const [playgroundOutput, setPlaygroundOutput] = useState<string>("");

  // ข้อมูลคอร์สเรียนและบทเรียน (LMS)
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinMsg, setJoinMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // ซิงค์ URL query param ?lang=... กับ state
  useEffect(() => {
    if (langParam && ["javascript", "python", "sql"].includes(langParam)) {
      setSelectedLanguage(langParam);
      const track = LANGUAGE_TRACKS.find((t) => t.id === langParam);
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
    const track = LANGUAGE_TRACKS.find((t) => t.id === lang);
    const langTopics = getTopicsByLanguage(lang);
    setSelectedLanguage(lang);
    setActiveTab("quest");
    if (track) {
      setPlaygroundCode(track.defaultPlaygroundCode);
      setPlaygroundOutput("");
    }
    if (langTopics.length > 0) {
      setSelectedTopicId(langTopics[0].id);
    }
    router.push(`/courses?lang=${lang}`);
  };

  const handleBackToLanguagePicker = () => {
    setSelectedLanguage(null);
    setActiveTab("quest");
    router.push("/courses");
  };

  const saveStudentsToStorage = (updated: StudentRecord[]) => {
    setStudents(updated);
    try {
      localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // ซิงค์ข้อมูลนักเรียนและประวัติการทำเควสต์กับ Supabase
  const syncStudentData = useCallback(
    async (targetId?: string) => {
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
            const formattedHistory = attData.attempts.map((att: any) => ({
              topicId: att.topic_id,
              topicTitle:
                TOPICS.find((t) => t.id === att.topic_id)?.title ||
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
      if (!updatedSession) {
        setActiveTab((prev) => (prev === "profile" ? "quest" : prev));
      } else if (updatedSession.role === "student" && updatedSession.userId) {
        setCurrentStudentId(updatedSession.userId);
      }
    };

    window.addEventListener("explain-code-auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    try {
      const savedRooms = localStorage.getItem(STORAGE_ROOMS_KEY);
      if (savedRooms) {
        setClassrooms(JSON.parse(savedRooms));
      } else {
        localStorage.setItem(
          STORAGE_ROOMS_KEY,
          JSON.stringify(INITIAL_CLASSROOMS)
        );
      }

      const savedStudents = localStorage.getItem(STORAGE_STUDENTS_KEY);
      if (savedStudents) {
        setStudents(JSON.parse(savedStudents));
      } else {
        localStorage.setItem(
          STORAGE_STUDENTS_KEY,
          JSON.stringify(INITIAL_STUDENTS)
        );
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
    const localEnrolls = loadLocalEnrollments();
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

          if (Array.isArray(data.enrollments) && data.enrollments.length > 0) {
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

    return () => {
      window.removeEventListener("explain-code-auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [syncStudentData]);

  // ข้อมูลนักเรียนปัจจุบันสำหรับระบบเควสต์
  const currentStudent: StudentRecord =
    students.find((s) => s.id === currentStudentId) ||
    (session
      ? {
          id: session.userId,
          nickname: session.displayName || session.username,
          pinHash: "0000",
          roomCode: session.roomCode || "M401",
          xp: 120,
          streak: 1,
          completedTopics: [1],
          badges: ["badge-1"],
          cellScores: {
            T1: 75,
            T2: 70,
            T3: 65,
            T4: 60,
            E1: 75,
            E2: 65,
            E3: 60,
            E4: 55,
            F1: 70,
            F2: 65,
            F3: 60,
            F4: 55,
          },
          history: [],
        }
      : students[0]);

  const currentLanguage: LearningLanguage = selectedLanguage || "javascript";
  const currentTrackMeta =
    LANGUAGE_TRACKS.find((t) => t.id === currentLanguage) || LANGUAGE_TRACKS[0];
  const currentLanguageTopics = getTopicsByLanguage(currentLanguage);

  const currentStudentRoom = classrooms.find(
    (r) => r.roomCode === currentStudent.roomCode
  );
  const activeTopic =
    currentLanguageTopics.find((t) => t.id === selectedTopicId) ||
    currentLanguageTopics[0];

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

  // เมื่อผู้เรียนเล่นจบด่านเควสต์
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
    const topicObj = currentLanguageTopics.find((t) => t.id === result.topicId);
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
      router.push(
        `/login?redirect=${encodeURIComponent(
          `/courses?lang=${currentLanguage}`
        )}`
      );
      return;
    }

    saveStudentsToStorage(updatedStudents);
    setActiveTab("profile");

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
        text: `ไม่พบคอร์สที่เผยแพร่แล้วสำหรับรหัส "${cleanCode}" (ตัวอย่างรหัสคอร์ส: JS2026, PY2026 หรือ SQL2026)`,
      });
      return;
    }

    setJoinMsg({
      type: "success",
      text: `พบคอร์ส "${matched.title}" กำลังพาเข้าสู่คอร์ส...`,
    });
    await handleEnrollCourse(matched);
  };

  // ==========================================================================
  // ขั้นตอนที่ 1: หน้าเลือกภาษาที่ต้องการเรียนรู้ (แสดงเมื่อยังไม่ได้เลือกภาษา)
  // ==========================================================================
  if (!selectedLanguage) {
    return (
      <div className="min-h-screen bg-[#eef3f1] text-[#1b2a2f] flex flex-col">
        <SiteHeader />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-8">
          {/* Header แนะนำการเลือกภาษา */}
          <section className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b6c9c5] bg-white px-4 py-1.5 text-xs font-extrabold text-[#0b4f49] shadow-2xs">
              <Icon name="code" className="h-4 w-4 text-[#0f766e]" />
              ขั้นตอนที่ 1 · เลือกภาษาโปรแกรมที่คุณต้องการเรียนรู้
            </span>
            <h1 className="mt-3.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#14221e]">
              วันนี้คุณอยากฝึกอ่านและแกะโค้ดภาษาอะไร?
            </h1>
            <p className="mt-2.5 text-sm sm:text-base text-[#475b60]">
              แต่ละภาษามีโครงสร้างไวยากรณ์ ประเภทการใช้งาน เควสต์ฝึกอ่านโค้ด 4 ขั้น (PRIMM) และคอร์สเรียนที่แยกออกจากกันอย่างชัดเจน เลือกภาษาที่สนใจเพื่อเข้าสู่เนื้อหาของภาษานั้นได้เลย
            </p>
          </section>

          {/* การ์ดเลือกภาษาหลัก 3 ภาษา (JavaScript / Python / SQL) แยกตามประเภท */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                  className="group rounded-3xl border-2 border-[#cfe0dc] bg-white p-6 sm:p-7 shadow-xs hover:border-[#0f766e] hover:shadow-md transition-all flex flex-col justify-between gap-6"
                >
                  <div className="flex flex-col gap-4">
                    {/* หมวดหมู่และป้ายชื่อภาษา */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-extrabold"
                        style={{
                          backgroundColor: track.bgTint,
                          color: track.accentColor,
                        }}
                      >
                        {track.shortBadge}
                      </span>
                      <span className="text-xs font-bold text-[#475b60]">
                        {trackTopics.length} ด่านเควสต์ · {trackCourses.length}{" "}
                        คอร์สเรียน
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-extrabold text-[#0f766e]">
                        {track.categoryLabel}
                      </span>
                      <h2 className="mt-1 text-2xl font-extrabold text-[#14221e]">
                        ภาษา {track.name}
                      </h2>
                      <p className="mt-1 text-xs font-bold text-[#1b2a2f]">
                        {track.tagline}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#475b60]">
                        {track.description}
                      </p>
                    </div>

                    {/* ตัวอย่างหน้าตาโค้ดของภาษานั้น */}
                    <div className="rounded-2xl bg-[#14221e] p-3.5 text-xs text-[#e3f1ee] font-code overflow-x-auto border border-[#0b4f49]">
                      <div className="text-[10px] font-sans font-bold text-[#f6b73c] mb-1.5">
                        ตัวอย่างโค้ดที่จะได้ฝึกในหมวด {track.name}:
                      </div>
                      <pre className="text-[12px] leading-relaxed">
                        {track.sampleCodePreview}
                      </pre>
                    </div>

                    {/* เนื้อหาหลักที่แยกตามแต่ละภาษา */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-extrabold text-[#14221e]">
                        เนื้อหาหลักในหมวด {track.name}:
                      </p>
                      <ul className="space-y-1.5 text-xs font-semibold text-[#3d4d48]">
                        {track.highlights.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#0f766e] font-extrabold">
                              ✓
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectLanguage(track.id)}
                    className="liquid-glass-primary-btn liquid-press w-full rounded-2xl py-3.5 px-5 text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icon name="play" className="h-4 w-4" filled />
                    <span>เข้าสู่การเรียนรู้ภาษา {track.name} →</span>
                  </button>
                </div>
              );
            })}
          </section>

          {/* กล่องกรอกรหัสคอร์ส/รหัสห้องเรียนโดยตรง */}
          <section className="rounded-3xl border-2 border-[#cfe0dc] bg-white p-6 sm:p-7 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-extrabold text-[#14221e]">
                มีรหัสคอร์สเรียนจากครูผู้สอนอยู่แล้วใช่ไหม?
              </h3>
              <p className="text-xs sm:text-sm text-[#475b60] mt-0.5">
                กรอกรหัสคอร์ส (เช่น <code className="font-bold">JS2026</code>,{" "}
                <code className="font-bold">PY2026</code>, หรือ{" "}
                <code className="font-bold">SQL2026</code>) เพื่อเข้าสู่บทเรียนของภาษานั้นได้ทันที
              </p>
            </div>

            <form
              onSubmit={handleJoinByCode}
              className="flex w-full md:w-auto flex-col gap-1.5"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) =>
                    setJoinCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="กรอกรหัส เช่น PY2026"
                  className="w-full md:w-52 rounded-xl border-2 border-[#b6c9c5] bg-[#f8fbfa] px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-[#1b2a2f] focus:border-[#0f766e] focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="press-teal rounded-xl px-4 py-2.5 text-xs font-extrabold text-white cursor-pointer shrink-0"
                >
                  เข้าร่วมทันที
                </button>
              </div>
              {joinMsg && (
                <p
                  className={`text-xs font-bold ${
                    joinMsg.type === "error"
                      ? "text-[#991b1b]"
                      : "text-[#14532d]"
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
  // ขั้นตอนที่ 2: หน้าการเรียนรู้และฝึกเควสต์แยกตามภาษาที่เลือกแล้ว
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#eef3f1] text-[#1b2a2f] flex flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 flex flex-col gap-6">
        {/* แถบแสดงภาษาที่กำลังเรียนอยู่ + ปุ่มสลับเปลี่ยนภาษา */}
        <div className="rounded-2xl border-2 border-[#0f766e]/35 bg-gradient-to-r from-[#042b28] via-[#063834] to-[#0b4f49] p-4 sm:p-5 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={handleBackToLanguagePicker}
              className="rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 px-3.5 py-2 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer transition"
            >
              <span>← เลือกภาษาอื่น</span>
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-[#f6b73c] px-2.5 py-0.5 text-[11px] font-extrabold text-[#3d2603]">
                  {currentTrackMeta.shortBadge}
                </span>
                <span className="text-xs font-bold text-[#cfe0dc]">
                  {currentTrackMeta.categoryLabel}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                หมวดการเรียนรู้ภาษา {currentTrackMeta.name}
              </h1>
            </div>
          </div>

          {/* ปุ่มสลับภาษาด่วน */}
          <div className="flex items-center gap-1.5 rounded-xl bg-black/25 p-1 border border-white/15">
            {LANGUAGE_TRACKS.map((t) => {
              const isCurrent = t.id === currentLanguage;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectLanguage(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition ${
                    isCurrent
                      ? "bg-[#f6b73c] text-[#3d2603] shadow-2xs"
                      : "text-white/85 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* แถบควบคุมหมวดการเรียนรู้ (จัดกึ่งกลาง) & สถานะ XP/สตรีคของผู้เรียน */}
        <div className="rounded-2xl border-2 border-[#cfe0dc] bg-white p-4 sm:p-5 shadow-xs flex flex-col items-center gap-3.5">
          <div className="flex items-center justify-center gap-2 flex-wrap w-full">
            {[
              {
                id: "quest" as LearningTab,
                label: `เควสต์ & คอร์ส ${currentTrackMeta.name}`,
                icon: "route" as const,
              },
              {
                id: "practice" as LearningTab,
                label: `ฝึกอ่านโค้ด ${currentTrackMeta.name} (PRIMM)`,
                icon: "play" as const,
              },
              {
                id: "learn" as LearningTab,
                label: `Block Model & ทดลองรัน ${currentTrackMeta.name}`,
                icon: "book" as const,
              },
              ...(session
                ? [
                    {
                      id: "profile" as LearningTab,
                      label: "โปรไฟล์ & ผลการฝึก",
                      icon: "user" as const,
                    },
                  ]
                : []),
              {
                id: "ailog" as LearningTab,
                label: "บันทึก AI",
                icon: "clipboard" as const,
              },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`liquid-press px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? "liquid-active-nav-item text-white"
                      : "bg-[#eef3f1] hover:bg-[#e3f1ee] text-[#0b4f49]"
                  }`}
                >
                  <Icon name={tab.icon} size={17} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* แถบแสดง XP, เลเวล และสตรีค (เฉพาะเมื่อเข้าสู่ระบบแล้ว) หรือปุ่มแจ้งเตือนให้ล็อกอิน */}
          <div className="flex items-center justify-center gap-2 flex-wrap border-t border-[#e3f1ee] pt-3 w-full">
            {session ? (
              <>
                <span className="px-3 py-1 rounded-xl bg-[#e3f1ee] text-[#0b4f49] text-xs font-extrabold">
                  ผู้เรียน: {currentStudent.nickname}
                </span>
                <div className="px-3 py-1 rounded-xl bg-[#fff4d6] border border-[#f0a92e] text-[#3d2603] text-xs font-extrabold flex items-center gap-1.5">
                  <Icon name="star" size={15} filled />
                  <span>
                    Lv.{studentLevel} · {currentStudent.xp} XP
                  </span>
                </div>
                <div
                  className="px-2.5 py-1 rounded-xl bg-[#0b4f49] text-[#f6b73c] text-xs font-extrabold flex items-center gap-1"
                  title="สตรีคการฝึกต่อเนื่อง"
                >
                  <Icon name="flame" size={15} filled />
                  <span>{currentStudent.streak} วัน</span>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs">
                <span className="font-bold text-[#475b60]">
                  โหมดผู้เยี่ยมชม: คุณสามารถทดลองเรียนและฝึกเควสต์{" "}
                  {currentTrackMeta.name} ได้ฟรี แต่ต้องเข้าสู่ระบบเพื่อดูโปรไฟล์และบันทึกผลการฝึก
                </span>
                <Link
                  href={`/login?redirect=${encodeURIComponent(
                    `/courses?lang=${currentLanguage}`
                  )}`}
                  className="liquid-glass-primary-btn liquid-press inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold"
                >
                  <Icon name="user" className="h-3.5 w-3.5" />
                  <span>เข้าสู่ระบบเพื่อดูโปรไฟล์ &amp; ผลการฝึก</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ==================== TAB 1: เส้นทางเควสต์ & คอร์สเรียนตามภาษาที่เลือก ==================== */}
        {activeTab === "quest" && (
          <div className="flex flex-col gap-6">
            {/* การ์ดเควสต์ประจำวัน + คำแนะนำเฉพาะภาษา */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 bg-[#fff4d6] border-2 border-[#f0a92e] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#f6b73c] border-2 border-[#b97a0c] text-[#3d2603] flex items-center justify-center shrink-0">
                    <Icon name="target" size={24} />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#3d2603] text-[#fff4d6] text-[11px] font-extrabold">
                      เควสต์ {currentTrackMeta.name} ประจำวัน · โบนัส +30 XP
                    </span>
                    <h3 className="text-[18px] font-extrabold text-[#3d2603] mt-1">
                      ฝึกแกะโค้ดภาษา {currentTrackMeta.name} ทีละบรรทัดตามหลัก PRIMM
                    </h3>
                    <p className="text-[13px] font-semibold text-[#5c3704] mt-0.5">
                      {currentTrackMeta.tagline}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextTopic =
                      currentLanguageTopics.find(
                        (t) => !currentStudent.completedTopics.includes(t.id)
                      ) || currentLanguageTopics[0];
                    setSelectedTopicId(nextTopic.id);
                    setActiveTab("practice");
                  }}
                  className="press-teal px-6 py-3.5 rounded-xl text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Icon name="play" size={18} filled />
                  <span>เริ่มเล่นเควสต์ {currentTrackMeta.name}</span>
                </button>
              </div>

              {/* การ์ดเรื่องแนะนำของภาษานี้ */}
              <div className="lg:col-span-5 bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[12px] font-extrabold text-[#0f766e]">
                      ด่านแนะนำสำหรับหมวด {currentTrackMeta.name} (
                      {currentStudentRoom?.roomName || currentStudent.roomCode})
                    </span>
                    <h4 className="text-[16px] font-extrabold text-[#1b2a2f] mt-0.5">
                      {
                        (
                          currentLanguageTopics[1] || currentLanguageTopics[0]
                        )?.title
                      }
                    </h4>
                  </div>
                  <Icon
                    name="bulb"
                    size={22}
                    className="text-[#f0a92e] shrink-0"
                  />
                </div>
                <p className="text-[13px] text-[#475b60]">
                  {
                    (currentLanguageTopics[1] || currentLanguageTopics[0])
                      ?.subtitle
                  }
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const recTopic =
                      currentLanguageTopics[1] || currentLanguageTopics[0];
                    setSelectedTopicId(recTopic.id);
                    setActiveTab("practice");
                  }}
                  className="press-secondary w-full py-2.5 rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Icon name="play" size={16} filled />
                  <span>เข้าฝึกด่านแนะนำของ {currentTrackMeta.name}</span>
                </button>
              </div>
            </div>

            {/* เส้นทางเควสต์ของภาษาที่เลือก */}
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[22px] sm:text-[24px] font-extrabold text-[#1b2a2f]">
                    เส้นทางเควสต์ภาษา {currentTrackMeta.name} (
                    {currentLanguageTopics.length} ด่าน)
                  </h2>
                  <p className="text-[14px] font-semibold text-[#475b60]">
                    ผ่านแล้ว{" "}
                    {
                      currentLanguageTopics.filter((t) =>
                        currentStudent.completedTopics.includes(t.id)
                      ).length
                    }
                    /{currentLanguageTopics.length} ด่านในหมวด{" "}
                    {currentTrackMeta.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setUnlockAllDemo(!unlockAllDemo)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-extrabold border-2 transition cursor-pointer ${
                    unlockAllDemo
                      ? "bg-[#d8efdc] border-[#14532d] text-[#14532d]"
                      : "press-secondary"
                  }`}
                >
                  {unlockAllDemo
                    ? "✓ ปลดล็อกทุกด่านแล้ว"
                    : "ปลดล็อกทุกด่าน (โหมดสาธิต)"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentLanguageTopics.map((topic, idx) => {
                  const isPassed = currentStudent.completedTopics.includes(
                    topic.id
                  );
                  const unlocked = isTopicUnlocked(topic.id, idx);
                  const isBoss = Boolean(topic.isBoss);

                  return (
                    <div
                      key={topic.id}
                      className={`rounded-2xl border-2 p-5 flex flex-col justify-between gap-4 transition ${
                        isBoss
                          ? unlocked
                            ? "bg-[#6d3fc0]/5 border-[#6d3fc0] md:col-span-2 lg:col-span-3"
                            : "bg-[#eef3f1] border-[#cfe0dc] md:col-span-2 lg:col-span-3 opacity-85"
                          : isPassed
                          ? "bg-[#f4faf8] border-[#0f766e]"
                          : unlocked
                          ? "bg-white border-[#f0a92e] shadow-sm"
                          : "bg-[#eef3f1] border-[#cfe0dc] opacity-80"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <StatusCircle
                          variant={
                            isBoss
                              ? unlocked
                                ? "boss"
                                : "locked"
                              : isPassed
                              ? "passed"
                              : unlocked
                              ? "current"
                              : "locked"
                          }
                          size="md"
                          label={topic.title}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[12px] font-extrabold ${
                                isBoss
                                  ? "bg-[#6d3fc0] text-white"
                                  : isPassed
                                  ? "bg-[#d8efdc] text-[#14532d]"
                                  : unlocked
                                  ? "bg-[#fff4d6] text-[#3d2603]"
                                  : "bg-[#d8e3e0] text-[#475b60]"
                              }`}
                            >
                              {isPassed
                                ? "ผ่านแล้ว"
                                : unlocked
                                ? isBoss
                                  ? "บอสด่านพร้อมลุย!"
                                  : "พร้อมเข้าเล่น"
                                : "ล็อก"}
                            </span>

                            <span className="text-[12px] font-bold text-[#475b60]">
                              ช่อง{" "}
                              {topic.questions.map((q) => q.cellId).join(", ")}
                            </span>
                          </div>

                          <h3 className="text-[18px] font-extrabold text-[#1b2a2f] mt-1.5">
                            {topic.title}
                          </h3>
                          <p className="text-[14px] text-[#475b60] mt-0.5">
                            {topic.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#cfe0dc]">
                        <span className="text-[13px] font-extrabold text-[#0b4f49] flex items-center gap-1.5">
                          <Icon name="shield" size={16} />
                          <span>ตรา: {topic.badgeReward.name}</span>
                        </span>

                        <button
                          type="button"
                          disabled={!unlocked}
                          onClick={() => {
                            setSelectedTopicId(topic.id);
                            setActiveTab("practice");
                          }}
                          className={`px-5 py-2.5 rounded-xl text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            isBoss
                              ? "press-boss"
                              : isPassed
                              ? "press-secondary"
                              : "press-teal"
                          }`}
                        >
                          <Icon
                            name={unlocked ? "play" : "lock"}
                            size={18}
                            filled={unlocked}
                          />
                          <span>
                            {isPassed
                              ? "เล่นซ้ำ"
                              : unlocked
                              ? "เริ่มเล่นด่านนี้"
                              : "ยังไม่ปลดล็อก"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* คอร์สและบทเรียนของภาษาที่เลือก */}
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 sm:p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
                <div className="lg:col-span-7">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f1ee] px-3 py-1 text-xs font-extrabold text-[#0b4f49]">
                    <Icon name="book" className="h-3.5 w-3.5" />
                    คอร์สและบทเรียนภาษา {currentTrackMeta.name}
                  </span>
                  <h2 className="mt-2 text-[22px] sm:text-[24px] font-extrabold text-[#1b2a2f]">
                    คลังบทเรียนประกอบการฝึกภาษา {currentTrackMeta.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#475b60]">
                    ศึกษาเนื้อหาบทเรียน ตัวอย่างโค้ด และแบบทดสอบท้ายบทของภาษา{" "}
                    {currentTrackMeta.name} โดยเฉพาะ
                  </p>
                </div>

                <div className="lg:col-span-5">
                  <form
                    onSubmit={handleJoinByCode}
                    className="rounded-xl border-2 border-[#cfe0dc] bg-[#eef3f1] p-4"
                  >
                    <label className="block text-xs font-extrabold text-[#1b2a2f] mb-1.5">
                      เข้าร่วมด้วยรหัสคอร์ส / รหัสห้องเรียน:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={joinCodeInput}
                        onChange={(e) =>
                          setJoinCodeInput(e.target.value.toUpperCase())
                        }
                        placeholder={
                          currentLanguage === "python"
                            ? "เช่น PY2026"
                            : currentLanguage === "sql"
                            ? "เช่น SQL2026"
                            : "เช่น JS2026"
                        }
                        className="flex-1 rounded-xl border-2 border-[#b6c9c5] bg-white px-3.5 py-2 text-xs font-mono font-bold uppercase text-[#1b2a2f] focus:border-[#0f766e] focus:outline-hidden"
                      />
                      <button
                        type="submit"
                        className="press-teal rounded-xl px-4 py-2 text-xs font-extrabold text-white cursor-pointer"
                      >
                        เข้าร่วมคอร์ส
                      </button>
                    </div>
                    {joinMsg && (
                      <p
                        className={`mt-2 text-xs font-bold ${
                          joinMsg.type === "error"
                            ? "text-[#991b1b]"
                            : "text-[#14532d]"
                        }`}
                      >
                        {joinMsg.text}
                      </p>
                    )}
                  </form>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                      className="flex flex-col justify-between rounded-2xl border-2 border-[#cfe0dc] bg-[#f8fbfa] p-5 transition-all hover:border-[#0f766e]"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="rounded-full bg-[#e3f1ee] px-3 py-1 text-xs font-extrabold text-[#0b4f49]">
                            {course.level === "beginner"
                              ? "ระดับเริ่มต้น (Beginner)"
                              : course.level === "intermediate"
                              ? "ระดับกลาง (Intermediate)"
                              : "ระดับสูง (Advanced)"}
                          </span>
                          <span className="rounded-lg border border-[#b6c9c5] bg-white px-2.5 py-1 text-xs font-mono font-bold text-[#1b2a2f]">
                            รหัสคอร์ส: {course.join_code}
                          </span>
                        </div>

                        <h3 className="text-lg font-extrabold text-[#1b2a2f]">
                          {course.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#475b60]">
                          {course.description}
                        </p>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-[#cfe0dc] flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-[#475b60]">
                          <span>ผู้สอน: </span>
                          <strong className="text-[#1b2a2f]">
                            {course.teacher_name}
                          </strong>
                          <span className="mx-1.5">·</span>
                          <span>{courseLessons.length} บทเรียน</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dungeon/${course.id}`}
                            className="press-secondary rounded-xl px-3 py-2 text-xs font-extrabold flex items-center gap-1.5 text-[#5a2d91] border-[#d8c7ed] hover:border-[#9b5de5] hover:bg-[#f6f0fd]"
                            title="เล่นคอร์สนี้ในโหมด Dungeon Crawler พิกเซล"
                          >
                            <Icon name="gamepad" size={14} />
                            <span>ดันเจี้ยน</span>
                          </Link>
                          <Link
                            href={`/courses/${course.id}`}
                            className="press-secondary rounded-xl px-3.5 py-2 text-xs font-extrabold"
                          >
                            ดูบทเรียน
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleEnrollCourse(course)}
                            className="press-teal rounded-xl px-4 py-2 text-xs font-extrabold text-white cursor-pointer"
                          >
                            {isEnrolled ? "เรียนต่อ →" : "เข้าร่วมคอร์ส"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: หน้าฝึกอ่านโค้ด (PRIMM 4 ขั้น) ==================== */}
        {activeTab === "practice" && activeTopic && (
          <PracticeArena
            key={`${currentLanguage}-${activeTopic.id}`}
            topic={activeTopic}
            language={currentLanguage}
            currentStudent={currentStudent}
            studentId={currentStudent?.id}
            onBackToMap={() => setActiveTab("quest")}
            onCompleteTopic={handleCompleteTopic}
          />
        )}

        {/* ==================== TAB 3: ตาราง Block Model 12 ช่อง & ห้องทดลองรันโค้ดตามภาษา ==================== */}
        {activeTab === "learn" && (
          <div className="flex flex-col gap-6">
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-6 flex flex-col gap-4">
              <h2 className="text-[24px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                <Icon name="book" size={24} className="text-[#0f766e]" />
                <span>
                  รู้จัก Block Model 12 ช่อง สำหรับการอ่านโค้ดภาษา{" "}
                  {currentTrackMeta.name}
                </span>
              </h2>
              <p className="text-[15px] text-[#475b60]">
                เวลาเราสั่ง AI ให้เขียนโค้ดภาษา{" "}
                <strong>{currentTrackMeta.name}</strong> การจะบอกว่าเรา
                &ldquo;เข้าใจโค้ดนั้นจริง&rdquo; ต้องเข้าใจครบทั้ง{" "}
                <strong>3 มิติ</strong> ตั้งแต่คำสั่งเดี่ยวไปจนถึงภาพรวมทั้งโปรแกรม
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                <div className="p-4 rounded-xl bg-[#e3f1ee] border border-[#0f766e]/40">
                  <div className="text-[15px] font-extrabold text-[#0b4f49]">
                    มิติที่ 1 · โครงสร้างโค้ด (Text Surface: T1–T4)
                  </div>
                  <p className="text-[14px] text-[#1b2a2f] mt-1">
                    {currentLanguage === "python"
                      ? "อ่านการย่อหน้า (Indentation), เครื่องหมายโคลอน (:), if/elif/else และขอบเขต range() ออกอย่างถูกต้อง"
                      : currentLanguage === "sql"
                      ? "อ่านโครงสร้างคำสั่ง SELECT, FROM, WHERE, GROUP BY, HAVING และ ORDER BY ออกอย่างชัดเจน"
                      : "อ่านไวยากรณ์ เครื่องหมาย ขอบเขตปีกกา if/else, ลูป for/while และการส่งพารามิเตอร์ออกอย่างถูกต้อง"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#fff4d6] border border-[#f0a92e]">
                  <div className="text-[15px] font-extrabold text-[#3d2603]">
                    มิติที่ 2 · การทำงานเมื่อรันจริง (Execution: E1–E4)
                  </div>
                  <p className="text-[14px] text-[#3d2603] mt-1">
                    {currentLanguage === "sql"
                      ? "แกะรอยลำดับการประมวลผลจริงของฐานข้อมูล (FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY)"
                      : "แกะรอยได้ว่าเมื่อรันจริง โค้ดเดินไปบรรทัดไหนบ้าง ค่าตัวแปรเปลี่ยนเป็นเท่าไหร่ และแสดงผลลัพธ์อะไรออกมา"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#d8efdc] border border-[#86efac]">
                  <div className="text-[15px] font-extrabold text-[#14532d]">
                    มิติที่ 3 · หน้าที่และเป้าหมาย (Function: F1–F4)
                  </div>
                  <p className="text-[14px] text-[#14532d] mt-1">
                    อธิบายได้ว่าแต่ละส่วนของโค้ด {currentTrackMeta.name}{" "}
                    มีไว้ทำไม แก้ปัญหาอะไร และตรวจจับบั๊กที่ขัดกับเป้าหมายได้
                  </p>
                </div>
              </div>
            </div>

            <BlockModelGrid
              cellScores={currentStudent.cellScores}
              title={`สำรวจทั้ง 12 ช่องของ Block Model (หมวดภาษา ${currentTrackMeta.name})`}
              onSelectTopic={(topicId) => {
                const target =
                  currentLanguageTopics.find((t) => t.id === topicId) ||
                  currentLanguageTopics[0];
                setSelectedTopicId(target.id);
                setActiveTab("practice");
              }}
            />

            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-[18px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                  <Icon name="code" size={20} className="text-[#0f766e]" />
                  <span>
                    ห้องทดลองรันโค้ดภาษา {currentTrackMeta.name} (ตรวจสอบผลลัพธ์จริง)
                  </span>
                </h3>
                <p className="text-[13px] font-semibold text-[#475b60]">
                  {currentTrackMeta.playgroundDescription}
                </p>
              </div>

              <textarea
                rows={6}
                value={playgroundCode}
                onChange={(e) => setPlaygroundCode(e.target.value)}
                className="w-full p-4 rounded-xl bg-[#eef3f1] border-2 border-[#b6c9c5] font-code font-bold text-[#1b2a2f]"
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const res = runCodeByLanguage(
                      playgroundCode,
                      currentLanguage
                    );
                    setPlaygroundOutput(
                      res.success
                        ? res.finalOutput || "(โค้ดทำงานสำเร็จแต่ไม่มีข้อความแสดงผล)"
                        : `ข้อผิดพลาด: ${res.error}`
                    );
                  }}
                  className="press-teal px-5 py-2.5 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer"
                >
                  <Icon name="play" size={18} />
                  <span>รันโค้ด {currentTrackMeta.name}</span>
                </button>
              </div>

              {playgroundOutput && (
                <div className="p-4 rounded-xl bg-[#d8efdc] border-2 border-[#86efac] text-[#14532d]">
                  <div className="text-[13px] font-extrabold">
                    ผลลัพธ์จากการรันโค้ด {currentTrackMeta.name}:
                  </div>
                  <pre className="font-code font-extrabold text-[16px] mt-1">
                    {playgroundOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: โปรไฟล์ & ผลการฝึกของนักเรียน (ต้องเข้าสู่ระบบก่อน) ==================== */}
        {activeTab === "profile" && session && (
          <div className="flex flex-col gap-6">
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <StatusCircle
                  variant="badge"
                  size="lg"
                  label="โปรไฟล์นักเรียน"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[24px] font-extrabold text-[#1b2a2f]">
                      โปรไฟล์ของ {currentStudent.nickname}
                    </h2>
                    <span className="px-3 py-0.5 rounded-full bg-[#e3f1ee] text-[#0b4f49] text-[13px] font-extrabold">
                      รหัสห้อง {currentStudent.roomCode}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold text-[#475b60] mt-0.5">
                    เลเวล {studentLevel} · สะสม {currentStudent.xp} XP ·
                    ต่อเนื่อง {currentStudent.streak} วัน · ความเข้าใจเฉลี่ย{" "}
                    {studentAvgMastery}% (
                    {getMasteryStatus(studentAvgMastery).label})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("quest")}
                  className="press-teal px-4 py-2.5 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer"
                >
                  <Icon name="route" size={18} />
                  <span>ไปฝึกเควสต์ {currentTrackMeta.name} ต่อ</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#d8efdc] border-2 border-[#86efac] rounded-2xl p-5 text-[#14532d]">
                <div className="flex items-center gap-2 font-extrabold text-[16px]">
                  <Icon name="check" size={20} />
                  <span>ด้านที่เก่ง (เข้าใจ 80% ขึ้นไป)</span>
                </div>
                <div className="mt-3 space-y-2">
                  {strongStudentCells.length > 0 ? (
                    strongStudentCells.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl bg-white/80 flex items-center justify-between text-[14px] font-bold"
                      >
                        <span>
                          ช่อง {c.id} · {c.shortTitle}
                        </span>
                        <span className="font-extrabold">
                          {currentStudent.cellScores[c.id]}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[14px]">
                      ฝึกทำโจทย์เพิ่มเพื่อปลดล็อกช่องที่เก่งเกิน 80%!
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-[#f8d9d4] border-2 border-[#fca5a5] rounded-2xl p-5 text-[#7d1d10]">
                <div className="flex items-center gap-2 font-extrabold text-[16px]">
                  <Icon name="bulb" size={20} />
                  <span>ด้านที่ควรทบทวนเพิ่มเติม</span>
                </div>
                <div className="mt-3 space-y-2">
                  {reviewStudentCells.length > 0 ? (
                    reviewStudentCells.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl bg-white/85 flex items-center justify-between gap-2 text-[14px] font-bold"
                      >
                        <span>
                          ช่อง {c.id} · {c.shortTitle} (
                          {currentStudent.cellScores[c.id]}%)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const target =
                              currentLanguageTopics.find(
                                (t) => t.id === c.relatedTopicId
                              ) || currentLanguageTopics[0];
                            setSelectedTopicId(target.id);
                            setActiveTab("practice");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#7d1d10] text-white text-[12px] font-extrabold cursor-pointer"
                        >
                          ฝึกทบทวน →
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[14px] font-bold">
                      ยอดเยี่ยมมาก! คุณผ่านเกณฑ์ความเข้าใจเกิน 60% ทุกช่องแล้ว
                    </p>
                  )}
                </div>
              </div>
            </div>

            <BlockModelGrid
              cellScores={currentStudent.cellScores}
              title={`แผนที่ความเข้าใจ 12 ช่องของ ${currentStudent.nickname}`}
              onSelectTopic={(topicId) => {
                const target =
                  currentLanguageTopics.find((t) => t.id === topicId) ||
                  currentLanguageTopics[0];
                setSelectedTopicId(target.id);
                setActiveTab("practice");
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-3">
                <h3 className="text-[17px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                  <Icon name="shield" size={20} className="text-[#0f766e]" />
                  <span>
                    ตราความสำเร็จหมวด {currentTrackMeta.name} (
                    {
                      currentLanguageTopics.filter((t) =>
                        currentStudent.badges.includes(t.badgeReward.id)
                      ).length
                    }
                    /{currentLanguageTopics.length})
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentLanguageTopics.map((t) => {
                    const unlocked = currentStudent.badges.includes(
                      t.badgeReward.id
                    );
                    return (
                      <div
                        key={t.badgeReward.id}
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          unlocked
                            ? "bg-[#e3f1ee] border-[#0f766e] text-[#0b4f49]"
                            : "bg-[#eef3f1] border-[#cfe0dc] text-[#475b60] opacity-65"
                        }`}
                      >
                        <StatusCircle
                          variant={unlocked ? "badge" : "locked"}
                          size="sm"
                          label={t.badgeReward.name}
                        />
                        <div className="min-w-0">
                          <div className="text-[14px] font-extrabold truncate">
                            {t.badgeReward.name}
                          </div>
                          <div className="text-[12px] truncate">
                            {t.badgeReward.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-6 bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-3">
                <h3 className="text-[17px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                  <Icon name="chart" size={20} className="text-[#0f766e]" />
                  <span>ประวัติการฝึกอ่านโค้ดล่าสุด</span>
                </h3>
                {currentStudent.history.length > 0 ? (
                  <div className="space-y-2.5">
                    {currentStudent.history.map((h, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-[#eef3f1] border border-[#cfe0dc] flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-[14px] font-extrabold text-[#1b2a2f]">
                            {h.topicTitle}
                          </div>
                          <div className="text-[12px] text-[#475b60]">
                            {h.timestamp} · ความเข้าใจ {h.scorePercent}%
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-[#fff4d6] text-[#3d2603] border border-[#f0a92e] text-[13px] font-extrabold">
                          +{h.xpEarned} XP
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-[#475b60]">
                    ยังไม่มีประวัติการเล่น เริ่มฝึกด่านที่ 1 ในหน้าเส้นทางเควสต์ได้เลย!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: บันทึกการใช้ AI ==================== */}
        {activeTab === "ailog" && (
          <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <span className="px-3 py-1 rounded-full bg-[#e3f1ee] text-[#0b4f49] text-[12px] font-extrabold">
                รายการส่งงาน · บันทึกการใช้ AI (AI Log ≥ 5 Prompts)
              </span>
              <h2 className="text-[22px] font-extrabold text-[#1b2a2f] mt-2">
                บันทึกการใช้ AI พัฒนาโปรเจกต์ &ldquo;โค้ดนี้ฉันอธิบายได้&rdquo;
              </h2>
              <p className="text-[14px] text-[#475b60]">
                แสดงรายการ Prompt ที่ใช้จริง ปัญหาที่พบจากผลลัพธ์ของ AI
                และวิธีที่ทีมปรับปรุงแก้ไขด้วยตัวเองตามหลักการที่ต้องรักษา
              </p>
            </div>

            <div className="space-y-4">
              {AI_USAGE_LOGS.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-[#eef3f1] border-2 border-[#cfe0dc] flex flex-col gap-2.5"
                >
                  <div className="text-[16px] font-extrabold text-[#0b4f49]">
                    {log.promptTitle}
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#cfe0dc] text-[14px]">
                    <strong className="text-[#0f766e]">
                      Prompt ที่สั่ง AI:{" "}
                    </strong>
                    {log.promptText}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                    <div className="p-3 rounded-xl bg-[#f8d9d4] text-[#7d1d10]">
                      <strong>ปัญหาที่พบจากโค้ด/เนื้อหาที่ AI สร้าง:</strong>
                      <p className="mt-0.5">{log.problemFound}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#d8efdc] text-[#14532d]">
                      <strong>วิธีที่ทีมปรับแก้และพัฒนาต่อ:</strong>
                      <p className="mt-0.5">{log.solutionApplied}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#eef3f1] p-8 text-center text-sm font-bold text-[#0b4f49]">
          กำลังโหลดหน้าเลือกภาษาและเนื้อหาการเรียนรู้...
        </div>
      }
    >
      <CoursesContent />
    </Suspense>
  );
}
