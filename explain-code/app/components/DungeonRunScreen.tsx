"use client";

import React, { useState } from "react";
import {
  DungeonRunState,
  EncounterSpec,
} from "../lib/dungeon/types";
import {
  CODE_SPELL_PRESETS,
  extractCodeFeatures,
  generateDungeonPlan,
} from "../lib/dungeon/dungeonPlanner";
import { BlockCellId } from "../lib/curriculum";
import { Icon } from "./Icons";
import { dungeonSound } from "../lib/dungeon/sound";

interface DungeonRunScreenProps {
  onBackToPortal: () => void;
  embedded?: boolean;
  onRecordAttempt?: (summary: {
    spellName: string;
    cleared: boolean;
    earnedXp: number;
    integrityLeft: number;
    cellScores: Partial<Record<BlockCellId, number>>;
  }) => void;
}

export function DungeonRunScreen({
  onBackToPortal,
  embedded = false,
  onRecordAttempt,
}: DungeonRunScreenProps) {
  // Setup state for Ingestion
  const [selectedPresetId, setSelectedPresetId] = useState<string>("sum-positive");
  const [customCode, setCustomCode] = useState<string>(CODE_SPELL_PRESETS[0].code);
  const [spellTitle, setSpellTitle] = useState<string>(CODE_SPELL_PRESETS[0].name);

  // Active Run State
  const [runState, setRunState] = useState<DungeonRunState | null>(null);

  // Encounter Interaction State
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [attemptedWrongOptionIds, setAttemptedWrongOptionIds] = useState<string[]>([]);
  const [encounterSolved, setEncounterSolved] = useState<boolean>(false);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState<{
    isCorrect: boolean;
    feedback: string;
    damageTaken: number;
    xpEarned: number;
  } | null>(null);

  // Relic activation states for the current encounter
  const [revealedHint, setRevealedHint] = useState<boolean>(false);
  const [eliminatedOptionId, setEliminatedOptionId] = useState<string | null>(null);
  const [revealedTrace, setRevealedTrace] = useState<boolean>(false);
  const [revealedSimulation, setRevealedSimulation] = useState<boolean>(false);
  const [relicNotice, setRelicNotice] = useState<string | null>(null);

  // Sound State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => dungeonSound.isEnabled());

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    dungeonSound.setEnabled(next);
  };

  // Handle Preset Selection
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = CODE_SPELL_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setCustomCode(preset.code);
      setSpellTitle(preset.name);
    }
  };

  // Launch New Dungeon Run
  const handleStartRun = () => {
    if (!customCode.trim()) return;
    const plan = generateDungeonPlan(
      customCode,
      spellTitle,
      "เข้าใจโค้ดนี้และเตรียมป้องกันบั๊ก",
      selectedPresetId
    );
    setRunState(plan);
    setSelectedOptionId(null);
    setAttemptedWrongOptionIds([]);
    setEncounterSolved(false);
    setLastAnswerFeedback(null);
    setRevealedHint(false);
    setEliminatedOptionId(null);
    setRevealedTrace(false);
    setRevealedSimulation(false);
    setRelicNotice(null);
  };

  // Enter a Room from the Map
  const handleEnterRoom = (roomId: string) => {
    if (!runState) return;
    const room = runState.rooms[roomId];
    if (!room || room.status !== "available") return;

    dungeonSound.playStep();

    setRunState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentRoomId: roomId,
        currentEncounterIndex: 0,
        status: "encounter",
        rooms: {
          ...prev.rooms,
          [roomId]: {
            ...prev.rooms[roomId],
            status: "current",
          },
        },
      };
    });

    setSelectedOptionId(null);
    setAttemptedWrongOptionIds([]);
    setEncounterSolved(false);
    setLastAnswerFeedback(null);
    setRevealedHint(false);
    setEliminatedOptionId(null);
    setRevealedTrace(false);
    setRevealedSimulation(false);
    setRelicNotice(null);
  };

  // Submit Answer in Current Encounter
  const handleSubmitAnswer = (optionIdOverride?: string) => {
    const targetOptionId = optionIdOverride ?? selectedOptionId;
    if (!runState || !runState.currentRoomId || !targetOptionId || encounterSolved) return;

    const currentRoom = runState.rooms[runState.currentRoomId];
    const currentEncounter = currentRoom.encounters[runState.currentEncounterIndex];
    const chosenOption = currentEncounter.options.find((o) => o.id === targetOptionId);

    if (!chosenOption) return;

    const isCorrect = chosenOption.isCorrect;

    if (isCorrect) {
      dungeonSound.playHit();
      const xp = currentEncounter.xpReward;
      setEncounterSolved(true);
      setLastAnswerFeedback({
        isCorrect: true,
        feedback: chosenOption.feedback,
        damageTaken: 0,
        xpEarned: xp,
      });

      const cellId = currentEncounter.blockCell;
      const currentDelta = runState.cellScoresDelta[cellId] || 50;
      const newDelta = Math.min(100, currentDelta + 15);

      setRunState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          answersLog: [
            ...prev.answersLog,
            {
              encounterId: currentEncounter.id,
              roomName: currentRoom.name,
              blockCell: currentEncounter.blockCell,
              conceptId: currentEncounter.conceptId,
              learningPillar: currentEncounter.learningPillar,
              isCorrect: true,
              tries: attemptedWrongOptionIds.length + 1,
              usedHint: revealedHint,
              xpEarned: xp,
              timestamp: new Date().toISOString(),
            },
          ],
          cellScoresDelta: {
            ...prev.cellScoresDelta,
            [cellId]: newDelta,
          },
        };
      });
    } else {
      dungeonSound.playHurt();
      const damage = currentEncounter.damageOnFail;
      const newIntegrity = Math.max(0, runState.integrity - damage);
      const isLethal = newIntegrity <= 0;

      setAttemptedWrongOptionIds((prev) =>
        prev.includes(chosenOption.id) ? prev : [...prev, chosenOption.id]
      );
      setSelectedOptionId(null);
      setLastAnswerFeedback({
        isCorrect: false,
        feedback: chosenOption.feedback,
        damageTaken: damage,
        xpEarned: 0,
      });

      setRunState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          integrity: newIntegrity,
          status: isLethal ? "defeated" : prev.status,
        };
      });
    }
  };

  // Move to next encounter or complete room
  const handleProceedAfterAnswer = () => {
    if (!runState || !runState.currentRoomId) return;

    if (runState.integrity <= 0) {
      dungeonSound.playHurt();
      setRunState((prev) => (prev ? { ...prev, status: "defeated" } : null));
      return;
    }

    const currentRoom = runState.rooms[runState.currentRoomId];
    const isLastEncounterInRoom =
      runState.currentEncounterIndex + 1 >= currentRoom.encounters.length;

    if (!isLastEncounterInRoom) {
      // Advance to next phase in this room (e.g. Boss phases)
      dungeonSound.playHit();
      setRunState((prev) =>
        prev
          ? {
              ...prev,
              currentEncounterIndex: prev.currentEncounterIndex + 1,
            }
          : null
      );
      setSelectedOptionId(null);
      setAttemptedWrongOptionIds([]);
      setEncounterSolved(false);
      setLastAnswerFeedback(null);
      setRevealedHint(false);
      setEliminatedOptionId(null);
      setRevealedTrace(false);
      setRevealedSimulation(false);
      setRelicNotice(null);
      return;
    }

    // Room is fully cleared!
    const isBossRoom = currentRoom.type === "boss";
    if (isBossRoom) {
      dungeonSound.playVictory();
      setRunState((prev) => (prev ? { ...prev, status: "victory" } : null));
      if (onRecordAttempt) {
        onRecordAttempt({
          spellName: runState.spellName,
          cleared: true,
          earnedXp: runState.answersLog.reduce((acc, a) => acc + a.xpEarned, 0),
          integrityLeft: runState.integrity,
          cellScores: runState.cellScoresDelta,
        });
      }
      return;
    }

    // Unlock next rooms and lock sibling rooms on current and earlier floors
    dungeonSound.playDoorOpen();
    const updatedRooms = { ...runState.rooms };
    updatedRooms[currentRoom.id] = {
      ...currentRoom,
      status: "cleared",
    };

    // Lock all rooms on current floor and earlier that were not cleared
    Object.values(updatedRooms).forEach((r) => {
      if (r.floor <= currentRoom.floor && r.status !== "cleared") {
        updatedRooms[r.id] = {
          ...r,
          status: "locked",
        };
      }
    });

    // Make next connected rooms available
    currentRoom.nextRoomIds.forEach((nextId) => {
      if (updatedRooms[nextId] && updatedRooms[nextId].status !== "cleared") {
        updatedRooms[nextId] = {
          ...updatedRooms[nextId],
          status: "available",
        };
      }
    });

    setRunState((prev) =>
      prev
        ? {
            ...prev,
            currentRoomId: null,
            currentEncounterIndex: 0,
            status: "navigating",
            rooms: updatedRooms,
            focus: Math.min(prev.maxFocus, prev.focus + 15), // Recover focus after clearing room
          }
        : null
    );

    setSelectedOptionId(null);
    setAttemptedWrongOptionIds([]);
    setEncounterSolved(false);
    setLastAnswerFeedback(null);
    setRevealedHint(false);
    setEliminatedOptionId(null);
    setRevealedTrace(false);
    setRevealedSimulation(false);
    setRelicNotice(null);
  };

  // Relic: Rubber Duck Oracle
  const handleUseRubberDuck = () => {
    if (!runState || !runState.currentRoomId || encounterSolved) return;
    const relic = runState.activeRelics.find((r) => r.id === "relic-rubber-duck");
    if (!relic || relic.usesLeft <= 0 || runState.focus < relic.focusCost) {
      setRelicNotice("Focus ไม่พอ หรือใช้พลังหมดแล้ว");
      return;
    }

    const currentRoom = runState.rooms[runState.currentRoomId];
    const encounter = currentRoom.encounters[runState.currentEncounterIndex];
    const wrongOptions = encounter.options.filter(
      (o) => !o.isCorrect && o.id !== eliminatedOptionId && !attemptedWrongOptionIds.includes(o.id)
    );

    if (wrongOptions.length > 0) {
      setEliminatedOptionId(wrongOptions[0].id);
    }
    setRevealedHint(true);
    dungeonSound.playCoin();
    setRelicNotice("สารวัตรเป็ดตัดตัวเลือกที่ไม่ใช่ออกให้ 1 ข้อ และเปิดเผยคำใบ้สำคัญ!");

    setRunState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        focus: Math.max(0, prev.focus - relic.focusCost),
        activeRelics: prev.activeRelics.map((r) =>
          r.id === relic.id ? { ...r, usesLeft: r.usesLeft - 1 } : r
        ),
      };
    });
  };

  // Relic: Trace Lens
  const handleUseTraceLens = () => {
    if (!runState || !runState.currentRoomId || encounterSolved) return;
    const relic = runState.activeRelics.find((r) => r.id === "relic-trace-lens");
    if (!relic || relic.usesLeft <= 0 || runState.focus < relic.focusCost) {
      setRelicNotice("Focus ไม่พอ หรือใช้พลังหมดแล้ว");
      return;
    }

    setRevealedTrace(true);
    dungeonSound.playCoin();
    setRelicNotice("แว่นส่องสถานะแรม ส่องเห็นการเปลี่ยนแปลงของตัวแปรในหน่วยความจำแล้ว!");

    setRunState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        focus: Math.max(0, prev.focus - relic.focusCost),
        activeRelics: prev.activeRelics.map((r) =>
          r.id === relic.id ? { ...r, usesLeft: r.usesLeft - 1 } : r
        ),
      };
    });
  };

  // Relic: Test Oracle
  const handleUseTestOracle = () => {
    if (!runState || !runState.currentRoomId || encounterSolved) return;
    const relic = runState.activeRelics.find((r) => r.id === "relic-test-oracle");
    if (!relic || relic.usesLeft <= 0 || runState.focus < relic.focusCost) {
      setRelicNotice("Focus ไม่พอ หรือใช้พลังหมดแล้ว");
      return;
    }

    setRevealedSimulation(true);
    dungeonSound.playCoin();
    setRelicNotice("ผลึกทดสอบเวท รันจำลองโค้ดใน Sandbox และแสดงผลการทำงานจริงแล้ว!");

    setRunState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        focus: Math.max(0, prev.focus - relic.focusCost),
        activeRelics: prev.activeRelics.map((r) =>
          r.id === relic.id ? { ...r, usesLeft: r.usesLeft - 1 } : r
        ),
      };
    });
  };

  // Current Encounter Data
  const currentRoom = runState && runState.currentRoomId ? runState.rooms[runState.currentRoomId] : null;
  const currentEncounter: EncounterSpec | null =
    currentRoom && runState && currentRoom.encounters[runState.currentEncounterIndex]
      ? currentRoom.encounters[runState.currentEncounterIndex]
      : null;

  // Analysis of current code during ingestion
  const codeAnalysis = extractCodeFeatures(customCode);

  return (
    <div
      className={`${
        embedded
          ? "rounded-2xl border-2 border-[#3d395a] overflow-hidden"
          : "min-h-screen"
      } bg-[#0d0b14] text-[#f4efe6] flex flex-col font-sans selection:bg-[#9b5de5] selection:text-white`}
    >
      {/* Top Dungeon HUD */}
      <header
        className={`border-b border-[#2f2d45] bg-[#141220]/95 backdrop-blur ${
          embedded ? "" : "sticky top-0"
        } z-30 px-4 py-3`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="ExplainCode Logo"
              className="w-9 h-9 rounded-xl object-contain bg-[#0d0b14] border border-[#f6c945]/60 shadow-lg shrink-0"
            />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#f6c945] block">
                ดันเจี้ยนการเรียนรู้ · Custom Code
              </span>
              <h1 className="text-sm sm:text-base font-bold text-[#f4efe6] leading-tight">
                สร้างดันเจี้ยนจากโค้ดของคุณ
              </h1>
            </div>
          </div>

          {runState && (
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {/* Program Integrity (HP) */}
              <div className="w-36 sm:w-48">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#ff6b81]">Program Integrity</span>
                  <span className="font-mono text-[#f4efe6]">{runState.integrity}%</span>
                </div>
                <div className="w-full h-2.5 bg-[#1c1b2b] rounded-full overflow-hidden border border-[#2f2d45]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      runState.integrity > 60
                        ? "bg-gradient-to-r from-[#2fbf71] to-[#34d37d]"
                        : runState.integrity > 30
                        ? "bg-gradient-to-r from-[#f6c945] to-[#ffb347]"
                        : "bg-gradient-to-r from-[#c0283a] to-[#ff4d6d] animate-pulse"
                    }`}
                    style={{ width: `${runState.integrity}%` }}
                  />
                </div>
              </div>

              {/* Focus Mana */}
              <div className="w-32 sm:w-44">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#9b5de5]">Focus Mana</span>
                  <span className="font-mono text-[#f4efe6]">{runState.focus}%</span>
                </div>
                <div className="w-full h-2.5 bg-[#1c1b2b] rounded-full overflow-hidden border border-[#2f2d45]">
                  <div
                    className="h-full bg-gradient-to-r from-[#5a2d91] to-[#9b5de5] transition-all duration-300"
                    style={{ width: `${runState.focus}%` }}
                  />
                </div>
              </div>

              {/* Spell Badge */}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-[10px] uppercase text-[#9a93ad]">มนตร์ประจำรอบ</span>
                <span className="text-xs font-semibold text-[#ffe27a] max-w-[180px] truncate">
                  {runState.spellName}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              className="px-2.5 py-1.5 rounded-lg border border-[#3d395a] bg-[#1c1b2b] hover:border-[#f6c945] hover:bg-[#252238] text-xs text-[#f4efe6] transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="เปิด/ปิดเสียงเอฟเฟกต์ 8-bit"
            >
              <Icon name={soundEnabled ? "volume-2" : "volume-x"} size={14} />
              <span className="hidden sm:inline">{soundEnabled ? "เสียงเปิด" : "ปิดเสียง"}</span>
            </button>
            {runState && (
              <button
                type="button"
                onClick={() => setRunState(null)}
                className="px-3 py-1.5 rounded-lg border border-[#3d395a] bg-[#1c1b2b] hover:border-[#f6c945] hover:bg-[#252238] text-xs text-[#f4efe6] transition cursor-pointer whitespace-nowrap"
              >
                เลือกมนตร์ใหม่
              </button>
            )}
            <button
              type="button"
              onClick={onBackToPortal}
              className="px-3 py-1.5 rounded-lg bg-[#1c1b2b] hover:bg-[#252238] hover:border-[#f6c945] text-xs font-semibold text-[#f4efe6] transition border border-[#3d395a] cursor-pointer whitespace-nowrap"
            >
              {embedded ? "กลับแผนที่" : "กลับหน้าหลัก"}
            </button>
          </div>
        </div>
      </header>

      {/* VIEW 1: CODE INGESTION SCREEN */}
      {!runState && (
        <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 flex flex-col justify-center">
          <div className="text-center max-w-xl mx-auto mb-5">
            <p className="text-xs sm:text-sm text-[#c4bdd6]">
              เลือกตัวอย่างหรือวางโค้ดจาก AI เพื่อสร้างดันเจี้ยน 5 ชั้นพร้อมบอส
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Code Spell Presets & Custom Paste */}
            <div className="lg:col-span-7 bg-[#141220] border border-[#2f2d45] rounded-2xl p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-sm font-bold text-[#f4efe6]">
                  เลือกมนตร์ต้นแบบ หรือวางโค้ดของคุณเอง
                </h3>
                <span className="text-xs text-[#9a93ad]">JavaScript / Pure Logic</span>
              </div>

              {/* Presets List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-4">
                {CODE_SPELL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-xl text-left border transition text-xs flex flex-col justify-between h-24 cursor-pointer ${
                      selectedPresetId === preset.id
                        ? "bg-[#5a2d91]/35 border-[#9b5de5] text-[#f4efe6] shadow-md"
                        : "bg-[#1c1b2b] border-[#2f2d45] hover:border-[#3d395a] hover:bg-[#252238] text-[#c4bdd6]"
                    }`}
                  >
                    <div>
                      <div className="font-bold truncate text-[#f4efe6]">{preset.name}</div>
                      <div className="text-[10px] text-[#9a93ad] mt-1 truncate">
                        {preset.category}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#2f2d45] bg-[#141220] text-[#c4bdd6]">
                        {preset.difficulty}
                      </span>
                      {selectedPresetId === preset.id && (
                        <span className="text-[10px] text-[#f6c945] font-bold">เลือกอยู่</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Code Editor Area */}
              <div className="relative">
                <div className="flex items-center justify-between bg-[#120f1c] px-4 py-2 rounded-t-xl border border-b-0 border-[#2f2d45] text-xs text-[#9a93ad] font-mono">
                  <span>code_seed.js</span>
                  <span>{customCode.split("\n").length} lines</span>
                </div>
                <textarea
                  value={customCode}
                  onChange={(e) => {
                    setCustomCode(e.target.value);
                    setSelectedPresetId("custom");
                    setSpellTitle("มนตร์แต่งเอง (Custom Spell)");
                  }}
                  rows={9}
                  className="w-full bg-[#120f1c] border border-[#2f2d45] rounded-b-xl p-4 font-mono text-xs text-[#86efac] leading-relaxed focus:outline-none focus:border-[#f6c945] transition resize-none"
                  placeholder="วางโค้ด JavaScript ที่นี่..."
                />
              </div>
            </div>

            {/* Right: Instant AST & Knowledge Insights */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-[#141220] border border-[#2f2d45] rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-[#f4efe6] mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2fbf71] animate-ping" />
                  การวิเคราะห์โครงสร้างมนตร์อัตโนมัติ (AST Inspection)
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="bg-[#1c1b2b] p-3 rounded-xl border border-[#2f2d45]">
                    <span className="text-[#9a93ad] block mb-1">ตัวแปรที่ตรวจพบ:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {codeAnalysis.variableNames.length > 0 ? (
                        codeAnalysis.variableNames.map((v) => (
                          <span
                            key={v}
                            className="bg-[#5a2d91]/30 text-[#ffe27a] border border-[#9b5de5]/40 px-2 py-0.5 rounded font-mono"
                          >
                            {v}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#9a93ad] italic">ไม่พบตัวแปร</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#1c1b2b] p-3 rounded-xl border border-[#2f2d45]">
                    <span className="text-[#9a93ad] block mb-1">แกนความคิดหลัก (Core Concepts):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {codeAnalysis.hasLoop && (
                        <span className="bg-[#281d08] text-[#ffe27a] border border-[#f6c945]/40 px-2 py-0.5 rounded">
                          ลูปและการวนซ้ำ
                        </span>
                      )}
                      {codeAnalysis.hasAccumulator && (
                        <span className="bg-[#102a1e] text-[#86efac] border border-[#2fbf71]/40 px-2 py-0.5 rounded">
                          รูปแบบสะสมค่า (Accumulator)
                        </span>
                      )}
                      {codeAnalysis.hasIf && (
                        <span className="bg-[#5a2d91]/30 text-[#c084fc] border border-[#9b5de5]/40 px-2 py-0.5 rounded">
                          เงื่อนไขและการแตกกิ่ง
                        </span>
                      )}
                      {codeAnalysis.hasArray && (
                        <span className="bg-[#102a1e] text-[#86efac] border border-[#2fbf71]/40 px-2 py-0.5 rounded">
                          การเข้าถึงแอเรย์
                        </span>
                      )}
                    </div>
                  </div>

                  {codeAnalysis.risks.length > 0 && (
                    <div className="bg-[#2d141c] p-3 rounded-xl border border-[#c0283a]/50 text-[#fca5a5]">
                      <span className="font-bold block mb-1">จุดเสี่ยงที่จะถูกทดสอบในดันเจี้ยน:</span>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-[#fca5a5]/90">
                        {codeAnalysis.risks.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Start Run Action Button */}
              <button
                type="button"
                onClick={handleStartRun}
                disabled={!customCode.trim()}
                className={`w-full py-4 rounded-2xl font-extrabold text-base shadow-xl transition transform ${
                  customCode.trim()
                    ? "bg-[#2fbf71] hover:bg-[#34d37d] text-[#0b0b14] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                    : "bg-[#1c1b2b] text-[#9a93ad] cursor-not-allowed border border-[#2f2d45]"
                }`}
              >
                เริ่มลุยดันเจี้ยนจากโค้ดของคุณ →
              </button>
            </div>
          </div>
        </main>
      )}

      {/* VIEW 2: 2D ROGUELITE NODE MAP */}
      {runState && runState.status === "navigating" && (
        <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase text-[#f6c945]">
                Floor Map Navigation
              </span>
              <h2 className="text-2xl font-black text-[#f4efe6] mt-0.5">
                เลือกเส้นทางเผชิญหน้าบนแผนที่ดันเจี้ยน
              </h2>
              <p className="text-xs text-[#9a93ad] mt-1">
                คลิกที่ห้องที่มีสถานะ &ldquo;เข้าได้&rdquo; เพื่อเริ่มการท้าทาย
              </p>
            </div>

            <div className="bg-[#141220] border border-[#2f2d45] px-4 py-2.5 rounded-xl flex items-center gap-4 text-xs">
              <div>
                <span className="text-[#9a93ad] block text-[10px]">ความคืบหน้า</span>
                <span className="font-bold text-[#2fbf71]">
                  {Math.min(
                    5,
                    new Set(
                      Object.values(runState.rooms)
                        .filter((r) => r.status === "cleared")
                        .map((r) => r.floor)
                    ).size
                  )}{" "}
                  / 5 ชั้น
                </span>
              </div>
              <div className="w-px h-6 bg-[#2f2d45]" />
              <div>
                <span className="text-[#9a93ad] block text-[10px]">XP สะสมรอบนี้</span>
                <span className="font-bold text-[#f6c945]">
                  {runState.answersLog.reduce((acc, a) => acc + a.xpEarned, 0)} XP
                </span>
              </div>
            </div>
          </div>

          {/* 5-Floor Connected Visual Node Map */}
          <div className="bg-[#141220] border border-[#2f2d45] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-8 relative overflow-hidden">
            {/* Background cyber grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#2f2d4522_1px,transparent_1px),linear-gradient(to_bottom,#2f2d4522_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />

            {runState.mapFloors.map((floorRoomIds, floorIdx) => {
              const floorLabels = [
                "ชั้นที่ 1 · ประตูเบิกเนตร (Predict)",
                "ชั้นที่ 2 · ทางแยกความเข้าใจ (Trace & Concept)",
                "ชั้นที่ 3 · การทดสอบขอบเขต (Boundary & Transfer)",
                "ชั้นที่ 4 · เตาหลอมมนตร์ (Refactor)",
                "ชั้นที่ 5 · แกนกลางดันเจี้ยน (The Core Boss)",
              ];

              return (
                <div key={floorIdx} className="relative z-10">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#9a93ad] mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f6c945]" />
                    {floorLabels[floorIdx] || `ชั้นที่ ${floorIdx + 1}`}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
                    {floorRoomIds.map((roomId) => {
                      const room = runState.rooms[roomId];
                      const isAvailable = room.status === "available";
                      const isCleared = room.status === "cleared";
                      const isCurrent = room.status === "current";

                      return (
                        <button
                          key={room.id}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleEnterRoom(room.id)}
                          className={`group relative flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 w-full sm:w-auto sm:min-w-[260px] max-w-sm ${
                            isCleared
                              ? "bg-[#102a1e]/60 border-[#2fbf71]/50 opacity-85"
                              : isAvailable
                              ? "bg-gradient-to-r from-[#1c1b2b] to-[#252238] border-[#9b5de5] shadow-lg hover:scale-[1.02] cursor-pointer"
                              : isCurrent
                              ? "bg-[#5a2d91]/30 border-[#f6c945] ring-2 ring-[#f6c945]/40"
                              : "bg-[#120f1c] border-[#2f2d45] opacity-45 cursor-not-allowed"
                          }`}
                        >
                          {/* Room Type Icon Pill */}
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCleared
                                ? "bg-[#2fbf71]/20 text-[#2fbf71] border border-[#2fbf71]/40"
                                : isAvailable
                                ? "bg-[#9b5de5] text-[#f4efe6] shadow-md"
                                : "bg-[#1c1b2b] text-[#9a93ad]"
                            }`}
                          >
                            {room.type === "combat" && <Icon name="sword" size={18} />}
                            {room.type === "shrine" && <Icon name="sparkles" size={18} />}
                            {room.type === "trap" && <Icon name="alert" size={18} />}
                            {room.type === "transfer" && <Icon name="route" size={18} />}
                            {room.type === "forge" && <Icon name="code" size={18} />}
                            {room.type === "boss" && <Icon name="award" size={18} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-[#f4efe6] truncate">
                                {room.name}
                              </span>
                              {isCleared && (
                                <span className="text-[10px] text-[#2fbf71] font-bold shrink-0 flex items-center gap-1">
                                  <Icon name="check" size={12} />
                                  <span>ผ่านแล้ว</span>
                                </span>
                              )}
                              {isAvailable && (
                                <span className="text-[10px] bg-[#9b5de5] text-[#f4efe6] px-1.5 py-0.5 rounded font-bold shrink-0 animate-pulse">
                                  เข้าได้
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#9a93ad] truncate mt-0.5">
                              {room.monsterName}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* VIEW 3: ENCOUNTER / COMBAT SCREEN */}
      {runState && runState.status === "encounter" && currentRoom && currentEncounter && (
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col gap-5">
          {/* Room & Monster Header Banner */}
          <div className="bg-[#141220] border border-[#2f2d45] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#f6c945] uppercase tracking-wider">
                  {currentRoom.name}
                </span>
                <span className="text-[10px] text-[#9a93ad]">·</span>
                <span className="text-xs text-[#c4bdd6]">
                  เฟสที่ {runState.currentEncounterIndex + 1} จาก {currentRoom.encounters.length}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#f4efe6] mt-1">
                {currentEncounter.monsterName}
              </h2>
              <p className="text-xs text-[#9a93ad] mt-0.5">{currentEncounter.subtitle}</p>
            </div>

            {/* Relic Focus Bar & Quick Action */}
            <div className="flex flex-wrap items-center gap-2">
              {runState.activeRelics.map((relic) => {
                const canUse = runState.focus >= relic.focusCost && relic.usesLeft > 0 && !encounterSolved;
                return (
                  <button
                    key={relic.id}
                    type="button"
                    disabled={!canUse}
                    onClick={() => {
                      if (relic.id === "relic-rubber-duck") handleUseRubberDuck();
                      if (relic.id === "relic-trace-lens") handleUseTraceLens();
                      if (relic.id === "relic-test-oracle") handleUseTestOracle();
                    }}
                    title={`${relic.name} (ใช้ ${relic.focusCost} Focus) — ${relic.description}`}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition whitespace-nowrap ${
                      canUse
                        ? "bg-[#1c1b2b] hover:bg-[#252238] border-[#3d395a] text-[#ffe27a] hover:border-[#f6c945] shadow-sm cursor-pointer"
                        : "bg-[#120f1c] border-[#2f2d45] text-[#9a93ad]/50 cursor-not-allowed"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {relic.id === "relic-rubber-duck" ? (
                        <Icon name="bulb" size={14} className="text-[#f6c945]" />
                      ) : relic.id === "relic-trace-lens" ? (
                        <Icon name="eye" size={14} className="text-[#9b5de5]" />
                      ) : (
                        <Icon name="play" size={14} className="text-[#2fbf71]" />
                      )}
                      <span>{relic.name}</span>
                    </span>
                    <span className="text-[10px] bg-[#141220] border border-[#2f2d45] px-1.5 py-0.5 rounded text-[#c4bdd6] font-mono">
                      {relic.usesLeft} ครั้ง ({relic.focusCost} MP)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Relic Notice Banner */}
          {relicNotice && (
            <div className="bg-[#252238] border border-[#9b5de5]/50 text-[#ffe27a] text-xs px-4 py-2.5 rounded-xl flex items-center justify-between">
              <span>{relicNotice}</span>
              <button
                type="button"
                onClick={() => setRelicNotice(null)}
                className="text-[#f4efe6] hover:text-[#f6c945] font-bold ml-2 p-1 cursor-pointer"
                title="ปิดการแจ้งเตือน"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          )}

          {/* Two-Column Arena: Code on Left, Challenge on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
            {/* Left: Code Snippet & Memory State */}
            <div className="lg:col-span-6 bg-[#141220] border border-[#2f2d45] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9a93ad] mb-3">
                <span className="font-mono text-[#f6c945] font-bold">คัมภีร์เวทมนตร์ (Code View)</span>
              </div>

              {/* Code Box */}
              <div className="bg-[#120f1c] rounded-xl p-4 border border-[#2f2d45] font-mono text-xs leading-relaxed overflow-x-auto text-[#f4efe6]">
                <pre>
                  <code>
                    {currentEncounter.codeSnippet.split("\n").map((line, idx) => {
                      const lineNum = idx + 1;
                      const isActive = currentEncounter.activeLine === lineNum;
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-3 py-0.5 px-2 rounded ${
                            isActive
                              ? "bg-[#5a2d91]/40 text-[#ffe27a] border-l-2 border-[#f6c945] font-bold"
                              : "hover:bg-[#1c1b2b]"
                          }`}
                        >
                          <span className="text-[#9a93ad]/60 select-none w-5 text-right shrink-0">
                            {lineNum}
                          </span>
                          <span className="flex-1">{line}</span>
                        </div>
                      );
                    })}
                  </code>
                </pre>
              </div>

              {/* Trace Lens Exposed Variable State */}
              {(revealedTrace || currentEncounter.variableTrace) && (
                <div className="mt-4 bg-[#1c1b2b] border border-[#9b5de5]/40 rounded-xl p-3.5">
                  <span className="text-xs font-bold text-[#c084fc] flex items-center gap-1.5 mb-2">
                    <Icon name="eye" size={14} className="text-[#9b5de5]" />
                    <span>ค่าตัวแปรใน RAM (Variable State Inspection)</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {Object.entries(
                      currentEncounter.variableTrace || {
                        total: "0 -> 3",
                        i: "0",
                        status: "กำลังวนรอบแรก",
                      }
                    ).map(([k, v]) => (
                      <div
                        key={k}
                        className="bg-[#120f1c] p-2 rounded border border-[#2f2d45] flex justify-between"
                      >
                        <span className="text-[#9a93ad]">{k}:</span>
                        <span className="text-[#ffe27a] font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hint Callout */}
              {revealedHint && (
                <div className="mt-4 bg-[#281d08] border border-[#f6c945]/40 rounded-xl p-3.5 text-xs text-[#ffe27a]">
                  <span className="font-bold flex items-center gap-1.5 mb-1 text-[#f6c945]">
                    <Icon name="bulb" size={14} className="text-[#f6c945]" />
                    <span>คำใบ้จากสารวัตรเป็ด:</span>
                  </span>
                  <p>{currentEncounter.hint}</p>
                </div>
              )}

              {/* Test Oracle Simulation Output */}
              {revealedSimulation && currentEncounter.testSimulation && (
                <div className="mt-4 bg-[#102a1e] border border-[#2fbf71]/40 rounded-xl p-3.5 text-xs text-[#86efac]">
                  <span className="font-bold flex items-center gap-1.5 mb-1 text-[#2fbf71]">
                    <Icon name="play" size={14} className="text-[#2fbf71]" />
                    <span>ผลึกทดสอบเวท (Sandbox Simulation Result):</span>
                  </span>
                  <p className="font-mono bg-[#120f1c] p-2 rounded border border-[#2f2d45] text-[#86efac]">
                    {currentEncounter.testSimulation}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Challenge Prompt & Options */}
            <div className="lg:col-span-6 bg-[#141220] border border-[#2f2d45] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#9a93ad] mb-2">
                  <span className="px-2 py-0.5 rounded border border-[#3d395a] bg-[#1c1b2b] text-[#c084fc]">
                    ภารกิจ: {currentEncounter.title}
                  </span>
                  <span>·</span>
                  <span className="text-[#f6c945]">รางวัล: +{currentEncounter.xpReward} XP</span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#f4efe6] mb-4 leading-snug">
                  {currentEncounter.prompt}
                </h3>

                {/* Multiple Choice Options */}
                <div className="space-y-2.5">
                  {currentEncounter.options.map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    const isEliminated = eliminatedOptionId === opt.id;
                    const isAttemptedWrong = attemptedWrongOptionIds.includes(opt.id);

                    let optionStyle =
                      "bg-[#1c1b2b] border-[#2f2d45] hover:border-[#9b5de5] hover:bg-[#252238] text-[#f4efe6] cursor-pointer";

                    if (isSelected && !encounterSolved) {
                      optionStyle = "bg-[#5a2d91]/35 hover:bg-[#5a2d91]/55 border-[#9b5de5] text-[#ffe27a] ring-1 ring-[#9b5de5] cursor-pointer";
                    }

                    if (encounterSolved) {
                      if (opt.isCorrect) {
                        optionStyle =
                          "bg-[#102a1e] border-[#2fbf71] text-[#86efac] font-semibold";
                      } else {
                        optionStyle = "bg-[#120f1c] border-[#2f2d45] opacity-40 cursor-not-allowed";
                      }
                    } else if (isAttemptedWrong) {
                      optionStyle = "bg-[#2d141c] border-[#c0283a]/60 text-[#fca5a5] opacity-70 line-through cursor-not-allowed";
                    } else if (isEliminated) {
                      optionStyle =
                        "bg-[#120f1c] border-[#2f2d45] text-[#9a93ad] line-through opacity-50 cursor-not-allowed";
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={encounterSolved || isEliminated || isAttemptedWrong}
                        onClick={() => {
                          if (encounterSolved || isEliminated || isAttemptedWrong) return;
                          if (selectedOptionId === opt.id) {
                            handleSubmitAnswer(opt.id);
                            return;
                          }
                          setSelectedOptionId(opt.id);
                        }}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs transition leading-relaxed flex items-start gap-3 ${optionStyle}`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px] mt-0.5 ${
                            isSelected
                              ? "border-[#9b5de5] bg-[#9b5de5] text-[#f4efe6]"
                              : isAttemptedWrong
                              ? "border-[#c0283a] bg-[#2d141c] text-[#fca5a5]"
                              : "border-[#3d395a] text-[#9a93ad]"
                          }`}
                        >
                          {opt.id.replace("opt-", "")}
                        </div>
                        <div className="flex-1">
                          <span>{opt.label}</span>
                          {isAttemptedWrong && !encounterSolved && (
                            <span className="block text-[11px] text-[#fca5a5] mt-1 font-sans">
                              (เลือกผิดแล้ว: {opt.feedback})
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Result & Action Button */}
              <div className="mt-6 pt-4 border-t border-[#2f2d45]">
                {lastAnswerFeedback && (
                  <div
                    className={`p-4 rounded-xl border text-xs leading-relaxed mb-4 ${
                      lastAnswerFeedback.isCorrect
                        ? "bg-[#102a1e] border-[#2fbf71]/60 text-[#86efac]"
                        : "bg-[#2d141c] border-[#c0283a]/60 text-[#fca5a5]"
                    }`}
                  >
                    <div className="font-bold text-sm mb-1 flex items-center gap-2">
                      {lastAnswerFeedback.isCorrect ? (
                        <>
                          <Icon name="check" size={16} className="text-[#2fbf71]" />
                          <span>โจมตีสำเร็จ! การคำนวณถูกต้อง (Critical Hit)</span>
                        </>
                      ) : (
                        <>
                          <Icon name="alert" size={16} className="text-[#ff6b81]" />
                          <span>โดนโจมตีสวนกลับ! คำนวณผิดพลาด (-{lastAnswerFeedback.damageTaken}% Integrity)</span>
                        </>
                      )}
                    </div>
                    <p>{lastAnswerFeedback.feedback}</p>
                  </div>
                )}

                {runState.integrity <= 0 ? (
                  <button
                    type="button"
                    onClick={handleProceedAfterAnswer}
                    className="w-full py-3.5 rounded-xl bg-[#c0283a] hover:bg-[#dc3548] text-white font-bold text-sm shadow-lg transition cursor-pointer"
                  >
                    ดูผลการท้าทาย (Integrity หมดลง) -&gt;
                  </button>
                ) : encounterSolved ? (
                  <button
                    type="button"
                    onClick={handleProceedAfterAnswer}
                    className="w-full py-3.5 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#0b0b14] font-extrabold text-sm shadow-lg transition cursor-pointer"
                  >
                    {runState.currentEncounterIndex + 1 < currentRoom.encounters.length
                      ? "เข้าสู่เฟสถัดไป ->"
                      : currentRoom.type === "boss"
                      ? "ดูบทสรุปชัยชนะ ->"
                      : "กลับสู่แผนที่ดันเจี้ยน ->"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!selectedOptionId}
                    onClick={() => handleSubmitAnswer()}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition ${
                      selectedOptionId
                        ? "bg-[#9b5de5] hover:bg-[#b07af0] text-[#f4efe6] cursor-pointer"
                        : "bg-[#1c1b2b] text-[#9a93ad] cursor-not-allowed border border-[#2f2d45]"
                    }`}
                  >
                    ร่ายมนตร์ / ส่งคำตอบ
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* VIEW 4: VICTORY & DEFEAT SCREENS */}
      {runState && (runState.status === "victory" || runState.status === "defeated") && (
        <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 flex flex-col justify-center">
          <div className="bg-[#141220] border border-[#2f2d45] rounded-3xl p-6 sm:p-10 shadow-2xl text-center">
            {runState.status === "victory" ? (
              <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f6c945] to-[#b8860b] mx-auto flex items-center justify-center text-[#0b0b14] shadow-xl mb-4 animate-bounce">
                  <Icon name="trophy" size={36} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#f6c945]">
                  Dungeon Cleared
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f4efe6] mt-1 mb-2">
                  คุณพิชิตเดอะ คอร์ สำเร็จ!
                </h2>
                <p className="text-sm text-[#9a93ad] max-w-xl mx-auto mb-6">
                  คุณได้พิสูจน์แล้วว่าคุณไม่ได้แค่รันโค้ดตาม AI แต่เข้าใจโครงสร้าง การทำงาน
                  การจัดการกรณีขอบเขต และสามารถซ่อมแซมโค้ดได้จริง
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#c0283a] to-[#7f1d1d] mx-auto flex items-center justify-center text-white shadow-xl mb-4">
                  <Icon name="alert" size={36} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#ff6b81]">
                  Program Integrity Depleted
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f4efe6] mt-1 mb-2">
                  มนตร์เกิดข้อผิดพลาดรุนแรง
                </h2>
                <p className="text-sm text-[#9a93ad] max-w-xl mx-auto mb-6">
                  ความสมบูรณ์ของโปรแกรมหมดลงก่อนถึงแกนกลาง แต่การพ่ายแพ้ทำให้เห็นจุดที่ยังเข้าใจคลาดเคลื่อน
                  สามารถทบทวนแนวคิดและกลับมาท้าทายใหม่ได้ทันที
                </p>
              </>
            )}

            {/* Assessment Evidence vs Game Score Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
              <div className="bg-[#1c1b2b] p-4 rounded-2xl border border-[#2f2d45]">
                <span className="text-xs text-[#9a93ad] block mb-1">XP ที่ได้รับรอบนี้</span>
                <span className="text-2xl font-black text-[#f6c945] font-mono">
                  +{runState.answersLog.reduce((acc, a) => acc + a.xpEarned, 0)} XP
                </span>
              </div>
              <div className="bg-[#1c1b2b] p-4 rounded-2xl border border-[#2f2d45]">
                <span className="text-xs text-[#9a93ad] block mb-1">Program Integrity คงเหลือ</span>
                <span className="text-2xl font-black text-[#2fbf71] font-mono">
                  {runState.integrity}%
                </span>
              </div>
              <div className="bg-[#1c1b2b] p-4 rounded-2xl border border-[#2f2d45]">
                <span className="text-xs text-[#9a93ad] block mb-1">อัตราตอบถูกรอบแรก</span>
                <span className="text-2xl font-black text-[#c084fc] font-mono">
                  {Math.round(
                    (runState.answersLog.filter((a) => a.isCorrect).length /
                      Math.max(1, runState.answersLog.length)) *
                      100
                  )}
                  %
                </span>
              </div>
            </div>

            {/* 4 Pillars Mastery Summary */}
            <div className="bg-[#1c1b2b] rounded-2xl p-5 border border-[#2f2d45] mb-8 text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#c4bdd6] mb-3">
                หลักฐานความเข้าใจ 4 มิติ (Learning Mastery Evidence)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {(["predict", "explain", "debug", "transfer"] as const).map((pillar) => {
                  const relevant = runState.answersLog.filter((a) => a.learningPillar === pillar);
                  const correct = relevant.filter((a) => a.isCorrect).length;
                  const percent = relevant.length > 0 ? Math.round((correct / relevant.length) * 100) : 100;
                  return (
                    <div key={pillar} className="bg-[#141220] p-3 rounded-xl border border-[#2f2d45]">
                      <span className="text-[#9a93ad] capitalize block mb-1">{pillar}</span>
                      <div className="flex items-baseline justify-between">
                        <span className="font-bold text-[#f4efe6] text-base font-mono">{percent}%</span>
                        <span className="text-[10px] text-[#9a93ad]">
                          {correct}/{relevant.length} ข้อ
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleStartRun}
                className="px-6 py-3 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#0b0b14] font-extrabold text-sm shadow-lg transition cursor-pointer whitespace-nowrap"
              >
                เล่นรอบใหม่ด้วยมนตร์นี้อีกครั้ง
              </button>
              <button
                type="button"
                onClick={() => setRunState(null)}
                className="px-6 py-3 rounded-xl bg-[#1c1b2b] hover:bg-[#252238] hover:border-[#f6c945] text-[#f4efe6] font-semibold text-sm border border-[#3d395a] transition cursor-pointer whitespace-nowrap"
              >
                เลือกหรือนำเข้ามนตร์บทอื่น
              </button>
              <button
                type="button"
                onClick={onBackToPortal}
                className="px-6 py-3 rounded-xl bg-[#1c1b2b] hover:bg-[#252238] hover:border-[#f6c945] text-[#c4bdd6] font-semibold text-sm border border-[#3d395a] transition cursor-pointer whitespace-nowrap"
              >
                {embedded ? "กลับแผนที่ดันเจี้ยน" : "กลับหน้าหลัก"}
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
