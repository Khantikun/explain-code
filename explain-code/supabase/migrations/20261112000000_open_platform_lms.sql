-- ============================================================================
-- Migration: 20261112000000_open_platform_lms.sql
-- Project: "โค้ดนี้ฉันอธิบายได้" (Open Learning & Code Explanation Platform)
-- Description: ต่อยอดระบบ Open Platform LMS (profiles, courses, lessons,
--              enrollments, lesson_progress, code_explanations) + Triggers & RLS
--              โดยไม่ลบหรือเขียนทับระบบตารางและ Auth เดิม
-- ============================================================================

-- 1. ขยาย Enum user_role ให้รองรับ 'admin' และสร้าง Enum teacher_approval_status
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'teacher_approval_status') THEN
    CREATE TYPE teacher_approval_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- 2. ต่อยอดตาราง profiles เดิมโดยไม่กระทบข้อมูลเก่า
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS teacher_status teacher_approval_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. Trigger สร้าง profiles อัตโนมัติเมื่อมีการสร้างผู้ใช้ใน auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role user_role := 'student';
  v_display_name text;
  v_teacher_status teacher_approval_status := 'approved';
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'teacher' THEN
    v_role := 'teacher';
    -- หากไม่ได้ยืนยันผ่านรหัสเชิญครู (teacher_approved = 'true') ให้เริ่มที่ pending
    IF COALESCE(NEW.raw_user_meta_data->>'teacher_approved', 'false') = 'true' THEN
      v_teacher_status := 'approved';
    ELSE
      v_teacher_status := 'pending';
    END IF;
  ELSIF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    v_role := 'admin';
    v_teacher_status := 'approved';
  END IF;

  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'username',
    split_part(COALESCE(NEW.email, 'user'), '@', 1)
  );

  INSERT INTO public.profiles (id, role, display_name, teacher_status)
  VALUES (NEW.id, v_role, v_display_name, v_teacher_status)
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
        teacher_status = COALESCE(public.profiles.teacher_status, EXCLUDED.teacher_status);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Trigger ป้องกัน Privilege Escalation (ห้ามผู้ใช้แก้ role หรือ teacher_status ของตัวเอง)
CREATE OR REPLACE FUNCTION public.prevent_profile_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  -- อนุญาตถ้าเป็นการรันด้วย service_role / postgres (ไม่มี auth.uid() หรือ claim role = service_role)
  IF auth.uid() IS NULL OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- ตรวจว่าผู้เรียกเป็น admin หรือไม่ (แปลงเป็น text เพื่อให้รันใน Transaction เดียวกับ ALTER TYPE ได้โดยไม่ติด 55P04)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'ไม่สามารถเปลี่ยนบทบาท (role) ด้วยตนเองได้';
    END IF;
    IF NEW.teacher_status IS DISTINCT FROM OLD.teacher_status THEN
      RAISE EXCEPTION 'ไม่สามารถเปลี่ยนสถานะการอนุมัติครู (teacher_status) ด้วยตนเองได้';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_escalation();

-- Helper Function สำหรับตรวจสิทธิ์ครูที่ได้รับอนุมัติใน RLS
CREATE OR REPLACE FUNCTION public.is_approved_teacher()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (
        (role::text = 'teacher' AND teacher_status = 'approved')
        OR role::text = 'admin'
      )
  );
$$;

-- 5. ตาราง courses (คอร์สเรียนที่ครูสร้าง)
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_name text NOT NULL DEFAULT 'ครูผู้สอน',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  join_code text NOT NULL UNIQUE DEFAULT gen_room_code(),
  level text NOT NULL DEFAULT 'beginner',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS courses_teacher_id_idx ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS courses_is_published_idx ON public.courses(is_published);

-- 6. ตาราง lessons (บทเรียนในคอร์ส + แบบทดสอบท้ายบทเรียน)
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_md text NOT NULL DEFAULT '',
  code_example text NOT NULL DEFAULT '',
  programming_language text NOT NULL DEFAULT 'javascript',
  external_url text,
  video_url text,
  quiz_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_index integer NOT NULL DEFAULT 1,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lessons_course_order_idx ON public.lessons(course_id, order_index);

-- 7. ตาราง enrollments (การลงทะเบียนเรียนของนักเรียนในคอร์ส)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);
CREATE INDEX IF NOT EXISTS enrollments_student_idx ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON public.enrollments(course_id);

