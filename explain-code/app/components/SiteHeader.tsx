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
import { UiLanguageToggle, useUiLanguage } from "./LanguageProvider";

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
  const { t } = useUiLanguage();

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
      { href: "/", label: t("หน้าแรก", "Home"), icon: "home" as const },
      {
        href: "/courses",
        label: t("ดันเจี้ยนการเรียนรู้", "Learning Dungeon"),
        icon: "gamepad" as const,
      },
      {
        href: "/explain",
        label: t("อธิบายโค้ด", "Explain Code"),
        icon: "sparkles" as const,
      },
    ],
    [t]
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
        ? t("ครูผู้สอน (รออนุมัติ)", "Teacher (Pending)")
        : t("ครูผู้สอน", "Teacher");
    }
    if (user.role === "admin") {
      return t("ผู้ดูแลระบบ", "Admin");
    }
    return t("นักเรียน", "Student");
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
                aria-label={t("โค้ดนี้ฉันอธิบายได้ หน้าแรก", "ExplainCode Home")}
                className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c945]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a2d91] to-[#3b1d66] border border-[#f6c945]/60 text-[#ffe27a] shadow-sm">
                  <Icon name="code" className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <span className="block text-sm sm:text-base font-extrabold tracking-tight text-[#f4efe6]">
                    {t("โค้ดนี้ฉันอธิบายได้", "ExplainCode")}
                  </span>
                  <span className="hidden sm:block text-[11px] font-semibold text-[#9a93ad]">
                    {t(
                      "Open Learning & Code Explanation",
                      "Multi-Language Code Dungeon & LMS"
                    )}
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Desktop Navigation Pill Track (Stationary, no layout shift) */}
            <nav
              ref={navContainerRef}
              aria-label="เมนูหลัก"
              className="relative hidden md:flex items-center justify-center gap-1 rounded-full bg-[#0d0b14]/85 p-1.5 border border-[#2f2d45] shadow-inner shrink-0"
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
                    className={`liquid-press relative z-10 rounded-full px-4 py-1.5 text-sm font-extrabold tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c945] ${
                      isActive
                        ? "liquid-active-nav-item text-[#ffe27a]"
                        : "text-[#c4bdd6] hover:text-[#f4efe6] hover:bg-[#252238]"
                    }`}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      <span>{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Auth Controls & Language Toggle */}
            <div className="flex flex-1 items-center justify-end gap-2">
              <UiLanguageToggle variant="dungeon" />

              {mounted && session ? (
                <div className="flex items-center gap-2">
                  {/* Role Quick Link on Desktop */}
                  {session.role === "student" && (
                    <Link
                      href="/my-learning"
                      className={`hidden lg:inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c945] ${
                        pathname.startsWith("/my-learning")
                          ? "liquid-glass-primary-btn"
                          : "liquid-glass-btn text-[#f4efe6]"
                      }`}
                    >
                      <Icon name="award" className="h-3.5 w-3.5" />
                      <span>{t("การเรียนของฉัน", "My Learning")}</span>
                    </Link>
                  )}

                  {(session.role === "teacher" || session.role === "admin") && (
                    <Link
                      href="/teacher"
                      className={`hidden lg:inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c945] ${
                        pathname.startsWith("/teacher")
                          ? "liquid-glass-primary-btn"
                          : "liquid-glass-btn text-[#f4efe6]"
                      }`}
                    >
                      <Icon name="users" className="h-3.5 w-3.5" />
                      <span>{t("แดชบอร์ดครู", "Teacher Dashboard")}</span>
                    </Link>
                  )}

                  {/* User Profile Pill & Glass Dropdown Menu */}
                  <div ref={userMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsUserMenuOpen((prev) => !prev)}
                      aria-expanded={isUserMenuOpen}
                      aria-haspopup="menu"
                      aria-label={t("เมนูบัญชีผู้ใช้", "User account menu")}
                      className="liquid-glass-btn flex items-center gap-2.5 rounded-full py-1 pl-1.5 pr-3 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c945]"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#5a2d91] to-[#9b5de5] border border-[#f6c945]/50 text-xs font-extrabold text-[#ffe27a] shadow-2xs">
                        {(session.displayName || session.username || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="hidden sm:block leading-tight">
                        <p className="max-w-[120px] truncate text-xs font-extrabold text-[#f4efe6]">
                          {session.displayName || session.username}
                        </p>
                        <p className="text-[10px] font-semibold text-[#9a93ad]">
                          {getRoleLabel(session)}
                        </p>
                      </div>
                      <Icon
                        name="chevron-down"
                        className={`h-3.5 w-3.5 text-[#9a93ad] transition-transform duration-200 ${
                          isUserMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Liquid Glass User Dropdown */}
                    {isUserMenuOpen && (
                      <div
                        role="menu"
                        aria-label={t("ตัวเลือกบัญชีผู้ใช้", "Account options")}
                        className="liquid-glass liquid-glass-scrolled absolute right-0 mt-2.5 w-60 rounded-2xl p-2 z-50 origin-top-right animate-in fade-in zoom-in-95 duration-150"
                      >
                        <div className="border-b border-[#2f2d45] px-3 py-2.5 mb-1">
                          <p className="truncate text-xs font-extrabold text-[#f4efe6]">
                            {session.displayName || session.username}
                          </p>
                          <p className="text-[11px] font-semibold text-[#ffe27a]">
                            {t("บทบาท:", "Role:")} {getRoleLabel(session)}
                          </p>
                        </div>

                        {session.role === "student" && (
                          <Link
                            href="/my-learning"
                            role="menuitem"
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#f4efe6] hover:bg-[#252238] transition-colors focus-visible:outline-2 focus-visible:outline-[#f6c945]"
                          >
                            <Icon
                              name="award"
                              className="h-4 w-4 text-[#f6c945]"
                            />
                            <span>{t("การเรียนของฉัน", "My Learning")}</span>
                          </Link>
                        )}

                        {(session.role === "teacher" ||
                          session.role === "admin") && (
                          <Link
                            href="/teacher"
                            role="menuitem"
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#f4efe6] hover:bg-[#252238] transition-colors focus-visible:outline-2 focus-visible:outline-[#f6c945]"
                          >
                            <Icon
                              name="users"
                              className="h-4 w-4 text-[#f6c945]"
                            />
                            <span>{t("แดชบอร์ดครู", "Teacher Dashboard")}</span>
                          </Link>
                        )}

                        <Link
                          href="/my-history"
                          role="menuitem"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#f4efe6] hover:bg-[#252238] transition-colors focus-visible:outline-2 focus-visible:outline-[#f6c945]"
                        >
                          <Icon
                            name="clock"
                            className="h-4 w-4 text-[#f6c945]"
                          />
                          <span>{t("ประวัติของฉัน", "My History")}</span>
                        </Link>

                        <div className="my-1 border-t border-[#2f2d45]" />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#ff6b81] hover:bg-[#2d141c] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#ff6b81]"
                        >
                          <Icon name="logout" className="h-4 w-4" />
                          <span>{t("ออกจากระบบ", "Logout")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Unauthenticated: Secondary Dungeon Button + Primary Dungeon Button */
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="liquid-glass-btn liquid-press hidden sm:inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold text-[#f4efe6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c945]"
                  >
                    <span>{t("เข้าสู่ระบบ", "Login")}</span>
                  </Link>
                  <Link
                    href="/login?mode=register"
                    className="liquid-glass-primary-btn liquid-press inline-flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6c945]"
                  >
                    <Icon name="user" className="h-3.5 w-3.5" />
                    <span className="sm:hidden">{t("เข้าสู่ระบบ", "Login")}</span>
                    <span className="hidden sm:inline">{t("สมัครสมาชิก", "Sign Up")}</span>
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
        <div className="liquid-glass liquid-glass-scrolled mx-auto max-w-md rounded-2xl p-1.5 grid grid-cols-4 gap-1">
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
                    ? "liquid-active-nav-item text-[#ffe27a]"
                    : "text-[#c4bdd6] hover:bg-[#252238] hover:text-[#f4efe6]"
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
                    ? "liquid-active-nav-item text-[#ffe27a]"
                    : "text-[#c4bdd6] hover:bg-[#252238] hover:text-[#f4efe6]"
                }`}
              >
                <Icon name="users" className="h-5 w-5" />
                <span className="truncate">{t("แดชบอร์ดครู", "Teacher")}</span>
              </Link>
            ) : (
              <Link
                href="/my-learning"
                aria-current={
                  pathname.startsWith("/my-learning") ? "page" : undefined
                }
                className={`liquid-press flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-extrabold leading-none ${
                  pathname.startsWith("/my-learning")
                    ? "liquid-active-nav-item text-[#ffe27a]"
                    : "text-[#c4bdd6] hover:bg-[#252238] hover:text-[#f4efe6]"
                }`}
              >
                <Icon name="award" className="h-5 w-5" />
                <span className="truncate">{t("เรียนของฉัน", "My Learning")}</span>
              </Link>
            )
          ) : (
            <Link
              href="/login"
              aria-current={pathname.startsWith("/login") ? "page" : undefined}
              className={`liquid-press flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-extrabold leading-none ${
                pathname.startsWith("/login")
                  ? "liquid-active-nav-item text-[#ffe27a]"
                  : "text-[#c4bdd6] hover:bg-[#252238] hover:text-[#f4efe6]"
              }`}
            >
              <Icon name="user" className="h-5 w-5" />
              <span className="truncate">{t("บัญชีผู้ใช้", "Account")}</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
