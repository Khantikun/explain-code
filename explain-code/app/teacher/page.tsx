"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  SiteHeader,
  getClientSession,
  setClientSession,
  ClientAuthSession,
} from "../components/SiteHeader";
import { Icon } from "../components/Icons";
import {
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
  QuizQuestionItem,
} from "../lib/supabase";
import {
  loadLocalCourses,
  loadLocalEnrollments,
  loadLocalLessonProgress,
  loadLocalLessons,
  saveLocalCourses,
  saveLocalLessons,
} from "../lib/lms-data";

export default function TeacherLMSDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"lessons" | "students">("lessons");

  // Teacher Approval State
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [approvalMsg, setApprovalMsg] = useState<string>("");

  // Course Modal / Form State
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(
    null
  );

  // Lesson Modal / Form State
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(
    null
  );
  const [quizQuestionText, setQuizQuestionText] = useState("");
  const [quizOptionsText, setQuizOptionsText] = useState("");
  const [quizCorrectIdx, setQuizCorrectIdx] = useState(0);
  const [quizExplanation, setQuizExplanation] = useState("");

  useEffect(() => {
    const current = getClientSession();
    if (!current) {
      router.replace("/login?role=teacher&redirect=/teacher");
      return;
    }
    if (current.role !== "teacher" && current.role !== "admin") {
      router.replace("/");
      return;
    }
    setSession(current);

    const localCourses = loadLocalCourses();
    const localLessons = loadLocalLessons();
    setCourses(localCourses);
    setLessons(localLessons);
    setEnrollments(loadLocalEnrollments());
    setProgress(loadLocalLessonProgress());

    const owned = localCourses.filter((c) =>
      isOwnerOfCourse(c, current)
    );
    if (owned.length > 0) {
      setSelectedCourseId(owned[0].id);
    }
  }, [router]);

  function isOwnerOfCourse(course: Course, user: ClientAuthSession | null) {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (course.teacher_id === user.userId) return true;
    // รองรับบัญชีครูสมชายตัวอย่างกับคอร์สเริ่มต้น
    if (
      course.teacher_id === "tch-1" &&
      (user.username.includes("สมชาย") || user.userId === "tch-1")
    ) {
      return true;
    }
    return false;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#faf8f4] p-8 text-center text-sm text-[#6e6a63]">
        กำลังโหลดแดชบอร์ดครู...
      </div>
    );
  }

  const isApproved =
    session.role === "admin" || session.teacherStatus !== "pending";

  const myCourses = courses.filter((c) => isOwnerOfCourse(c, session));
  const selectedCourse =
    myCourses.find((c) => c.id === selectedCourseId) || myCourses[0] || null;

  const selectedCourseLessons = selectedCourse
    ? lessons
        .filter((l) => l.course_id === selectedCourse.id)
        .sort((a, b) => a.order_index - b.order_index)
    : [];

  const handleVerifyInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setApprovalMsg("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve-teacher",
          inviteCode: inviteCodeInput.trim(),
          teacherId: session.userId,
          username: session.username,
          displayName: session.displayName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApprovalMsg(data.error || "รหัสเชิญไม่ถูกต้อง");
        return;
      }
      const updatedSession: ClientAuthSession = {
        ...session,
        teacherStatus: "approved",
      };
      setClientSession(updatedSession);
      setSession(updatedSession);
      setApprovalMsg("อนุมัติบัญชีครูสำเร็จ! คุณสามารถสร้างและจัดการคอร์สได้ทันที");
    } catch {
      setApprovalMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  // ==================== Course CRUD ====================
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !editingCourse.title?.trim() || !isApproved) return;

    const nowIso = new Date().toISOString();
    const isNew = !editingCourse.id;
    const joinCode =
      editingCourse.join_code?.trim().toUpperCase() ||
      Math.random().toString(36).substring(2, 8).toUpperCase();

    const courseObj: Course = {
      id: editingCourse.id || `course-${Date.now()}`,
      teacher_id: session.userId,
      teacher_name: session.displayName || session.username,
      title: editingCourse.title.trim(),
      description: (editingCourse.description || "").trim(),
      join_code: joinCode,
      level: editingCourse.level || "beginner",
      is_published: Boolean(editingCourse.is_published),
      created_at: editingCourse.created_at || nowIso,
      updated_at: nowIso,
    };

    const updated = isNew
      ? [courseObj, ...courses]
      : courses.map((c) => (c.id === courseObj.id ? courseObj : c));

    setCourses(updated);
    saveLocalCourses(updated);
    setSelectedCourseId(courseObj.id);
    setEditingCourse(null);

    try {
      await fetch("/api/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert-course",
          course: courseObj,
          role: session.role,
          teacherStatus: session.teacherStatus,
        }),
      });
    } catch {
      // ignore
    }
  };

  const handleTogglePublishCourse = async (course: Course) => {
    if (!isApproved) return;
    const updatedCourse: Course = {
      ...course,
      is_published: !course.is_published,
      updated_at: new Date().toISOString(),
    };
    const updated = courses.map((c) =>
      c.id === course.id ? updatedCourse : c
    );
    setCourses(updated);
    saveLocalCourses(updated);

    try {
      await fetch("/api/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert-course",
          course: updatedCourse,
          role: session.role,
          teacherStatus: session.teacherStatus,
        }),
      });
    } catch {
      // ignore
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!isApproved) return;
    const remaining = courses.filter((c) => c.id !== courseId);
    const remainingLessons = lessons.filter((l) => l.course_id !== courseId);
    setCourses(remaining);
    setLessons(remainingLessons);
    saveLocalCourses(remaining);
    saveLocalLessons(remainingLessons);

    if (selectedCourseId === courseId) {
      const nextOwned = remaining.filter((c) => isOwnerOfCourse(c, session));
      setSelectedCourseId(nextOwned[0]?.id || "");
    }

    try {
      await fetch("/api/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-course",
          courseId,
          teacherId: session.userId,
        }),
      });
    } catch {
      // ignore
    }
  };

  // ==================== Lesson CRUD & Reorder ====================
  const openNewLessonModal = () => {
    if (!selectedCourse) return;
    setEditingLesson({
      course_id: selectedCourse.id,
      title: "",
      content_md: "",
      code_example: "",
      programming_language: "javascript",
      external_url: "",
      video_url: "",
      quiz_questions: [],
      order_index: selectedCourseLessons.length + 1,
      is_published: true,
    });
    setQuizQuestionText("");
    setQuizOptionsText("");
    setQuizCorrectIdx(0);
    setQuizExplanation("");
  };

  const handleAddQuizItem = () => {
    if (!editingLesson || !quizQuestionText.trim()) return;
    const opts = quizOptionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (opts.length < 2) return;

    const newItem: QuizQuestionItem = {
      id: `q-${Date.now()}`,
      question: quizQuestionText.trim(),
      options: opts,
      correctIndex: Math.min(opts.length - 1, Math.max(0, quizCorrectIdx)),
      explanation: quizExplanation.trim() || undefined,
    };

    setEditingLesson({
      ...editingLesson,
      quiz_questions: [...(editingLesson.quiz_questions || []), newItem],
    });
    setQuizQuestionText("");
    setQuizOptionsText("");
    setQuizCorrectIdx(0);
    setQuizExplanation("");
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !editingLesson.title?.trim() || !selectedCourse) {
      return;
    }

    const nowIso = new Date().toISOString();
    const isNew = !editingLesson.id;
    const lessonObj: Lesson = {
      id: editingLesson.id || `lesson-${Date.now()}`,
      course_id: selectedCourse.id,
      title: editingLesson.title.trim(),
      content_md: editingLesson.content_md || "",
      code_example: editingLesson.code_example || "",
      programming_language: editingLesson.programming_language || "javascript",
      external_url: editingLesson.external_url?.trim() || null,
      video_url: editingLesson.video_url?.trim() || null,
      quiz_questions: editingLesson.quiz_questions || [],
      order_index: Number(
        editingLesson.order_index || selectedCourseLessons.length + 1
      ),
      is_published:
        editingLesson.is_published !== undefined
          ? Boolean(editingLesson.is_published)
          : true,
      created_at: editingLesson.created_at || nowIso,
      updated_at: nowIso,
    };

    const updated = isNew
      ? [...lessons, lessonObj]
      : lessons.map((l) => (l.id === lessonObj.id ? lessonObj : l));

    setLessons(updated);
    saveLocalLessons(updated);
    setEditingLesson(null);

    try {
      await fetch("/api/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert-lesson",
          lesson: lessonObj,
        }),
      });
    } catch {
      // ignore
    }
  };

  const handleMoveLesson = (lessonId: string, direction: "up" | "down") => {
    const idx = selectedCourseLessons.findIndex((l) => l.id === lessonId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= selectedCourseLessons.length) return;

    const reordered = [...selectedCourseLessons];
    const temp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const reindexedMap = new Map<string, number>();
    reordered.forEach((item, i) => reindexedMap.set(item.id, i + 1));

    const updatedAll = lessons.map((l) =>
      reindexedMap.has(l.id) ? { ...l, order_index: reindexedMap.get(l.id)! } : l
    );
    setLessons(updatedAll);
    saveLocalLessons(updatedAll);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const updated = lessons.filter((l) => l.id !== lessonId);
    setLessons(updated);
    saveLocalLessons(updated);

    try {
      await fetch("/api/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-lesson", lessonId }),
      });
    } catch {
      // ignore
    }
  };

  // นักเรียนที่ลงทะเบียนหรือมี progress ในคอร์สที่เลือก
  const courseStudentIds = Array.from(
    new Set([
      ...enrollments
        .filter((e) => e.course_id === selectedCourse?.id)
        .map((e) => e.student_id),
      ...progress
        .filter((p) => p.course_id === selectedCourse?.id)
        .map((p) => p.student_id),
    ])
  );

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Top Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0ec] px-3 py-1 text-xs font-bold text-[#2a4d3e]">
              <Icon name="users" className="h-3.5 w-3.5" />
              ระบบจัดการคอร์สและบทเรียนสำหรับครูผู้สอน
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#1e1e1c]">
              แดชบอร์ดครูผู้สอน ({session.displayName || session.username})
            </h1>
            <p className="mt-1 text-sm text-[#524f49]">
              สร้างคอร์ส เพิ่มบทเรียนแบบ Markdown พร้อมโค้ดตัวอย่างและแบบทดสอบ รวมถึงติดตามความคืบหน้าของนักเรียนรายคน
            </p>
          </div>

          {isApproved && (
            <button
              type="button"
              onClick={() =>
                setEditingCourse({
                  title: "",
                  description: "",
                  level: "beginner",
                  is_published: true,
                })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#2a4d3e] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1f3b2f] cursor-pointer"
            >
              <span>+ สร้างคอร์สเรียนใหม่</span>
            </button>
          )}
        </div>

        {/* Teacher Approval Banner if Pending */}
        {!isApproved && (
          <div className="mb-6 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-6">
            <h2 className="text-base font-bold text-[#92400e]">
              ⏳ บัญชีครูของคุณอยู่ในสถานะรออนุมัติ (teacher_status: pending)
            </h2>
            <p className="mt-1 text-xs text-[#78350f]">
              เพื่อป้องกันการสร้างเนื้อหาโดยไม่ได้รับอนุญาต กรุณากรอกรหัสเชิญครูจากโรงเรียนเพื่ออนุมัติบัญชีทันที (รหัสทดสอบคือ{" "}
              <code className="font-mono font-bold">TEACHER2026</code>)
            </p>
            <form
              onSubmit={handleVerifyInviteCode}
              className="mt-3 flex max-w-md gap-2"
            >
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="กรอกรหัสเชิญครู เช่น TEACHER2026"
                className="flex-1 rounded-xl border border-[#d8d1c5] bg-white px-3.5 py-2 text-xs font-mono"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#2a4d3e] px-4 py-2 text-xs font-bold text-white cursor-pointer"
              >
                ยืนยันรหัสเชิญ
              </button>
            </form>
            {approvalMsg && (
              <p className="mt-2 text-xs font-bold text-[#92400e]">
                {approvalMsg}
              </p>
            )}
          </div>
        )}

        {/* Main Teacher Workspace */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Teacher's Courses */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#524f49]">
              คอร์สของฉัน ({myCourses.length})
            </h2>

            {myCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d8d1c5] bg-white p-6 text-center text-xs text-[#6e6a63]">
                คุณยังไม่มีคอร์สเรียน กดปุ่ม &ldquo;+ สร้างคอร์สเรียนใหม่&rdquo; ด้านบนเพื่อเริ่มต้น
              </div>
            ) : (
              myCourses.map((course) => {
                const isSelected = selectedCourse?.id === course.id;
                const lessonCount = lessons.filter(
                  (l) => l.course_id === course.id
                ).length;

                return (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? "border-[#2a4d3e] bg-white shadow-xs"
                        : "border-[#e5dfd3] bg-white/80 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          course.is_published
                            ? "bg-[#dcfce7] text-[#166534]"
                            : "bg-[#f3f4f6] text-[#4b5563]"
                        }`}
                      >
                        {course.is_published ? "เผยแพร่แล้ว" : "ฉบับร่าง (ซ่อน)"}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#524f49]">
                        รหัส: {course.join_code}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#1e1e1c]">
                      {course.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-[#6e6a63]">
                      {course.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#ece7dc] pt-2.5 text-[11px]">
                      <span className="font-semibold text-[#524f49]">
                        {lessonCount} บทเรียน
                      </span>
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleTogglePublishCourse(course)}
                          className="rounded-lg border border-[#d8d1c5] bg-[#faf8f4] px-2 py-1 font-semibold text-[#1e1e1c] hover:bg-[#f2efe8] cursor-pointer"
                        >
                          {course.is_published ? "ยกเลิกเผยแพร่" : "เผยแพร่"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCourse(course)}
                          className="rounded-lg border border-[#d8d1c5] bg-[#faf8f4] px-2 py-1 font-semibold text-[#2a4d3e] hover:bg-[#f2efe8] cursor-pointer"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(course.id)}
                          className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-2 py-1 font-semibold text-[#991b1b] hover:bg-[#fee2e2] cursor-pointer"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Selected Course Lessons & Enrolled Students */}
          <div className="lg:col-span-8">
            {selectedCourse ? (
              <div className="rounded-2xl border border-[#e5dfd3] bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ece7dc] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[#e8f0ec] px-2.5 py-0.5 font-mono text-xs font-bold text-[#2a4d3e]">
                        รหัสเข้าคอร์ส: {selectedCourse.join_code}
                      </span>
                      <Link
                        href={`/courses/${selectedCourse.id}`}
                        className="text-xs font-bold text-[#2a4d3e] underline"
                      >
                        ดูหน้าคอร์สฝั่งนักเรียน ↗
                      </Link>
                    </div>
                    <h2 className="mt-2 text-xl font-bold text-[#1e1e1c]">
                      {selectedCourse.title}
                    </h2>
                  </div>

                  {isApproved && (
                    <button
                      type="button"
                      onClick={openNewLessonModal}
                      className="rounded-xl bg-[#2a4d3e] px-4 py-2 text-xs font-bold text-white hover:bg-[#1f3b2f] cursor-pointer"
                    >
                      + เพิ่มบทเรียนใหม่
                    </button>
                  )}
                </div>

                {/* Sub-tabs: บทเรียนในคอร์ส | นักเรียนและความคืบหน้า */}
                <div className="mt-4 mb-5 flex gap-2 border-b border-[#ece7dc]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("lessons")}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      activeTab === "lessons"
                        ? "border-[#2a4d3e] text-[#2a4d3e]"
                        : "border-transparent text-[#6e6a63]"
                    }`}
                  >
                    จัดการบทเรียน ({selectedCourseLessons.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("students")}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                      activeTab === "students"
                        ? "border-[#2a4d3e] text-[#2a4d3e]"
                        : "border-transparent text-[#6e6a63]"
                    }`}
                  >
                    นักเรียนในคอร์ส ({courseStudentIds.length})
                  </button>
                </div>

                {activeTab === "lessons" ? (
                  <div className="space-y-3">
                    {selectedCourseLessons.length === 0 ? (
                      <p className="py-8 text-center text-xs text-[#6e6a63]">
                        ยังไม่มีบทเรียนในคอร์สนี้ กดปุ่ม &ldquo;+ เพิ่มบทเรียนใหม่&rdquo; เพื่อเพิ่มเนื้อหา
                      </p>
                    ) : (
                      selectedCourseLessons.map((lesson, idx) => (
                        <div
                          key={lesson.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5dfd3] bg-[#faf8f4] p-4"
                        >
                          <div>
                            <span className="text-[11px] font-bold text-[#2a4d3e]">
                              ลำดับที่ {idx + 1} • ภาษา{" "}
                              {lesson.programming_language.toUpperCase()}
                            </span>
                            <h3 className="text-sm font-bold text-[#1e1e1c]">
                              {lesson.title}
                            </h3>
                            <p className="text-[11px] text-[#6e6a63]">
                              แบบทดสอบท้ายบท:{" "}
                              {lesson.quiz_questions?.length || 0} ข้อ
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleMoveLesson(lesson.id, "up")}
                              disabled={idx === 0}
                              className="rounded-lg border border-[#d8d1c5] bg-white px-2.5 py-1 text-xs font-bold disabled:opacity-40 cursor-pointer"
                              title="เลื่อนขึ้น"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveLesson(lesson.id, "down")
                              }
                              disabled={
                                idx === selectedCourseLessons.length - 1
                              }
                              className="rounded-lg border border-[#d8d1c5] bg-white px-2.5 py-1 text-xs font-bold disabled:opacity-40 cursor-pointer"
                              title="เลื่อนลง"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingLesson(lesson)}
                              className="rounded-lg border border-[#d8d1c5] bg-white px-3 py-1 text-xs font-bold text-[#2a4d3e] hover:bg-[#f2efe8] cursor-pointer"
                            >
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-1 text-xs font-bold text-[#991b1b] hover:bg-[#fee2e2] cursor-pointer"
                            >
                              ลบ
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* รายชื่อนักเรียนและความคืบหน้าในคอร์ส */
                  <div className="space-y-3">
                    {courseStudentIds.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#d8d1c5] p-8 text-center text-xs text-[#6e6a63]">
                        ยังไม่มีนักเรียนลงทะเบียนในคอร์สนี้ (แจกรหัสคอร์ส{" "}
                        <strong className="font-mono text-[#1e1e1c]">
                          {selectedCourse.join_code}
                        </strong>{" "}
                        ให้นักเรียนกรอกในหน้าคอร์สเรียนได้เลย)
                      </div>
                    ) : (
                      courseStudentIds.map((stuId) => {
                        const stuProg = progress.filter(
                          (p) =>
                            p.course_id === selectedCourse.id &&
                            p.student_id === stuId
                        );
                        const doneCount = stuProg.filter(
                          (p) => p.is_completed
                        ).length;
                        const pct =
                          selectedCourseLessons.length > 0
                            ? Math.round(
                                (doneCount / selectedCourseLessons.length) * 100
                              )
                            : 0;

                        return (
                          <div
                            key={stuId}
                            className="rounded-xl border border-[#e5dfd3] bg-[#faf8f4] p-4"
                          >
                            <div className="flex items-center justify-between text-xs font-bold mb-2">
                              <span>รหัสนักเรียน: {stuId}</span>
                              <span className="text-[#2a4d3e]">
                                เรียนจบ {doneCount}/
                                {selectedCourseLessons.length} บทเรียน ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-[#e5dfd3]">
                              <div
                                className="h-full rounded-full bg-[#2a4d3e]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d8d1c5] bg-white p-10 text-center text-xs text-[#6e6a63]">
                เลือกคอร์สทางด้านซ้าย หรือสร้างคอร์สใหม่เพื่อเริ่มจัดการเนื้อหาบทเรียน
              </div>
            )}
          </div>
        </div>

        {/* Modal สร้าง/แก้ไขคอร์ส */}
        {editingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={handleSaveCourse}
              className="w-full max-w-lg rounded-2xl border border-[#e5dfd3] bg-white p-6 shadow-lg space-y-4"
            >
              <h3 className="text-lg font-bold text-[#1e1e1c]">
                {editingCourse.id ? "แก้ไขคอร์สเรียน" : "สร้างคอร์สเรียนใหม่"}
              </h3>

              <div>
                <label className="block text-xs font-bold text-[#3d3b36] mb-1">
                  ชื่อคอร์สเรียน
                </label>
                <input
                  type="text"
                  required
                  value={editingCourse.title || ""}
                  onChange={(e) =>
                    setEditingCourse({ ...editingCourse, title: e.target.value })
                  }
                  placeholder="เช่น พื้นฐาน Python สำหรับการวิเคราะห์ข้อมูล"
                  className="w-full rounded-xl border border-[#d8d1c5] px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3b36] mb-1">
                  คำอธิบายคอร์ส
                </label>
                <textarea
                  rows={3}
                  value={editingCourse.description || ""}
                  onChange={(e) =>
                    setEditingCourse({
                      ...editingCourse,
                      description: e.target.value,
                    })
                  }
                  placeholder="อธิบายสิ่งที่นักเรียนจะได้เรียนรู้ในคอร์สนี้..."
                  className="w-full rounded-xl border border-[#d8d1c5] px-3.5 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#3d3b36] mb-1">
                    ระดับความยาก
                  </label>
                  <select
                    value={editingCourse.level || "beginner"}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        level: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#d8d1c5] px-3 py-2 text-xs"
                  >
                    <option value="beginner">เริ่มต้น (Beginner)</option>
                    <option value="intermediate">กลาง (Intermediate)</option>
                    <option value="advanced">สูง (Advanced)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3d3b36] mb-1">
                    รหัสเข้าร่วมคอร์ส (Join Code)
                  </label>
                  <input
                    type="text"
                    value={editingCourse.join_code || ""}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        join_code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="สุ่มอัตโนมัติหากเว้นว่าง"
                    className="w-full rounded-xl border border-[#d8d1c5] px-3 py-2 font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-[#1e1e1c]">
                <input
                  type="checkbox"
                  checked={Boolean(editingCourse.is_published)}
                  onChange={(e) =>
                    setEditingCourse({
                      ...editingCourse,
                      is_published: e.target.checked,
                    })
                  }
                />
                <span>เผยแพร่คอร์สนี้ให้นักเรียนเห็นทันที</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#ece7dc]">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="rounded-xl border border-[#d8d1c5] px-4 py-2 text-xs font-bold text-[#524f49] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2a4d3e] px-5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  บันทึกคอร์ส
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal สร้าง/แก้ไขบทเรียน */}
        {editingLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <form
              onSubmit={handleSaveLesson}
              className="my-8 w-full max-w-2xl rounded-2xl border border-[#e5dfd3] bg-white p-6 shadow-lg space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-[#1e1e1c]">
                {editingLesson.id ? "แก้ไขบทเรียน" : "เพิ่มบทเรียนใหม่"}
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#3d3b36] mb-1">
                    ชื่อบทเรียน
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLesson.title || ""}
                    onChange={(e) =>
                      setEditingLesson({
                        ...editingLesson,
                        title: e.target.value,
                      })
                    }
                    placeholder="เช่น บทที่ 1: การทำงานของฟังก์ชัน"
                    className="w-full rounded-xl border border-[#d8d1c5] px-3.5 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3d3b36] mb-1">
                    ภาษาโปรแกรม
                  </label>
                  <select
                    value={editingLesson.programming_language || "javascript"}
                    onChange={(e) =>
                      setEditingLesson({
                        ...editingLesson,
                        programming_language: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#d8d1c5] px-3 py-2 text-xs"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="sql">SQL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3b36] mb-1">
                  เนื้อหาบทเรียน (Markdown)
                </label>
                <textarea
                  rows={4}
                  value={editingLesson.content_md || ""}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      content_md: e.target.value,
                    })
                  }
                  placeholder="เขียนเนื้อหาอธิบายบทเรียนที่นี่..."
                  className="w-full rounded-xl border border-[#d8d1c5] px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d3b36] mb-1">
                  ตัวอย่างโค้ดประกอบบทเรียน
                </label>
                <textarea
                  rows={4}
                  value={editingLesson.code_example || ""}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      code_example: e.target.value,
                    })
                  }
                  placeholder="วางตัวอย่างโค้ดให้นักเรียนทดลองรัน..."
                  className="w-full rounded-xl border border-[#d8d1c5] bg-[#1e1e1c] p-3 font-mono text-xs text-[#f8f8f2]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#3d3b36] mb-1">
                    ลิงก์ภายนอก (External URL - ถ้ามี)
                  </label>
                  <input
                    type="url"
                    value={editingLesson.external_url || ""}
                    onChange={(e) =>
                      setEditingLesson({
                        ...editingLesson,
                        external_url: e.target.value,
                      })
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-[#d8d1c5] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3d3b36] mb-1">
                    ลิงก์วิดีโอ (Video URL - ถ้ามี)
                  </label>
                  <input
                    type="url"
                    value={editingLesson.video_url || ""}
                    onChange={(e) =>
                      setEditingLesson({
                        ...editingLesson,
                        video_url: e.target.value,
                      })
                    }
                    placeholder="https://youtube.com/..."
                    className="w-full rounded-xl border border-[#d8d1c5] px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Quiz Builder */}
              <div className="rounded-xl border border-[#e5dfd3] bg-[#faf8f4] p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#1e1e1c]">
                  คำถามแบบทดสอบท้ายบทเรียน (
                  {editingLesson.quiz_questions?.length || 0} ข้อ)
                </h4>

                {(editingLesson.quiz_questions || []).map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs border border-[#ece7dc]"
                  >
                    <span>
                      {idx + 1}. {q.question} (ตัวเลือก: {q.options.join(" / ")})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingLesson({
                          ...editingLesson,
                          quiz_questions: (
                            editingLesson.quiz_questions || []
                          ).filter((_, i) => i !== idx),
                        })
                      }
                      className="text-[#991b1b] font-bold ml-2 cursor-pointer"
                    >
                      ลบ
                    </button>
                  </div>
                ))}

                <div className="space-y-2 pt-2 border-t border-[#ece7dc]">
                  <input
                    type="text"
                    value={quizQuestionText}
                    onChange={(e) => setQuizQuestionText(e.target.value)}
                    placeholder="ตั้งโจทย์คำถามท้ายบท..."
                    className="w-full rounded-lg border border-[#d8d1c5] bg-white px-3 py-1.5 text-xs"
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      value={quizOptionsText}
                      onChange={(e) => setQuizOptionsText(e.target.value)}
                      placeholder="ตัวเลือกคั่นด้วยลูกน้ำ เช่น 10, 20, 30"
                      className="sm:col-span-2 rounded-lg border border-[#d8d1c5] bg-white px-3 py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={quizCorrectIdx}
                      onChange={(e) =>
                        setQuizCorrectIdx(Number(e.target.value))
                      }
                      placeholder="ลำดับข้อถูก (เริ่มที่ 0)"
                      className="rounded-lg border border-[#d8d1c5] bg-white px-3 py-1.5 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuizItem}
                    className="rounded-lg bg-[#e8f0ec] px-3 py-1.5 text-xs font-bold text-[#2a4d3e] cursor-pointer"
                  >
                    + เพิ่มคำถามเข้าบทเรียนนี้
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#ece7dc]">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="rounded-xl border border-[#d8d1c5] px-4 py-2 text-xs font-bold text-[#524f49] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2a4d3e] px-5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  บันทึกบทเรียน
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
