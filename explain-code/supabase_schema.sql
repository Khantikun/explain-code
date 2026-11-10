-- ============================================================================
-- SQL สำหรับสร้างฐานข้อมูลใน Supabase (PostgreSQL)
-- โปรเจกต์: โค้ดนี้ฉันอธิบายได้ (Vibe Coding 2026 · Block Model 12 ช่อง)
-- วิธีใช้: คัดลอกโค้ดทั้งหมดนี้ไปวางใน Supabase Dashboard -> SQL Editor -> กด Run
-- ============================================================================

-- 1. ตารางบัญชีครูผู้สอน (Role: teacher)
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- แฮชด้วย SHA-256 ที่หลังบ้าน
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role = 'teacher'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ตารางห้องเรียน (ครูเป็นคนสร้างและนำ room_code ไปแจกนักเรียน)
CREATE TABLE IF NOT EXISTS public.classrooms (
  room_code VARCHAR(12) PRIMARY KEY,
  room_name TEXT NOT NULL,
  teacher_username TEXT NOT NULL REFERENCES public.teachers(username) ON DELETE CASCADE,
  pinned_review_topic_id INT DEFAULT 1,
  pinned_review_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ตารางบัญชีนักเรียน (Role: student · ปฏิบัติตาม PDPA 2562 ใช้เฉพาะชื่อเล่นสมมติและแฮช PIN)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL, -- รหัส PIN 4 หลักที่แฮชด้วย SHA-256 ที่หลังบ้าน
  role TEXT NOT NULL DEFAULT 'student' CHECK (role = 'student'),
  room_code VARCHAR(12) NOT NULL REFERENCES public.classrooms(room_code) ON DELETE CASCADE,
  xp INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 1,
  completed_topics INT[] NOT NULL DEFAULT '{}',
  cell_scores JSONB NOT NULL DEFAULT '{
    "T1": 50, "E1": 50, "F1": 50,
    "T2": 50, "E2": 50, "F2": 50,
    "T3": 50, "E3": 50, "F3": 50,
    "T4": 50, "E4": 50, "F4": 50
  }'::jsonb,
  badges TEXT[] NOT NULL DEFAULT '{}',
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. เปิดใช้งาน Row Level Security (RLS) และอนุญาตการเข้าถึงสำหรับต้นแบบเว็บแอป
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read/write teachers" ON public.teachers;
CREATE POLICY "Allow public read/write teachers" ON public.teachers
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write classrooms" ON public.classrooms;
CREATE POLICY "Allow public read/write classrooms" ON public.classrooms
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write students" ON public.students;
CREATE POLICY "Allow public read/write students" ON public.students
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. ข้อมูลตั้งต้น (Seed Data) สำหรับทดสอบระบบได้ทันที
--    - บัญชีครู: ชื่อผู้ใช้ "ครูตัวอย่าง" | รหัสผ่าน "12345678"
--      (SHA-256 ของ "12345678" = ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f)
--    - บัญชีนักเรียน: "แมวส้ม", "เพนกวินฟ้า", "กระต่ายขาว", "หมีพูห์", "ฉลามน้อย" | PIN "1234"
--      (SHA-256 ของ "1234" = 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4)
-- ============================================================================

INSERT INTO public.teachers (username, password_hash, display_name, role)
VALUES (
  'ครูตัวอย่าง',
  'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f',
  'ครูตัวอย่าง (วิชาวิทยาการคำนวณ)',
  'teacher'
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.classrooms (room_code, room_name, teacher_username, pinned_review_topic_id, pinned_review_note)
VALUES
  ('ABC123', 'ม.4/1 วิทยาการคำนวณ (กลุ่ม A)', 'ครูตัวอย่าง', 4, 'สัปดาห์นี้ให้ทบทวนเรื่องลูป while และการส่งค่าข้ามฟังก์ชัน (ช่อง E2, E3)'),
  ('JS2026', 'ชมรม Vibe Coding รู้เท่าทัน AI', 'ครูตัวอย่าง', 7, 'ฝึกตรวจสอบโค้ดที่ AI เขียนในด่านบอสก่อนส่งโครงงาน')
ON CONFLICT (room_code) DO NOTHING;

INSERT INTO public.students (nickname, pin_hash, role, room_code, xp, streak, completed_topics, cell_scores, badges, history)
VALUES
  (
    'แมวส้ม',
    '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    'student',
    'ABC123',
    260,
    4,
    ARRAY[1, 2, 3, 4],
    '{"T1": 92, "E1": 88, "F1": 85, "T2": 82, "E2": 76, "F2": 80, "T3": 65, "E3": 45, "F3": 58, "T4": 70, "E4": 84, "F4": 42}'::jsonb,
    ARRAY['badge-var', 'badge-ifelse', 'badge-for', 'badge-while'],
    '[{"topicId": 4, "topicTitle": "เรื่องที่ 4 · วนซ้ำ while", "scorePercent": 78, "xpEarned": 65, "timestamp": "วันนี้ · 11:30"}]'::jsonb
  ),
  (
    'เพนกวินฟ้า',
    '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    'student',
    'ABC123',
    390,
    6,
    ARRAY[1, 2, 3, 4, 5, 6],
    '{"T1": 95, "E1": 90, "F1": 92, "T2": 88, "E2": 85, "F2": 86, "T3": 82, "E3": 78, "F3": 80, "T4": 75, "E4": 88, "F4": 68}'::jsonb,
    ARRAY['badge-var', 'badge-ifelse', 'badge-for', 'badge-while', 'badge-fn', 'badge-array'],
    '[{"topicId": 6, "topicTitle": "เรื่องที่ 6 · แอเรย์", "scorePercent": 86, "xpEarned": 65, "timestamp": "วันนี้ · 09:40"}]'::jsonb
  ),
  (
    'กระต่ายขาว',
    '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    'student',
    'ABC123',
    140,
    2,
    ARRAY[1, 2],
    '{"T1": 80, "E1": 72, "F1": 75, "T2": 64, "E2": 48, "F2": 55, "T3": 40, "E3": 35, "F3": 42, "T4": 45, "E4": 52, "F4": 38}'::jsonb,
    ARRAY['badge-var', 'badge-ifelse'],
    '[{"topicId": 2, "topicTitle": "เรื่องที่ 2 · เงื่อนไข if/else", "scorePercent": 70, "xpEarned": 55, "timestamp": "วันนี้ · 08:20"}]'::jsonb
  ),
  (
    'ฉลามน้อย',
    '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    'student',
    'JS2026',
    460,
    7,
    ARRAY[1, 2, 3, 4, 5, 6, 7],
    '{"T1": 96, "E1": 94, "F1": 90, "T2": 92, "E2": 89, "F2": 91, "T3": 88, "E3": 85, "F3": 87, "T4": 90, "E4": 92, "F4": 95}'::jsonb,
    ARRAY['badge-var', 'badge-ifelse', 'badge-for', 'badge-while', 'badge-fn', 'badge-array', 'badge-boss'],
    '[{"topicId": 7, "topicTitle": "เรื่องที่ 7 · บอสด่าน: จับบั๊กจาก AI", "scorePercent": 96, "xpEarned": 80, "timestamp": "วันนี้ · 11:00"}]'::jsonb
  )
ON CONFLICT (nickname) DO NOTHING;
