import { PaletteKey } from "./palette";

/**
 * Original 16x16 pixel-art sprites drawn in code (CC0, no external assets).
 * Each row is 16 characters; each character maps to a palette key via
 * the sprite's color map. "." means transparent.
 */
export interface PixelSpriteDef {
  rows: string[];
  colors: Record<string, PaletteKey>;
}

const HERO_TEMPLATE = [
  "................",
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohhhhhhhho...",
  "...ohssssssho...",
  "...osesssseso...",
  "...osssssssso...",
  "....osssssso....",
  "...occaaaacco...",
  "..occccaacccco..",
  "..osccccccccso..",
  "...ocddddddco...",
  "...occccccccco..",
  "...occo..occo...",
  "...obbo..obbo...",
  "...oooo..oooo...",
];

export type AvatarKey = "knight" | "mage" | "rogue" | "ranger";

export type HeroSkillEffect =
  | "hint_cut1"
  | "cut1"
  | "shield"
  | "trace"
  | "trace_cut1"
  | "output"
  | "cut2_hint"
  | "output_cut2"
  | "cut2_heal"
  | "full_oracle";

export interface HeroSkillDef {
  id: string;
  tier: 1 | 2 | 3;
  name: string;
  nameEn: string;
  mpCost: number;
  cooldownPhases: number;
  description: string;
  descriptionEn: string;
  icon: "bulb" | "shield" | "eye" | "sparkles" | "sword" | "flame" | "heart";
  accentColor: string;
  effect: HeroSkillEffect;
}

export interface HeroStats {
  maxHp: number;
  initialMp: number;
  maxMp: number;
  mpRegenOnCorrect: number;
  startingShield: number;
  xpMultiplier: number;
  coinMultiplier: number;
  passiveName: string;
  passiveNameEn: string;
  passiveDesc: string;
  passiveDescEn: string;
}

export interface AvatarDef {
  key: AvatarKey;
  name: string;
  nameEn: string;
  role: string;
  roleEn: string;
  description: string;
  sprite: PixelSpriteDef;
  stats: HeroStats;
  skills: [HeroSkillDef, HeroSkillDef, HeroSkillDef];
}

function hero(colors: Record<string, PaletteKey>): PixelSpriteDef {
  return {
    rows: HERO_TEMPLATE,
    colors: { o: "outline", s: "skin", e: "outline", ...colors },
  };
}

