import { PixelSpriteDef, SLIME_SPRITE, SKELETON_SPRITE, GOBLIN_SPRITE, BOSS_SPRITE } from "./sprites";

export type MonsterType = "slime" | "skeleton" | "goblin" | "boss";

export interface MonsterDef {
  type: MonsterType;
  name: string;
  title: string;
  maxHp: number;
  xpReward: number;
  coinReward: number;
  sprite: PixelSpriteDef;
  description: string;
}

export const MONSTERS: Record<MonsterType, MonsterDef> = {
  slime: {
    type: "slime",
    name: "สไลม์โค้ด (Code Slime)",
    title: "มอนสเตอร์ระดับพื้นฐาน",
    maxHp: 1,
    xpReward: 25,
    coinReward: 10,
    sprite: SLIME_SPRITE,
    description: "มอนสเตอร์ตัวหยุ่นๆ ชอบกินค่า null และตัวแปรที่ไม่ได้ประกาศ",
  },
  skeleton: {
    type: "skeleton",
    name: "โครงกระดูกโค้ดตกค้าง (Dead Code Skeleton)",
    title: "นักรบโบราณ",
    maxHp: 2,
    xpReward: 40,
    coinReward: 20,
    sprite: SKELETON_SPRITE,
    description: "ฟื้นคืนชีพจากโค้ดเก่าที่ไม่เคยถูกเรียกใช้งาน (Dead Code)",
  },
  goblin: {
    type: "goblin",
    name: "ก็อบลินลักบั๊ก (Bug Thief Goblin)",
    title: "จอมป่วนแห่งเขาวงกต",
    maxHp: 2,
    xpReward: 50,
    coinReward: 25,
    sprite: GOBLIN_SPRITE,
    description: "ว่องไวและเจ้าเล่ห์ ชอบแอบสลับเครื่องหมาย = กับ == ในเงื่อนไข if",
  },
  boss: {
    type: "boss",
    name: "จอมมารลูปไม่สิ้นสุด (Infinite Loop Overlord)",
    title: "บอสใหญ่ประจำดันเจี้ยน",
    maxHp: 3,
    xpReward: 150,
    coinReward: 100,
    sprite: BOSS_SPRITE,
    description: "จอมมารผู้ทรงพลังที่ดูดกลืนหน่วยความจำของระบบด้วย while (true) ไม่มีที่สิ้นสุด",
  },
};

export function getMonsterDef(type: MonsterType): MonsterDef {
  return MONSTERS[type] || MONSTERS.slime;
}
