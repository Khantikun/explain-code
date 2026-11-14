import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { LanguageProvider } from "./components/LanguageProvider";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "โค้ดนี้ฉันอธิบายได้ · ฝึกอ่านโค้ด JavaScript ตาม Block Model",
  description:
    "เว็บแอปฝึกอ่านโค้ด JavaScript ตาม Block Model 12 ช่อง ในรูปแบบเกม (อิงลำดับ PRIMM) ช่วยให้นักเรียนที่เขียนโค้ดด้วย AI ได้ อธิบายได้ด้วยว่าโค้ดนั้นทำงานอย่างไร",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      data-theme="dark"
      suppressHydrationWarning
      className={`${notoSansThai.variable} dark h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');try{localStorage.setItem('explain_code_theme','dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--ink)] selection:bg-[#0f766e]/30 selection:text-white transition-colors duration-150">
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
