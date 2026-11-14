"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login?mode=register");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0d0b14] flex items-center justify-center p-6 text-sm font-bold text-[#ffe27a]">
      กำลังพาไปยังหน้าสมัครสมาชิก (PDPA Safe Registration)...
    </div>
  );
}
