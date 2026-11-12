import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

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
    <html
      lang="th"
      suppressHydrationWarning
      className={`${notoSansThai.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('explain_code_theme');var d=false;if(s==='dark'){d=true;}else if(s==='light'){d=false;}else{d=window.matchMedia('(prefers-color-scheme: dark)').matches;}if(d){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--ink)] selection:bg-[#0f766e]/30 selection:text-white transition-colors duration-150">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
