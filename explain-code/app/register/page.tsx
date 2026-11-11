"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login?mode=register");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-6 text-sm text-[#6e6a63]">
      กำลังพาไปยังหน้าสมัครสมาชิก...
    </div>
  );
}
