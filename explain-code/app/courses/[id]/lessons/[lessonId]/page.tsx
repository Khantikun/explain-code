"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { runJavaScriptReal } from "../../../../lib/curriculum";

function LessonViewContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params?.id || "");
  const lessonId = String(params?.lessonId || "");

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

  if (!course || !lesson) {
    return (
      <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c]">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-4 py-12 text-center">
          <h1 className="text-xl font-bold">ไม่พบบทเรียนที่คุณต้องการ</h1>
          <Link
            href="/courses"
            className="mt-4 inline-block rounded-xl bg-[#2a4d3e] px-4 py-2 text-xs font-bold text-white"
          >
            ← กลับไปหน้ารวมคอร์ส
          </Link>
        </main>
      </div>
    );
  }

  const currentIdx = courseLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIdx > 0 ? courseLessons[currentIdx - 1] : null;
  const nextLesson =
    currentIdx >= 0 && currentIdx < courseLessons.length - 1
      ? courseLessons[currentIdx + 1]
      : null;

  const handleRunCode = () => {
    if (lesson.programming_language === "javascript") {
      const res = runJavaScriptReal(lesson.code_example);
      setRunOutput(
        res.error
          ? `Error: ${res.error}`
          : res.outputs.join("\n") ||
              res.finalOutput ||
              "(รันสำเร็จ ไม่มีข้อความออกทาง console.log)"
      );
    } else {
      setRunOutput(
        `[จำลองการรันภาษา ${lesson.programming_language.toUpperCase()}] โค้ดทำงานตามลำดับคำสั่งเรียบร้อย`
      );
    }
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
    <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c]">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6e6a63]">
          <div>
            <Link href="/courses" className="hover:text-[#1e1e1c]">
              คอร์สทั้งหมด
            </Link>{" "}
            /{" "}
            <Link
              href={`/courses/${course.id}`}
              className="font-semibold text-[#2a4d3e] hover:underline"
            >
              {course.title}
            </Link>
          </div>
          <span>
            บทเรียนที่ {currentIdx + 1} จาก {courseLessons.length}
          </span>
        </div>

        {/* Lesson Content Card */}
        <div className="rounded-2xl border border-[#e5dfd3] bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ece7dc] pb-4">
            <div>
              <span className="rounded-md bg-[#e8f0ec] px-2.5 py-1 text-xs font-bold text-[#2a4d3e]">
                บทที่ {lesson.order_index}
              </span>
              <h1 className="mt-2 text-xl sm:text-2xl font-bold text-[#1e1e1c]">
                {lesson.title}
              </h1>
            </div>

            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#dcfce7] px-3 py-1.5 text-xs font-bold text-[#166534]">
                ✓ เรียนจบบทเรียนนี้แล้ว
              </span>
            )}
          </div>

          {/* Markdown-like Formatted Content */}
          <div className="space-y-3 text-sm leading-relaxed text-[#2c2a27] whitespace-pre-line">
            {lesson.content_md}
          </div>

          {/* Code Example Box */}
          {lesson.code_example && (
            <div className="rounded-2xl border border-[#d8d1c5] bg-[#1e1e1c] p-5 text-[#f8f8f2]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#a6e22e]">
                  ตัวอย่างโค้ด ({lesson.programming_language})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunCode}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2a4d3e] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1f3b2f] cursor-pointer"
                  >
                    <Icon name="play" className="h-3.5 w-3.5" />
                    <span>รันโค้ดตัวอย่าง</span>
                  </button>
                </div>
              </div>
              <pre className="overflow-x-auto font-mono text-xs sm:text-sm leading-relaxed">
                {lesson.code_example}
              </pre>

              {runOutput && (
                <div className="mt-4 rounded-xl border border-[#3e3d32] bg-[#141413] p-3.5 font-mono text-xs text-[#e6db74]">
                  <span className="block text-[10px] uppercase text-[#8f908a] mb-1">
                    ผลลัพธ์จากการรันจริง (Console Output):
                  </span>
                  {runOutput}
                </div>
              )}
            </div>
          )}

          {/* External / Video Links */}
          {(lesson.external_url || lesson.video_url) && (
            <div className="flex flex-wrap gap-3 rounded-xl border border-[#ece7dc] bg-[#faf8f4] p-4">
              {lesson.external_url && (
                <a
                  href={lesson.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8d1c5] bg-white px-3.5 py-2 text-xs font-bold text-[#2a4d3e] hover:bg-[#f2efe8]"
                >
                  🔗 เอกสารอ้างอิงเพิ่มเติม ↗
                </a>
              )}
              {lesson.video_url && (
                <a
                  href={lesson.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8d1c5] bg-white px-3.5 py-2 text-xs font-bold text-[#2a4d3e] hover:bg-[#f2efe8]"
                >
                  🎬 วิดีโอประกอบบทเรียน ↗
                </a>
              )}
            </div>
          )}

          {/* Quiz Section */}
          {Array.isArray(lesson.quiz_questions) &&
            lesson.quiz_questions.length > 0 && (
              <div className="rounded-2xl border border-[#d8d1c5] bg-[#faf8f4] p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1e1e1c] flex items-center gap-2">
                    <Icon name="award" className="h-4 w-4 text-[#2a4d3e]" />
                    <span>แบบทดสอบท้ายบทเรียน ({lesson.quiz_questions.length} ข้อ)</span>
                  </h2>
                  {quizScore !== null && (
                    <span className="rounded-lg bg-[#e8f0ec] px-3 py-1 text-xs font-bold text-[#2a4d3e]">
                      คะแนนล่าสุด: {quizScore}%
                    </span>
                  )}
                </div>

                {lesson.quiz_questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="rounded-xl border border-[#e5dfd3] bg-white p-4 space-y-2.5"
                  >
                    <p className="text-xs sm:text-sm font-bold text-[#1e1e1c]">
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
                                  ? "border-[#166534] bg-[#dcfce7] font-bold text-[#166534]"
                                  : isPicked
                                  ? "border-[#991b1b] bg-[#fef2f2] text-[#991b1b]"
                                  : "border-[#e5dfd3] bg-[#faf8f4] text-[#524f49]"
                                : isPicked
                                ? "border-[#2a4d3e] bg-[#e8f0ec] font-bold text-[#2a4d3e]"
                                : "border-[#e5dfd3] bg-[#faf8f4] hover:bg-[#f2efe8]"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {quizSubmitted && q.explanation && (
                      <p className="mt-2 rounded-lg bg-[#f8f6f0] p-2.5 text-xs text-[#524f49]">
                        💡 <strong>เฉลย:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="rounded-xl bg-[#2a4d3e] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1f3b2f] transition-colors cursor-pointer"
                >
                  ตรวจคำตอบและบันทึกผลเรียนจบ
                </button>
              </div>
            )}

          {/* Bottom Actions: Mark Completed & Next/Prev Lesson */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece7dc] pt-5">
            <div>
              {prevLesson ? (
                <Link
                  href={`/courses/${course.id}/lessons/${prevLesson.id}`}
                  className="rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-4 py-2.5 text-xs font-bold text-[#1e1e1c] hover:bg-[#f2efe8]"
                >
                  ← บทก่อนหน้า
                </Link>
              ) : (
                <Link
                  href={`/courses/${course.id}`}
                  className="rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-4 py-2.5 text-xs font-bold text-[#1e1e1c] hover:bg-[#f2efe8]"
                >
                  ← สารบัญคอร์ส
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => handleMarkCompleted()}
                  className="rounded-xl border border-[#2a4d3e] bg-[#e8f0ec] px-4 py-2.5 text-xs font-bold text-[#2a4d3e] hover:bg-[#d5e5dc] cursor-pointer"
                >
                  ✓ บันทึกว่าเรียนจบบทนี้แล้ว
                </button>
              )}

              {nextLesson && (
                <Link
                  href={`/courses/${course.id}/lessons/${nextLesson.id}`}
                  className="rounded-xl bg-[#2a4d3e] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1f3b2f]"
                >
                  บทเรียนถัดไป →
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LessonViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center text-sm font-bold text-[#524f49]">
          กำลังโหลดบทเรียน...
        </div>
      }
    >
      <LessonViewContent />
    </Suspense>
  );
}