export const AVATARS: AvatarDef[] = [
  {
    key: "knight",
    name: "อัศวินตัวแปร",
    nameEn: "Variable Knight",
    role: "สายแทงก์ · อึดถึกทน",
    roleEn: "Tank · High Durability",
    description: "หัวใจแกร่ง 5 ดวง พร้อมโล่ป้องกันการตอบผิด ยืนหยัดได้นานที่สุดในดันเจี้ยน",
    sprite: hero({ h: "stoneLight", c: "wall", a: "gold", d: "stone", b: "stoneDark" }),
    stats: {
      maxHp: 5,
      initialMp: 2,
      maxMp: 5,
      mpRegenOnCorrect: 1,
      startingShield: 1,
      xpMultiplier: 1,
      coinMultiplier: 1,
      passiveName: "เกราะตัวแปร (Variable Armor)",
      passiveNameEn: "Variable Armor",
      passiveDesc: "เริ่มการต่อสู้พร้อมโล่ 1 ชั้น (ตอบผิดครั้งแรกไม่เสียหัวใจ)",
      passiveDescEn: "Starts battle with 1 Shield (blocks the first wrong answer damage).",
    },
    skills: [
      {
        id: "knight_syntax_guard",
        tier: 1,
        cooldownPhases: 1,
        name: "โล่ตรวจไวยากรณ์",
        nameEn: "Syntax Guard",
        mpCost: 1,
        description: "ตัดตัวเลือกผิด 1 ข้อ + เผยคำใบ้",
        descriptionEn: "Cut 1 wrong choice + Hint",
        icon: "bulb",
        accentColor: "#f6c945",
        effect: "hint_cut1",
      },
      {
        id: "knight_aegis_shield",
        tier: 2,
        cooldownPhases: 2,
        name: "เกราะสะท้อนค่า",
        nameEn: "Aegis Shield",
        mpCost: 2,
        description: "สร้างโล่ป้องกันดาเมจ +1 ชั้น",
        descriptionEn: "Gain +1 Shield charge",
        icon: "shield",
        accentColor: "#38bdf8",
        effect: "shield",
      },
      {
        id: "knight_logic_cleave",
        tier: 3,
        cooldownPhases: 3,
        name: "ดาบผ่าตรรกะ",
        nameEn: "Logic Cleave",
        mpCost: 4,
        description: "ตัดตัวเลือกผิด 2 ข้อ + เผยคำใบ้",
        descriptionEn: "Cut 2 wrong choices + Hint",
        icon: "sword",
        accentColor: "#f97316",
        effect: "cut2_hint",
      },
    ],
  },
  {
    key: "mage",
    name: "นักเวทลูป",
    nameEn: "Loop Mage",
    role: "สายเวท · มานาสูง ฟื้นไว",
    roleEn: "Caster · High MP & Regen",
    description: "คลังมานาใหญ่ 8 MP และฟื้น +2 MP ทุกครั้งที่ตอบถูก ร่ายสกิลไล่ลูปได้ต่อเนื่อง",
    sprite: hero({ h: "purpleDark", c: "purple", a: "torchHot", d: "purpleDark", b: "stoneDark" }),
    stats: {
      maxHp: 3,
      initialMp: 4,
      maxMp: 8,
      mpRegenOnCorrect: 2,
      startingShield: 0,
      xpMultiplier: 1,
      coinMultiplier: 1,
      passiveName: "กระแสลูป (Loop Conduit)",
      passiveNameEn: "Loop Conduit",
      passiveDesc: "ตอบถูกทุกครั้งฟื้นมานา +2 MP (2 เท่าของสายอื่น)",
      passiveDescEn: "Restores +2 MP on every correct answer (2x normal).",
    },
    skills: [
      {
        id: "mage_arcane_hint",
        tier: 1,
        cooldownPhases: 1,
        name: "ประกายมนตร์",
        nameEn: "Arcane Hint",
        mpCost: 1,
        description: "ตัดตัวเลือกผิด 1 ข้อ + เผยคำใบ้",
        descriptionEn: "Cut 1 wrong choice + Hint",
        icon: "bulb",
        accentColor: "#f6c945",
        effect: "hint_cut1",
      },
      {
        id: "mage_loop_trace",
        tier: 2,
        cooldownPhases: 2,
        name: "เนตรส่องลูป",
        nameEn: "Loop Trace Lens",
        mpCost: 2,
        description: "เปิดตารางไล่ค่าตัวแปรทีละบรรทัด",
        descriptionEn: "Step-by-step variable trace",
        icon: "eye",
        accentColor: "#38bdf8",
        effect: "trace",
      },
      {
        id: "mage_arcane_oracle",
        tier: 3,
        cooldownPhases: 3,
        name: "คำพยากรณ์อาร์เคน",
        nameEn: "Arcane Oracle",
        mpCost: 3,
        description: "จำลองผลรันจริง + ตัดตัวเลือกผิด 2 ข้อ",
        descriptionEn: "Reveal Output + Cut 2 wrong",
        icon: "sparkles",
        accentColor: "#c084fc",
        effect: "output_cut2",
      },
    ],
  },
  {
    key: "rogue",
    name: "นักล่าบั๊ก",
    nameEn: "Bug Hunter",
    role: "สายคริ · ฟาร์ม XP & ฮีลได้",
    roleEn: "Assassin · Bonus XP & Heal",
    description: "ล่าบั๊กแม่นยำ รับโบนัส +25% XP & Gold และมีท่าปิดฉากที่ช่วยฟื้นหัวใจได้",
    sprite: hero({ h: "stoneDark", c: "emeraldDark", a: "emerald", d: "stone", b: "outline" }),
    stats: {
      maxHp: 3,
      initialMp: 3,
      maxMp: 6,
      mpRegenOnCorrect: 1,
      startingShield: 0,
      xpMultiplier: 1.25,
      coinMultiplier: 1.25,
      passiveName: "ตาเหยี่ยว (Bug Sense)",
      passiveNameEn: "Bug Sense",
      passiveDesc: "ได้รับโบนัส +25% XP และ Gold เมื่อตอบคำถามถูกต้อง",
      passiveDescEn: "Earns +25% bonus XP and Gold on correct answers.",
    },
    skills: [
      {
        id: "rogue_quick_dagger",
        tier: 1,
        cooldownPhases: 1,
        name: "ปามีดตัดช้อยส์",
        nameEn: "Quick Dagger",
        mpCost: 1,
        description: "ตัดตัวเลือกที่ผิดออกทันที 1 ข้อ",
        descriptionEn: "Eliminate 1 wrong choice",
        icon: "sword",
        accentColor: "#2fbf71",
        effect: "cut1",
      },
      {
        id: "rogue_shadow_trace",
        tier: 2,
        cooldownPhases: 2,
        name: "เงาจำลองโค้ด",
        nameEn: "Shadow Trace",
        mpCost: 2,
        description: "เปิดตารางไล่ตัวแปร + ตัดตัวเลือกผิด 1 ข้อ",
        descriptionEn: "Variable trace + Cut 1 wrong",
        icon: "eye",
        accentColor: "#38bdf8",
        effect: "trace_cut1",
      },
      {
        id: "rogue_fatal_debug",
        tier: 3,
        cooldownPhases: 3,
        name: "ปิดฉากจุดตาย",
        nameEn: "Fatal Debug",
        mpCost: 3,
        description: "ตัดตัวเลือกผิด 2 ข้อ + ฟื้นฟู +1 ❤️",
        descriptionEn: "Cut 2 wrong + Heal +1 ❤️",
        icon: "heart",
        accentColor: "#ff4d6d",
        effect: "cut2_heal",
      },
    ],
  },
  {
    key: "ranger",
    name: "พรานข้อมูล",
    nameEn: "Data Ranger",
    role: "สายแม่นยำ · ส่อง Output ราคาถูก",
    roleEn: "Sniper · Cheap Output Scan",
    description: "สมดุลทั้ง 4 หัวใจและ 6 MP ส่องผลรันจริงของโค้ดได้ด้วยมานาเพียง 2 MP",
    sprite: hero({ h: "ember", c: "manaDark", a: "mana", d: "stone", b: "goldDark" }),
    stats: {
      maxHp: 4,
      initialMp: 3,
      maxMp: 6,
      mpRegenOnCorrect: 1,
      startingShield: 0,
      xpMultiplier: 1,
      coinMultiplier: 1,
      passiveName: "ศรแม่นยำ (Data Precision)",
      passiveNameEn: "Data Precision",
      passiveDesc: "สกิล Data Piercer เผยผลรันจริงได้ด้วย 2 MP (ประหยัดกว่าคลาสอื่น)",
      passiveDescEn: "Can reveal exact runtime output with Data Piercer for only 2 MP.",
    },
    skills: [
      {
        id: "ranger_target_hint",
        tier: 1,
        cooldownPhases: 1,
        name: "ส่องเป้า",
        nameEn: "Target Hint",
        mpCost: 1,
        description: "ตัดตัวเลือกผิด 1 ข้อ + เผยคำใบ้",
        descriptionEn: "Cut 1 wrong choice + Hint",
        icon: "bulb",
        accentColor: "#f6c945",
        effect: "hint_cut1",
      },
      {
        id: "ranger_data_piercer",
        tier: 2,
        cooldownPhases: 2,
        name: "ศรทะลุข้อมูล",
        nameEn: "Data Piercer",
        mpCost: 2,
        description: "เผยผลรันจริง (Output) ของโค้ด",
        descriptionEn: "Reveal exact Output (2 MP)",
        icon: "sparkles",
        accentColor: "#38bdf8",
        effect: "output",
      },
      {
        id: "ranger_oracle_barrage",
        tier: 3,
        cooldownPhases: 3,
        name: "ห่าฝนศรพิพากษา",
        nameEn: "Oracle Barrage",
        mpCost: 4,
        description: "เผยผลรัน + ตารางตัวแปร + ตัดผิด 2 ข้อ",
        descriptionEn: "Output + Trace + Cut 2 wrong",
        icon: "flame",
        accentColor: "#c084fc",
        effect: "full_oracle",
      },
    ],
  },
];

