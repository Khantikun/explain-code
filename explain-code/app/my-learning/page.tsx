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
import {
  DungeonSaveRecord,
  loadUserDungeonSaves,
} from "../lib/dungeon-save";
import { LANGUAGE_TRACKS } from "../lib/language-tracks";

export default function MyLearningPage() {
  const router = useRouter();
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [dungeonSaves, setDungeonSaves] = useState<DungeonSaveRecord[]>([]);

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
    setDungeonSaves(loadUserDungeonSaves(current.userId));
  }, [router]);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0d0b14] p-8 text-center text-sm text-[#9a93ad]">
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
    <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3d395a] bg-[#1c1b2b] px-3 py-1 text-xs font-bold text-[#f6c945]">
              <Icon name="award" className="h-3.5 w-3.5" />
              แดชบอร์ดการเรียนรู้ของ {session.displayName || session.username}
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#f4efe6]">
              การเรียนของฉัน (My Learning)
            </h1>
            <p className="mt-1 text-sm text-[#9a93ad]">
              ติดตามความคืบหน้าของแต่ละคอร์ส ประวัติบทเรียนที่เรียนจบ และกดเรียนต่อจากจุดที่ค้างไว้ได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/courses"
              className="rounded-xl bg-[#2fbf71] px-4 py-2.5 text-xs font-extrabold text-[#0b0b14] shadow-md hover:bg-[#34d37d] transition-colors whitespace-nowrap"
            >
              + สำรวจคอร์สเรียนเพิ่ม
            </Link>
            <Link
              href="/my-history"
              className="rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-4 py-2.5 text-xs font-bold text-[#f4efe6] hover:border-[#f6c945] hover:bg-[#252238] transition-colors whitespace-nowrap"
            >
              ประวัติการอธิบายโค้ด
            </Link>
          </div>
        </div>

        {/* ==================== ความคืบหน้าดันเจี้ยนการเรียนรู้ ==================== */}
        {dungeonSaves.length > 0 && (
          <section className="mb-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-[#ffe27a] flex items-center gap-2">
                <Icon name="gamepad" className="h-5 w-5 text-[#9b5de5]" />
                <span>ความคืบหน้าดันเจี้ยนการเรียนรู้ (เซฟเกมล่าสุด)</span>
              </h2>
              <Link
                href="/courses"
                className="text-xs font-bold text-[#9a93ad] hover:text-[#ffe27a] transition-colors"
              >
                ไปหน้าดันเจี้ยนทั้งหมด →
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {dungeonSaves.map((save) => {
                const trackMeta =
                  LANGUAGE_TRACKS.find((tr) => tr.id === save.language) ||
                  LANGUAGE_TRACKS[0];
                const pct =
                  save.totalFloors > 0
                    ? Math.round(
                        (save.completedTopicIds.length / save.totalFloors) * 100
                      )
                    : 0;
                const savedTimeText = (() => {
                  try {
                    return new Date(save.savedAt).toLocaleString("th-TH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    });
                  } catch {
                    return "เมื่อสักครู่";
                  }
                })();

                return (
                  <div
                    key={save.language}
                    className="rounded-2xl border border-[#5a2d91] bg-gradient-to-br from-[#1c152e] to-[#141220] p-5 shadow-lg flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="rounded-full border border-[#9b5de5]/60 bg-[#25193b] px-3 py-0.5 text-[11px] font-extrabold text-[#e9d5ff]">
                          {trackMeta.name}
                        </span>
                        <span className="text-[11px] font-semibold text-[#9a93ad]">
                          💾 เซฟล่าสุด: {savedTimeText}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-[#f4efe6]">
                        ถึงด่านที่ {save.currentFloorNumber}/{save.totalFloors} ·{" "}
                        {save.currentTopicTitle}
                      </h3>
                      <p className="mt-1 text-xs text-[#c4bdd6]">
                        พิชิตแล้ว {save.completedTopicIds.length} จาก{" "}
                        {save.totalFloors} ด่าน · สะสม {save.xp} XP
                      </p>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span className="text-[#c4bdd6]">ความคืบหน้า</span>
                          <span className="text-[#2fbf71]">{pct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full border border-[#2f2d45] bg-[#0d0b14]">
                          <div
                            className="h-full rounded-full bg-[#2fbf71] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {save.history && save.history.length > 0 && (
                        <div className="mt-3 border-t border-[#2f2d45] pt-2.5 space-y-1">
                          <p className="text-[11px] font-bold text-[#9a93ad]">
                            ประวัติการเล่นล่าสุด:
                          </p>
                          {save.history.slice(0, 2).map((h, i) => (
                            <div
                              key={`${h.topicId}-${i}`}
                              className="flex items-center justify-between text-[11px] text-[#e8e1cf]"
                            >
                              <span className="truncate pr-2">{h.topicTitle}</span>
                              <span className="shrink-0 font-bold text-[#86efac]">
                                {h.scorePercent}% (+{h.xpEarned} XP)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/courses?lang=${save.language}&topicId=${save.currentTopicId}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f6c945] px-4 py-2.5 text-xs font-extrabold text-[#120f1c] shadow-md hover:bg-[#ffe27a] transition-colors"
                    >
                      <Icon name="play" className="h-4 w-4" filled />
                      <span>เล่นต่อจากที่เซฟไว้ →</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {myCourses.length === 0 && dungeonSaves.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3d395a] bg-[#141220] p-12 text-center shadow-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3d395a] bg-[#1c1b2b] text-[#f6c945]">
              <Icon name="book" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#f4efe6]">
              คุณยังไม่ได้เข้าร่วมคอร์สเรียนใดๆ
            </h2>
            <p className="mt-1 text-xs text-[#9a93ad]">
              เลือกคอร์สที่สนใจจากคลังคอร์สเปิด หรือกรอกรหัสห้องเรียนจากครูผู้สอนเพื่อเริ่มต้น
            </p>
            <Link
              href="/courses"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2fbf71] px-5 py-2.5 text-xs font-extrabold text-[#0b0b14] hover:bg-[#34d37d] whitespace-nowrap"
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
                  className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-6 shadow-lg"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="rounded-md border border-[#3d395a] bg-[#1c1b2b] px-2.5 py-0.5 text-[11px] font-bold text-[#f6c945]">
                          รหัส: {course.join_code}
                        </span>
                        <span className="text-xs text-[#9a93ad]">
                          ผู้สอน: {course.teacher_name}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-[#f4efe6]">
                        {course.title}
                      </h2>
                      <p className="mt-1 text-xs text-[#c4bdd6]">
                        {course.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dungeon/${course.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#9b5de5] bg-[#5a2d91] px-4 py-3 text-xs font-bold text-[#ffe27a] hover:bg-[#6d3fc0] transition-colors whitespace-nowrap"
                      >
                        <Icon name="gamepad" className="h-4 w-4 shrink-0" />
                        <span>เล่นโหมดดันเจี้ยน</span>
                      </Link>

                      {resumeLesson && (
                        <Link
                          href={`/courses/${course.id}/lessons/${resumeLesson.id}`}
                          className="inline-flex max-w-full items-center gap-2 rounded-xl bg-[#2fbf71] px-5 py-3 text-xs font-extrabold text-[#0b0b14] shadow-md hover:bg-[#34d37d] transition-colors"
                        >
                          <Icon name="play" className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            เรียนต่อจากที่ค้างไว้: {resumeLesson.title}
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-[#e8e1cf]">
                        ความคืบหน้า: เรียนจบแล้ว {completedSet.size} จาก{" "}
                        {cLessons.length} บทเรียน
                      </span>
                      <span className="text-[#2fbf71]">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full border border-[#2f2d45] bg-[#1c1b2b]">
                      <div
                        className="h-full rounded-full bg-[#2fbf71] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Lesson History Table */}
                  <div className="mt-5 border-t border-[#2f2d45] pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#9a93ad] mb-2.5">
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
                            className="flex items-center justify-between rounded-xl border border-[#2f2d45] bg-[#1c1b2b] px-3.5 py-2.5 text-xs hover:border-[#9b5de5] transition-colors"
                          >
                            <div className="truncate pr-2">
                              <p className="font-bold text-[#f4efe6] truncate">
                                {lesson.title}
                              </p>
                              <p className="text-[10px] text-[#9a93ad]">
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
                              className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                                prog?.is_completed
                                  ? "border-[#2fbf71]/40 bg-[#102a1e] text-[#86efac]"
                                  : prog
                                  ? "border-[#f6c945]/40 bg-[#281d08] text-[#ffe27a]"
                                  : "border-[#3d395a] bg-[#252238] text-[#9a93ad]"
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
