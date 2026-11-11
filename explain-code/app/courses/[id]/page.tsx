"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
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
import { PixelSpriteView } from "../../components/dungeon/PixelSpriteView";
import { getMonsterDef } from "../../lib/dungeon/monsters";
import { generateDungeonRoom } from "../../lib/dungeon/mapgen";
import { hashString, dungeonNameForCourse } from "../../lib/dungeon/seed";

function CourseDetailContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params?.id || "");

  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [viewMode, setViewMode] = useState<"curriculum" | "dungeon">("curriculum");

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

            <Link
              href={`/dungeon/${course.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#9b5de5] bg-[#322c4a] px-4 py-3 text-xs sm:text-sm font-bold text-[#ffe27a] hover:bg-[#433c61] transition-colors"
            >
              <Icon name="gamepad" className="h-4 w-4" />
              <span>ผจญภัยในโหมดดันเจี้ยน</span>
            </Link>

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

        {/* View Mode Switcher Tabs */}
        <div className="mb-4 flex items-center gap-2 border-b border-[#e5dfd3] pb-1">
          <button
            type="button"
            onClick={() => setViewMode("curriculum")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === "curriculum"
                ? "border-[#2a4d3e] text-[#2a4d3e]"
                : "border-transparent text-[#6e6a63] hover:text-[#1e1e1c]"
            }`}
          >
            <Icon name="book" size={15} />
            <span>สารบัญบทเรียนปกติ ({lessons.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("dungeon")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === "dungeon"
                ? "border-[#9b5de5] text-[#5a2d91]"
                : "border-transparent text-[#6e6a63] hover:text-[#1e1e1c]"
            }`}
          >
            <Icon name="gamepad" size={15} />
            <span>แผนที่ผจญภัยดันเจี้ยน ({lessons.length} ชั้น)</span>
          </button>
        </div>

        {viewMode === "curriculum" ? (
          /* Lessons List (Curriculum View) */
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
                  const roomSeed = hashString(course.id);
                  const room = generateDungeonRoom(roomSeed, idx, Math.max(1, lessons.length));
                  const monster = getMonsterDef(room.entity?.monsterType || (idx >= lessons.length - 1 ? "boss" : "slime"));

                  return (
                    <div
                      key={lesson.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border border-[#e5dfd3] bg-[#faf8f4] p-4 hover:border-[#2a4d3e] hover:bg-white transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
                            isDone
                              ? "bg-[#166534] text-white"
                              : "bg-[#e8f0ec] text-[#2a4d3e]"
                          }`}
                        >
                          {isDone ? "✓" : idx + 1}
                        </div>

                        {/* Monster Mini Sprite Preview */}
                        <div className="p-1 rounded-lg bg-[#1c1b2b] border border-[#4a4766] shrink-0 hidden sm:flex items-center justify-center" title={`มอนสเตอร์ประจำบท: ${monster.name}`}>
                          <PixelSpriteView sprite={monster.sprite} size={24} />
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-[#1e1e1c]">
                            {lesson.title}
                          </h3>
                          <p className="text-[11px] text-[#6e6a63] flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>ภาษา {lesson.programming_language.toUpperCase()}</span>
                            <span>•</span>
                            <span>มอนสเตอร์: {monster.name}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <Link
                          href={`/courses/${course.id}/lessons/${lesson.id}?mode=dungeon`}
                          className="px-3 py-1.5 rounded-lg border border-[#9b5de5] bg-[#322c4a] text-xs font-bold text-[#ffe27a] hover:bg-[#433c61] flex items-center gap-1 transition-colors"
                          title="ลุยห้องดันเจี้ยนของบทนี้"
                        >
                          <Icon name="gamepad" size={13} />
                          <span>ลุยดันเจี้ยน</span>
                        </Link>
                        <Link
                          href={`/courses/${course.id}/lessons/${lesson.id}`}
                          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                            isDone
                              ? "bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]"
                              : "bg-[#2a4d3e] text-white hover:bg-[#1f3b2f]"
                          }`}
                        >
                          {isDone ? "ทบทวนบทเรียน" : "เข้าเรียน →"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Dungeon Adventure Map View */
          <div className="rounded-2xl border-2 border-[#4a4766] bg-[#120f1c] p-6 text-[#f4efe6] shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#2f2d45] pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="pixel-font text-[10px] text-[#ffe27a] bg-[#5a2d91] px-2 py-0.5 rounded font-bold">
                    SEED #{(hashString(course.id) >>> 0).toString(16).toUpperCase()}
                  </span>
                  <span className="pixel-font text-[10px] text-[#2fbf71]">
                    {lessons.length} FLOORS
                  </span>
                </div>
                <h2 className="text-xl font-black text-[#f6c945]">
                  {dungeonNameForCourse(course.id)}
                </h2>
                <p className="text-xs text-[#9a93ad]">
                  พิชิตมอนสเตอร์ในแต่ละชั้นเพื่อบันทึกผลการเรียนจบบทเรียนแบบสองทาง
                </p>
              </div>

              <Link
                href={`/dungeon/${course.id}`}
                className="retro-button px-4 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#0b0b14] text-xs font-black pixel-font flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <span>ลุยทั้งคอร์สแบบต่อเนื่อง →</span>
              </Link>
            </div>

            {/* Floors Progression */}
            <div className="space-y-3">
              {lessons.map((lesson, idx) => {
                const isDone = completedLessonIds.has(lesson.id);
                const isBoss = idx >= lessons.length - 1;
                const roomSeed = hashString(course.id);
                const room = generateDungeonRoom(roomSeed, idx, Math.max(1, lessons.length));
                const monster = getMonsterDef(room.entity?.monsterType || (isBoss ? "boss" : "slime"));

                return (
                  <div
                    key={lesson.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      isDone
                        ? "border-[#2fbf71]/50 bg-[#1a7a4a]/15 text-[#f4efe6]"
                        : "border-[#4a4766] bg-[#1c1b2b] text-[#f4efe6] hover:border-[#9b5de5]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-2 rounded-xl bg-[#120f1c] border border-[#4a4766] flex items-center justify-center shrink-0">
                        <PixelSpriteView sprite={monster.sprite} size={36} animateBounce={!isDone} />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="pixel-font text-[10px] text-[#ffe27a]">
                            ชั้นที่ {idx + 1}
                          </span>
                          {isBoss && (
                            <span className="pixel-font text-[9px] bg-[#5a2d91] text-[#ffe27a] px-1.5 py-0.2 rounded font-black">
                              FINAL BOSS
                            </span>
                          )}
                          {isDone ? (
                            <span className="text-[10px] bg-[#2fbf71]/20 text-[#2fbf71] px-2 py-0.2 rounded font-bold border border-[#2fbf71]/40">
                              ✓ พิชิตแล้ว
                            </span>
                          ) : (
                            <span className="text-[10px] bg-[#ffe27a]/20 text-[#ffe27a] px-2 py-0.2 rounded font-bold border border-[#ffe27a]/40">
                              พร้อมท้าทาย
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-[#f4efe6]">
                          {lesson.title}
                        </h3>

                        <p className="text-[11px] text-[#9a93ad]">
                          มอนสเตอร์: <strong className="text-[#f6c945]">{monster.name}</strong> (HP {monster.maxHp}) · รางวัล: +{monster.xpReward} XP, +{monster.coinReward} G
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <Link
                        href={`/courses/${course.id}/lessons/${lesson.id}?mode=dungeon`}
                        className="retro-button px-4 py-2 rounded-xl bg-[#9b5de5] hover:bg-[#b07af0] text-[#f4efe6] text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Icon name="gamepad" size={13} />
                        <span>เข้าเล่นชั้นนี้</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center text-sm font-bold text-[#524f49]">
          กำลังโหลดรายละเอียดคอร์ส...
        </div>
      }
    >
      <CourseDetailContent />
    </Suspense>
  );
}
