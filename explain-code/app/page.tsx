"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "./components/SiteHeader";
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

function formatAttemptTimestamp(isoStr?: string): string {
  if (!isoStr) return "เมื่อสักครู่";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "เมื่อสักครู่";
  }
}

export default function ExplainCodeApp() {
  const { t } = useUiLanguage();
  const [appMode, setAppMode] = useState<AppMode>("landing");
  const [studentTab, setStudentTab] = useState<StudentTab>("quest");
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

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
            } catch {}
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
              TOPICS.find((t) => t.id === att.topic_id)?.title || `เรื่องที่ ${att.topic_id}`,
            scorePercent: att.score_percent,
            xpEarned: att.xp_earned,
            timestamp: formatAttemptTimestamp(att.created_at),
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
            } catch {}
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

    if (!nick || pin.length !== 4) {
      setAuthMessage({
        type: "error",
        text: "กรุณากรอกชื่อเล่นสมมติและรหัส PIN 4 หลักให้ครบถ้วน",
      });
      return;
    }

    const pdpaLoginCheck = validatePdpaIdentifier(nick);
    if (!pdpaLoginCheck.valid) {
      setAuthMessage({
        type: "error",
        text: pdpaLoginCheck.reason || "ตามหลัก PDPA 2562 กรุณาใช้ชื่อเล่นสมมติเท่านั้น",
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
        text: data.error || "เข้าสู่ระบบไม่สำเร็จ",
      });
      return;
    }

    // ถ้ามาจากฐานข้อมูล Supabase โดยตรง
    if (data.source === "supabase" && data.student) {
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
        text: `ยังไม่มีชื่อเล่น "${nick}" ในระบบ กรุณากดแท็บ "สมัครเข้าเล่นใหม่" แล้วใส่รหัสห้องจากครู`,
      });
      setStudentAuthTab("register");
      return;
    }

    if (found.pinHash !== data.pinHash) {
      setAuthMessage({
        type: "error",
        text: "รหัส PIN 4 หลักไม่ถูกต้อง (บัญชีตัวอย่างใช้รหัส PIN: 1234)",
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
    const code = signupRoomCode.trim().toUpperCase();

    if (!nick || pin.length !== 4 || !code) {
      setAuthMessage({
        type: "error",
        text: "กรุณากรอกชื่อเล่นสมมติ, PIN 4 หลัก และรหัสห้องจากครู (เช่น ABC123)",
      });
      return;
    }

    const pdpaLoginCheck = validatePdpaIdentifier(nick);
    if (!pdpaLoginCheck.valid) {
      setAuthMessage({
        type: "error",
        text: pdpaLoginCheck.reason || "ตามหลัก PDPA 2562 กรุณาใช้ชื่อเล่นสมมติเท่านั้น",
      });
      return;
    }

    const roomExists = classrooms.find((r) => r.roomCode === code);
    if (!roomExists) {
      setAuthMessage({
        type: "error",
        text: `ไม่พบรหัสห้อง ${code} (รหัสห้องที่เปิดอยู่ตอนนี้: ${classrooms
          .map((c) => c.roomCode)
          .join(", ")})`,
      });
      return;
    }

    const existing = students.find(
      (s) => s.nickname.toLowerCase() === nick.toLowerCase()
    );
    if (existing) {
      setAuthMessage({
        type: "error",
        text: `ชื่อเล่น "${nick}" มีในระบบแล้ว กรุณาเปลี่ยนชื่อเล่นสมมติ หรือสลับไปแท็บ "เข้าเล่น"`,
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
      pinHash: data.pinHash,
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

    if (!uname || !pwd) {
      setTeacherAuthError("กรุณากรอกชื่อผู้ใช้และรหัสผ่านสำหรับครู");
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
      setTeacherAuthError(data.error || "เข้าสู่ระบบครูไม่สำเร็จ");
      return;
    }

    if (data.source === "supabase" && data.teacher) {
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
        `ไม่พบบัญชีครู "${uname}" กรุณากดแท็บ "สมัครบัญชีครูใหม่" หรือใช้บัญชี "ครูตัวอย่าง"`
      );
      return;
    }

    if (foundTeacher.passwordHash !== data.passwordHash) {
      setTeacherAuthError(
        "รหัสผ่านไม่ถูกต้อง (บัญชีครูตัวอย่างใช้รหัสผ่าน: 12345678)"
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

    if (!uname || pwd.length < 4) {
      setTeacherAuthError("กรุณาตั้งชื่อผู้ใช้และรหัสผ่านอย่างน้อย 4 ตัวอักษร");
      return;
    }

    if (teachers.some((t) => t.username.toLowerCase() === uname.toLowerCase())) {
      setTeacherAuthError("ชื่อผู้ใช้นี้มีในระบบแล้ว กรุณาเข้าสู่ระบบ");
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

    const newTeacher: TeacherRecord = {
      id: "tch-" + Date.now(),
      username: uname,
      passwordHash: data.passwordHash,
      displayName: teacherDisplayName.trim() || uname,
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
      topicTitle: topicObj?.title || `เรื่องที่ ${result.topicId}`,
      scorePercent: result.scorePercent,
      xpEarned: result.earnedXp,
      timestamp: "เมื่อสักครู่",
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
            } catch {}
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
                TOPICS.find((t) => t.id === att.topic_id)?.title || `เรื่องที่ ${att.topic_id}`,
              scorePercent: att.score_percent,
              xpEarned: att.xp_earned,
              timestamp: formatAttemptTimestamp(att.created_at),
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
              } catch {}
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
        const msg = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง";
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

        <main className="mx-auto flex-1 max-w-5xl w-full px-4 py-10 sm:px-6 sm:py-16">
          {/* Hero Section */}
          <section className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#3d395a] bg-[#1c1b2b] px-3.5 py-1 text-xs font-bold text-[#ffe27a] whitespace-nowrap">
              <Icon name="sparkles" className="h-3.5 w-3.5 shrink-0 text-[#f6c945]" />
              <span>{t("แพลตฟอร์มอ่านโค้ด 6 ภาษา", "6-Language Code Platform")}</span>
            </span>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f4efe6] leading-tight">
              {t("เขียนโค้ดด้วย AI ได้ ", "AI Writes Code — ")}
              <span className="text-[#f6c945] underline decoration-[#9b5de5] underline-offset-8">
                {t("ต้องอ่านและอธิบายได้ด้วย", "You Must Understand It")}
              </span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#9a93ad]">
              {t(
                "ฝึกอ่านโค้ดผ่านดันเจี้ยน RPG หรือวางโค้ดให้ช่วยอธิบายทีละบรรทัด",
                "Train code reading in 2D RPG dungeons or explain any snippet line by line."
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
          </section>

          {/* 2 Core Choices: Learning Dungeon & Explain Code */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-12">
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
                    "เลือกภาษาที่ต้องการ แล้วตะลุยด่านพิกเซลด้วยคำถาม Block Model ทั้ง 6 ภาษา",
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

          {/* Pixel RPG Dungeon Banner */}
          <section className="mb-12 rounded-2xl border border-[#3d395a] bg-[#1c1b2b] p-6 sm:p-8 text-[#f4efe6] shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="inline-block rounded-full bg-[#5a2d91] border border-[#9b5de5]/60 px-3 py-1 text-xs font-bold text-[#ffe27a] whitespace-nowrap">
                  Pixel RPG Dungeon
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#f6c945]">
                  {t(
                    "ตะลุยเขาวงกตพิกเซล ปราบมอนสเตอร์ด้วยโค้ด",
                    "Explore Pixel Mazes & Defeat Monsters with Code"
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-[#c4bdd6]">
                  {t(
                    "เลือกฮีโร่ 4 คลาส ใช้ Relics & Focus MP แก้ปริศนา Predict / Trace / Modify ครบ 6 ภาษา",
                    "Pick 1 of 4 Pixel Heroes, use Relics & Focus MP, and conquer Predict / Trace / Modify battles."
                  )}
                </p>
              </div>

              <div className="flex flex-wrap md:flex-col gap-2.5 w-full md:w-auto shrink-0">
                <Link
                  href="/courses"
                  className="retro-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#f6c945] px-5 py-3 text-xs sm:text-sm font-black text-[#120f1c] hover:bg-[#ffe27a] transition-colors"
                >
                  <Icon name="gamepad" className="h-4 w-4 shrink-0" />
                  <span>{t("เข้าสู่ดันเจี้ยน →", "Enter Dungeon →")}</span>
                </Link>
                <Link
                  href="/dungeon/trial"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-[#4a4766] bg-[#252238] px-4 py-2.5 text-xs font-bold text-[#f4efe6] hover:border-[#f6c945]/70 hover:bg-[#322c4a] transition-colors"
                >
                  {t("ทดลองเล่น 1 ห้อง", "1-Room Trial")}
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
                  href="/login?mode=register"
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
        <header className="bg-[#141220] border-b border-[#2f2d45] text-[#f4efe6] px-6 py-4 flex items-center justify-between transition">
          <div className="flex items-center gap-2.5 text-[20px] font-extrabold tracking-tight text-[#ffe27a]">
            <Image
              src="/logo.png"
              alt="โค้ดนี้ฉันอธิบายได้"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain border border-[#f6c945]/50 bg-[#0d0b14] shrink-0"
            />
            <span>
              โค้ดนี้ฉันอธิบายได้ {isTeacherRole ? "· ครูผู้สอน" : "· นักเรียน"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[13px] font-bold text-[#9a93ad]">
              สลับบทบาท (Role):
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
                {isTeacherRole ? "ไปฝั่งนักเรียน" : "ไปฝั่งครูผู้สอน"}
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
                className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                  !isTeacherRole
                    ? "bg-[#5a2d91] text-[#ffe27a] border border-[#f6c945]/75 shadow-sm"
                    : "text-[#9a93ad] hover:text-[#f4efe6]"
                }`}
              >
                <Icon name="user" size={18} />
                <span>Role: นักเรียน</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTeacherAuthError("");
                  setAppMode("teacher-login");
                }}
                className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                  isTeacherRole
                    ? "bg-[#5a2d91] text-[#ffe27a] border border-[#f6c945]/75 shadow-sm"
                    : "text-[#9a93ad] hover:text-[#f4efe6]"
                }`}
              >
                <Icon name="users" size={18} />
                <span>Role: ครูผู้สอน</span>
              </button>
            </div>

            {/* ==================== ฟอร์มสำหรับ ROLE: นักเรียน ==================== */}
            {!isTeacherRole && (
              <>
                <div>
                  <h1 className="text-[26px] font-extrabold text-[#f4efe6] tracking-tight">
                    {studentAuthTab === "login"
                      ? "พร้อมลุยเควสต์?"
                      : "สมัครเข้าห้องเรียนใหม่"}
                  </h1>
                  <p className="text-[14px] text-[#9a93ad] mt-0.5">
                    อ่านโค้ดทีละขั้น เก็บ XP และตรา แล้วดูว่าตัวเองเข้าใจโค้ดตรงไหน
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
                    className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold border-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      studentAuthTab === "login"
                        ? "bg-[#25193b] border-[#9b5de5] text-[#ffe27a]"
                        : "bg-[#1c1b2b] border-[#2f2d45] text-[#9a93ad]"
                    }`}
                  >
                    <Icon name="play" size={16} filled={studentAuthTab === "login"} />
                    <span>มีชื่อเล่นแล้ว (เข้าเล่น)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMessage(null);
                      setStudentAuthTab("register");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold border-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      studentAuthTab === "register"
                        ? "bg-[#281d08] border-[#f6c945] text-[#ffe27a]"
                        : "bg-[#1c1b2b] border-[#2f2d45] text-[#9a93ad]"
                    }`}
                  >
                    <Icon name="user" size={16} />
                    <span>สมัครเข้าเล่นใหม่</span>
                  </button>
                </div>

                {authMessage && (
                  <div
                    className={`p-3.5 rounded-xl text-[13px] font-bold border ${
                      authMessage.type === "error"
                        ? "bg-[#2d141c] text-[#fca5a5] border-[#c0283a]"
                        : "bg-[#102a1e] text-[#86efac] border-[#2fbf71]/50"
                    }`}
                  >
                    {authMessage.text}
                  </div>
                )}

                {studentAuthTab === "login" ? (
                  <form
                    onSubmit={runSubmit(handleStudentLogin, "student")}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[14px] font-extrabold text-[#f4efe6]">
                          ชื่อเล่นสมมติ
                        </label>
                        <span className="text-[12px] font-semibold text-[#9a93ad]">
                          ห้ามใช้ชื่อจริงหรืออีเมล (PDPA)
                        </span>
                      </div>
                      <input
                        type="text"
                        value={loginNickname}
                        onChange={(e) => setLoginNickname(e.target.value)}
                        placeholder="เช่น แมวส้ม"
                        className="w-full px-4 py-3.5 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] text-[16px] font-bold text-[#f4efe6] focus:outline-none focus:border-[#f6c945]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[14px] font-extrabold text-[#f4efe6]">
                        รหัส PIN 4 หลัก
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
                      <span>{isSubmitting ? "กำลังตรวจสอบ..." : "เริ่มเล่นเลย"}</span>
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={runSubmit(handleStudentSignupWithRoom, "student")}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[14px] font-extrabold text-[#f4efe6]">
                        1. ตั้งชื่อเล่นสมมติของคุณ (PDPA)
                      </label>
                      <input
                        type="text"
                        value={loginNickname}
                        onChange={(e) => setLoginNickname(e.target.value)}
                        placeholder="เช่น เสือน้อย, โลมาสีฟ้า"
                        className="w-full px-4 py-3 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] text-[16px] font-bold text-[#f4efe6] focus:outline-none focus:border-[#f6c945]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[14px] font-extrabold text-[#f4efe6]">
                          2. ตั้งรหัส PIN 4 หลัก
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
                          3. รหัสห้องจากครู
                        </label>
                        <input
                          type="text"
                          value={signupRoomCode}
                          onChange={(e) => setSignupRoomCode(e.target.value)}
                          placeholder="เช่น ABC123"
                          className="w-full px-4 py-3 rounded-xl bg-[#281d08] border-2 border-[#f6c945] font-code font-extrabold text-[16px] text-[#ffe27a] focus:outline-none focus:border-[#ffe27a]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="press-gold disabled:opacity-60 w-full py-4 rounded-2xl text-[18px] font-extrabold flex items-center justify-center gap-2.5 cursor-pointer mt-1"
                    >
                      <Icon name="user" size={22} />
                      <span>{isSubmitting ? "กำลังสมัคร..." : "สมัครเข้าเล่นทันที"}</span>
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
                      ? "เข้าสู่ระบบสำหรับครู"
                      : "สมัครบัญชีครูผู้สอนใหม่"}
                  </h1>
                  <p className="text-[13px] font-semibold text-[#9a93ad] mt-0.5">
                    สร้างห้องเรียน ดูแผนที่ Block Model เฉลี่ยทั้งห้อง และปรับการสอน
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherAuthError("");
                      setTeacherAuthTab("login");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold border-2 transition cursor-pointer ${
                      teacherAuthTab === "login"
                        ? "bg-[#25193b] border-[#9b5de5] text-[#ffe27a]"
                        : "bg-[#1c1b2b] border-[#2f2d45] text-[#9a93ad]"
                    }`}
                  >
                    เข้าสู่ระบบครู
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTeacherAuthError("");
                      setTeacherAuthTab("register");
                    }}
                    className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold border-2 transition cursor-pointer ${
                      teacherAuthTab === "register"
                        ? "bg-[#281d08] border-[#f6c945] text-[#ffe27a]"
                        : "bg-[#1c1b2b] border-[#2f2d45] text-[#9a93ad]"
                    }`}
                  >
                    สมัครบัญชีครูใหม่
                  </button>
                </div>

                {teacherAuthError && (
                  <div className="p-3 rounded-xl bg-[#2d141c] text-[#fca5a5] border border-[#c0283a] text-[13px] font-bold">
                    {teacherAuthError}
                  </div>
                )}

                <form
                  onSubmit={
                    teacherAuthTab === "login"
                      ? runSubmit(handleTeacherLogin, "teacher")
                      : runSubmit(handleTeacherRegister, "teacher")
                  }
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] font-extrabold text-[#f4efe6]">
                      ชื่อผู้ใช้ (ครู)
                    </label>
                    <input
                      type="text"
                      value={teacherUsername}
                      autoComplete="username"
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      placeholder="เช่น ครูตัวอย่าง"
                      className="w-full px-4 py-3 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] text-[15px] font-bold text-[#f4efe6] focus:outline-none focus:border-[#f6c945]"
                    />
                  </div>

                  {teacherAuthTab === "register" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[14px] font-extrabold text-[#f4efe6]">
                        ชื่อที่แสดงในระบบ
                      </label>
                      <input
                        type="text"
                        value={teacherDisplayName}
                        onChange={(e) => setTeacherDisplayName(e.target.value)}
                        placeholder="เช่น ครูสมศรี (วิทยาการคำนวณ)"
                        className="w-full px-4 py-3 rounded-xl bg-[#0d0b14] border-2 border-[#2f2d45] text-[15px] font-bold text-[#f4efe6] focus:outline-none focus:border-[#f6c945]"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] font-extrabold text-[#f4efe6]">
                      รหัสผ่าน
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
                        aria-label={showSecret ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[12px] font-extrabold text-[#ffe27a] bg-[#252238] border border-[#3d395a] hover:border-[#f6c945] cursor-pointer"
                      >
                        {showSecret ? "ซ่อน" : "แสดง"}
                      </button>
                    </div>
                    {teacherAuthTab === "register" && (
                      <p className="text-[12px] font-semibold text-[#9a93ad]">
                        ตั้งรหัสผ่านอย่างน้อย 4 ตัวอักษร
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`disabled:opacity-60 w-full py-4 rounded-2xl text-[17px] font-extrabold flex items-center justify-center gap-2 cursor-pointer mt-1 ${
                      teacherAuthTab === "login" ? "press-teal" : "press-gold"
                    }`}
                  >
                    <Icon name="users" size={20} />
                    <span>
                      {isSubmitting
                        ? "กำลังตรวจสอบ..."
                        : teacherAuthTab === "login"
                        ? "เข้าสู่ระบบสำหรับครู"
                        : "สร้างบัญชีครูและเข้าใช้งาน"}
                    </span>
                  </button>
                </form>

                <p className="text-[12px] font-semibold text-[#9a93ad] leading-relaxed text-center">
                  หน้านี้แสดงเฉพาะชื่อเล่นสมมติและคะแนน ไม่แสดงข้อมูลส่วนบุคคลจริงของนักเรียน
                </p>
                <div className="pt-2 border-t border-[#2f2d45] flex items-center justify-center gap-2 text-[12px] text-[#9a93ad]">
                  <span className="font-bold">บัญชีทดสอบ:</span>
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
                    ใช้บัญชีครูตัวอย่าง
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
              ← หน้าแรก
            </button>
            <button
              type="button"
              onClick={() => setStudentTab("quest")}
              className="text-[20px] font-extrabold tracking-tight text-[#ffe27a] flex items-center gap-2 cursor-pointer"
            >
              <Image
                src="/logo.png"
                alt="โค้ดนี้ฉันอธิบายได้"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-contain border border-[#f6c945]/50 bg-[#0d0b14] shrink-0"
              />
              <span>โค้ดนี้ฉันอธิบายได้</span>
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-[#25193b] border border-[#9b5de5]/60 text-[#e9d5ff] text-[12px] font-extrabold">
              นักเรียน: {currentStudent.nickname} (ห้อง {currentStudent.roomCode})
            </span>
          </div>

          {/* เมนูนำทางฝั่งนักเรียน */}
          <nav className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "quest" as StudentTab, label: "เส้นทางเควสต์", icon: "route" as const },
              { id: "practice" as StudentTab, label: "ฝึกอ่านโค้ด", icon: "play" as const },
              { id: "learn" as StudentTab, label: "Block Model", icon: "book" as const },
              { id: "profile" as StudentTab, label: "โปรไฟล์", icon: "user" as const },
            ].map((tab) => {
              const active = studentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStudentTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-[13px] font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                    active
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
              title="สตรีคการฝึกต่อเนื่อง"
            >
              <Icon name="flame" size={16} filled />
              <span>{currentStudent.streak}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-[#1c1b2b] hover:bg-[#2d141c] border border-[#3d395a] hover:border-[#c0283a] text-[#f4efe6] hover:text-[#fca5a5] text-[12px] font-extrabold flex items-center gap-1.5 cursor-pointer"
              title="ออกจากระบบหรือสลับบทบาท"
            >
              <Icon name="logout" size={16} />
              <span>ออกจากระบบ</span>
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
                      เควสต์ประจำวัน · โบนัส +30 XP
                    </span>
                    <h3 className="text-[18px] font-extrabold text-[#f4efe6] mt-1">
                      ฝึกอ่านโค้ดและตอบคำถามช่องการทำงานจริง (E1–E4)
                    </h3>
                    <p className="text-[13px] font-semibold text-[#ffe27a]/90 mt-0.5">
                      สะสม XP จากความเข้าใจโดยตรง ไม่คิดคะแนนจากความเร็ว
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextTopicId =
                      TOPICS.find(
                        (t) => !currentStudent.completedTopics.includes(t.id)
                      )?.id || 1;
                    setSelectedTopicId(nextTopicId);
                    setStudentTab("practice");
                  }}
                  className="press-gold px-6 py-3.5 rounded-xl text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Icon name="play" size={18} filled />
                  <span>เริ่มเล่นเควสต์วันนี้</span>
                </button>
              </div>

              {/* การ์ดเรื่องที่ครูปักหมุดให้ทบทวนประจำห้อง */}
              <div className="lg:col-span-5 bg-[#141220] border-2 border-[#2f2d45] rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[12px] font-extrabold text-[#ffe27a]">
                      คำแนะนำจากครู ({currentStudentRoom?.roomName || currentStudent.roomCode})
                    </span>
                    <h4 className="text-[16px] font-extrabold text-[#f4efe6] mt-0.5">
                      {TOPICS.find(
                        (t) => t.id === currentStudentRoom?.pinnedReviewTopicId
                      )?.title || "เรื่องที่ 4 · วนซ้ำ while"}
                    </h4>
                  </div>
                  <Icon name="bulb" size={22} className="text-[#f6c945] shrink-0" />
                </div>
                <p className="text-[13px] text-[#9a93ad]">
                  {currentStudentRoom?.pinnedReviewNote ||
                    "ฝึกเดินโค้ดดูค่าตัวแปรและเงื่อนไขการหยุดลูป"}
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
                  <span>เข้าเล่นเรื่องที่ครูแนะนำ</span>
                </button>
              </div>
            </div>

            {/* เส้นทางเควสต์ 7 เรื่อง */}
            <div className="bg-[#141220] border-2 border-[#2f2d45] rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[24px] font-extrabold text-[#f4efe6]">
                    เส้นทางเควสต์ 7 เรื่อง
                  </h2>
                  <p className="text-[14px] font-semibold text-[#9a93ad]">
                    ผ่านแล้ว {currentStudent.completedTopics.length}/7 เรื่อง · บอสด่านเปิดเมื่อผ่านอย่างน้อย 4 เรื่อง
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setUnlockAllDemo(!unlockAllDemo)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-extrabold border-2 transition cursor-pointer ${
                    unlockAllDemo
                      ? "bg-[#102a1e] border-[#2fbf71] text-[#86efac]"
                      : "press-secondary"
                  }`}
                >
                  {unlockAllDemo
                    ? "✓ ปลดล็อกทุกเรื่องแล้ว"
                    : "ปลดล็อกทุกเรื่อง (โหมดสาธิต)"}
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
                      className={`rounded-2xl border-2 p-5 flex flex-col justify-between gap-4 transition ${
                        isBoss
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
                              className={`px-2.5 py-0.5 rounded-full text-[12px] font-extrabold ${
                                isBoss
                                  ? "bg-[#5a2d91] text-[#ffe27a] border border-[#9b5de5]"
                                  : isPassed
                                  ? "bg-[#102a1e] text-[#86efac] border border-[#2fbf71]/50"
                                  : unlocked
                                  ? "bg-[#281d08] text-[#ffe27a] border border-[#f6c945]/50"
                                  : "bg-[#252238] text-[#9a93ad]"
                              }`}
                            >
                              {isPassed
                                ? "ผ่านแล้ว"
                                : unlocked
                                ? isBoss
                                  ? "บอสด่านพร้อมลุย!"
                                  : "พร้อมเข้าเล่น"
                                : isBoss
                                ? `ล็อก (ผ่านแล้ว ${currentStudent.completedTopics.length}/4 เรื่อง)`
                                : "ล็อก"}
                            </span>

                            <span className="text-[12px] font-bold text-[#9a93ad]">
                              ช่อง{" "}
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
                          <span>ตรา: {topic.badgeReward.name}</span>
                        </span>

                        <button
                          type="button"
                          disabled={!unlocked}
                          onClick={() => {
                            setSelectedTopicId(topic.id);
                            setStudentTab("practice");
                          }}
                          className={`px-5 py-2.5 rounded-xl text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            isBoss
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
                              ? "เล่นซ้ำ"
                              : unlocked
                              ? "เริ่มเล่นด่านนี้"
                              : "ยังไม่ปลดล็อก"}
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
                <span>รู้จัก Block Model 12 ช่อง และวิธีเรียน 4 ขั้น (PRIMM)</span>
              </h2>
              <p className="text-[15px] text-[#9a93ad]">
                เวลาเราสั่ง AI ให้เขียนโค้ดให้ การจะบอกว่าเรา &ldquo;เข้าใจโค้ดนั้นจริง&rdquo; ไม่ใช่แค่อ่านออกทีละคำ แต่ต้องเข้าใจครบทั้ง <strong className="text-[#f4efe6]">3 มิติ</strong> ในทุกระดับของโค้ด ตั้งแต่บรรทัดเดี่ยวไปจนถึงภาพรวมทั้งโปรแกรม รวมเป็น <strong className="text-[#ffe27a]">12 ช่องของ Block Model</strong>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                <div className="p-4 rounded-xl bg-[#25193b] border border-[#9b5de5]/60">
                  <div className="text-[15px] font-extrabold text-[#e9d5ff]">
                    มิติที่ 1 · โครงสร้างโค้ด (Text Surface: T1–T4)
                  </div>
                  <p className="text-[14px] text-[#f4efe6]/90 mt-1">
                    อ่านไวยากรณ์ เครื่องหมาย ขอบเขตบล็อก `if/else`, ลูป `for/while` และการเชื่อมโยงพารามิเตอร์ออกอย่างถูกต้อง
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#281d08] border border-[#f6c945]/60">
                  <div className="text-[15px] font-extrabold text-[#ffe27a]">
                    มิติที่ 2 · การทำงานเมื่อรันจริง (Execution: E1–E4)
                  </div>
                  <p className="text-[14px] text-[#f4efe6]/90 mt-1">
                    แกะรอยได้ว่าเมื่อรันจริง โค้ดเดินไปบรรทัดไหนบ้าง ค่าตัวแปรเปลี่ยนเป็นเท่าไหร่ และพิมพ์ผลลัพธ์อะไรออกมา
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#102a1e] border border-[#2fbf71]/60">
                  <div className="text-[15px] font-extrabold text-[#86efac]">
                    มิติที่ 3 · หน้าที่และเป้าหมาย (Function: F1–F4)
                  </div>
                  <p className="text-[14px] text-[#f4efe6]/90 mt-1">
                    อธิบายได้ว่าแต่ละบรรทัด แต่ละบล็อก และทั้งโปรแกรมมีไว้ทำไม แก้ปัญหาอะไร และตรวจจับบั๊กที่ขัดกับเป้าหมายได้
                  </p>
                </div>
              </div>
            </div>

            <BlockModelGrid
              cellScores={currentStudent.cellScores}
              title="สำรวจทั้ง 12 ช่องของ Block Model (คลิกที่ช่องเพื่อดูตัวอย่างคำถามและไปฝึก)"
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
                  <span>ห้องทดลองรันโค้ด JavaScript จริง (ตรวจสอบโค้ดที่ AI เขียนให้)</span>
                </h3>
                <p className="text-[13px] font-semibold text-[#9a93ad]">
                  วางโค้ด JavaScript ที่คุณได้มาจาก AI แล้วกดรันจริงเพื่อดูผลลัพธ์จาก console.log โดยไม่ใช้การเดา
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
                        ? res.finalOutput || "(โค้ดทำงานสำเร็จแต่ไม่มีคำสั่ง console.log)"
                        : `ข้อผิดพลาด: ${res.error}`
                    );
                  }}
                  className="press-gold px-5 py-2.5 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer"
                >
                  <Icon name="play" size={18} />
                  <span>รันโค้ดจริง</span>
                </button>
              </div>

              {playgroundOutput && (
                <div className="p-4 rounded-xl bg-[#102a1e] border-2 border-[#2fbf71]/50 text-[#86efac]">
                  <div className="text-[13px] font-extrabold">ผลลัพธ์จากการรันโค้ดจริง:</div>
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
                <StatusCircle variant="badge" size="lg" label="โปรไฟล์นักเรียน" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[24px] font-extrabold text-[#f4efe6]">
                      โปรไฟล์ของ {currentStudent.nickname}
                    </h2>
                    <span className="px-3 py-0.5 rounded-full bg-[#25193b] border border-[#9b5de5]/60 text-[#e9d5ff] text-[13px] font-extrabold">
                      รหัสห้อง {currentStudent.roomCode}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold text-[#9a93ad] mt-0.5">
                    เลเวล {studentLevel} · สะสม {currentStudent.xp} XP · ต่อเนื่อง {currentStudent.streak} วัน · ผ่านแล้ว{" "}
                    {currentStudent.completedTopics.length}/7 เรื่อง · ความเข้าใจเฉลี่ย{" "}
                    {studentAvgMastery}% ({getMasteryStatus(studentAvgMastery).label})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStudentTab("quest")}
                className="press-gold px-4 py-2.5 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer"
              >
                <Icon name="route" size={18} />
                <span>ไปฝึกเรื่องถัดไป</span>
              </button>
            </div>

            {/* สรุปด้านที่เก่ง & ด้านที่ควรทบทวน */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#102a1e] border-2 border-[#2fbf71]/50 rounded-2xl p-5 text-[#86efac]">
                <div className="flex items-center gap-2 font-extrabold text-[16px]">
                  <Icon name="check" size={20} />
                  <span>ด้านที่เก่ง (เข้าใจ 80% ขึ้นไป)</span>
                </div>
                <div className="mt-3 space-y-2">
                  {strongStudentCells.length > 0 ? (
                    strongStudentCells.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl bg-[#0d0b14]/70 border border-[#2fbf71]/30 flex items-center justify-between text-[14px] font-bold text-[#f4efe6]"
                      >
                        <span>
                          ช่อง {c.id} · {c.shortTitle}
                        </span>
                        <span className="font-extrabold text-[#86efac]">
                          {currentStudent.cellScores[c.id]}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[14px]">
                      ฝึกทำโจทย์เพิ่มเพื่อปลดล็อกช่องที่เก่งเกิน 80%!
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-[#2d141c] border-2 border-[#c0283a]/60 rounded-2xl p-5 text-[#fca5a5]">
                <div className="flex items-center gap-2 font-extrabold text-[16px]">
                  <Icon name="bulb" size={20} />
                  <span>ด้านที่ควรทบทวนเพิ่มเติม</span>
                </div>
                <div className="mt-3 space-y-2">
                  {reviewStudentCells.length > 0 ? (
                    reviewStudentCells.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl bg-[#0d0b14]/70 border border-[#c0283a]/30 flex items-center justify-between gap-2 text-[14px] font-bold text-[#f4efe6]"
                      >
                        <span>
                          ช่อง {c.id} · {c.shortTitle} ({currentStudent.cellScores[c.id]}%)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTopicId(c.relatedTopicId);
                            setStudentTab("practice");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#c0283a] hover:bg-[#e11d48] text-white text-[12px] font-extrabold cursor-pointer"
                        >
                          ฝึกทบทวน →
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[14px] font-bold">
                      ยอดเยี่ยมมาก! คุณผ่านเกณฑ์ความเข้าใจเกิน 60% ทุกช่องแล้ว
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* แผนที่ความเข้าใจ 12 ช่องของนักเรียน */}
            <BlockModelGrid
              cellScores={currentStudent.cellScores}
              title={`แผนที่ความเข้าใจ 12 ช่องของ ${currentStudent.nickname}`}
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
                    ตราความสำเร็จที่ได้รับ (
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
                  {TOPICS.map((t) => {
                    const unlocked = currentStudent.badges.includes(
                      t.badgeReward.id
                    );
                    return (
                      <div
                        key={t.badgeReward.id}
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          unlocked
                            ? "bg-[#25193b] border-[#9b5de5] text-[#f4efe6]"
                            : "bg-[#1c1b2b] border-[#2f2d45] text-[#9a93ad] opacity-65"
                        }`}
                      >
                        <StatusCircle
                          variant={unlocked ? "badge" : "locked"}
                          size="sm"
                          label={t.badgeReward.name}
                        />
                        <div className="min-w-0">
                          <div className="text-[14px] font-extrabold truncate">
                            {t.badgeReward.name}
                          </div>
                          <div className="text-[12px] truncate text-[#9a93ad]">
                            {t.badgeReward.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#2f2d45] space-y-2.5">
                  <div className="text-[13px] font-extrabold text-[#ffe27a] flex items-center gap-1.5">
                    <Icon name="sparkles" size={14} className="text-[#f6c945]" />
                    <span>ตราความสำเร็จลับ (Secret Badges)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SECRET_BADGES.map((sb) => {
                      const unlocked = currentStudent.badges.includes(sb.id);
                      return (
                        <div
                          key={sb.id}
                          className={`p-3 rounded-xl border flex items-center gap-3 ${
                            unlocked
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
                              {unlocked ? sb.name : "??? (ความลับ)"}
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
                  <span>ประวัติการฝึกอ่านโค้ดล่าสุด</span>
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
                            {h.timestamp} · ความเข้าใจ {h.scorePercent}%
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
                    ยังไม่มีประวัติการเล่น เริ่มฝึกเรื่องที่ 1 ในหน้าเส้นทางเควสต์ได้เลย!
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
                  รายการส่งงาน · บันทึกการใช้ AI (AI Log {AI_USAGE_LOGS.length} Prompts)
                </span>
                <h2 className="text-[22px] font-extrabold text-[#f4efe6] mt-2">
                  บันทึกการใช้ AI พัฒนาโปรเจกต์ &ldquo;โค้ดนี้ฉันอธิบายได้&rdquo;
                </h2>
                <p className="text-[14px] text-[#9a93ad]">
                  แสดงรายการ Prompt ที่ใช้จริง เครื่องมือ AI ปัญหาที่พบ วิธีที่ทีมปรับปรุงแก้ไข และคำอธิบายโครงสร้างโค้ดตามกติกาการแข่งขันหน้า 4–5
                </p>
              </div>
              <Link
                href="/ai-log"
                className="press-gold px-4 py-2 rounded-xl text-[13px] font-extrabold inline-flex items-center gap-1.5"
              >
                <Icon name="clipboard" size={16} />
                <span>เปิดหน้ารายงาน AI Log ฉบับเต็ม →</span>
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
                      เครื่องมือ AI: {log.aiTool}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141220] border border-[#2f2d45] text-[14px] text-[#f4efe6]">
                    <strong className="text-[#c084fc]">Prompt ที่สั่ง AI: </strong>
                    {log.promptText}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                    <div className="p-3 rounded-xl bg-[#2d141c] border border-[#c0283a]/40 text-[#fca5a5]">
                      <strong>ปัญหาที่พบจากโค้ด/เนื้อหาที่ AI สร้าง:</strong>
                      <p className="mt-0.5 text-[#f4efe6]/90">{log.problemFound}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#102a1e] border border-[#2fbf71]/40 text-[#86efac]">
                      <strong>วิธีที่ทีมปรับแก้และพัฒนาต่อ:</strong>
                      <p className="mt-0.5 text-[#f4efe6]/90">{log.solutionApplied}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141220] border border-[#3d395a] text-[13px] text-[#c4bdd6]">
                    <strong className="text-[#ffe27a]">
                      คำอธิบายโครงสร้างและการทำงานของโค้ด:{" "}
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
