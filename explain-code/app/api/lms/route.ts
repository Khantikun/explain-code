import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/app/lib/supabase";
import { getServerUserSession } from "@/app/lib/supabase/server";
import { INITIAL_COURSES, INITIAL_LESSONS } from "@/app/lib/lms-data";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * GET /api/lms
 * ดึงข้อมูลคอร์ส บทเรียน การลงทะเบียน และความคืบหน้าจาก Supabase (พร้อม fallback ข้อมูลเริ่มต้น)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || "";
    const teacherId = searchParams.get("teacherId") || "";

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        source: "seed",
        courses: INITIAL_COURSES,
        lessons: INITIAL_LESSONS,
        enrollments: [],
        progress: [],
      });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        source: "seed",
        courses: INITIAL_COURSES,
        lessons: INITIAL_LESSONS,
        enrollments: [],
        progress: [],
      });
    }

    let coursesData: any[] | null = null;
    let lessonsData: any[] | null = null;
    let enrollmentsData: any[] = [];
    let progressData: any[] = [];

    try {
      const { data: cRows, error: cErr } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (!cErr && cRows) {
        coursesData = cRows;
      }

      const { data: lRows, error: lErr } = await supabase
        .from("lessons")
        .select("*")
        .order("order_index", { ascending: true });
      if (!lErr && lRows) {
        lessonsData = lRows;
      }

      if (studentId && UUID_REGEX.test(studentId)) {
        const { data: eRows } = await supabase
          .from("enrollments")
          .select("*")
          .eq("student_id", studentId);
        if (eRows) enrollmentsData = eRows;

        const { data: pRows } = await supabase
          .from("lesson_progress")
          .select("*")
          .eq("student_id", studentId);
        if (pRows) progressData = pRows;
      } else if (teacherId) {
        const { data: eRows } = await supabase.from("enrollments").select("*");
        if (eRows) enrollmentsData = eRows;

        const { data: pRows } = await supabase
          .from("lesson_progress")
          .select("*");
        if (pRows) progressData = pRows;
      }
    } catch (e) {
      console.warn("GET /api/lms query notice:", e);
    }

    // รวมคอร์สเริ่มต้นเข้ากับคอร์สในฐานข้อมูลเพื่อให้ระบบมีเนื้อหาพร้อมเรียนเสมอ
    const mergedCourses =
      coursesData && coursesData.length > 0
        ? [
            ...coursesData,
            ...INITIAL_COURSES.filter(
              (ic) => !coursesData!.some((dc) => dc.id === ic.id)
            ),
          ]
        : INITIAL_COURSES;

    const mergedLessons =
      lessonsData && lessonsData.length > 0
        ? [
            ...lessonsData,
            ...INITIAL_LESSONS.filter(
              (il) => !lessonsData!.some((dl) => dl.id === il.id)
            ),
          ]
        : INITIAL_LESSONS;

    return NextResponse.json({
      success: true,
      source: coursesData !== null ? "supabase" : "seed",
      courses: mergedCourses,
      lessons: mergedLessons,
      enrollments: enrollmentsData,
      progress: progressData,
    });
  } catch (err) {
    console.error("GET /api/lms error:", err);
    return NextResponse.json({
      success: true,
      source: "seed",
      courses: INITIAL_COURSES,
      lessons: INITIAL_LESSONS,
      enrollments: [],
      progress: [],
    });
  }
}