export const DEFAULT_AVATAR: AvatarKey = "knight";

export function getAvatar(key: string | null | undefined): AvatarDef {
  return AVATARS.find((a) => a.key === key) || AVATARS[0];
}

/** Small heart icon for the HUD (8x8). */
export const HEART_SPRITE: PixelSpriteDef = {
  rows: [
    ".oo..oo.",
    "orroorro",
    "orhrrrro",
    "orrrrrro",
    ".orrrro.",
    "..orro..",
    "...oo...",
    "........",
  ],
  colors: { o: "outline", r: "heart", h: "text" },
};

/** Coin icon for the HUD (8x8). */
export const COIN_SPRITE: PixelSpriteDef = {
  rows: [
    "..oooo..",
    ".oggggo.",
    "ogghggdo",
    "oghgggdo",
    "ogggggdo",
    "oggggddo",
    ".oddddo.",
    "..oooo..",
  ],
  colors: { o: "outline", g: "gold", h: "torchHot", d: "goldDark" },
};

/** 16x16 Slime Sprite (สไลม์โค้ด) */
export const SLIME_SPRITE: PixelSpriteDef = {
  rows: [
    "................",
    "................",
    "......oooo......",
    "....ooggggoo....",
    "...ogghhhhhgo...",
    "..oggghhhhhhdo..",
    ".oggoeoggoeogdo.",
    ".oggoeoggoeogdo.",
    ".oggghhhhhhggdo.",
    ".oggghhhhhhggdo.",
    ".oggddddddddgdo.",
    "..ogdddddddddo..",
    "...oogddddgoo...",
    "....oooooooo....",
    "................",
    "................",
  ],
  colors: {
    o: "outline",
    g: "emerald",
    h: "emerald",
    d: "emeraldDark",
    e: "outline",
  },
};

