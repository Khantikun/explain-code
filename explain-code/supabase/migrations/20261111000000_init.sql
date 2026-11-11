-- ============================================================================
-- Migration: 20261111000000_init.sql
-- Project: "โค้ดนี้ฉันอธิบายได้" (Vibe Coding 2026 · Block Model 12 ช่อง)
-- Description: Full PostgreSQL schema migration with Supabase Auth,
--              Block Model reference tables, RLS policies, and analytical views.
-- ============================================================================

-- 1. Extensions
create extension if not exists citext;

-- 2. Custom Types & Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('student', 'teacher');
  end if;
end $$;

-- 3. Identity & Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now()
);

create table if not exists teachers (
  id uuid primary key references profiles(id) on delete cascade,
  username citext not null unique,
  display_name text not null,
  password_hash text
);
alter table teachers add column if not exists password_hash text;

-- 4. Reference Data (Static Curriculum Tables)
create table if not exists topics (
  id smallint primary key,
  short_name text not null,
  title text not null,
  is_boss boolean not null default false
);

create table if not exists block_cells (
  id text primary key check (id ~ '^[TEF][1-4]$'),
  level smallint not null check (level between 1 and 4),
  dimension char(1) not null check (dimension in ('T','E','F')),
  related_topic_id smallint references topics(id)
);

create table if not exists badges (
  id text primary key,
  topic_id smallint not null unique references topics(id),
  name text not null,
  description text not null
);

-- 5. Helper Function: Random 6-char Room Code Generator
create or replace function gen_room_code() returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from classrooms where room_code = code);
  end loop;
  return code;
end $$;

-- 6. Classrooms & Students
create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique default gen_room_code(),
  room_name text not null,
  teacher_id uuid not null references teachers(id) on delete cascade,
  pinned_topic_id smallint references topics(id),
  pinned_note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists classrooms_teacher_id_idx on classrooms (teacher_id);

create table if not exists students (
  id uuid primary key references profiles(id) on delete cascade,
  nickname citext not null unique check (nickname !~ '@'),  -- PDPA: ห้ามอีเมล
  classroom_id uuid not null references classrooms(id) on delete restrict,
  pin_hash text,
  created_at timestamptz not null default now()
);
alter table students add column if not exists pin_hash text;
create index if not exists students_classroom_id_idx on students (classroom_id);

-- 7. Learning Data & Practice Attempts
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  topic_id smallint not null references topics(id),
  score_percent smallint not null check (score_percent between 0 and 100),
  xp_earned integer not null check (xp_earned >= 0),
  created_at timestamptz not null default now()
);
create index if not exists attempts_student_created_idx on attempts (student_id, created_at desc);
create index if not exists attempts_topic_idx on attempts (topic_id);

create table if not exists attempt_cell_scores (
  attempt_id uuid references attempts(id) on delete cascade,
  cell_id text references block_cells(id),
  score smallint not null check (score between 0 and 100),
  primary key (attempt_id, cell_id)
);

create table if not exists attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id) on delete cascade,
  question_id text not null,
  cell_id text not null references block_cells(id),
  chosen_option_id text,
  is_correct boolean not null,
  tries smallint not null default 1,
  xp_earned smallint not null default 0
);
create index if not exists attempt_answers_attempt_id_idx on attempt_answers (attempt_id);
create index if not exists attempt_answers_question_correct_idx on attempt_answers (question_id, is_correct);

create table if not exists ai_evaluations (
  attempt_id uuid primary key references attempts(id) on delete cascade,
  student_explanation text not null,
  score smallint check (score between 0 and 100),
  passed boolean not null,
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists topic_progress (
  student_id uuid references students(id) on delete cascade,
  topic_id smallint references topics(id),
  best_score_percent smallint not null default 0,
  completed_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);

create table if not exists student_badges (
  student_id uuid references students(id) on delete cascade,
  badge_id text references badges(id),
  earned_at timestamptz not null default now(),
  primary key (student_id, badge_id)
);

create table if not exists activity_days (
  student_id uuid references students(id) on delete cascade,
  day date not null default current_date,
  primary key (student_id, day)
);

create table if not exists ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  prompt_title text not null,
  prompt_text text not null,
  problem_found text not null,
  solution_applied text not null,
  created_at timestamptz not null default now()
);

