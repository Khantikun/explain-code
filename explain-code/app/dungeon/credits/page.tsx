import React from "react";
import Link from "next/link";

export default function DungeonCreditsPage() {
  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-[#2f2d45] pb-4">
        <Link
          href="/dungeon"
          className="retro-button px-3.5 py-1.5 rounded-lg bg-[#252238] hover:bg-[#322c4a] text-xs font-bold text-[#f4efe6] transition-colors"
        >
          ← กลับหน้าฮับดันเจี้ยน
        </Link>
        <span className="pixel-font text-xs text-[#f6c945]">CREDITS &amp; LICENSES</span>
      </div>

      <div className="retro-panel rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#f4efe6] flex items-center gap-3">
            <span>รายการทรัพย์สินและสิทธิ์การใช้งาน (Credits)</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#9a93ad] mt-1">
            Dungeon Crawler โหมดการเรียนรู้ของ &ldquo;โค้ดนี้ฉันอธิบายได้&rdquo; พัฒนาขึ้นโดยเคารพลิขสิทธิ์และสิทธิ์ทรัพย์สินทางปัญญา 100%
          </p>
        </div>

        <section className="space-y-2 border-t border-[#2f2d45] pt-4">
          <h2 className="text-sm font-bold text-[#ffe27a] pixel-font">
            1. PIXEL ART SPRITES &amp; TILES (CC0 1.0 UNIVERSAL)
          </h2>
          <p className="text-xs text-[#f4efe6] leading-relaxed">
            ภาพสไปรต์ตัวละคร (Knight, Mage, Rogue, Ranger), มอนสเตอร์, บอส, แผ่นกระเบื้องพื้น กำแพง ประตู คบเพลิง และไอคอน HUD
            วาดขึ้นด้วยโค้ดโดยตรง (Code-Drawn Vector Pixel Matrices) ในไฟล์ <code className="text-[#ffe27a]">app/lib/dungeon/sprites.ts</code> และเผยแพร่แบบ Creative Commons Zero (CC0 1.0 Universal) ไม่มีการดึงภาพมีลิขสิทธิ์จากเกมอื่น
          </p>
        </section>

        <section className="space-y-2 border-t border-[#2f2d45] pt-4">
          <h2 className="text-sm font-bold text-[#ffe27a] pixel-font">
            2. COLOR PALETTE (26-COLOR DUNGEON PALETTE)
          </h2>
          <p className="text-xs text-[#f4efe6] leading-relaxed">
            ชุดสี 26 สีอิงมาตรฐานการออกแบบพิกเซลความคมชัดสูง (ดัดแปลงจากหลักการของ EDG 32)
            ออกแบบให้มีคอนทราสต์ชัดเจน มองเห็นง่ายบนจอมือถือและจอเดสก์ท็อป กำหนดเป็น Design Token ตัวแปรเดียวใน <code className="text-[#ffe27a]">app/lib/dungeon/palette.ts</code>
          </p>
        </section>

        <section className="space-y-2 border-t border-[#2f2d45] pt-4">
          <h2 className="text-sm font-bold text-[#ffe27a] pixel-font">
            3. FONTS (SIL OPEN FONT LICENSE 1.1)
          </h2>
          <ul className="text-xs text-[#f4efe6] space-y-2 list-disc list-inside">
            <li>
              <strong>Noto Sans Thai</strong> (Google Fonts / OFL 1.1): ใช้แสดงข้อความคำถามภาษาไทย เนื้อหาบทเรียน และคำอธิบาย เพื่อให้อ่านง่ายถูกต้องตามหลักสรีรศาสตร์การอ่าน
            </li>
            <li>
              <strong>Silkscreen</strong> โดย Jason Kottke (Google Fonts / OFL 1.1): ใช้แสดงหัวข้อภาษาอังกฤษ ตัวเลข และสถิติ HUD สไตล์เรโทร
            </li>
          </ul>
        </section>

        <section className="space-y-2 border-t border-[#2f2d45] pt-4">
          <h2 className="text-sm font-bold text-[#ffe27a] pixel-font">
            4. AUDIO SYNTHESIZER
          </h2>
          <p className="text-xs text-[#f4efe6] leading-relaxed">
            เสียงเอฟเฟกต์สร้างผ่าน HTML5 Web Audio API ด้วยคลื่นเสียงสังเคราะห์ (Square / Triangle wave chiptune) ในโค้ดโดยตรง ไม่ใช้ไฟล์เสียง MP3/WAV ภายนอก และเริ่มต้นปิดเสียง (Muted) ตามมาตรฐานความพึงพอใจของผู้ใช้
          </p>
        </section>
      </div>
    </div>
  );
}
