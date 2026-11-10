import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "โค้ดนี้ฉันอธิบายได้ · ฝึกอ่านโค้ด JavaScript ตาม Block Model",
  description:
    "เว็บแอปฝึกอ่านโค้ด JavaScript ตาม Block Model 12 ช่อง ในรูปแบบเกม (อิงลำดับ PRIMM) ช่วยให้นักเรียนที่เขียนโค้ดด้วย AI ได้ อธิบายได้ด้วยว่าโค้ดนั้นทำงานอย่างไร",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#eef3f1] text-[#1b2a2f] selection:bg-[#0f766e]/20 selection:text-[#0b4f49]">
        {children}
      </body>
    </html>
  );
}
