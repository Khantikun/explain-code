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
import { getQuestionsForTopic, getChestQuestion, DungeonQuestion } from "../../lib/dungeon/questions";
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
import { CodeChestModal, InRunRewardType } from "./CodeChestModal";
import { PixelSpriteView } from "./PixelSpriteView";
import { useUiLanguage } from "../LanguageProvider";
import { getClientSession } from "../SiteHeader";
import { Icon } from "../Icons";
import type { DungeonArenaSnapshot } from "../../lib/dungeon-save";

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
  }) => void;
  currentStudent?: StudentRecord | null;
  studentId?: string;
  defaultMode?: "dungeon" | "classic";
  embedded?: boolean;
  avatarKey?: AvatarKey;
  onChangeHero?: () => void;
  customQuestions?: DungeonQuestion[];
  floorBadgeLabel?: string;
  initialSnapshot?: DungeonArenaSnapshot | null;
  onSnapshotChange?: (snapshot: DungeonArenaSnapshot) => void;
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
  customQuestions,
  floorBadgeLabel,
  initialSnapshot = null,
  onSnapshotChange,
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

  // Room & Encounter generation (restore from initialSnapshot if matching this topic & language)
  const matchedSnapshot = useMemo(
    () =>
      initialSnapshot &&
      initialSnapshot.topicId === activeTopic.id &&
      initialSnapshot.language === activeLanguage
        ? initialSnapshot
        : null,
    [initialSnapshot, activeTopic.id, activeLanguage]
  );

  const roomSeed = useMemo(
    () => hashString(`topic-arena-${activeTopic.id}-${activeLanguage}`),
    [activeTopic.id, activeLanguage]
  );

  const [room, setRoom] = useState<DungeonRoom>(() =>
    matchedSnapshot?.room
      ? matchedSnapshot.room
      : generateDungeonRoom(
          roomSeed,
          resolvedFloorIndex,
          resolvedTotalFloors,
          activeTopic.isBoss ? "boss" : "monster"
        )
  );

  const maxHearts = avatar.stats.maxHp;
  const [hearts, setHearts] = useState<number>(
    matchedSnapshot ? matchedSnapshot.hearts : maxHearts
  );
  const [coins, setCoins] = useState<number>(
    matchedSnapshot ? matchedSnapshot.coins : 0
  );
  const [xp, setXp] = useState<number>(matchedSnapshot ? matchedSnapshot.xp : 0);
  const [screenShake, setScreenShake] = useState<number>(0);
  const [isInBattle, setIsInBattle] = useState<boolean>(false);
  const [battleResetNonce, setBattleResetNonce] = useState<number>(0);
  const [isChestOpen, setIsChestOpen] = useState<boolean>(false);
  const [chestBonusXp, setChestBonusXp] = useState<number>(
    matchedSnapshot ? matchedSnapshot.chestBonusXp : 0
  );
  const [chestBonusCoins, setChestBonusCoins] = useState<number>(
    matchedSnapshot ? matchedSnapshot.chestBonusCoins : 0
  );
  const [floorShieldBonus, setFloorShieldBonus] = useState<number>(
    matchedSnapshot ? matchedSnapshot.floorShieldBonus : 0
  );
  const [floorRewardMultiplier, setFloorRewardMultiplier] = useState<number>(
    matchedSnapshot ? matchedSnapshot.floorRewardMultiplier : 1
  );
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [battleSummary, setBattleSummary] = useState<{
    totalXp: number;
    totalCoins: number;
    phaseResults: BattlePhaseResult[];
    noHitClear?: boolean;
    noSkillPurist?: boolean;
  } | null>(null);

  const [battleProgress, setBattleProgress] = useState<{
    phaseIndex: number;
    phaseResults: BattlePhaseResult[];
    focus?: number;
    shieldCharges?: number;
    accumulatedXp: number;
    accumulatedCoins: number;
  }>(() => ({
    phaseIndex: matchedSnapshot?.battlePhaseIndex ?? 0,
    phaseResults: matchedSnapshot?.battlePhaseResults ?? [],
    focus: matchedSnapshot?.battleFocus,
    shieldCharges: matchedSnapshot?.battleShieldCharges,
    accumulatedXp: matchedSnapshot?.battleAccumulatedXp ?? 0,
    accumulatedCoins: matchedSnapshot?.battleAccumulatedCoins ?? 0,
  }));

  const hasSubmittedCompletionRef = useRef<boolean>(false);
  const skippedInitialResetRef = useRef<boolean>(Boolean(matchedSnapshot));

  // Reset room and battle state whenever topic, language, or hero changes (unless restoring initialSnapshot)
  useEffect(() => {
    if (skippedInitialResetRef.current) {
      skippedInitialResetRef.current = false;
      return;
    }
    hasSubmittedCompletionRef.current = false;
    setHearts(avatar.stats.maxHp);
    setCoins(0);
    setXp(0);
    setIsInBattle(false);
    setBattleResetNonce((n) => n + 1);
    setIsChestOpen(false);
    setChestBonusXp(0);
    setChestBonusCoins(0);
    setFloorShieldBonus(0);
    setFloorRewardMultiplier(1);
    setIsGameOver(false);
    setBattleSummary(null);
    setBattleProgress({
      phaseIndex: 0,
      phaseResults: [],
      accumulatedXp: 0,
      accumulatedCoins: 0,
    });
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

  useEffect(() => {
    onSnapshotChange?.({
      topicId: activeTopic.id,
      language: activeLanguage,
      room,
      hearts,
      coins,
      xp,
      chestBonusXp,
      chestBonusCoins,
      floorShieldBonus,
      floorRewardMultiplier,
      modifyBonusClaimed,
      battlePhaseIndex: battleProgress.phaseIndex,
      battlePhaseResults: battleProgress.phaseResults,
      battleFocus: battleProgress.focus,
      battleShieldCharges: battleProgress.shieldCharges,
      battleAccumulatedXp: battleProgress.accumulatedXp,
      battleAccumulatedCoins: battleProgress.accumulatedCoins,
    });
  }, [
    activeTopic.id,
    activeLanguage,
    room,
    hearts,
    coins,
    xp,
    chestBonusXp,
    chestBonusCoins,
    floorShieldBonus,
    floorRewardMultiplier,
    modifyBonusClaimed,
    battleProgress,
    onSnapshotChange,
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
    () =>
      customQuestions && customQuestions.length > 0
        ? customQuestions
        : getQuestionsForTopic(activeTopic, activeLanguage),
    [customQuestions, activeTopic, activeLanguage]
  );

  const chestQuestion = useMemo(
    () => getChestQuestion(activeTopic.id, activeLanguage, phaseQuestions[0]?.id),
    [activeTopic.id, activeLanguage, phaseQuestions]
  );

  const handleEncounterEntity = useCallback(() => {
    if (!room.entity?.isCompleted && !isGameOver) {
      setIsInBattle(true);
    }
  }, [room.entity?.isCompleted, isGameOver]);

  const handleEncounterChest = useCallback(() => {
    if (room.chest && !room.chest.isOpened && !isGameOver) {
      setIsChestOpen(true);
    }
  }, [room.chest, isGameOver]);

  const handleChestSolved = useCallback(
    (reward: { xpAwarded: number; coinsAwarded: number }) => {
      setChestBonusXp((prev) => prev + reward.xpAwarded);
      setChestBonusCoins((prev) => prev + reward.coinsAwarded);
      setXp((prev) => prev + reward.xpAwarded);
      setCoins((prev) => prev + reward.coinsAwarded);
      setRoom((prev) =>
        prev.chest ? { ...prev, chest: { ...prev.chest, isOpened: true } } : prev
      );
    },
    []
  );

  const handleSelectInRunReward = useCallback(
    (rewardType: InRunRewardType) => {
      if (rewardType === "heal_hp") {
        setHearts((h) => Math.min(maxHearts, h + 1));
      } else if (rewardType === "add_shield") {
        setFloorShieldBonus((s) => s + 1);
      } else if (rewardType === "double_rewards") {
        setFloorRewardMultiplier(2);
        if (battleSummary && floorRewardMultiplier === 1) {
          const extraBattleXp = battleSummary.totalXp;
          const extraBattleCoins = battleSummary.totalCoins;
          setBattleSummary((prev) =>
            prev
              ? {
                  ...prev,
                  totalXp: prev.totalXp * 2,
                  totalCoins: prev.totalCoins * 2,
                }
              : prev
          );
          setXp((prev) => prev + extraBattleXp);
          setCoins((prev) => prev + extraBattleCoins);
        }
      }
    },
    [maxHearts, battleSummary, floorRewardMultiplier]
  );

  const handleBattleComplete = useCallback(
    (summary: {
      totalXp: number;
      totalCoins: number;
      phaseResults: BattlePhaseResult[];
      noHitClear?: boolean;
      noSkillPurist?: boolean;
    }) => {
      setBattleSummary(summary);
      const sideQuestXp =
        (summary.noHitClear ? 15 : 0) + (summary.noSkillPurist ? 15 : 0);
      setXp(
        summary.totalXp +
          sideQuestXp +
          (modifyBonusClaimed ? 25 : 0) +
          chestBonusXp
      );
      setCoins(summary.totalCoins + chestBonusCoins);
      dungeonSound.playDoorOpen();

      setRoom((prev) => ({
        ...prev,
        entity: prev.entity ? { ...prev.entity, hp: 0, isCompleted: true } : null,
        isDoorUnlocked: true,
      }));
    },
    [modifyBonusClaimed, chestBonusXp, chestBonusCoins]
  );

  const handleCorrectAnswer = useCallback(() => {
    setRoom((prev) => ({
      ...prev,
      entity: prev.entity ? { ...prev.entity, hp: 0, isCompleted: true } : null,
      isDoorUnlocked: true,
    }));
  }, []);

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
    setBattleResetNonce((n) => n + 1);
    setIsChestOpen(false);
    setChestBonusXp(0);
    setChestBonusCoins(0);
    setFloorShieldBonus(0);
    setFloorRewardMultiplier(1);
    setBattleSummary(null);
    setBattleProgress({
      phaseIndex: 0,
      phaseResults: [],
      accumulatedXp: 0,
      accumulatedCoins: 0,
    });
    setModifyBonusClaimed(false);
    setModifyRunResult(null);
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

    const answers =
      activeTopic.questions.length > 0
        ? activeTopic.questions.map((q) => {
            const matched = results.find((r) => r.questionId.endsWith(q.id));
            return {
              questionId: q.id,
              cellId: q.cellId,
              chosenOptionId: q.correctOptionId,
              isCorrect: matched ? matched.isCorrectFirstTry : true,
              tries: matched ? matched.tries : 1,
              xpEarned: matched ? matched.xpEarned : 20,
            };
          })
        : results.map((r) => ({
            questionId: r.questionId,
            cellId: r.blockModelCell || "E4",
            chosenOptionId: null,
            isCorrect: r.isCorrectFirstTry,
            tries: r.tries,
            xpEarned: r.xpEarned,
          }));

    const sideQuestXp =
      (battleSummary?.noHitClear ? 15 : 0) +
      (battleSummary?.noSkillPurist ? 15 : 0) +
      (modifyBonusClaimed ? 25 : 0) +
      chestBonusXp;
    const totalEarnedXp = Math.max(
      30,
      battleSummary ? battleSummary.totalXp + sideQuestXp : xp
    );

    const extraBadgeIds: string[] = [];
    if (battleSummary?.noHitClear) extraBadgeIds.push("secret-no-hit");
    if (battleSummary?.noSkillPurist) extraBadgeIds.push("secret-no-skill");
    if (modifyBonusClaimed) extraBadgeIds.push("secret-bug-hunter");
    if (room.chest?.isOpened) extraBadgeIds.push("secret-chest-raider");

    onCompleteTopic({
      topicId: activeTopic.id,
      earnedXp: totalEarnedXp,
      updatedCellScores,
      badgeId: activeTopic.badgeReward.id,
      extraBadgeIds: extraBadgeIds.length > 0 ? extraBadgeIds : undefined,
      scorePercent,
      answers,
    });
  }, [battleSummary, modifyBonusClaimed, chestBonusXp, room.chest?.isOpened, activeTopic, xp, onCompleteTopic]);

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
                  {floorBadgeLabel || `FLOOR ${resolvedFloorIndex + 1}/${resolvedTotalFloors}`}
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
              <span className="hidden sm:inline text-[11px] font-bold text-[#9a93ad]">
                {t("โหมดทดลอง (ไม่บันทึกผล)", "Guest mode (unsaved)")}
              </span>
            )}
          </div>

          {/* Vitals */}
          <div className="flex items-center gap-2.5 flex-wrap">
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
                isInBattle={isInBattle || isChestOpen}
                onEncounterEntity={handleEncounterEntity}
                onEncounterChest={handleEncounterChest}
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

            {/* Door Unlocked Action Bar (shown only after monster is defeated) */}
            {room.isDoorUnlocked && (
              <div className="rounded-xl border border-[#2f2d45] bg-[#1c1b2b] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="font-bold text-[#ffe27a]">
                  {t("🚪 ประตูเปิดแล้ว!", "🚪 Door Unlocked!")}
                </div>
                <button
                  type="button"
                  onClick={handleCompleteFloor}
                  className="retro-button px-4 py-2 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#120f1c] font-black pixel-font text-xs flex items-center gap-1.5 cursor-pointer shrink-0 animate-pulse"
                >
                  <Icon name="trophy" size={14} />
                  <span>{t("ผ่านด่าน →", "COMPLETE FLOOR →")}</span>
                </button>
              </div>
            )}

            {/* Touch D-Pad (shown on mobile & tablet below lg) */}
            <div className="lg:hidden">
              <MobileDpad
                disabled={isInBattle || isChestOpen || isGameOver}
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

          {/* Right: Quest Code Scroll & Monster Intel (hidden on mobile until monster is defeated) */}
          <div
            className={`${
              room.isDoorUnlocked ? "flex" : "hidden lg:flex"
            } lg:col-span-5 flex-col gap-4`}
          >
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
                    <code>
                      {activeTopic.code.split("\n").map((line, lineIdx) => (
                        <div key={lineIdx} className="flex items-start gap-3">
                          <span className="w-6 shrink-0 text-right text-[#6b6580] select-none tabular-nums">
                            {lineIdx + 1}
                          </span>
                          <span className="whitespace-pre">{line || " "}</span>
                        </div>
                      ))}
                    </code>
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
                <div
                  id="bug-hunter-panel"
                  className="p-3.5 rounded-xl bg-[#141220] border border-[#2fbf71]/50 space-y-2.5 animate-in fade-in duration-200"
                >
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

      {/* Code Chest Event Modal */}
      {isChestOpen && (
        <CodeChestModal
          question={chestQuestion}
          xpReward={20}
          coinReward={15}
          onSolved={handleChestSolved}
          onSelectInRunReward={handleSelectInRunReward}
          onClose={() => setIsChestOpen(false)}
        />
      )}

      {/* Multi-Phase Code Battle Overlay (keep mounted across close/reopen so current question progress is preserved) */}
      <BattleOverlay
        key={`battle-${activeTopic.id}-${activeLanguage}-${battleResetNonce}`}
        isOpen={isInBattle}
        runId={`topic-${activeTopic.id}`}
        monster={currentMonster}
        questions={phaseQuestions}
        monsterHp={room.entity?.isCompleted ? 0 : phaseQuestions.length}
        maxMonsterHp={phaseQuestions.length}
        playerHearts={hearts}
        maxPlayerHearts={maxHearts}
        avatarKey={avatarKey}
        initialFocus={battleProgress.focus ?? initialFocusDisplay}
        maxFocus={maxFocusDisplay}
        extraShield={floorShieldBonus}
        rewardMultiplier={floorRewardMultiplier}
        localValidation={true}
        initialPhaseIndex={battleProgress.phaseIndex}
        initialPhaseResults={battleProgress.phaseResults}
        initialAccumulatedXp={battleProgress.accumulatedXp}
        initialAccumulatedCoins={battleProgress.accumulatedCoins}
        initialShieldCharges={battleProgress.shieldCharges}
        onProgressChange={setBattleProgress}
        onCorrectAnswer={handleCorrectAnswer}
        onWrongAnswer={handleWrongAnswer}
        onHealPlayer={() => setHearts((h) => Math.min(maxHearts, h + 1))}
        onBattleComplete={handleBattleComplete}
        onClose={() => setIsInBattle(false)}
      />
    </div>
  );
}
