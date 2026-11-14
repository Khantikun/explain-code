"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  TopicQuest,
  BlockCellId,
  StudentRecord,
} from "../../lib/curriculum";
import {
  LANGUAGE_TRACKS,
  LearningLanguage,
  getTopicsByLanguage,
  runCodeByLanguage,
} from "../../lib/language-tracks";
import { getQuestionsForTopic } from "../../lib/dungeon/questions";
import {
  AVATARS,
  AvatarKey,
  DEFAULT_AVATAR,
  getAvatar,
  HEART_SPRITE,
  COIN_SPRITE,
} from "../../lib/dungeon/sprites";
import { hashString } from "../../lib/dungeon/seed";
import { generateDungeonRoom, DungeonRoom } from "../../lib/dungeon/mapgen";
import { getMonsterDef } from "../../lib/dungeon/monsters";
import { dungeonSound } from "../../lib/dungeon/sound";
import { GameCanvas } from "./GameCanvas";
import { MobileDpad } from "./MobileDpad";
import { BattleOverlay, BattlePhaseResult } from "./BattleOverlay";
import { PixelSpriteView } from "./PixelSpriteView";
import { useUiLanguage } from "../LanguageProvider";
import { getClientSession } from "../SiteHeader";
import { Icon } from "../Icons";

const VALID_CELL_IDS = new Set<string>([
  "T1", "E1", "F1",
  "T2", "E2", "F2",
  "T3", "E3", "F3",
  "T4", "E4", "F4",
]);

export interface TopicDungeonArenaProps {
  topic: TopicQuest;
  language?: LearningLanguage;
  topicIndex?: number;
  totalTopics?: number;
  onBackToMap: () => void;
  onCompleteTopic: (result: {
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
  }) => void;
  currentStudent?: StudentRecord | null;
  studentId?: string;
  defaultMode?: "dungeon" | "classic";
  embedded?: boolean;
  avatarKey?: AvatarKey;
  onChangeHero?: () => void;
}