/** 16x16 Skeleton Sprite (โครงกระดูกโค้ดตกค้าง) */
export const SKELETON_SPRITE: PixelSpriteDef = {
  rows: [
    "................",
    ".....oooooo.....",
    "....obbbbbbo....",
    "...obbbbbbbbo...",
    "...oboeooeobo...",
    "...oboeooeobo...",
    "...obbbbbbbbo...",
    "....obobobbo....",
    ".....oooooo.....",
    "....oobbbboo....",
    "...obobbbobbo...",
    "...ob.obbo.bo...",
    "...oo.obbo.oo...",
    "......obbo......",
    ".....ob..bo.....",
    ".....oo..oo.....",
  ],
  colors: {
    o: "outline",
    b: "bone",
    e: "blood",
  },
};

/** 16x16 Goblin Sprite (ก็อบลินลักบั๊ก) */
export const GOBLIN_SPRITE: PixelSpriteDef = {
  rows: [
    "................",
    "...o........o...",
    "..ogo......ogo..",
    ".ogggoooooogggo.",
    ".ogggeeeeegggo..",
    "..oogereeregoo..",
    "...ogeeeeeggo...",
    "...oggttteggo...",
    "....ogggggego...",
    "...ooccccccdo...",
    "..occddccdddco..",
    "..oc..cccc..co..",
    "..oo..cccc..oo..",
    "......cddc......",
    ".....oc..co.....",
    ".....oo..oo.....",
  ],
  colors: {
    o: "outline",
    g: "purpleDark",
    e: "purple",
    r: "blood",
    t: "bone",
    c: "ember",
    d: "blood",
  },
};

