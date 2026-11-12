/**
 * Single source of truth for the dungeon pixel palette (26 colors).
 * Used by canvas renderers (sprites/tiles) and exposed as CSS variables
 * (--dg-<key>) for the React UI overlay under `.dungeon-theme`.
 */
export const DUNGEON_PALETTE = {
  void: "#0b0b14",
  outline: "#120f1c",
  stoneDark: "#1c1b2b",
  stone: "#2f2d45",
  stoneLight: "#4a4766",
  wall: "#5c5470",
  floor: "#3b3550",
  floorLight: "#524a6b",
  skin: "#f2c79b",
  skinShadow: "#c98d63",
  torch: "#ffb347",
  torchHot: "#ffe27a",
  ember: "#e25822",
  blood: "#c0283a",
  heart: "#ff4d6d",
  gold: "#f6c945",
  goldDark: "#b8860b",
  emerald: "#2fbf71",
  emeraldDark: "#1a7a4a",
  mana: "#4da3ff",
  manaDark: "#2b5fb3",
  purple: "#9b5de5",
  purpleDark: "#5a2d91",
  bone: "#e8e1cf",
  text: "#f4efe6",
  muted: "#9a93ad",
} as const;

export type PaletteKey = keyof typeof DUNGEON_PALETTE;

/** Converts the palette into CSS custom properties, e.g. --dg-gold. */
export function paletteCssVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  (Object.keys(DUNGEON_PALETTE) as PaletteKey[]).forEach((key) => {
    const kebab = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    vars[`--dg-${kebab}`] = DUNGEON_PALETTE[key];
  });
  return vars;
}
