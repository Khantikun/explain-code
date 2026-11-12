"use client";

import React, { useState } from "react";
import {
  BattleSnapshot,
  CodeRune,
  ElementType,
  MonsterEntity,
  PlayerCombatState,
  TacticalDungeonRoom,
  TacticalRunState,
} from "../lib/dungeon/tacticalTypes";
import {
  executePlayerSpell,
  resolveCombatTurn,
} from "../lib/dungeon/tacticalEngine";
import {
  generateTacticalDungeon,
  getInitialPlayerCombatState,
} from "../lib/dungeon/tacticalMonsters";

interface TacticalDungeonScreenProps {
  onBackToPortal: () => void;
  onRecordVictory?: (summary: { xpEarned: number; integrityLeft: number }) => void;
}

const DEFAULT_SPELL_CODE = `function castSpell(battleState, enemy, player) {
  let spell = {
    damage: 35,
    element: "Fire",
    hitCount: 1,
    armorPiercing: 0,
    isCritical: false,
    sideEffects: []
  };

  // ปรับแต่งตรรกะเวทมนตร์ของคุณที่นี่เพื่อแก้ทางศัตรู:
  // ตัวอย่าง: ถ้าศัตรูเป็นธาตุน้ำ ให้สลับเป็นสายฟ้า
  if (enemy.element === "Water") {
    spell.element = "Lightning";
  }

  return spell;
}`;

