"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  SiteHeader,
  getClientSession,
  ClientAuthSession,
} from "../../../../components/SiteHeader";
import { Icon } from "../../../../components/Icons";
import {
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
} from "../../../../lib/supabase";
import {
  loadLocalCourses,
  loadLocalEnrollments,
  loadLocalLessonProgress,
  loadLocalLessons,
  saveLocalEnrollments,
  saveLocalLessonProgress,
} from "../../../../lib/lms-data";
import {
  runCodeByLanguage,
  LearningLanguage,
} from "../../../../lib/language-tracks";
import { useUiLanguage } from "../../../../components/LanguageProvider";
import { LessonDungeonRoom } from "../../../../components/dungeon/LessonDungeonRoom";
import { PixelSpriteView } from "../../../../components/dungeon/PixelSpriteView";
import { getMonsterDef } from "../../../../lib/dungeon/monsters";
import { generateDungeonRoom } from "../../../../lib/dungeon/mapgen";
import { hashString } from "../../../../lib/dungeon/seed";

function LessonViewContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useUiLanguage();
  const courseId = String(params?.id || "");
  const lessonId = String(params?.lessonId || "");

  const initialTab = searchParams.get("mode") === "content" ? "content" : "dungeon";
  const [activeTab, setActiveTab] = useState<"content" | "dungeon">(initialTab);
  const [showQuickNotes, setShowQuickNotes] = useState<boolean>(false);

  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [runOutput, setRunOutput] = useState<string>("");

  // Quiz states
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>(
    {}
  );
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  useEffect(() => {
    const current = getClientSession();
    setSession(current);

    const allCourses = loadLocalCourses();
    const foundCourse = allCourses.find((c) => c.id === courseId) || null;
    setCourse(foundCourse);

    const allLessons = loadLocalLessons()
      .filter((l) => l.course_id === courseId && l.is_published)
      .sort((a, b) => a.order_index - b.order_index);
    setCourseLessons(allLessons);

    const foundLesson = allLessons.find((l) => l.id === lessonId) || null;
    setLesson(foundLesson);
    setRunOutput("");
    setSelectedAnswers({});
    setQuizSubmitted(false);

    if (current && foundLesson) {
      const nowIso = new Date().toISOString();

      // 1. อัปเดตบทเรียนล่าสุดที่เปิดดูใน enrollments
      const enrolls = loadLocalEnrollments();
      const existingEnrollIdx = enrolls.findIndex(
        (e) => e.course_id === courseId && e.student_id === current.userId
      );
      let updatedEnrolls: Enrollment[];
      if (existingEnrollIdx >= 0) {
        updatedEnrolls = [...enrolls];
        updatedEnrolls[existingEnrollIdx] = {
          ...updatedEnrolls[existingEnrollIdx],
          last_accessed_lesson_id: lessonId,
          last_accessed_at: nowIso,
        };
      } else {
        updatedEnrolls = [
          {
            id: `enr-${Date.now()}`,
            course_id: courseId,
            student_id: current.userId,
            enrolled_at: nowIso,
            last_accessed_lesson_id: lessonId,
            last_accessed_at: nowIso,
          },
          ...enrolls,
        ];
      }
      saveLocalEnrollments(updatedEnrolls);

      // 2. ตรวจและบันทึกว่าเปิดบทเรียนนี้แล้วใน lesson_progress
      const progs = loadLocalLessonProgress();
      const existingProg = progs.find(
        (p) => p.lesson_id === lessonId && p.student_id === current.userId
      );
      if (existingProg) {
        setIsCompleted(existingProg.is_completed);
        setQuizScore(existingProg.quiz_score);
      } else {
        const newProg: LessonProgress = {
          id: `prog-${Date.now()}`,
          student_id: current.userId,
          course_id: courseId,
          lesson_id: lessonId,
          is_completed: false,
          quiz_score: null,
          opened_at: nowIso,
          completed_at: null,
          updated_at: nowIso,
        };
        saveLocalLessonProgress([newProg, ...progs]);
      }

      // ซิงค์กับ Supabase เบื้องหลัง
      fetch("/api/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-progress",
          courseId,
          lessonId,
          studentId: current.userId,
          isCompleted: existingProg?.is_completed || false,
          quizScore: existingProg?.quiz_score ?? null,
        }),
      }).catch(() => {});
    }
  }, [courseId, lessonId]);

  const currentIdx = lesson
    ? courseLessons.findIndex((l) => l.id === lesson.id)
    : -1;
  const totalLessons = Math.max(1, courseLessons.length);
  const roomSeed = useMemo(() => hashString(course?.id || courseId || "default"), [course?.id, courseId]);
  const currentRoom = useMemo(
    () => generateDungeonRoom(roomSeed, currentIdx >= 0 ? currentIdx : 0, totalLessons),
    [roomSeed, currentIdx, totalLessons]
  );
  const monsterDef = useMemo(
    () =>
      getMonsterDef(
        currentRoom.entity?.monsterType ||
          (currentIdx >= totalLessons - 1 ? "boss" : "slime")
      ),
    [currentRoom.entity?.monsterType, currentIdx, totalLessons]
  );

  if (!course || !lesson) {
    return (
      <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6]">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-4 py-12 text-center">
          <h1 className="text-xl font-bold text-[#f4efe6]">
            {t("ไม่พบบทเรียนที่คุณต้องการ", "Lesson not found")}
          </h1>
          <Link
            href="/courses"
            className="mt-4 inline-block rounded-xl bg-[#2fbf71] px-4 py-2 text-xs font-extrabold text-[#0b0b14] hover:bg-[#34d37d] transition-colors"
          >
            {t("← กลับไปหน้ารวมคอร์ส", "← Back to Courses")}
          </Link>
        </main>
      </div>
    );
  }

  const prevLesson = currentIdx > 0 ? courseLessons[currentIdx - 1] : null;
  const nextLesson =
    currentIdx >= 0 && currentIdx < courseLessons.length - 1
      ? courseLessons[currentIdx + 1]
      : null;

  const handleRunCode = () => {
    const rawLang = (lesson.programming_language || "javascript")
      .toLowerCase()
      .trim();
    const normalizedLang: LearningLanguage =
      rawLang === "c++" || rawLang === "cpp"
        ? "cpp"
        : rawLang === "ts" || rawLang === "typescript"
        ? "typescript"
        : rawLang === "py" || rawLang === "python"
        ? "python"
        : rawLang === "sql"
        ? "sql"
        : rawLang === "java"
        ? "java"
        : "javascript";

    const res = runCodeByLanguage(lesson.code_example, normalizedLang);
    setRunOutput(
      res.error
        ? `Error: ${res.error}`
        : res.outputs.join("\n") ||
            res.finalOutput ||
            t(
              "(รันสำเร็จ ไม่มีข้อความออกทางหน้าจอ)",
              "(Executed successfully with no output)"
            )
    );
  };

  const handleMarkCompleted = async (calculatedScore?: number | null) => {
    if (!session) {
      router.push(
        `/login?redirect=${encodeURIComponent(
          `/courses/${course.id}/lessons/${lesson.id}`
        )}`
      );
      return;
    }

    const nowIso = new Date().toISOString();
    const finalScore =
      calculatedScore !== undefined ? calculatedScore : quizScore;

    setIsCompleted(true);

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
        quiz_score: finalScore,
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
          quiz_score: finalScore,
          opened_at: nowIso,
          completed_at: nowIso,
          updated_at: nowIso,
        },
        ...progs,
      ];
    }
    saveLocalLessonProgress(updatedProgs);

    try {
      await fetch("/api/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-progress",
          courseId: course.id,
          lessonId: lesson.id,
          studentId: session.userId,
          isCompleted: true,
          quizScore: finalScore,
        }),
      });
    } catch {
      // ignore
    }
  };

  const handleSubmitQuiz = async () => {
    const questions = lesson.quiz_questions || [];
    if (questions.length === 0) return;

    let correctCount = 0;
    for (const q of questions) {
      if (selectedAnswers[q.id] === q.correctIndex) {
        correctCount += 1;
      }
    }
    const scorePct = Math.round((correctCount / questions.length) * 100);
    setQuizScore(scorePct);
    setQuizSubmitted(true);

    if (session) {
      await handleMarkCompleted(scorePct);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6]">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#9a93ad]">
          <div>
            <Link href="/courses" className="hover:text-[#f4efe6] transition-colors">
              {t("คอร์สทั้งหมด", "All Courses")}
            </Link>{" "}
            /{" "}
            <Link
              href={`/courses/${course.id}`}
              className="font-semibold text-[#f6c945] hover:underline"
            >
              {course.title}
            </Link>
          </div>
          <span>
            {t(
              `บทเรียนที่ ${currentIdx + 1} จาก ${courseLessons.length}`,
              `Lesson ${currentIdx + 1} of ${courseLessons.length}`
            )}
          </span>
        </div>

        {/* Dual Mode Switcher Tabs */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-[#2f2d45] pb-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("dungeon")}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "dungeon"
                  ? "border-[#9b5de5] text-[#ffe27a]"
                  : "border-transparent text-[#9a93ad] hover:text-[#f4efe6]"
              }`}
            >
              <Icon name="gamepad" size={15} />
              <span>{t("ห้องดันเจี้ยนประจำบทเรียน", "Lesson Dungeon Room")}</span>
              {isCompleted && (
                <span className="text-[10px] border border-[#2fbf71]/40 bg-[#102a1e] text-[#86efac] px-1.5 py-0.2 rounded font-bold">
                  {t("พิชิตแล้ว", "Cleared")}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "content"
                  ? "border-[#2fbf71] text-[#2fbf71]"
                  : "border-transparent text-[#9a93ad] hover:text-[#f4efe6]"
              }`}
            >
              <Icon name="book" size={15} />
              <span>{t("อ่านบทเรียน & โค้ดตัวอย่าง", "Lesson Notes & Code")}</span>
            </button>
          </div>

          {activeTab === "dungeon" && (
            <button
              type="button"
              onClick={() => setShowQuickNotes((prev) => !prev)}
              className="mb-1.5 inline-flex items-center gap-1.5 rounded-lg border border-[#3d395a] bg-[#1c1b2b] px-3 py-1.5 text-[11px] font-bold text-[#f6c945] hover:border-[#f6c945] hover:bg-[#252238] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Icon name="book" size={13} />
              <span>
                {showQuickNotes
                  ? t("ซ่อนสรุปบทเรียน", "Hide Lesson Notes")
                  : t("ดูสรุปบทเรียน & โค้ดตัวอย่าง", "Show Lesson Notes & Code")}
              </span>
            </button>
          )}
        </div>

        {activeTab === "dungeon" ? (
          <div className="space-y-4">
            {showQuickNotes && (
              <div className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-5 shadow-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2f2d45] pb-3">
                  <h2 className="text-sm sm:text-base font-bold text-[#f4efe6]">
                    {lesson.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("content")}
                    className="text-xs font-bold text-[#2fbf71] hover:underline cursor-pointer whitespace-nowrap"
                  >
                    {t("เปิดหน้าบทเรียนเต็ม →", "Open Full Lesson →")}
                  </button>
                </div>
                <div className="text-xs sm:text-sm leading-relaxed text-[#e8e1cf] whitespace-pre-line">
                  {lesson.content_md}
                </div>
                {lesson.code_example && (
                  <div className="rounded-xl border border-[#3d395a] bg-[#120f1c] p-4 text-[#f4efe6]">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#f6c945]">
                        {t("ตัวอย่างโค้ด", "Code Example")} ({lesson.programming_language})
                      </span>
                      <button
                        type="button"
                        onClick={handleRunCode}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#2fbf71] px-2.5 py-1 text-[11px] font-extrabold text-[#0b0b14] hover:bg-[#34d37d] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Icon name="play" className="h-3 w-3" />
                        <span>{t("รันโค้ด", "Run Code")}</span>
                      </button>
                    </div>
                    <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-[#f4efe6]">
                      {lesson.code_example}
                    </pre>
                    {runOutput && (
                      <div className="mt-3 rounded-lg border border-[#2f2d45] bg-[#0d0b14] p-2.5 font-mono text-xs text-[#ffe27a]">
                        {runOutput}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <LessonDungeonRoom
              course={course}
              lesson={lesson}
              lessonIndex={currentIdx >= 0 ? currentIdx : 0}
              totalLessons={totalLessons}
              isCompleted={isCompleted}
              onLessonCompleted={() => setIsCompleted(true)}
              onSwitchToContent={() => setActiveTab("content")}
              nextLessonUrl={nextLesson ? `/courses/${course.id}/lessons/${nextLesson.id}` : undefined}
            />
          </div>
        ) : (
          /* Lesson Content Card */
          <div className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-6 sm:p-8 shadow-lg space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#2f2d45] pb-4">
            <div>
              <span className="rounded-md border border-[#3d395a] bg-[#1c1b2b] px-2.5 py-1 text-xs font-bold text-[#f6c945]">
                บทที่ {lesson.order_index}
              </span>
              <h1 className="mt-2 text-xl sm:text-2xl font-bold text-[#f4efe6]">
                {lesson.title}
              </h1>
            </div>

            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#2fbf71]/40 bg-[#102a1e] px-3 py-1.5 text-xs font-bold text-[#86efac]">
                ✓ เรียนจบบทเรียนนี้แล้ว
              </span>
            )}
          </div>

          {/* Markdown-like Formatted Content */}
          <div className="space-y-3 text-sm leading-relaxed text-[#e8e1cf] whitespace-pre-line">
            {lesson.content_md}
          </div>

          {/* Code Example Box */}
          {lesson.code_example && (
            <div className="rounded-2xl border border-[#3d395a] bg-[#120f1c] p-5 text-[#f4efe6]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#f6c945]">
                  ตัวอย่างโค้ด ({lesson.programming_language})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunCode}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2fbf71] px-3 py-1.5 text-xs font-extrabold text-[#0b0b14] hover:bg-[#34d37d] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Icon name="play" className="h-3.5 w-3.5" />
                    <span>รันโค้ดตัวอย่าง</span>
                  </button>
                </div>
              </div>
              <pre className="overflow-x-auto font-mono text-xs sm:text-sm leading-relaxed text-[#f4efe6]">
                {lesson.code_example}
              </pre>

              {runOutput && (
                <div className="mt-4 rounded-xl border border-[#2f2d45] bg-[#0d0b14] p-3.5 font-mono text-xs text-[#ffe27a]">
                  <span className="block text-[10px] uppercase text-[#9a93ad] mb-1">
                    ผลลัพธ์จากการรันจริง (Console Output):
                  </span>
                  {runOutput}
                </div>
              )}
            </div>
          )}

          {/* External / Video Links */}
          {(lesson.external_url || lesson.video_url) && (
            <div className="flex flex-wrap gap-3 rounded-xl border border-[#2f2d45] bg-[#1c1b2b] p-4">
              {lesson.external_url && (
                <a
                  href={lesson.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#3d395a] bg-[#141220] px-3.5 py-2 text-xs font-bold text-[#f6c945] hover:border-[#f6c945] hover:bg-[#252238] transition-colors whitespace-nowrap"
                >
                  🔗 เอกสารอ้างอิงเพิ่มเติม ↗
                </a>
              )}
              {lesson.video_url && (
                <a
                  href={lesson.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#3d395a] bg-[#141220] px-3.5 py-2 text-xs font-bold text-[#f6c945] hover:border-[#f6c945] hover:bg-[#252238] transition-colors whitespace-nowrap"
                >
                  🎬 วิดีโอประกอบบทเรียน ↗
                </a>
              )}
            </div>
          )}

          {/* Quiz Section */}
          {Array.isArray(lesson.quiz_questions) &&
            lesson.quiz_questions.length > 0 && (
              <div className="rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-[#f4efe6] flex items-center gap-2">
                    <Icon name="award" className="h-4 w-4 text-[#f6c945]" />
                    <span>แบบทดสอบท้ายบทเรียน ({lesson.quiz_questions.length} ข้อ)</span>
                  </h2>
                  {quizScore !== null && (
                    <span className="rounded-lg border border-[#2fbf71]/40 bg-[#102a1e] px-3 py-1 text-xs font-bold text-[#86efac]">
                      คะแนนล่าสุด: {quizScore}%
                    </span>
                  )}
                </div>

                {lesson.quiz_questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="rounded-xl border border-[#2f2d45] bg-[#141220] p-4 space-y-2.5"
                  >
                    <p className="text-xs sm:text-sm font-bold text-[#f4efe6]">
                      ข้อที่ {qIdx + 1}: {q.question}
                    </p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => {
                        const isPicked = selectedAnswers[q.id] === optIdx;
                        const isCorrect = q.correctIndex === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() =>
                              setSelectedAnswers((prev) => ({
                                ...prev,
                                [q.id]: optIdx,
                              }))
                            }
                            className={`w-full text-left rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                              quizSubmitted
                                ? isCorrect
                                  ? "border-[#2fbf71] bg-[#102a1e] font-bold text-[#86efac]"
                                  : isPicked
                                  ? "border-[#c0283a] bg-[#2d141c] text-[#fca5a5]"
                                  : "border-[#2f2d45] bg-[#1c1b2b] text-[#9a93ad]"
                                : isPicked
                                ? "border-[#9b5de5] bg-[#5a2d91]/35 font-bold text-[#ffe27a]"
                                : "border-[#2f2d45] bg-[#1c1b2b] text-[#e8e1cf] hover:border-[#9b5de5] hover:bg-[#252238]"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {quizSubmitted && q.explanation && (
                      <p className="mt-2 rounded-lg border border-[#2f2d45] bg-[#1c1b2b] p-2.5 text-xs text-[#c4bdd6]">
                        💡 <strong className="text-[#f6c945]">เฉลย:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="rounded-xl bg-[#2fbf71] px-5 py-2.5 text-xs font-extrabold text-[#0b0b14] hover:bg-[#34d37d] transition-colors cursor-pointer"
                >
                  ตรวจคำตอบและบันทึกผลเรียนจบ
                </button>
              </div>
            )}

          {/* Dungeon Practice Callout Box */}
          <div className="rounded-2xl border border-[#9b5de5]/30 bg-gradient-to-r from-[#252238] to-[#1c1b2b] p-5 text-[#f4efe6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#120f1c] border border-[#4a4766] shrink-0">
                <PixelSpriteView sprite={monsterDef.sprite} size={40} animateBounce />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="pixel-font text-[10px] text-[#ffe27a] uppercase">
                    DUNGEON CHALLENGE · ชั้นที่ {currentIdx + 1}
                  </span>
                  {isCompleted && (
                    <span className="text-[10px] bg-[#2fbf71]/20 text-[#2fbf71] px-2 py-0.5 rounded border border-[#2fbf71]/40 font-bold">
                      พิชิตแล้ว
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-[#f4efe6]">
                  ท้าทายด้วยห้องดันเจี้ยน: {monsterDef.name}
                </h3>
                <p className="text-[11px] text-[#9a93ad] mt-0.5">
                  เดินสำรวจห้องพิกเซล ตอบคำถามทดสอบความเข้าใจเพื่อรับ +{monsterDef.xpReward} XP และ +{monsterDef.coinReward} G
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("dungeon")}
              className="px-4 py-2.5 rounded-xl bg-[#9b5de5] hover:bg-[#b07af0] text-[#f4efe6] text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Icon name="gamepad" size={14} />
              <span>เข้าสู่ห้องดันเจี้ยน</span>
            </button>
          </div>

          {/* Bottom Actions: Mark Completed & Next/Prev Lesson */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2f2d45] pt-5">
            <div>
              {prevLesson ? (
                <Link
                  href={`/courses/${course.id}/lessons/${prevLesson.id}`}
                  className="inline-block rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-4 py-2.5 text-xs font-bold text-[#f4efe6] hover:border-[#f6c945] hover:bg-[#252238] transition-colors whitespace-nowrap"
                >
                  ← บทก่อนหน้า
                </Link>
              ) : (
                <Link
                  href={`/courses/${course.id}`}
                  className="inline-block rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-4 py-2.5 text-xs font-bold text-[#f4efe6] hover:border-[#f6c945] hover:bg-[#252238] transition-colors whitespace-nowrap"
                >
                  ← สารบัญคอร์ส
                </Link>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => handleMarkCompleted()}
                  className="rounded-xl border border-[#2fbf71]/50 bg-[#102a1e] px-4 py-2.5 text-xs font-bold text-[#86efac] hover:bg-[#1a3d2d] transition-colors cursor-pointer whitespace-nowrap"
                >
                  ✓ บันทึกว่าเรียนจบบทนี้แล้ว
                </button>
              )}

              {nextLesson && (
                <Link
                  href={`/courses/${course.id}/lessons/${nextLesson.id}`}
                  className="rounded-xl bg-[#2fbf71] px-5 py-2.5 text-xs font-extrabold text-[#0b0b14] hover:bg-[#34d37d] transition-colors whitespace-nowrap"
                >
                  บทเรียนถัดไป →
                </Link>
              )}
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}

export default function LessonViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0b14] flex items-center justify-center text-sm font-bold text-[#9a93ad]">
          กำลังโหลดบทเรียน...
        </div>
      }
    >
      <LessonViewContent />
    </Suspense>
  );
}
