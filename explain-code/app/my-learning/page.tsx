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
import { Course, Enrollment, Lesson, LessonProgress } from "../lib/supabase";
import {
  loadLocalCourses,
  loadLocalEnrollments,
  loadLocalLessonProgress,
  loadLocalLessons,
} from "../lib/lms-data";

export default function MyLearningPage() {
  const router = useRouter();
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);

  useEffect(() => {
    const current = getClientSession();
    if (!current) {
      router.replace("/login?redirect=/my-learning");
      return;
    }
    setSession(current);
    setCourses(loadLocalCourses());
    setLessons(loadLocalLessons());
    setEnrollments(loadLocalEnrollments());
    setProgress(loadLocalLessonProgress());
  }, [router]);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#faf8f4] p-8 text-center text-sm text-[#6e6a63]">
        กำลังตรวจสอบสิทธิ์การใช้งาน...
      </div>
    );
  }

  const myEnrollments = enrollments.filter(
    (e) => e.student_id === session.userId
  );
  const myProgress = progress.filter((p) => p.student_id === session.userId);

  // รวมคอร์สที่ลงทะเบียนแล้ว หรือมีประวัติการเปิดดูบทเรียน
  const activeCourseIds = new Set([
    ...myEnrollments.map((e) => e.course_id),
    ...myProgress.map((p) => p.course_id),
  ]);

  const myCourses = courses.filter((c) => activeCourseIds.has(c.id));

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0ec] px-3 py-1 text-xs font-bold text-[#2a4d3e]">
              <Icon name="award" className="h-3.5 w-3.5" />
              แดชบอร์ดการเรียนรู้ของ {session.displayName || session.username}
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#1e1e1c]">
              การเรียนของฉัน (My Learning)
            </h1>
            <p className="mt-1 text-sm text-[#524f49]">
              ติดตามความคืบหน้าของแต่ละคอร์ส ประวัติบทเรียนที่เรียนจบ และกดเรียนต่อจากจุดที่ค้างไว้ได้ทันที
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/courses"
              className="rounded-xl bg-[#2a4d3e] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1f3b2f]"
            >
              + สำรวจคอร์สเรียนเพิ่ม
            </Link>
            <Link
              href="/my-history"
              className="rounded-xl border border-[#d8d1c5] bg-white px-4 py-2.5 text-xs font-bold text-[#1e1e1c] hover:bg-[#f2efe8]"
            >
              ประวัติการอธิบายโค้ด
            </Link>
          </div>
        </div>

        {myCourses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8d1c5] bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f0ec] text-[#2a4d3e]">
              <Icon name="book" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#1e1e1c]">
              คุณยังไม่ได้เข้าร่วมคอร์สเรียนใดๆ
            </h2>
            <p className="mt-1 text-xs text-[#6e6a63]">
              เลือกคอร์สที่สนใจจากคลังคอร์สเปิด หรือกรอกรหัสห้องเรียนจากครูผู้สอนเพื่อเริ่มต้น
            </p>
            <Link
              href="/courses"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2a4d3e] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1f3b2f]"
            >
              ดูคอร์สเรียนที่เปิดสอน →
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {myCourses.map((course) => {
              const cLessons = lessons
                .filter((l) => l.course_id === course.id && l.is_published)
                .sort((a, b) => a.order_index - b.order_index);

              const cProgress = myProgress.filter(
                (p) => p.course_id === course.id
              );
              const completedSet = new Set(
                cProgress.filter((p) => p.is_completed).map((p) => p.lesson_id)
              );

              const pct =
                cLessons.length > 0
                  ? Math.round((completedSet.size / cLessons.length) * 100)
                  : 0;

              const enroll = myEnrollments.find(
                (e) => e.course_id === course.id
              );
              const resumeLesson =
                cLessons.find(
                  (l) => l.id === enroll?.last_accessed_lesson_id
                ) ||
                cLessons.find((l) => !completedSet.has(l.id)) ||
                cLessons[0];

              return (
                <div
                  key={course.id}
                  className="rounded-2xl border border-[#e5dfd3] bg-white p-6 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="rounded-md bg-[#e8f0ec] px-2.5 py-0.5 text-[11px] font-bold text-[#2a4d3e]">
                          รหัส: {course.join_code}
                        </span>
                        <span className="text-xs text-[#6e6a63]">
                          ผู้สอน: {course.teacher_name}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-[#1e1e1c]">
                        {course.title}
                      </h2>
                      <p className="mt-1 text-xs text-[#524f49]">
                        {course.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dungeon/${course.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#9b5de5] bg-[#322c4a] px-4 py-3 text-xs font-bold text-[#ffe27a] hover:bg-[#433c61] transition-colors"
                      >
                        <Icon name="gamepad" className="h-4 w-4" />
                        <span>เล่นโหมดดันเจี้ยน</span>
                      </Link>

                      {resumeLesson && (
                        <Link
                          href={`/courses/${course.id}/lessons/${resumeLesson.id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#2a4d3e] px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#1f3b2f]"
                        >
                          <Icon name="play" className="h-4 w-4" />
                          <span>เรียนต่อจากที่ค้างไว้: {resumeLesson.title}</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span>
                        ความคืบหน้า: เรียนจบแล้ว {completedSet.size} จาก{" "}
                        {cLessons.length} บทเรียน
                      </span>
                      <span className="text-[#2a4d3e]">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e5dfd3]">
                      <div
                        className="h-full rounded-full bg-[#2a4d3e] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Lesson History Table */}
                  <div className="mt-5 border-t border-[#ece7dc] pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#6e6a63] mb-2.5">
                      ประวัติการเข้าเรียนรายบท
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {cLessons.map((lesson) => {
                        const prog = cProgress.find(
                          (p) => p.lesson_id === lesson.id
                        );
                        return (
                          <Link
                            key={lesson.id}
                            href={`/courses/${course.id}/lessons/${lesson.id}`}
                            className="flex items-center justify-between rounded-xl border border-[#ece7dc] bg-[#faf8f4] px-3.5 py-2.5 text-xs hover:border-[#2a4d3e]"
                          >
                            <div className="truncate pr-2">
                              <p className="font-bold text-[#1e1e1c] truncate">
                                {lesson.title}
                              </p>
                              <p className="text-[10px] text-[#6e6a63]">
                                {prog?.completed_at
                                  ? `จบเมื่อ ${new Date(
                                      prog.completed_at
                                    ).toLocaleDateString("th-TH")}`
                                  : prog?.opened_at
                                  ? `เปิดดูล่าสุด ${new Date(
                                      prog.opened_at
                                    ).toLocaleDateString("th-TH")}`
                                  : "ยังไม่ได้เปิดเรียน"}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                prog?.is_completed
                                  ? "bg-[#dcfce7] text-[#166534]"
                                  : prog
                                  ? "bg-[#fef9c3] text-[#854d0e]"
                                  : "bg-[#e5dfd3] text-[#524f49]"
                              }`}
                            >
                              {prog?.is_completed
                                ? "เรียนจบ"
                                : prog
                                ? "กำลังเรียน"
                                : "รอเรียน"}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
