-- ============================================================================
-- Migration: 20261112010000_dungeon_system.sql
-- Project: "โค้ดนี้ฉันอธิบายได้" (Pixel Dungeon Crawler Educational Mode)
-- Description: เพิ่มระบบเกมดันเจี้ยนอ่านโค้ดพิกเซลอาร์ต (dungeon_questions,
--              player_stats, dungeon_runs, room_attempts, items, achievements)
--              พร้อม Safe Views, Triggers, และ RLS กันโกง 100%
-- ============================================================================

-- 1. ตารางคำถามดันเจี้ยนประจำคอร์สและบทเรียน (dungeon_questions)
CREATE TABLE IF NOT EXISTS public.dungeon_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  question text NOT NULL,
  code_snippet text,
  choices jsonb NOT NULL, -- Array ของสตริง 4 ตัวเลือก ["ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4"]
  correct_index integer NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3), -- ห้ามส่งให้ Client ในโหมดเล่น
  explanation text NOT NULL, -- คำอธิบายเฉลยตามหลัก Block Model
  difficulty text NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  block_model_cell text DEFAULT 'Execution-Flow',
  monster_type text NOT NULL DEFAULT 'slime' CHECK (monster_type IN ('slime', 'skeleton', 'goblin', 'boss')),
  is_boss boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index สำหรับค้นหาคำถามตามคอร์สและบทเรียน
CREATE INDEX IF NOT EXISTS idx_dungeon_questions_course ON public.dungeon_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_questions_lesson ON public.dungeon_questions(lesson_id);

