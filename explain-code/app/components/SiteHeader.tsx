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
import { useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";

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
  const { resolvedTheme, toggleTheme } = useTheme();

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
      { href: "/", label: "หน้าแรก", icon: "home" as const },
      { href: "/courses", label: "การเรียนรู้", icon: "book" as const },
      { href: "/explain", label: "อธิบายโค้ด", icon: "sparkles" as const },
      { href: "/dungeon", label: "ดันเจี้ยน", icon: "gamepad" as const },
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
    <>
      <header className="sticky top-3 z-50 mx-auto w-full max-w-6xl px-3 sm:px-6 pt-1.5">
        <GlassPanel
          as="div"
          elevated={isScrolled}
          rounded="2xl"
          className="px-3.5 sm:px-5 py-2.5"
        >
          <div className="flex h-11 items-center justify-between gap-3">
            {/* Left: Brand Logo */}
            <div className="flex flex-1 items-center justify-start">
              <Link
                href="/"
                aria-label="โค้ดนี้ฉันอธิบายได้ หน้าแรก"
                className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2a4d3e] to-[#0f766e] text-white shadow-sm">
                  <Icon name="code" className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <span className="block text-sm sm:text-base font-extrabold tracking-tight text-[#14221e] dark:text-white">
                    โค้ดนี้ฉันอธิบายได้
                  </span>
                  <span className="hidden sm:block text-[11px] font-semibold text-[#4a5d57] dark:text-[#cbd5e1]">
                    Open Learning &amp; Code Explanation
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Desktop Navigation Pill Track (Stationary, no layout shift) */}
            <nav
              ref={navContainerRef}
              aria-label="เมนูหลัก"
              className="relative hidden md:flex items-center justify-center gap-1 rounded-full bg-[#0b4f49]/10 dark:bg-white/10 p-1.5 border border-[#0f766e]/25 dark:border-white/20 shadow-inner shrink-0"
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
                    ref={(el) => {
                      navItemRefs.current[item.href] = el;
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`liquid-press relative z-10 rounded-full px-4 py-1.5 text-sm font-extrabold tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] ${
                      isActive
                        ? "liquid-active-nav-item text-white"
                        : "text-[#062e2b] dark:text-[#f1f5f9] hover:text-[#032220] dark:hover:text-white hover:bg-[#0f766e]/15 dark:hover:bg-white/10"
                    }`}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      <span>{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Auth Controls & Theme Toggle */}
            <div className="flex flex-1 items-center justify-end gap-2">
              <ThemeToggle />

              {mounted && session ? (
                <div className="flex items-center gap-2">
                  {/* Role Quick Link on Desktop */}
                  {session.role === "student" && (
                    <Link
                      href="/my-learning"
                      className={`hidden lg:inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] ${
                        pathname.startsWith("/my-learning")
                          ? "liquid-glass-primary-btn"
                          : "liquid-glass-btn text-[#1b3b32] dark:text-white"
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
                          : "liquid-glass-btn text-[#1b3b32] dark:text-white"
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
                        <p className="max-w-[120px] truncate text-xs font-extrabold text-[#14221e] dark:text-white">
                          {session.displayName || session.username}
                        </p>
                        <p className="text-[10px] font-semibold text-[#4a5d57] dark:text-[#cbd5e1]">
                          {getRoleLabel(session)}
                        </p>
                      </div>
                      <Icon
                        name="chevron-down"
                        className={`h-3.5 w-3.5 text-[#3d4d48] dark:text-[#cbd5e1] transition-transform duration-200 ${
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
                        <div className="border-b border-[#d8e3e0]/80 dark:border-white/15 px-3 py-2.5 mb-1">
                          <p className="truncate text-xs font-extrabold text-[#14221e] dark:text-white">
                            {session.displayName || session.username}
                          </p>
                          <p className="text-[11px] font-semibold text-[#0f766e] dark:text-[#5eead4]">
                            บทบาท: {getRoleLabel(session)}
                          </p>
                        </div>

                        {session.role === "student" && (
                          <Link
                            href="/my-learning"
                            role="menuitem"
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#14221e] dark:text-white hover:bg-white/75 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#0f766e]"
                          >
                            <Icon
                              name="award"
                              className="h-4 w-4 text-[#0f766e] dark:text-[#5eead4]"
                            />
                            <span>การเรียนของฉัน</span>
                          </Link>
                        )}

                        {(session.role === "teacher" ||
                          session.role === "admin") && (
                          <Link
                            href="/teacher"
                            role="menuitem"
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#14221e] dark:text-white hover:bg-white/75 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#0f766e]"
                          >
                            <Icon
                              name="users"
                              className="h-4 w-4 text-[#0f766e] dark:text-[#5eead4]"
                            />
                            <span>แดชบอร์ดครู</span>
                          </Link>
                        )}

                        <Link
                          href="/my-history"
                          role="menuitem"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#14221e] dark:text-white hover:bg-white/75 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#0f766e]"
                        >
                          <Icon
                            name="clock"
                            className="h-4 w-4 text-[#0f766e] dark:text-[#5eead4]"
                          />
                          <span>ประวัติของฉัน</span>
                        </Link>

                        <div className="my-1 border-t border-[#d8e3e0]/80 dark:border-white/15" />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            toggleTheme();
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-[#14221e] dark:text-white hover:bg-white/75 dark:hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0f766e]"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              name={resolvedTheme === "dark" ? "sun" : "moon"}
                              className={`h-4 w-4 ${
                                resolvedTheme === "dark"
                                  ? "text-[#f6b73c]"
                                  : "text-[#0f766e] dark:text-[#5eead4]"
                              }`}
                            />
                            <span>
                              {resolvedTheme === "dark"
                                ? "สลับเป็นธีมสว่าง"
                                : "สลับเป็นธีมมืด"}
                            </span>
                          </div>
                          <span className="rounded-md bg-[#0f766e]/15 dark:bg-[#0f766e]/30 px-1.5 py-0.5 text-[10px] font-extrabold text-[#0f766e] dark:text-[#5eead4]">
                            {resolvedTheme === "dark" ? "Dark" : "Light"}
                          </span>
                        </button>

                        <div className="my-1 border-t border-[#d8e3e0]/80 dark:border-white/15" />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#991b1b] dark:text-[#f87171] hover:bg-[#fef2f2]/90 dark:hover:bg-[#451212]/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#991b1b]"
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
                    className="liquid-glass-btn liquid-press hidden sm:inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold text-[#0b4f49] dark:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
                  >
                    <span>เข้าสู่ระบบ</span>
                  </Link>
                  <Link
                    href="/login?mode=register"
                    className="liquid-glass-primary-btn liquid-press inline-flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e]"
                  >
                    <Icon name="user" className="h-3.5 w-3.5" />
                    <span className="sm:hidden">เข้าสู่ระบบ</span>
                    <span className="hidden sm:inline">สมัครสมาชิก</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </GlassPanel>
      </header>

      {/* Mobile Bottom Icon Navigation Bar (แสดงเฉพาะบนโทรศัพท์/หน้าจอขนาดเล็ก md:hidden) */}
      <nav
        aria-label="เมนูนำทางด้านล่างสำหรับมือถือ"
        className="fixed bottom-3 inset-x-3 z-50 md:hidden"
      >
        <div className="liquid-glass liquid-glass-scrolled mx-auto max-w-md rounded-2xl p-1.5 grid grid-cols-5 gap-1">
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
                className={`liquid-press flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-extrabold leading-none ${
                  isActive
                    ? "liquid-active-nav-item text-white"
                    : "text-[#062e2b] dark:text-[#f1f5f9] hover:bg-[#0f766e]/15 dark:hover:bg-white/10"
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* ปุ่มไอคอนที่ 4 ตามสถานะผู้ใช้ */}
          {mounted && session ? (
            session.role === "teacher" || session.role === "admin" ? (
              <Link
                href="/teacher"
                aria-current={
                  pathname.startsWith("/teacher") ? "page" : undefined
                }
                className={`liquid-press flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-extrabold leading-none ${
                  pathname.startsWith("/teacher")
                    ? "liquid-active-nav-item text-white"
                    : "text-[#062e2b] dark:text-[#f1f5f9] hover:bg-[#0f766e]/15 dark:hover:bg-white/10"
                }`}
              >
                <Icon name="users" className="h-5 w-5" />
                <span className="truncate">แดชบอร์ดครู</span>
              </Link>
            ) : (
              <Link
                href="/my-learning"
                aria-current={
                  pathname.startsWith("/my-learning") ? "page" : undefined
                }
                className={`liquid-press flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-extrabold leading-none ${
                  pathname.startsWith("/my-learning")
                    ? "liquid-active-nav-item text-white"
                    : "text-[#062e2b] dark:text-[#f1f5f9] hover:bg-[#0f766e]/15 dark:hover:bg-white/10"
                }`}
              >
                <Icon name="award" className="h-5 w-5" />
                <span className="truncate">เรียนของฉัน</span>
              </Link>
            )
          ) : (
            <Link
              href="/login"
              aria-current={pathname.startsWith("/login") ? "page" : undefined}
              className={`liquid-press flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-extrabold leading-none ${
                pathname.startsWith("/login")
                  ? "liquid-active-nav-item text-white"
                  : "text-[#062e2b] dark:text-[#f1f5f9] hover:bg-[#0f766e]/15 dark:hover:bg-white/10"
              }`}
            >
              <Icon name="user" className="h-5 w-5" />
              <span className="truncate">บัญชีผู้ใช้</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
