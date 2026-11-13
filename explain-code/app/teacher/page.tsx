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
import { PixelSpriteView } from "../components/dungeon/PixelSpriteView";
import { getMonsterDef, MonsterType } from "../lib/dungeon/monsters";
import { hashString, dungeonNameForCourse } from "../lib/dungeon/seed";
import { SAMPLE_DUNGEON_QUESTIONS } from "../lib/dungeon/questions";

export default function TeacherLMSDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "lessons" | "students" | "dungeon"
  >("lessons");

  // Dungeon Questions & Analytics State
  const [dungeonQuestions, setDungeonQuestions] = useState<any[]>([]);
  const [dungeonStats, setDungeonStats] = useState<
    Record<
      string,
      { totalAttempts: number; wrongCount: number; wrongPercent: number }
    >
  >({});
  const [editingDungeonQuestion, setEditingDungeonQuestion] = useState<
    any | null
  >(null);
  const [dqFormLessonId, setDqFormLessonId] = useState("");
  const [dqFormQuestion, setDqFormQuestion] = useState("");
  const [dqFormCode, setDqFormCode] = useState("");
  const [dqFormChoices, setDqFormChoices] = useState<string[]>([
    "",
    "",
    "",
    "",
  ]);
  const [dqFormCorrectIndex, setDqFormCorrectIndex] = useState(0);
  const [dqFormExplanation, setDqFormExplanation] = useState("");
  const [dqFormDifficulty, setDqFormDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("easy");
  const [dqFormMonster, setDqFormMonster] = useState<MonsterType>("slime");
  const [dqFormIsBoss, setDqFormIsBoss] = useState(false);

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

  // Load dungeon questions for current course
  useEffect(() => {
    async function fetchDungeonData() {
      if (!selectedCourseId) return;
      try {
        const res = await fetch(
          `/api/teacher/dungeon?courseId=${encodeURIComponent(selectedCourseId)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            setDungeonQuestions(data.questions);
            setDungeonStats(data.stats || {});
            return;
          }
        }
      } catch {
        // ignore
      }
      // Fallback sample questions
      setDungeonQuestions(
        SAMPLE_DUNGEON_QUESTIONS.map((q, idx) => ({
          id: q.id,
          course_id: selectedCourseId,
          lesson_id: null,
          question: q.question,
          code_snippet: q.codeSnippet,
          choices: q.choices,
          correct_index: q.correctIndex,
          explanation: q.explanation,
          difficulty: q.difficulty,
          monster_type: idx === SAMPLE_DUNGEON_QUESTIONS.length - 1 ? "boss" : "slime",
          is_boss: idx === SAMPLE_DUNGEON_QUESTIONS.length - 1,
        }))
      );
    }
    void fetchDungeonData();
  }, [selectedCourseId]);

  const handleOpenDungeonModal = (
    q?: any,
    defaultLessonId?: string,
    isBossDefault?: boolean
  ) => {
    if (q) {
      setEditingDungeonQuestion(q);
      setDqFormLessonId(q.lesson_id || defaultLessonId || "");
      setDqFormQuestion(q.question || "");
      setDqFormCode(q.code_snippet || "");
      setDqFormChoices(
        Array.isArray(q.choices) && q.choices.length === 4
          ? q.choices
          : ["", "", "", ""]
      );
      setDqFormCorrectIndex(q.correct_index ?? 0);
      setDqFormExplanation(q.explanation || "");
      setDqFormDifficulty(q.difficulty || "easy");
      setDqFormMonster(q.monster_type || (q.is_boss ? "boss" : "slime"));
      setDqFormIsBoss(Boolean(q.is_boss));
    } else {
      setEditingDungeonQuestion({ course_id: selectedCourseId });
      setDqFormLessonId(defaultLessonId || "");
      setDqFormQuestion("");
      setDqFormCode("");
      setDqFormChoices(["", "", "", ""]);
      setDqFormCorrectIndex(0);
      setDqFormExplanation("");
      setDqFormDifficulty("easy");
      setDqFormMonster(isBossDefault ? "boss" : "slime");
      setDqFormIsBoss(Boolean(isBossDefault));
    }
  };

  const handleSaveDungeonQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !dqFormQuestion.trim()) return;

    const payload = {
      id: editingDungeonQuestion?.id,
      courseId: selectedCourseId,
      lessonId: dqFormLessonId || null,
      question: dqFormQuestion.trim(),
      codeSnippet: dqFormCode.trim() || null,
      choices: dqFormChoices.map((c) => c.trim()),
      correctIndex: dqFormCorrectIndex,
      explanation: dqFormExplanation.trim(),
      difficulty: dqFormDifficulty,
      monsterType: dqFormIsBoss ? "boss" : dqFormMonster,
      isBoss: dqFormIsBoss,
    };

    try {
      const res = await fetch("/api/teacher/dungeon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.question) {
          setDungeonQuestions((prev) => {
            const exists = prev.some((item) => item.id === data.question.id);
            if (exists) {
              return prev.map((item) =>
                item.id === data.question.id ? data.question : item
              );
            }
            return [...prev, data.question];
          });
        }
      }
    } catch {
      // local update fallback
      setDungeonQuestions((prev) => {
        const newQ = {
          ...payload,
          id: payload.id || `dq-${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        const exists = prev.some((item) => item.id === newQ.id);
        if (exists) {
          return prev.map((item) => (item.id === newQ.id ? newQ : item));
        }
        return [...prev, newQ];
      });
    }

    setEditingDungeonQuestion(null);
  };

  const handleDeleteDungeonQuestion = async (questionId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบคำถามดันเจี้ยนข้อนี้?")) return;
    try {
      await fetch(
        `/api/teacher/dungeon?questionId=${encodeURIComponent(questionId)}`,
        { method: "DELETE" }
      );
    } catch {
      // ignore
    }
    setDungeonQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

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
      <div className="min-h-screen bg-[#0d0b14] p-8 text-center text-sm text-[#9a93ad]">
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
    <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Top Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3d395a] bg-[#1c1b2b] px-3 py-1 text-xs font-bold text-[#f6c945]">
              <Icon name="users" className="h-3.5 w-3.5" />
              ระบบจัดการคอร์สและบทเรียนสำหรับครูผู้สอน
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#f4efe6]">
              แดชบอร์ดครูผู้สอน ({session.displayName || session.username})
            </h1>
            <p className="mt-1 text-sm text-[#9a93ad]">
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
              className="inline-flex items-center gap-2 rounded-xl bg-[#2fbf71] px-4 py-2.5 text-xs font-extrabold text-[#0b0b14] shadow-md hover:bg-[#34d37d] transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>+ สร้างคอร์สเรียนใหม่</span>
            </button>
          )}
        </div>

        {/* Teacher Approval Banner if Pending */}
        {!isApproved && (
          <div className="mb-6 rounded-2xl border border-[#f6c945]/40 bg-[#281d08] p-6 shadow-lg">
            <h2 className="text-base font-bold text-[#f6c945]">
              ⏳ บัญชีครูของคุณอยู่ในสถานะรออนุมัติ (teacher_status: pending)
            </h2>
            <p className="mt-1 text-xs text-[#ffe27a]">
              เพื่อป้องกันการสร้างเนื้อหาโดยไม่ได้รับอนุญาต กรุณากรอกรหัสเชิญครูจากโรงเรียนเพื่ออนุมัติบัญชีทันที (รหัสทดสอบคือ{" "}
              <code className="font-mono font-bold text-[#f6c945]">TEACHER2026</code>)
            </p>
            <form
              onSubmit={handleVerifyInviteCode}
              className="mt-3 flex flex-wrap max-w-md gap-2"
            >
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="กรอกรหัสเชิญครู เช่น TEACHER2026"
                className="flex-1 min-w-[200px] rounded-xl border border-[#3d395a] bg-[#141220] px-3.5 py-2 text-xs font-mono text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#f6c945] px-4 py-2 text-xs font-extrabold text-[#0b0b14] hover:bg-[#ffe27a] transition-colors cursor-pointer whitespace-nowrap"
              >
                ยืนยันรหัสเชิญ
              </button>
            </form>
            {approvalMsg && (
              <p className="mt-2 text-xs font-bold text-[#ffe27a]">
                {approvalMsg}
              </p>
            )}
          </div>
        )}

        {/* Main Teacher Workspace */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Teacher's Courses */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#9a93ad]">
              คอร์สของฉัน ({myCourses.length})
            </h2>

            {myCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#3d395a] bg-[#141220] p-6 text-center text-xs text-[#9a93ad]">
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
                        ? "border-[#f6c945] bg-[#1c1b2b] shadow-lg"
                        : "border-[#2f2d45] bg-[#141220] hover:border-[#3d395a] hover:bg-[#1c1b2b]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                          course.is_published
                            ? "border-[#2fbf71]/40 bg-[#102a1e] text-[#86efac]"
                            : "border-[#3d395a] bg-[#252238] text-[#9a93ad]"
                        }`}
                      >
                        {course.is_published ? "เผยแพร่แล้ว" : "ฉบับร่าง (ซ่อน)"}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#f6c945]">
                        รหัส: {course.join_code}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#f4efe6]">
                      {course.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-[#9a93ad]">
                      {course.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#2f2d45] pt-2.5 text-[11px]">
                      <span className="font-semibold text-[#c4bdd6]">
                        {lessonCount} บทเรียน
                      </span>
                      <div
                        className="flex flex-wrap items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleTogglePublishCourse(course)}
                          className="rounded-lg border border-[#3d395a] bg-[#141220] px-2 py-1 font-semibold text-[#f4efe6] hover:border-[#f6c945] hover:bg-[#252238] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {course.is_published ? "ยกเลิกเผยแพร่" : "เผยแพร่"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCourse(course)}
                          className="rounded-lg border border-[#2fbf71]/40 bg-[#102a1e] px-2 py-1 font-semibold text-[#86efac] hover:bg-[#1a3d2d] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(course.id)}
                          className="rounded-lg border border-[#c0283a]/50 bg-[#2d141c] px-2 py-1 font-semibold text-[#fca5a5] hover:bg-[#3d1a24] transition-colors cursor-pointer whitespace-nowrap"
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
              <div className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-6 shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#2f2d45] pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-[#3d395a] bg-[#1c1b2b] px-2.5 py-0.5 font-mono text-xs font-bold text-[#f6c945]">
                        รหัสเข้าคอร์ส: {selectedCourse.join_code}
                      </span>
                      <Link
                        href={`/courses/${selectedCourse.id}`}
                        className="text-xs font-bold text-[#2fbf71] underline hover:text-[#34d37d]"
                      >
                        ดูหน้าคอร์สฝั่งนักเรียน ↗
                      </Link>
                    </div>
                    <h2 className="mt-2 text-xl font-bold text-[#f4efe6]">
                      {selectedCourse.title}
                    </h2>
                  </div>

                  {isApproved && (
                    <button
                      type="button"
                      onClick={openNewLessonModal}
                      className="rounded-xl bg-[#2fbf71] px-4 py-2 text-xs font-extrabold text-[#0b0b14] hover:bg-[#34d37d] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      + เพิ่มบทเรียนใหม่
                    </button>
                  )}
                </div>

                {/* Sub-tabs: บทเรียนในคอร์ส | นักเรียนและความคืบหน้า */}
                <div className="mt-4 mb-5 flex flex-wrap gap-2 border-b border-[#2f2d45]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("lessons")}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === "lessons"
                        ? "border-[#2fbf71] text-[#2fbf71]"
                        : "border-transparent text-[#9a93ad] hover:text-[#f4efe6]"
                    }`}
                  >
                    จัดการบทเรียน ({selectedCourseLessons.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("students")}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === "students"
                        ? "border-[#2fbf71] text-[#2fbf71]"
                        : "border-transparent text-[#9a93ad] hover:text-[#f4efe6]"
                    }`}
                  >
                    นักเรียนในคอร์ส ({courseStudentIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("dungeon")}
                    className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === "dungeon"
                        ? "border-[#9b5de5] text-[#ffe27a]"
                        : "border-transparent text-[#9a93ad] hover:text-[#f4efe6]"
                    }`}
                  >
                    <span>ดันเจี้ยน &amp; มอนสเตอร์</span>
                  </button>
                </div>

                {activeTab === "lessons" ? (
                  <div className="space-y-3">
                    {selectedCourseLessons.length === 0 ? (
                      <p className="py-8 text-center text-xs text-[#9a93ad]">
                        ยังไม่มีบทเรียนในคอร์สนี้ กดปุ่ม &ldquo;+ เพิ่มบทเรียนใหม่&rdquo; เพื่อเพิ่มเนื้อหา
                      </p>
                    ) : (
                      selectedCourseLessons.map((lesson, idx) => (
                        <div
                          key={lesson.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2f2d45] bg-[#1c1b2b] p-4"
                        >
                          <div>
                            <span className="text-[11px] font-bold text-[#f6c945]">
                              ลำดับที่ {idx + 1} • ภาษา{" "}
                              {lesson.programming_language.toUpperCase()}
                            </span>
                            <h3 className="text-sm font-bold text-[#f4efe6]">
                              {lesson.title}
                            </h3>
                            <p className="text-[11px] text-[#9a93ad]">
                              แบบทดสอบท้ายบท:{" "}
                              {lesson.quiz_questions?.length || 0} ข้อ
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleMoveLesson(lesson.id, "up")}
                              disabled={idx === 0}
                              className="rounded-lg border border-[#3d395a] bg-[#141220] px-2.5 py-1 text-xs font-bold text-[#f4efe6] hover:border-[#f6c945] disabled:opacity-40 cursor-pointer"
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
                              className="rounded-lg border border-[#3d395a] bg-[#141220] px-2.5 py-1 text-xs font-bold text-[#f4efe6] hover:border-[#f6c945] disabled:opacity-40 cursor-pointer"
                              title="เลื่อนลง"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingLesson(lesson)}
                              className="rounded-lg border border-[#2fbf71]/40 bg-[#102a1e] px-3 py-1 text-xs font-bold text-[#86efac] hover:bg-[#1a3d2d] cursor-pointer whitespace-nowrap"
                            >
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="rounded-lg border border-[#c0283a]/50 bg-[#2d141c] px-3 py-1 text-xs font-bold text-[#fca5a5] hover:bg-[#3d1a24] cursor-pointer whitespace-nowrap"
                            >
                              ลบ
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : activeTab === "students" ? (
                  /* รายชื่อนักเรียนและความคืบหน้าในคอร์ส */
                  <div className="space-y-3">
                    {courseStudentIds.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#3d395a] bg-[#1c1b2b] p-8 text-center text-xs text-[#9a93ad]">
                        ยังไม่มีนักเรียนลงทะเบียนในคอร์สนี้ (แจกรหัสคอร์ส{" "}
                        <strong className="font-mono text-[#f6c945]">
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
                            className="rounded-xl border border-[#2f2d45] bg-[#1c1b2b] p-4"
                          >
                            <div className="flex items-center justify-between text-xs font-bold mb-2">
                              <span className="text-[#f4efe6]">รหัสนักเรียน: {stuId}</span>
                              <span className="text-[#2fbf71]">
                                เรียนจบ {doneCount}/
                                {selectedCourseLessons.length} บทเรียน ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full border border-[#2f2d45] bg-[#141220]">
                              <div
                                className="h-full rounded-full bg-[#2fbf71]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}

                {/* Sub-tab 3: ดันเจี้ยน & มอนสเตอร์ */}
                {activeTab === "dungeon" && (
                  <div className="space-y-6">
                    {/* Dungeon Summary Banner */}
                    <div className="rounded-2xl border-2 border-[#5c5470] bg-[#1c1b2b] p-5 text-[#f4efe6] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="pixel-font text-[10px] bg-[#5a2d91] text-[#ffe27a] px-2 py-0.5 rounded font-bold">
                              DUNGEON CONFIG
                            </span>
                            <span className="pixel-font text-[10px] text-[#ffe27a] bg-[#120f1c] px-2 py-0.5 rounded border border-[#4a4766]">
                              SEED #{(hashString(selectedCourse.id) >>> 0).toString(16).toUpperCase()}
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-[#f6c945] mt-1">
                            {dungeonNameForCourse(selectedCourse.id)}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDungeonModal(undefined, undefined, false)}
                            className="rounded-xl bg-[#2fbf71] px-3.5 py-2 text-xs font-black text-[#0b0b14] hover:bg-[#34d37d] cursor-pointer whitespace-nowrap"
                          >
                            + เพิ่มคำถามดันเจี้ยน
                          </button>
                          <Link
                            href={`/dungeon/${selectedCourse.id}`}
                            target="_blank"
                            className="rounded-xl border border-[#9b5de5] bg-[#252238] px-3.5 py-2 text-xs font-bold text-[#ffe27a] hover:bg-[#322c4a] whitespace-nowrap"
                          >
                            ทดลองเล่นดันเจี้ยน ↗
                          </Link>
                        </div>
                      </div>

                      <p className="text-xs text-[#9a93ad] leading-relaxed">
                        แต่ละบทเรียนของคอร์สนี้จะสร้างเป็น 1 ห้องในดันเจี้ยน คุณสามารถเลือกมอนสเตอร์ประจำห้องและกำหนดคำถาม Block Model
                        เพื่อให้ผู้เรียนได้ฝึกฝนทักษะการอ่านโค้ดในระหว่างการเดินสำรวจ
                      </p>
                    </div>

                    {/* Floor by Floor Configuration */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-[#c4bdd6] uppercase tracking-wider">
                        โครงสร้างชั้นดันเจี้ยนและมอนสเตอร์ประจำบทเรียน ({selectedCourseLessons.length} ชั้น)
                      </h4>

                      {selectedCourseLessons.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#3d395a] bg-[#1c1b2b] p-8 text-center text-xs text-[#9a93ad]">
                          ยังไม่มีบทเรียนในคอร์สนี้ กรุณาเพิ่มบทเรียนในแท็บ &ldquo;จัดการบทเรียน&rdquo; ก่อนกำหนดคำถามดันเจี้ยน
                        </div>
                      ) : (
                        selectedCourseLessons.map((lesson, idx) => {
                          const isBossFloor = idx === selectedCourseLessons.length - 1;
                          const attachedQ =
                            dungeonQuestions.find((q) => q.lesson_id === lesson.id) ||
                            dungeonQuestions[idx] ||
                            null;

                          const monsterType: MonsterType =
                            attachedQ?.monster_type || (isBossFloor ? "boss" : "slime");
                          const monsterDef = getMonsterDef(monsterType);
                          const stat = attachedQ ? dungeonStats[attachedQ.id] : null;

                          return (
                            <div
                              key={lesson.id}
                              className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                                isBossFloor
                                  ? "border-[#9b5de5] bg-[#252238]"
                                  : "border-[#2f2d45] bg-[#1c1b2b]"
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex items-start gap-3.5">
                                  {/* Monster Sprite Box */}
                                  <div className="p-2 rounded-xl bg-[#120f1c] border-2 border-[#4a4766] flex items-center justify-center shrink-0">
                                    <PixelSpriteView sprite={monsterDef.sprite} size={40} />
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                                          isBossFloor
                                            ? "bg-[#5a2d91] text-[#ffe27a]"
                                            : "bg-[#2fbf71] text-[#0b0b14]"
                                        }`}
                                      >
                                        {isBossFloor ? "บอสใหญ่ชั้นสุดท้าย" : `ชั้นที่ ${idx + 1}`}
                                      </span>
                                      <span className="text-xs font-bold text-[#f4efe6]">
                                        {lesson.title}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-[#9a93ad]">
                                      <span>มอนสเตอร์: <strong className="text-[#f6c945]">{monsterDef.name}</strong></span>
                                      <span>·</span>
                                      <span className="text-[#ff6b81] font-bold">HP {monsterDef.maxHp}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDungeonModal(attachedQ, lesson.id, isBossFloor)}
                                    className="rounded-xl border border-[#2fbf71]/50 bg-[#102a1e] px-3.5 py-1.5 text-xs font-bold text-[#86efac] hover:bg-[#1a3d2d] cursor-pointer whitespace-nowrap"
                                  >
                                    {attachedQ ? "แก้ไขคำถาม" : "+ กำหนดคำถาม"}
                                  </button>
                                  {attachedQ && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDungeonQuestion(attachedQ.id)}
                                      className="rounded-xl border border-[#c0283a]/50 bg-[#2d141c] px-3 py-1.5 text-xs font-bold text-[#fca5a5] hover:bg-[#3d1a24] cursor-pointer whitespace-nowrap"
                                    >
                                      ลบ
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Question preview & Error Analytics */}
                              {attachedQ ? (
                                <div className="mt-4 pt-3.5 border-t border-[#2f2d45] space-y-2">
                                  <div className="text-xs text-[#f4efe6]">
                                    <strong className="text-[#f6c945]">คำถาม:</strong> {attachedQ.question}
                                  </div>

                                  {attachedQ.code_snippet && (
                                    <pre className="p-2.5 rounded-lg border border-[#2f2d45] bg-[#120f1c] text-[#ffe27a] font-mono text-[11px] overflow-x-auto">
                                      <code>{attachedQ.code_snippet}</code>
                                    </pre>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                                    {Array.isArray(attachedQ.choices) &&
                                      attachedQ.choices.map((c: string, cIdx: number) => (
                                        <div
                                          key={cIdx}
                                          className={`px-2.5 py-1 rounded-md border ${
                                            cIdx === attachedQ.correct_index
                                              ? "bg-[#102a1e] border-[#2fbf71]/60 text-[#86efac] font-bold"
                                              : "bg-[#141220] border-[#2f2d45] text-[#c4bdd6]"
                                          }`}
                                        >
                                          {cIdx + 1}. {c} {cIdx === attachedQ.correct_index && "✓ (เฉลย)"}
                                        </div>
                                      ))}
                                  </div>

                                  {/* Error Analytics Display */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px]">
                                    <span className="text-[#9a93ad]">
                                      คำอธิบาย: {attachedQ.explanation}
                                    </span>

                                    {stat ? (
                                      <div
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                                          stat.wrongPercent >= 50
                                            ? "bg-[#2d141c] text-[#fca5a5] border border-[#c0283a]/50"
                                            : "bg-[#102a1e] text-[#86efac] border border-[#2fbf71]/40"
                                        }`}
                                      >
                                        <span>สถิติ: ตอบแล้ว {stat.totalAttempts} ครั้ง</span>
                                        <span>(ตอบผิด {stat.wrongPercent}%)</span>
                                        {stat.wrongPercent >= 50 && (
                                          <span className="font-bold underline">ตอบผิดบ่อย</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-[#9a93ad]">
                                        ยังไม่มีประวัตินักเรียนตอบข้อนี้
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-3 pt-3 border-t border-[#2f2d45] text-xs text-[#9a93ad] italic">
                                  ยังไม่ได้กำหนดคำถามเฉพาะสำหรับชั้นนี้ (ระบบจะใช้คำถามมาตรฐานของคอร์ส)
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#3d395a] bg-[#141220] p-10 text-center text-xs text-[#9a93ad]">
                เลือกคอร์สทางด้านซ้าย หรือสร้างคอร์สใหม่เพื่อเริ่มจัดการเนื้อหาบทเรียน
              </div>
            )}
          </div>
        </div>

        {/* Modal สร้าง/แก้ไขคอร์ส */}
        {editingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <form
              onSubmit={handleSaveCourse}
              className="w-full max-w-lg rounded-2xl border border-[#3d395a] bg-[#141220] p-6 text-[#f4efe6] shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-bold text-[#f4efe6]">
                {editingCourse.id ? "แก้ไขคอร์สเรียน" : "สร้างคอร์สเรียนใหม่"}
              </h3>

              <div>
                <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
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
                  className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
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
                  className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
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
                    className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3 py-2 text-xs text-[#f4efe6] focus:border-[#f6c945] focus:outline-hidden"
                  >
                    <option value="beginner">เริ่มต้น (Beginner)</option>
                    <option value="intermediate">กลาง (Intermediate)</option>
                    <option value="advanced">สูง (Advanced)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
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
                    className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3 py-2 font-mono text-xs uppercase text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-[#f4efe6] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editingCourse.is_published)}
                  onChange={(e) =>
                    setEditingCourse({
                      ...editingCourse,
                      is_published: e.target.checked,
                    })
                  }
                  className="accent-[#2fbf71] h-4 w-4"
                />
                <span>เผยแพร่คอร์สนี้ให้นักเรียนเห็นทันที</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2f2d45]">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-4 py-2 text-xs font-bold text-[#f4efe6] hover:bg-[#252238] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2fbf71] px-5 py-2 text-xs font-extrabold text-[#0b0b14] hover:bg-[#34d37d] cursor-pointer"
                >
                  บันทึกคอร์ส
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal สร้าง/แก้ไขบทเรียน */}
        {editingLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto backdrop-blur-xs">
            <form
              onSubmit={handleSaveLesson}
              className="my-8 w-full max-w-2xl rounded-2xl border border-[#3d395a] bg-[#141220] p-6 text-[#f4efe6] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-[#f4efe6]">
                {editingLesson.id ? "แก้ไขบทเรียน" : "เพิ่มบทเรียนใหม่"}
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
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
                    className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
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
                    className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3 py-2 text-xs text-[#f4efe6] focus:border-[#f6c945] focus:outline-hidden"
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
                <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
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
                  className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
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
                  className="w-full rounded-xl border border-[#3d395a] bg-[#120f1c] p-3 font-mono text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
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
                    className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3 py-2 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
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
                    className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3 py-2 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Quiz Builder */}
              <div className="rounded-xl border border-[#2f2d45] bg-[#1c1b2b] p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#f6c945]">
                  คำถามแบบทดสอบท้ายบทเรียน (
                  {editingLesson.quiz_questions?.length || 0} ข้อ)
                </h4>

                {(editingLesson.quiz_questions || []).map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="flex items-center justify-between rounded-lg border border-[#2f2d45] bg-[#141220] px-3 py-2 text-xs text-[#f4efe6]"
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
                      className="text-[#fca5a5] hover:text-[#ff6b81] font-bold ml-2 cursor-pointer shrink-0"
                    >
                      ลบ
                    </button>
                  </div>
                ))}

                <div className="space-y-2 pt-2 border-t border-[#2f2d45]">
                  <input
                    type="text"
                    value={quizQuestionText}
                    onChange={(e) => setQuizQuestionText(e.target.value)}
                    placeholder="ตั้งโจทย์คำถามท้ายบท..."
                    className="w-full rounded-lg border border-[#3d395a] bg-[#141220] px-3 py-1.5 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      value={quizOptionsText}
                      onChange={(e) => setQuizOptionsText(e.target.value)}
                      placeholder="ตัวเลือกคั่นด้วยลูกน้ำ เช่น 10, 20, 30"
                      className="sm:col-span-2 rounded-lg border border-[#3d395a] bg-[#141220] px-3 py-1.5 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
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
                      className="rounded-lg border border-[#3d395a] bg-[#141220] px-3 py-1.5 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuizItem}
                    className="rounded-lg border border-[#2fbf71]/50 bg-[#102a1e] px-3 py-1.5 text-xs font-bold text-[#86efac] hover:bg-[#1a3d2d] cursor-pointer"
                  >
                    + เพิ่มคำถามเข้าบทเรียนนี้
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2f2d45]">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-4 py-2 text-xs font-bold text-[#f4efe6] hover:bg-[#252238] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2fbf71] px-5 py-2 text-xs font-extrabold text-[#0b0b14] hover:bg-[#34d37d] cursor-pointer"
                >
                  บันทึกบทเรียน
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal เพิ่ม/แก้ไขคำถามดันเจี้ยนและมอนสเตอร์ */}
        {editingDungeonQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto backdrop-blur-xs">
            <form
              onSubmit={handleSaveDungeonQuestion}
              className="w-full max-w-xl rounded-2xl border border-[#3d395a] bg-[#141220] p-6 text-[#f4efe6] shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-[#2f2d45] pb-3">
                <h3 className="text-base sm:text-lg font-bold text-[#f6c945] flex items-center gap-2">
                  <span>กำหนดคำถามและมอนสเตอร์ดันเจี้ยน</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingDungeonQuestion(null)}
                  className="text-xs text-[#9a93ad] hover:text-[#f4efe6] font-bold cursor-pointer"
                >
                  ✕ ปิด
                </button>
              </div>

              {/* Target Lesson & Monster Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
                    บทเรียน / ชั้นที่ต้องการผูก
                  </label>
                  <select
                    value={dqFormLessonId}
                    onChange={(e) => setDqFormLessonId(e.target.value)}
                    className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3 py-2 text-xs text-[#f4efe6] focus:border-[#f6c945] focus:outline-hidden"
                  >
                    <option value="">คำถามทั่วไปประจำคอร์ส</option>
                    {selectedCourseLessons.map((l, i) => (
                      <option key={l.id} value={l.id}>
                        ชั้นที่ {i + 1}: {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
                    มอนสเตอร์ประจำห้อง
                  </label>
                  <select
                    value={dqFormMonster}
                    onChange={(e) =>
                      setDqFormMonster(e.target.value as MonsterType)
                    }
                    className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3 py-2 text-xs text-[#f4efe6] focus:border-[#f6c945] focus:outline-hidden"
                  >
                    <option value="slime">สไลม์โค้ด (HP 1 - พื้นฐาน)</option>
                    <option value="skeleton">
                      โครงกระดูกโค้ดตกค้าง (HP 2 - ปานกลาง)
                    </option>
                    <option value="goblin">
                      ก็อบลินลักบั๊ก (HP 2 - จับบั๊ก)
                    </option>
                    <option value="boss">
                      จอมมารลูปไม่สิ้นสุด (HP 3 - บอสใหญ่)
                    </option>
                  </select>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
                  ข้อความคำถาม *
                </label>
                <textarea
                  rows={2}
                  required
                  value={dqFormQuestion}
                  onChange={(e) => setDqFormQuestion(e.target.value)}
                  placeholder="เช่น โค้ดด้านล่างนี้ ค่าของตัวแปร x หลังจบลูปจะมีค่าเท่าใด?"
                  className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                />
              </div>

              {/* Code Snippet */}
              <div>
                <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
                  โค้ดโปรแกรมประกอบคำถาม (ถ้ามี)
                </label>
                <textarea
                  rows={3}
                  value={dqFormCode}
                  onChange={(e) => setDqFormCode(e.target.value)}
                  placeholder={"let x = 0;\nfor (let i = 1; i <= 3; i++) {\n  x += i;\n}"}
                  className="w-full rounded-xl border border-[#3d395a] bg-[#120f1c] font-mono px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                />
              </div>

              {/* 4 Choices */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#c4bdd6]">
                  ตัวเลือก 4 ตัวเลือก (ติ๊กวงกลมเพื่อระบุข้อที่ถูกต้อง) *
                </label>
                {dqFormChoices.map((choice, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct_choice"
                      checked={dqFormCorrectIndex === idx}
                      onChange={() => setDqFormCorrectIndex(idx)}
                      className="accent-[#2fbf71] h-4 w-4"
                      id={`choice-${idx}`}
                    />
                    <label
                      htmlFor={`choice-${idx}`}
                      className="text-xs font-bold w-6 text-[#9a93ad]"
                    >
                      #{idx + 1}
                    </label>
                    <input
                      type="text"
                      required
                      value={choice}
                      onChange={(e) => {
                        const next = [...dqFormChoices];
                        next[idx] = e.target.value;
                        setDqFormChoices(next);
                      }}
                      placeholder={`ตัวเลือกที่ ${idx + 1}`}
                      className="flex-1 rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3 py-1.5 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                    />
                  </div>
                ))}
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
                  คำอธิบายเฉลยตาม Block Model / PRIMM
                </label>
                <textarea
                  rows={2}
                  value={dqFormExplanation}
                  onChange={(e) => setDqFormExplanation(e.target.value)}
                  placeholder="อธิบายเหตุผลว่าทำไมคำตอบนี้จึงถูกต้อง เพื่อให้นักเรียนเข้าใจเมื่อตอบคำถาม..."
                  className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3.5 py-2 text-xs text-[#f4efe6] placeholder:text-[#9a93ad]/60 focus:border-[#f6c945] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#c4bdd6] mb-1">
                    ระดับความยาก
                  </label>
                  <select
                    value={dqFormDifficulty}
                    onChange={(e) =>
                      setDqFormDifficulty(e.target.value as any)
                    }
                    className="w-full rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-3 py-2 text-xs text-[#f4efe6] focus:border-[#f6c945] focus:outline-hidden"
                  >
                    <option value="easy">ง่าย (Easy) - 25 XP</option>
                    <option value="medium">ปานกลาง (Medium) - 40 XP</option>
                    <option value="hard">ยาก (Hard) - 60 XP</option>
                  </select>
                </div>

                <div className="flex items-center sm:pt-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#f4efe6] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dqFormIsBoss}
                      onChange={(e) => setDqFormIsBoss(e.target.checked)}
                      className="accent-[#9b5de5] h-4 w-4"
                    />
                    <span>กำหนดให้เป็นห้องบอสท้ายคอร์ส</span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#2f2d45]">
                <button
                  type="button"
                  onClick={() => setEditingDungeonQuestion(null)}
                  className="rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-4 py-2 text-xs font-bold text-[#f4efe6] hover:bg-[#252238] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2fbf71] px-5 py-2 text-xs font-extrabold text-[#0b0b14] hover:bg-[#34d37d] cursor-pointer"
                >
                  บันทึกคำถามดันเจี้ยน
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