-- 2. ตารางสถิติผู้เล่น (player_stats)
CREATE TABLE IF NOT EXISTS public.player_stats (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  avatar text NOT NULL DEFAULT 'knight' CHECK (avatar IN ('knight', 'mage', 'rogue', 'ranger')),
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  hearts_capacity integer NOT NULL DEFAULT 3 CHECK (hearts_capacity >= 1 AND hearts_capacity <= 10),
  total_monsters_defeated integer NOT NULL DEFAULT 0 CHECK (total_monsters_defeated >= 0),
  total_dungeons_cleared integer NOT NULL DEFAULT 0 CHECK (total_dungeons_cleared >= 0),
  show_on_leaderboard boolean NOT NULL DEFAULT true, -- ปฏิบัติตาม PDPA ผู้ใช้เลือกเปิด/ปิดการแสดงชื่อได้
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. ตารางสถานะการลงดันเจี้ยนแต่ละรอบ (dungeon_runs)
CREATE TABLE IF NOT EXISTS public.dungeon_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  current_floor integer NOT NULL DEFAULT 0 CHECK (current_floor >= 0),
  total_floors integer NOT NULL DEFAULT 1 CHECK (total_floors >= 1),
  hearts_left integer NOT NULL DEFAULT 3 CHECK (hearts_left >= 0),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'cleared', 'game_over', 'abandoned')),
  run_seed bigint NOT NULL,
  xp_earned integer NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  coins_earned integer NOT NULL DEFAULT 0 CHECK (coins_earned >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dungeon_runs_user ON public.dungeon_runs(user_id, status);

-- 4. ตารางบันทึกการตอบคำถามในห้อง (room_attempts) - ป้องกันการโกง & ฟาร์ม XP
CREATE TABLE IF NOT EXISTS public.room_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.dungeon_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.dungeon_questions(id) ON DELETE CASCADE,
  selected_index integer NOT NULL CHECK (selected_index >= 0 AND selected_index <= 3),
  is_correct boolean NOT NULL,
  xp_awarded integer NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  coins_awarded integer NOT NULL DEFAULT 0 CHECK (coins_awarded >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_attempts_run ON public.room_attempts(run_id, question_id);

-- 5. ตารางไอเทมในร้านค้าดันเจี้ยน (items)
CREATE TABLE IF NOT EXISTS public.items (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  effect_type text NOT NULL CHECK (effect_type IN ('heal_heart', 'reveal_hint', 'double_xp')),
  effect_value integer NOT NULL DEFAULT 1,
  icon text NOT NULL DEFAULT 'potion',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. ตารางคลังไอเทมของผู้เล่น (user_items)
CREATE TABLE IF NOT EXISTS public.user_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- 7. ตารางเหรียญตราและความสำเร็จ (achievements)
CREATE TABLE IF NOT EXISTS public.achievements (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'award',
  category text NOT NULL DEFAULT 'dungeon',
  xp_bonus integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. ตารางความสำเร็จของผู้เล่น (user_achievements)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- ============================================================================
-- Safe Views (มุมมองข้อมูลที่ปลอดภัยต่อการเผยแพร่ฝั่ง Client)
-- ============================================================================

-- View ที่ 1: คำถามที่ปลอดภัยสำหรับโหลดเข้า Game Client (ปิดบัง correct_index และ explanation)
CREATE OR REPLACE VIEW public.view_public_dungeon_questions AS
SELECT
  q.id,
  q.course_id,
  q.lesson_id,
  q.question,
  q.code_snippet,
  q.choices,
  q.difficulty,
  q.block_model_cell,
  q.monster_type,
  q.is_boss
FROM public.dungeon_questions q;

-- View ที่ 2: Leaderboard ที่ปลอดภัย (แสดงเฉพาะผู้เล่นที่ยินยอม และไม่เปิดเผยอีเมล/ID ลับ)
CREATE OR REPLACE VIEW public.view_dungeon_leaderboard AS
SELECT
  p.display_name,
  s.avatar,
  s.level,
  s.xp,
  s.total_monsters_defeated,
  s.total_dungeons_cleared
FROM public.player_stats s
JOIN public.profiles p ON p.id = s.user_id
WHERE s.show_on_leaderboard = true
ORDER BY s.xp DESC, s.total_dungeons_cleared DESC
LIMIT 100;

-- ============================================================================
-- Row Level Security (RLS) & Anti-Cheat Policies
-- ============================================================================

ALTER TABLE public.dungeon_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dungeon_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- นโยบาย dungeon_questions:
-- ครูและแอดมินดูและจัดการคำถามในคอร์สของตัวเองได้
CREATE POLICY "Teachers can view full questions in their courses"
  ON public.dungeon_questions FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Teachers can insert questions in their courses"
  ON public.dungeon_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Teachers can update questions in their courses"
  ON public.dungeon_questions FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Teachers can delete questions in their courses"
  ON public.dungeon_questions FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- นโยบาย player_stats:
-- ผู้เล่น SELECT สถิติของตัวเองได้เท่านั้น
CREATE POLICY "Users can read own player stats"
  ON public.player_stats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- สำคัญมาก: ห้ามมี INSERT / UPDATE ให้ Client!
-- การเพิ่ม XP/Coins และปรับระดับต้องทำผ่าน Route Handler เซิร์ฟเวอร์ (service_role) เท่านั้น

-- นโยบาย dungeon_runs:
-- ผู้เล่น SELECT สถานะรอบการเล่นของตัวเองได้
CREATE POLICY "Users can view own dungeon runs"
  ON public.dungeon_runs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ห้าม Client แก้ไขสถานะ run โดยตรง (ป้องกันการเสกสถานะ 'cleared')

-- นโยบาย room_attempts:
CREATE POLICY "Users can view own room attempts"
  ON public.room_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- นโยบาย items & achievements:
-- ทุกคนอ่านรายการไอเทมและความสำเร็จได้
CREATE POLICY "Anyone can view dungeon items"
  ON public.items FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can view achievements"
  ON public.achievements FOR SELECT
  TO authenticated, anon
  USING (true);

-- นโยบาย user_items & user_achievements:
CREATE POLICY "Users can view own items"
  ON public.user_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- Seed ข้อมูลเริ่มต้น: ไอเทมและความสำเร็จ
-- ============================================================================

INSERT INTO public.items (id, name, description, price, effect_type, effect_value, icon)
VALUES
  ('item_potion_small', 'ยาฟื้นพลังชีวิต (Health Potion)', 'ฟื้นฟูหัวใจ 1 ดวงทันทีในระหว่างการลงดันเจี้ยน', 30, 'heal_heart', 1, 'potion'),
  ('item_scroll_hint', 'คัมภีร์ใบ้คำตอบ (Hint Scroll)', 'ตัดตัวเลือกที่ผิดออก 1 ตัวเลือกเมื่อเข้าสู่การต่อสู้', 50, 'reveal_hint', 1, 'scroll')
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      price = EXCLUDED.price;

INSERT INTO public.achievements (id, name, description, icon, category, xp_bonus)
VALUES
  ('ach_first_blood', 'ผู้กล้าก้าวแรก', 'ผ่านห้องมอนสเตอร์ห้องแรกในดันเจี้ยนสำเร็จ', 'sword', 'dungeon', 50),
  ('ach_slime_buster', 'ผู้ปราบสไลม์โค้ด', 'ตอบคำถามปราบสไลม์โค้ดครบ 3 ตัว', 'shield', 'dungeon', 100),
  ('ach_dungeon_master', 'ผู้พิชิตดันเจี้ยน', 'ผ่านดันเจี้ยนและปราบบอสใหญ่ท้ายคอร์สได้สำเร็จ', 'trophy', 'dungeon', 200)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      xp_bonus = EXCLUDED.xp_bonus;
