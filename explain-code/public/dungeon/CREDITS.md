# Dungeon Crawler Asset & Library Credits

This document tracks all external and internal assets, fonts, palettes, and libraries used by the Pixel Art Dungeon Crawler educational mode in "โค้ดนี้ฉันอธิบายได้".

## 1. Code-Drawn Pixel Art (CC0 1.0 Universal)
- **Author**: Antigravity Assistant & Project Maintainers
- **License**: Creative Commons Zero v1.0 Universal (Public Domain Dedication)
- **Files**:
  - `app/lib/dungeon/sprites.ts`
  - `app/lib/dungeon/palette.ts`
  - `app/lib/dungeon/mapgen.ts`
- **Description**:
  All character avatars (`knight`, `mage`, `rogue`, `ranger`), dungeon monsters (`slime`, `goblin`, `skeleton`, `beholder`), boss sprites, floor/wall/door/torch/chest tiles, and HUD icons (hearts, coins) are procedurally drawn or defined directly via code-based color maps. No copyrighted or proprietary game assets from third parties are included.

## 2. Color Palette (Endesga 32 & Custom 26-Color Dungeon Token Set)
- **Inspiration**: EDG 32 by Edan Straw (CC0 / Public Domain)
- **Implementation**: Adapted into a 26-color high-contrast palette in `DUNGEON_PALETTE` (`palette.ts`) designed for accessibility and high visibility on both dark dungeon floors and mobile OLED screens.

## 3. Fonts
- **Noto Sans Thai**: Google Fonts / SIL Open Font License 1.1 (Used for readable Thai question text, story dialogues, explanations, and instructions).
- **Silkscreen**: Designed by Jason Kottke, distributed via Google Fonts under SIL Open Font License 1.1 (Used exclusively for English retro headings, HUD integers, stats, levels, and XP counters).

## 4. Audio & Sound Effects
- **Synthesizer**: Procedural HTML5 Web Audio API 8-bit chip synth (sine, square, triangle wave beeps and frequency ramps) implemented in code (`app/lib/dungeon/sound.ts`).
- **Policy**: Muted by default until user interaction. User preference is preserved in `localStorage`.
