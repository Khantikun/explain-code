import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DuckVibe X-Ray | เขียนโค้ดได้ ต้องอธิบายเป็น",
  description:
    "แพลตฟอร์มผ่าตัดโค้ดด้วย X-Ray Visualizer + ห้องสืบสวนเป็ดยาง AI + โหมดวางยาโค้ด สำหรับเปลี่ยนคนที่ก๊อปโค้ดให้เข้าใจโค้ดอย่างถ่องแท้",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#070913] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