export function TopicDungeonArena({
  topic,
  language = "javascript",
  topicIndex,
  totalTopics,
  onBackToMap,
  onCompleteTopic,
  currentStudent,
  studentId,
  embedded = false,
  avatarKey: propsAvatarKey,
  onChangeHero,
}: TopicDungeonArenaProps) {
  const { t } = useUiLanguage();
  const hasSession = Boolean(getClientSession());

  const activeLanguage = language;
  const activeTopic = topic;

  // Integrated PRIMM features: Interactive Trace tab & Modify Bonus Challenge
  const [scrollTab, setScrollTab] = useState<"code" | "trace">("code");
  const [traceIdx, setTraceIdx] = useState<number>(0);
  const [modifiedCode, setModifiedCode] = useState<string>(activeTopic.code);
  const [modifyRunResult, setModifyRunResult] = useState<{
    finalOutput: string;
    matchedTarget: boolean;
  } | null>(null);
  const [modifyBonusClaimed, setModifyBonusClaimed] = useState<boolean>(false);

  const trackMeta = useMemo(
    () => LANGUAGE_TRACKS.find((tr) => tr.id === activeLanguage) || LANGUAGE_TRACKS[0],
    [activeLanguage]
  );

  const langTopics = useMemo(
    () => getTopicsByLanguage(activeLanguage),
    [activeLanguage]
  );

  const resolvedFloorIndex = useMemo(() => {
    if (typeof topicIndex === "number" && topicIndex >= 0) return topicIndex;
    const idx = langTopics.findIndex((item) => item.id === activeTopic.id);
    return idx >= 0 ? idx : 0;
  }, [topicIndex, langTopics, activeTopic.id]);

  const resolvedTotalFloors = Math.max(
    1,
    totalTopics ?? langTopics.length
  );

  // Avatar & Sound preferences
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(
    propsAvatarKey || DEFAULT_AVATAR
  );
  const [showAvatarMenu, setShowAvatarMenu] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (propsAvatarKey && AVATARS.some((a) => a.key === propsAvatarKey)) {
      setAvatarKey(propsAvatarKey);
      return;
    }
    try {
      const savedAvatar = localStorage.getItem("explain_code_dungeon_avatar") as AvatarKey;
      if (savedAvatar && AVATARS.some((a) => a.key === savedAvatar)) {
        setAvatarKey(savedAvatar);
      }
      const savedSound = localStorage.getItem("explain_code_dungeon_sound");
      if (savedSound !== null) {
        const enabled = savedSound === "true";
        setSoundEnabled(enabled);
        dungeonSound.setEnabled(enabled);
      }
    } catch {
      // ignore storage errors
    }
  }, [propsAvatarKey]);

  const avatar = useMemo(() => getAvatar(avatarKey), [avatarKey]);

  const handleChangeAvatar = (nextKey: AvatarKey) => {
    setAvatarKey(nextKey);
    setShowAvatarMenu(false);
    try {
      localStorage.setItem("explain_code_dungeon_avatar", nextKey);
    } catch {
      // ignore
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    dungeonSound.setEnabled(next);
    try {
      localStorage.setItem("explain_code_dungeon_sound", String(next));
    } catch {
      // ignore
    }
  };

  // Room & Encounter generation
  const roomSeed = useMemo(
    () => hashString(`topic-arena-${activeTopic.id}-${activeLanguage}`),
    [activeTopic.id, activeLanguage]
  );

  const [room, setRoom] = useState<DungeonRoom>(() =>
    generateDungeonRoom(
      roomSeed,
      resolvedFloorIndex,
      resolvedTotalFloors,
      activeTopic.isBoss ? "boss" : "monster"
    )
  );

  const maxHearts = avatar.stats.maxHp;
  const [hearts, setHearts] = useState<number>(maxHearts);
  const [coins, setCoins] = useState<number>(0);
  const [xp, setXp] = useState<number>(0);
  const [screenShake, setScreenShake] = useState<number>(0);
  const [isInBattle, setIsInBattle] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [battleSummary, setBattleSummary] = useState<{
    totalXp: number;
    totalCoins: number;
    phaseResults: BattlePhaseResult[];
  } | null>(null);

  const hasSubmittedCompletionRef = useRef<boolean>(false);

  // Reset room and battle state whenever topic, language, or hero changes
  useEffect(() => {
    hasSubmittedCompletionRef.current = false;
    setHearts(avatar.stats.maxHp);
    setCoins(0);
    setXp(0);
    setIsInBattle(false);
    setIsGameOver(false);
    setBattleSummary(null);
    setScreenShake(0);
    setScrollTab("code");
    setTraceIdx(0);
    setModifiedCode(activeTopic.code);
    setModifyRunResult(null);
    setModifyBonusClaimed(false);
    setRoom(
      generateDungeonRoom(
        roomSeed,
        resolvedFloorIndex,
        resolvedTotalFloors,
        activeTopic.isBoss ? "boss" : "monster"
      )
    );
  }, [
    roomSeed,
    resolvedFloorIndex,
    resolvedTotalFloors,
    activeTopic.isBoss,
    activeTopic.code,
    avatar.stats.maxHp,
  ]);

  const modifyTargetOutput = useMemo(() => {
    if (!activeTopic.modifyChallenge?.suggestedCode) return "";
    return runCodeByLanguage(
      activeTopic.modifyChallenge.suggestedCode,
      activeLanguage
    ).finalOutput.trim();
  }, [activeTopic.modifyChallenge?.suggestedCode, activeLanguage]);

  const handleRunModifyBonus = () => {
    if (!activeTopic.modifyChallenge) return;
    const exec = runCodeByLanguage(modifiedCode, activeLanguage);
    const out = exec.finalOutput.trim();
    const matchedTarget =
      exec.success &&
      modifiedCode.trim() !== activeTopic.code.trim() &&
      out === modifyTargetOutput;
    setModifyRunResult({ finalOutput: out || "(no output)", matchedTarget });
    if (matchedTarget && !modifyBonusClaimed) {
      setModifyBonusClaimed(true);
      setXp((prev) => prev + 25);
      dungeonSound.playCoin();
    }
  };

  const currentMonster = useMemo(() => {
    if (activeTopic.isBoss) return getMonsterDef("boss");
    if (room.entity?.monsterType) return getMonsterDef(room.entity.monsterType);
    return getMonsterDef("slime");
  }, [activeTopic.isBoss, room.entity?.monsterType]);

  const phaseQuestions = useMemo(
    () => getQuestionsForTopic(activeTopic, activeLanguage),
    [activeTopic, activeLanguage]
  );

  const handleEncounterEntity = useCallback(() => {
    if (!room.entity?.isCompleted && !isGameOver) {
      setIsInBattle(true);
    }
  }, [room.entity?.isCompleted, isGameOver]);

  const handleBattleComplete = useCallback(
    (summary: {
      totalXp: number;
      totalCoins: number;
      phaseResults: BattlePhaseResult[];
    }) => {
      setBattleSummary(summary);
      setXp(summary.totalXp);
      setCoins(summary.totalCoins);
      dungeonSound.playDoorOpen();

      setRoom((prev) => ({
        ...prev,
        entity: prev.entity ? { ...prev.entity, hp: 0, isCompleted: true } : null,
        isDoorUnlocked: true,
      }));
    },
    []
  );

  const handleCorrectAnswer = useCallback(
    (xpAwarded?: number, coinsAwarded?: number) => {
      if (xpAwarded !== undefined) {
        setXp((prev) => Math.max(prev, xpAwarded));
      }
      if (coinsAwarded !== undefined) {
        setCoins((prev) => Math.max(prev, coinsAwarded));
      }
      setRoom((prev) => ({
        ...prev,
        entity: prev.entity ? { ...prev.entity, hp: 0, isCompleted: true } : null,
        isDoorUnlocked: true,
      }));
    },
    []
  );

  const handleWrongAnswer = useCallback(() => {
    setScreenShake(1);
    setTimeout(() => setScreenShake(0), 300);

    setHearts((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        setTimeout(() => {
          setIsInBattle(false);
          setIsGameOver(true);
        }, 350);
      }
      return Math.max(0, next);
    });
  }, []);

  const handleRetryFloor = useCallback(() => {
    hasSubmittedCompletionRef.current = false;
    setHearts(avatar.stats.maxHp);
    setCoins(0);
    setXp(0);
    setIsGameOver(false);
    setIsInBattle(false);
    setBattleSummary(null);
    setRoom(
      generateDungeonRoom(
        roomSeed,
        resolvedFloorIndex,
        resolvedTotalFloors,
        activeTopic.isBoss ? "boss" : "monster"
      )
    );
  }, [roomSeed, resolvedFloorIndex, resolvedTotalFloors, activeTopic.isBoss, avatar.stats.maxHp]);

  const handleCompleteFloor = useCallback(() => {
    if (hasSubmittedCompletionRef.current) return;
    hasSubmittedCompletionRef.current = true;
    dungeonSound.playVictory();

    const updatedCellScores: Partial<Record<BlockCellId, number>> = {};
    const results = battleSummary?.phaseResults || [];

    results.forEach((res) => {
      const cell = res.blockModelCell;
      if (cell && VALID_CELL_IDS.has(cell)) {
        const key = cell as BlockCellId;
        const score = res.isCorrectFirstTry ? 95 : 80;
        updatedCellScores[key] = Math.max(updatedCellScores[key] || 0, score);
      }
    });

    activeTopic.questions.forEach((q) => {
      if (!updatedCellScores[q.cellId]) {
        updatedCellScores[q.cellId] = 85;
      }
    });

    const totalPhases = Math.max(1, results.length);
    const scorePercent =
      results.length > 0
        ? Math.round(
            results.reduce((acc, r) => acc + (r.isCorrectFirstTry ? 100 : 75), 0) /
              totalPhases
          )
        : 90;

    const answers = activeTopic.questions.map((q) => {
      const matched = results.find((r) => r.questionId.endsWith(q.id));
      return {
        questionId: q.id,
        cellId: q.cellId,
        chosenOptionId: q.correctOptionId,
        isCorrect: matched ? matched.isCorrectFirstTry : true,
        tries: matched ? matched.tries : 1,
        xpEarned: matched ? matched.xpEarned : 20,
      };
    });

    onCompleteTopic({
      topicId: activeTopic.id,
      earnedXp: Math.max(30, battleSummary?.totalXp ?? xp),
      updatedCellScores,
      badgeId: activeTopic.badgeReward.id,
      scorePercent,
      answers,
    });
  }, [battleSummary, activeTopic, xp, onCompleteTopic]);

  const initialFocusDisplay = avatar.stats.initialMp;
  const maxFocusDisplay = avatar.stats.maxMp;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Bar: Floor Info, Avatar Pill, Vitals & Mode Toggle */}
      <div
        className={
          embedded
            ? "pb-4 border-b border-[#2f2d45] text-[#f4efe6] flex flex-col gap-3.5"
            : "rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-4 sm:p-5 text-[#f4efe6] flex flex-col gap-3.5"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back + Floor Info */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToMap}
              className="retro-button px-3 py-2 rounded-xl bg-[#1c1b2b] hover:bg-[#252238] border border-[#2f2d45] text-xs font-extrabold text-[#f4efe6] flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Icon name="back" size={16} />
              <span>{t("กลับเส้นทาง", "Back to Map")}</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="pixel-font text-[10px] px-2 py-0.5 rounded bg-[#5a2d91] text-[#ffe27a] font-black">
                  FLOOR {resolvedFloorIndex + 1}/{resolvedTotalFloors}
                </span>
                {activeTopic.isBoss && (
                  <span className="pixel-font text-[10px] px-2 py-0.5 rounded bg-[#c0283a] text-white font-black">
                    BOSS FLOOR
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-lg font-extrabold text-[#f6c945] truncate mt-0.5">
                {activeTopic.title}
              </h2>
            </div>
          </div>

          {/* Right: Sound Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleSound}
              className="p-2 rounded-xl bg-[#1c1b2b] hover:bg-[#252238] border border-[#2f2d45] text-[#f4efe6] cursor-pointer"
              title={soundEnabled ? t("ปิดเสียง", "Mute") : t("เปิดเสียง", "Unmute")}
            >
              <Icon name={soundEnabled ? "volume-2" : "volume-x"} size={15} />
            </button>
          </div>
        </div>

        {/* Second Row: Current Language Badge + Avatar Quick-Pill & Hearts/Focus/Coins/XP */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2f2d45]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold border border-[#2f2d45] bg-[#1c1b2b] text-[#ffe27a]">
              {trackMeta.name}
            </span>
            {!hasSession && (
              <span className="text-[11px] font-bold text-[#9a93ad]">
                {t("โหมดทดลอง (ไม่บันทึกผล)", "Guest mode (unsaved)")}
              </span>
            )}
          </div>

          {/* Avatar Selector Quick-Pill & Vitals */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Avatar Quick-Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (onChangeHero) {
                    onChangeHero();
                  } else {
                    setShowAvatarMenu((s) => !s);
                  }
                }}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#0d0b14] border border-[#2f2d45] hover:border-[#f6c945] text-xs cursor-pointer transition-colors"
                title={t("เปลี่ยนตัวละครพิกเซล", "Switch Pixel Avatar")}
              >
                <PixelSpriteView sprite={avatar.sprite} size={22} />
                <span className="font-bold text-[#f4efe6] text-[11px] hidden sm:inline">
                  {avatar.name}
                </span>
                <Icon name="chevron-down" size={12} className="text-[#9a93ad]" />
              </button>

              {showAvatarMenu && (
                <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-[#1c1b2b] border border-[#f6c945] shadow-xl p-2 z-40 space-y-1">
                  <div className="text-[10px] font-extrabold text-[#ffe27a] px-2 py-1 uppercase pixel-font">
                    {t("เลือกตัวละคร", "Select Hero")}
                  </div>
                  {AVATARS.map((av) => (
                    <button
                      key={av.key}
                      type="button"
                      onClick={() => handleChangeAvatar(av.key)}
                      className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-left text-xs cursor-pointer transition-colors ${
                        av.key === avatarKey
                          ? "bg-[#5a2d91] text-[#ffe27a]"
                          : "hover:bg-[#252238] text-[#f4efe6]"
                      }`}
                    >
                      <PixelSpriteView sprite={av.sprite} size={24} />
                      <div className="min-w-0">
                        <div className="font-bold truncate">{av.name}</div>
                        <div className="text-[10px] text-[#9a93ad] truncate">
                          {av.key.toUpperCase()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hearts (HP) */}
            <div
              className="flex items-center gap-1 bg-[#0d0b14] px-2.5 py-1 rounded-lg border border-[#2f2d45]"
              title={t("พลังชีวิต", "Hearts (HP)")}
            >
              {Array.from({ length: maxHearts }).map((_, idx) => (
                <span
                  key={idx}
                  className={idx < hearts ? "opacity-100" : "opacity-25 grayscale"}
                >
                  <PixelSpriteView sprite={HEART_SPRITE} size={15} />
                </span>
              ))}
            </div>

            {/* Focus MP */}
            <div
              className="flex items-center gap-1 bg-[#0d0b14] px-2.5 py-1 rounded-lg border border-[#2f2d45] text-[11px] pixel-font font-bold text-[#c084fc]"
              title={t(
                `มานา MP เริ่ม ${initialFocusDisplay}/${maxFocusDisplay} (ตอบถูก +${avatar.stats.mpRegenOnCorrect} MP)`,
                `Focus MP starts ${initialFocusDisplay}/${maxFocusDisplay} (+${avatar.stats.mpRegenOnCorrect} MP per hit)`
              )}
            >
              <Icon name="sparkles" size={13} />
              <span>
                {initialFocusDisplay}/{maxFocusDisplay} MP
              </span>
            </div>

            {/* Coins & XP */}
            <div className="flex items-center gap-2.5 bg-[#0d0b14] px-2.5 py-1 rounded-lg border border-[#2f2d45] text-xs pixel-font font-bold">
              <span className="flex items-center gap-1 text-[#f6c945]">
                <PixelSpriteView sprite={COIN_SPRITE} size={14} />
                <span>{coins}</span>
              </span>
              <span className="text-[#2f2d45]">|</span>
              <span className="text-[#2fbf71]">{xp} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2D RPG Dungeon Room */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left / Center: 2D Pixel RPG Dungeon Canvas + Controls */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="relative">
              <GameCanvas
                room={room}
                avatar={avatar}
                isPaused={isGameOver}
                isInBattle={isInBattle}
                onEncounterEntity={handleEncounterEntity}
                onEnterNextFloor={handleCompleteFloor}
                onAutoPause={() => {}}
                screenShake={screenShake}
              />

              {/* Game Over overlay inside canvas */}
              {isGameOver && (
                <div className="absolute inset-0 rounded-2xl bg-black/85 flex flex-col items-center justify-center p-6 text-center gap-4 z-20">
                  <span className="pixel-font text-xs text-[#ff4d6d] font-black">
                    GAME OVER
                  </span>
                  <h3 className="text-lg font-extrabold text-[#f4efe6]">
                    {t("หัวใจหมด!", "Out of Hearts!")}
                  </h3>
                  <p className="text-xs text-[#9a93ad] max-w-sm">
                    {t(
                      "ลองใช้สกิล Rubber Duck / Trace Lens / Test Oracle ช่วยแกะโค้ดในรอบถัดไป",
                      "Use Rubber Duck, Trace Lens, or Test Oracle next round."
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleRetryFloor}
                    className="retro-button px-5 py-2.5 rounded-xl bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] font-black pixel-font text-xs cursor-pointer"
                  >
                    {t("ลองสู้ใหม่อีกครั้ง (RETRY)", "RETRY FLOOR")}
                  </button>
                </div>
              )}
            </div>

            {/* Compact Action Bar below canvas (no redundant control guide text) */}
            <div className="rounded-xl border border-[#2f2d45] bg-[#1c1b2b] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="font-bold text-[#ffe27a]">
                {room.isDoorUnlocked
                  ? t("🚪 ประตูเปิดแล้ว!", "🚪 Door Unlocked!")
                  : t(
                      `⚔️ ${currentMonster.name} (${phaseQuestions.length} เฟส)`,
                      `⚔️ ${currentMonster.name} (${phaseQuestions.length} phases)`
                    )}
              </div>

              {!room.isDoorUnlocked ? (
                <button
                  type="button"
                  onClick={handleEncounterEntity}
                  className="retro-button px-4 py-2 rounded-xl bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] font-black pixel-font text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Icon name="sword" size={14} />
                  <span>{t("ท้าประลองเลย", "ENGAGE BATTLE")}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteFloor}
                  className="retro-button px-4 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#120f1c] font-black pixel-font text-xs flex items-center gap-1.5 cursor-pointer shrink-0 animate-pulse"
                >
                  <Icon name="trophy" size={14} />
                  <span>{t("ผ่านด่าน →", "COMPLETE FLOOR →")}</span>
                </button>
              )}
            </div>

            {/* Mobile D-Pad */}
            <div className="sm:hidden">
              <MobileDpad
                disabled={isInBattle || isGameOver}
                onMove={(dx, dy) => {
                  const dirKey =
                    dx < 0
                      ? "ArrowLeft"
                      : dx > 0
                      ? "ArrowRight"
                      : dy < 0
                      ? "ArrowUp"
                      : "ArrowDown";
                  const event = new KeyboardEvent("keydown", {
                    key: dirKey,
                    code: dirKey,
                  });
                  window.dispatchEvent(event);
                }}
                onAction={() => {
                  if (room.isDoorUnlocked) {
                    handleCompleteFloor();
                    return;
                  }
                  const event = new KeyboardEvent("keydown", {
                    key: " ",
                    code: "Space",
                  });
                  window.dispatchEvent(event);
                }}
              />
            </div>
          </div>

          {/* Right: Quest Code Scroll & Monster Intel */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="rounded-2xl border border-[#2f2d45] bg-[#1c1b2b] p-4 sm:p-5 space-y-4 text-[#f4efe6]">
              {/* Monster Card */}
              <div className="flex items-center gap-3 pb-3 border-b border-[#2f2d45]">
                <div className="p-2 rounded-xl bg-[#0d0b14] border border-[#2f2d45] shrink-0">
                  <PixelSpriteView sprite={currentMonster.sprite} size={44} animateBounce />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="pixel-font text-[10px] text-[#ff4d6d] font-black">
                      {activeTopic.isBoss ? "DUNGEON BOSS" : "FLOOR GUARDIAN"}
                    </span>
                    <span className="pixel-font text-[10px] bg-[#141220] border border-[#2f2d45] px-2 py-0.5 rounded text-[#ffe27a]">
                      {phaseQuestions.length} {t("เฟส", "PHASES")}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-[#f6c945] truncate">
                    {currentMonster.name}
                  </h3>
                  <p className="text-[11px] text-[#9a93ad] line-clamp-2">
                    {activeTopic.subtitle}
                  </p>
                </div>
              </div>

              {/* Code Scroll Preview + Interactive Trace Stepper */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-extrabold text-[#ffe27a] flex items-center gap-1.5">
                    <Icon name="code" size={14} />
                    <span>
                      {t(
                        `คัมภีร์โค้ดประจำด่าน (${trackMeta.name})`,
                        `Floor Code Scroll (${trackMeta.name})`
                      )}
                    </span>
                  </span>
                  {activeTopic.steps && activeTopic.steps.length > 0 && (
                    <div className="flex items-center gap-1 bg-[#0d0b14] p-0.5 rounded-lg border border-[#2f2d45]">
                      <button
                        type="button"
                        onClick={() => setScrollTab("code")}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition ${
                          scrollTab === "code"
                            ? "bg-[#f6c945] text-[#120f1c]"
                            : "text-[#9a93ad] hover:text-[#f4efe6]"
                        }`}
                      >
                        {t("</> โค้ดเต็ม", "</> Code")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setScrollTab("trace")}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition ${
                          scrollTab === "trace"
                            ? "bg-[#38bdf8] text-[#0d0b14]"
                            : "text-[#9a93ad] hover:text-[#f4efe6]"
                        }`}
                      >
                        {t("👣 ไล่ทีละบรรทัด", "👣 Step Trace")}
                      </button>
                    </div>
                  )}
                </div>

                {scrollTab === "code" || !activeTopic.steps?.length ? (
                  <pre className="p-3 rounded-xl bg-[#0d0b14] border border-[#2f2d45] text-[#ffe27a] text-xs font-mono overflow-x-auto leading-relaxed">
                    <code>{activeTopic.code}</code>
                  </pre>
                ) : (
                  (() => {
                    const step = activeTopic.steps[traceIdx] || activeTopic.steps[0];
                    return (
                      <div className="p-3 rounded-xl bg-[#0d0b14] border border-[#38bdf8]/40 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="pixel-font text-[10px] text-[#38bdf8] font-bold">
                            STEP {traceIdx + 1}/{activeTopic.steps.length} · L{step.line}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={traceIdx <= 0}
                              onClick={() => setTraceIdx((i) => Math.max(0, i - 1))}
                              className="px-2 py-0.5 rounded bg-[#1c1b2b] border border-[#2f2d45] text-[10px] font-bold text-[#f4efe6] disabled:opacity-40 cursor-pointer"
                            >
                              ◀ {t("ย้อน", "Prev")}
                            </button>
                            <button
                              type="button"
                              disabled={traceIdx >= activeTopic.steps.length - 1}
                              onClick={() =>
                                setTraceIdx((i) =>
                                  Math.min(activeTopic.steps.length - 1, i + 1)
                                )
                              }
                              className="px-2 py-0.5 rounded bg-[#38bdf8] text-[#0d0b14] text-[10px] font-black disabled:opacity-40 cursor-pointer"
                            >
                              {t("ถัดไป", "Next")} ▶
                            </button>
                          </div>
                        </div>

                        <div className="font-mono text-[11px] bg-[#141220] px-2.5 py-1.5 rounded border border-[#2f2d45] text-[#ffe27a]">
                          {step.codeLine}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(step.variables).length > 0 ? (
                            Object.entries(step.variables).map(([k, v]) => (
                              <span
                                key={k}
                                className="px-2 py-0.5 rounded bg-[#1c1b2b] border border-[#38bdf8]/40 font-mono text-[11px] text-[#e0f2fe]"
                              >
                                {k} = <strong className="text-[#38bdf8]">{v}</strong>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-[#9a93ad]">
                              {t("ยังไม่มีตัวแปรเปลี่ยนแปลง", "No variables updated")}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#c4bdd6] leading-relaxed">
                          {step.explanation}
                        </p>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Optional Modify Bonus Challenge (Unlocked after Monster Defeated) */}
              {room.isDoorUnlocked && activeTopic.modifyChallenge && (
                <div className="p-3.5 rounded-xl bg-[#141220] border border-[#2fbf71]/50 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#2fbf71] flex items-center gap-1.5">
                      <Icon name="sparkles" size={14} />
                      <span>{t("ภารกิจโบนัสซ่อมโค้ด", "Bonus Modify Challenge")}</span>
                    </span>
                    <span className="pixel-font text-[9px] px-2 py-0.5 rounded bg-[#2fbf71]/20 text-[#86efac] border border-[#2fbf71]/40">
                      {modifyBonusClaimed ? t("✓ รับ +25 XP แล้ว", "✓ +25 XP Claimed") : "+25 XP"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#c4bdd6] leading-relaxed">
                    {activeTopic.modifyChallenge.instruction}{" "}
                    {modifyTargetOutput && (
                      <span className="text-[#ffe27a] font-bold">
                        ({t("ผลลัพธ์เป้าหมาย:", "Target Output:")} {modifyTargetOutput})
                      </span>
                    )}
                  </p>
                  <textarea
                    value={modifiedCode}
                    onChange={(e) => setModifiedCode(e.target.value)}
                    rows={4}
                    spellCheck={false}
                    className="w-full p-2.5 rounded-lg bg-[#0d0b14] border border-[#2f2d45] focus:border-[#2fbf71] text-[#ffe27a] text-xs font-mono outline-none resize-y"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleRunModifyBonus}
                      className="retro-button px-3 py-1.5 rounded-lg bg-[#2fbf71] hover:bg-[#34d37d] text-[#0d0b14] text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Icon name="play" size={12} filled />
                      <span>{t("รันทดสอบ", "Run Test")}</span>
                    </button>
                    {modifyRunResult && (
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          modifyRunResult.matchedTarget ? "text-[#86efac]" : "text-[#fca5a5]"
                        }`}
                      >
                        Output: {modifyRunResult.finalOutput}{" "}
                        {modifyRunResult.matchedTarget ? "✓" : "✗"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Battle Phases Breakdown */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-extrabold text-[#9a93ad] uppercase">
                  {t("ลำดับเฟสการต่อสู้ (Multi-Phase):", "Battle Phases:")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {phaseQuestions.map((pq, idx) => (
                    <span
                      key={pq.id}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#0d0b14] border border-[#2f2d45] text-[#f4efe6]"
                    >
                      {idx + 1}. {pq.blockModelCell || "Quest"}
                    </span>
                  ))}
                </div>
              </div>

              {/* Badge Reward Preview */}
              <div className="p-3 rounded-xl bg-[#0d0b14] border border-[#f6c945]/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="shield" size={20} className="text-[#f6c945] shrink-0" filled />
                  <div className="min-w-0">
                    <div className="text-[10px] text-[#9a93ad] font-bold">
                      {t("รางวัลตราสัญลักษณ์", "Badge Reward")}
                    </div>
                    <div className="text-xs font-extrabold text-[#ffe27a] truncate">
                      {activeTopic.badgeReward.name}
                    </div>
                  </div>
                </div>
                <span className="pixel-font text-[10px] text-[#2fbf71] shrink-0">
                  +XP
                </span>
              </div>
            </div>
          </div>
        </div>

      {/* Multi-Phase Code Battle Overlay */}
      {isInBattle && (
        <BattleOverlay
          runId={`topic-${activeTopic.id}`}
          monster={currentMonster}
          questions={phaseQuestions}
          monsterHp={room.entity?.isCompleted ? 0 : phaseQuestions.length}
          maxMonsterHp={phaseQuestions.length}
          playerHearts={hearts}
          maxPlayerHearts={maxHearts}
          avatarKey={avatarKey}
          initialFocus={initialFocusDisplay}
          maxFocus={maxFocusDisplay}
          localValidation={true}
          onCorrectAnswer={handleCorrectAnswer}
          onWrongAnswer={handleWrongAnswer}
          onHealPlayer={() => setHearts((h) => Math.min(maxHearts, h + 1))}
          onBattleComplete={handleBattleComplete}
          onClose={() => setIsInBattle(false)}
        />
      )}
    </div>
  );
}
