/**
 * Deterministic seeding helpers so each course always generates the same
 * dungeon layout without teachers having to draw maps.
 */

/** FNV-1a 32-bit string hash. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — returns a function yielding floats in [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAME_PREFIX = ["ถ้ำ", "หอคอย", "สุสาน", "วิหาร", "เหมือง", "ป้อม"];
const NAME_SUFFIX = [
  "แห่งตัวแปร",
  "แห่งลูปนิรันดร์",
  "แห่งเงื่อนไข",
  "แห่งบั๊กโบราณ",
  "แห่งฟังก์ชัน",
  "แห่งข้อมูลลับ",
];

/** Stable, flavorful dungeon name derived from the course id. */
export function dungeonNameForCourse(courseId: string): string {
  const rng = createRng(hashString(courseId));
  const prefix = NAME_PREFIX[Math.floor(rng() * NAME_PREFIX.length)];
  const suffix = NAME_SUFFIX[Math.floor(rng() * NAME_SUFFIX.length)];
  return `${prefix}${suffix}`;
}
