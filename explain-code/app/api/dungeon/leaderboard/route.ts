import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/app/lib/supabase";

export interface LeaderboardEntry {
  displayName: string;
  avatar: string;
  level: number;
  xp: number;
  totalMonstersDefeated: number;
  totalDungeonsCleared: number;
}

const FALLBACK_LEADERBOARD: LeaderboardEntry[] = [
  {
    displayName: "ผู้กล้าโค้ดนิรนาม",
    avatar: "knight",
    level: 5,
    xp: 450,
    totalMonstersDefeated: 12,
    totalDungeonsCleared: 2,
  },
  {
    displayName: "นักเวทลูปทองคำ",
    avatar: "mage",
    level: 4,
    xp: 380,
    totalMonstersDefeated: 9,
    totalDungeonsCleared: 1,
  },
  {
    displayName: "นักล่าบั๊กไต่ระดับ",
    avatar: "rogue",
    level: 3,
    xp: 260,
    totalMonstersDefeated: 7,
    totalDungeonsCleared: 1,
  },
  {
    displayName: "พรานข้อมูลใหม่",
    avatar: "ranger",
    level: 2,
    xp: 140,
    totalMonstersDefeated: 4,
    totalDungeonsCleared: 0,
  },
];

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const db = admin as any;
    if (isSupabaseConfigured() && db) {
      const { data, error } = await db
        .from("view_dungeon_leaderboard")
        .select("*")
        .limit(50);

      if (!error && Array.isArray(data) && data.length > 0) {
        const formatted: LeaderboardEntry[] = data.map((row: any) => ({
          displayName: row.display_name || "ผู้เล่นไม่ประสงค์ออกนาม",
          avatar: row.avatar || "knight",
          level: row.level || 1,
          xp: row.xp || 0,
          totalMonstersDefeated: row.total_monsters_defeated || 0,
          totalDungeonsCleared: row.total_dungeons_cleared || 0,
        }));
        return NextResponse.json({ success: true, leaderboard: formatted });
      }
    }

    return NextResponse.json({ success: true, leaderboard: FALLBACK_LEADERBOARD });
  } catch (err: unknown) {
    return NextResponse.json({ success: true, leaderboard: FALLBACK_LEADERBOARD });
  }
}