-- 8. Views (Computed Statistics & Aggregates)

-- คะแนนล่าสุดรายช่องของนักเรียนแต่ละคน
create or replace view student_cell_latest as
select distinct on (a.student_id, c.cell_id)
       a.student_id, c.cell_id, c.score, a.created_at
from attempts a
join attempt_cell_scores c on c.attempt_id = a.id
order by a.student_id, c.cell_id, a.created_at desc;

-- XP รวม + ตราที่ได้ + จำนวนด่านที่ผ่าน
create or replace view student_stats as
select s.id as student_id,
       s.nickname,
       s.classroom_id,
       coalesce((select sum(xp_earned) from attempts a where a.student_id = s.id), 0) as xp,
       (select count(*) from topic_progress p where p.student_id = s.id) as topics_completed,
       (select count(*) from student_badges b where b.student_id = s.id) as badges_count
from students s;

-- streak: จำนวนวันติดต่อกันจนถึงวันนี้ (หรือเมื่อวาน)
create or replace view student_streaks as
with d as (
  select student_id, day,
         day - (row_number() over (partition by student_id order by day))::int as grp
  from activity_days
), g as (
  select student_id, grp, count(*) as len, max(day) as last_day
  from d group by student_id, grp
)
select student_id, len as streak
from g
where last_day >= current_date - 1;

-- ค่าเฉลี่ย Block Model ทั้งห้อง (ใช้ในแดชบอร์ดครู)
create or replace view classroom_cell_avg as
select st.classroom_id, l.cell_id, round(avg(l.score), 1) as avg_score,
       count(distinct l.student_id) as students_count
from student_cell_latest l
join students st on st.id = l.student_id
group by st.classroom_id, l.cell_id;

-- ข้อที่นักเรียนตอบผิดบ่อยในห้อง
create or replace view classroom_question_stats as
select st.classroom_id, aa.question_id, aa.cell_id,
       count(*) as answers,
       round(100.0 * avg((not aa.is_correct)::int), 1) as wrong_percent
from attempt_answers aa
join attempts a on a.id = aa.attempt_id
join students st on st.id = a.student_id
group by st.classroom_id, aa.question_id, aa.cell_id;

-- ตั้ง security_invoker = true ให้ view เคารพ RLS ของตารางต้นทาง
alter view student_cell_latest set (security_invoker = true);
alter view student_stats set (security_invoker = true);
alter view student_streaks set (security_invoker = true);
alter view classroom_cell_avg set (security_invoker = true);
alter view classroom_question_stats set (security_invoker = true);

-- 9. Row Level Security (RLS) Helper & Policies

create or replace function is_teacher_of(room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from classrooms where id = room and teacher_id = auth.uid());
$$;

-- เปิดใช้งาน RLS ทุกตาราง
alter table profiles enable row level security;
alter table teachers enable row level security;
alter table classrooms enable row level security;
alter table students enable row level security;
alter table topics enable row level security;
alter table block_cells enable row level security;
alter table badges enable row level security;
alter table attempts enable row level security;
alter table attempt_cell_scores enable row level security;
alter table attempt_answers enable row level security;
alter table ai_evaluations enable row level security;
alter table topic_progress enable row level security;
alter table student_badges enable row level security;
alter table activity_days enable row level security;
alter table ai_usage_logs enable row level security;

-- ตารางอ้างอิง: ทุกคนอ่านได้ เขียนไม่ได้
drop policy if exists ref_read on topics;
create policy ref_read on topics for select using (true);

drop policy if exists ref_read on block_cells;
create policy ref_read on block_cells for select using (true);

drop policy if exists ref_read on badges;
create policy ref_read on badges for select using (true);

-- profiles
drop policy if exists own_profile on profiles;
create policy own_profile on profiles for select using (id = auth.uid());

drop policy if exists own_profile_insert on profiles;
create policy own_profile_insert on profiles for insert with check (id = auth.uid());

