"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "./components/SiteHeader";
import {
  LandingDungeonBackdrop,
  LandingHeroPreview,
} from "./components/LandingHeroEffects";
import { useUiLanguage } from "./components/LanguageProvider";
import {
  TOPICS,
  SECRET_BADGES,
  BLOCK_MODEL_CELLS,
  BlockCellId,
  INITIAL_CLASSROOMS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  ClassroomRecord,
  StudentRecord,
  TeacherRecord,
  AI_USAGE_LOGS,
  getMasteryStatus,
  runJavaScriptReal,
  validatePdpaIdentifier,
} from "./lib/curriculum";
import { Icon, StatusCircle } from "./components/Icons";
import { BlockModelGrid } from "./components/BlockModelGrid";
import { PracticeArena } from "./components/PracticeArena";
import { TeacherDashboard } from "./components/TeacherDashboard";

type AppMode =
  | "landing"
  | "student-login"
  | "teacher-login"
  | "student-portal"
  | "teacher-portal";

type StudentTab = "quest" | "practice" | "learn" | "profile" | "ailog";

const STORAGE_STUDENTS_KEY = "explain_code_students_v2";
const STORAGE_ROOMS_KEY = "explain_code_rooms_v2";
const STORAGE_TEACHERS_KEY = "explain_code_teachers_v2";
const STORAGE_SESSION_KEY = "explain_code_auth_session_v2";

interface AuthSession {
  role: "student" | "teacher";
  userId: string;
  username: string;
  roomCode?: string;
}