/** 16x16 Boss Sprite (บอสจอมมารลูปไม่สิ้นสุด) */
export const BOSS_SPRITE: PixelSpriteDef = {
  rows: [
    ".oo..........oo.",
    ".ohooooooooooho.",
    ".ohhhoo..oohhho.",
    "..ohheoooehho...",
    "...oheeeeehho...",
    "..oheereereeho..",
    "..oheeoeeoeeho..",
    "...oheeeeehho...",
    "..oocccccccccoo.",
    ".occcghhhhgccco.",
    ".occcghhhhgccco.",
    "..occcggggccco..",
    "..occcddddccco..",
    "...occ....cco...",
    "...obb....bbo...",
    "...oooo..oooo...",
  ],
  colors: {
    o: "outline",
    h: "torchHot",
    e: "blood",
    r: "gold",
    c: "purpleDark",
    g: "purple",
    d: "stoneDark",
    b: "wall",
  },
};

/** 16x16 Chest Closed Sprite */
export const CHEST_CLOSED_SPRITE: PixelSpriteDef = {
  rows: [
    "................",
    "................",
    "....oooooooo....",
    "..oowwwwwwwwoog.",
    ".owwwwggggwwwwog",
    ".owwwgghhggwwwog",
    ".owwwwwggggwwwog",
    ".oooooooooooooog",
    ".owwwwwggggwwwog",
    ".owwwwghhhgwwwog",
    ".owwwwghhhgwwwog",
    ".owwwwwggggwwwog",
    ".owwwwwwwwwwwwog",
    ".owwwwwwwwwwwwog",
    "..oooooooooooo..",
    "................",
  ],
  colors: {
    o: "outline",
    w: "goldDark",
    g: "gold",
    h: "torchHot",
  },
};

/** 16x16 Chest Opened Sprite */
export const CHEST_OPEN_SPRITE: PixelSpriteDef = {
  rows: [
    "....oooooooo....",
    "..oowwwwwwwwoog.",
    ".owwwwggggwwwwog",
    ".oooooooooooooog",
    "...ovvvvvvvvo...",
    "...ovvvvvvvvo...",
    ".oooooooooooooog",
    ".owwwgghhggwwwog",
    ".owwwwggggwwwwog",
    ".owwwwwwwwwwwwog",
    ".owwwwwggggwwwog",
    ".owwwwwwwwwwwwog",
    "..oooooooooooo..",
    "................",
    "................",
    "................",
  ],
  colors: {
    o: "outline",
    w: "goldDark",
    g: "gold",
    h: "torchHot",
    v: "stoneDark",
  },
};

/** 16x16 Torch Sprite (flickering flame on wooden mount) */
export const TORCH_SPRITE: PixelSpriteDef = {
  rows: [
    "................",
    ".......hh.......",
    "......hhhh......",
    ".....hhttth.....",
    ".....htffth.....",
    ".....httfth.....",
    "......htth......",
    ".......tt.......",
    "......oooo......",
    "......owwo......",
    "......owwo......",
    "......owwo......",
    "......owwo......",
    "......oooo......",
    "................",
    "................",
  ],
  colors: {
    o: "outline",
    h: "torchHot",
    t: "torch",
    f: "ember",
    w: "stoneDark",
  },
};

/** 16x16 Door Sprite (stone portal with arcane arch) */
export const DOOR_SPRITE: PixelSpriteDef = {
  rows: [
    "...oooooooooo...",
    "..owwwwwwwwwwd..",
    ".owwsssssssswwd.",
    ".ows.oooooo.swd.",
    "owsoovvvvvvooswd",
    "owsovpvvvvpooswd",
    "owsovpvvvvpooswd",
    "owsovpvvvvpooswd",
    "owsovvvvvvvvoswd",
    "owsovpvvvvpooswd",
    "owsovpvvvvpooswd",
    "owsovpvvvvpooswd",
    "owsoovvvvvvooswd",
    "owsssoooooossswd",
    "owwwwwwwwwwwwwwd",
    ".dddddddddddddd.",
  ],
  colors: {
    o: "outline",
    w: "wall",
    s: "stoneLight",
    d: "stoneDark",
    v: "void",
    p: "purple",
  },
};