-- teachers
drop policy if exists own_teacher on teachers;
create policy own_teacher on teachers for select using (id = auth.uid());

drop policy if exists own_teacher_update on teachers;
create policy own_teacher_update on teachers for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists own_teacher_insert on teachers;
create policy own_teacher_insert on teachers for insert with check (id = auth.uid());

-- classrooms: ครูจัดการห้องตัวเองได้ทั้งหมด / นักเรียนอ่านเฉพาะห้องที่ตัวเองอยู่
drop policy if exists teacher_rooms on classrooms;
create policy teacher_rooms on classrooms for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists student_room on classrooms;
create policy student_room on classrooms for select
  using (id in (select classroom_id from students where id = auth.uid()));

-- students: นักเรียนอ่านข้อมูลตัวเอง / ครูอ่านนักเรียนในห้องที่ตนสอน
drop policy if exists student_self on students;
create policy student_self on students for select using (id = auth.uid());

drop policy if exists student_by_teacher on students;
create policy student_by_teacher on students for select using (is_teacher_of(classroom_id));

-- attempts: นักเรียนจัดการ attempt ตนเอง / ครูอ่าน attempt นักเรียนในห้อง
drop policy if exists own_attempts on attempts;
create policy own_attempts on attempts for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists teacher_attempts on attempts;
create policy teacher_attempts on attempts for select
  using (is_teacher_of((select classroom_id from students where id = student_id)));

-- attempt_cell_scores
drop policy if exists own_cells on attempt_cell_scores;
create policy own_cells on attempt_cell_scores for all
  using (attempt_id in (select id from attempts where student_id = auth.uid()))
  with check (attempt_id in (select id from attempts where student_id = auth.uid()));

drop policy if exists teacher_cells on attempt_cell_scores;
create policy teacher_cells on attempt_cell_scores for select
  using (attempt_id in (select a.id from attempts a join students s on s.id = a.student_id
                        where is_teacher_of(s.classroom_id)));

-- attempt_answers
drop policy if exists own_answers on attempt_answers;
create policy own_answers on attempt_answers for all
  using (attempt_id in (select id from attempts where student_id = auth.uid()))
  with check (attempt_id in (select id from attempts where student_id = auth.uid()));

drop policy if exists teacher_answers on attempt_answers;
create policy teacher_answers on attempt_answers for select
  using (attempt_id in (select a.id from attempts a join students s on s.id = a.student_id
                        where is_teacher_of(s.classroom_id)));

-- ai_evaluations: อ่านได้ทั้งนักเรียนและครู (เขียนผ่าน service role เท่านั้น)
drop policy if exists own_ai_eval on ai_evaluations;
create policy own_ai_eval on ai_evaluations for select
  using (attempt_id in (select id from attempts where student_id = auth.uid()));

drop policy if exists teacher_ai_eval on ai_evaluations;
create policy teacher_ai_eval on ai_evaluations for select
  using (attempt_id in (select a.id from attempts a join students s on s.id = a.student_id
                        where is_teacher_of(s.classroom_id)));

-- topic_progress
drop policy if exists own_progress on topic_progress;
create policy own_progress on topic_progress for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists teacher_progress on topic_progress;
create policy teacher_progress on topic_progress for select
  using (is_teacher_of((select classroom_id from students where id = student_id)));

-- student_badges
drop policy if exists own_badges on student_badges;
create policy own_badges on student_badges for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists teacher_badges on student_badges;
create policy teacher_badges on student_badges for select
  using (is_teacher_of((select classroom_id from students where id = student_id)));

-- activity_days
drop policy if exists own_days on activity_days;
create policy own_days on activity_days for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists teacher_days on activity_days for select
  using (is_teacher_of((select classroom_id from students where id = student_id)));

-- ai_usage_logs
drop policy if exists own_ai_logs on ai_usage_logs;
create policy own_ai_logs on ai_usage_logs for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists teacher_ai_logs on ai_usage_logs for select
  using (is_teacher_of((select classroom_id from students where id = student_id)));