function formatAttemptTimestamp(isoStr?: string, uiLang: "th" | "en" = "th"): string {
  if (!isoStr) return uiLang === "en" ? "Just now" : "เมื่อสักครู่";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString(uiLang === "en" ? "en-US" : "th-TH", {
      timeZone: "Asia/Bangkok",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return uiLang === "en" ? "Just now" : "เมื่อสักครู่";
  }
}

export default function ExplainCodeApp() {
  const { uiLang, t } = useUiLanguage();
  const [appMode, setAppMode] = useState<AppMode>("landing");
  const [studentTab, setStudentTab] = useState<StudentTab>("quest");
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [torchActive, setTorchActive] = useState<boolean>(false);
  const landingMainRef = useRef<HTMLElement | null>(null);

  const updateLandingTorch = (e: React.PointerEvent<HTMLElement>) => {
    const el = landingMainRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--torch-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--torch-y", `${e.clientY - rect.top}px`);
    if (!torchActive) setTorchActive(true);
  };

  // ข้อมูลห้องเรียน นักเรียน และครู
  const [classrooms, setClassrooms] =
    useState<ClassroomRecord[]>(INITIAL_CLASSROOMS);
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [teachers, setTeachers] = useState<TeacherRecord[]>(INITIAL_TEACHERS);

  // สถานะฟอร์มล็อกอินฝั่งนักเรียน (Role: student)
  const [studentAuthTab, setStudentAuthTab] = useState<"login" | "register">(
    "login"
  );
  const [loginNickname, setLoginNickname] = useState<string>("");
  const [loginPin, setLoginPin] = useState<string>("");
  const [signupRoomCode, setSignupRoomCode] = useState<string>("");
  const [authMessage, setAuthMessage] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);
  const [currentStudentId, setCurrentStudentId] = useState<string>("stu-1");

  // สถานะฟอร์มล็อกอินฝั่งครู (Role: teacher)
  const [teacherAuthTab, setTeacherAuthTab] = useState<"login" | "register">(
    "login"
  );
  const [teacherUsername, setTeacherUsername] = useState<string>("");
  const [teacherPassword, setTeacherPassword] = useState<string>("");
  const [teacherDisplayName, setTeacherDisplayName] = useState<string>(
    "ครูวิทยาการคำนวณ"
  );
  const [teacherAuthError, setTeacherAuthError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [teacherCellAverages, setTeacherCellAverages] = useState<any[]>([]);
  const [teacherQuestionStats, setTeacherQuestionStats] = useState<any[]>([]);
  const [teacherLoading, setTeacherLoading] = useState<boolean>(false);

  // สถานะการฝึกอ่านโค้ดฝั่งนักเรียน
  const [selectedTopicId, setSelectedTopicId] = useState<number>(1);
  const [unlockAllDemo, setUnlockAllDemo] = useState<boolean>(false);

  // สถานะทดลองรันโค้ดที่ AI เขียนในหน้าเรียนรู้
  const [playgroundCode, setPlaygroundCode] = useState<string>(
    `let items = [20, 35, 15];\nlet total = 0;\nfor (let i = 0; i < items.length; i++) {\n  total += items[i];\n}\nconsole.log("ผลรวม =", total);`
  );
  const [playgroundOutput, setPlaygroundOutput] = useState<string>("");

  // โหลดข้อมูลจาก LocalStorage
  useEffect(() => {
    try {
      const savedRooms = localStorage.getItem(STORAGE_ROOMS_KEY);
      if (savedRooms) {
        setClassrooms(JSON.parse(savedRooms));
      } else {
        localStorage.setItem(
          STORAGE_ROOMS_KEY,
          JSON.stringify(INITIAL_CLASSROOMS)
        );
      }

      const savedStudents = localStorage.getItem(STORAGE_STUDENTS_KEY);
      if (savedStudents) {
        setStudents(JSON.parse(savedStudents));
      } else {
        localStorage.setItem(
          STORAGE_STUDENTS_KEY,
          JSON.stringify(INITIAL_STUDENTS)
        );
      }

      const savedTeachers = localStorage.getItem(STORAGE_TEACHERS_KEY);
      if (savedTeachers) {
        setTeachers(JSON.parse(savedTeachers));
      } else {
        localStorage.setItem(
          STORAGE_TEACHERS_KEY,
          JSON.stringify(INITIAL_TEACHERS)
        );
      }

      const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
      if (savedSession) {
        const parsed: AuthSession = JSON.parse(savedSession);
        setAuthSession(parsed);
        if (parsed.role === "student") {
          setCurrentStudentId(parsed.userId);
        } else if (parsed.role === "teacher") {
          setTeacherUsername(parsed.username);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const saveSessionToStorage = (session: AuthSession | null) => {
    setAuthSession(session);
    try {
      if (session) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch {
      // ignore
    }
  };

  const saveStudentsToStorage = (updated: StudentRecord[]) => {
    setStudents(updated);
    try {
      localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const saveRoomsToStorage = (updated: ClassroomRecord[]) => {
    setClassrooms(updated);
    try {
      localStorage.setItem(STORAGE_ROOMS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const saveTeachersToStorage = (updated: TeacherRecord[]) => {
    setTeachers(updated);
    try {
      localStorage.setItem(STORAGE_TEACHERS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const fetchTeacherAnalytics = useCallback(async () => {
    if (!teacherUsername) return;
    try {
      setTeacherLoading(true);
      const res = await fetch(
        `/api/teacher/classrooms?teacherUsername=${encodeURIComponent(
          teacherUsername
        )}&teacherId=${encodeURIComponent(authSession?.userId || "")}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.classrooms) && data.classrooms.length > 0) {
        setClassrooms(data.classrooms);
        saveRoomsToStorage(data.classrooms);
      }
      if (Array.isArray(data.students) && data.students.length > 0) {
        setStudents(data.students);
        saveStudentsToStorage(data.students);
      }
      if (Array.isArray(data.cellAverages)) {
        setTeacherCellAverages(data.cellAverages);
      }
      if (Array.isArray(data.questionStats)) {
        setTeacherQuestionStats(data.questionStats);
      }
    } catch (err) {
      console.warn("Failed to fetch teacher analytics:", err);
    } finally {
      setTeacherLoading(false);
    }
  }, [teacherUsername, authSession?.userId]);

  useEffect(() => {
    if (appMode === "teacher-portal" && teacherUsername) {
      void fetchTeacherAnalytics();
    }
  }, [appMode, teacherUsername, fetchTeacherAnalytics]);

  // ซิงค์ข้อมูลนักเรียนและประวัติการเล่นกับ Supabase อัตโนมัติในเบื้องหลัง
  const syncStudentData = useCallback(async (targetId?: string) => {
    const sid = targetId || currentStudentId || authSession?.userId;
    if (!sid) return;

    try {
      // 1. ลองดึงข้อมูลนักเรียนล่าสุดจาก /api/auth?studentId=...
      const authRes = await fetch(`/api/auth?studentId=${encodeURIComponent(sid)}`);
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.source === "supabase" && authData.student) {
          const sbStudent: StudentRecord = authData.student;
          setStudents((prev) => {
            const exists = prev.some((s) => s.id === sbStudent.id);
            const nextList = exists
              ? prev.map((s) => (s.id === sbStudent.id ? { ...s, ...sbStudent } : s))
              : [...prev, sbStudent];
            try {
              localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(nextList));
            } catch { }
            return nextList;
          });
          return;
        }
      }

      // 2. ดึงประวัติ attempts และคะแนนล่าสุดจาก /api/attempts?studentId=...
      const attRes = await fetch(`/api/attempts?studentId=${encodeURIComponent(sid)}`);
      if (attRes.ok) {
        const attData = await attRes.json();
        if (Array.isArray(attData.attempts) && attData.attempts.length > 0) {
          const formattedHistory = attData.attempts.map((att: any) => ({
            topicId: att.topic_id,
            topicTitle:
              TOPICS.find((tp) => tp.id === att.topic_id)?.title ||
              t(`เรื่องที่ ${att.topic_id}`, `Topic ${att.topic_id}`),
            scorePercent: att.score_percent,
            xpEarned: att.xp_earned,
            timestamp: formatAttemptTimestamp(att.created_at, uiLang),
          }));

          setStudents((prev) => {
            const stu = prev.find((s) => s.id === sid);
            if (!stu) return prev;
            const synced: StudentRecord = {
              ...stu,
              history: formattedHistory,
            };
            const nextList = prev.map((s) => (s.id === synced.id ? synced : s));
            try {
              localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(nextList));
            } catch { }
            return nextList;
          });
        }
      }
    } catch (err) {
      console.warn("Notice: student session background sync skipped/offline:", err);
    }
  }, [currentStudentId, authSession?.userId]);

  useEffect(() => {
    if (appMode === "student-portal" && (currentStudentId || authSession?.userId)) {
      void syncStudentData(currentStudentId || authSession?.userId);
    }
  }, [appMode, currentStudentId, authSession?.userId, syncStudentData]);

  const currentStudent =
    students.find((s) => s.id === currentStudentId) || students[0];
  const currentStudentRoom = classrooms.find(
    (r) => r.roomCode === currentStudent?.roomCode
  );
  const activeTopic =
    TOPICS.find((t) => t.id === selectedTopicId) || TOPICS[0];

  // ล็อกอินฝั่งนักเรียนตาม Role: student (ตรวจสอบชื่อเล่นสมมติ + แฮช PIN 4 หลัก)
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    const nick = loginNickname.trim();
    const pin = loginPin.trim();

    if (!nick && !pin) {
      setAuthMessage({
        type: "error",
        text: t(
          "กรุณากรอกชื่อเล่นสมมติและรหัส PIN 4 หลักก่อนเข้าเล่น (ห้ามเว้นว่าง)",
          "Please enter your nickname and 4-digit PIN before playing (cannot be empty)."
        ),
      });
      return;
    }

    if (!nick) {
      setAuthMessage({
        type: "error",
        text: t(
          "กรุณากรอกชื่อเล่นสมมติของคุณ (ห้ามเว้นว่าง)",
          "Please enter your nickname (cannot be empty)."
        ),
      });
      return;
    }

    if (!pin) {
      setAuthMessage({
        type: "error",
        text: t(
          "กรุณากรอกรหัส PIN 4 หลัก (ห้ามเว้นว่าง)",
          "Please enter your 4-digit PIN (cannot be empty)."
        ),
      });
      return;
    }

    if (pin.length !== 4) {
      setAuthMessage({
        type: "error",
        text: t(
          "รหัส PIN นักเรียนต้องเป็นตัวเลข 4 หลักให้ครบถ้วน",
          "Student PIN must be 4 digits."
        ),
      });
      return;
    }

    const pdpaLoginCheck = validatePdpaIdentifier(nick);
    if (!pdpaLoginCheck.valid) {
      setAuthMessage({
        type: "error",
        text:
          pdpaLoginCheck.reason ||
          t(
            "ตามหลัก PDPA 2562 กรุณาใช้ชื่อเล่นสมมติเท่านั้น",
            "Per PDPA guidelines, please use a nickname only."
          ),
      });
      return;
    }

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login-student",
        role: "student",
        nickname: nick,
        pin,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setAuthMessage({
        type: "error",
        text: data.error || t("เข้าสู่ระบบไม่สำเร็จ", "Login failed"),
      });
      return;
    }

    // ถ้าผ่านการยืนยันตัวตนจาก API (ทั้ง Supabase และบัญชีสาธิต local)
    if (data.authenticated && data.student) {
      const sbStudent: StudentRecord = data.student;
      const merged = students.some((s) => s.nickname === sbStudent.nickname)
        ? students.map((s) =>
          s.nickname === sbStudent.nickname ? sbStudent : s
        )
        : [...students, sbStudent];
      saveStudentsToStorage(merged);
      setCurrentStudentId(sbStudent.id);
      saveSessionToStorage({
        role: "student",
        userId: sbStudent.id,
        username: sbStudent.nickname,
        roomCode: sbStudent.roomCode,
      });
      setAppMode("student-portal");
      setStudentTab("quest");
      return;
    }

    // ตรวจสอบกับรายชื่อนักเรียนในระบบและตรวจแฮช PIN จริง
    const found = students.find(
      (s) => s.nickname.toLowerCase() === nick.toLowerCase()
    );

    if (!found) {
      setAuthMessage({
        type: "error",
        text: t(
          `ยังไม่มีชื่อเล่น "${nick}" ในระบบ กรุณากดแท็บ "สมัครเข้าเล่นใหม่" แล้วใส่รหัสห้องจากครู`,
          `Nickname "${nick}" was not found. Please switch to "Sign Up" and enter your teacher's room code.`
        ),
      });
      setStudentAuthTab("register");
      return;
    }

    if (!data.authenticated || (data.pinHash && found.pinHash !== data.pinHash)) {
      setAuthMessage({
        type: "error",
        text: t(
          "รหัส PIN 4 หลักไม่ถูกต้อง (บัญชีตัวอย่างใช้รหัส PIN: 1234)",
          "Incorrect 4-digit PIN (demo account PIN: 1234)."
        ),
      });
      return;
    }

    setCurrentStudentId(found.id);
    saveSessionToStorage({
      role: "student",
      userId: found.id,
      username: found.nickname,
      roomCode: found.roomCode,
    });
    setAppMode("student-portal");
    setStudentTab("quest");
  };

  // สมัครสมาชิกนักเรียนใหม่ด้วยรหัสห้องจากครู (Role: student)
  const handleStudentSignupWithRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthMessage(null);
    const nick = loginNickname.trim();
    const pin = loginPin.trim();
    const rawCode = signupRoomCode.trim().toUpperCase();
    const code = rawCode || "VIBE26";

    if (!nick && !pin) {
      setAuthMessage({
        type: "error",
        text: t(
          "กรุณาตั้งชื่อเล่นสมมติและรหัส PIN 4 หลักก่อนกดสมัคร (ห้ามเว้นว่าง)",
          "Please set a nickname and 4-digit PIN before signing up (cannot be empty)."
        ),
      });
      return;
    }

    if (!nick) {
      setAuthMessage({
        type: "error",
        text: t(
          "กรุณาตั้งชื่อเล่นสมมติของคุณ (ห้ามเว้นว่าง)",
          "Please set your nickname (cannot be empty)."
        ),
      });
      return;
    }

    if (!pin) {
      setAuthMessage({
        type: "error",
        text: t(
          "กรุณาตั้งรหัส PIN 4 หลัก (ห้ามเว้นว่าง)",
          "Please set a 4-digit PIN (cannot be empty)."
        ),
      });
      return;
    }

    if (pin.length !== 4) {
      setAuthMessage({
        type: "error",
        text: t(
          "รหัส PIN นักเรียนต้องเป็นตัวเลข 4 หลักให้ครบถ้วน",
          "Student PIN must be 4 digits."
        ),
      });
      return;
    }

    const pdpaLoginCheck = validatePdpaIdentifier(nick);
    if (!pdpaLoginCheck.valid) {
      setAuthMessage({
        type: "error",
        text:
          pdpaLoginCheck.reason ||
          t(
            "ตามหลัก PDPA 2562 กรุณาใช้ชื่อเล่นสมมติเท่านั้น",
            "Per PDPA guidelines, please use a nickname only."
          ),
      });
      return;
    }

    if (rawCode) {
      const roomExists = classrooms.find((r) => r.roomCode === rawCode);
      if (!roomExists) {
        setAuthMessage({
          type: "error",
          text: t(
            `ไม่พบรหัสห้อง ${rawCode} (เว้นว่างได้หากไม่มีรหัสห้อง หรือใช้: ${classrooms
              .map((c) => c.roomCode)
              .join(", ")})`,
            `Room code ${rawCode} not found (leave blank if none, or use: ${classrooms
              .map((c) => c.roomCode)
              .join(", ")})`
          ),
        });
        return;
      }
    }

    const existing = students.find(
      (s) => s.nickname.toLowerCase() === nick.toLowerCase()
    );
    if (existing) {
      setAuthMessage({
        type: "error",
        text: t(
          `ชื่อเล่น "${nick}" มีในระบบแล้ว กรุณาเปลี่ยนชื่อเล่นสมมติ หรือสลับไปแท็บ "เข้าเล่น"`,
          `Nickname "${nick}" is already taken. Please choose another or switch to "Login".`
        ),
      });
      return;
    }

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register-student",
        role: "student",
        nickname: nick,
        pin,
        roomCode: code,
      }),
    });
    const data = await res.json();

    const newStu: StudentRecord = data.student || {
      id: "stu-" + Date.now(),
      nickname: nick,
      pinHash: "",
      role: "student",
      roomCode: code,
      xp: 20,
      streak: 1,
      completedTopics: [],
      cellScores: {
        T1: 55,
        E1: 55,
        F1: 55,
        T2: 50,
        E2: 50,
        F2: 50,
        T3: 50,
        E3: 50,
        F3: 50,
        T4: 50,
        E4: 50,
        F4: 50,
      },
      badges: [],
      history: [],
    };

    saveStudentsToStorage([...students, newStu]);
    setCurrentStudentId(newStu.id);
    saveSessionToStorage({
      role: "student",
      userId: newStu.id,
      username: newStu.nickname,
      roomCode: newStu.roomCode,
    });
    setAppMode("student-portal");
    setStudentTab("quest");
  };

  // ล็อกอินฝั่งครูตาม Role: teacher
  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherAuthError("");
    const uname = teacherUsername.trim();
    const pwd = teacherPassword.trim();

    if (!uname && !pwd) {
      setTeacherAuthError(
        t(
          "กรุณากรอกชื่อผู้ใช้และรหัสผ่านสำหรับครูก่อนเข้าสู่ระบบ (ห้ามเว้นว่าง)",
          "Please enter teacher username and password before logging in (cannot be empty)."
        )
      );
      return;
    }

    if (!uname) {
      setTeacherAuthError(
        t(
          "กรุณากรอกชื่อผู้ใช้ (ครู) ก่อนเข้าสู่ระบบ (ห้ามเว้นว่าง)",
          "Please enter teacher username before logging in (cannot be empty)."
        )
      );
      return;
    }

    if (!pwd) {
      setTeacherAuthError(
        t(
          "กรุณากรอกรหัสผ่านสำหรับครู (ห้ามเว้นว่าง)",
          "Please enter teacher password (cannot be empty)."
        )
      );
      return;
    }

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login-teacher",
        role: "teacher",
        username: uname,
        password: pwd,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setTeacherAuthError(
        data.error || t("เข้าสู่ระบบครูไม่สำเร็จ", "Teacher login failed")
      );
      return;
    }

    if (data.authenticated && data.teacher) {
      saveSessionToStorage({
        role: "teacher",
        userId: data.teacher.id,
        username: data.teacher.username,
      });
      setAppMode("teacher-portal");
      return;
    }

    const foundTeacher = teachers.find(
      (t) => t.username.toLowerCase() === uname.toLowerCase()
    );

    if (!foundTeacher) {
      setTeacherAuthError(
        t(
          `ไม่พบบัญชีครู "${uname}" กรุณากดแท็บ "สมัครบัญชีครูใหม่" หรือใช้บัญชี "ครูตัวอย่าง"`,
          `Teacher account "${uname}" not found. Switch to "Register Teacher" or use the demo account.`
        )
      );
      return;
    }

    saveSessionToStorage({
      role: "teacher",
      userId: foundTeacher.id,
      username: foundTeacher.username,
    });
    setAppMode("teacher-portal");
  };

  // สมัครบัญชีครูใหม่ (Role: teacher)
  const handleTeacherRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherAuthError("");
    const uname = teacherUsername.trim();
    const pwd = teacherPassword.trim();

    if (!uname && !pwd) {
      setTeacherAuthError(
        t(
          "กรุณาตั้งชื่อผู้ใช้และรหัสผ่านก่อนกดสมัครบัญชีครู (ห้ามเว้นว่าง)",
          "Please set username and password before registering (cannot be empty)."
        )
      );
      return;
    }

    if (!uname) {
      setTeacherAuthError(
        t(
          "กรุณาตั้งชื่อผู้ใช้ (ครู) (ห้ามเว้นว่าง)",
          "Please set teacher username (cannot be empty)."
        )
      );
      return;
    }

    if (!pwd) {
      setTeacherAuthError(
        t(
          "กรุณาตั้งรหัสผ่านสำหรับครู (ห้ามเว้นว่าง)",
          "Please set teacher password (cannot be empty)."
        )
      );
      return;
    }

    if (pwd.length < 4) {
      setTeacherAuthError(
        t(
          "รหัสผ่านสำหรับครูต้องมีความยาวอย่างน้อย 4 ตัวอักษร",
          "Teacher password must be at least 4 characters long."
        )
      );
      return;
    }

    if (teachers.some((teacher) => teacher.username.toLowerCase() === uname.toLowerCase())) {
      setTeacherAuthError(
        t(
          "ชื่อผู้ใช้นี้มีในระบบแล้ว กรุณาเข้าสู่ระบบ",
          "This username already exists. Please log in."
        )
      );
      setTeacherAuthTab("login");
      return;
    }

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register-teacher",
        role: "teacher",
        username: uname,
        password: pwd,
        displayName: teacherDisplayName,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setTeacherAuthError(
        data.error || t("สมัครบัญชีครูไม่สำเร็จ", "Teacher registration failed")
      );
      return;
    }

    const newTeacher: TeacherRecord = {
      id: data.teacher?.id || "tch-" + Date.now(),
      username: data.teacher?.username || uname,
      passwordHash: "",
      displayName: data.teacher?.displayName || teacherDisplayName.trim() || uname,
      role: "teacher",
    };

    saveTeachersToStorage([...teachers, newTeacher]);
    saveSessionToStorage({
      role: "teacher",
      userId: newTeacher.id,
      username: newTeacher.username,
    });
    setAppMode("teacher-portal");
  };

  const handleLogout = () => {
    const prevRole = authSession?.role;
    saveSessionToStorage(null);
    setAuthMessage(null);
    setTeacherAuthError("");
    setAppMode(prevRole === "teacher" ? "teacher-login" : "student-login");
  };

  // ครูสร้างห้องเรียนใหม่ (ขั้นตอนที่ 2 ของโฟลครู)
  const handleCreateClassroom = async (
    roomName: string
  ): Promise<ClassroomRecord> => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const localRoom: ClassroomRecord = {
      roomCode: code,
      roomName,
      teacherUsername: teacherUsername || "ครูตัวอย่าง",
      pinnedReviewTopicId: 1,
      pinnedReviewNote: "เริ่มต้นฝึกอ่านโค้ดเรื่องที่ 1 ตัวแปรและการคำนวณ",
      createdAt: "วันนี้",
    };

    try {
      const res = await fetch("/api/teacher/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName,
          teacherUsername: teacherUsername || "ครูตัวอย่าง",
          teacherId: authSession?.userId,
          pinnedTopicId: 1,
          pinnedNote: "เริ่มต้นฝึกอ่านโค้ดเรื่องที่ 1 ตัวแปรและการคำนวณ",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.classroom) {
          const created: ClassroomRecord = {
            roomCode: data.classroom.roomCode,
            roomName: data.classroom.roomName,
            teacherUsername:
              data.classroom.teacherUsername ||
              teacherUsername ||
              "ครูตัวอย่าง",
            pinnedReviewTopicId: data.classroom.pinnedReviewTopicId ?? 1,
            pinnedReviewNote:
              data.classroom.pinnedReviewNote ??
              "เริ่มต้นฝึกอ่านโค้ดเรื่องที่ 1 ตัวแปรและการคำนวณ",
            createdAt: data.classroom.createdAt || "วันนี้",
          };
          const updated = [
            created,
            ...classrooms.filter((c) => c.roomCode !== created.roomCode),
          ];
          saveRoomsToStorage(updated);
          return created;
        }
      }
    } catch (err) {
      console.warn("Failed to create classroom via API:", err);
    }

    const updated = [localRoom, ...classrooms];
    saveRoomsToStorage(updated);
    return localRoom;
  };

  // ครูปรับการสอน / ปักหมุดเรื่องทบทวนประจำห้อง (ขั้นตอนที่ 7 ของโฟลครู)
  const handleUpdatePinnedReview = async (
    roomCode: string,
    topicId: number | null,
    note: string
  ) => {
    const updated = classrooms.map((r) =>
      r.roomCode === roomCode
        ? { ...r, pinnedReviewTopicId: topicId, pinnedReviewNote: note }
        : r
    );
    saveRoomsToStorage(updated);

    try {
      await fetch("/api/teacher/classrooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          pinnedTopicId: topicId,
          pinnedNote: note,
        }),
      });
    } catch (err) {
      console.warn("Failed to update pinned review via API:", err);
    }
  };

  // เมื่อนักเรียนเล่นจบเรื่อง -> อัปเดต XP, ตรา, และคะแนน 12 ช่องของ Block Model
  const handleCompleteTopic = (result: {
    topicId: number;
    earnedXp: number;
    updatedCellScores: Partial<Record<BlockCellId, number>>;
    badgeId: string;
    extraBadgeIds?: string[];
    scorePercent: number;
    answers?: {
      questionId: string;
      cellId: string;
      chosenOptionId?: string | null;
      isCorrect: boolean;
      tries: number;
      xpEarned: number;
    }[];
    aiEvaluation?: {
      studentExplanation: string;
      score: number;
      passed: boolean;
      feedback: string;
    };
  }) => {
    const topicObj = TOPICS.find((t) => t.id === result.topicId);
    const currentStudentSnapshot = currentStudent;

    // 1. อัปเดตแบบ Optimistic UI ทันทีในเครื่อง เพื่อให้หน้าจอไม่สะดุดแม้เครือข่ายช้า
    const nextCompleted = currentStudentSnapshot.completedTopics.includes(result.topicId)
      ? currentStudentSnapshot.completedTopics
      : [...currentStudentSnapshot.completedTopics, result.topicId];

    const earnedBadgeIds = [
      result.badgeId,
      ...(Array.isArray(result.extraBadgeIds) ? result.extraBadgeIds : []),
    ].filter(Boolean);

    const nextBadges = Array.from(
      new Set([...currentStudentSnapshot.badges, ...earnedBadgeIds])
    );

    const nextCells = { ...currentStudentSnapshot.cellScores };
    Object.entries(result.updatedCellScores).forEach(([cellKey, val]) => {
      const k = cellKey as BlockCellId;
      if (typeof val === "number") {
        nextCells[k] = Math.max(nextCells[k] || 0, val);
      }
    });

    const newHistoryItem = {
      topicId: result.topicId,
      topicTitle:
        topicObj?.title || t(`เรื่องที่ ${result.topicId}`, `Topic ${result.topicId}`),
      scorePercent: result.scorePercent,
      xpEarned: result.earnedXp,
      timestamp: t("เมื่อสักครู่", "Just now"),
    };

    const nextHistory = [newHistoryItem, ...currentStudentSnapshot.history];

    const optimisticStudent: StudentRecord = {
      ...currentStudentSnapshot,
      xp: currentStudentSnapshot.xp + result.earnedXp,
      completedTopics: nextCompleted,
      badges: nextBadges,
      cellScores: nextCells,
      history: nextHistory,
    };

    const updatedStudents = students.map((stu) =>
      stu.id === currentStudentSnapshot.id ? optimisticStudent : stu
    );
    if (!updatedStudents.some((stu) => stu.id === currentStudentSnapshot.id)) {
      updatedStudents.push(optimisticStudent);
    }

    saveStudentsToStorage(updatedStudents);
    setStudentTab("profile");

    // 2. เรียก POST /api/attempts ไปยังหลังบ้าน Supabase PostgreSQL
    void (async () => {
      try {
        const payload = {
          studentId: currentStudentSnapshot.id,
          topicId: result.topicId,
          scorePercent: result.scorePercent,
          earnedXp: result.earnedXp,
          updatedCellScores: result.updatedCellScores,
          badgeId: result.badgeId,
          extraBadgeIds: result.extraBadgeIds,
          answers: result.answers,
          aiEvaluation: result.aiEvaluation,
        };

        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.warn("POST /api/attempts returned non-OK status:", res.status);
          return;
        }

        const data = await res.json();

        // 3. รวมผลสถิติล่าสุดจาก Supabase (views: student_stats, student_streaks, student_cell_latest)
        if (data.success && data.stats) {
          const stats = data.stats;
          setStudents((prev) => {
            const stu = prev.find((s) => s.id === currentStudentSnapshot.id);
            if (!stu) return prev;

            const mergedCellScores = { ...stu.cellScores };
            if (stats.cellScores && typeof stats.cellScores === "object") {
              for (const [k, v] of Object.entries(stats.cellScores)) {
                if (typeof v === "number" && k in mergedCellScores) {
                  mergedCellScores[k as BlockCellId] = v;
                }
              }
            }

            const mergedCompleted =
              Array.isArray(stats.completedTopics) && stats.completedTopics.length > 0
                ? Array.from(new Set([...stu.completedTopics, ...stats.completedTopics]))
                : stu.completedTopics;

            const mergedBadges =
              Array.isArray(stats.badges) && stats.badges.length > 0
                ? Array.from(new Set([...stu.badges, ...stats.badges]))
                : stu.badges;

            const synced: StudentRecord = {
              ...stu,
              xp: typeof stats.xp === "number" ? stats.xp : stu.xp,
              streak: typeof stats.streak === "number" ? stats.streak : stu.streak,
              completedTopics: mergedCompleted,
              badges: mergedBadges,
              cellScores: mergedCellScores,
            };

            const nextList = prev.map((s) => (s.id === synced.id ? synced : s));
            try {
              localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(nextList));
            } catch { }
            return nextList;
          });
        }

        // 4. ดึงประวัติ attempts จริงจาก Supabase เพื่อให้ประวัติและเวลาอัปเดตแม่นยำ
        const historyRes = await fetch(
          `/api/attempts?studentId=${encodeURIComponent(currentStudentSnapshot.id)}`
        );
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          if (Array.isArray(historyData.attempts) && historyData.attempts.length > 0) {
            const formattedHistory = historyData.attempts.map((att: any) => ({
              topicId: att.topic_id,
              topicTitle:
                TOPICS.find((topicItem) => topicItem.id === att.topic_id)?.title ||
                t(`เรื่องที่ ${att.topic_id}`, `Topic ${att.topic_id}`),
              scorePercent: att.score_percent,
              xpEarned: att.xp_earned,
              timestamp: formatAttemptTimestamp(att.created_at, uiLang),
            }));

            setStudents((prev) => {
              const stu = prev.find((s) => s.id === currentStudentSnapshot.id);
              if (!stu) return prev;
              const synced: StudentRecord = {
                ...stu,
                history: formattedHistory,
              };
              const nextList = prev.map((s) => (s.id === synced.id ? synced : s));
              try {
                localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(nextList));
              } catch { }
              return nextList;
            });
          }
        }
      } catch (syncErr) {
        console.warn("Notice: background sync to Supabase skipped/offline:", syncErr);
      }
    })();
  };

  // ตรวจสอบว่าเรื่องที่ i ปลดล็อกหรือยัง:
  // "เรียงจากง่ายไปยาก ผ่านเรื่องก่อนหน้าจึงปลดล็อกเรื่องถัดไป บอสด่านเปิดเมื่อผ่านอย่างน้อย 4 เรื่อง"
  const isTopicUnlocked = (topicId: number): boolean => {
    if (unlockAllDemo) return true;
    if (topicId === 1) return true;
    if (topicId === 7) {
      return currentStudent.completedTopics.length >= 4;
    }
    return currentStudent.completedTopics.includes(topicId - 1);
  };

  // ครอบ handler ของฟอร์ม: กันกดซ้ำ + แสดงสถานะกำลังตรวจสอบ + จับ error เครือข่ายแยกตาม Role
  const runSubmit =
    (fn: (e: React.FormEvent) => Promise<void>, role: "student" | "teacher") =>
      async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
          await fn(e);
        } catch {
          const msg = t(
            "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง",
            "Cannot connect to server. Please try again."
          );
          if (role === "teacher") setTeacherAuthError(msg);
          else setAuthMessage({ type: "error", text: msg });
        } finally {
          setIsSubmitting(false);
        }
      };

  // ==================== 0. หน้า Landing ("/") แบบ Public (เว็บระบบเปิด) ====================
  if (appMode === "landing") {
    const openClassicPortal = () => {
      if (authSession?.role === "teacher") {
        setAppMode("teacher-portal");
      } else {
        setAppMode("student-portal");
      }
    };

    return (
      <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6] flex flex-col">
        <SiteHeader onOpenClassicPortal={openClassicPortal} />

        <main
          ref={landingMainRef}
          onPointerMove={updateLandingTorch}
          onPointerDown={updateLandingTorch}
          onPointerLeave={() => setTorchActive(false)}
          className="relative overflow-hidden mx-auto flex-1 max-w-5xl w-full px-4 py-10 sm:px-6 sm:py-16"
        >
          <LandingDungeonBackdrop torchActive={torchActive} />

          {/* Hero Section */}
          <section className="relative z-10 text-center max-w-2xl mx-auto mb-12 hero-fade-in">
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f4efe6] leading-tight">
              <span>{t("เขียนโค้ดได้แล้ว ", "You Can Write Code — ")}</span>
              <span className="mt-2 block text-[#f6c945] underline decoration-[#9b5de5] underline-offset-8">
                {t("แต่อธิบายโค้ดได้จริงไหม?", "Can You Explain It?")}
              </span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-[#9a93ad]">
              {t(
                'เปลี่ยนจาก "เขียนโค้ดได้แต่อธิบายไม่ถูก" เป็น "เข้าใจการทำงานทุกบรรทัด"',
                'Turn "I wrote it, can\'t explain it" into true line-by-line mastery via '
              )}
            </p>
            <p className="text-sm sm:text-base text-[#9a93ad]">
              {t(
                'ผ่านดันเจี้ยน RPG และตัวช่วยอธิบายโค้ด',
                'RPG dungeons & AI code breakdown.'
              )}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/courses"
                className="retro-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#f6c945] px-5 py-2.5 text-sm font-extrabold text-[#120f1c] shadow-xs hover:bg-[#ffe27a] transition-colors"
              >
                <Icon name="play" className="h-4 w-4 shrink-0" filled />
                <span>{t("เข้าสู่ดันเจี้ยน", "Enter Dungeon")}</span>
              </Link>
              <Link
                href="/explain"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-5 py-2.5 text-sm font-bold text-[#f4efe6] hover:border-[#f6c945]/70 hover:bg-[#252238] transition-colors"
              >
                <Icon name="code" className="h-4 w-4 shrink-0 text-[#c084fc]" />
                <span>{t("อธิบายโค้ด", "Explain Code")}</span>
              </Link>
            </div>

            <LandingHeroPreview />
          </section>

          {/* 2 Core Choices: Learning Dungeon & Explain Code */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-12 hero-fade-in-delay-1">
            {/* Card 1: Learning Dungeon */}
            <div className="group flex flex-col justify-between rounded-2xl border border-[#2f2d45] bg-[#141220] p-6 sm:p-7 transition-all hover:border-[#f6c945]/60 shadow-lg">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#281d08] border border-[#f6c945]/40 text-[#f6c945] mb-4">
                  <Icon name="gamepad" className="h-5 w-5" />
                </div>

                <h2 className="text-xl font-extrabold text-[#f4efe6]">
                  {t("ดันเจี้ยนการเรียนรู้", "Learning Dungeon")}
                </h2>
                <p className="mt-2 text-sm text-[#9a93ad] leading-relaxed">
                  {t(
                    "เลือกภาษาที่ต้องการ แล้วตะลุยด่านพิกเซลด้วยคำถาม Block Model ทั้ง 7 ภาษา",
                    "Pick a language and raid 2D pixel floors with Block Model challenges."
                  )}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2f2d45] flex items-center">
                <Link
                  href="/courses"
                  className="retro-button w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#f6c945] px-5 py-3 text-sm font-extrabold text-[#120f1c] hover:bg-[#ffe27a] transition-colors"
                >
                  <Icon name="play" className="h-4 w-4 shrink-0" filled />
                  <span>{t("เลือกภาษาและเริ่มลุย →", "Choose Language →")}</span>
                </Link>
              </div>
            </div>

            {/* Card 2: Explain Code */}
            <div className="group flex flex-col justify-between rounded-2xl border border-[#2f2d45] bg-[#141220] p-6 sm:p-7 transition-all hover:border-[#9b5de5]/70 shadow-lg">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25193b] border border-[#9b5de5]/45 text-[#c084fc] mb-4">
                  <Icon name="code" className="h-5 w-5" />
                </div>

                <h2 className="text-xl font-extrabold text-[#f4efe6]">
                  {t("อธิบายโค้ด", "Explain Code")}
                </h2>
                <p className="mt-2 text-sm text-[#9a93ad] leading-relaxed">
                  {t(
                    "วางโค้ดจาก AI เพื่อสรุปภาพรวม ไล่การทำงานทีละบรรทัด และตรวจจับจุดเสี่ยง",
                    "Paste AI code for instant summaries, line-by-line flow, and risk alerts."
                  )}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2f2d45] flex flex-wrap items-center gap-2.5">
                <Link
                  href="/explain"
                  className="retro-button flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#2fbf71] px-5 py-3 text-sm font-extrabold text-[#120f1c] hover:bg-[#34d37d] transition-colors"
                >
                  <Icon name="sparkles" className="h-4 w-4 shrink-0" />
                  <span>{t("เริ่มอธิบายโค้ด →", "Explain Code →")}</span>
                </Link>
                <Link
                  href="/my-history"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-4 py-3 text-sm font-bold text-[#c4bdd6] hover:bg-[#252238] hover:text-[#f4efe6] transition-colors"
                >
                  {t("ประวัติ", "History")}
                </Link>
              </div>
            </div>
          </section>

          {/* Compact 3-Step Guide */}
          <section className="rounded-2xl border border-[#2f2d45] bg-[#141220] p-6 sm:p-7 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <h3 className="text-lg font-extrabold text-[#f4efe6]">
                {t("เริ่มต้นใน 3 ขั้นตอน", "Get Started in 3 Steps")}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/login"
                  className="whitespace-nowrap rounded-xl border border-[#3d395a] bg-[#1c1b2b] px-4 py-2 text-xs font-bold text-[#f4efe6] hover:border-[#f6c945]/60 hover:bg-[#252238] transition-colors"
                >
                  {t("เข้าสู่ระบบ", "Login")}
                </Link>
                <Link
                  href="/register"
                  className="whitespace-nowrap rounded-xl bg-[#2fbf71] px-4 py-2 text-xs font-extrabold text-[#120f1c] hover:bg-[#34d37d] transition-colors"
                >
                  {t("สมัครสมาชิก", "Sign Up")}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#5a2d91] border border-[#9b5de5]/60 text-xs font-bold text-[#ffe27a]">
                  1
                </span>
                <h4 className="mt-2.5 text-sm font-bold text-[#f4efe6]">
                  {t("เลือกภาษาหรือวางโค้ด", "Pick a Language or Paste Code")}
                </h4>
                <p className="mt-1 text-xs text-[#9a93ad]">
                  {t(
                    "เล่นดันเจี้ยนหรือวิเคราะห์โค้ดได้ทันทีโดยไม่ต้องล็อกอิน",
                    "Jump into any dungeon or code explainer without logging in."
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#5a2d91] border border-[#9b5de5]/60 text-xs font-bold text-[#ffe27a]">
                  2
                </span>
                <h4 className="mt-2.5 text-sm font-bold text-[#f4efe6]">
                  {t("ล็อกอินเก็บ XP และประวัติ", "Log In to Save XP & History")}
                </h4>
                <p className="mt-1 text-xs text-[#9a93ad]">
                  {t(
                    "ใช้ชื่อเล่น + PIN 4 หลักเพื่อสะสม XP ตราเกียรติยศ และเรียนต่อ",
                    "Use nickname + 4-digit PIN to save XP, badges, and progress."
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#5a2d91] border border-[#9b5de5]/60 text-xs font-bold text-[#ffe27a]">
                  3
                </span>
                <h4 className="mt-2.5 text-sm font-bold text-[#f4efe6]">
                  {t("ครูสร้างคอร์สและติดตามผล", "Teachers Build & Track Courses")}
                </h4>
                <p className="mt-1 text-xs text-[#9a93ad]">
                  {t(
                    "สร้างบทเรียน แบบทดสอบ และดูพัฒนาการ Block Model ของผู้เรียนได้",
                    "Create lessons, quizzes, and monitor student Block Model mastery."
                  )}
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ==================== 1. หน้าเข้าสู่ระบบแยกตาม Role: นักเรียน & ครูผู้สอน ====================
  if (appMode === "student-login" || appMode === "teacher-login") {
    const isTeacherRole = appMode === "teacher-login";

    return (
      <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6] flex flex-col">
        {/* แถบบนสไตล์ Dark Dungeon */}
        <header className="bg-[#141220] border-b border-[#2f2d45] text-[#f4efe6] px-6 py-4 flex flex-wrap items-center justify-between gap-3 transition">
          <div className="flex items-center gap-3 text-[20px] font-extrabold tracking-tight text-[#ffe27a]">
            <button
              type="button"
              onClick={() => setAppMode("landing")}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#f6c945]/70 bg-[#1c1b2b] px-3.5 py-1.5 text-[13px] font-extrabold text-[#ffe27a] hover:border-[#f6c945] hover:bg-[#281d08] transition cursor-pointer"
            >
              <Icon name="home" size={16} className="text-[#f6c945]" />
              <span>{t("← กลับไปหน้าแรก", "← Back to Home")}</span>
            </button>
            <Image
              src="/logo.png"
              alt="CODE COOL"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain border border-[#f6c945]/50 bg-[#0d0b14] shrink-0"
            />
            <span>
              CODE COOL {isTeacherRole ? t("· ครูผู้สอน", "· Teacher") : t("· นักเรียน", "· Student")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[13px] font-bold text-[#9a93ad]">
              {t("สลับบทบาท (Role):", "Switch Role:")}
            </span>
            <button
              type="button"
              onClick={() => {
                setAuthMessage(null);
                setTeacherAuthError("");
                setAppMode(isTeacherRole ? "student-login" : "teacher-login");
              }}
              className="press-secondary px-4 py-2 rounded-xl text-[13px] font-extrabold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Icon name={isTeacherRole ? "user" : "users"} size={18} />
              <span>
                {isTeacherRole
                  ? t("ไปฝั่งนักเรียน", "Go to Student")
                  : t("ไปฝั่งครูผู้สอน", "Go to Teacher")}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-[#141220] border-2 border-[#2f2d45] rounded-[24px] p-6 sm:p-8 max-w-[470px] w-full flex flex-col gap-5 shadow-2xl">
            {/* แถบเลือก Role หลัก (นักเรียน / ครูผู้สอน) */}
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#1c1b2b] border border-[#2f2d45]">
              <button
                type="button"
                onClick={() => {
                  setAuthMessage(null);
                  setAppMode("student-login");
                }}
                className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${!isTeacherRole
                    ? "bg-[#5a2d91] text-[#ffe27a] border border-[#f6c945]/75 shadow-sm"
                    : "text-[#9a93ad] hover:text-[#f4efe6]"
                  }`}
              >
                <Icon name="user" size={18} />
                <span>{t("Role: นักเรียน", "Role: Student")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTeacherAuthError("");
                  setAppMode("teacher-login");
                }}
                className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${isTeacherRole
                    ? "bg-[#5a2d91] text-[#ffe27a] border border-[#f6c945]/75 shadow-sm"
                    : "text-[#9a93ad] hover:text-[#f4efe6]"
                  }`}
              >
                <Icon name="users" size={18} />
                <span>{t("Role: ครูผู้สอน", "Role: Teacher")}</span>
              </button>
            </div>

            {/* ==================== ฟอร์มสำหรับ ROLE: นักเรียน ==================== */}
            {!isTeacherRole && (
              <>
                <div>
                  <h1 className="text-[26px] font-extrabold text-[#f4efe6] tracking-tight">
                    {studentAuthTab === "login"
                      ? t("พร้อมลุยเควสต์?", "Ready for the Quest?")
                      : t("สมัครเข้าห้องเรียนใหม่", "Join a New Classroom")}
                  </h1>
                  <p className="text-[14px] text-[#9a93ad] mt-0.5">
                    {t(
                      "อ่านโค้ดทีละขั้น เก็บ XP และตรา แล้วดูว่าตัวเองเข้าใจโค้ดตรงไหน",
                      "Read code step by step, earn XP and badges, and see where you master code."
                    )}
                  </p>
                </div>

                {/* ปุ่มสลับโหมด เข้าเล่น vs สมัครเข้าเล่นใหม่ */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMessage(null);
                      setStudentAuthTab("login");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold border-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${studentAuthTab === "login"
                        ? "bg-[#25193b] border-[#9b5de5] text-[#ffe27a]"
                        : "bg-[#1c1b2b] border-[#2f2d45] text-[#9a93ad]"
                      }`}
                  >
                    <Icon name="play" size={16} filled={studentAuthTab === "login"} />
                    <span>{t("มีชื่อเล่นแล้ว (เข้าเล่น)", "Login (Have Nickname)")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMessage(null);
                      setStudentAuthTab("register");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold border-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${studentAuthTab === "register"
                        ? "bg-[#281d08] border-[#f6c945] text-[#ffe27a]"
                        : "bg-[#1c1b2b] border-[#2f2d45] text-[#9a93ad]"
                      }`}
                  >
                    <Icon name="user" size={16} />
                    <span>{t("สมัครเข้าเล่นใหม่", "Sign Up New")}</span>
                  </button>
                </div>

                {authMessage && (
                  <div
                    role="alert"
                    className={`flex items-start gap-3 p-4 rounded-xl text-[13px] font-bold border-2 shadow-md ${authMessage.type === "error"
                        ? "bg-[#2d141c] text-[#fca5a5] border-[#c0283a]"
                        : "bg-[#102a1e] text-[#86efac] border-[#2fbf71]"
                      }`}
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/30 text-sm">
                      <Icon
                        name={authMessage.type === "error" ? "alert" : "check"}
                        size={16}
                        className="shrink-0 mt-0.5"
                      />
                    </span>
                    <div className="flex-1 leading-relaxed">
                      <p className="font-extrabold text-[14px] mb-0.5">
                        {authMessage.type === "error"
                          ? t("แจ้งเตือนการกรอกข้อมูล", "Input Notice")
                          : t("ดำเนินการสำเร็จ", "Success")}
                      </p>
                      <p>{authMessage.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthMessage(null)}
                      aria-label={t("ปิดกล่องแจ้งเตือน", "Close alert")}
                      className="rounded-lg px-2 py-1 text-xs font-extrabold opacity-75 hover:bg-black/25 hover:opacity-100 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {studentAuthTab === "login" ? (
                  <form
                    onSubmit={runSubmit(handleStudentLogin, "student")}
                    noValidate
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[14px] font-extrabold text-[#f4efe6]">
                          {t("ชื่อเล่นสมมติ", "Nickname")}
                        </label>
                        <span className="text-[12px] font-semibold text-[#9a93ad]">
                          {t("ห้ามใช้ชื่อจริงหรืออีเมล (PDPA)", "No real names or emails (PDPA)")}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={loginNickname}
                        onChange={(e) => setLoginNickname(e.target.value)}
                        placeholder={t("เช่น แมวส้ม", "e.g. OrangeCat")}
                        className="w-full px-4 py-3.5 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] text-[16px] font-bold text-[#f4efe6] focus:outline-none focus:border-[#f6c945]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[14px] font-extrabold text-[#f4efe6]">
                        {t("รหัส PIN 4 หลัก", "4-Digit PIN")}
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        inputMode="numeric"
                        autoComplete="off"
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••"
                        className="w-full px-4 py-3.5 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] text-[16px] font-bold text-[#f4efe6] tracking-widest focus:outline-none focus:border-[#f6c945]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="press-gold disabled:opacity-60 w-full py-4 rounded-2xl text-[18px] font-extrabold flex items-center justify-center gap-2.5 cursor-pointer mt-1"
                    >
                      <Icon name="play" size={22} filled />
                      <span>
                        {isSubmitting
                          ? t("กำลังตรวจสอบ...", "Checking...")
                          : t("เริ่มเล่นเลย", "Start Playing")}
                      </span>
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={runSubmit(handleStudentSignupWithRoom, "student")}
                    noValidate
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[14px] font-extrabold text-[#f4efe6]">
                        {t("1. ตั้งชื่อเล่นสมมติของคุณ (PDPA)", "1. Set Your Nickname (PDPA)")}
                      </label>
                      <input
                        type="text"
                        value={loginNickname}
                        onChange={(e) => setLoginNickname(e.target.value)}
                        placeholder={t("เช่น เสือน้อย, โลมาสีฟ้า", "e.g. LittleTiger, BlueDolphin")}
                        className="w-full px-4 py-3 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] text-[16px] font-bold text-[#f4efe6] focus:outline-none focus:border-[#f6c945]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[14px] font-extrabold text-[#f4efe6]">
                          {t("2. ตั้งรหัส PIN 4 หลัก", "2. Set 4-Digit PIN")}
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          inputMode="numeric"
                          autoComplete="off"
                          value={loginPin}
                          onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ""))}
                          placeholder="••••"
                          className="w-full px-4 py-3 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] text-[16px] font-bold text-[#f4efe6] tracking-widest focus:outline-none focus:border-[#f6c945]"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[14px] font-extrabold text-[#f4efe6]">
                          {t("3. รหัสห้องจากครู (เว้นว่างได้)", "3. Teacher Room Code (Optional)")}
                        </label>
                        <input
                          type="text"
                          value={signupRoomCode}
                          onChange={(e) => setSignupRoomCode(e.target.value)}
                          placeholder={t("เว้นว่างได้ (หรือใส่รหัสห้อง)", "Optional (or enter room code)")}
                          className="w-full px-4 py-3 rounded-xl bg-[#281d08] border-2 border-[#f6c945] font-code font-extrabold text-[16px] text-[#ffe27a] placeholder:font-sans placeholder:font-normal placeholder:text-[13px] placeholder:text-[#9a93ad] focus:outline-none focus:border-[#ffe27a]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="press-gold disabled:opacity-60 w-full py-4 rounded-2xl text-[18px] font-extrabold flex items-center justify-center gap-2.5 cursor-pointer mt-1"
                    >
                      <Icon name="user" size={22} />
                      <span>
                        {isSubmitting
                          ? t("กำลังสมัคร...", "Signing up...")
                          : t("สมัครเข้าเล่นทันที", "Sign Up & Play")}
                      </span>
                    </button>
                  </form>
                )}
              </>
            )}

            {/* ==================== ฟอร์มสำหรับ ROLE: ครูผู้สอน ==================== */}
            {isTeacherRole && (
              <>
                <div>
                  <h1 className="text-[24px] font-extrabold text-[#f4efe6]">
                    {teacherAuthTab === "login"
                      ? t("เข้าสู่ระบบสำหรับครู", "Teacher Login")
                      : t("สมัครบัญชีครูผู้สอนใหม่", "Register New Teacher")}
                  </h1>
                  <p className="text-[13px] font-semibold text-[#9a93ad] mt-0.5">
                    {t(
                      "สร้างห้องเรียน ดูแผนที่ Block Model เฉลี่ยทั้งห้อง และปรับการสอน",
                      "Create classrooms, view class-wide Block Model mastery, and adjust instruction."
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherAuthError("");
                      setTeacherAuthTab("login");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold border-2 transition cursor-pointer ${teacherAuthTab === "login"
                        ? "bg-[#25193b] border-[#9b5de5] text-[#ffe27a]"
                        : "bg-[#1c1b2b] border-[#2f2d45] text-[#9a93ad]"
                      }`}
                  >
                    {t("เข้าสู่ระบบครู", "Teacher Login")}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTeacherAuthError("");
                      setTeacherAuthTab("register");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold border-2 transition cursor-pointer ${teacherAuthTab === "register"
                        ? "bg-[#281d08] border-[#f6c945] text-[#ffe27a]"
                        : "bg-[#1c1b2b] border-[#2f2d45] text-[#9a93ad]"
                      }`}
                  >
                    {t("สมัครบัญชีครูใหม่", "Register Teacher")}
                  </button>
                </div>

                {teacherAuthError && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 p-4 rounded-xl bg-[#2d141c] text-[#fca5a5] border-2 border-[#c0283a] text-[13px] font-bold shadow-md"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/30 text-sm">
                      <Icon name="alert" size={14} className="shrink-0" />
                    </span>
                    <div className="flex-1 leading-relaxed">
                      <p className="font-extrabold text-[14px] mb-0.5">
                        {t("แจ้งเตือนการกรอกข้อมูล", "Input Notice")}
                      </p>
                      <p>{teacherAuthError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTeacherAuthError("")}
                      aria-label={t("ปิดกล่องแจ้งเตือน", "Close alert")}
                      className="rounded-lg px-2 py-1 text-xs font-extrabold opacity-75 hover:bg-black/25 hover:opacity-100 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form
                  onSubmit={
                    teacherAuthTab === "login"
                      ? runSubmit(handleTeacherLogin, "teacher")
                      : runSubmit(handleTeacherRegister, "teacher")
                  }
                  noValidate
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] font-extrabold text-[#f4efe6]">
                      {t("ชื่อผู้ใช้ (ครู)", "Username (Teacher)")}
                    </label>
                    <input
                      type="text"
                      value={teacherUsername}
                      autoComplete="username"
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      placeholder={t("เช่น ครูตัวอย่าง", "e.g. DemoTeacher")}
                      className="w-full px-4 py-3 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] text-[15px] font-bold text-[#f4efe6] focus:outline-none focus:border-[#f6c945]"
                    />
                  </div>

                  {teacherAuthTab === "register" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[14px] font-extrabold text-[#f4efe6]">
                        {t("ชื่อที่แสดงในระบบ", "Display Name")}
                      </label>
                      <input
                        type="text"
                        value={teacherDisplayName}
                        onChange={(e) => setTeacherDisplayName(e.target.value)}
                        placeholder={t("เช่น ครูสมศรี (วิทยาการคำนวณ)", "e.g. Ms. Somsri (CS)")}
                        className="w-full px-4 py-3 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] text-[15px] font-bold text-[#f4efe6] focus:outline-none focus:border-[#f6c945]"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] font-extrabold text-[#f4efe6]">
                      {t("รหัสผ่าน", "Password")}
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? "text" : "password"}
                        value={teacherPassword}
                        autoComplete={
                          teacherAuthTab === "login"
                            ? "current-password"
                            : "new-password"
                        }
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-4 pr-20 py-3 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] text-[15px] font-bold text-[#f4efe6] focus:outline-none focus:border-[#f6c945]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret((v) => !v)}
                        aria-label={
                          showSecret
                            ? t("ซ่อนรหัสผ่าน", "Hide password")
                            : t("แสดงรหัสผ่าน", "Show password")
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[12px] font-extrabold text-[#ffe27a] bg-[#252238] border border-[#3d395a] hover:border-[#f6c945] cursor-pointer"
                      >
                        {showSecret ? t("ซ่อน", "Hide") : t("แสดง", "Show")}
                      </button>
                    </div>
                    {teacherAuthTab === "register" && (
                      <p className="text-[12px] font-semibold text-[#9a93ad]">
                        {t("ตั้งรหัสผ่านอย่างน้อย 4 ตัวอักษร", "Password must be at least 4 characters.")}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`disabled:opacity-60 w-full py-4 rounded-2xl text-[17px] font-extrabold flex items-center justify-center gap-2 cursor-pointer mt-1 ${teacherAuthTab === "login" ? "press-teal" : "press-gold"
                      }`}
                  >
                    <Icon name="users" size={20} />
                    <span>
                      {isSubmitting
                        ? t("กำลังตรวจสอบ...", "Checking...")
                        : teacherAuthTab === "login"
                          ? t("เข้าสู่ระบบสำหรับครู", "Teacher Login")
                          : t("สร้างบัญชีครูและเข้าใช้งาน", "Create Teacher Account")}
                    </span>
                  </button>
                </form>

                <p className="text-[12px] font-semibold text-[#9a93ad] leading-relaxed text-center">
                  {t(
                    "หน้านี้แสดงเฉพาะชื่อเล่นสมมติและคะแนน ไม่แสดงข้อมูลส่วนบุคคลจริงของนักเรียน",
                    "Only nicknames and scores are shown here; no real student personal data is displayed."
                  )}
                </p>
                <div className="pt-2 border-t border-[#2f2d45] flex items-center justify-center gap-2 text-[12px] text-[#9a93ad]">
                  <span className="font-bold">{t("บัญชีทดสอบ:", "Demo account:")}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherAuthTab("login");
                      setTeacherAuthError("");
                      setTeacherUsername("ครูตัวอย่าง");
                      setTeacherPassword("12345678");
                    }}
                    className="px-2.5 py-1 rounded-lg font-extrabold bg-[#1c1b2b] border border-[#3d395a] text-[#ffe27a] hover:border-[#f6c945] cursor-pointer"
                  >
                    {t("ใช้บัญชีครูตัวอย่าง", "Use Demo Teacher")}
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ==================== 3. แดชบอร์ดฝั่งครู (เฉพาะ Role: teacher) ====================
  if (appMode === "teacher-portal") {
    return (
      <TeacherDashboard
        teacherUsername={teacherUsername}
        classrooms={classrooms}
        students={students}
        onCreateClassroom={handleCreateClassroom}
        onUpdatePinnedReview={handleUpdatePinnedReview}
        onLogout={handleLogout}
        onSwitchToStudentView={() => {
          saveSessionToStorage(null);
          setAppMode("student-login");
        }}
        cellAverages={teacherCellAverages}
        questionStats={teacherQuestionStats}
        isLoading={teacherLoading}
        onRefresh={fetchTeacherAnalytics}
      />
    );
  }

  // ==================== 4. ระบบฝั่งนักเรียน (เฉพาะ Role: student) ====================
  const studentLevel = Math.floor(currentStudent.xp / 100) + 1;
  const studentAvgMastery = Math.round(
    Object.values(currentStudent.cellScores).reduce((a, b) => a + b, 0) / 12
  );

  const sortedStudentCells = [...BLOCK_MODEL_CELLS].sort(
    (a, b) =>
      (currentStudent.cellScores[b.id] ?? 0) -
      (currentStudent.cellScores[a.id] ?? 0)
  );
  const strongStudentCells = sortedStudentCells.filter(
    (c) => (currentStudent.cellScores[c.id] ?? 0) >= 80
  );
  const reviewStudentCells = sortedStudentCells
    .filter((c) => (currentStudent.cellScores[c.id] ?? 0) < 60)
    .reverse();

  return (
    <div className="min-h-screen bg-[#0d0b14] text-[#f4efe6] flex flex-col">
      {/* แถบบนสไตล์ Dark Dungeon */}
      <header className="bg-[#141220] border-b border-[#2f2d45] text-[#f4efe6] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAppMode("landing")}
              className="px-2.5 py-1 rounded-lg bg-[#1c1b2b] border border-[#3d395a] hover:border-[#f6c945]/60 text-[12px] font-bold text-[#f4efe6] cursor-pointer"
            >
              {t("← หน้าแรก", "← Home")}
            </button>
            <button
              type="button"
              onClick={() => setStudentTab("quest")}
              className="text-[20px] font-extrabold tracking-tight text-[#ffe27a] flex items-center gap-2 cursor-pointer"
            >
              <Image
                src="/logo.png"
                alt="CODE COOL"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-contain border border-[#f6c945]/50 bg-[#0d0b14] shrink-0"
              />
              <span>CODE COOL</span>
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-[#25193b] border border-[#9b5de5]/60 text-[#e9d5ff] text-[12px] font-extrabold">
              {t(
                `นักเรียน: ${currentStudent.nickname} (ห้อง ${currentStudent.roomCode})`,
                `Student: ${currentStudent.nickname} (Room ${currentStudent.roomCode})`
              )}
            </span>
          </div>

          {/* เมนูนำทางฝั่งนักเรียน */}
          <nav className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "quest" as StudentTab, label: t("เส้นทางเควสต์", "Quest Map"), icon: "route" as const },
              { id: "practice" as StudentTab, label: t("ฝึกอ่านโค้ด", "Practice"), icon: "play" as const },
              { id: "learn" as StudentTab, label: "Block Model", icon: "book" as const },
              { id: "profile" as StudentTab, label: t("โปรไฟล์", "Profile"), icon: "user" as const },
            ].map((tab) => {
              const active = studentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStudentTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-[13px] font-extrabold flex items-center gap-1.5 transition cursor-pointer ${active
                      ? "bg-[#5a2d91] text-[#ffe27a] border border-[#f6c945]/80"
                      : "bg-[#1c1b2b] hover:bg-[#252238] text-[#c4bdd6] border border-[#2f2d45]"
                    }`}
                >
                  <Icon name={tab.icon} size={17} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* แถบ XP, สตรีค และปุ่มออกจากระบบ */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-[#281d08] border border-[#f6c945]/60 text-[#ffe27a] text-[13px] font-extrabold flex items-center gap-1.5">
              <Icon name="star" size={16} filled />
              <span>
                Lv.{studentLevel} · {currentStudent.xp} XP
              </span>
            </div>

            <div
              className="px-2.5 py-1 rounded-xl bg-[#1c1b2b] border border-[#3d395a] text-[#f6c945] text-[13px] font-extrabold flex items-center gap-1"
              title={t("สตรีคการฝึกต่อเนื่อง", "Practice streak")}
            >
              <Icon name="flame" size={16} filled />
              <span>{currentStudent.streak}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-[#1c1b2b] hover:bg-[#2d141c] border border-[#3d395a] hover:border-[#c0283a] text-[#f4efe6] hover:text-[#fca5a5] text-[12px] font-extrabold flex items-center gap-1.5 cursor-pointer"
              title={t("ออกจากระบบหรือสลับบทบาท", "Log out or switch role")}
            >
              <Icon name="logout" size={16} />
              <span>{t("ออกจากระบบ", "Log Out")}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {/* ==================== TAB 1: เส้นทางเควสต์ ==================== */}
        {studentTab === "quest" && (
          <div className="flex flex-col gap-6">
            {/* การ์ดเควสต์ประจำวัน + คำแนะนำทบทวนจากครู */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 bg-[#281d08] border-2 border-[#f6c945]/70 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#f6c945] border-2 border-[#b8860b] text-[#120f1c] flex items-center justify-center shrink-0">
                    <Icon name="target" size={24} />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#120f1c] border border-[#f6c945]/50 text-[#ffe27a] text-[11px] font-extrabold">
                      {t("เควสต์ประจำวัน · โบนัส +30 XP", "Daily Quest · Bonus +30 XP")}
                    </span>
                    <h3 className="text-[18px] font-extrabold text-[#f4efe6] mt-1">
                      {t(
                        "ฝึกอ่านโค้ดและตอบคำถามช่องการทำงานจริง (E1–E4)",
                        "Practice reading code and answering Execution questions (E1–E4)"
                      )}
                    </h3>
                    <p className="text-[13px] font-semibold text-[#ffe27a]/90 mt-0.5">
                      {t(
                        "สะสม XP จากความเข้าใจโดยตรง ไม่คิดคะแนนจากความเร็ว",
                        "Earn XP from true comprehension — never scored by speed."
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextTopicId =
                      TOPICS.find(
                        (topicItem) => !currentStudent.completedTopics.includes(topicItem.id)
                      )?.id || 1;
                    setSelectedTopicId(nextTopicId);
                    setStudentTab("practice");
                  }}
                  className="press-gold px-6 py-3.5 rounded-xl text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Icon name="play" size={18} filled />
                  <span>{t("เริ่มเล่นเควสต์วันนี้", "Start Today's Quest")}</span>
                </button>
              </div>

              {/* การ์ดเรื่องที่ครูปักหมุดให้ทบทวนประจำห้อง */}
              <div className="lg:col-span-5 bg-[#141220] border-2 border-[#2f2d45] rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[12px] font-extrabold text-[#ffe27a]">
                      {t(
                        `คำแนะนำจากครู (${currentStudentRoom?.roomName || currentStudent.roomCode})`,
                        `Teacher's Pin (${currentStudentRoom?.roomName || currentStudent.roomCode})`
                      )}
                    </span>
                    <h4 className="text-[16px] font-extrabold text-[#f4efe6] mt-0.5">
                      {TOPICS.find(
                        (topicItem) => topicItem.id === currentStudentRoom?.pinnedReviewTopicId
                      )?.title || t("เรื่องที่ 4 · วนซ้ำ while", "Topic 4 · while Loops")}
                    </h4>
                  </div>
                  <Icon name="bulb" size={22} className="text-[#f6c945] shrink-0" />
                </div>
                <p className="text-[13px] text-[#9a93ad]">
                  {currentStudentRoom?.pinnedReviewNote ||
                    t(
                      "ฝึกเดินโค้ดดูค่าตัวแปรและเงื่อนไขการหยุดลูป",
                      "Trace variables and loop termination conditions."
                    )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTopicId(
                      currentStudentRoom?.pinnedReviewTopicId || 4
                    );
                    setStudentTab("practice");
                  }}
                  className="press-secondary w-full py-2.5 rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Icon name="play" size={16} filled />
                  <span>{t("เข้าเล่นเรื่องที่ครูแนะนำ", "Play Recommended Topic")}</span>
                </button>
              </div>
            </div>

            {/* เส้นทางเควสต์ 7 เรื่อง */}
            <div className="bg-[#141220] border-2 border-[#2f2d45] rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[24px] font-extrabold text-[#f4efe6]">
                    {t("เส้นทางเควสต์ 7 เรื่อง", "7-Topic Quest Path")}
                  </h2>
                  <p className="text-[14px] font-semibold text-[#9a93ad]">
                    {t(
                      `ผ่านแล้ว ${currentStudent.completedTopics.length}/7 เรื่อง · บอสด่านเปิดเมื่อผ่านอย่างน้อย 4 เรื่อง`,
                      `Completed ${currentStudent.completedTopics.length}/7 topics · Boss unlocks after 4+ topics`
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setUnlockAllDemo(!unlockAllDemo)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-extrabold border-2 transition cursor-pointer ${unlockAllDemo
                      ? "bg-[#102a1e] border-[#2fbf71] text-[#86efac]"
                      : "press-secondary"
                    }`}
                >
                  {unlockAllDemo
                    ? t("✓ ปลดล็อกทุกเรื่องแล้ว", "✓ All Topics Unlocked")
                    : t("ปลดล็อกทุกเรื่อง (โหมดสาธิต)", "Unlock All (Demo Mode)")}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TOPICS.map((topic) => {
                  const isPassed = currentStudent.completedTopics.includes(
                    topic.id
                  );
                  const unlocked = isTopicUnlocked(topic.id);
                  const isBoss = Boolean(topic.isBoss);

                  return (
                    <div
                      key={topic.id}
                      className={`rounded-2xl border-2 p-5 flex flex-col justify-between gap-4 transition ${isBoss
                          ? unlocked
                            ? "bg-[#25193b] border-[#9b5de5] md:col-span-2 lg:col-span-3"
                            : "bg-[#1c1b2b] border-[#2f2d45] md:col-span-2 lg:col-span-3 opacity-80"
                          : isPassed
                            ? "bg-[#102a1e]/60 border-[#2fbf71]/60"
                            : unlocked
                              ? "bg-[#1c1b2b] border-[#f6c945]/75 shadow-sm"
                              : "bg-[#161426] border-[#2f2d45] opacity-75"
                        }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <StatusCircle
                          variant={
                            isBoss
                              ? unlocked
                                ? "boss"
                                : "locked"
                              : isPassed
                                ? "passed"
                                : unlocked
                                  ? "current"
                                  : "locked"
                          }
                          size="md"
                          label={topic.title}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[12px] font-extrabold ${isBoss
                                  ? "bg-[#5a2d91] text-[#ffe27a] border border-[#9b5de5]"
                                  : isPassed
                                    ? "bg-[#102a1e] text-[#86efac] border border-[#2fbf71]/50"
                                    : unlocked
                                      ? "bg-[#281d08] text-[#ffe27a] border border-[#f6c945]/50"
                                      : "bg-[#252238] text-[#9a93ad]"
                                }`}
                            >
                              {isPassed
                                ? t("ผ่านแล้ว", "Passed")
                                : unlocked
                                  ? isBoss
                                    ? t("บอสด่านพร้อมลุย!", "Boss Ready!")
                                    : t("พร้อมเข้าเล่น", "Ready")
                                  : isBoss
                                    ? t(
                                      `ล็อก (ผ่านแล้ว ${currentStudent.completedTopics.length}/4 เรื่อง)`,
                                      `Locked (${currentStudent.completedTopics.length}/4 done)`
                                    )
                                    : t("ล็อก", "Locked")}
                            </span>

                            <span className="text-[12px] font-bold text-[#9a93ad]">
                              {t("ช่อง", "Cells")}{" "}
                              {topic.questions.map((q) => q.cellId).join(", ")}
                            </span>
                          </div>

                          <h3 className="text-[18px] font-extrabold text-[#f4efe6] mt-1.5">
                            {topic.title}
                          </h3>
                          <p className="text-[14px] text-[#9a93ad] mt-0.5">
                            {topic.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#2f2d45]">
                        <span className="text-[13px] font-extrabold text-[#ffe27a] flex items-center gap-1.5">
                          <Icon name="shield" size={16} />
                          <span>
                            {t("ตรา:", "Badge:")} {topic.badgeReward.name}
                          </span>
                        </span>

                        <button
                          type="button"
                          disabled={!unlocked}
                          onClick={() => {
                            setSelectedTopicId(topic.id);
                            setStudentTab("practice");
                          }}
                          className={`px-5 py-2.5 rounded-xl text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${isBoss
                              ? "press-boss"
                              : isPassed
                                ? "press-secondary"
                                : "press-teal"
                            }`}
                        >
                          <Icon
                            name={unlocked ? "play" : "lock"}
                            size={18}
                            filled={unlocked}
                          />
                          <span>
                            {isPassed
                              ? t("เล่นซ้ำ", "Replay")
                              : unlocked
                                ? t("เริ่มเล่นด่านนี้", "Start Stage")
                                : t("ยังไม่ปลดล็อก", "Locked")}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: หน้าฝึกอ่านโค้ด (PRIMM 4 ขั้น) ==================== */}
        {studentTab === "practice" && (
          <PracticeArena
            key={activeTopic.id}
            topic={activeTopic}
            currentStudent={currentStudent}
            studentId={currentStudent?.id}
            onBackToMap={() => setStudentTab("quest")}
            onCompleteTopic={handleCompleteTopic}
          />
        )}

        {/* ==================== TAB 3: หน้าอธิบาย Block Model 12 ช่อง & ทดลองรันโค้ดจริง ==================== */}
        {studentTab === "learn" && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#141220] border-2 border-[#2f2d45] rounded-2xl p-6 flex flex-col gap-4">
              <h2 className="text-[24px] font-extrabold text-[#f4efe6] flex items-center gap-2">
                <Icon name="book" size={24} className="text-[#f6c945]" />
                <span>
                  {t(
                    "รู้จัก Block Model 12 ช่อง และวิธีเรียน 4 ขั้น (PRIMM)",
                    "Understanding the 12-Cell Block Model & 4-Step PRIMM Method"
                  )}
                </span>
              </h2>
              <p className="text-[15px] text-[#9a93ad]">
                {uiLang === "en" ? (
                  <>
                    When AI writes code for us, truly &ldquo;understanding the code&rdquo; means more than reading words — it requires mastering <strong className="text-[#f4efe6]">3 dimensions</strong> across every level of code, from a single line to the whole program: the <strong className="text-[#ffe27a]">12 cells of the Block Model</strong>.
                  </>
                ) : (
                  <>
                    เวลาเราสั่ง AI ให้เขียนโค้ดให้ การจะบอกว่าเรา &ldquo;เข้าใจโค้ดนั้นจริง&rdquo; ไม่ใช่แค่อ่านออกทีละคำ แต่ต้องเข้าใจครบทั้ง <strong className="text-[#f4efe6]">3 มิติ</strong> ในทุกระดับของโค้ด ตั้งแต่บรรทัดเดี่ยวไปจนถึงภาพรวมทั้งโปรแกรม รวมเป็น <strong className="text-[#ffe27a]">12 ช่องของ Block Model</strong>
                  </>
                )}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                <div className="p-4 rounded-xl bg-[#25193b] border border-[#9b5de5]/60">
                  <div className="text-[15px] font-extrabold text-[#e9d5ff]">
                    {t(
                      "มิติที่ 1 · โครงสร้างโค้ด (Text Surface: T1–T4)",
                      "Dimension 1 · Text Surface (T1–T4)"
                    )}
                  </div>
                  <p className="text-[14px] text-[#f4efe6]/90 mt-1">
                    {t(
                      "อ่านไวยากรณ์ เครื่องหมาย ขอบเขตบล็อก `if/else`, ลูป `for/while` และการเชื่อมโยงพารามิเตอร์ออกอย่างถูกต้อง",
                      "Accurately read syntax, symbols, `if/else` and `for/while` block scopes, and parameter links."
                    )}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#281d08] border border-[#f6c945]/60">
                  <div className="text-[15px] font-extrabold text-[#ffe27a]">
                    {t(
                      "มิติที่ 2 · การทำงานเมื่อรันจริง (Execution: E1–E4)",
                      "Dimension 2 · Execution (E1–E4)"
                    )}
                  </div>
                  <p className="text-[14px] text-[#f4efe6]/90 mt-1">
                    {t(
                      "แกะรอยได้ว่าเมื่อรันจริง โค้ดเดินไปบรรทัดไหนบ้าง ค่าตัวแปรเปลี่ยนเป็นเท่าไหร่ และพิมพ์ผลลัพธ์อะไรออกมา",
                      "Trace which lines execute at runtime, how variables change, and what output is printed."
                    )}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#102a1e] border border-[#2fbf71]/60">
                  <div className="text-[15px] font-extrabold text-[#86efac]">
                    {t(
                      "มิติที่ 3 · หน้าที่และเป้าหมาย (Function: F1–F4)",
                      "Dimension 3 · Function & Purpose (F1–F4)"
                    )}
                  </div>
                  <p className="text-[14px] text-[#f4efe6]/90 mt-1">
                    {t(
                      "อธิบายได้ว่าแต่ละบรรทัด แต่ละบล็อก และทั้งโปรแกรมมีไว้ทำไม แก้ปัญหาอะไร และตรวจจับบั๊กที่ขัดกับเป้าหมายได้",
                      "Explain why each line, block, and program exists, what problem it solves, and catch logic bugs."
                    )}
                  </p>
                </div>
              </div>
            </div>

            <BlockModelGrid
              cellScores={currentStudent.cellScores}
              title={t(
                "สำรวจทั้ง 12 ช่องของ Block Model (คลิกที่ช่องเพื่อดูตัวอย่างคำถามและไปฝึก)",
                "Explore All 12 Block Model Cells (Click any cell to view sample questions & practice)"
              )}
              onSelectTopic={(topicId) => {
                setSelectedTopicId(topicId);
                setStudentTab("practice");
              }}
            />

            {/* กล่องทดลองวางโค้ด JavaScript จาก AI เพื่อรันจริง */}
            <div className="bg-[#141220] border-2 border-[#2f2d45] rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-[18px] font-extrabold text-[#f4efe6] flex items-center gap-2">
                  <Icon name="code" size={20} className="text-[#f6c945]" />
                  <span>
                    {t(
                      "ห้องทดลองรันโค้ด JavaScript จริง (ตรวจสอบโค้ดที่ AI เขียนให้)",
                      "Live JavaScript Sandbox (Verify AI-Generated Code)"
                    )}
                  </span>
                </h3>
                <p className="text-[13px] font-semibold text-[#9a93ad]">
                  {t(
                    "วางโค้ด JavaScript ที่คุณได้มาจาก AI แล้วกดรันจริงเพื่อดูผลลัพธ์จาก console.log โดยไม่ใช้การเดา",
                    "Paste JavaScript code from AI and run it for real to inspect console.log output without guessing."
                  )}
                </p>
              </div>

              <textarea
                rows={6}
                value={playgroundCode}
                onChange={(e) => setPlaygroundCode(e.target.value)}
                className="w-full p-4 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] font-code font-bold text-[#f4efe6]"
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const res = runJavaScriptReal(playgroundCode);
                    setPlaygroundOutput(
                      res.success
                        ? res.finalOutput ||
                        t(
                          "(โค้ดทำงานสำเร็จแต่ไม่มีคำสั่ง console.log)",
                          "(Code ran successfully with no console.log output)"
                        )
                        : `${t("ข้อผิดพลาด:", "Error:")} ${res.error}`
                    );
                  }}
                  className="press-gold px-5 py-2.5 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer"
                >
                  <Icon name="play" size={18} />
                  <span>{t("รันโค้ดจริง", "Run Code")}</span>
                </button>
              </div>

              {playgroundOutput && (
                <div className="p-4 rounded-xl bg-[#102a1e] border-2 border-[#2fbf71]/50 text-[#86efac]">
                  <div className="text-[13px] font-extrabold">
                    {t("ผลลัพธ์จากการรันโค้ดจริง:", "Actual Execution Output:")}
                  </div>
                  <pre className="font-code font-extrabold text-[16px] mt-1 !bg-transparent !border-0 !p-0">
                    {playgroundOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: โปรไฟล์นักเรียน ==================== */}
        {studentTab === "profile" && (
          <div className="flex flex-col gap-6">
            {/* การ์ดข้อมูลสรุปนักเรียน */}
            <div className="bg-[#141220] border-2 border-[#2f2d45] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <StatusCircle variant="badge" size="lg" label={t("โปรไฟล์นักเรียน", "Student Profile")} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[24px] font-extrabold text-[#f4efe6]">
                      {t(
                        `โปรไฟล์ของ ${currentStudent.nickname}`,
                        `${currentStudent.nickname}'s Profile`
                      )}
                    </h2>
                    <span className="px-3 py-0.5 rounded-full bg-[#25193b] border border-[#9b5de5]/60 text-[#e9d5ff] text-[13px] font-extrabold">
                      {t(`รหัสห้อง ${currentStudent.roomCode}`, `Room ${currentStudent.roomCode}`)}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold text-[#9a93ad] mt-0.5">
                    {t(
                      `เลเวล ${studentLevel} · สะสม ${currentStudent.xp} XP · ต่อเนื่อง ${currentStudent.streak} วัน · ผ่านแล้ว ${currentStudent.completedTopics.length}/7 เรื่อง · ความเข้าใจเฉลี่ย ${studentAvgMastery}% (${getMasteryStatus(studentAvgMastery, uiLang).label})`,
                      `Level ${studentLevel} · ${currentStudent.xp} XP · ${currentStudent.streak}d streak · ${currentStudent.completedTopics.length}/7 topics · Avg mastery ${studentAvgMastery}% (${getMasteryStatus(studentAvgMastery, uiLang).label})`
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStudentTab("quest")}
                className="press-gold px-4 py-2.5 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer"
              >
                <Icon name="route" size={18} />
                <span>{t("ไปฝึกเรื่องถัดไป", "Go to Next Topic")}</span>
              </button>
            </div>

            {/* สรุปด้านที่เก่ง & ด้านที่ควรทบทวน */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#102a1e] border-2 border-[#2fbf71]/50 rounded-2xl p-5 text-[#86efac]">
                <div className="flex items-center gap-2 font-extrabold text-[16px]">
                  <Icon name="check" size={20} />
                  <span>{t("ด้านที่เก่ง (เข้าใจ 80% ขึ้นไป)", "Strengths (80%+ Mastery)")}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {strongStudentCells.length > 0 ? (
                    strongStudentCells.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl bg-[#0d0b14]/70 border border-[#2fbf71]/30 flex items-center justify-between text-[14px] font-bold text-[#f4efe6]"
                      >
                        <span>
                          {t("ช่อง", "Cell")} {c.id} · {c.shortTitle}
                        </span>
                        <span className="font-extrabold text-[#86efac]">
                          {currentStudent.cellScores[c.id]}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[14px]">
                      {t(
                        "ฝึกทำโจทย์เพิ่มเพื่อปลดล็อกช่องที่เก่งเกิน 80%!",
                        "Keep practicing to unlock cells above 80% mastery!"
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-[#2d141c] border-2 border-[#c0283a]/60 rounded-2xl p-5 text-[#fca5a5]">
                <div className="flex items-center gap-2 font-extrabold text-[16px]">
                  <Icon name="bulb" size={20} />
                  <span>{t("ด้านที่ควรทบทวนเพิ่มเติม", "Needs Review")}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {reviewStudentCells.length > 0 ? (
                    reviewStudentCells.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl bg-[#0d0b14]/70 border border-[#c0283a]/30 flex items-center justify-between gap-2 text-[14px] font-bold text-[#f4efe6]"
                      >
                        <span>
                          {t("ช่อง", "Cell")} {c.id} · {c.shortTitle} ({currentStudent.cellScores[c.id]}%)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTopicId(c.relatedTopicId);
                            setStudentTab("practice");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#c0283a] hover:bg-[#e11d48] text-white text-[12px] font-extrabold cursor-pointer"
                        >
                          {t("ฝึกทบทวน →", "Review →")}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[14px] font-bold">
                      {t(
                        "ยอดเยี่ยมมาก! คุณผ่านเกณฑ์ความเข้าใจเกิน 60% ทุกช่องแล้ว",
                        "Awesome! You have scored above 60% across all cells."
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* แผนที่ความเข้าใจ 12 ช่องของนักเรียน */}
            <BlockModelGrid
              cellScores={currentStudent.cellScores}
              title={t(
                `แผนที่ความเข้าใจ 12 ช่องของ ${currentStudent.nickname}`,
                `${currentStudent.nickname}'s 12-Cell Understanding Map`
              )}
              onSelectTopic={(topicId) => {
                setSelectedTopicId(topicId);
                setStudentTab("practice");
              }}
            />

            {/* ตราที่ได้รับ (Badges) และประวัติการเล่น */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 bg-[#141220] border-2 border-[#2f2d45] rounded-2xl p-5 flex flex-col gap-3">
                <h3 className="text-[17px] font-extrabold text-[#f4efe6] flex items-center gap-2">
                  <Icon name="shield" size={20} className="text-[#f6c945]" />
                  <span>
                    {t("ตราความสำเร็จที่ได้รับ", "Earned Badges")} (
                    {TOPICS.filter((tp) =>
                      currentStudent.badges.includes(tp.badgeReward.id)
                    ).length +
                      SECRET_BADGES.filter((sb) =>
                        currentStudent.badges.includes(sb.id)
                      ).length}
                    /{TOPICS.length + SECRET_BADGES.length})
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TOPICS.map((topicItem) => {
                    const unlocked = currentStudent.badges.includes(
                      topicItem.badgeReward.id
                    );
                    return (
                      <div
                        key={topicItem.badgeReward.id}
                        className={`p-3 rounded-xl border flex items-center gap-3 ${unlocked
                            ? "bg-[#25193b] border-[#9b5de5] text-[#f4efe6]"
                            : "bg-[#1c1b2b] border-[#2f2d45] text-[#9a93ad] opacity-65"
                          }`}
                      >
                        <StatusCircle
                          variant={unlocked ? "badge" : "locked"}
                          size="sm"
                          label={topicItem.badgeReward.name}
                        />
                        <div className="min-w-0">
                          <div className="text-[14px] font-extrabold truncate">
                            {topicItem.badgeReward.name}
                          </div>
                          <div className="text-[12px] truncate text-[#9a93ad]">
                            {topicItem.badgeReward.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#2f2d45] space-y-2.5">
                  <div className="text-[13px] font-extrabold text-[#ffe27a] flex items-center gap-1.5">
                    <Icon name="sparkles" size={14} className="text-[#f6c945]" />
                    <span>{t("ตราความสำเร็จลับ (Secret Badges)", "Secret Badges")}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SECRET_BADGES.map((sb) => {
                      const unlocked = currentStudent.badges.includes(sb.id);
                      return (
                        <div
                          key={sb.id}
                          className={`p-3 rounded-xl border flex items-center gap-3 ${unlocked
                              ? "bg-[#2a1f12] border-[#f6c945] text-[#ffe27a]"
                              : "bg-[#1c1b2b] border-[#2f2d45] text-[#9a93ad] opacity-65"
                            }`}
                        >
                          <StatusCircle
                            variant={unlocked ? "badge" : "locked"}
                            size="sm"
                            label={unlocked ? sb.name : "Secret Badge"}
                          />
                          <div className="min-w-0">
                            <div className="text-[14px] font-extrabold truncate">
                              {unlocked ? sb.name : t("??? (ความลับ)", "??? (Secret)")}
                            </div>
                            <div className="text-[12px] truncate text-[#9a93ad]">
                              {sb.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#141220] border-2 border-[#2f2d45] rounded-2xl p-5 flex flex-col gap-3">
                <h3 className="text-[17px] font-extrabold text-[#f4efe6] flex items-center gap-2">
                  <Icon name="chart" size={20} className="text-[#f6c945]" />
                  <span>{t("ประวัติการฝึกอ่านโค้ดล่าสุด", "Recent Practice History")}</span>
                </h3>
                {currentStudent.history.length > 0 ? (
                  <div className="space-y-2.5">
                    {currentStudent.history.map((h, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-[#1c1b2b] border border-[#2f2d45] flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-[14px] font-extrabold text-[#f4efe6]">
                            {h.topicTitle}
                          </div>
                          <div className="text-[12px] text-[#9a93ad]">
                            {h.timestamp} · {t("ความเข้าใจ", "Mastery")} {h.scorePercent}%
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-[#281d08] text-[#ffe27a] border border-[#f6c945]/60 text-[13px] font-extrabold">
                          +{h.xpEarned} XP
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-[#9a93ad]">
                    {t(
                      "ยังไม่มีประวัติการเล่น เริ่มฝึกเรื่องที่ 1 ในหน้าเส้นทางเควสต์ได้เลย!",
                      "No play history yet. Start Topic 1 on the Quest Map!"
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: บันทึกการใช้ AI ==================== */}
        {studentTab === "ailog" && (
          <div className="bg-[#141220] border-2 border-[#2f2d45] rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="px-3 py-1 rounded-full bg-[#25193b] border border-[#9b5de5]/60 text-[#e9d5ff] text-[12px] font-extrabold">
                  {t(
                    `รายการส่งงาน · บันทึกการใช้ AI (AI Log ${AI_USAGE_LOGS.length} Prompts)`,
                    `Submission · AI Usage Log (${AI_USAGE_LOGS.length} Prompts)`
                  )}
                </span>
                <h2 className="text-[22px] font-extrabold text-[#f4efe6] mt-2">
                  {t(
                    'บันทึกการใช้ AI พัฒนาโปรเจกต์ "CODE COOL"',
                    'AI Usage Log for Developing "CODE COOL"'
                  )}
                </h2>
                <p className="text-[14px] text-[#9a93ad]">
                  {t(
                    "แสดงรายการ Prompt ที่ใช้จริง เครื่องมือ AI ปัญหาที่พบ วิธีที่ทีมปรับปรุงแก้ไข และคำอธิบายโครงสร้างโค้ดตามกติกาการแข่งขันหน้า 4–5",
                    "Shows actual prompts used, AI tools, issues found, team fixes, and code structure explanations."
                  )}
                </p>
              </div>
              <Link
                href="/ai-log"
                className="press-gold px-4 py-2 rounded-xl text-[13px] font-extrabold inline-flex items-center gap-1.5"
              >
                <Icon name="clipboard" size={16} />
                <span>{t("เปิดหน้ารายงาน AI Log ฉบับเต็ม →", "Open Full AI Log →")}</span>
              </Link>
            </div>

            <div className="space-y-4">
              {AI_USAGE_LOGS.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-[#1c1b2b] border-2 border-[#2f2d45] flex flex-col gap-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-extrabold text-[#c084fc]">
                        {log.categoryLabel}
                      </span>
                      <div className="text-[16px] font-extrabold text-[#ffe27a]">
                        {log.promptTitle}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#141220] border border-[#3d395a] text-[12px] font-bold text-[#f4efe6]">
                      {t("เครื่องมือ AI:", "AI Tool:")} {log.aiTool}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141220] border border-[#2f2d45] text-[14px] text-[#f4efe6]">
                    <strong className="text-[#c084fc]">{t("Prompt ที่สั่ง AI: ", "Prompt: ")}</strong>
                    {log.promptText}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                    <div className="p-3 rounded-xl bg-[#2d141c] border border-[#c0283a]/40 text-[#fca5a5]">
                      <strong>
                        {t("ปัญหาที่พบจากโค้ด/เนื้อหาที่ AI สร้าง:", "Issues Found in AI Output:")}
                      </strong>
                      <p className="mt-0.5 text-[#f4efe6]/90">{log.problemFound}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#102a1e] border border-[#2fbf71]/40 text-[#86efac]">
                      <strong>
                        {t("วิธีที่ทีมปรับแก้และพัฒนาต่อ:", "Team Fixes & Improvements:")}
                      </strong>
                      <p className="mt-0.5 text-[#f4efe6]/90">{log.solutionApplied}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141220] border border-[#3d395a] text-[13px] text-[#c4bdd6]">
                    <strong className="text-[#ffe27a]">
                      {t("คำอธิบายโครงสร้างและการทำงานของโค้ด: ", "Code Structure & Explanation: ")}
                    </strong>
                    {log.codeExplanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