export function TacticalDungeonScreen({
  onBackToPortal,
  onRecordVictory,
}: TacticalDungeonScreenProps) {
  const [dungeonRooms, setDungeonRooms] = useState<Record<string, TacticalDungeonRoom>>(
    generateTacticalDungeon()
  );
  const [player, setPlayer] = useState<PlayerCombatState>(getInitialPlayerCombatState());
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentMonster, setCurrentMonster] = useState<MonsterEntity | null>(null);

  const [spellCode, setSpellCode] = useState<string>(DEFAULT_SPELL_CODE);
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [battleLogs, setBattleLogs] = useState<
    {
      turn: number;
      sender: "player" | "monster" | "system";
      message: string;
      details?: string;
      type: "info" | "damage" | "heal" | "reaction" | "error";
    }[]
  >([]);

  const [gameState, setGameState] = useState<"map" | "battle" | "npc_event" | "victory" | "defeated">("map");
  const [inspectEnemyModalOpen, setInspectEnemyModalOpen] = useState<boolean>(false);
  const [sandboxSimulation, setSandboxSimulation] = useState<string | null>(null);
  const [npcFeedback, setNpcFeedback] = useState<string | null>(null);

  // Enter room from map
  const handleEnterRoom = (roomId: string) => {
    const room = dungeonRooms[roomId];
    if (!room || room.status !== "available") return;

    setCurrentRoomId(roomId);
    setSandboxSimulation(null);
    setNpcFeedback(null);

    if (room.roomType === "combat" || room.roomType === "boss") {
      if (room.monster) {
        setCurrentMonster({ ...room.monster });
        setGameState("battle");
        setTurnNumber(1);
        setBattleLogs([
          {
            turn: 1,
            sender: "system",
            message: `เริ่มการต่อสู้กับ ${room.monster.name}! สแกนดูสคริปต์ศัตรูเพื่อวางแผนแก้ทาง`,
            type: "info",
          },
        ]);
      }
    } else if (room.roomType === "npc") {
      setGameState("npc_event");
    }
  };

  // Run Sandbox Simulation (Test without casting)
  const handleTestSandbox = () => {
    if (!currentMonster) return;
    const snapshot: BattleSnapshot = {
      turnNumber,
      player,
      targetEnemy: currentMonster,
      allEnemies: [currentMonster],
    };
    const res = executePlayerSpell(spellCode, snapshot);

    if (!res.success) {
      setSandboxSimulation(`ตรวจพบปัญหา: ${res.errorMessage}`);
    } else if (res.action) {
      setSandboxSimulation(
        `จำลองผลสำเร็จ: ดาเมจฐาน ${res.action.baseDamage} ธาตุ ${res.action.element} (${res.action.hitCount} ฮิต) | มานาที่ใช้: ${res.action.manaConsumed} MP`
      );
    }
  };

  // Quick Rune Insertion Snippets
  const handleInsertRuneSnippet = (snippet: string) => {
    // Insert before the return spell statement
    if (spellCode.includes("return spell;")) {
      const updated = spellCode.replace(
        "return spell;",
        `  // แทรกตรรกะใหม่:\n  ${snippet}\n\n  return spell;`
      );
      setSpellCode(updated);
    } else {
      setSpellCode((prev) => `${prev}\n${snippet}`);
    }
  };

  // Execute Combat Turn
  const handleCastSpell = () => {
    if (!currentMonster || gameState !== "battle") return;

    const snapshot: BattleSnapshot = {
      turnNumber,
      player,
      targetEnemy: currentMonster,
      allEnemies: [currentMonster],
    };

    // Phase 1: Execute Player's Spell in Sandbox
    const spellResult = executePlayerSpell(spellCode, snapshot);

    // Phase 2 & 3: Resolve reactions & Monster retaliation
    const { updatedPlayer, updatedMonster, combatLogs } = resolveCombatTurn(
      player,
      currentMonster,
      spellResult,
      snapshot
    );

    setPlayer(updatedPlayer);
    setCurrentMonster(updatedMonster);
    setBattleLogs((prev) => [...prev, ...combatLogs]);
    setTurnNumber((prev) => prev + 1);

    // Check Win/Loss
    if (updatedPlayer.currentHp <= 0) {
      setGameState("defeated");
      return;
    }

    if (updatedMonster.currentHp <= 0) {
      // Monster defeated!
      const currentRoom = currentRoomId ? dungeonRooms[currentRoomId] : null;
      if (currentRoom?.roomType === "boss") {
        setGameState("victory");
        if (onRecordVictory) {
          onRecordVictory({ xpEarned: 200, integrityLeft: updatedPlayer.currentHp });
        }
      } else {
        // Unlock next rooms
        handleClearCurrentRoom();
      }
    }
  };

  // Clear current room and return to map
  const handleClearCurrentRoom = () => {
    if (!currentRoomId) return;
    const currentRoom = dungeonRooms[currentRoomId];
    const updated = { ...dungeonRooms };

    updated[currentRoomId] = {
      ...currentRoom,
      status: "cleared",
    };

    currentRoom.nextRoomIds.forEach((nextId) => {
      if (updated[nextId] && updated[nextId].status !== "cleared") {
        updated[nextId] = {
          ...updated[nextId],
          status: "available",
        };
      }
    });

    setDungeonRooms(updated);
    setGameState("map");
    setCurrentRoomId(null);
    setCurrentMonster(null);
  };

  // Submit Code to NPC
  const handleSubmitToNpc = () => {
    if (!currentRoomId) return;
    const room = dungeonRooms[currentRoomId];
    if (!room.npcEvent) return;

    const passes = room.npcEvent.checkCodePasses(spellCode);
    if (passes) {
      setNpcFeedback(`ยอดเยี่ยม! คุณผ่านคำขอแล้ว: ${room.npcEvent.rewardDescription}`);
      // Apply Rune snippet to player's active code
      const rewardedRune = room.npcEvent.rewardRune;
      setPlayer((prev) => ({
        ...prev,
        activeRunes: [...prev.activeRunes, rewardedRune],
        currentHp: Math.min(prev.maxHp, prev.currentHp + 30),
      }));
      setTimeout(() => {
        handleClearCurrentRoom();
      }, 1500);
    } else {
      setNpcFeedback("โค้ดยังไม่ตรงตามเงื่อนไขที่ NPC ต้องการ ลองตรวจสอบ Requirement อีกครั้ง!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Combat Header HUD */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20">
              CD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Tactical Code-Battler
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30 font-bold">
                  v2.0 Active
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-100 leading-tight">
                CODE DEPTHS : สังเวียนดวลตรรกะเวทมนตร์
              </h1>
            </div>
          </div>

          {/* Player Combat Stats */}
          <div className="flex items-center gap-6">
            {/* Player HP */}
            <div className="w-36 sm:w-44">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-rose-400">Player HP</span>
                <span className="font-mono">
                  {player.currentHp} / {player.maxHp}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-300 ${
                    player.currentHp > 50
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : player.currentHp > 25
                      ? "bg-gradient-to-r from-amber-500 to-orange-400"
                      : "bg-gradient-to-r from-rose-600 to-red-500 animate-pulse"
                  }`}
                  style={{ width: `${(player.currentHp / player.maxHp) * 100}%` }}
                />
              </div>
            </div>

            {/* Player Mana */}
            <div className="w-36 sm:w-44">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-cyan-400">Player Mana</span>
                <span className="font-mono">
                  {player.currentMana} / {player.maxMana}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${(player.currentMana / player.maxMana) * 100}%` }}
                />
              </div>
            </div>

            {/* Armor & Integrity */}
            <div className="hidden sm:flex flex-col text-right text-xs">
              <span className="text-slate-400 text-[10px]">เกราะป้องกัน (Armor)</span>
              <span className="font-bold text-amber-300 font-mono">{player.baseArmor} หน่วย</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToPortal}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition border border-slate-700"
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </header>

      {/* SCREEN 1: 2D TACTICAL MAP */}
      {gameState === "map" && (
        <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col justify-center">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold tracking-widest uppercase text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              Tactical Dungeon Map
            </span>
            <h2 className="text-3xl font-black text-white mt-2">
              เลือกเส้นทางพิชิตดันเจี้ยน
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              คลิกที่ห้องที่มีสถานะพร้อมเข้า เพื่อเริ่มการดวลตรรกะ หรือพบปะกับ NPC ช่างตีเหล็ก
            </p>
          </div>

          {/* Rooms Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(dungeonRooms).map((room) => {
                const isAvailable = room.status === "available";
                const isCleared = room.status === "cleared";

                let borderStyle = "border-slate-800 bg-slate-950/60 opacity-40 cursor-not-allowed";
                if (isAvailable) {
                  borderStyle =
                    "border-indigo-500 bg-gradient-to-br from-slate-900 to-indigo-950/60 hover:scale-[1.02] shadow-lg shadow-indigo-500/10 cursor-pointer";
                }
                if (isCleared) {
                  borderStyle = "border-emerald-500/40 bg-slate-900/60 opacity-80";
                }

                return (
                  <button
                    key={room.id}
                    disabled={!isAvailable}
                    onClick={() => handleEnterRoom(room.id)}
                    className={`p-5 rounded-2xl border text-left transition flex flex-col justify-between h-44 ${borderStyle}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {room.roomType === "combat" && "Battle"}
                          {room.roomType === "npc" && "NPC Quest"}
                          {room.roomType === "boss" && "Boss Battle"}
                        </span>
                        {isCleared && (
                          <span className="text-xs text-emerald-400 font-bold">ผ่านแล้ว ✓</span>
                        )}
                        {isAvailable && (
                          <span className="text-xs text-indigo-400 font-bold animate-pulse">
                            เข้าได้ ➔
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white truncate">{room.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {room.monster?.description || room.npcEvent?.dialog || "ห้องลึกลับในดันเจี้ยน"}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>ชั้นที่ {room.floor + 1}</span>
                      {room.monster && (
                        <span className="text-indigo-300 font-semibold font-mono">
                          {room.monster.element} Element
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* SCREEN 2: TACTICAL BATTLE ARENA */}
      {gameState === "battle" && currentMonster && (
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col gap-5">
          {/* Top Enemy Status Banner with Code X-Ray Button */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-2xl font-black shadow-lg shadow-rose-500/20">
                {currentMonster.tier === "boss" ? "👑" : "⚔"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                    {currentMonster.tier} Enemy
                  </span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-mono font-bold">
                    ธาตุ: {currentMonster.element}
                  </span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono">
                    เกราะ: {currentMonster.baseArmor}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {currentMonster.name}
                </h2>
                <p className="text-xs text-slate-400">
                  สถานะปัจจุบัน:{" "}
                  <span className="text-cyan-300 font-bold">{currentMonster.currentStance}</span>
                </p>
              </div>
            </div>

            {/* Monster HP & Code X-Ray Button */}
            <div className="flex items-center gap-4">
              <div className="w-40 sm:w-52">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-rose-400">Monster HP</span>
                  <span className="font-mono">
                    {currentMonster.currentHp} / {currentMonster.maxHp}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-rose-600 to-red-500 transition-all duration-300"
                    style={{
                      width: `${Math.max(0, (currentMonster.currentHp / currentMonster.maxHp) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => setInspectEnemyModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <span>🔍 สแกนโค้ดศัตรู (Code X-Ray)</span>
              </button>
            </div>
          </div>

          {/* Arena Columns: Left (Code Workspace) vs Right (Battlefield & Logs) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
            {/* Left: Player Spell Engine Editor */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-400">
                  สคริปต์เวทมนตร์ของผู้เล่น (Player Spell Engine)
                </span>
                <span className="text-slate-400">JavaScript Sandbox Runtime</span>
              </div>

              {/* Quick Snippet Injector Buttons */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex flex-wrap gap-2 text-xs">
                <span className="text-slate-400 text-[11px] self-center mr-1">แทรกตรรกะลัด:</span>
                <button
                  type="button"
                  onClick={() =>
                    handleInsertRuneSnippet(
                      `// แทรกเจาะเกราะ 40% และเปลี่ยนเป็นไฟ\nspell.armorPiercing = 40;\nspell.element = "Fire";`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-[11px] transition"
                >
                  + เจาะเกราะ 40% (ไฟ)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleInsertRuneSnippet(
                      `// แทรกการสลับเป็นสายฟ้า\nspell.element = "Lightning";`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-[11px] transition"
                >
                  + ธาตุสายฟ้า (แก้ทางน้ำ)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleInsertRuneSnippet(
                      `// แทรก Multi-hit ลูป 3 ครั้ง (กินมานาเพิ่มขึ้น)\nspell.hitCount = 3;`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-[11px] transition"
                >
                  + ลูป 3 ฮิต (Multi-cast)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleInsertRuneSnippet(
                      `// โอกาส 30% ติดคริติคอล\nif (Math.random() < 0.3) { spell.isCritical = true; spell.damage *= 1.8; }`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-purple-300 text-[11px] transition"
                >
                  + เสี่ยงโชคคริติคอล 30%
                </button>
              </div>

              {/* Code Textarea */}
              <div className="relative">
                <div className="bg-slate-950 px-4 py-2 rounded-t-xl border border-b-0 border-slate-800 text-xs font-mono text-slate-400 flex justify-between">
                  <span>spell_engine.js</span>
                  <span>{spellCode.split("\n").length} บรรทัด</span>
                </div>
                <textarea
                  value={spellCode}
                  onChange={(e) => setSpellCode(e.target.value)}
                  rows={13}
                  className="w-full bg-slate-950 font-mono text-xs text-emerald-400 p-4 rounded-b-xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                />
              </div>

              {/* Simulation Sandbox Result */}
              {sandboxSimulation && (
                <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-xl p-3 text-xs text-indigo-300">
                  {sandboxSimulation}
                </div>
              )}

              {/* Action Buttons: Test Sandbox vs Cast Spell */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleTestSandbox}
                  className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  จำลองรันใน Sandbox
                </button>
                <button
                  type="button"
                  onClick={handleCastSpell}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-sm font-extrabold shadow-lg shadow-indigo-500/25 transition transform active:scale-95"
                >
                  ร่ายมนตร์โจมตี (Cast Spell) ➔
                </button>
              </div>
            </div>

            {/* Right: Battlefield Log & Combat Feedback */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col h-[560px]">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3 border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-300">บันทึกเหตุการณ์ในสนามรบ (Battle Log)</span>
                <span>เทิร์นที่ {turnNumber}</span>
              </div>

              {/* Log Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                {battleLogs.map((log, index) => {
                  let badgeColor = "bg-slate-800 text-slate-400";
                  let borderColor = "border-slate-800 bg-slate-950/50 text-slate-300";

                  if (log.type === "damage") {
                    if (log.sender === "player") {
                      borderColor = "border-emerald-800/60 bg-emerald-950/30 text-emerald-200";
                      badgeColor = "bg-emerald-500/20 text-emerald-400";
                    } else {
                      borderColor = "border-rose-800/60 bg-rose-950/30 text-rose-200";
                      badgeColor = "bg-rose-500/20 text-rose-400";
                    }
                  } else if (log.type === "reaction") {
                    borderColor = "border-amber-800/60 bg-amber-950/30 text-amber-200";
                    badgeColor = "bg-amber-500/20 text-amber-400";
                  } else if (log.type === "error") {
                    borderColor = "border-red-900 bg-red-950/50 text-red-300 font-bold";
                    badgeColor = "bg-red-500/30 text-red-300";
                  }

                  return (
                    <div key={index} className={`p-3 rounded-xl border ${borderColor} text-xs`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${badgeColor}`}>
                          {log.sender}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Turn {log.turn}</span>
                      </div>
                      <p className="leading-snug">{log.message}</p>
                      {log.details && (
                        <p className="text-[11px] text-slate-400 mt-1 italic">{log.details}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* SCREEN 3: NPC EVENT SCREEN */}
      {gameState === "npc_event" && currentRoomId && dungeonRooms[currentRoomId]?.npcEvent && (
        <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 flex flex-col justify-center">
          {(() => {
            const event = dungeonRooms[currentRoomId].npcEvent!;
            return (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-amber-500/20">
                    📜
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {event.npcTitle}
                    </span>
                    <h2 className="text-2xl font-black text-white mt-0.5">{event.npcName}</h2>
                    <p className="text-sm text-slate-300 mt-2 bg-slate-950 p-4 rounded-xl border border-slate-800/80 italic leading-relaxed">
                      &ldquo;{event.dialog}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                    ข้อกำหนดในการปรับแต่งโค้ด (Refactor Challenge):
                  </span>
                  <p className="text-xs text-slate-300">{event.codeRequirementDescription}</p>
                  <p className="text-xs text-amber-300 font-semibold mt-2">
                    รางวัลเมื่อผ่าน: {event.rewardDescription}
                  </p>
                </div>

                {/* Editor to solve NPC request */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    ปรับแต่งโค้ดเพื่อส่งมอบให้ NPC:
                  </label>
                  <textarea
                    value={spellCode}
                    onChange={(e) => setSpellCode(e.target.value)}
                    rows={8}
                    className="w-full bg-slate-950 font-mono text-xs text-emerald-400 p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                {npcFeedback && (
                  <div
                    className={`p-4 rounded-xl text-xs font-semibold ${
                      npcFeedback.includes("ยอดเยี่ยม")
                        ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                        : "bg-rose-950/40 border border-rose-800 text-rose-300"
                    }`}
                  >
                    {npcFeedback}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSubmitToNpc}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg transition"
                  >
                    ส่งมอบโค้ดให้ NPC ตรวจสอบ
                  </button>
                  <button
                    onClick={() => setGameState("map")}
                    className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700"
                  >
                    ข้ามเหตุการณ์นี้
                  </button>
                </div>
              </div>
            );
          })()}
        </main>
      )}

      {/* SCREEN 4: VICTORY & DEFEAT */}
      {(gameState === "victory" || gameState === "defeated") && (
        <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 flex flex-col justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center">
            {gameState === "victory" ? (
              <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 mx-auto flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20 mb-4 animate-bounce">
                  👑
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  Mission Accomplished
                </span>
                <h2 className="text-3xl font-black text-white mt-1 mb-2">
                  คุณพิชิตเดอะ คอร์ ด้วยสคริปต์เวทมนตร์สำเร็จ!
                </h2>
                <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
                  คุณได้พิสูจน์แล้วว่าการเขียนโค้ดคือการวางกลยุทธ์ การสลับธาตุแก้ทาง การจัดการมานา
                  และการดักทางสคริปต์ของศัตรูอย่างชาญฉลาด
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-600 to-red-800 mx-auto flex items-center justify-center text-3xl shadow-xl shadow-rose-500/20 mb-4">
                  💀
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-rose-400">
                  Player Defeated
                </span>
                <h2 className="text-3xl font-black text-white mt-1 mb-2">
                  พลังชีวิตของผู้เล่นหมดลง
                </h2>
                <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
                  การต่อสู้ครั้งนี้ทำให้เห็นจุดบกพร่องในสคริปต์เวทมนตร์ ปรับแก้เงื่อนไขและกลับมาท้าทายใหม่ได้ทันที
                </p>
              </>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setDungeonRooms(generateTacticalDungeon());
                  setPlayer(getInitialPlayerCombatState());
                  setGameState("map");
                }}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg transition"
              >
                เล่นรอบใหม่ (New Run)
              </button>
              <button
                onClick={onBackToPortal}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700"
              >
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </main>
      )}

      {/* CODE X-RAY MODAL (Inspect Enemy Script) */}
      {inspectEnemyModalOpen && currentMonster && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Code X-Ray Profiler
                </span>
                <h3 className="text-lg font-black text-white">
                  สคริปต์พฤติกรรมของ {currentMonster.name}
                </h3>
              </div>
              <button
                onClick={() => setInspectEnemyModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {currentMonster.description} อ่านโค้ดด้านล่างเพื่อหาวิธีแก้ทางและหลีกเลี่ยงการถูกดูดซับดาเมจ:
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 leading-relaxed overflow-x-auto max-h-80 overflow-y-auto">
              <pre>
                <code>{currentMonster.inspectableCode}</code>
              </pre>
            </div>

            <div className="bg-indigo-950/30 p-3 rounded-xl border border-indigo-800/40 text-xs text-indigo-300">
              💡 <strong>คำแนะนำเชิงกลยุทธ์:</strong> ตรวจดูเงื่อนไข `if` ของศัตรู แล้วปรับค่า `spell.element` หรือ `spell.armorPiercing` ในฟังก์ชันของคุณเพื่อหลบการดูดซับ
            </div>

            <button
              onClick={() => setInspectEnemyModalOpen(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700"
            >
              ปิดหน้าต่างสแกนโค้ด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
