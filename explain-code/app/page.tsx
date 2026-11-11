"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SiteHeader } from "./components/SiteHeader";
import {
  TOPICS,
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

    if (/@/.test(nick)) {
      setAuthMessage({
        type: "error",
        text: "ตามหลัก PDPA 2562 กรุณาใช้ชื่อเล่นสมมติเท่านั้น ห้ามใช้อีเมล",
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

    if (/@/.test(nick)) {
      setAuthMessage({
        type: "error",
        text: "ตามหลัก PDPA 2562 กรุณาใช้ชื่อเล่นสมมติเท่านั้น ห้ามใช้อีเมล",
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

    const nextBadges = currentStudentSnapshot.badges.includes(result.badgeId)
      ? currentStudentSnapshot.badges
      : [...currentStudentSnapshot.badges, result.badgeId];

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
      <div className="min-h-screen bg-[#faf8f4] text-[#1e1e1c] flex flex-col">
        <SiteHeader onOpenClassicPortal={openClassicPortal} />

        <main className="mx-auto flex-1 max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          {/* Hero Section: แนะนำเว็บและวิธีใช้งาน */}
          <section className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d8d1c5] bg-[#e8f0ec] px-3.5 py-1.5 text-xs font-bold text-[#2a4d3e]">
              <Icon name="sparkles" className="h-3.5 w-3.5" />
              แพลตฟอร์มการเรียนรู้และแกะโค้ดระบบเปิด (Open Platform)
            </span>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1e1e1c] leading-tight">
              เขียนโค้ดด้วย AI ได้{" "}
              <span className="text-[#2a4d3e] underline decoration-[#b7d3c6] underline-offset-8">
                ต้องอ่านและอธิบายได้ด้วย
              </span>
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#524f49]">
              <strong>&ldquo;โค้ดนี้ฉันอธิบายได้&rdquo;</strong>{" "}
              คือพื้นที่ฝึกทักษะการอ่านโค้ดตามแนวคิด{" "}
              <strong>Block Model &amp; PRIMM</strong> สำหรับนักเรียนและครูยุคใหม่
              คุณสามารถเข้ามาเลือกเรียนคอร์สต่างๆ หรือวางโค้ดเพื่อให้ระบบช่วยแกะทีละบรรทัดได้ทันทีโดยไม่ต้องล็อกอิน
              หรือเข้าสู่ระบบเพื่อบันทึกความคืบหน้าและประวัติส่วนตัว
            </p>
          </section>

          {/* การ์ด 2 ใบเป็นทางเลือกหลัก: "การเรียนรู้" และ "อธิบายโค้ด" */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-14">
            {/* การ์ดที่ 1: การเรียนรู้ */}
            <div className="group relative flex flex-col justify-between rounded-3xl border-2 border-[#d8d1c5] bg-white p-7 sm:p-8 shadow-xs transition-all hover:border-[#2a4d3e] hover:shadow-md">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f0ec] text-[#2a4d3e] transition-transform group-hover:scale-105">
                    <Icon name="book" className="h-7 w-7" />
                  </div>
                  <span className="rounded-full bg-[#e8f0ec] px-3 py-1 text-xs font-bold text-[#2a4d3e]">
                    ทางเลือกที่ 1 · คอร์ส &amp; บทเรียน
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-[#1e1e1c]">
                  การเรียนรู้ (Learning)
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-[#524f49]">
                  ศึกษาคอร์สและบทเรียนที่ครูผู้สอนจัดเตรียมไว้ ครอบคลุมตั้งแต่ตัวแปร เงื่อนไข ลูป ไปจนถึงการจับบั๊กจากโค้ด AI พร้อมตัวอย่างโค้ดที่กดรันได้จริงและแบบทดสอบท้ายบทเรียน
                </p>

                <ul className="mt-5 space-y-2 text-xs font-semibold text-[#3d3b36]">
                  <li className="flex items-center gap-2">
                    <span className="text-[#2a4d3e]">✓</span>
                    ดูคอร์สที่เผยแพร่แล้วทั้งหมดและเข้าร่วมด้วยรหัสห้องเรียน
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2a4d3e]">✓</span>
                    บันทึกประวัติการเรียนอัตโนมัติ และกดเรียนต่อจากบทที่ค้างไว้ได้ทันที
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2a4d3e]">✓</span>
                    ฝึกทำเควสต์อ่านโค้ด 4 ขั้น (PRIMM) และวัดผลด้วย Block Model 12 ช่อง
                  </li>
                </ul>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#ece7dc]">
                <Link
                  href="/courses"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2a4d3e] px-5 py-3.5 text-sm font-bold text-white shadow-xs hover:bg-[#1f3b2f] transition-colors"
                >
                  <Icon name="book" className="h-4 w-4" />
                  <span>เข้าสู่โหมดการเรียนรู้ (ดูคอร์ส) →</span>
                </Link>
                <button
                  type="button"
                  onClick={openClassicPortal}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-4 py-3.5 text-xs font-bold text-[#2a4d3e] hover:bg-[#f2efe8] transition-colors cursor-pointer"
                >
                  <span>ฝึกเควสต์ PRIMM</span>
                </button>
              </div>
            </div>

            {/* การ์ดที่ 2: อธิบายโค้ด */}
            <div className="group relative flex flex-col justify-between rounded-3xl border-2 border-[#d8d1c5] bg-white p-7 sm:p-8 shadow-xs transition-all hover:border-[#2a4d3e] hover:shadow-md">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f0ec] text-[#2a4d3e] transition-transform group-hover:scale-105">
                    <Icon name="code" className="h-7 w-7" />
                  </div>
                  <span className="rounded-full bg-[#e8f0ec] px-3 py-1 text-xs font-bold text-[#2a4d3e]">
                    ทางเลือกที่ 2 · เครื่องมือวิเคราะห์โค้ด
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-[#1e1e1c]">
                  อธิบายโค้ด (Code Explainer)
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-[#524f49]">
                  วางโค้ดที่คุณสงสัยหรือโค้ดที่ได้จาก AI แล้วเลือกภาษาโปรแกรม ระบบจะช่วยสรุปภาพรวม แยกอธิบายหน้าที่ของแต่ละบรรทัด และชี้จุดที่ควรระวังให้อ่านเข้าใจง่าย
                </p>

                <ul className="mt-5 space-y-2 text-xs font-semibold text-[#3d3b36]">
                  <li className="flex items-center gap-2">
                    <span className="text-[#2a4d3e]">✓</span>
                    รองรับหลายภาษา: JavaScript, TypeScript, Python, Java, C/C++, SQL
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2a4d3e]">✓</span>
                    แยกลำดับการทำงาน (Execution Flow) และอธิบายโค้ดรายบรรทัด
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#2a4d3e]">✓</span>
                    บันทึกประวัติการอธิบายโค้ดไว้ดูย้อนหลังได้เมื่อเข้าสู่ระบบ
                  </li>
                </ul>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#ece7dc]">
                <Link
                  href="/explain"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2a4d3e] px-5 py-3.5 text-sm font-bold text-white shadow-xs hover:bg-[#1f3b2f] transition-colors"
                >
                  <Icon name="sparkles" className="h-4 w-4" />
                  <span>วางโค้ดเพื่อให้อธิบายทันที →</span>
                </Link>
                <Link
                  href="/my-history"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-4 py-3.5 text-xs font-bold text-[#524f49] hover:bg-[#f2efe8] transition-colors"
                >
                  <span>ประวัติของฉัน</span>
                </Link>
              </div>
            </div>
          </section>

          {/* แนะนำการใช้งานเว็บไซต์ 3 ขั้นตอน */}
          <section className="rounded-3xl border border-[#e5dfd3] bg-white p-7 sm:p-9 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#1e1e1c]">
                  เริ่มต้นใช้งานเว็บนี้อย่างไร?
                </h3>
                <p className="text-xs sm:text-sm text-[#6e6a63]">
                  ออกแบบมาให้ใช้งานได้ทันทีทั้งผู้เรียนทั่วไป นักเรียนในห้องเรียน และครูผู้สอน
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-[#d8d1c5] bg-[#faf8f4] px-3.5 py-2 text-xs font-bold text-[#2a4d3e] hover:bg-[#f2efe8]"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/login?mode=register"
                  className="rounded-xl bg-[#2a4d3e] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1f3b2f]"
                >
                  สมัครสมาชิกใหม่
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#ece7dc] bg-[#faf8f4] p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a4d3e] text-xs font-bold text-white">
                  1
                </span>
                <h4 className="mt-3 text-sm font-bold text-[#1e1e1c]">
                  เลือกโหมดที่ต้องการได้ทันที
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-[#524f49]">
                  ไม่ต้องล็อกอินก็สามารถเข้าดูคอร์สเรียนที่เผยแพร่แล้ว หรือทดลองวางโค้ดให้ระบบอธิบายได้ฟรี (5 ครั้ง/วันสำหรับผู้เยี่ยมชม)
                </p>
              </div>

              <div className="rounded-2xl border border-[#ece7dc] bg-[#faf8f4] p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a4d3e] text-xs font-bold text-white">
                  2
                </span>
                <h4 className="mt-3 text-sm font-bold text-[#1e1e1c]">
                  ล็อกอินเพื่อเก็บประวัติและเรียนต่อ
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-[#524f49]">
                  นักเรียนล็อกอินด้วยชื่อเล่นสมมติ + PIN 4 หลัก เพื่อบันทึกความคืบหน้าแต่ละบทเรียน เรียนต่อจากที่ค้างไว้ และเก็บประวัติการอธิบายโค้ด
                </p>
              </div>

              <div className="rounded-2xl border border-[#ece7dc] bg-[#faf8f4] p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a4d3e] text-xs font-bold text-white">
                  3
                </span>
                <h4 className="mt-3 text-sm font-bold text-[#1e1e1c]">
                  ครูสร้างคอร์สและติดตามผลได้เอง
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-[#524f49]">
                  ครูผู้สอนที่ได้รับอนุมัติสามารถสร้างคอร์สใหม่ เพิ่มบทเรียน Markdown ตัวอย่างโค้ด แบบทดสอบ และดูความคืบหน้าของนักเรียนรายคนได้
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ==================== 1. หน้าเข้าสู่ระบบแยกตาม Role: นักเรียน & ครูผู้สอน (สไตล์มินิมอล) ====================
  if (appMode === "student-login" || appMode === "teacher-login") {
    const isTeacherRole = appMode === "teacher-login";

    return (
      <div className="min-h-screen bg-[#eef3f1] flex flex-col">
        {/* แถบบนมินิมอล */}
        <header
          className={`px-6 py-4 flex items-center justify-between transition ${
            isTeacherRole
              ? "bg-white border-b-2 border-[#cfe0dc] text-[#0b4f49]"
              : "bg-[#0b4f49] text-white"
          }`}
        >
          <div className="flex items-center gap-2.5 text-[20px] font-extrabold tracking-tight">
            <Icon name="code" size={24} />
            <span>
              โค้ดนี้ฉันอธิบายได้ {isTeacherRole ? "· ครูผู้สอน" : "· นักเรียน"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[13px] font-bold opacity-80">
              สลับบทบาท (Role):
            </span>
            <button
              type="button"
              onClick={() => {
                setAuthMessage(null);
                setTeacherAuthError("");
                setAppMode(isTeacherRole ? "student-login" : "teacher-login");
              }}
              className={`px-4 py-2 rounded-xl text-[13px] font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                isTeacherRole
                  ? "press-teal"
                  : "bg-white text-[#0b4f49] hover:bg-[#e3f1ee]"
              }`}
            >
              <Icon name={isTeacherRole ? "user" : "users"} size={18} />
              <span>
                {isTeacherRole ? "ไปฝั่งนักเรียน" : "ไปฝั่งครูผู้สอน"}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white border-2 border-[#cfe0dc] rounded-[24px] p-6 sm:p-8 max-w-[470px] w-full flex flex-col gap-5 shadow-[0_12px_32px_rgba(11,79,73,0.06)]">
            {/* แถบเลือก Role หลัก (นักเรียน / ครูผู้สอน) มินิมอลเห็นชัด */}
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#eef3f1] border border-[#cfe0dc]">
              <button
                type="button"
                onClick={() => {
                  setAuthMessage(null);
                  setAppMode("student-login");
                }}
                className={`py-2.5 px-3 rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                  !isTeacherRole
                    ? "bg-[#0f766e] text-white shadow-sm"
                    : "text-[#475b60] hover:text-[#1b2a2f]"
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
                    ? "bg-[#0b4f49] text-white shadow-sm"
                    : "text-[#475b60] hover:text-[#1b2a2f]"
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
                  <h1 className="text-[26px] font-extrabold text-[#1b2a2f] tracking-tight">
                    {studentAuthTab === "login"
                      ? "พร้อมลุยเควสต์?"
                      : "สมัครเข้าห้องเรียนใหม่"}
                  </h1>
                  <p className="text-[14px] text-[#475b60] mt-0.5">
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
                        ? "bg-[#e3f1ee] border-[#0f766e] text-[#0b4f49]"
                        : "bg-white border-[#cfe0dc] text-[#475b60]"
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
                        ? "bg-[#fff4d6] border-[#f0a92e] text-[#3d2603]"
                        : "bg-white border-[#cfe0dc] text-[#475b60]"
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
                        ? "bg-[#f8d9d4] text-[#7d1d10] border-[#fca5a5]"
                        : "bg-[#d8efdc] text-[#14532d] border-[#86efac]"
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
                        <label className="text-[14px] font-extrabold text-[#1b2a2f]">
                          ชื่อเล่นสมมติ
                        </label>
                        <span className="text-[12px] font-semibold text-[#475b60]">
                          ห้ามใช้ชื่อจริงหรืออีเมล (PDPA)
                        </span>
                      </div>
                      <input
                        type="text"
                        value={loginNickname}
                        onChange={(e) => setLoginNickname(e.target.value)}
                        placeholder="เช่น แมวส้ม"
                        className="w-full px-4 py-3.5 rounded-xl bg-[#f8fbfa] border-2 border-[#b6c9c5] text-[16px] font-bold text-[#1b2a2f] focus:bg-white focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[14px] font-extrabold text-[#1b2a2f]">
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
                        className="w-full px-4 py-3.5 rounded-xl bg-[#f8fbfa] border-2 border-[#b6c9c5] text-[16px] font-bold text-[#1b2a2f] tracking-widest focus:bg-white focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="press-teal disabled:opacity-60 w-full py-4 rounded-2xl text-[18px] font-extrabold flex items-center justify-center gap-2.5 cursor-pointer mt-1"
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
                      <label className="text-[14px] font-extrabold text-[#1b2a2f]">
                        1. ตั้งชื่อเล่นสมมติของคุณ (PDPA)
                      </label>
                      <input
                        type="text"
                        value={loginNickname}
                        onChange={(e) => setLoginNickname(e.target.value)}
                        placeholder="เช่น เสือน้อย, โลมาสีฟ้า"
                        className="w-full px-4 py-3 rounded-xl bg-[#f8fbfa] border-2 border-[#b6c9c5] text-[16px] font-bold text-[#1b2a2f] focus:bg-white focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[14px] font-extrabold text-[#1b2a2f]">
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
                          className="w-full px-4 py-3 rounded-xl bg-[#f8fbfa] border-2 border-[#b6c9c5] text-[16px] font-bold text-[#1b2a2f] tracking-widest focus:bg-white focus:outline-none focus:border-[#0f766e]"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[14px] font-extrabold text-[#1b2a2f]">
                          3. รหัสห้องจากครู
                        </label>
                        <input
                          type="text"
                          value={signupRoomCode}
                          onChange={(e) => setSignupRoomCode(e.target.value)}
                          placeholder="เช่น ABC123"
                          className="w-full px-4 py-3 rounded-xl bg-[#fff4d6]/60 border-2 border-[#f0a92e] font-code font-extrabold text-[16px] text-[#3d2603] focus:bg-white focus:outline-none focus:border-[#0f766e]"
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

                {/* แถบเลือกบัญชีตัวอย่างคลิกเดียวเข้าเล่น */}
                <div className="pt-2 border-t border-[#cfe0dc] flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-[#475b60]">
                  <span className="font-bold">บัญชีนักเรียนตัวอย่าง (PIN 1234):</span>
                  {students.slice(0, 4).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStudentAuthTab("login");
                        setLoginNickname(s.nickname);
                        setLoginPin("1234");
                      }}
                      className={`px-2.5 py-1 rounded-lg font-extrabold transition cursor-pointer ${
                        loginNickname === s.nickname &&
                        studentAuthTab === "login"
                          ? "bg-[#0b4f49] text-white"
                          : "bg-[#e3f1ee] text-[#0b4f49] hover:bg-[#cfe0dc]"
                      }`}
                    >
                      {s.nickname}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ==================== ฟอร์มสำหรับ ROLE: ครูผู้สอน ==================== */}
            {isTeacherRole && (
              <>
                <div>
                  <h1 className="text-[24px] font-extrabold text-[#1b2a2f]">
                    {teacherAuthTab === "login"
                      ? "เข้าสู่ระบบสำหรับครู"
                      : "สมัครบัญชีครูผู้สอนใหม่"}
                  </h1>
                  <p className="text-[13px] font-semibold text-[#475b60] mt-0.5">
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
                        ? "bg-[#e3f1ee] border-[#0f766e] text-[#0b4f49]"
                        : "bg-white border-[#cfe0dc] text-[#475b60]"
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
                        ? "bg-[#fff4d6] border-[#f0a92e] text-[#3d2603]"
                        : "bg-white border-[#cfe0dc] text-[#475b60]"
                    }`}
                  >
                    สมัครบัญชีครูใหม่
                  </button>
                </div>

                {teacherAuthError && (
                  <div className="p-3 rounded-xl bg-[#f8d9d4] text-[#7d1d10] border border-[#fca5a5] text-[13px] font-bold">
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
                    <label className="text-[14px] font-extrabold text-[#1b2a2f]">
                      ชื่อผู้ใช้ (ครู)
                    </label>
                    <input
                      type="text"
                      value={teacherUsername}
                      autoComplete="username"
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      placeholder="เช่น ครูตัวอย่าง"
                      className="w-full px-4 py-3 rounded-xl bg-[#f8fbfa] border-2 border-[#b6c9c5] text-[15px] font-bold text-[#1b2a2f] focus:bg-white focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>

                  {teacherAuthTab === "register" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[14px] font-extrabold text-[#1b2a2f]">
                        ชื่อที่แสดงในระบบ
                      </label>
                      <input
                        type="text"
                        value={teacherDisplayName}
                        onChange={(e) => setTeacherDisplayName(e.target.value)}
                        placeholder="เช่น ครูสมศรี (วิทยาการคำนวณ)"
                        className="w-full px-4 py-3 rounded-xl bg-[#f8fbfa] border-2 border-[#b6c9c5] text-[15px] font-bold text-[#1b2a2f] focus:bg-white focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] font-extrabold text-[#1b2a2f]">
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
                        className="w-full pl-4 pr-20 py-3 rounded-xl bg-[#f8fbfa] border-2 border-[#b6c9c5] text-[15px] font-bold text-[#1b2a2f] focus:bg-white focus:outline-none focus:border-[#0f766e]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret((v) => !v)}
                        aria-label={showSecret ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[12px] font-extrabold text-[#0b4f49] bg-[#e3f1ee] hover:bg-[#cfe0dc] cursor-pointer"
                      >
                        {showSecret ? "ซ่อน" : "แสดง"}
                      </button>
                    </div>
                    {teacherAuthTab === "register" && (
                      <p className="text-[12px] font-semibold text-[#475b60]">
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

                <p className="text-[12px] font-semibold text-[#475b60] leading-relaxed text-center">
                  หน้านี้แสดงเฉพาะชื่อเล่นสมมติและคะแนน ไม่แสดงข้อมูลส่วนบุคคลจริงของนักเรียน
                </p>
                <div className="pt-2 border-t border-[#cfe0dc] flex items-center justify-center gap-2 text-[12px] text-[#475b60]">
                  <span className="font-bold">บัญชีทดสอบ:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherAuthTab("login");
                      setTeacherAuthError("");
                      setTeacherUsername("ครูตัวอย่าง");
                      setTeacherPassword("12345678");
                    }}
                    className="px-2.5 py-1 rounded-lg font-extrabold bg-[#e3f1ee] text-[#0b4f49] hover:bg-[#cfe0dc] cursor-pointer"
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
    <div className="min-h-screen bg-[#eef3f1] text-[#1b2a2f] flex flex-col">
      {/* แถบบนสีเขียวเข้ม #0b4f49 ตาม Design System */}
      <header className="bg-[#0b4f49] text-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAppMode("landing")}
              className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[12px] font-bold cursor-pointer"
            >
              ← หน้าแรก
            </button>
            <button
              type="button"
              onClick={() => setStudentTab("quest")}
              className="text-[20px] font-extrabold tracking-tight flex items-center gap-2 cursor-pointer"
            >
              <Icon name="code" size={24} />
              <span>โค้ดนี้ฉันอธิบายได้</span>
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-[#0f766e] border border-white/20 text-[12px] font-extrabold">
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
              { id: "ailog" as StudentTab, label: "บันทึก AI", icon: "clipboard" as const },
            ].map((tab) => {
              const active = studentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStudentTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-[13px] font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                    active
                      ? "bg-[#f6b73c] text-[#3d2603] shadow-[0_2px_0_#b97a0c]"
                      : "bg-white/10 hover:bg-white/20 text-white"
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
            <div className="px-3 py-1 rounded-xl bg-[#fff4d6] text-[#3d2603] text-[13px] font-extrabold flex items-center gap-1.5">
              <Icon name="star" size={16} filled />
              <span>
                Lv.{studentLevel} · {currentStudent.xp} XP
              </span>
            </div>

            <div
              className="px-2.5 py-1 rounded-xl bg-white/15 text-[#f6b73c] text-[13px] font-extrabold flex items-center gap-1"
              title="สตรีคการฝึกต่อเนื่อง"
            >
              <Icon name="flame" size={16} filled />
              <span>{currentStudent.streak}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[12px] font-extrabold flex items-center gap-1.5 cursor-pointer"
              title="ออกจากระบบหรือสลับบทบาท"
            >
              <Icon name="logout" size={16} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {/* ==================== TAB 1: เส้นทางเควสต์ (หน้าแรกนักเรียน สไตล์มินิมอล ปุ่มเล่นชัดเจน) ==================== */}
        {studentTab === "quest" && (
          <div className="flex flex-col gap-6">
            {/* การ์ดเควสต์ประจำวัน + คำแนะนำทบทวนจากครู (ปุ่มกดเล่นเด่นชัด) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 bg-[#fff4d6] border-2 border-[#f0a92e] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#f6b73c] border-2 border-[#b97a0c] text-[#3d2603] flex items-center justify-center shrink-0">
                    <Icon name="target" size={24} />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#3d2603] text-[#fff4d6] text-[11px] font-extrabold">
                      เควสต์ประจำวัน · โบนัส +30 XP
                    </span>
                    <h3 className="text-[18px] font-extrabold text-[#3d2603] mt-1">
                      ฝึกอ่านโค้ดและตอบคำถามช่องการทำงานจริง (E1–E4)
                    </h3>
                    <p className="text-[13px] font-semibold text-[#5c3704] mt-0.5">
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
                  className="press-teal px-6 py-3.5 rounded-xl text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Icon name="play" size={18} filled />
                  <span>เริ่มเล่นเควสต์วันนี้</span>
                </button>
              </div>

              {/* การ์ดเรื่องที่ครูปักหมุดให้ทบทวนประจำห้อง */}
              <div className="lg:col-span-5 bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[12px] font-extrabold text-[#0f766e]">
                      คำแนะนำจากครู ({currentStudentRoom?.roomName || currentStudent.roomCode})
                    </span>
                    <h4 className="text-[16px] font-extrabold text-[#1b2a2f] mt-0.5">
                      {TOPICS.find(
                        (t) => t.id === currentStudentRoom?.pinnedReviewTopicId
                      )?.title || "เรื่องที่ 4 · วนซ้ำ while"}
                    </h4>
                  </div>
                  <Icon name="bulb" size={22} className="text-[#f0a92e] shrink-0" />
                </div>
                <p className="text-[13px] text-[#475b60]">
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

            {/* เส้นทางเควสต์ 7 เรื่อง (ชุดโค้ดแยกตามเรื่อง 7 เรื่อง ดีไซน์มินิมอล ปุ่มเล่นเต็มการ์ด) */}
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[24px] font-extrabold text-[#1b2a2f]">
                    เส้นทางเควสต์ 7 เรื่อง
                  </h2>
                  <p className="text-[14px] font-semibold text-[#475b60]">
                    ผ่านแล้ว {currentStudent.completedTopics.length}/7 เรื่อง · บอสด่านเปิดเมื่อผ่านอย่างน้อย 4 เรื่อง
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setUnlockAllDemo(!unlockAllDemo)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-extrabold border-2 transition cursor-pointer ${
                    unlockAllDemo
                      ? "bg-[#d8efdc] border-[#14532d] text-[#14532d]"
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
                            ? "bg-[#6d3fc0]/5 border-[#6d3fc0] md:col-span-2 lg:col-span-3"
                            : "bg-[#eef3f1] border-[#cfe0dc] md:col-span-2 lg:col-span-3 opacity-85"
                          : isPassed
                          ? "bg-[#f4faf8] border-[#0f766e]"
                          : unlocked
                          ? "bg-white border-[#f0a92e] shadow-sm"
                          : "bg-[#eef3f1] border-[#cfe0dc] opacity-80"
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
                                  ? "bg-[#6d3fc0] text-white"
                                  : isPassed
                                  ? "bg-[#d8efdc] text-[#14532d]"
                                  : unlocked
                                  ? "bg-[#fff4d6] text-[#3d2603]"
                                  : "bg-[#d8e3e0] text-[#475b60]"
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

                            <span className="text-[12px] font-bold text-[#475b60]">
                              ช่อง{" "}
                              {topic.questions.map((q) => q.cellId).join(", ")}
                            </span>
                          </div>

                          <h3 className="text-[18px] font-extrabold text-[#1b2a2f] mt-1.5">
                            {topic.title}
                          </h3>
                          <p className="text-[14px] text-[#475b60] mt-0.5">
                            {topic.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#cfe0dc]">
                        <span className="text-[13px] font-extrabold text-[#0b4f49] flex items-center gap-1.5">
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
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-6 flex flex-col gap-4">
              <h2 className="text-[24px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                <Icon name="book" size={24} className="text-[#0f766e]" />
                <span>รู้จัก Block Model 12 ช่อง และวิธีเรียน 4 ขั้น (PRIMM)</span>
              </h2>
              <p className="text-[15px] text-[#475b60]">
                เวลาเราสั่ง AI ให้เขียนโค้ดให้ การจะบอกว่าเรา &ldquo;เข้าใจโค้ดนั้นจริง&rdquo; ไม่ใช่แค่อ่านออกทีละคำ แต่ต้องเข้าใจครบทั้ง <strong>3 มิติ</strong> ในทุกระดับของโค้ด ตั้งแต่บรรทัดเดี่ยวไปจนถึงภาพรวมทั้งโปรแกรม รวมเป็น <strong>12 ช่องของ Block Model</strong>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                <div className="p-4 rounded-xl bg-[#e3f1ee] border border-[#0f766e]/40">
                  <div className="text-[15px] font-extrabold text-[#0b4f49]">
                    มิติที่ 1 · โครงสร้างโค้ด (Text Surface: T1–T4)
                  </div>
                  <p className="text-[14px] text-[#1b2a2f] mt-1">
                    อ่านไวยากรณ์ เครื่องหมาย ขอบเขตบล็อก `if/else`, ลูป `for/while` และการเชื่อมโยงพารามิเตอร์ออกอย่างถูกต้อง
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#fff4d6] border border-[#f0a92e]">
                  <div className="text-[15px] font-extrabold text-[#3d2603]">
                    มิติที่ 2 · การทำงานเมื่อรันจริง (Execution: E1–E4)
                  </div>
                  <p className="text-[14px] text-[#3d2603] mt-1">
                    แกะรอยได้ว่าเมื่อรันจริง โค้ดเดินไปบรรทัดไหนบ้าง ค่าตัวแปรเปลี่ยนเป็นเท่าไหร่ และพิมพ์ผลลัพธ์อะไรออกมา
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#d8efdc] border border-[#86efac]">
                  <div className="text-[15px] font-extrabold text-[#14532d]">
                    มิติที่ 3 · หน้าที่และเป้าหมาย (Function: F1–F4)
                  </div>
                  <p className="text-[14px] text-[#14532d] mt-1">
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
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-[18px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                  <Icon name="code" size={20} className="text-[#0f766e]" />
                  <span>ห้องทดลองรันโค้ด JavaScript จริง (ตรวจสอบโค้ดที่ AI เขียนให้)</span>
                </h3>
                <p className="text-[13px] font-semibold text-[#475b60]">
                  วางโค้ด JavaScript ที่คุณได้มาจาก AI แล้วกดรันจริงเพื่อดูผลลัพธ์จาก console.log โดยไม่ใช้การเดา
                </p>
              </div>

              <textarea
                rows={6}
                value={playgroundCode}
                onChange={(e) => setPlaygroundCode(e.target.value)}
                className="w-full p-4 rounded-xl bg-[#eef3f1] border-2 border-[#b6c9c5] font-code font-bold text-[#1b2a2f]"
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
                  className="press-teal px-5 py-2.5 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer"
                >
                  <Icon name="play" size={18} />
                  <span>รันโค้ดจริง</span>
                </button>
              </div>

              {playgroundOutput && (
                <div className="p-4 rounded-xl bg-[#d8efdc] border-2 border-[#86efac] text-[#14532d]">
                  <div className="text-[13px] font-extrabold">ผลลัพธ์จากการรันโค้ดจริง:</div>
                  <pre className="font-code font-extrabold text-[16px] mt-1">
                    {playgroundOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: โปรไฟล์นักเรียน (ตามโฟลขั้นที่ 7) ==================== */}
        {studentTab === "profile" && (
          <div className="flex flex-col gap-6">
            {/* การ์ดข้อมูลสรุปนักเรียน */}
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <StatusCircle variant="badge" size="lg" label="โปรไฟล์นักเรียน" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[24px] font-extrabold text-[#1b2a2f]">
                      โปรไฟล์ของ {currentStudent.nickname}
                    </h2>
                    <span className="px-3 py-0.5 rounded-full bg-[#e3f1ee] text-[#0b4f49] text-[13px] font-extrabold">
                      รหัสห้อง {currentStudent.roomCode}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold text-[#475b60] mt-0.5">
                    เลเวล {studentLevel} · สะสม {currentStudent.xp} XP · ต่อเนื่อง {currentStudent.streak} วัน · ผ่านแล้ว{" "}
                    {currentStudent.completedTopics.length}/7 เรื่อง · ความเข้าใจเฉลี่ย{" "}
                    {studentAvgMastery}% ({getMasteryStatus(studentAvgMastery).label})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStudentTab("quest")}
                className="press-teal px-4 py-2.5 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer"
              >
                <Icon name="route" size={18} />
                <span>ไปฝึกเรื่องถัดไป</span>
              </button>
            </div>

            {/* สรุปด้านที่เก่ง & ด้านที่ควรทบทวน */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#d8efdc] border-2 border-[#86efac] rounded-2xl p-5 text-[#14532d]">
                <div className="flex items-center gap-2 font-extrabold text-[16px]">
                  <Icon name="check" size={20} />
                  <span>ด้านที่เก่ง (เข้าใจ 80% ขึ้นไป)</span>
                </div>
                <div className="mt-3 space-y-2">
                  {strongStudentCells.length > 0 ? (
                    strongStudentCells.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl bg-white/80 flex items-center justify-between text-[14px] font-bold"
                      >
                        <span>
                          ช่อง {c.id} · {c.shortTitle}
                        </span>
                        <span className="font-extrabold">
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

              <div className="bg-[#f8d9d4] border-2 border-[#fca5a5] rounded-2xl p-5 text-[#7d1d10]">
                <div className="flex items-center gap-2 font-extrabold text-[16px]">
                  <Icon name="bulb" size={20} />
                  <span>ด้านที่ควรทบทวนเพิ่มเติม</span>
                </div>
                <div className="mt-3 space-y-2">
                  {reviewStudentCells.length > 0 ? (
                    reviewStudentCells.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl bg-white/85 flex items-center justify-between gap-2 text-[14px] font-bold"
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
                          className="px-2.5 py-1 rounded-lg bg-[#7d1d10] text-white text-[12px] font-extrabold cursor-pointer"
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
              <div className="lg:col-span-6 bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-3">
                <h3 className="text-[17px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                  <Icon name="shield" size={20} className="text-[#0f766e]" />
                  <span>ตราความสำเร็จที่ได้รับ ({currentStudent.badges.length}/7)</span>
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
                            ? "bg-[#e3f1ee] border-[#0f766e] text-[#0b4f49]"
                            : "bg-[#eef3f1] border-[#cfe0dc] text-[#475b60] opacity-65"
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
                          <div className="text-[12px] truncate">
                            {t.badgeReward.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-6 bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-3">
                <h3 className="text-[17px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                  <Icon name="chart" size={20} className="text-[#0f766e]" />
                  <span>ประวัติการฝึกอ่านโค้ดล่าสุด</span>
                </h3>
                {currentStudent.history.length > 0 ? (
                  <div className="space-y-2.5">
                    {currentStudent.history.map((h, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-[#eef3f1] border border-[#cfe0dc] flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-[14px] font-extrabold text-[#1b2a2f]">
                            {h.topicTitle}
                          </div>
                          <div className="text-[12px] text-[#475b60]">
                            {h.timestamp} · ความเข้าใจ {h.scorePercent}%
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-[#fff4d6] text-[#3d2603] border border-[#f0a92e] text-[13px] font-extrabold">
                          +{h.xpEarned} XP
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-[#475b60]">
                    ยังไม่มีประวัติการเล่น เริ่มฝึกเรื่องที่ 1 ในหน้าเส้นทางเควสต์ได้เลย!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: บันทึกการใช้ AI (≥ 5 Prompts ตามเกณฑ์ส่งงานหน้า 1) ==================== */}
        {studentTab === "ailog" && (
          <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <span className="px-3 py-1 rounded-full bg-[#e3f1ee] text-[#0b4f49] text-[12px] font-extrabold">
                รายการส่งงาน · บันทึกการใช้ AI (AI Log ≥ 5 Prompts)
              </span>
              <h2 className="text-[22px] font-extrabold text-[#1b2a2f] mt-2">
                บันทึกการใช้ AI พัฒนาโปรเจกต์ &ldquo;โค้ดนี้ฉันอธิบายได้&rdquo;
              </h2>
              <p className="text-[14px] text-[#475b60]">
                แสดงรายการ Prompt ที่ใช้จริง ปัญหาที่พบจากผลลัพธ์ของ AI และวิธีที่ทีมปรับปรุงแก้ไขด้วยตัวเองตามหลักการที่ต้องรักษา
              </p>
            </div>

            <div className="space-y-4">
              {AI_USAGE_LOGS.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-[#eef3f1] border-2 border-[#cfe0dc] flex flex-col gap-2.5"
                >
                  <div className="text-[16px] font-extrabold text-[#0b4f49]">
                    {log.promptTitle}
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#cfe0dc] text-[14px]">
                    <strong className="text-[#0f766e]">Prompt ที่สั่ง AI: </strong>
                    {log.promptText}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                    <div className="p-3 rounded-xl bg-[#f8d9d4] text-[#7d1d10]">
                      <strong>ปัญหาที่พบจากโค้ด/เนื้อหาที่ AI สร้าง:</strong>
                      <p className="mt-0.5">{log.problemFound}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#d8efdc] text-[#14532d]">
                      <strong>วิธีที่ทีมปรับแก้และพัฒนาต่อ:</strong>
                      <p className="mt-0.5">{log.solutionApplied}</p>
                    </div>
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
