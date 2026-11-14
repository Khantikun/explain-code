import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  ClassroomRecord,
  StudentRecord,
  BLOCK_MODEL_CELLS,
  BlockCellId,
  TOPICS,
  getMasteryStatus,
} from "../lib/curriculum";
import { Icon } from "./Icons";
import { BlockModelGrid } from "./BlockModelGrid";

export interface TeacherDashboardProps {
  teacherUsername: string;
  classrooms: ClassroomRecord[];
  students: StudentRecord[];
  onCreateClassroom: (
    roomName: string
  ) => ClassroomRecord | Promise<ClassroomRecord>;
  onUpdatePinnedReview: (
    roomCode: string,
    topicId: number | null,
    note: string
  ) => void | Promise<void>;
  onLogout: () => void;
  onSwitchToStudentView: () => void;
  cellAverages?: {
    classroom_id?: string;
    classroomId?: string;
    roomCode?: string;
    cell_id: string;
    avg_score: number;
    students_count: number;
  }[];
  questionStats?: {
    classroom_id?: string;
    classroomId?: string;
    roomCode?: string;
    question_id: string;
    cell_id: string;
    answers: number;
    wrong_percent: number;
  }[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void> | void;
}

export function TeacherDashboard({
  teacherUsername,
  classrooms,
  students,
  onCreateClassroom,
  onUpdatePinnedReview,
  onLogout,
  onSwitchToStudentView,
  cellAverages,
  questionStats,
  isLoading,
  onRefresh,
}: TeacherDashboardProps) {
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>(
    classrooms[0]?.roomCode || "ABC123"
  );
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [inspectingStudent, setInspectingStudent] = useState<StudentRecord | null>(
    null
  );

  const currentRoom =
    classrooms.find((r) => r.roomCode === selectedRoomCode) || classrooms[0];
  const roomStudents = students.filter(
    (s) => s.roomCode === currentRoom?.roomCode
  );

  // สถานะสำหรับการปรับการสอน (ขั้นตอนที่ 7)
  const [reviewTopicId, setReviewTopicId] = useState<number>(
    currentRoom?.pinnedReviewTopicId || 4
  );
  const [reviewNote, setReviewNote] = useState<string>(
    currentRoom?.pinnedReviewNote ||
      "ให้ทบทวนช่อง Block Model ที่ค่าเฉลี่ยของห้องต่ำกว่า 50%"
  );
  const [savedReviewBanner, setSavedReviewBanner] = useState<boolean>(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);

  // ซิงค์เรื่องทบทวนและโน้ตเมื่อสลับห้องเรียน
  useEffect(() => {
    if (currentRoom) {
      setReviewTopicId(currentRoom.pinnedReviewTopicId || 4);
      setReviewNote(
        currentRoom.pinnedReviewNote ||
          "ให้ทบทวนช่อง Block Model ที่ค่าเฉลี่ยของห้องต่ำกว่า 50%"
      );
    }
  }, [
    currentRoom?.roomCode,
    currentRoom?.pinnedReviewTopicId,
    currentRoom?.pinnedReviewNote,
  ]);

  // คำนวณค่าเฉลี่ย 12 ช่องของทั้งห้อง (หากมี cellAverages จาก Supabase ให้ใช้ค่าเฉลี่ยจริงจากฐานข้อมูล)
  const avgCellScores: Record<BlockCellId, number> = {
    T1: 0,
    E1: 0,
    F1: 0,
    T2: 0,
    E2: 0,
    F2: 0,
    T3: 0,
    E3: 0,
    F3: 0,
    T4: 0,
    E4: 0,
    F4: 0,
  };

  const currentRoomCellAverages = (cellAverages || []).filter(
    (c) =>
      c.classroom_id === currentRoom?.roomCode ||
      c.classroomId === (currentRoom as any)?.id ||
      c.roomCode === currentRoom?.roomCode
  );

  BLOCK_MODEL_CELLS.forEach((cell) => {
    const viewStat = currentRoomCellAverages.find(
      (a) => a.cell_id === cell.id || (a as any).cellId === cell.id
    );
    if (viewStat) {
      avgCellScores[cell.id] = Math.round(Number(viewStat.avg_score));
    } else if (roomStudents.length === 0) {
      avgCellScores[cell.id] = 0;
    } else {
      const sum = roomStudents.reduce(
        (acc, st) => acc + (st.cellScores?.[cell.id] ?? 50),
        0
      );
      avgCellScores[cell.id] = Math.round(sum / roomStudents.length);
    }
  });

  const overallRoomAvg =
    roomStudents.length === 0
      ? 0
      : Math.round(
          Object.values(avgCellScores).reduce((a, b) => a + b, 0) / 12
        );

  const weakCells = BLOCK_MODEL_CELLS.filter(
    (c) => avgCellScores[c.id] < 55
  ).sort((a, b) => avgCellScores[a.id] - avgCellScores[b.id]);

  const strongCells = BLOCK_MODEL_CELLS.filter(
    (c) => avgCellScores[c.id] >= 80
  ).sort((a, b) => avgCellScores[b.id] - avgCellScores[a.id]);

  const handleCreateNewRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || isCreatingRoom) return;
    try {
      setIsCreatingRoom(true);
      const created = await onCreateClassroom(newRoomName.trim());
      if (created?.roomCode) {
        setSelectedRoomCode(created.roomCode);
      }
      setNewRoomName("");
    } catch (err) {
      console.error("Failed to create classroom:", err);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleCopyRoomCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const buildRoomSummaryText = () => {
    if (!currentRoom) return "";
    const weakList =
      weakCells.length > 0
        ? weakCells
            .map((c) => `${c.id} (${c.shortTitle}: ${avgCellScores[c.id]}%)`)
            .join(", ")
        : "ไม่มีช่องที่ต่ำกว่าเกณฑ์";
    const strongList =
      strongCells.length > 0
        ? strongCells
            .map((c) => `${c.id} (${c.shortTitle}: ${avgCellScores[c.id]}%)`)
            .join(", ")
        : "-";

    const studentLines = roomStudents
      .map((st) => {
        const stuAvg = Math.round(
          Object.values(st.cellScores).reduce((a, b) => a + b, 0) / 12
        );
        return `- ${st.nickname}: ผ่านแล้ว ${st.completedTopics.length}/7 เรื่อง | ความเข้าใจเฉลี่ย ${stuAvg}% | ${st.xp} XP`;
      })
      .join("\n");

    return [
      `สรุปผลความเข้าใจการอ่านโค้ด (โค้ดนี้ฉันอธิบายได้)`,
      `ห้องเรียน: ${currentRoom.roomName} (รหัสห้อง: ${currentRoom.roomCode})`,
      `จำนวนนักเรียน: ${roomStudents.length} คน | คะแนนความเข้าใจเฉลี่ยทั้งห้อง: ${overallRoomAvg}%`,
      `ช่อง Block Model ที่ห้องเก่ง (80%+): ${strongList}`,
      `ช่อง Block Model ที่ห้องควรทบทวน: ${weakList}`,
      `เรื่องที่ครูปักหมุดให้ทบทวน: ${
        TOPICS.find((t) => t.id === currentRoom.pinnedReviewTopicId)?.title ||
        "ยังไม่ระบุ"
      }`,
      `รายชื่อนักเรียน (ชื่อเล่นสมมติ PDPA):`,
      studentLines,
    ].join("\n");
  };

  const handleCopySummary = () => {
    const text = buildRoomSummaryText();
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleSaveTeachingAdjustment = async () => {
    if (!currentRoom || isSavingReview) return;
    try {
      setIsSavingReview(true);
      await onUpdatePinnedReview(currentRoom.roomCode, reviewTopicId, reviewNote);
      setSavedReviewBanner(true);
      setTimeout(() => setSavedReviewBanner(false), 2500);
    } catch (err) {
      console.error("Failed to update pinned review:", err);
    } finally {
      setIsSavingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef3f1] text-[#1b2a2f] flex flex-col">
      {/* แถบบนฝั่งครู */}
      <header className="bg-white border-b-2 border-[#cfe0dc] sticky top-0 z-30 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="โค้ดนี้ฉันอธิบายได้"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain border border-[#0f766e]/40 bg-[#0d0b14] shrink-0"
            />
            <span className="text-[20px] font-extrabold text-[#0b4f49]">
              โค้ดนี้ฉันอธิบายได้ · ครู
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#e3f1ee] text-[#0b4f49] text-[13px] font-bold">
              ผู้สอน: {teacherUsername}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {isLoading && (
              <span className="px-2.5 py-1 rounded-full bg-[#fbeacb] text-[#5c3704] text-[12px] font-bold animate-pulse">
                กำลังโหลดข้อมูล...
              </span>
            )}
            {onRefresh && (
              <button
                type="button"
                onClick={() => void onRefresh()}
                disabled={isLoading}
                className="press-secondary px-3 py-1.5 rounded-xl text-[13px] font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="รีเฟรชข้อมูลจากฐานข้อมูล"
              >
                <Icon name="chart" size={16} />
                <span>รีเฟรช</span>
              </button>
            )}
            <button
              type="button"
              onClick={onSwitchToStudentView}
              className="press-secondary px-3.5 py-2 rounded-xl text-[13px] font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="user" size={18} />
              <span>สลับไปดูหน้าฝั่งนักเรียน</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="press-secondary px-3.5 py-2 rounded-xl text-[13px] font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="logout" size={18} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* แถบแสดงโฟลฝั่งครู 7 ขั้นตอน */}
        <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-4 no-print">
          <div className="text-[13px] font-extrabold text-[#0b4f49] mb-2">
            โฟลฝั่งครู · จากสร้างห้องจนนำข้อมูลไปปรับการสอน (แสดงเฉพาะชื่อเล่นสมมติและคะแนนตาม PDPA 2562)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[12px]">
            {[
              { step: "1 · เข้าสู่ระบบ", sub: "บัญชีครู", active: false },
              { step: "2 · สร้างห้อง", sub: "ตั้งชื่อ ได้รหัสห้อง", active: false },
              { step: "3 · แจกรหัสห้อง", sub: "นักเรียนใช้ตอนสมัคร", active: false },
              { step: "4 · ภาพรวมห้อง", sub: "ใครทำถึงไหน คะแนนเฉลี่ย", active: true },
              { step: "5 · แผนที่ของห้อง", sub: "ช่อง Block Model ที่อ่อน", active: true },
              { step: "6 · ดูรายคน", sub: "โปรไฟล์ ประวัติ ด้านเก่ง", active: true },
              { step: "7 · ปรับการสอน", sub: "เลือกเรื่องให้ทบทวน", active: false },
            ].map((item) => (
              <div
                key={item.step}
                className={`p-2.5 rounded-xl border ${
                  item.active
                    ? "bg-[#d8efdc] border-[#86efac] text-[#14532d]"
                    : "bg-[#eef3f1] border-[#cfe0dc] text-[#1b2a2f]"
                }`}
              >
                <div className="font-extrabold">{item.step}</div>
                <div className="opacity-85 mt-0.5">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ขั้นตอนที่ 2 & 3: เลือกห้อง / สร้างห้องใหม่ และแจกรหัสห้อง */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col justify-between gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[13px] font-extrabold text-[#0f766e]">
                  ขั้นตอนที่ 2 & 3 · ห้องเรียนและรหัสห้องสำหรับแจกนักเรียน
                </span>
                <h2 className="text-[20px] font-extrabold text-[#1b2a2f] mt-0.5">
                  {currentRoom?.roomName}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[13px] font-bold text-[#475b60]">เปลี่ยนห้อง:</label>
                <select
                  value={selectedRoomCode}
                  onChange={(e) => {
                    setSelectedRoomCode(e.target.value);
                    setInspectingStudent(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#eef3f1] border-2 border-[#b6c9c5] text-[14px] font-extrabold text-[#0b4f49]"
                >
                  {classrooms.map((c) => (
                    <option key={c.roomCode} value={c.roomCode}>
                      {c.roomName} ({c.roomCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#e3f1ee] border-2 border-[#0f766e] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-bold text-[#0b4f49]">
                  รหัสห้อง (ให้นักเรียนกรอกช่องสมัครสมาชิก):
                </div>
                <div className="font-code text-[26px] font-extrabold text-[#0b4f49] tracking-wider">
                  {currentRoom?.roomCode}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyRoomCode}
                className="press-teal px-4 py-2.5 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer no-print"
              >
                <Icon name="clipboard" size={18} />
                <span>{copiedCode ? "คัดลอกรหัสห้องแล้ว!" : "คัดลอกรหัสห้องแจกนักเรียน"}</span>
              </button>
            </div>
          </div>

          <form
            onSubmit={handleCreateNewRoom}
            className="lg:col-span-5 bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col justify-between gap-3 no-print"
          >
            <div>
              <span className="text-[13px] font-extrabold text-[#0f766e]">
                สร้างห้องเรียนใหม่
              </span>
              <h3 className="text-[16px] font-extrabold text-[#1b2a2f] mt-0.5">
                ตั้งชื่อห้องเพื่อรับรหัสห้อง 6 หลักอัตโนมัติ
              </h3>
            </div>

            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="เช่น ม.5/2 วิทยาการคำนวณ"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#b6c9c5] text-[15px] text-[#1b2a2f]"
            />

            <button
              type="submit"
              disabled={!newRoomName.trim() || isCreatingRoom}
              className="press-teal w-full py-2.5 rounded-xl text-[15px] font-extrabold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isCreatingRoom ? (
                <span>กำลังสร้างห้องเรียน...</span>
              ) : (
                <span>+ สร้างห้องเรียนและรับรหัสห้อง</span>
              )}
            </button>
          </form>
        </div>

        {/* ขั้นตอนที่ 4: ภาพรวมห้อง (การ์ดตัวเลขสรุป) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#e3f1ee] text-[#0f766e] flex items-center justify-center">
              <Icon name="users" size={24} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#475b60]">นักเรียนในห้องนี้</div>
              <div className="text-[24px] font-extrabold text-[#1b2a2f]">
                {roomStudents.length} คน
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#d8efdc] text-[#14532d] flex items-center justify-center">
              <Icon name="chart" size={24} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#475b60]">
                คะแนนความเข้าใจเฉลี่ยทั้งห้อง
              </div>
              <div className="text-[24px] font-extrabold text-[#14532d]">
                {overallRoomAvg}% ({getMasteryStatus(overallRoomAvg).shortLabel})
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#f8d9d4] text-[#7d1d10] flex items-center justify-center">
              <Icon name="bulb" size={24} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#475b60]">
                ช่อง Block Model ที่ห้องควรทบทวน
              </div>
              <div className="text-[16px] font-extrabold text-[#7d1d10]">
                {weakCells.length > 0
                  ? weakCells.map((c) => `ช่อง ${c.id}`).join(", ")
                  : "ผ่านเกณฑ์ทุกช่อง"}
              </div>
            </div>
          </div>
        </div>

        {/* ขั้นตอนที่ 5: แผนที่ Block Model เฉลี่ยทั้งห้อง + ส่งออกสรุป */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[20px] font-extrabold text-[#1b2a2f]">
              ขั้นตอนที่ 5 · แผนที่ความเข้าใจ 12 ช่อง เฉลี่ยทั้งห้อง ({currentRoom?.roomName})
            </h2>
            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={handleCopySummary}
                className="press-teal px-4 py-2 rounded-xl text-[14px] font-extrabold flex items-center gap-2 cursor-pointer"
              >
                <Icon name="clipboard" size={18} />
                <span>
                  {copiedSummary
                    ? "คัดลอกสรุปห้องเรียบร้อย!"
                    : "คัดลอกสรุปห้องไปปรับการสอน"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="press-secondary px-4 py-2 rounded-xl text-[14px] font-extrabold cursor-pointer"
              >
                พิมพ์สรุปห้อง
              </button>
            </div>
          </div>

          <BlockModelGrid
            cellScores={avgCellScores}
            title={`แผนที่ Block Model เฉลี่ยทั้งห้อง (${roomStudents.length} คน)`}
            subtitle="ช่วยให้ครูเห็นทันทีว่าทั้งห้องเข้าใจช่องไหนดีแล้ว และช่องไหนที่ห้องยังอ่อนเพื่อนำไปปรับการสอน"
          />

          {/* สถิติข้อที่นักเรียนในห้องตอบผิดบ่อย (จาก classroom_question_stats view) */}
          {(() => {
            const currentRoomQuestionStats = (questionStats || []).filter(
              (q) =>
                q.classroom_id === currentRoom?.roomCode ||
                q.classroomId === (currentRoom as any)?.id ||
                q.roomCode === currentRoom?.roomCode
            );
            if (currentRoomQuestionStats.length === 0) return null;

            return (
              <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#f8d9d4] text-[#7d1d10] flex items-center justify-center font-bold">
                    <Icon name="bulb" size={20} />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-extrabold text-[#1b2a2f]">
                      สถิติข้อที่นักเรียนในห้องตอบผิดบ่อย (จาก classroom_question_stats)
                    </h4>
                    <p className="text-[13px] text-[#475b60]">
                      วิเคราะห์จากประวัติการตอบคำถามจริงในห้องเพื่อนำไปเน้นย้ำในชั่วโมงสอน
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
                  {currentRoomQuestionStats
                    .sort((a, b) => b.wrong_percent - a.wrong_percent)
                    .slice(0, 6)
                    .map((stat, idx) => (
                      <div
                        key={stat.question_id + idx}
                        className="p-3.5 rounded-xl bg-[#fef8f8] border border-[#fca5a5] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-[#7d1d10] text-white text-[11px] font-extrabold">
                              ช่อง {stat.cell_id}
                            </span>
                            <span className="font-code text-[12px] font-bold text-[#1b2a2f] truncate">
                              ข้อ: {stat.question_id}
                            </span>
                          </div>
                          <div className="text-[12px] text-[#475b60] mt-1">
                            ตอบทั้งหมด {stat.answers} ครั้ง
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[17px] font-extrabold text-[#7d1d10]">
                            ผิด {Math.round(stat.wrong_percent)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ขั้นตอนที่ 6 & 4: ตารางภาพรวมว่าใครทำถึงไหน + ดูรายคน */}
        <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[18px] font-extrabold text-[#1b2a2f] flex items-center gap-2">
                <Icon name="users" size={20} className="text-[#0f766e]" />
                <span>ขั้นตอนที่ 4 & 6 · ภาพรวมว่าใครทำถึงไหน และดูโปรไฟล์รายคน</span>
              </h3>
              <p className="text-[13px] font-semibold text-[#475b60]">
                คลิกปุ่ม &ldquo;ดูรายคน&rdquo; เพื่อดูแผนที่ 12 ช่อง ประวัติการเล่น และด้านที่เก่งของนักเรียนแต่ละคน
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#cfe0dc] text-[13px] font-extrabold text-[#0b4f49] bg-[#eef3f1]">
                  <th className="p-3 rounded-tl-xl">ชื่อเล่นสมมติ</th>
                  <th className="p-3">ความคืบหน้า (7 เรื่อง)</th>
                  <th className="p-3">คะแนนเฉลี่ย</th>
                  <th className="p-3">ด้านที่เก่ง</th>
                  <th className="p-3">ด้านที่ควรทบทวน</th>
                  <th className="p-3 rounded-tr-xl text-right no-print">ดูรายคน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cfe0dc] text-[14px]">
                {roomStudents.map((stu) => {
                  const stuAvg = Math.round(
                    Object.values(stu.cellScores).reduce((a, b) => a + b, 0) / 12
                  );
                  const status = getMasteryStatus(stuAvg);
                  const sortedCells = [...BLOCK_MODEL_CELLS].sort(
                    (a, b) => stu.cellScores[b.id] - stu.cellScores[a.id]
                  );
                  const topCell = sortedCells[0];
                  const bottomCell = sortedCells[sortedCells.length - 1];

                  return (
                    <tr key={stu.id} className="hover:bg-[#eef3f1]/50">
                      <td className="p-3 font-extrabold text-[#1b2a2f]">
                        <div className="flex items-center gap-2">
                          <span>{stu.nickname}</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#fff4d6] text-[#3d2603] text-[12px] font-bold">
                            {stu.xp} XP
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {TOPICS.map((t) => {
                            const done = stu.completedTopics.includes(t.id);
                            return (
                              <span
                                key={t.id}
                                title={t.title}
                                className={`w-6 h-6 rounded-full text-[12px] font-extrabold flex items-center justify-center ${
                                  done
                                    ? t.isBoss
                                      ? "bg-[#6d3fc0] text-white"
                                      : "bg-[#0f766e] text-white"
                                    : "bg-[#d8e3e0] text-[#475b60]"
                                }`}
                              >
                                {t.id}
                              </span>
                            );
                          })}
                          <span className="text-[12px] font-bold text-[#475b60] ml-1">
                            ({stu.completedTopics.length}/7)
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[13px] font-extrabold border ${status.className}`}
                        >
                          {stuAvg}% · {status.shortLabel}
                        </span>
                      </td>
                      <td className="p-3 text-[13px] font-bold text-[#14532d]">
                        ช่อง {topCell.id} ({topCell.shortTitle} {stu.cellScores[topCell.id]}%)
                      </td>
                      <td className="p-3 text-[13px] font-bold text-[#7d1d10]">
                        ช่อง {bottomCell.id} ({bottomCell.shortTitle}{" "}
                        {stu.cellScores[bottomCell.id]}%)
                      </td>
                      <td className="p-3 text-right no-print">
                        <button
                          type="button"
                          onClick={() => setInspectingStudent(stu)}
                          className="press-secondary px-3 py-1.5 rounded-xl text-[13px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Icon name="eye" size={16} />
                          <span>ดูรายคน</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* แผงดูโปรไฟล์รายคนเมื่อคลิกเลือกนักเรียน */}
          {inspectingStudent && (
            <div className="mt-3 p-5 rounded-2xl bg-[#eef3f1] border-2 border-[#0f766e] flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0b4f49] text-white text-[12px] font-extrabold">
                    โปรไฟล์รายคน
                  </span>
                  <h4 className="text-[18px] font-extrabold text-[#1b2a2f] mt-1">
                    นักเรียน: {inspectingStudent.nickname} · สะสม {inspectingStudent.xp} XP · ตรา{" "}
                    {inspectingStudent.badges.length} ดวง
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingStudent(null)}
                  className="press-secondary px-3 py-1.5 rounded-xl text-[13px] font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="close" size={16} />
                  <span>ปิดข้อมูลรายคน</span>
                </button>
              </div>

              <BlockModelGrid
                cellScores={inspectingStudent.cellScores}
                title={`แผนที่ Block Model รายบุคคลของ "${inspectingStudent.nickname}"`}
                subtitle="คะแนนความเข้าใจรายช่องจากประวัติการตอบคำถาม"
                showLegend={false}
              />
            </div>
          )}
        </div>

        {/* ขั้นตอนที่ 7: ปรับการสอน (เลือกเรื่องให้ทบทวน) */}
        <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-4 no-print">
          <div>
            <span className="text-[13px] font-extrabold text-[#0f766e]">
              ขั้นตอนที่ 7 · ปรับการสอนจากข้อมูลห้องเรียน
            </span>
            <h3 className="text-[18px] font-extrabold text-[#1b2a2f] mt-0.5">
              เลือกเรื่องให้ทบทวนประจำห้อง (จะไปแสดงที่หน้าเส้นทางเควสต์ของนักเรียนในห้องทันที)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5 flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#0b4f49]">
                เลือกเรื่องที่ต้องการให้นักเรียนทบทวน:
              </label>
              <select
                value={reviewTopicId}
                onChange={(e) => setReviewTopicId(Number(e.target.value))}
                className="px-3.5 py-2.5 rounded-xl bg-[#eef3f1] border-2 border-[#b6c9c5] text-[14px] font-extrabold text-[#1b2a2f]"
              >
                {TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-5 flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-[#0b4f49]">
                ข้อความคำแนะนำจากครูถึงนักเรียนในห้อง:
              </label>
              <input
                type="text"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="เช่น ทบทวนเรื่องการส่งค่า return และเงื่อนไขลูป..."
                className="px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#b6c9c5] text-[14px] text-[#1b2a2f]"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleSaveTeachingAdjustment}
                disabled={isSavingReview}
                className="press-teal w-full py-2.5 rounded-xl text-[14px] font-extrabold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingReview ? "กำลังบันทึก..." : "บันทึกการสอน"}
              </button>
            </div>
          </div>

          {savedReviewBanner && (
            <div className="p-3 rounded-xl bg-[#d8efdc] border border-[#86efac] text-[#14532d] text-[14px] font-extrabold flex items-center gap-2">
              <Icon name="check" size={18} />
              <span>
                อัปเดตเรื่องให้ทบทวนไปยังห้อง {currentRoom?.roomName} เรียบร้อยแล้ว!
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
