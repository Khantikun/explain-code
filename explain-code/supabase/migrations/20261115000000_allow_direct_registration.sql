-- ============================================================================
-- Migration: 20261115000000_allow_direct_registration.sql
-- แก้ไขให้ระบบสมัครสมาชิก (นักเรียนใช้ชื่อเล่นสมมติ+PIN / ครูใช้ Username+Password)
-- สามารถบันทึกลงตาราง profiles, students, teachers, classrooms ได้โดยตรง
-- แม้ใช้เฉพาะ NEXT_PUBLIC_SUPABASE_ANON_KEY และไม่ต้องบังคับใส่รหัสห้องเรียน
-- ============================================================================

-- 1. ปลด Foreign Key ที่บังคับให้ profiles.id ต้องผูกกับ auth.users(id) เท่านั้น
--    เพื่อให้การสมัครแบบ PDPA (ไม่ใช้อีเมลจริง) สร้าง UUID ลงตาราง profiles ได้ทันที
ALTER TABLE IF EXISTS public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS teacher_status text DEFAULT 'approved';

-- 2. ทำให้ students.classroom_id ไม่บังคับ (Nullable) เผื่อกรณีนักเรียนสมัครเรียนด้วยตัวเองโดยไม่ใส่รหัสห้อง
ALTER TABLE IF EXISTS public.students
  ALTER COLUMN classroom_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS pin_hash text;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS password_hash text;

-- 3. เปิด RLS Policies ให้ API หลังบ้านสามารถอ่าน/เพิ่ม/อัปเดตตารางผู้ใช้และห้องเรียนได้
DROP POLICY IF EXISTS "allow_all_profiles" ON public.profiles;
CREATE POLICY "allow_all_profiles" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_teachers" ON public.teachers;
CREATE POLICY "allow_all_teachers" ON public.teachers
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_classrooms" ON public.classrooms;
CREATE POLICY "allow_all_classrooms" ON public.classrooms
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_students" ON public.students;
CREATE POLICY "allow_all_students" ON public.students
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_activity_days" ON public.activity_days;
CREATE POLICY "allow_all_activity_days" ON public.activity_days
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_attempts" ON public.attempts;
CREATE POLICY "allow_all_attempts" ON public.attempts
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_attempt_cell_scores" ON public.attempt_cell_scores;
CREATE POLICY "allow_all_attempt_cell_scores" ON public.attempt_cell_scores
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_attempt_answers" ON public.attempt_answers;
CREATE POLICY "allow_all_attempt_answers" ON public.attempt_answers
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_topic_progress" ON public.topic_progress;
CREATE POLICY "allow_all_topic_progress" ON public.topic_progress
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_student_badges" ON public.student_badges;
CREATE POLICY "allow_all_student_badges" ON public.student_badges
  FOR ALL USING (true) WITH CHECK (true);
