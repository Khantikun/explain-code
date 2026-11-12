import type { Metadata } from "next";
import { Silkscreen } from "next/font/google";
import { paletteCssVars } from "../lib/dungeon/palette";

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ดันเจี้ยนอ่านโค้ด (Dungeon Crawler) · โค้ดนี้ฉันอธิบายได้",
  description:
    "เกมดันเจี้ยนพิกเซลอาร์ต ผจญภัยผ่านบทเรียน ปราบมอนสเตอร์ด้วยการตอบคำถาม Block Model และแก้ปริศนาโค้ด",
};

export default function DungeonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cssVars = paletteCssVars();

  return (
    <div
      className={`${silkscreen.variable} dungeon-theme min-h-screen bg-[#0b0b14] text-[#f4efe6] selection:bg-[#9b5de5] selection:text-white flex flex-col`}
      style={cssVars as React.CSSProperties}
    >
      {children}
    </div>
  );
}
