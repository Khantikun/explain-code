"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AVATARS, AvatarKey, getAvatar, DEFAULT_AVATAR, HEART_SPRITE, COIN_SPRITE } from "../lib/dungeon/sprites";
import { hashString, dungeonNameForCourse } from "../lib/dungeon/seed";
import { PixelSpriteView } from "../components/dungeon/PixelSpriteView";
import { Course, Lesson } from "../lib/supabase";
import { loadLocalCourses, loadLocalLessons } from "../lib/lms-data";
import { getClientSession, ClientAuthSession } from "../components/SiteHeader";
import { Icon } from "../components/Icons";

const STORAGE_AVATAR_KEY = "explain_code_dungeon_avatar";
const STORAGE_SOUND_KEY = "explain_code_dungeon_sound";

export default function DungeonHubPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [selectedAvatarKey, setSelectedAvatarKey] = useState<AvatarKey>(DEFAULT_AVATAR);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    setSession(getClientSession());

    // Load saved avatar preference
    try {
      const savedAvatar = localStorage.getItem(STORAGE_AVATAR_KEY) as AvatarKey;
      if (savedAvatar && AVATARS.some((a) => a.key === savedAvatar)) {
        setSelectedAvatarKey(savedAvatar);
      }
      const savedSound = localStorage.getItem(STORAGE_SOUND_KEY);
      if (savedSound !== null) {
        setSoundEnabled(savedSound === "true");
      }
    } catch {
      // ignore storage errors
    }

    // Load courses and lessons
    async function loadData() {
      try {
        const res = await fetch("/api/courses");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.courses) && data.courses.length > 0) {
            setCourses(data.courses);
            setLessons(data.lessons || []);
            setLoading(false);
            return;
          }
        }
      } catch {
        // network or server error, fallback to local
      }
      setCourses(loadLocalCourses());
      setLessons(loadLocalLessons());
      setLoading(false);

      // Load safe leaderboard
      try {
        const lbRes = await fetch("/api/dungeon/leaderboard");
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          if (Array.isArray(lbData.leaderboard)) {
            setLeaderboard(lbData.leaderboard);
          }
        }
      } catch {
        // ignore
      }
    }

    void loadData();
  }, []);

  const handleSelectAvatar = (key: AvatarKey) => {
    setSelectedAvatarKey(key);
    try {
      localStorage.setItem(STORAGE_AVATAR_KEY, key);
    } catch {
      // ignore
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem(STORAGE_SOUND_KEY, String(next));
    } catch {
      // ignore
    }
  };

  const currentAvatar = useMemo(() => getAvatar(selectedAvatarKey), [selectedAvatarKey]);

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-10 flex flex-col gap-8">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2f2d45] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="retro-button px-3.5 py-1.5 rounded-lg bg-[#252238] hover:bg-[#322c4a] text-xs font-bold text-[#f4efe6] transition-colors"
          >
            ← หน้าหลัก
          </Link>
          <Link
            href="/courses"
            className="retro-button px-3.5 py-1.5 rounded-lg bg-[#252238] hover:bg-[#322c4a] text-xs font-bold text-[#f4efe6] transition-colors"
          >
            คลังบทเรียนปกติ
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleSound}
            className="retro-button px-3.5 py-1.5 rounded-lg bg-[#252238] hover:bg-[#322c4a] text-xs font-bold text-[#f4efe6] flex items-center gap-2 cursor-pointer transition-colors"
            title="เปิด/ปิดเสียงเอฟเฟกต์ 8-bit"
          >
            <Icon name={soundEnabled ? "volume-2" : "volume-x"} size={14} />
            <span>{soundEnabled ? "เสียงเปิดอยู่" : "ปิดเสียง"}</span>
          </button>

          <Link
            href="/dungeon/credits"
            className="text-xs text-[#9a93ad] hover:text-[#f6c945] underline transition-colors"
          >
            CREDITS &amp; สิทธิ์การใช้งาน
          </Link>
        </div>
      </div>

      {/* Hero Banner with Pixel Title */}
      <div className="retro-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-2 right-4 text-[48px] sm:text-[72px] opacity-10 select-none pointer-events-none pixel-font text-[#f6c945]">
          DUNGEON
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#5a2d91] text-[#ffe27a] text-[11px] font-extrabold uppercase tracking-wider pixel-font">
              Pixel Top-Down RPG
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#f4efe6] flex items-center gap-3">
              <span>ดันเจี้ยนอ่านโค้ด</span>
              <span className="text-xs sm:text-sm pixel-font text-[#f6c945] bg-[#120f1c] px-2 py-1 rounded border border-[#4a4766]">
                v1.0 BETA
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#9a93ad] max-w-2xl leading-relaxed">
              1 คอร์ส = 1 ดันเจี้ยน, 1 บทเรียน = 1 ห้องเขาวงกต เดินสำรวจแผนที่พิกเซล ต่อสู้กับมอนสเตอร์ด้วยคำถาม Block Model
              ค้นหาหีบสมบัติ และปราบบอสเพื่อรับตราสัญลักษณ์ประจำคอร์ส
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="bg-[#120f1c] border-2 border-[#4a4766] rounded-xl p-4 flex items-center gap-4 shrink-0">
            <PixelSpriteView sprite={currentAvatar.sprite} size={52} animateBounce />
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#f4efe6]">{currentAvatar.name}</span>
                <span className="pixel-font text-[10px] bg-[#2f2d45] px-1.5 py-0.5 rounded text-[#ffe27a]">
                  Lv. 1
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] pixel-font text-[#9a93ad]">
                <span className="flex items-center gap-1 text-[#ff4d6d]">
                  <PixelSpriteView sprite={HEART_SPRITE} size={14} /> 3/3
                </span>
                <span className="flex items-center gap-1 text-[#f6c945]">
                  <PixelSpriteView sprite={COIN_SPRITE} size={14} /> 0 G
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Selection Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-[#f4efe6] flex items-center gap-2">
            <span>เลือกตัวละครพิกเซลของคุณ</span>
            <span className="text-xs text-[#9a93ad] font-normal">(แสดงบนแผนที่และโปรไฟล์)</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AVATARS.map((avatar) => {
            const isSelected = avatar.key === selectedAvatarKey;
            return (
              <button
                key={avatar.key}
                type="button"
                onClick={() => handleSelectAvatar(avatar.key)}
                className={`retro-card p-4 rounded-xl text-left cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "border-[#f6c945] bg-[#322c4a] shadow-[0_0_15px_rgba(246,201,69,0.3)] ring-2 ring-[#f6c945]"
                    : "hover:bg-[#2c2842]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#120f1c] border border-[#4a4766] flex items-center justify-center">
                    <PixelSpriteView sprite={avatar.sprite} size={48} animateBounce={isSelected} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#f4efe6] text-sm flex items-center gap-2">
                      <span>{avatar.name}</span>
                    </h3>
                    <span className="pixel-font text-[10px] text-[#9a93ad] uppercase">
                      Class: {avatar.key}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#9a93ad] leading-relaxed line-clamp-2">
                  {avatar.description}
                </p>

                <div className="pt-2 border-t border-[#4a4766]/50 flex items-center justify-between text-xs">
                  <span className={`text-[11px] font-bold ${isSelected ? "text-[#f6c945]" : "text-[#9a93ad]"}`}>
                    {isSelected ? "✓ กำลังใช้งาน" : "กดเพื่อเลือก"}
                  </span>
                  {isSelected && (
                    <span className="pixel-font text-[10px] bg-[#f6c945] text-[#120f1c] px-2 py-0.5 rounded font-black">
                      ACTIVE
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* CODE DEPTHS Roguelite Banner */}
      <section className="retro-panel rounded-2xl p-6 sm:p-7 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-2 border-indigo-500 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="pixel-font text-xs text-white bg-indigo-600 px-2.5 py-0.5 rounded font-bold">
                ROGUELITE MODE
              </span>
              <span className="text-xs font-semibold text-indigo-300">
                นำเข้าโค้ดเป็นร่องรอยพลัง ท้าทาย 5 ชั้น
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#f4efe6]">
              CODE DEPTHS : ดันเจี้ยนแห่งการเข้าใจ
            </h3>
            <p className="text-xs sm:text-sm text-[#9a93ad] max-w-2xl leading-relaxed">
              เลือกมนตร์อัลกอริทึม (SumPositive, FindMax, CountVowels, IsPalindrome, FizzBuzz) หรือวางโค้ดที่ AI สร้างขึ้น
              ระบบจะสร้างดันเจี้ยน 5 ชั้น (ทำนายผล, แกะรอยแรม, อธิบายสาเหตุ, ดักจับบั๊กขอบเขต, หลอมโค้ด และปราบบอส 3 เฟส)
            </p>
          </div>

          <Link
            href="/depths"
            className="retro-button px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-extrabold pixel-font flex items-center gap-2 shrink-0 transition-all shadow-lg shadow-indigo-500/20"
          >
            <span>เข้าเล่น CODE DEPTHS →</span>
          </Link>
        </div>
      </section>

      {/* Guest Trial Mode Banner */}
      <section className="retro-panel rounded-2xl p-6 sm:p-7 bg-gradient-to-r from-[#1c1b2b] via-[#252238] to-[#1c1b2b] border-2 border-[#9b5de5]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="pixel-font text-xs text-[#ffe27a] bg-[#5a2d91] px-2.5 py-0.5 rounded font-bold">
                TRIAL RUN
              </span>
              <span className="text-xs font-semibold text-[#9a93ad]">
                ไม่ต้องสมัครสมาชิกหรือเข้าสู่ระบบ
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#f4efe6]">
              โหมดทดลองเล่นด่วน 1 ห้อง (Guest Trial)
            </h3>
            <p className="text-xs sm:text-sm text-[#9a93ad] max-w-2xl leading-relaxed">
              ฝึกเดินตัวละครบนแผนที่พิกเซล สำรวจห้องมอนสเตอร์ และทดลองตอบคำถามแกะโค้ด 1 ข้อ
              เหมาะสำหรับผู้ใช้ใหม่ที่ต้องการสัมผัสบรรยากาศเกมก่อนเข้าเรียนคอร์สเต็ม
            </p>
          </div>

          <Link
            href="/dungeon/trial"
            className="retro-button px-5 py-3 rounded-xl bg-[#9b5de5] hover:bg-[#b07af0] text-[#f4efe6] text-xs sm:text-sm font-extrabold pixel-font flex items-center gap-2 shrink-0 transition-colors"
          >
            <span>เริ่มทดลอง 1 ห้อง →</span>
          </Link>
        </div>
      </section>

      {/* Course Dungeons List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#f4efe6] flex items-center gap-2">
              <span>ดันเจี้ยนประจำคอร์สเรียน</span>
            </h2>
            <p className="text-xs text-[#9a93ad] mt-0.5">
              แผนที่แต่ละดันเจี้ยนถูกสร้างอัตโนมัติจาก Seed คงที่ตามเนื้อหาคอร์สและบทเรียนจริง
            </p>
          </div>
          <span className="pixel-font text-xs text-[#f6c945]">
            {courses.length} DUNGEONS
          </span>
        </div>

        {loading ? (
          <div className="retro-panel rounded-2xl p-12 text-center text-[#9a93ad] pixel-font text-sm">
            LOADING DUNGEONS...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {courses.map((course) => {
              const courseLessons = lessons.filter(
                (l) => l.course_id === course.id && l.is_published
              );
              const floorCount = Math.max(1, courseLessons.length);
              const seed = hashString(course.id);
              const dungeonName = dungeonNameForCourse(course.id);
              const seedHex = (seed >>> 0).toString(16).toUpperCase().padStart(8, "0");

              return (
                <div
                  key={course.id}
                  className="retro-card p-6 rounded-2xl flex flex-col justify-between gap-5 relative overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="pixel-font text-[10px] text-[#ffe27a] bg-[#120f1c] px-2 py-0.5 rounded border border-[#4a4766]">
                        SEED #{seedHex}
                      </span>
                      <span className="pixel-font text-[11px] text-[#2fbf71]">
                        {floorCount} FLOORS
                      </span>
                    </div>

                    {/* Dungeon Procedural Title */}
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-[#f6c945] flex items-center gap-2">
                        <span>{dungeonName}</span>
                      </h3>
                      <h4 className="text-xs sm:text-sm font-bold text-[#f4efe6] mt-0.5 line-clamp-1">
                        {course.title}
                      </h4>
                    </div>

                    <p className="text-xs text-[#9a93ad] line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    {/* Room Type Legend */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#9a93ad] pt-2 border-t border-[#4a4766]/40">
                      <span className="inline-flex items-center gap-1 bg-[#120f1c] px-2 py-0.5 rounded">
                        มอนสเตอร์
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[#120f1c] px-2 py-0.5 rounded">
                        หีบสมบัติ
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[#120f1c] px-2 py-0.5 rounded">
                        ปริศนาโค้ด
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[#120f1c] px-2 py-0.5 rounded text-[#ffe27a]">
                        บอสคอร์ส
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-[#4a4766]/60 flex items-center justify-between gap-3">
                    <div className="text-[11px] text-[#9a93ad]">
                      <span>ผู้สร้าง: </span>
                      <strong className="text-[#f4efe6]">{course.teacher_name}</strong>
                    </div>

                    <Link
                      href={`/dungeon/${course.id}`}
                      className="retro-button px-4 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#0b0b14] text-xs font-black pixel-font flex items-center gap-1.5 transition-colors"
                    >
                      <span>ENTER DUNGEON →</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Hall of Fame / Dungeon Leaderboard */}
      <section className="retro-panel rounded-2xl p-6 sm:p-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2f2d45] pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#ffe27a] flex items-center gap-2">
              <Icon name="trophy" size={20} className="text-[#ffe27a]" />
              <span>ทำเนียบผู้พิชิตดันเจี้ยน (Hall of Fame)</span>
            </h2>
            <p className="text-xs text-[#9a93ad] mt-0.5">
              คำนวณคะแนนฝั่งเซิร์ฟเวอร์ และแสดงเฉพาะผู้เล่นที่เปิดเผยชื่อตามหลัก PDPA
            </p>
          </div>
          <span className="pixel-font text-xs text-[#f6c945]">TOP ADVENTURERS</span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#9a93ad]">
            ยังไม่มีข้อมูลอันดับในระบบ มาร่วมเป็นผู้พิชิตคนแรกกันเลย!
          </div>
        ) : (
          <div className="divide-y divide-[#2f2d45] overflow-x-auto">
            {leaderboard.slice(0, 5).map((entry, idx) => {
              const entryAvatar = getAvatar(entry.avatar);
              return (
                <div
                  key={idx}
                  className="py-3 flex items-center justify-between gap-4 text-xs hover:bg-[#252238]/50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`pixel-font text-xs font-black w-6 text-center ${
                        idx === 0
                          ? "text-[#f6c945]"
                          : idx === 1
                          ? "text-[#e8e1cf]"
                          : idx === 2
                          ? "text-[#ffb347]"
                          : "text-[#9a93ad]"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="p-1 rounded bg-[#120f1c] border border-[#4a4766] shrink-0">
                      <PixelSpriteView sprite={entryAvatar.sprite} size={24} />
                    </div>
                    <div>
                      <span className="font-bold text-[#f4efe6] block">{entry.displayName}</span>
                      <span className="text-[10px] text-[#9a93ad] pixel-font">
                        Lv. {entry.level} · ปราบมอนสเตอร์ {entry.totalMonstersDefeated} ตัว
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[#2fbf71] font-black pixel-font block">
                        {entry.xp} XP
                      </span>
                      <span className="text-[10px] text-[#9a93ad]">
                        เคลียร์ {entry.totalDungeonsCleared} ดันเจี้ยน
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
