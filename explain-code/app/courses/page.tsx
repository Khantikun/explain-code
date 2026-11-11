"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  runJavaScriptReal,
} from "../lib/curriculum";
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

export default function CoursesPage() {
  const router = useRouter();
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<LearningTab>("quest");

  // ข้อมูลเควสต์ PRIMM & Block Model 12 ช่อง
  const [classrooms, setClassrooms] =
    useState<ClassroomRecord[]>(INITIAL_CLASSROOMS);
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [currentStudentId, setCurrentStudentId] = useState<string>("stu-1");
  const [selectedTopicId, setSelectedTopicId] = useState<number>(1);
  const [unlockAllDemo, setUnlockAllDemo] = useState<boolean>(false);

  // ห้องทดลองรันโค้ด JavaScript จริง
  const [playgroundCode, setPlaygroundCode] = useState<string>(
    `let items = [20, 35, 15];\nlet total = 0;\nfor (let i = 0; i < items.length; i++) {\n  total += items[i];\n}\nconsole.log("ผลรวม =", total);`
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

  const currentStudentRoom = classrooms.find(
    (r) => r.roomCode === currentStudent.roomCode
  );
  const activeTopic =
    TOPICS.find((t) => t.id === selectedTopicId) || TOPICS[0];

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

  const isTopicUnlocked = (topicId: number): boolean => {
    if (unlockAllDemo) return true;
    if (topicId === 1) return true;
    if (topicId === 7) {
      return currentStudent.completedTopics.length >= 4;
    }
    return currentStudent.completedTopics.includes(topicId - 1);
  };

  // เมื่อผู้เรียนเล่นจบด่านเควสต์ -> อัปเดต XP, ตราความสำเร็จ และคะแนน Block Model 12 ช่อง
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
    const topicObj = TOPICS.find((t) => t.id === result.topicId);
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
      topicTitle: topicObj?.title || `เรื่องที่ ${result.topicId}`,
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
        text: `ไม่พบคอร์สที่เผยแพร่แล้วสำหรับรหัส "${cleanCode}" (ตัวอย่างรหัสคอร์ส: JS2026 หรือ AI2026)`,
      });
      return;
    }

    setJoinMsg({
      type: "success",
      text: `พบคอร์ส "${matched.title}" กำลังพาเข้าสู่คอร์ส...`,
    });
    await handleEnrollCourse(matched);
  };

  return (
    <div className="min-h-screen bg-[#eef3f1] text-[#1b2a2f] flex flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 flex flex-col gap-6">
        {/* แถบควบคุมหมวดการเรียนรู้ & สถานะ XP/สตรีคของผู้เรียน */}
        <div className="rounded-2xl border-2 border-[#cfe0dc] bg-white p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              {
                id: "quest" as LearningTab,
                label: "เส้นทางเควสต์ & คอร์สเรียน",
                icon: "route" as const,
              },
              {
                id: "practice" as LearningTab,
                label: "ฝึกอ่านโค้ด (PRIMM)",
                icon: "play" as const,
              },
              {
                id: "learn" as LearningTab,
                label: "Block Model 12 ช่อง",
                icon: "book" as const,
              },
              {
                id: "profile" as LearningTab,
                label: "โปรไฟล์ & ผลการฝึก",
                icon: "user" as const,
              },
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

          {/* แถบแสดง XP, เลเวล และสตรีค */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-xl bg-[#e3f1ee] text-[#0b4f49] text-xs font-extrabold">
              ผู้เรียน: {currentStudent.nickname}
            </span>
            <div className="px-3 py-1.5 rounded-xl bg-[#fff4d6] border border-[#f0a92e] text-[#3d2603] text-xs font-extrabold flex items-center gap-1.5">
              <Icon name="star" size={15} filled />
              <span>
                Lv.{studentLevel} · {currentStudent.xp} XP
              </span>
            </div>
            <div
              className="px-2.5 py-1.5 rounded-xl bg-[#0b4f49] text-[#f6b73c] text-xs font-extrabold flex items-center gap-1"
              title="สตรีคการฝึกต่อเนื่อง"
            >
              <Icon name="flame" size={15} filled />
              <span>{currentStudent.streak} วัน</span>
            </div>
          </div>
        </div>

        {/* ==================== TAB 1: เส้นทางเควสต์ 7 เรื่อง & คอร์สเรียนจากครู ==================== */}
        {activeTab === "quest" && (
          <div className="flex flex-col gap-6">
            {/* การ์ดเควสต์ประจำวัน + คำแนะนำทบทวนจากครู */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 bg-[#fff4d6] border-2 border-[#f0a92e] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#f6b73c] border-2 border-[#b97a0c] text-[#3d2603] flex items-center justify-center shrink-0">
                    <Icon name="target" size={24} />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#3d2603] text-[#fff4d6] text-[11px] font-extrabold">
                      เควสต์ประจำวัน · โบนัส +30 XP
                    </span>
                    <h3 className="text-[18px] font-extrabold text-[#3d2603] mt-1">
                      ฝึกอ่านโค้ดและตอบคำถามช่องการทำงานจริง (E1–E4)
                    </h3>
                    <p className="text-[13px] font-semibold text-[#5c3704] mt-0.5">
                      สะสม XP จากความเข้าใจโดยตรง ไม่คิดคะแนนจากความเร็ว
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextTopicId =
                      TOPICS.find(
                        (t) => !currentStudent.completedTopics.includes(t.id)
                      )?.id || 1;
                    setSelectedTopicId(nextTopicId);
                    setActiveTab("practice");
                  }}
                  className="press-teal px-6 py-3.5 rounded-xl text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Icon name="play" size={18} filled />
                  <span>เริ่มเล่นเควสต์วันนี้</span>
                </button>
              </div>

              {/* การ์ดเรื่องที่ครูปักหมุดให้ทบทวนประจำห้อง */}
              <div className="lg:col-span-5 bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[12px] font-extrabold text-[#0f766e]">
                      คำแนะนำจากครู (
                      {currentStudentRoom?.roomName || currentStudent.roomCode})
                    </span>
                    <h4 className="text-[16px] font-extrabold text-[#1b2a2f] mt-0.5">
                      {TOPICS.find(
                        (t) => t.id === currentStudentRoom?.pinnedReviewTopicId
                      )?.title || "เรื่องที่ 4 · วนซ้ำ while"}
                    </h4>
                  </div>
                  <Icon
                    name="bulb"
                    size={22}
                    className="text-[#f0a92e] shrink-0"
                  />
                </div>
                <p className="text-[13px] text-[#475b60]">
                  {currentStudentRoom?.pinnedReviewNote ||
                    "ฝึกเดินโค้ดดูค่าตัวแปรและเงื่อนไขการหยุดลูป"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTopicId(
                      currentStudentRoom?.pinnedReviewTopicId || 4
                    );
                    setActiveTab("practice");
                  }}
                  className="press-secondary w-full py-2.5 rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Icon name="play" size={16} filled />
                  <span>เข้าเล่นเรื่องที่ครูแนะนำ</span>
                </button>
              </div>
            </div>

            {/* เส้นทางเควสต์ 7 เรื่อง (PRIMM & Block Model) */}
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[22px] sm:text-[24px] font-extrabold text-[#1b2a2f]">
                    เส้นทางเควสต์อ่านโค้ด 7 เรื่อง (PRIMM)
                  </h2>
                  <p className="text-[14px] font-semibold text-[#475b60]">
                    ผ่านแล้ว {currentStudent.completedTopics.length}/7 เรื่อง ·
                    บอสด่านเปิดเมื่อผ่านอย่างน้อย 4 เรื่อง
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
                    ? "✓ ปลดล็อกทุกเรื่องแล้ว"
                    : "ปลดล็อกทุกเรื่อง (โหมดสาธิต)"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TOPICS.map((topic) => {
                  const isPassed = currentStudent.completedTopics.includes(
                    topic.id
                  );
                  const unlocked = isTopicUnlocked(topic.id);
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
                                : isBoss
                                ? `ล็อก (ผ่านแล้ว ${currentStudent.completedTopics.length}/4 เรื่อง)`
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

            {/* ส่วนคอร์สและบทเรียนจากครูผู้สอน (Open Courses) ในหน้าเดียวกัน */}
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 sm:p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
                <div className="lg:col-span-7">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f1ee] px-3 py-1 text-xs font-extrabold text-[#0b4f49]">
                    <Icon name="book" className="h-3.5 w-3.5" />
                    คอร์สและบทเรียนเสริมจากครูผู้สอน (Open Courses)
                  </span>
                  <h2 className="mt-2 text-[22px] sm:text-[24px] font-extrabold text-[#1b2a2f]">
                    คลังคอร์สและบทเรียนประกอบการฝึก
                  </h2>
                  <p className="mt-1 text-sm text-[#475b60]">
                    เลือกอ่านเนื้อหาบทเรียน ตัวอย่างโค้ด และทำแบบทดสอบท้ายบท หรือกรอกรหัสคอร์สจากครูผู้สอนเพื่อบันทึกความคืบหน้า
                  </p>
                  {session?.role === "student" && (
                    <div className="mt-3">
                      <Link
                        href="/my-learning"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#e3f1ee] px-4 py-2 text-xs font-extrabold text-[#0b4f49] hover:bg-[#cfe0dc] transition-colors"
                      >
                        <Icon name="award" className="h-4 w-4" />
                        <span>
                          ไปที่หน้า &ldquo;การเรียนของฉัน&rdquo; (ดูความคืบหน้า
                          &amp; เรียนต่อ) →
                        </span>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5">
                  <form
                    onSubmit={handleJoinByCode}
                    className="rounded-xl border-2 border-[#cfe0dc] bg-[#eef3f1] p-4"
                  >
                    <label className="block text-xs font-extrabold text-[#1b2a2f] mb-1.5">
                      มีรหัสคอร์ส / รหัสห้องเรียนจากครูใช่ไหม?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={joinCodeInput}
                        onChange={(e) =>
                          setJoinCodeInput(e.target.value.toUpperCase())
                        }
                        placeholder="กรอกรหัส เช่น JS2026"
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
                {publishedCourses.map((course) => {
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

                        <div className="flex items-center gap-2">
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
        {activeTab === "practice" && (
          <PracticeArena
            key={activeTopic.id}
            topic={activeTopic}
            currentStudent={currentStudent}
            studentId={currentStudent?.id}
            onBackToMap={() => setActiveTab("quest")}
            onCompleteTopic={handleCompleteTopic}
          />
        )}

        {/* ==================== TAB 3: ตาราง Block Model 12 ช่อง & ห้องทดลองรันโค้ด ==================== */}
        {activeTab === "learn" && (
          <div className="flex flex-col gap-6">
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-6 flex flex-col gap-4">
              <h2 className="text-[24px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                <Icon name="book" size={24} className="text-[#0f766e]" />
                <span>
                  รู้จัก Block Model 12 ช่อง และวิธีเรียน 4 ขั้น (PRIMM)
                </span>
              </h2>
              <p className="text-[15px] text-[#475b60]">
                เวลาเราสั่ง AI ให้เขียนโค้ดให้ การจะบอกว่าเรา
                &ldquo;เข้าใจโค้ดนั้นจริง&rdquo; ไม่ใช่แค่อ่านออกทีละคำ
                แต่ต้องเข้าใจครบทั้ง <strong>3 มิติ</strong> ในทุกระดับของโค้ด
                ตั้งแต่บรรทัดเดี่ยวไปจนถึงภาพรวมทั้งโปรแกรม รวมเป็น{" "}
                <strong>12 ช่องของ Block Model</strong>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                <div className="p-4 rounded-xl bg-[#e3f1ee] border border-[#0f766e]/40">
                  <div className="text-[15px] font-extrabold text-[#0b4f49]">
                    มิติที่ 1 · โครงสร้างโค้ด (Text Surface: T1–T4)
                  </div>
                  <p className="text-[14px] text-[#1b2a2f] mt-1">
                    อ่านไวยากรณ์ เครื่องหมาย ขอบเขตบล็อก `if/else`, ลูป
                    `for/while` และการเชื่อมโยงพารามิเตอร์ออกอย่างถูกต้อง
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#fff4d6] border border-[#f0a92e]">
                  <div className="text-[15px] font-extrabold text-[#3d2603]">
                    มิติที่ 2 · การทำงานเมื่อรันจริง (Execution: E1–E4)
                  </div>
                  <p className="text-[14px] text-[#3d2603] mt-1">
                    แกะรอยได้ว่าเมื่อรันจริง โค้ดเดินไปบรรทัดไหนบ้าง
                    ค่าตัวแปรเปลี่ยนเป็นเท่าไหร่ และพิมพ์ผลลัพธ์อะไรออกมา
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#d8efdc] border border-[#86efac]">
                  <div className="text-[15px] font-extrabold text-[#14532d]">
                    มิติที่ 3 · หน้าที่และเป้าหมาย (Function: F1–F4)
                  </div>
                  <p className="text-[14px] text-[#14532d] mt-1">
                    อธิบายได้ว่าแต่ละบรรทัด แต่ละบล็อก และทั้งโปรแกรมมีไว้ทำไม
                    แก้ปัญหาอะไร และตรวจจับบั๊กที่ขัดกับเป้าหมายได้
                  </p>
                </div>
              </div>
            </div>

            <BlockModelGrid
              cellScores={currentStudent.cellScores}
              title="สำรวจทั้ง 12 ช่องของ Block Model (คลิกที่ช่องเพื่อดูตัวอย่างคำถามและไปฝึก)"
              onSelectTopic={(topicId) => {
                setSelectedTopicId(topicId);
                setActiveTab("practice");
              }}
            />

            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-[18px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                  <Icon name="code" size={20} className="text-[#0f766e]" />
                  <span>
                    ห้องทดลองรันโค้ด JavaScript จริง (ตรวจสอบโค้ดที่ AI เขียนให้)
                  </span>
                </h3>
                <p className="text-[13px] font-semibold text-[#475b60]">
                  วางโค้ด JavaScript ที่คุณได้มาจาก AI
                  แล้วกดรันจริงเพื่อดูผลลัพธ์จาก console.log โดยไม่ใช้การเดา
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
                    const res = runJavaScriptReal(playgroundCode);
                    setPlaygroundOutput(
                      res.success
                        ? res.finalOutput ||
                            "(โค้ดทำงานสำเร็จแต่ไม่มีคำสั่ง console.log)"
                        : `ข้อผิดพลาด: ${res.error}`
                    );
                  }}
                  className="press-teal px-5 py-2.5 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer"
                >
                  <Icon name="play" size={18} />
                  <span>รันโค้ดจริง</span>
                </button>
              </div>

              {playgroundOutput && (
                <div className="p-4 rounded-xl bg-[#d8efdc] border-2 border-[#86efac] text-[#14532d]">
                  <div className="text-[13px] font-extrabold">
                    ผลลัพธ์จากการรันโค้ดจริง:
                  </div>
                  <pre className="font-code font-extrabold text-[16px] mt-1">
                    {playgroundOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: โปรไฟล์ & ผลการฝึกของนักเรียน ==================== */}
        {activeTab === "profile" && (
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
                    ต่อเนื่อง {currentStudent.streak} วัน · ผ่านแล้ว{" "}
                    {currentStudent.completedTopics.length}/7 เรื่อง ·
                    ความเข้าใจเฉลี่ย {studentAvgMastery}% (
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
                  <span>ไปฝึกเควสต์ถัดไป</span>
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
                            setSelectedTopicId(c.relatedTopicId);
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
                setSelectedTopicId(topicId);
                setActiveTab("practice");
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-3">
                <h3 className="text-[17px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                  <Icon name="shield" size={20} className="text-[#0f766e]" />
                  <span>
                    ตราความสำเร็จที่ได้รับ ({currentStudent.badges.length}/7)
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TOPICS.map((t) => {
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
                    ยังไม่มีประวัติการเล่น เริ่มฝึกเรื่องที่ 1
                    ในหน้าเส้นทางเควสต์ได้เลย!
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