/**
 * POST /api/lms
 * จัดการการสร้าง/แก้ไข/ลบคอร์ส บทเรียน การลงทะเบียนเรียน และบันทึกความคืบหน้า
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const session = await getServerUserSession();

    const supabase = isSupabaseConfigured() ? getSupabaseAdmin() : null;

    // 1. สร้างหรืออัปเดตคอร์ส (เฉพาะครูที่อนุมัติแล้ว)
    if (action === "upsert-course") {
      const course = body.course;
      const actorRole = session?.role || body.role;
      const actorStatus = session?.teacherStatus || body.teacherStatus || "approved";

      if (actorRole !== "teacher" && actorRole !== "admin") {
        return NextResponse.json(
          { error: "เฉพาะบัญชีครูผู้สอนเท่านั้นที่สามารถจัดการคอร์สได้" },
          { status: 403 }
        );
      }

      if (actorRole === "teacher" && actorStatus !== "approved") {
        return NextResponse.json(
          { error: "บัญชีครูของคุณยังอยู่ในสถานะรออนุมัติ (pending) กรุณายืนยันรหัสเชิญครูก่อนสร้างคอร์ส" },
          { status: 403 }
        );
      }

      const nowIso = new Date().toISOString();
      const newCourse = {
        id: course.id || crypto.randomUUID(),
        teacher_id: session?.userId || course.teacher_id,
        teacher_name: session?.displayName || course.teacher_name || "ครูผู้สอน",
        title: String(course.title || "").trim(),
        description: String(course.description || "").trim(),
        join_code: String(course.join_code || generateJoinCode())
          .trim()
          .toUpperCase(),
        level: course.level || "beginner",
        is_published: Boolean(course.is_published),
        created_at: course.created_at || nowIso,
        updated_at: nowIso,
      };

      if (supabase && UUID_REGEX.test(newCourse.teacher_id)) {
        try {
          const { data, error } = await supabase
            .from("courses")
            .upsert(newCourse)
            .select("*")
            .single();
          if (!error && data) {
            return NextResponse.json({ success: true, course: data, source: "supabase" });
          }
        } catch (e) {
          console.warn("Supabase upsert-course notice:", e);
        }
      }

      return NextResponse.json({ success: true, course: newCourse, source: "local" });
    }

    // 2. ลบคอร์สของครู
    if (action === "delete-course") {
      const { courseId, teacherId } = body;
      const effectiveTeacherId = session?.userId || teacherId;

      if (supabase && UUID_REGEX.test(courseId) && UUID_REGEX.test(effectiveTeacherId)) {
        try {
          await supabase
            .from("courses")
            .delete()
            .eq("id", courseId)
            .eq("teacher_id", effectiveTeacherId);
        } catch (e) {
          console.warn("Supabase delete-course notice:", e);
        }
      }
      return NextResponse.json({ success: true, deletedCourseId: courseId });
    }

    // 3. สร้างหรืออัปเดตบทเรียน
    if (action === "upsert-lesson") {
      const lesson = body.lesson;
      const nowIso = new Date().toISOString();
      const newLesson = {
        id: lesson.id || crypto.randomUUID(),
        course_id: lesson.course_id,
        title: String(lesson.title || "").trim(),
        content_md: String(lesson.content_md || ""),
        code_example: String(lesson.code_example || ""),
        programming_language: String(lesson.programming_language || "javascript"),
        external_url: lesson.external_url ? String(lesson.external_url).trim() : null,
        video_url: lesson.video_url ? String(lesson.video_url).trim() : null,
        quiz_questions: Array.isArray(lesson.quiz_questions)
          ? lesson.quiz_questions
          : [],
        order_index: Number(lesson.order_index || 1),
        is_published: lesson.is_published !== undefined ? Boolean(lesson.is_published) : true,
        created_at: lesson.created_at || nowIso,
        updated_at: nowIso,
      };

      if (supabase && UUID_REGEX.test(newLesson.course_id)) {
        try {
          const { data, error } = await supabase
            .from("lessons")
            .upsert(newLesson)
            .select("*")
            .single();
          if (!error && data) {
            return NextResponse.json({ success: true, lesson: data, source: "supabase" });
          }
        } catch (e) {
          console.warn("Supabase upsert-lesson notice:", e);
        }
      }

      return NextResponse.json({ success: true, lesson: newLesson, source: "local" });
    }

    // 4. ลบบทเรียน
    if (action === "delete-lesson") {
      const { lessonId } = body;
      if (supabase && UUID_REGEX.test(lessonId)) {
        try {
          await supabase.from("lessons").delete().eq("id", lessonId);
        } catch (e) {
          console.warn("Supabase delete-lesson notice:", e);
        }
      }
      return NextResponse.json({ success: true, deletedLessonId: lessonId });
    }

    // 5. นักเรียนเข้าร่วมคอร์ส (Enroll)
    if (action === "enroll") {
      const { courseId, studentId, lastAccessedLessonId } = body;
      const effectiveStudentId = session?.userId || studentId;
      const nowIso = new Date().toISOString();

      const enrollment = {
        id: crypto.randomUUID(),
        course_id: courseId,
        student_id: effectiveStudentId,
        enrolled_at: nowIso,
        last_accessed_lesson_id: lastAccessedLessonId || null,
        last_accessed_at: nowIso,
      };

      if (
        supabase &&
        UUID_REGEX.test(courseId) &&
        UUID_REGEX.test(effectiveStudentId)
      ) {
        try {
          const { data, error } = await supabase
            .from("enrollments")
            .upsert(
              {
                course_id: courseId,
                student_id: effectiveStudentId,
                last_accessed_lesson_id: lastAccessedLessonId || null,
                last_accessed_at: nowIso,
              },
              { onConflict: "course_id,student_id" }
            )
            .select("*")
            .single();
          if (!error && data) {
            return NextResponse.json({ success: true, enrollment: data, source: "supabase" });
          }
        } catch (e) {
          console.warn("Supabase enroll notice:", e);
        }
      }

      return NextResponse.json({ success: true, enrollment, source: "local" });
    }

    // 6. บันทึกความคืบหน้าบทเรียน (เปิดดูบทเรียน หรือ เรียนจบ)
    if (action === "update-progress") {
      const {
        courseId,
        lessonId,
        studentId,
        isCompleted,
        quizScore,
      } = body;
      const effectiveStudentId = session?.userId || studentId;
      const nowIso = new Date().toISOString();

      const progressRecord = {
        id: crypto.randomUUID(),
        student_id: effectiveStudentId,
        course_id: courseId,
        lesson_id: lessonId,
        is_completed: Boolean(isCompleted),
        quiz_score: typeof quizScore === "number" ? quizScore : null,
        opened_at: nowIso,
        completed_at: isCompleted ? nowIso : null,
        updated_at: nowIso,
      };

      if (
        supabase &&
        UUID_REGEX.test(courseId) &&
        UUID_REGEX.test(lessonId) &&
        UUID_REGEX.test(effectiveStudentId)
      ) {
        try {
          // อัปเดตบทเรียนล่าสุดใน enrollments ด้วย
          await supabase
            .from("enrollments")
            .upsert(
              {
                course_id: courseId,
                student_id: effectiveStudentId,
                last_accessed_lesson_id: lessonId,
                last_accessed_at: nowIso,
              },
              { onConflict: "course_id,student_id" }
            );

          const { data, error } = await supabase
            .from("lesson_progress")
            .upsert(
              {
                student_id: effectiveStudentId,
                course_id: courseId,
                lesson_id: lessonId,
                is_completed: Boolean(isCompleted),
                quiz_score: typeof quizScore === "number" ? quizScore : null,
                completed_at: isCompleted ? nowIso : null,
                updated_at: nowIso,
              },
              { onConflict: "student_id,lesson_id" }
            )
            .select("*")
            .single();

          if (!error && data) {
            return NextResponse.json({
              success: true,
              progress: data,
              source: "supabase",
            });
          }
        } catch (e) {
          console.warn("Supabase update-progress notice:", e);
        }
      }

      return NextResponse.json({
        success: true,
        progress: progressRecord,
        source: "local",
      });
    }

    return NextResponse.json({ error: "ไม่รู้จักคำสั่ง" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/lms error:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลคอร์ส" },
      { status: 500 }
    );
  }
}
