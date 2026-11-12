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

interface DungeonRunScreenProps {
  onBackToPortal: () => void;
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
  const [answerSubmitted, setAnswerSubmitted] = useState<boolean>(false);
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
  const [relicNotice, setRelicNotice] = useState<string | null>(null);

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
    const plan = generateDungeonPlan(customCode, spellTitle);
    setRunState(plan);
    setSelectedOptionId(null);
    setAnswerSubmitted(false);
    setLastAnswerFeedback(null);
    setRevealedHint(false);
    setEliminatedOptionId(null);
    setRevealedTrace(false);
  };

  // Enter a Room from the Map
  const handleEnterRoom = (roomId: string) => {
    if (!runState) return;
    const room = runState.rooms[roomId];
    if (!room || room.status !== "available") return;

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
    setAnswerSubmitted(false);
    setLastAnswerFeedback(null);
    setRevealedHint(false);
    setEliminatedOptionId(null);
    setRevealedTrace(false);
    setRelicNotice(null);
  };

  // Submit Answer in Current Encounter
  const handleSubmitAnswer = () => {
    if (!runState || !runState.currentRoomId || !selectedOptionId || answerSubmitted) return;

    const currentRoom = runState.rooms[runState.currentRoomId];
    const currentEncounter = currentRoom.encounters[runState.currentEncounterIndex];
    const chosenOption = currentEncounter.options.find((o) => o.id === selectedOptionId);

    if (!chosenOption) return;

    const isCorrect = chosenOption.isCorrect;
    const damage = isCorrect ? 0 : currentEncounter.damageOnFail;
    const xp = isCorrect ? currentEncounter.xpReward : 5;

    const newIntegrity = Math.max(0, runState.integrity - damage);
    const newStatus = newIntegrity <= 0 ? "defeated" : runState.status;

    setAnswerSubmitted(true);
    setLastAnswerFeedback({
      isCorrect,
      feedback: chosenOption.feedback,
      damageTaken: damage,
      xpEarned: xp,
    });

    // Update cell score delta
    const cellId = currentEncounter.blockCell;
    const currentDelta = runState.cellScoresDelta[cellId] || 50;
    const newDelta = isCorrect ? Math.min(100, currentDelta + 15) : Math.max(0, currentDelta - 10);

    setRunState((prev) => {
      if (!prev) return null;
      const updatedLog = [
        ...prev.answersLog,
        {
          encounterId: currentEncounter.id,
          roomName: currentRoom.name,
          blockCell: currentEncounter.blockCell,
          conceptId: currentEncounter.conceptId,
          learningPillar: currentEncounter.learningPillar,
          isCorrect,
          tries: 1,
          usedHint: revealedHint,
          xpEarned: xp,
          timestamp: new Date().toISOString(),
        },
      ];

      return {
        ...prev,
        integrity: newIntegrity,
        status: newStatus,
        answersLog: updatedLog,
        cellScoresDelta: {
          ...prev.cellScoresDelta,
          [cellId]: newDelta,
        },
      };
    });
  };

  // Move to next encounter or complete room
  const handleProceedAfterAnswer = () => {
    if (!runState || !runState.currentRoomId) return;

    if (runState.integrity <= 0) {
      setRunState((prev) => (prev ? { ...prev, status: "defeated" } : null));
      return;
    }

    const currentRoom = runState.rooms[runState.currentRoomId];
    const isLastEncounterInRoom =
      runState.currentEncounterIndex + 1 >= currentRoom.encounters.length;

    if (!isLastEncounterInRoom) {
      // Advance to next phase in this room (e.g. Boss phases)
      setRunState((prev) =>
        prev
          ? {
              ...prev,
              currentEncounterIndex: prev.currentEncounterIndex + 1,
            }
          : null
      );
      setSelectedOptionId(null);
      setAnswerSubmitted(false);
      setLastAnswerFeedback(null);
      setRevealedHint(false);
      setEliminatedOptionId(null);
      setRevealedTrace(false);
      setRelicNotice(null);
      return;
    }

    // Room is fully cleared!
    const isBossRoom = currentRoom.type === "boss";
    if (isBossRoom) {
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

    // Unlock next rooms
    const updatedRooms = { ...runState.rooms };
    updatedRooms[currentRoom.id] = {
      ...currentRoom,
      status: "cleared",
    };

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
    setAnswerSubmitted(false);
    setLastAnswerFeedback(null);
    setRevealedHint(false);
    setEliminatedOptionId(null);
    setRevealedTrace(false);
    setRelicNotice(null);
  };

  // Relic: Rubber Duck Oracle
  const handleUseRubberDuck = () => {
    if (!runState || !runState.currentRoomId) return;
    const relic = runState.activeRelics.find((r) => r.id === "relic-rubber-duck");
    if (!relic || relic.usesLeft <= 0 || runState.focus < relic.focusCost) {
      setRelicNotice("Focus ไม่พอ หรือใช้พลังหมดแล้ว");
      return;
    }

    const currentRoom = runState.rooms[runState.currentRoomId];
    const encounter = currentRoom.encounters[runState.currentEncounterIndex];
    const wrongOptions = encounter.options.filter((o) => !o.isCorrect);

    if (wrongOptions.length > 0) {
      setEliminatedOptionId(wrongOptions[0].id);
    }
    setRevealedHint(true);
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
    if (!runState || !runState.currentRoomId) return;
    const relic = runState.activeRelics.find((r) => r.id === "relic-trace-lens");
    if (!relic || relic.usesLeft <= 0 || runState.focus < relic.focusCost) {
      setRelicNotice("Focus ไม่พอ หรือใช้พลังหมดแล้ว");
      return;
    }

    setRevealedTrace(true);
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

  // Current Encounter Data
  const currentRoom = runState && runState.currentRoomId ? runState.rooms[runState.currentRoomId] : null;
  const currentEncounter: EncounterSpec | null =
    currentRoom && runState && currentRoom.encounters[runState.currentEncounterIndex]
      ? currentRoom.encounters[runState.currentEncounterIndex]
      : null;

  // Analysis of current code during ingestion
  const codeAnalysis = extractCodeFeatures(customCode);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Cyber/Dungeon HUD */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-xl font-black text-white">CD</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Roguelite Mode
                </span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono border border-indigo-500/30">
                  v1.0 Prototype
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-100 leading-tight">
                CODE DEPTHS : ดันเจี้ยนแห่งการเข้าใจ
              </h1>
            </div>
          </div>

          {runState && (
            <div className="flex items-center gap-6">
              {/* Program Integrity (HP) */}
              <div className="w-40 sm:w-48">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-rose-400">Program Integrity</span>
                  <span className="font-mono">{runState.integrity}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className={`h-full transition-all duration-300 ${
                      runState.integrity > 60
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : runState.integrity > 30
                        ? "bg-gradient-to-r from-amber-500 to-orange-400"
                        : "bg-gradient-to-r from-rose-600 to-red-500 animate-pulse"
                    }`}
                    style={{ width: `${runState.integrity}%` }}
                  />
                </div>
              </div>

              {/* Focus Mana */}
              <div className="w-36 sm:w-44">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-cyan-400">Focus Mana</span>
                  <span className="font-mono">{runState.focus}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${runState.focus}%` }}
                  />
                </div>
              </div>

              {/* Spell Badge */}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-[10px] uppercase text-slate-400">มนตร์ประจำรอบ</span>
                <span className="text-xs font-semibold text-indigo-300 max-w-[180px] truncate">
                  {runState.spellName}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {runState && (
              <button
                onClick={() => setRunState(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
              >
                เลือกมนตร์ใหม่
              </button>
            )}
            <button
              onClick={onBackToPortal}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition border border-slate-700"
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </header>

      {/* VIEW 1: CODE INGESTION SCREEN */}
      {!runState && (
        <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 flex flex-col justify-center">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold tracking-widest uppercase text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              นำเข้าโค้ดเป็นร่องรอยพลัง
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 mb-2">
              AI ประกอบมนตร์ให้คุณได้ แต่คุณต้องเข้าใจมนตร์ก่อนร่าย
            </h2>
            <p className="text-sm text-slate-400">
              เลือกมนตร์ตัวอย่างหรือวางโค้ดที่คุณสั่งให้ AI เขียนขึ้นมา
              โค้ดจะถูกสร้างเป็นดันเจี้ยน 5 ชั้นที่คุณต้องทำนาย แกะรอย อธิบาย และซ่อมแซมเพื่อพิชิตบอสใหญ่
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Code Spell Presets & Custom Paste */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200">
                  เลือกมนตร์ต้นแบบ หรือวางโค้ดของคุณเอง
                </h3>
                <span className="text-xs text-slate-400">JavaScript / Pure Logic</span>
              </div>

              {/* Presets List */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
                {CODE_SPELL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 rounded-xl text-left border transition text-xs flex flex-col justify-between h-24 ${
                      selectedPresetId === preset.id
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                        : "bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="font-bold truncate">{preset.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">
                        {preset.category}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-300">
                        {preset.difficulty}
                      </span>
                      {selectedPresetId === preset.id && (
                        <span className="text-[10px] text-indigo-400 font-bold">เลือกอยู่</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Code Editor Area */}
              <div className="relative">
                <div className="flex items-center justify-between bg-slate-950 px-4 py-2 rounded-t-xl border border-b-0 border-slate-800 text-xs text-slate-400 font-mono">
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
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-b-xl p-4 font-mono text-xs text-emerald-400 leading-relaxed focus:outline-none focus:border-indigo-500 transition resize-none"
                  placeholder="วางโค้ด JavaScript ที่นี่..."
                />
              </div>
            </div>

            {/* Right: Instant AST & Knowledge Insights */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  การวิเคราะห์โครงสร้างมนตร์อัตโนมัติ (AST Inspection)
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block mb-1">ตัวแปรที่ตรวจพบ:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {codeAnalysis.variableNames.length > 0 ? (
                        codeAnalysis.variableNames.map((v) => (
                          <span
                            key={v}
                            className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono"
                          >
                            {v}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic">ไม่พบตัวแปร</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block mb-1">แกนความคิดหลัก (Core Concepts):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {codeAnalysis.hasLoop && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                          ลูปและการวนซ้ำ
                        </span>
                      )}
                      {codeAnalysis.hasAccumulator && (
                        <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                          รูปแบบสะสมค่า (Accumulator)
                        </span>
                      )}
                      {codeAnalysis.hasIf && (
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                          เงื่อนไขและการแตกกิ่ง
                        </span>
                      )}
                      {codeAnalysis.hasArray && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                          การเข้าถึงแอเรย์
                        </span>
                      )}
                    </div>
                  </div>

                  {codeAnalysis.risks.length > 0 && (
                    <div className="bg-rose-950/30 p-3 rounded-xl border border-rose-800/40 text-rose-300">
                      <span className="font-bold block mb-1">จุดเสี่ยงที่จะถูกทดสอบในดันเจี้ยน:</span>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-300/90">
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
                onClick={handleStartRun}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-base shadow-xl shadow-indigo-500/25 transition transform hover:-translate-y-0.5 active:translate-y-0"
              >
                เปิดประตูดันเจี้ยน CODE DEPTHS
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
              <span className="text-xs font-bold uppercase text-indigo-400">
                Floor Map Navigation
              </span>
              <h2 className="text-2xl font-black text-white mt-0.5">
                เลือกเส้นทางเผชิญหน้าบนแผนที่ดันเจี้ยน
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                คลิกที่ห้องที่มีสถานะ &ldquo;พร้อมเข้าสู่ห้อง&rdquo; เพื่อเริ่มการท้าทาย
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">ห้องที่ผ่านแล้ว</span>
                <span className="font-bold text-emerald-400">
                  {Object.values(runState.rooms).filter((r) => r.status === "cleared").length} /{" "}
                  {Object.values(runState.rooms).length}
                </span>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div>
                <span className="text-slate-400 block text-[10px]">XP สะสมรอบนี้</span>
                <span className="font-bold text-amber-400">
                  {runState.answersLog.reduce((acc, a) => acc + a.xpEarned, 0)} XP
                </span>
              </div>
            </div>
          </div>

          {/* 5-Floor Connected Visual Node Map */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-8 relative overflow-hidden">
            {/* Background cyber grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />

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
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
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
                          disabled={!isAvailable}
                          onClick={() => handleEnterRoom(room.id)}
                          className={`group relative flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 min-w-[240px] sm:min-w-[280px] max-w-sm ${
                            isCleared
                              ? "bg-slate-900/60 border-emerald-500/40 opacity-75"
                              : isAvailable
                              ? "bg-gradient-to-r from-slate-900 to-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] cursor-pointer"
                              : isCurrent
                              ? "bg-indigo-950 border-indigo-400 ring-2 ring-indigo-500/50"
                              : "bg-slate-950/40 border-slate-800/80 opacity-40 cursor-not-allowed"
                          }`}
                        >
                          {/* Room Type Icon Pill */}
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCleared
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : isAvailable
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            {room.type === "combat" && "⚔"}
                            {room.type === "shrine" && "⛩"}
                            {room.type === "trap" && "⚡"}
                            {room.type === "transfer" && "🌀"}
                            {room.type === "forge" && "🔨"}
                            {room.type === "boss" && "👑"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-white truncate">
                                {room.name}
                              </span>
                              {isCleared && (
                                <span className="text-[10px] text-emerald-400 font-bold shrink-0">
                                  ผ่านแล้ว ✓
                                </span>
                              )}
                              {isAvailable && (
                                <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-bold shrink-0 animate-pulse">
                                  เข้าได้
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  {currentRoom.name}
                </span>
                <span className="text-[10px] text-slate-400">·</span>
                <span className="text-xs text-slate-300">
                  เฟสที่ {runState.currentEncounterIndex + 1} จาก {currentRoom.encounters.length}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {currentEncounter.monsterName}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{currentEncounter.subtitle}</p>
            </div>

            {/* Relic Focus Bar & Quick Action */}
            <div className="flex flex-wrap items-center gap-2">
              {runState.activeRelics.map((relic) => {
                const canUse = runState.focus >= relic.focusCost && relic.usesLeft > 0 && !answerSubmitted;
                return (
                  <button
                    key={relic.id}
                    disabled={!canUse}
                    onClick={() => {
                      if (relic.id === "relic-rubber-duck") handleUseRubberDuck();
                      if (relic.id === "relic-trace-lens") handleUseTraceLens();
                    }}
                    title={`${relic.name} (ใช้ ${relic.focusCost} Focus) — ${relic.description}`}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition ${
                      canUse
                        ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-300 hover:border-cyan-500 shadow-sm"
                        : "bg-slate-950/60 border-slate-800/60 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    <span>
                      {relic.id === "relic-rubber-duck" ? "🦆" : "🔍"} {relic.name}
                    </span>
                    <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-cyan-400 font-mono">
                      {relic.usesLeft} ครั้ง ({relic.focusCost} MP)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Relic Notice Banner */}
          {relicNotice && (
            <div className="bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between">
              <span>{relicNotice}</span>
              <button
                onClick={() => setRelicNotice(null)}
                className="text-cyan-400 hover:text-white font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Two-Column Arena: Code on Left, Challenge on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
            {/* Left: Code Snippet & Memory State */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span className="font-mono text-indigo-400 font-bold">คัมภีร์เวทมนตร์ (Code View)</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                  วัดผลช่อง Block Model: {currentEncounter.blockCell}
                </span>
              </div>

              {/* Code Box */}
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/90 font-mono text-xs leading-relaxed overflow-x-auto text-slate-200">
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
                              ? "bg-indigo-600/30 text-indigo-200 border-l-2 border-indigo-400 font-bold"
                              : "hover:bg-slate-900/60"
                          }`}
                        >
                          <span className="text-slate-600 select-none w-5 text-right shrink-0">
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
                <div className="mt-4 bg-cyan-950/20 border border-cyan-800/40 rounded-xl p-3.5">
                  <span className="text-xs font-bold text-cyan-300 block mb-2">
                    🔎 ค่าตัวแปรใน RAM (Variable State Inspection)
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
                        className="bg-slate-950/80 p-2 rounded border border-cyan-900/40 flex justify-between"
                      >
                        <span className="text-slate-400">{k}:</span>
                        <span className="text-cyan-300 font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hint Callout */}
              {revealedHint && (
                <div className="mt-4 bg-amber-950/30 border border-amber-800/40 rounded-xl p-3.5 text-xs text-amber-300">
                  <span className="font-bold block mb-1">💡 คำใบ้จากสารวัตรเป็ด:</span>
                  <p>{currentEncounter.hint}</p>
                </div>
              )}
            </div>

            {/* Right: Challenge Prompt & Options */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                    ภารกิจ: {currentEncounter.title}
                  </span>
                  <span>·</span>
                  <span className="text-amber-400">รางวัล: +{currentEncounter.xpReward} XP</span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white mb-4 leading-snug">
                  {currentEncounter.prompt}
                </h3>

                {/* Multiple Choice Options */}
                <div className="space-y-2.5">
                  {currentEncounter.options.map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    const isEliminated = eliminatedOptionId === opt.id;

                    let optionStyle =
                      "bg-slate-950/70 border-slate-800 hover:bg-slate-800/70 text-slate-200";

                    if (isSelected && !answerSubmitted) {
                      optionStyle = "bg-indigo-950/80 border-indigo-500 text-white ring-1 ring-indigo-500";
                    }

                    if (answerSubmitted) {
                      if (opt.isCorrect) {
                        optionStyle =
                          "bg-emerald-950/80 border-emerald-500 text-emerald-200 font-semibold";
                      } else if (isSelected && !opt.isCorrect) {
                        optionStyle = "bg-rose-950/80 border-rose-500 text-rose-200";
                      } else {
                        optionStyle = "bg-slate-950/40 border-slate-800/40 opacity-40";
                      }
                    }

                    if (isEliminated && !answerSubmitted) {
                      optionStyle =
                        "bg-slate-950/40 border-slate-900 text-slate-600 line-through opacity-50 cursor-not-allowed";
                    }

                    return (
                      <button
                        key={opt.id}
                        disabled={answerSubmitted || isEliminated}
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs transition leading-relaxed flex items-start gap-3 ${optionStyle}`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px] mt-0.5 ${
                            isSelected
                              ? "border-indigo-400 bg-indigo-600 text-white"
                              : "border-slate-700 text-slate-500"
                          }`}
                        >
                          {opt.id.replace("opt-", "")}
                        </div>
                        <span className="flex-1">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Result & Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-800">
                {lastAnswerFeedback ? (
                  <div className="space-y-4">
                    <div
                      className={`p-4 rounded-xl border text-xs leading-relaxed ${
                        lastAnswerFeedback.isCorrect
                          ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                          : "bg-rose-950/40 border-rose-800/60 text-rose-200"
                      }`}
                    >
                      <div className="font-bold text-sm mb-1">
                        {lastAnswerFeedback.isCorrect
                          ? "⚔️ โจมตีสำเร็จ! (Critical Hit)"
                          : `💥 โดนโจมตีสวนกลับ! (-${lastAnswerFeedback.damageTaken}% Integrity)`}
                      </div>
                      <p>{lastAnswerFeedback.feedback}</p>
                    </div>

                    <button
                      onClick={handleProceedAfterAnswer}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg transition"
                    >
                      {runState.currentEncounterIndex + 1 < currentRoom.encounters.length
                        ? "เข้าสู่เฟสถัดไป ➔"
                        : currentRoom.type === "boss"
                        ? "ดูบทสรุปชัยชนะ 🏆"
                        : "กลับสู่แผนที่ดันเจี้ยน ➔"}
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={!selectedOptionId}
                    onClick={handleSubmitAnswer}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition ${
                      selectedOptionId
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white cursor-pointer"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center">
            {runState.status === "victory" ? (
              <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 mx-auto flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20 mb-4 animate-bounce">
                  👑
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  Dungeon Cleared
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 mb-2">
                  คุณพิชิตเดอะ คอร์ สำเร็จ!
                </h2>
                <p className="text-sm text-slate-400 max-w-xl mx-auto mb-6">
                  คุณได้พิสูจน์แล้วว่าคุณไม่ได้แค่รันโค้ดตาม AI แต่เข้าใจโครงสร้าง การทำงาน
                  การจัดการกรณีขอบเขต และสามารถซ่อมแซมโค้ดได้จริง
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-600 to-red-800 mx-auto flex items-center justify-center text-3xl shadow-xl shadow-rose-500/20 mb-4">
                  💀
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-rose-400">
                  Program Integrity Depleted
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 mb-2">
                  มนตร์เกิดข้อผิดพลาดรุนแรง
                </h2>
                <p className="text-sm text-slate-400 max-w-xl mx-auto mb-6">
                  ความสมบูรณ์ของโปรแกรมหมดลงก่อนถึงแกนกลาง แต่การพ่ายแพ้ทำให้เห็นจุดที่ยังเข้าใจคลาดเคลื่อน
                  สามารถทบทวนแนวคิดและกลับมาท้าทายใหม่ได้ทันที
                </p>
              </>
            )}

            {/* Assessment Evidence vs Game Score Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">XP ที่ได้รับรอบนี้</span>
                <span className="text-2xl font-black text-amber-400 font-mono">
                  +{runState.answersLog.reduce((acc, a) => acc + a.xpEarned, 0)} XP
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Program Integrity คงเหลือ</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {runState.integrity}%
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">อัตราตอบถูกรอบแรก</span>
                <span className="text-2xl font-black text-indigo-400 font-mono">
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
            <div className="bg-slate-950/70 rounded-2xl p-5 border border-slate-800/80 mb-8 text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                หลักฐานความเข้าใจ 4 มิติ (Learning Mastery Evidence)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {(["predict", "explain", "debug", "transfer"] as const).map((pillar) => {
                  const relevant = runState.answersLog.filter((a) => a.learningPillar === pillar);
                  const correct = relevant.filter((a) => a.isCorrect).length;
                  const percent = relevant.length > 0 ? Math.round((correct / relevant.length) * 100) : 100;
                  return (
                    <div key={pillar} className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 capitalize block mb-1">{pillar}</span>
                      <div className="flex items-baseline justify-between">
                        <span className="font-bold text-white text-base font-mono">{percent}%</span>
                        <span className="text-[10px] text-slate-500">
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
                onClick={handleStartRun}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg transition"
              >
                เล่นรอบใหม่ด้วยมนตร์นี้อีกครั้ง
              </button>
              <button
                onClick={() => setRunState(null)}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition"
              >
                เลือกหรือนำเข้ามนตร์บทอื่น
              </button>
              <button
                onClick={onBackToPortal}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700 transition"
              >
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
