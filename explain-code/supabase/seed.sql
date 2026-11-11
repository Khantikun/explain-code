-- ============================================================================
-- Seed Data: supabase/seed.sql
-- Project: "โค้ดนี้ฉันอธิบายได้" (Vibe Coding 2026 · Block Model 12 ช่อง)
-- Description: Static reference data extracted from app/lib/curriculum.ts
--              - 7 Topics (Topics 1-6 & Boss Topic 7)
--              - 12 Block Model Cells (T1-F4)
--              - 7 Badges
-- ============================================================================

-- 1. Topics (7 topics)
insert into topics (id, short_name, title, is_boss) values
  (1, '1 · ตัวแปรและการคำนวณ', 'เรื่องที่ 1 · ตัวแปรและการคำนวณ', false),
  (2, '2 · เงื่อนไข if/else', 'เรื่องที่ 2 · เงื่อนไข if/else', false),
  (3, '3 · วนซ้ำ for', 'เรื่องที่ 3 · วนซ้ำ for', false),
  (4, '4 · วนซ้ำ while', 'เรื่องที่ 4 · วนซ้ำ while', false),
  (5, '5 · ฟังก์ชัน', 'เรื่องที่ 5 · ฟังก์ชัน', false),
  (6, '6 · แอเรย์', 'เรื่องที่ 6 · แอเรย์', false),
  (7, '7 · บอสด่าน: จับบั๊กจาก AI', 'เรื่องที่ 7 · บอสด่าน: จับบั๊กจาก AI', true)
on conflict (id) do update set
  short_name = excluded.short_name,
  title = excluded.title,
  is_boss = excluded.is_boss;

-- 2. Block Model 12 Cells (Atom, Block, Relation, Macro x Text Surface, Execution, Function)
insert into block_cells (id, level, dimension, related_topic_id) values
  -- ระดับ 1: คำสั่งเดี่ยว (Atoms)
  ('T1', 1, 'T', 1),
  ('E1', 1, 'E', 1),
  ('F1', 1, 'F', 1),
  -- ระดับ 2: บล็อกคำสั่ง (Blocks)
  ('T2', 2, 'T', 3),
  ('E2', 2, 'E', 2),
  ('F2', 2, 'F', 4),
  -- ระดับ 3: ความสัมพันธ์ (Relations)
  ('T3', 3, 'T', 5),
  ('E3', 3, 'E', 5),
  ('F3', 3, 'F', 6),
  -- ระดับ 4: ภาพรวมโปรแกรม (Macro Structure)
  ('T4', 4, 'T', 6),
  ('E4', 4, 'E', 4),
  ('F4', 4, 'F', 7)
on conflict (id) do update set
  level = excluded.level,
  dimension = excluded.dimension,
  related_topic_id = excluded.related_topic_id;

-- 3. Badges (7 badges rewarded on completing each topic)
insert into badges (id, topic_id, name, description) values
  ('badge-var', 1, 'นักแกะรอยตัวแปร', 'เข้าใจการเปลี่ยนค่าของตัวแปรและการคำนวณทีละบรรทัด'),
  ('badge-ifelse', 2, 'ผู้คุมทางแยกตรรกะ', 'แยกแยะเงื่อนไขและเส้นทางการทำงานของ if/else ได้แม่นยำ'),
  ('badge-for', 3, 'จ้าวแห่งลูป for', 'ไล่รอบการทำงานของลูป for และการสะสมค่าได้ครบทุกรอบ'),
  ('badge-while', 4, 'นักควบคุมเงื่อนไขวนซ้ำ', 'เข้าใจเงื่อนไขการหยุดของลูป while และป้องกันลูปไม่รู้จบได้'),
  ('badge-fn', 5, 'สถาปนิกฟังก์ชัน', 'เข้าใจการรับพารามิเตอร์และการส่งคืนค่าด้วย return ข้ามส่วนของโค้ด'),
  ('badge-array', 6, 'นักสำรวจแอเรย์', 'เข้าใจ index ของแอเรย์และโครงสร้างการวนลูปคัดกรองข้อมูลครบถ้วน'),
  ('badge-boss', 7, 'ผู้พิชิตบั๊ก AI', 'อ่านโค้ดที่ AI เขียนออก จับบั๊กตรรกะได้ และแก้ไขจนทำงานถูกต้อง')
on conflict (id) do update set
  topic_id = excluded.topic_id,
  name = excluded.name,
  description = excluded.description;
