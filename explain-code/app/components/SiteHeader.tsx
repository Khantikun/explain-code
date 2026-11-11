"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icons";
import { GlassPanel } from "./GlassPanel";
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
    // ignore storage errors
  }
}

interface SiteHeaderProps {
  onOpenClassicPortal?: () => void;
}

interface ActiveCapsuleStyle {
  left: number;
  width: number;
  opacity: number;
}

export function SiteHeader({ onOpenClassicPortal }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPillPulsing, setIsPillPulsing] = useState(false);

  // Refs for sliding glass active indicator and outside-click detection
  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const navItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const [capsuleStyle, setCapsuleStyle] = useState<ActiveCapsuleStyle>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const navItems = useMemo(
    () => [
      { href: "/", label: "หน้าแรก" },
      { href: "/courses", label: "การเรียนรู้" },
      { href: "/explain", label: "อธิบายโค้ด" },
    ],
    []
  );

  // Sync auth session state across tabs and events
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

  // Track window scroll position to shrink navbar and increase glass opacity
  useEffect(() => {
    const handleScroll = () => {
      const scrolledNow = window.scrollY > 18;
      setIsScrolled((prev) => (prev !== scrolledNow ? scrolledNow : prev));
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate active navigation item position for the sliding glass capsule
  const updateActiveCapsule = useCallback(() => {
    const activeItem = navItems.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    );

    if (!activeItem || !navContainerRef.current) {
      setCapsuleStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    const activeEl = navItemRefs.current[activeItem.href];
    if (!activeEl) {
      setCapsuleStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    setCapsuleStyle({
      left: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
      opacity: 1,
    });
  }, [navItems, pathname]);

  useEffect(() => {
    updateActiveCapsule();
    window.addEventListener("resize", updateActiveCapsule);
    return () => window.removeEventListener("resize", updateActiveCapsule);
  }, [updateActiveCapsule, mounted]);

  // Close menus on route change
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Handle Escape key and click outside for user dropdown & mobile sheet
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
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

  const getRoleLabel = (user: ClientAuthSession) => {
    if (user.role === "teacher") {
      return user.teacherStatus === "pending"
        ? "ครูผู้สอน (รออนุมัติ)"
        : "ครูผู้สอน";
    }
    if (user.role === "admin") {
      return "ผู้ดูแลระบบ";
    }
    return "นักเรียน";
  };

  return (
    <header
      className={`sticky z-50 mx-auto w-full max-w-6xl px-3 sm:px-6 transition-all duration-300 ${
        isScrolled ? "top-2 pt-1" : "top-3 sm:top-4 pt-1.5"
      }`}
    >
      <GlassPanel
        as="div"
        elevated={isScrolled}
        rounded="2xl"
        className={`px-3.5 sm:px-5 ${
          isScrolled ? "py-2" : "py-2.5 sm:py-3"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left: Brand Logo */}
          <div className="flex flex-1 items-center justify-start">
            <Link
              href="/"
              aria-label="โค้ดนี้ฉันอธิบายได้ หน้าแรก"
              className="flex items-center gap-3 group rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
            >
              <div
                className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-[#2a4d3e] to-[#0f766e] text-white shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md ${
                  isScrolled ? "h-9 w-9" : "h-10 w-10"
                }`}
              >
                <Icon name="code" className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <span className="block text-sm sm:text-base font-extrabold tracking-tight text-[#14221e]">
                  โค้ดนี้ฉันอธิบายได้
                </span>
                <span className="hidden sm:block text-[11px] font-semibold text-[#4a5d57]">
                  Open Learning &amp; Code Explanation
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation Pill Track with Sliding Glass Indicator */}
          <nav
            ref={navContainerRef}
            aria-label="เมนูหลัก"
            className="relative hidden md:flex items-center justify-center gap-1 rounded-full bg-[#0b4f49]/10 p-1.5 border border-[#0f766e]/25 shadow-inner shrink-0"
          >
            {/* Sliding Active Glass Capsule */}
            <span
              aria-hidden="true"
              className={`liquid-glass-active-pill pointer-events-none absolute left-0 top-1.5 bottom-1.5 rounded-full ${
                isPillPulsing ? "liquid-pill-Squish" : ""
              }`}
              style={{
                transform: `translateX(${capsuleStyle.left}px)`,
                width: `${capsuleStyle.width}px`,
                opacity: capsuleStyle.opacity,
              }}
            />

            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={(el) => {
                    navItemRefs.current[item.href] = el;
                  }}
                  onClick={() => {
                    setIsPillPulsing(false);
                    window.requestAnimationFrame(() =>
                      setIsPillPulsing(true)
                    );
                    window.setTimeout(() => setIsPillPulsing(false), 380);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`liquid-press relative z-10 rounded-full px-4 py-1.5 text-sm font-extrabold tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] ${
                    isActive
                      ? "liquid-active-nav-item text-white"
                      : "text-[#062e2b] hover:text-[#032220] hover:bg-[#0f766e]/15"
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 rounded-full bg-[#f6b73c] shadow-[0_0_8px_#f6b73c]"
                      />
                    )}
                    <span>{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Auth Controls & Mobile Hamburger Trigger */}
          <div className="flex flex-1 items-center justify-end gap-2">
            {mounted && session ? (
              <div className="flex items-center gap-2">
                {/* Role Quick Link on Desktop */}
                {session.role === "student" && (
                  <Link
                    href="/my-learning"
                    className={`hidden lg:inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] ${
                      pathname.startsWith("/my-learning")
                        ? "liquid-glass-primary-btn"
                        : "liquid-glass-btn text-[#1b3b32]"
                    }`}
                  >
                    <Icon name="award" className="h-3.5 w-3.5" />
                    <span>การเรียนของฉัน</span>
                  </Link>
                )}

                {(session.role === "teacher" || session.role === "admin") && (
                  <Link
                    href="/teacher"
                    className={`hidden lg:inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] ${
                      pathname.startsWith("/teacher")
                        ? "liquid-glass-primary-btn"
                        : "liquid-glass-btn text-[#1b3b32]"
                    }`}
                  >
                    <Icon name="users" className="h-3.5 w-3.5" />
                    <span>แดชบอร์ดครู</span>
                  </Link>
                )}

                {/* User Profile Pill & Glass Dropdown Menu */}
                <div ref={userMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="menu"
                    aria-label="เมนูบัญชีผู้ใช้"
                    className="liquid-glass-btn flex items-center gap-2.5 rounded-full py-1 pl-1.5 pr-3 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#2a4d3e] to-[#0f766e] text-xs font-extrabold text-white shadow-2xs">
                      {(session.displayName || session.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="hidden sm:block leading-tight">
                      <p className="max-w-[120px] truncate text-xs font-extrabold text-[#14221e]">
                        {session.displayName || session.username}
                      </p>
                      <p className="text-[10px] font-semibold text-[#4a5d57]">
                        {getRoleLabel(session)}
                      </p>
                    </div>
                    <Icon
                      name="chevron-down"
                      className={`h-3.5 w-3.5 text-[#3d4d48] transition-transform duration-200 ${
                        isUserMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Liquid Glass User Dropdown */}
                  {isUserMenuOpen && (
                    <div
                      role="menu"
                      aria-label="ตัวเลือกบัญชีผู้ใช้"
                      className="liquid-glass liquid-glass-scrolled absolute right-0 mt-2.5 w-60 rounded-2xl p-2 z-50 origin-top-right animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="border-b border-[#d8e3e0]/80 px-3 py-2.5 mb-1">
                        <p className="truncate text-xs font-extrabold text-[#14221e]">
                          {session.displayName || session.username}
                        </p>
                        <p className="text-[11px] font-semibold text-[#0f766e]">
                          บทบาท: {getRoleLabel(session)}
                        </p>
                      </div>

                      {session.role === "student" && (
                        <Link
                          href="/my-learning"
                          role="menuitem"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#14221e] hover:bg-white/75 transition-colors focus-visible:outline-2 focus-visible:outline-[#0f766e]"
                        >
                          <Icon name="award" className="h-4 w-4 text-[#0f766e]" />
                          <span>การเรียนของฉัน</span>
                        </Link>
                      )}

                      {(session.role === "teacher" ||
                        session.role === "admin") && (
                        <Link
                          href="/teacher"
                          role="menuitem"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#14221e] hover:bg-white/75 transition-colors focus-visible:outline-2 focus-visible:outline-[#0f766e]"
                        >
                          <Icon name="users" className="h-4 w-4 text-[#0f766e]" />
                          <span>แดชบอร์ดครู</span>
                        </Link>
                      )}

                      <Link
                        href="/my-history"
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#14221e] hover:bg-white/75 transition-colors focus-visible:outline-2 focus-visible:outline-[#0f766e]"
                      >
                        <Icon name="clock" className="h-4 w-4 text-[#0f766e]" />
                        <span>ประวัติของฉัน</span>
                      </Link>

                      <div className="my-1 border-t border-[#d8e3e0]/80" />

                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#991b1b] hover:bg-[#fef2f2]/90 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#991b1b]"
                      >
                        <Icon name="logout" className="h-4 w-4" />
                        <span>ออกจากระบบ</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Unauthenticated: Secondary Glass Button + Primary Gradient Button */
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="liquid-glass-btn liquid-press hidden sm:inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold text-[#0b4f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
                >
                  <span>เข้าสู่ระบบ</span>
                </Link>
                <Link
                  href="/login?mode=register"
                  className="liquid-glass-primary-btn liquid-press inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
                >
                  <Icon name="user" className="h-3.5 w-3.5" />
                  <span className="sm:hidden">เข้าสู่ระบบ / สมัคร</span>
                  <span className="hidden sm:inline">สมัครสมาชิก</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "ปิดเมนูนำทาง" : "เปิดเมนูนำทาง"}
              className="liquid-glass-btn inline-flex md:hidden h-9 w-9 items-center justify-center rounded-full text-[#14221e] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
            >
              <Icon
                name={isMobileMenuOpen ? "close" : "menu"}
                className="h-4 w-4"
              />
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* Mobile Glass Navigation Sheet (Single backdrop-filter layer for mobile performance) */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-label="เมนูนำทางบนมือถือ"
          className="liquid-glass liquid-glass-scrolled md:hidden mt-2 rounded-2xl p-3 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`liquid-press flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-extrabold ${
                  isActive
                    ? "liquid-active-nav-item text-white shadow-2xs"
                    : "text-[#14221e] hover:bg-white/70"
                }`}
              >
                <span>{item.label}</span>
                {isActive && <span className="text-[10px]">●</span>}
              </Link>
            );
          })}

          {mounted && session ? (
            <div className="border-t border-[#cfe0dc]/80 pt-2 mt-2 space-y-1">
              {session.role === "student" && (
                <Link
                  href="/my-learning"
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold text-[#0b4f49] hover:bg-white/70"
                >
                  <Icon name="award" className="h-4 w-4" />
                  <span>การเรียนของฉัน</span>
                </Link>
              )}
              {(session.role === "teacher" || session.role === "admin") && (
                <Link
                  href="/teacher"
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold text-[#0b4f49] hover:bg-white/70"
                >
                  <Icon name="users" className="h-4 w-4" />
                  <span>แดชบอร์ดครู</span>
                </Link>
              )}
              <Link
                href="/my-history"
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold text-[#14221e] hover:bg-white/70"
              >
                <Icon name="clock" className="h-4 w-4" />
                <span>ประวัติของฉัน</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold text-[#991b1b] hover:bg-[#fef2f2]"
              >
                <Icon name="logout" className="h-4 w-4" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          ) : (
            <div className="border-t border-[#cfe0dc]/80 pt-2 mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="liquid-glass-btn rounded-xl py-2 text-center text-xs font-bold text-[#14221e]"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/login?mode=register"
                className="liquid-glass-primary-btn rounded-xl py-2 text-center text-xs font-bold"
              >
                สมัครสมาชิก
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