-- 8. ตาราง lesson_progress (ประวัติและความคืบหน้ารายบทเรียน)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  is_completed boolean NOT NULL DEFAULT false,
  quiz_score smallint CHECK (quiz_score BETWEEN 0 AND 100),
  opened_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS lesson_progress_student_course_idx ON public.lesson_progress(student_id, course_id);

-- 9. ตาราง code_explanations (ประวัติการอธิบายโค้ดของผู้ใช้ที่ล็อกอิน)
CREATE TABLE IF NOT EXISTS public.code_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'javascript',
  code_snippet text NOT NULL,
  summary text NOT NULL,
  line_by_line jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_concepts text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS code_explanations_user_created_idx ON public.code_explanations(user_id, created_at DESC);

-- ============================================================================
-- 10. Row Level Security (RLS) Policies
-- ============================================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_explanations ENABLE ROW LEVEL SECURITY;

-- Profiles: อัปเดตชื่อตัวเองได้ (แต่แก้ role/teacher_status ไม่ได้เพราะมี trigger กันไว้)
DROP POLICY IF EXISTS own_profile_update ON public.profiles;
CREATE POLICY own_profile_update ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ครูสามารถอ่านโปรไฟล์ของนักเรียนที่ลงทะเบียนในคอร์สของตนได้
DROP POLICY IF EXISTS teacher_read_student_profiles ON public.profiles;
CREATE POLICY teacher_read_student_profiles ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.student_id = public.profiles.id AND c.teacher_id = auth.uid()
    )
  );

-- Courses:
-- 1) ทุกคน (รวมถึงผู้ไม่ล็อกอิน) อ่านคอร์สที่เผยแพร่แล้วได้ และครูอ่านคอร์สตัวเองได้ทั้งหมด
DROP POLICY IF EXISTS courses_select_policy ON public.courses;
CREATE POLICY courses_select_policy ON public.courses
  FOR SELECT USING (is_published = true OR teacher_id = auth.uid());

-- 2) เฉพาะครูที่ได้รับอนุมัติจึงสร้าง/แก้ไข/ลบคอร์สของตัวเองได้
DROP POLICY IF EXISTS courses_teacher_all ON public.courses;
CREATE POLICY courses_teacher_all ON public.courses
  FOR ALL
  USING (teacher_id = auth.uid() AND public.is_approved_teacher())
  WITH CHECK (teacher_id = auth.uid() AND public.is_approved_teacher());

-- Lessons:
-- 1) อ่านได้เฉพาะบทเรียนที่เผยแพร่แล้วในคอร์สที่เผยแพร่แล้ว หรือเป็นครูเจ้าของคอร์ส
DROP POLICY IF EXISTS lessons_select_policy ON public.lessons;
CREATE POLICY lessons_select_policy ON public.lessons
  FOR SELECT USING (
    (is_published = true AND EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.is_published = true
    ))
    OR EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  );

-- 2) ครูจัดการบทเรียนได้เฉพาะในคอร์สของตัวเองเท่านั้น
DROP POLICY IF EXISTS lessons_teacher_all ON public.lessons;
CREATE POLICY lessons_teacher_all ON public.lessons
  FOR ALL
  USING (
    public.is_approved_teacher() AND EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_approved_teacher() AND EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  );

-- Enrollments:
-- นักเรียนจัดการการลงทะเบียนของตัวเองได้ / ครูดูรายชื่อนักเรียนในคอร์สตัวเองได้
DROP POLICY IF EXISTS enrollments_student_all ON public.enrollments;
CREATE POLICY enrollments_student_all ON public.enrollments
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS enrollments_teacher_select ON public.enrollments;
CREATE POLICY enrollments_teacher_select ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  );

-- Lesson Progress:
-- นักเรียนบันทึกความคืบหน้าของตนเองได้ / ครูดูความคืบหน้าของนักเรียนในคอร์สตนเองได้
DROP POLICY IF EXISTS lesson_progress_student_all ON public.lesson_progress;
CREATE POLICY lesson_progress_student_all ON public.lesson_progress
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS lesson_progress_teacher_select ON public.lesson_progress;
CREATE POLICY lesson_progress_teacher_select ON public.lesson_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()
    )
  );

-- Code Explanations:
-- ผู้ใช้อ่าน เพิ่ม และลบประวัติการอธิบายโค้ดของตัวเองได้เท่านั้น
DROP POLICY IF EXISTS code_explanations_own_all ON public.code_explanations;
CREATE POLICY code_explanations_own_all ON public.code_explanations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
