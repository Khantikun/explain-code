"use client";

import React, { useState, useEffect } from "react";
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

export default function ExplainCodeApp() {
  const [appMode, setAppMode] = useState<AppMode>("student-login");
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
  const [loginNickname, setLoginNickname] = useState<string>("แมวส้ม");
  const [loginPin, setLoginPin] = useState<string>("1234");
  const [signupRoomCode, setSignupRoomCode] = useState<string>("ABC123");
  const [authMessage, setAuthMessage] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);
  const [currentStudentId, setCurrentStudentId] = useState<string>("stu-1");

  // สถานะฟอร์มล็อกอินฝั่งครู (Role: teacher)
  const [teacherAuthTab, setTeacherAuthTab] = useState<"login" | "register">(
    "login"
  );
  const [teacherUsername, setTeacherUsername] = useState<string>("ครูตัวอย่าง");
  const [teacherPassword, setTeacherPassword] = useState<string>("12345678");
  const [teacherDisplayName, setTeacherDisplayName] = useState<string>(
    "ครูวิทยาการคำนวณ"
  );
  const [teacherAuthError, setTeacherAuthError] = useState<string>("");

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
          setAppMode("student-portal");
        } else if (parsed.role === "teacher") {
          setTeacherUsername(parsed.username);
          setAppMode("teacher-portal");
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
  const handleCreateClassroom = (roomName: string): ClassroomRecord => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const newRoom: ClassroomRecord = {
      roomCode: code,
      roomName,
      teacherUsername: teacherUsername || "ครูตัวอย่าง",
      pinnedReviewTopicId: 1,
      pinnedReviewNote: "เริ่มต้นฝึกอ่านโค้ดเรื่องที่ 1 ตัวแปรและการคำนวณ",
      createdAt: "วันนี้",
    };
    const updated = [newRoom, ...classrooms];
    saveRoomsToStorage(updated);
    return newRoom;
  };

  // ครูปรับการสอน / ปักหมุดเรื่องทบทวนประจำห้อง (ขั้นตอนที่ 7 ของโฟลครู)
  const handleUpdatePinnedReview = (
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
  };

  // เมื่อนักเรียนเล่นจบเรื่อง -> อัปเดต XP, ตรา, และคะแนน 12 ช่องของ Block Model
  const handleCompleteTopic = (result: {
    topicId: number;
    earnedXp: number;
    updatedCellScores: Partial<Record<BlockCellId, number>>;
    badgeId: string;
    scorePercent: number;
  }) => {
    const topicObj = TOPICS.find((t) => t.id === result.topicId)!;
    const updatedStudents = students.map((stu) => {
      if (stu.id !== currentStudent.id) return stu;

      const nextCompleted = stu.completedTopics.includes(result.topicId)
        ? stu.completedTopics
        : [...stu.completedTopics, result.topicId];

      const nextBadges = stu.badges.includes(result.badgeId)
        ? stu.badges
        : [...stu.badges, result.badgeId];

      const nextCells = { ...stu.cellScores };
      Object.entries(result.updatedCellScores).forEach(([cellKey, val]) => {
        const k = cellKey as BlockCellId;
        if (typeof val === "number") {
          nextCells[k] = Math.max(nextCells[k] || 0, val);
        }
      });

      const nextHistory = [
        {
          topicId: result.topicId,
          topicTitle: topicObj.title,
          scorePercent: result.scorePercent,
          xpEarned: result.earnedXp,
          timestamp: "เมื่อสักครู่",
        },
        ...stu.history,
      ];

      return {
        ...stu,
        xp: stu.xp + result.earnedXp,
        completedTopics: nextCompleted,
        badges: nextBadges,
        cellScores: nextCells,
        history: nextHistory,
      };
    });

    saveStudentsToStorage(updatedStudents);
    setStudentTab("profile");
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
                    onSubmit={handleStudentLogin}
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
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value)}
                        placeholder="••••"
                        className="w-full px-4 py-3.5 rounded-xl bg-[#f8fbfa] border-2 border-[#b6c9c5] text-[16px] font-bold text-[#1b2a2f] tracking-widest focus:bg-white focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="press-teal w-full py-4 rounded-2xl text-[18px] font-extrabold flex items-center justify-center gap-2.5 cursor-pointer mt-1"
                    >
                      <Icon name="play" size={22} filled />
                      <span>เริ่มเล่นเลย</span>
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={handleStudentSignupWithRoom}
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
                          value={loginPin}
                          onChange={(e) => setLoginPin(e.target.value)}
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
                      className="press-gold w-full py-4 rounded-2xl text-[18px] font-extrabold flex items-center justify-center gap-2.5 cursor-pointer mt-1"
                    >
                      <Icon name="user" size={22} />
                      <span>สมัครเข้าเล่นทันที</span>
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
                      ? handleTeacherLogin
                      : handleTeacherRegister
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
                    <input
                      type="password"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-[#f8fbfa] border-2 border-[#b6c9c5] text-[15px] font-bold text-[#1b2a2f] focus:bg-white focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-4 rounded-2xl text-[17px] font-extrabold flex items-center justify-center gap-2 cursor-pointer mt-1 ${
                      teacherAuthTab === "login" ? "press-teal" : "press-gold"
                    }`}
                  >
                    <Icon name="users" size={20} />
                    <span>
                      {teacherAuthTab === "login"
                        ? "เข้าสู่ระบบสำหรับครู"
                        : "สร้างบัญชีครูและเข้าใช้งาน"}
                    </span>
                  </button>
                </form>

                <p className="text-[12px] font-semibold text-[#475b60] leading-relaxed text-center">
                  หน้านี้แสดงเฉพาะชื่อเล่นสมมติและคะแนน ไม่แสดงข้อมูลส่วนบุคคลจริงของนักเรียน (บัญชีทดสอบ: <strong>ครูตัวอย่าง</strong> / รหัสผ่าน <strong>12345678</strong>)
                </p>
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
                    เลเวล {studentLevel} · สะสม {currentStudent.xp} XP · ผ่านแล้ว{" "}
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
