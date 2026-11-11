"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SiteHeader,
  getClientSession,
  ClientAuthSession,
} from "../components/SiteHeader";
import { Icon } from "../components/Icons";
import { Course, Enrollment, Lesson } from "../lib/supabase";
import {
  loadLocalCourses,
  loadLocalEnrollments,
  loadLocalLessons,
  saveLocalCourses,
  saveLocalEnrollments,
  saveLocalLessons,
} from "../lib/lms-data";

export default function CoursesPage() {
  const router = useRouter();
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinMsg, setJoinMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    const current = getClientSession();
    setSession(current);

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

    syncFromServer();
  }, []);

  const publishedCourses = courses.filter((c) => c.is_published);

  const handleEnrollCourse = async (course: Course) => {
    if (!session) {
      router.push(`/login?redirect=${encodeURIComponent(`/courses/${course.id}`)}`);
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
    <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Top Banner & Join by Code */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12 items-center rounded-2xl border border-[#e5dfd3] bg-white p-6 sm:p-8 shadow-xs">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0ec] px-3 py-1 text-xs font-bold text-[#2a4d3e]">
              <Icon name="book" className="h-3.5 w-3.5" />
              คลังคอร์สเรียนระบบเปิด (Open Courses)
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#1e1e1c]">
              คอร์สและบทเรียนทั้งหมด
            </h1>
            <p className="mt-1 text-sm text-[#524f49]">
              เลือกเรียนคอร์สที่เผยแพร่แล้วได้ทันที หรือใส่รหัสห้องเรียนจากครูผู้สอนเพื่อเข้าร่วมและบันทึกความคืบหน้าของคุณ
            </p>
            {session?.role === "student" && (
              <div className="mt-4">
                <Link
                  href="/my-learning"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#e8f0ec] px-4 py-2 text-xs font-bold text-[#2a4d3e] hover:bg-[#d5e5dc] transition-colors"
                >
                  <Icon name="award" className="h-4 w-4" />
                  <span>ไปที่หน้า &ldquo;การเรียนของฉัน&rdquo; (ดูความคืบหน้า &amp; เรียนต่อ) →</span>
                </Link>
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <form
              onSubmit={handleJoinByCode}
              className="rounded-xl border border-[#e5dfd3] bg-[#faf8f4] p-4"
            >
              <label className="block text-xs font-bold text-[#1e1e1c] mb-1.5">
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
                  className="flex-1 rounded-xl border border-[#d8d1c5] bg-white px-3.5 py-2 text-xs font-mono uppercase text-[#1e1e1c] focus:border-[#2a4d3e] focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#2a4d3e] px-4 py-2 text-xs font-bold text-white hover:bg-[#1f3b2f] transition-colors cursor-pointer"
                >
                  เข้าร่วมคอร์ส
                </button>
              </div>
              {joinMsg && (
                <p
                  className={`mt-2 text-xs font-medium ${
                    joinMsg.type === "error"
                      ? "text-[#991b1b]"
                      : "text-[#166534]"
                  }`}
                >
                  {joinMsg.text}
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                className="flex flex-col justify-between rounded-2xl border border-[#e5dfd3] bg-white p-6 shadow-xs transition-all hover:border-[#2a4d3e]"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="rounded-lg bg-[#e8f0ec] px-2.5 py-1 text-[11px] font-bold text-[#2a4d3e]">
                      {course.level === "beginner"
                        ? "ระดับเริ่มต้น (Beginner)"
                        : course.level === "intermediate"
                        ? "ระดับกลาง (Intermediate)"
                        : "ระดับสูง (Advanced)"}
                    </span>
                    <span className="rounded-lg border border-[#d8d1c5] bg-[#faf8f4] px-2.5 py-1 font-mono text-[11px] font-bold text-[#524f49]">
                      รหัสคอร์ส: {course.join_code}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-[#1e1e1c]">
                    {course.title}
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#524f49]">
                    {course.description}
                  </p>
                </div>

                <div className="mt-6 border-t border-[#ece7dc] pt-4">
                  <div className="flex items-center justify-between text-xs text-[#6e6a63] mb-4">
                    <span>ผู้สอน: {course.teacher_name || "ครูผู้สอน"}</span>
                    <span className="font-bold text-[#1e1e1c]">
                      {courseLessons.length} บทเรียน
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/courses/${course.id}`}
                      className="flex-1 rounded-xl border border-[#d8d1c5] bg-[#faf8f4] py-2.5 text-center text-xs font-bold text-[#1e1e1c] hover:bg-[#f2efe8] transition-colors"
                    >
                      ดูรายละเอียดบทเรียน
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleEnrollCourse(course)}
                      className="flex-1 rounded-xl bg-[#2a4d3e] py-2.5 text-center text-xs font-bold text-white hover:bg-[#1f3b2f] transition-colors cursor-pointer"
                    >
                      {isEnrolled ? "เข้าเรียนต่อ →" : "เข้าร่วมคอร์สนี้"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
