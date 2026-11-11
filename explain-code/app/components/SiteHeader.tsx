"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icons";
import { TeacherApprovalStatus, UserRole } from "../lib/supabase";

export const STORAGE_SESSION_KEY = "explain_code_auth_session_v2";

export interface ClientAuthSession {
  role: UserRole;
  userId: string;
  username: string;
  displayName?: string;
  roomCode?: string;
  teacherStatus?: TeacherApprovalStatus;
}

export function getClientSession(): ClientAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setClientSession(session: ClientAuthSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
    window.dispatchEvent(new Event("explain-code-auth-change"));
  } catch {
    // ignore
  }
}

interface SiteHeaderProps {
  onOpenClassicPortal?: () => void;
}

export function SiteHeader({ onOpenClassicPortal }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSession(getClientSession());

    const handleStorageChange = () => {
      setSession(getClientSession());
    };
    window.addEventListener("explain-code-auth-change", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener(
        "explain-code-auth-change",
        handleStorageChange
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      // ignore network error
    }
    setClientSession(null);
    setSession(null);
    router.push("/");
    router.refresh();
  };

  const navItems = [
    { href: "/", label: "หน้าแรก" },
    { href: "/courses", label: "การเรียนรู้ (คอร์ส)" },
    { href: "/explain", label: "อธิบายโค้ด" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#e5dfd3] bg-[#faf8f4]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a4d3e] text-white shadow-sm transition-transform group-hover:scale-105">
              <Icon name="code" className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-[#1e1e1c]">
                โค้ดนี้ฉันอธิบายได้
              </span>
              <span className="block text-[11px] font-medium text-[#6e6a63]">
                Open Learning &amp; Code Explanation
              </span>
            </div>
          </Link>

          {/* Main Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-[#e8f0ec] text-[#2a4d3e]"
                      : "text-[#524f49] hover:bg-[#f2efe8] hover:text-[#1e1e1c]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {onOpenClassicPortal && (
              <button
                type="button"
                onClick={onOpenClassicPortal}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-[#524f49] hover:bg-[#f2efe8] hover:text-[#1e1e1c] transition-colors"
              >
                ฝึกเควสต์ PRIMM (12 ช่อง)
              </button>
            )}
          </nav>
        </div>

        {/* Right Side: User Auth Status */}
        <div className="flex items-center gap-2.5">
          {mounted && session ? (
            <div className="flex flex-wrap items-center gap-2">
              {session.role === "student" && (
                <Link
                  href="/my-learning"
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    pathname.startsWith("/my-learning")
                      ? "bg-[#2a4d3e] text-white"
                      : "border border-[#d8d1c5] bg-white text-[#2a4d3e] hover:bg-[#f2efe8]"
                  }`}
                >
                  การเรียนของฉัน
                </Link>
              )}

              {(session.role === "teacher" || session.role === "admin") && (
                <Link
                  href="/teacher"
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    pathname.startsWith("/teacher")
                      ? "bg-[#2a4d3e] text-white"
                      : "border border-[#d8d1c5] bg-white text-[#2a4d3e] hover:bg-[#f2efe8]"
                  }`}
                >
                  แดชบอร์ดครู
                </Link>
              )}

              <Link
                href="/my-history"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  pathname.startsWith("/my-history")
                    ? "bg-[#2a4d3e] text-white"
                    : "border border-[#d8d1c5] bg-white text-[#524f49] hover:bg-[#f2efe8]"
                }`}
              >
                ประวัติของฉัน
              </Link>

              {/* User Badge */}
              <div className="flex items-center gap-2 rounded-xl border border-[#e5dfd3] bg-white px-3 py-1.5 shadow-2xs">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f0ec] text-xs font-bold text-[#2a4d3e]">
                  {(session.displayName || session.username || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-[#1e1e1c]">
                    {session.displayName || session.username}
                  </p>
                  <p className="text-[10px] font-medium text-[#6e6a63]">
                    {session.role === "teacher"
                      ? session.teacherStatus === "pending"
                        ? "ครูผู้สอน (รออนุมัติ)"
                        : "ครูผู้สอน"
                      : session.role === "admin"
                      ? "ผู้ดูแลระบบ"
                      : "นักเรียน"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5dfd3] bg-white px-3 py-2 text-xs font-semibold text-[#991b1b] hover:bg-[#fef2f2] transition-colors cursor-pointer"
                title="ออกจากระบบ"
              >
                <Icon name="logout" className="h-3.5 w-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2a4d3e] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#1f3b2f] transition-colors"
              >
                <Icon name="user" className="h-4 w-4" />
                <span>เข้าสู่ระบบ / สมัครสมาชิก</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden items-center gap-2 border-t border-[#ece7dc] px-4 py-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold ${
                isActive
                  ? "bg-[#e8f0ec] text-[#2a4d3e]"
                  : "text-[#524f49] hover:bg-[#f2efe8]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
