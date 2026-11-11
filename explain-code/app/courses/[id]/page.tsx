"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  SiteHeader,
  getClientSession,
  ClientAuthSession,
} from "../../components/SiteHeader";
import { Icon } from "../../components/Icons";
import { Course, Enrollment, Lesson, LessonProgress } from "../../lib/supabase";
import {
  loadLocalCourses,
  loadLocalEnrollments,
  loadLocalLessonProgress,
  loadLocalLessons,
  saveLocalEnrollments,
} from "../../lib/lms-data";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params?.id || "");

  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);

  useEffect(() => {
    const current = getClientSession();
    setSession(current);

    const allCourses = loadLocalCourses();
    const found = allCourses.find((c) => c.id === courseId) || null;
    setCourse(found);

    const allLessons = loadLocalLessons()
      .filter((l) => l.course_id === courseId && l.is_published)
      .sort((a, b) => a.order_index - b.order_index);
    setLessons(allLessons);

    setEnrollments(loadLocalEnrollments());
    setProgress(loadLocalLessonProgress());
  }, [courseId]);

  if (!course) {
    return (
      <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c]">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-4 py-12 text-center">
          <h1 className="text-xl font-bold">ไม่พบคอร์สที่คุณต้องการ</h1>
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

  const userEnrollment = session
    ? enrollments.find(
        (e) => e.course_id === course.id && e.student_id === session.userId
      )
    : null;

  const completedLessonIds = new Set(
    progress
      .filter(
        (p) =>
          p.course_id === course.id &&
          session &&
          p.student_id === session.userId &&
          p.is_completed
      )
      .map((p) => p.lesson_id)
  );

  const handleStartOrContinue = async () => {
    const targetLesson =
      lessons.find((l) => l.id === userEnrollment?.last_accessed_lesson_id) ||
      lessons.find((l) => !completedLessonIds.has(l.id)) ||
      lessons[0];

    if (!targetLesson) return;

    if (session && !userEnrollment) {
      const newEnroll: Enrollment = {
        id: `enr-${Date.now()}`,
        course_id: course.id,
        student_id: session.userId,
        enrolled_at: new Date().toISOString(),
        last_accessed_lesson_id: targetLesson.id,
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
            lastAccessedLessonId: targetLesson.id,
          }),
        });
      } catch {
        // ignore
      }
    }

    router.push(`/courses/${course.id}/lessons/${targetLesson.id}`);
  };

  const progressPercent =
    lessons.length > 0
      ? Math.round((completedLessonIds.size / lessons.length) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c]">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-4">
          <Link
            href="/courses"
            className="text-xs font-semibold text-[#6e6a63] hover:text-[#1e1e1c]"
          >
            ← กลับไปหน้ารายการคอร์สทั้งหมด
          </Link>
        </div>

        {/* Course Header Card */}
        <div className="rounded-2xl border border-[#e5dfd3] bg-white p-6 sm:p-8 shadow-xs mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-lg bg-[#e8f0ec] px-3 py-1 text-xs font-bold text-[#2a4d3e]">
              รหัสคอร์ส: {course.join_code}
            </span>
            <span className="text-xs font-medium text-[#6e6a63]">
              ผู้สอน: <strong className="text-[#1e1e1c]">{course.teacher_name}</strong>
            </span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-[#1e1e1c]">
            {course.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#524f49]">
            {course.description}
          </p>

          {session && (
            <div className="mt-5 rounded-xl bg-[#faf8f4] p-4 border border-[#ece7dc]">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span>ความคืบหน้าของคุณในคอร์สนี้</span>
                <span className="text-[#2a4d3e]">
                  {completedLessonIds.size}/{lessons.length} บทเรียน ({progressPercent}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e5dfd3]">
                <div
                  className="h-full rounded-full bg-[#2a4d3e] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {lessons.length > 0 && (
              <button
                type="button"
                onClick={handleStartOrContinue}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2a4d3e] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f3b2f] transition-colors cursor-pointer"
              >
                <Icon name="play" className="h-4 w-4" />
                <span>
                  {userEnrollment
                    ? "เรียนต่อจากที่ค้างไว้"
                    : "เริ่มเรียนบทที่ 1 ทันที"}
                </span>
              </button>
            )}
            {!session && (
              <Link
                href={`/login?redirect=${encodeURIComponent(`/courses/${course.id}`)}`}
                className="rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-4 py-3 text-xs font-bold text-[#2a4d3e] hover:bg-[#f2efe8]"
              >
                เข้าสู่ระบบเพื่อบันทึกความคืบหน้า
              </Link>
            )}
          </div>
        </div>

        {/* Lessons List */}
        <div className="rounded-2xl border border-[#e5dfd3] bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-[#1e1e1c] mb-4">
            สารบัญบทเรียน ({lessons.length} บทเรียน)
          </h2>

          {lessons.length === 0 ? (
            <p className="text-xs text-[#6e6a63]">
              ยังไม่มีบทเรียนที่เผยแพร่ในคอร์สนี้
            </p>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, idx) => {
                const isDone = completedLessonIds.has(lesson.id);
                return (
                  <Link
                    key={lesson.id}
                    href={`/courses/${course.id}/lessons/${lesson.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-[#e5dfd3] bg-[#faf8f4] p-4 hover:border-[#2a4d3e] hover:bg-white transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                          isDone
                            ? "bg-[#166534] text-white"
                            : "bg-[#e8f0ec] text-[#2a4d3e]"
                        }`}
                      >
                        {isDone ? "✓" : idx + 1}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#1e1e1c]">
                          {lesson.title}
                        </h3>
                        <p className="text-[11px] text-[#6e6a63]">
                          ภาษา {lesson.programming_language.toUpperCase()} •{" "}
                          {lesson.quiz_questions?.length || 0} คำถามท้ายบท
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${
                        isDone
                          ? "bg-[#dcfce7] text-[#166534]"
                          : "bg-[#e8f0ec] text-[#2a4d3e]"
                      }`}
                    >
                      {isDone ? "เรียนจบแล้ว" : "เข้าเรียน →"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
