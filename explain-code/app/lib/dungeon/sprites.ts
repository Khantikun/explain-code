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

export interface AvatarDef {
  key: AvatarKey;
  name: string;
  description: string;
  sprite: PixelSpriteDef;
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
    description: "หัวใจแกร่ง ยืนหยัดได้นานในห้องมอนสเตอร์",
    sprite: hero({ h: "stoneLight", c: "wall", a: "gold", d: "stone", b: "stoneDark" }),
  },
  {
    key: "mage",
    name: "นักเวทลูป",
    description: "เชี่ยวชาญการไล่ค่าในลูปและฟังก์ชัน",
    sprite: hero({ h: "purpleDark", c: "purple", a: "torchHot", d: "purpleDark", b: "stoneDark" }),
  },
  {
    key: "rogue",
    name: "นักล่าบั๊ก",
    description: "ว่องไว ตาไวจับบั๊กในโค้ดได้ก่อนใคร",
    sprite: hero({ h: "stoneDark", c: "emeraldDark", a: "emerald", d: "stone", b: "outline" }),
  },
  {
    key: "ranger",
    name: "พรานข้อมูล",
    description: "แม่นยำ เล็งเป้าคำตอบจาก SQL และข้อมูล",
    sprite: hero({ h: "ember", c: "manaDark", a: "mana", d: "stone", b: "goldDark" }),
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

