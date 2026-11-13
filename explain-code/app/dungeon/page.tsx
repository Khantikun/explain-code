"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUiLanguage } from "../components/LanguageProvider";

export default function DungeonRedirectPage() {
  const router = useRouter();
  const { t } = useUiLanguage();

  useEffect(() => {
    router.replace("/courses");
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="retro-panel rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-4">
        <p className="pixel-font text-xs text-[#ffe27a]">REDIRECTING...</p>
        <h1 className="text-lg font-extrabold text-[#f4efe6]">
          {t(
            "กำลังพาไปยังดันเจี้ยนการเรียนรู้",
            "Entering Learning Dungeon"
          )}
        </h1>
        <p className="text-xs text-[#c4bdd6]">
          {t(
            "เลือกภาษาโปรแกรมก่อนเข้าสู่ดันเจี้ยน",
            "Choose your programming language to begin."
          )}
        </p>
        <Link
          href="/courses"
          className="retro-button inline-flex items-center justify-center rounded-xl bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] px-5 py-2.5 text-xs font-extrabold"
        >
          {t("ไปหน้าเลือกภาษา →", "Go to Language Picker →")}
        </Link>
      </div>
    </div>
  );
}
