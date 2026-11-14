"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MonsterDef } from "../../lib/dungeon/monsters";
import { DungeonQuestion, DungeonTraceStep } from "../../lib/dungeon/questions";
import { AvatarKey, getAvatar, HEART_SPRITE, HeroSkillDef } from "../../lib/dungeon/sprites";
import { runCodeByLanguage } from "../../lib/language-tracks";
import { PixelSpriteView } from "./PixelSpriteView";
import { dungeonSound } from "../../lib/dungeon/sound";
import { useUiLanguage } from "../LanguageProvider";
import { Icon } from "../Icons";

export interface BattlePhaseResult {
  questionId: string;
  blockModelCell?: string;
  isCorrectFirstTry: boolean;
  tries: number;
  xpEarned: number;
}

interface BattleOverlayProps {
  runId?: string;
  monster: MonsterDef;
  question?: DungeonQuestion;
  questions?: DungeonQuestion[];
  monsterHp: number;
  maxMonsterHp: number;
  playerHearts: number;
  maxPlayerHearts?: number;
  avatarKey?: AvatarKey;
  courseId?: string;
  lessonId?: string;
  initialFocus?: number;
  maxFocus?: number;
  localValidation?: boolean;
  onCorrectAnswer: (xpAwarded?: number, coinsAwarded?: number, lessonCompleted?: boolean) => void;
  onWrongAnswer: () => void;
  onHealPlayer?: () => void;
  onBattleComplete?: (summary: {
    totalXp: number;
    totalCoins: number;
    phaseResults: BattlePhaseResult[];
  }) => void;
  onClose: () => void;
}

function buildFallbackHint(q: DungeonQuestion, isEn: boolean): string {
  const cell = (q.blockModelCell || "").toUpperCase();
  if (cell.startsWith("T")) {
    return isEn
      ? "Focus closely on keywords, operators, variables, and block boundaries in the snippet."
      : "ลองสังเกตคีย์เวิร์ด เครื่องหมาย ตัวแปร และขอบเขตบล็อกในโค้ดให้ละเอียด";
  }
  if (cell.startsWith("E")) {
    return isEn
      ? "Trace each variable's value line by line from top to bottom as the code executes."
      : "ลองไล่ค่าตัวแปรและลำดับการทำงานทีละบรรทัดจากบนลงล่าง";
  }
  if (cell.startsWith("F")) {
    return isEn
      ? "Ask yourself what problem or goal this block of code is trying to solve."
      : "ลองพิจารณาว่าโค้ดส่วนนี้ถูกเขียนขึ้นมาเพื่อทำหน้าที่หรือแก้ปัญหาอะไร";
  }
  return isEn
    ? "Compare the remaining choices carefully against the code!"
    : "ลองเปรียบเทียบตัวเลือกที่เหลือกับโค้ดดูอีกครั้ง!";
}

function deriveTraceSteps(q: DungeonQuestion, isEn: boolean): DungeonTraceStep[] {
  if (q.traceSteps && q.traceSteps.length > 0) {
    return q.traceSteps;
  }
  if (!q.codeSnippet) {
    return [
      {
        line: 1,
        codeLine: q.phaseLabel || "Concept Check",
        variables: { target: q.blockModelCell || "Block Model" },
        explanation: isEn
          ? q.hintEn || q.hint || "Inspect the syntax and behavior described in the prompt."
          : q.hint || "พิจารณาโครงสร้างและหลักการทำงานตามโจทย์ด้านบน",
      },
    ];
  }

  const lines = q.codeSnippet.split("\n");
  const steps: DungeonTraceStep[] = [];
  const trackedVars: Record<string, string> = {};

  lines.forEach((raw, idx) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("--")) {
      return;
    }
    const assignMatch = trimmed.match(/^(?:let|const|var|int|double|float|String|string)?\s*([a-zA-Z_]\w*)(?:\s*:\s*[^=]+)?\s*=\s*([^;]+)/);
    if (assignMatch) {
      trackedVars[assignMatch[1]] = assignMatch[2].trim();
    }
    steps.push({
      line: idx + 1,
      codeLine: trimmed,
      variables: { ...trackedVars },
      explanation: isEn ? `Execute line ${idx + 1}: ${trimmed}` : `ประมวลผลบรรทัดที่ ${idx + 1}: ${trimmed}`,
    });
  });

  return steps.length > 0
    ? steps
    : [
        {
          line: 1,
          codeLine: q.codeSnippet.split("\n")[0] || "",
          variables: {},
          explanation: isEn ? "Trace from line 1." : "เริ่มไล่การทำงานจากบรรทัดแรก",
        },
      ];
}

export function BattleOverlay({
  runId,
  monster,
  question,
  questions,
  monsterHp,
  maxMonsterHp,
  playerHearts,
  maxPlayerHearts,
  avatarKey,
  courseId,
  lessonId,
  initialFocus,
  maxFocus,
  localValidation = false,
  onCorrectAnswer,
  onWrongAnswer,
  onHealPlayer,
  onBattleComplete,
  onClose,
}: BattleOverlayProps) {
  const { uiLang, t } = useUiLanguage();
  const isEn = uiLang === "en";

  const heroDef = useMemo(() => getAvatar(avatarKey), [avatarKey]);
  const heroStats = heroDef.stats;
  const heroSkills = heroDef.skills;
  const effectiveMaxHearts = maxPlayerHearts ?? heroStats.maxHp;

  const phaseQuestions = useMemo<DungeonQuestion[]>(() => {
    if (questions && questions.length > 0) return questions;
    if (question) return [question];
    return [];
  }, [questions, question]);

  const isMultiPhase = phaseQuestions.length > 1;
  const totalPhases = Math.max(1, phaseQuestions.length);

  const [phaseIndex, setPhaseIndex] = useState<number>(0);
  const activeQuestion = phaseQuestions[phaseIndex] || phaseQuestions[0];

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [serverExplanation, setServerExplanation] = useState<string>("");
  const [flashDamage, setFlashDamage] = useState<"monster" | "player" | null>(null);

  // Tracking multi-phase combat progress & retries
  const [phaseTries, setPhaseTries] = useState<number>(0);
  const [phaseResults, setPhaseResults] = useState<BattlePhaseResult[]>([]);
  const [accumulatedXp, setAccumulatedXp] = useState<number>(0);
  const [accumulatedCoins, setAccumulatedCoins] = useState<number>(0);
  const [hasReportedCompletion, setHasReportedCompletion] = useState<boolean>(false);

  // Focus / Mana (MP) & Hero-specific Skills + Shield state
  const computedMaxFocus = maxFocus ?? heroStats.maxMp;
  const [focus, setFocus] = useState<number>(() =>
    Math.min(computedMaxFocus, initialFocus ?? heroStats.initialMp)
  );
  const [shieldCharges, setShieldCharges] = useState<number>(
    heroStats.startingShield
  );
  const [usedSkillIds, setUsedSkillIds] = useState<string[]>([]);
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const [eliminatedChoices, setEliminatedChoices] = useState<number[]>([]);
  const [revealedHint, setRevealedHint] = useState<boolean>(false);
  const [revealedTrace, setRevealedTrace] = useState<boolean>(false);
  const [traceStepIdx, setTraceStepIdx] = useState<number>(0);
  const [revealedOracleOutput, setRevealedOracleOutput] = useState<string | null>(null);
  const [relicNotice, setRelicNotice] = useState<string | null>(null);

  const resetPhaseInteraction = useCallback(() => {
    setSelectedChoice(null);
    setIsSubmitted(false);
    setIsCorrect(null);
    setServerExplanation("");
    setFlashDamage(null);
    setPhaseTries(0);
    setUsedSkillIds([]);
    setEliminatedChoices([]);
    setRevealedHint(false);
    setRevealedTrace(false);
    setTraceStepIdx(0);
    setRevealedOracleOutput(null);
    setRelicNotice(null);
  }, []);

  const displayQuestionText = activeQuestion
    ? isEn
      ? activeQuestion.questionEn || activeQuestion.question
      : activeQuestion.question
    : "";

  const displayChoices = useMemo(() => {
    if (!activeQuestion) return [];
    if (isEn && activeQuestion.choicesEn && activeQuestion.choicesEn.length === activeQuestion.choices.length) {
      return activeQuestion.choicesEn;
    }
    return activeQuestion.choices;
  }, [activeQuestion, isEn]);

  const displayExplanation = useMemo(() => {
    if (!activeQuestion) return "";
    if (isEn && activeQuestion.explanationEn) return activeQuestion.explanationEn;
    return serverExplanation || activeQuestion.explanation;
  }, [activeQuestion, isEn, serverExplanation]);

  const derivedTraceSteps = useMemo(() => {
    if (!activeQuestion) return [];
    return deriveTraceSteps(activeQuestion, isEn);
  }, [activeQuestion, isEn]);

  const handleSelectChoice = (index: number) => {
    if (isSubmitted || isSubmitting || eliminatedChoices.includes(index)) return;
    if (selectedChoice === index) {
      void handleSubmit(index);
      return;
    }
    setSelectedChoice(index);
  };

  const eliminateWrongChoices = useCallback(
    (count: number) => {
      if (!activeQuestion) return;
      const wrongIndices = displayChoices
        .map((_, idx) => idx)
        .filter(
          (idx) =>
            idx !== activeQuestion.correctIndex && !eliminatedChoices.includes(idx)
        );
      const toEliminate = wrongIndices.slice(0, count);
      if (toEliminate.length > 0) {
        setEliminatedChoices((prev) => [...prev, ...toEliminate]);
        if (selectedChoice !== null && toEliminate.includes(selectedChoice)) {
          setSelectedChoice(null);
        }
      }
    },
    [activeQuestion, displayChoices, eliminatedChoices, selectedChoice]
  );

  const computeOracleOutput = useCallback((): string => {
    if (!activeQuestion) return "OK";
    let outputText = activeQuestion.expectedOutput?.trim() || "";
    if (!outputText && activeQuestion.codeSnippet) {
      const sim = runCodeByLanguage(
        activeQuestion.codeSnippet,
        activeQuestion.language || "javascript"
      );
      if (sim.success && sim.finalOutput.trim()) {
        outputText = sim.finalOutput.trim();
      }
    }
    if (!outputText) {
      outputText = displayChoices[activeQuestion.correctIndex] || "OK";
    }
    return outputText;
  }, [activeQuestion, displayChoices]);

  const handleUseHeroSkill = (skill: HeroSkillDef) => {
    const cooldownLeft = skillCooldowns[skill.id] ?? 0;
    if (
      !activeQuestion ||
      isSubmitted ||
      isSubmitting ||
      usedSkillIds.includes(skill.id) ||
      cooldownLeft > 0
    ) {
      return;
    }
    if (focus < skill.mpCost) {
      setRelicNotice(
        t(
          `MP ไม่พอ (ต้องการ ${skill.mpCost} MP)`,
          `Not enough MP (needs ${skill.mpCost} MP)`
        )
      );
      return;
    }

    switch (skill.effect) {
      case "hint_cut1":
        eliminateWrongChoices(1);
        setRevealedHint(true);
        break;
      case "cut1":
        eliminateWrongChoices(1);
        break;
      case "shield":
        setShieldCharges((prev) => prev + 1);
        break;
      case "trace":
        setRevealedTrace(true);
        setTraceStepIdx(0);
        break;
      case "trace_cut1":
        setRevealedTrace(true);
        setTraceStepIdx(0);
        eliminateWrongChoices(1);
        break;
      case "output":
        setRevealedOracleOutput(computeOracleOutput());
        break;
      case "cut2_hint":
        eliminateWrongChoices(2);
        setRevealedHint(true);
        break;
      case "output_cut2":
        eliminateWrongChoices(2);
        setRevealedOracleOutput(computeOracleOutput());
        break;
      case "cut2_heal":
        eliminateWrongChoices(2);
        onHealPlayer?.();
        break;
      case "full_oracle":
        eliminateWrongChoices(2);
        setRevealedTrace(true);
        setTraceStepIdx(0);
        setRevealedOracleOutput(computeOracleOutput());
        break;
    }

    setUsedSkillIds((prev) => [...prev, skill.id]);
    setSkillCooldowns((prev) => ({
      ...prev,
      [skill.id]: skill.cooldownPhases,
    }));
    setFocus((prev) => Math.max(0, prev - skill.mpCost));
    dungeonSound.playCoin();
    setRelicNotice(
      `${isEn ? skill.nameEn : skill.name} (-${skill.mpCost} MP): ${
        isEn ? skill.descriptionEn : skill.description
      } (${t(`คูลดาวน์ ${skill.cooldownPhases} เฟส`, `CD ${skill.cooldownPhases} phase${skill.cooldownPhases > 1 ? "s" : ""}`)})`
    );
  };

  const handleSubmit = useCallback(async (choiceOverride?: number) => {
    const chosenIndex = choiceOverride ?? selectedChoice;
    if (!activeQuestion || chosenIndex === null || isSubmitted || isSubmitting) return;

    setIsSubmitting(true);
    let correct = false;
    let explanationText = activeQuestion.explanation;
    let xp = activeQuestion.difficulty === "hard" ? 35 : activeQuestion.difficulty === "medium" ? 25 : 20;
    let coins = activeQuestion.difficulty === "hard" ? 20 : 10;
    let isLessonDone = false;

    const useLocalOnly = localValidation || isMultiPhase;

    if (useLocalOnly) {
      correct = chosenIndex === activeQuestion.correctIndex;
    } else {
      try {
        const res = await fetch("/api/dungeon/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: runId || "trial",
            questionId: activeQuestion.id,
            selectedIndex: chosenIndex,
            courseId,
            lessonId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          correct = Boolean(data.isCorrect);
          explanationText = data.explanation || explanationText;
          xp = data.xpAwarded ?? xp;
          coins = data.coinsAwarded ?? coins;
          isLessonDone = Boolean(data.lessonCompleted);
        } else {
          correct = selectedChoice === activeQuestion.correctIndex;
        }
      } catch {
        correct = selectedChoice === activeQuestion.correctIndex;
      }
    }

    setIsSubmitting(false);
    setIsSubmitted(true);
    setIsCorrect(correct);
    setServerExplanation(explanationText);

    if (correct) {
      setFlashDamage("monster");
      dungeonSound.playHit();
      setFocus((prev) => Math.min(computedMaxFocus, prev + heroStats.mpRegenOnCorrect));

      const firstTry = phaseTries === 0;
      const baseAdjustedXp = firstTry ? xp : Math.max(10, Math.round(xp * 0.75));
      const adjustedXp = Math.round(baseAdjustedXp * heroStats.xpMultiplier);
      const adjustedCoins = Math.round(coins * heroStats.coinMultiplier);
      const newResult: BattlePhaseResult = {
        questionId: activeQuestion.id,
        blockModelCell: activeQuestion.blockModelCell,
        isCorrectFirstTry: firstTry,
        tries: phaseTries + 1,
        xpEarned: adjustedXp,
      };

      const nextResults = [...phaseResults, newResult];
      const nextTotalXp = accumulatedXp + adjustedXp;
      const nextTotalCoins = accumulatedCoins + adjustedCoins;

      setPhaseResults(nextResults);
      setAccumulatedXp(nextTotalXp);
      setAccumulatedCoins(nextTotalCoins);

      const isFinalPhase = phaseIndex >= totalPhases - 1;
      if (isFinalPhase && !hasReportedCompletion) {
        setHasReportedCompletion(true);
        if (isMultiPhase) {
          onCorrectAnswer(nextTotalXp, nextTotalCoins, isLessonDone);
          onBattleComplete?.({
            totalXp: nextTotalXp,
            totalCoins: nextTotalCoins,
            phaseResults: nextResults,
          });
        } else {
          onCorrectAnswer(adjustedXp, adjustedCoins, isLessonDone);
          onBattleComplete?.({
            totalXp: adjustedXp,
            totalCoins: adjustedCoins,
            phaseResults: nextResults,
          });
        }
      }
    } else {
      setFlashDamage("player");
      setPhaseTries((prev) => prev + 1);
      dungeonSound.playHurt();
      if (shieldCharges > 0) {
        setShieldCharges((prev) => Math.max(0, prev - 1));
        setRelicNotice(
          t(
            "🛡️ โล่ป้องกันทำงาน! ดูดซับดาเมจสำเร็จ ไม่เสียหัวใจ",
            "🛡️ Shield Blocked! Absorbed damage without losing a heart."
          )
        );
      } else {
        onWrongAnswer();
      }
    }
  }, [
    activeQuestion,
    selectedChoice,
    isSubmitted,
    isSubmitting,
    localValidation,
    isMultiPhase,
    runId,
    courseId,
    lessonId,
    phaseTries,
    phaseResults,
    accumulatedXp,
    accumulatedCoins,
    phaseIndex,
    totalPhases,
    computedMaxFocus,
    heroStats,
    shieldCharges,
    hasReportedCompletion,
    onCorrectAnswer,
    onBattleComplete,
    onWrongAnswer,
    t,
  ]);

  const handleNextPhase = useCallback(() => {
    if (phaseIndex < totalPhases - 1) {
      setSkillCooldowns((prev) => {
        const next: Record<string, number> = {};
        for (const [skillId, cd] of Object.entries(prev)) {
          if (usedSkillIds.includes(skillId)) {
            next[skillId] = cd;
          } else if (cd > 1) {
            next[skillId] = cd - 1;
          }
        }
        return next;
      });
      setPhaseIndex((prev) => prev + 1);
      resetPhaseInteraction();
    }
  }, [phaseIndex, totalPhases, usedSkillIds, resetPhaseInteraction]);

  const handleRetryPhase = useCallback(() => {
    if (selectedChoice !== null) {
      setEliminatedChoices((prev) =>
        prev.includes(selectedChoice) ? prev : [...prev, selectedChoice]
      );
    }
    setSelectedChoice(null);
    setIsSubmitted(false);
    setIsCorrect(null);
    setServerExplanation("");
    setFlashDamage(null);
  }, [selectedChoice]);

  // Keyboard shortcut listener for Escape, numbers 1-4, and Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeQuestion) return;
      if (e.key === "Escape" && !isSubmitting) {
        e.preventDefault();
        onClose();
        return;
      }
      if (isSubmitted) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isCorrect) {
            if (phaseIndex < totalPhases - 1) {
              handleNextPhase();
            } else {
              onClose();
            }
          } else if (isMultiPhase && playerHearts > 0) {
            handleRetryPhase();
          } else {
            onClose();
          }
        }
        return;
      }

      if (e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (idx < displayChoices.length && !eliminatedChoices.includes(idx)) {
          setSelectedChoice(idx);
        }
      } else if (e.key === "Enter" && selectedChoice !== null) {
        e.preventDefault();
        void handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeQuestion,
    selectedChoice,
    isSubmitted,
    isSubmitting,
    isCorrect,
    isMultiPhase,
    playerHearts,
    phaseIndex,
    totalPhases,
    displayChoices.length,
    eliminatedChoices,
    handleSubmit,
    handleNextPhase,
    handleRetryPhase,
    onClose,
  ]);

  if (!activeQuestion) return null;

  const displayMaxMonsterHp = isMultiPhase ? totalPhases : maxMonsterHp;
  const displayCurrentMonsterHp = isMultiPhase
    ? Math.max(0, totalPhases - phaseIndex - (isSubmitted && isCorrect ? 1 : 0))
    : Math.max(0, monsterHp - (isCorrect ? 1 : 0));

  const isMonsterDefeated = displayCurrentMonsterHp <= 0;
  const hasMorePhases = phaseIndex < totalPhases - 1;
  const currentTraceStep = derivedTraceSteps[traceStepIdx] || derivedTraceSteps[0];
  const duckHintText = isEn
    ? activeQuestion.hintEn || activeQuestion.hint || buildFallbackHint(activeQuestion, true)
    : activeQuestion.hint || buildFallbackHint(activeQuestion, false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xs select-none overflow-y-auto">
      <div className="retro-panel rounded-2xl max-w-2xl w-full p-4 sm:p-6 flex flex-col gap-4 text-[#f4efe6] relative overflow-hidden my-auto max-h-[95vh] overflow-y-auto">
        {/* Top-Right Close Button (Only Exit Button) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-lg bg-[#252238] hover:bg-[#c0283a]/85 border border-[#4a4766] hover:border-[#ff4d6d] text-sm font-black text-[#f4efe6] flex items-center justify-center leading-none transition-colors cursor-pointer"
          title={t("ออกจากการต่อสู้", "Exit battle")}
          aria-label={t("ออกจากการต่อสู้", "Exit battle")}
        >
          ✕
        </button>

        {/* Battle Header: Monster Card (Left) separated from Player Card (Right) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 border-b border-[#4a4766] pb-3.5 pr-10 items-stretch">
          {/* Left Card: Monster Profile + Monster HP right next to it */}
          <div className="sm:col-span-7 flex items-center gap-3 p-2.5 rounded-xl bg-[#120f1c] border border-[#c0283a]/40">
            <div
              className={`p-2 rounded-xl bg-[#1c1b2b] border-2 border-[#4a4766] flex items-center justify-center shrink-0 transition-transform ${
                flashDamage === "monster" ? "scale-110 bg-[#c0283a] ring-4 ring-[#ff4d6d]" : ""
              }`}
            >
              <PixelSpriteView sprite={monster.sprite} size={44} animateBounce />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-[#f6c945] text-sm sm:text-base truncate">
                  {monster.name}
                </h3>
                {isMultiPhase && (
                  <span className="pixel-font text-[9px] bg-[#5a2d91] text-[#ffe27a] px-1.5 py-0.5 rounded font-black">
                    PHASE {phaseIndex + 1}/{totalPhases}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#9a93ad] truncate">{monster.title}</div>
              {/* Monster HP right beside/under Monster profile */}
              <div className="flex items-center gap-2">
                <span className="pixel-font text-[10px] font-black text-[#ff4d6d] shrink-0">
                  HP {displayCurrentMonsterHp}/{displayMaxMonsterHp}
                </span>
                <div className="flex-1 h-2.5 bg-[#0b0a12] rounded-full overflow-hidden border border-[#4a4766]">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff4d6d] to-[#c0283a] transition-all duration-300"
                    style={{
                      width: `${Math.max(0, (displayCurrentMonsterHp / Math.max(1, displayMaxMonsterHp)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Player Vitals (Hearts + Shield + MP) */}
          <div className="sm:col-span-5 flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#120f1c] border border-[#38bdf8]/35">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-extrabold text-[#ffe27a] truncate">
                    {isEn ? heroDef.nameEn : heroDef.name}
                  </span>
                  {shieldCharges > 0 && (
                    <span
                      className="pixel-font text-[9px] px-1.5 py-0.5 rounded bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/50 shrink-0"
                      title={t("โล่ป้องกันความเสียหาย", "Damage Shield Charges")}
                    >
                      🛡️×{shieldCharges}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0" title={t("พลังชีวิต", "Player Hearts")}>
                  {Array.from({ length: effectiveMaxHearts }).map((_, idx) => (
                    <span
                      key={idx}
                      className={idx < playerHearts ? "opacity-100" : "opacity-25 grayscale"}
                    >
                      <PixelSpriteView sprite={HEART_SPRITE} size={13} />
                    </span>
                  ))}
                </div>
              </div>
              {/* Player Mana / Focus Bar */}
              <div className="flex items-center gap-2">
                <span className="pixel-font text-[10px] font-bold text-[#38bdf8] shrink-0">
                  💧 MP {focus}/{computedMaxFocus}
                </span>
                <div className="flex-1 h-2 bg-[#0b0a12] rounded-full overflow-hidden border border-[#38bdf8]/40">
                  <div
                    className="h-full bg-gradient-to-r from-[#38bdf8] to-[#0284c7] transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, (focus / Math.max(1, computedMaxFocus)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Question Header Badges */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="pixel-font text-[10px] text-[#ffe27a] bg-[#5a2d91] px-2 py-0.5 rounded font-bold">
              {t("QUIZ ATTACK", "QUIZ ATTACK")}
            </span>
            {activeQuestion.language && (
              <span className="pixel-font text-[10px] text-[#38bdf8] bg-[#0c4a6e]/40 border border-[#38bdf8]/40 px-2 py-0.5 rounded font-bold uppercase">
                {activeQuestion.language}
              </span>
            )}
            {activeQuestion.phaseLabel && (
              <span className="text-[10px] font-extrabold text-[#f6c945] bg-[#120f1c] px-2 py-0.5 rounded border border-[#f6c945]/40">
                {activeQuestion.phaseLabel}
              </span>
            )}
            {activeQuestion.blockModelCell && (
              <span className="text-[10px] font-bold text-[#2fbf71] bg-[#1a7a4a]/30 px-2 py-0.5 rounded border border-[#2fbf71]/40">
                Block Model: {activeQuestion.blockModelCell}
              </span>
            )}
          </div>

          <h4 className="text-sm sm:text-base font-bold text-[#f4efe6] leading-relaxed">
            {displayQuestionText}
          </h4>

          {activeQuestion.codeSnippet && (
            <pre className="p-3 rounded-xl bg-[#0b0b14] border border-[#4a4766] text-[#ffe27a] text-xs font-mono overflow-x-auto leading-relaxed">
              <code>
                {activeQuestion.codeSnippet.split("\n").map((line, lineIdx) => (
                  <div key={lineIdx} className="flex items-start gap-3">
                    <span className="w-6 shrink-0 text-right text-[#6b6580] select-none tabular-nums">
                      {lineIdx + 1}
                    </span>
                    <span className="whitespace-pre">{line || " "}</span>
                  </div>
                ))}
              </code>
            </pre>
          )}
        </div>

        {/* Hero-Specific Scaled Mana (MP) Skills Bar */}
        <div className="rounded-xl bg-[#120f1c] border border-[#4a4766] p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-[#38bdf8] flex items-center gap-1.5">
              <Icon name="sparkles" size={14} />
              <span>
                {t(
                  `สกิลของ${heroDef.name} (ตอบถูก +${heroStats.mpRegenOnCorrect} MP)`,
                  `${heroDef.nameEn} Skills (Correct +${heroStats.mpRegenOnCorrect} MP)`
                )}
              </span>
            </span>
            <span className="pixel-font text-[10px] text-[#ffe27a]">
              💧 {focus}/{computedMaxFocus} MP
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {heroSkills.map((skill) => {
              const isUsed = usedSkillIds.includes(skill.id);
              const cooldownRemaining = skillCooldowns[skill.id] ?? 0;
              const isOnCooldown = !isUsed && cooldownRemaining > 0;
              const notEnoughMp = focus < skill.mpCost;
              const disabled = isSubmitted || isUsed || isOnCooldown || notEnoughMp;

              return (
                <button
                  key={skill.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleUseHeroSkill(skill)}
                  className={`px-2.5 py-2 rounded-lg border text-left transition flex items-start gap-2 text-[11px] font-bold ${
                    isUsed
                      ? "bg-[#5a2d91]/30 border-[#f6c945]/50 text-[#ffe27a] cursor-default"
                      : isOnCooldown
                      ? "bg-[#1a1626] border-[#f97316]/40 text-[#fdba74] cursor-not-allowed opacity-75"
                      : notEnoughMp || isSubmitted
                      ? "bg-[#1c1b2b] border-[#2f2d45] text-[#6b6580] cursor-not-allowed opacity-60"
                      : "bg-[#252238] border-[#4a4766] hover:border-[#f6c945] text-[#f4efe6] cursor-pointer"
                  }`}
                  title={`Tier ${skill.tier} · ${isEn ? skill.descriptionEn : skill.description} (${skill.mpCost} MP · CD ${skill.cooldownPhases})`}
                >
                  <span
                    className="shrink-0 mt-0.5"
                    style={{
                      color: isUsed
                        ? "#ffe27a"
                        : isOnCooldown
                        ? "#f97316"
                        : skill.accentColor,
                    }}
                  >
                    <Icon name={skill.icon} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-extrabold">
                        {isEn ? skill.nameEn : skill.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isOnCooldown ? (
                          <span className="pixel-font text-[9px] px-1.5 py-0.5 rounded bg-[#f97316]/20 text-[#fdba74] border border-[#f97316]/50">
                            ⏳ CD {cooldownRemaining}
                          </span>
                        ) : (
                          <span
                            className="pixel-font text-[9px] px-1.5 py-0.5 rounded border"
                            style={{
                              backgroundColor: `${skill.accentColor}22`,
                              color: skill.accentColor,
                              borderColor: `${skill.accentColor}66`,
                            }}
                          >
                            {skill.mpCost} MP
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-[#9a93ad] truncate mt-0.5">
                      {isUsed
                        ? t(
                            `✓ ใช้แล้ว (ติด CD ${skill.cooldownPhases} เฟส)`,
                            `✓ Used (CD ${skill.cooldownPhases}p)`
                          )
                        : isOnCooldown
                        ? t(
                            `⏳ ติดคูลดาวน์อีก ${cooldownRemaining} เฟส`,
                            `⏳ Cooldown: ${cooldownRemaining} phase(s)`
                          )
                        : `${isEn ? skill.descriptionEn : skill.description} · CD ${skill.cooldownPhases}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {relicNotice && (
            <div className="text-[11px] text-[#ffe27a] font-semibold bg-[#252238] px-2.5 py-1.5 rounded-lg border border-[#f6c945]/30">
              {relicNotice}
            </div>
          )}

          {/* Relic Reveal: Rubber Duck Hint */}
          {revealedHint && (
            <div className="p-2.5 rounded-lg bg-[#5a2d91]/25 border border-[#f6c945]/50 text-xs text-[#ffe27a]">
              <strong>{t("คำใบ้จากเป็ดนักสืบ:", "Rubber Duck Hint:")}</strong>{" "}
              <span className="text-[#f4efe6]">{duckHintText}</span>
            </div>
          )}

          {/* Relic Reveal: Trace Lens Step-by-Step Memory Inspector */}
          {revealedTrace && currentTraceStep && (
            <div className="p-2.5 rounded-lg bg-[#0c4a6e]/25 border border-[#38bdf8]/50 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-[#38bdf8]">
                  {t(
                    `Trace Lens · ขั้นที่ ${traceStepIdx + 1}/${derivedTraceSteps.length} (บรรทัด ${currentTraceStep.line})`,
                    `Trace Lens · Step ${traceStepIdx + 1}/${derivedTraceSteps.length} (Line ${currentTraceStep.line})`
                  )}
                </span>
                {derivedTraceSteps.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={traceStepIdx === 0}
                      onClick={() => setTraceStepIdx((p) => Math.max(0, p - 1))}
                      className="px-2 py-0.5 rounded bg-[#120f1c] border border-[#4a4766] text-[10px] disabled:opacity-40 cursor-pointer"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      disabled={traceStepIdx >= derivedTraceSteps.length - 1}
                      onClick={() => setTraceStepIdx((p) => Math.min(derivedTraceSteps.length - 1, p + 1))}
                      className="px-2 py-0.5 rounded bg-[#120f1c] border border-[#4a4766] text-[10px] disabled:opacity-40 cursor-pointer"
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>

              <div className="font-mono text-[11px] bg-[#0b0b14] px-2.5 py-1.5 rounded border border-[#4a4766] text-[#ffe27a]">
                {currentTraceStep.codeLine}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {Object.entries(currentTraceStep.variables).length > 0 ? (
                  Object.entries(currentTraceStep.variables).map(([k, v]) => (
                    <span
                      key={k}
                      className="px-2 py-0.5 rounded bg-[#120f1c] border border-[#38bdf8]/40 font-mono text-[11px] text-[#e0f2fe]"
                    >
                      {k} = <strong className="text-[#38bdf8]">{v}</strong>
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-[#9a93ad]">
                    {t("ยังไม่มีตัวแปรในขั้นนี้", "No variables updated at this step")}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-[#e0f2fe] leading-relaxed">
                {currentTraceStep.explanation}
              </p>
            </div>
          )}

          {/* Relic Reveal: Test Oracle Console Output */}
          {revealedOracleOutput !== null && (
            <div className="p-2.5 rounded-lg bg-[#1a7a4a]/25 border border-[#2fbf71]/50 text-xs space-y-1">
              <div className="font-extrabold text-[#2fbf71]">
                {t("ผลลัพธ์คอนโซลจำลอง (Test Oracle Output):", "Simulated Console Output (Test Oracle):")}
              </div>
              <pre className="font-mono text-[11px] bg-[#0b0b14] px-2.5 py-1.5 rounded border border-[#2fbf71]/40 text-[#86efac] overflow-x-auto">
                {revealedOracleOutput}
              </pre>
            </div>
          )}
        </div>

        {/* 4 Choices */}
        <div className="grid grid-cols-1 gap-2">
          {displayChoices.map((choice, idx) => {
            const isSelected = selectedChoice === idx;
            const isEliminated = eliminatedChoices.includes(idx);
            let btnClass = "bg-[#252238] border-[#4a4766] hover:bg-[#322c4a] text-[#f4efe6]";

            if (isEliminated && !isSubmitted) {
              btnClass = "bg-[#120f1c] border-[#2f2d45] text-[#6b6580] opacity-40 line-through cursor-not-allowed";
            } else if (isSubmitted) {
              if (isCorrect && idx === activeQuestion.correctIndex) {
                btnClass = "bg-[#1a7a4a] border-[#2fbf71] text-white font-black";
              } else if (isSelected && !isCorrect) {
                btnClass = "bg-[#7d1d10] border-[#c0283a] text-white";
              } else if (isEliminated) {
                btnClass = "bg-[#120f1c] border-[#2f2d45] text-[#6b6580] opacity-40 line-through";
              } else {
                btnClass = "bg-[#120f1c] border-[#2f2d45] text-[#9a93ad] opacity-60";
              }
            } else if (isSelected) {
              btnClass = "bg-[#5a2d91] hover:bg-[#6b36ab] border-[#f6c945] text-[#ffe27a] shadow-[0_0_10px_rgba(246,201,69,0.3)]";
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isSubmitted || isEliminated}
                onClick={() => handleSelectChoice(idx)}
                className={`retro-button px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm font-semibold flex items-center gap-3 transition-colors ${
                  isEliminated ? "cursor-not-allowed" : "cursor-pointer"
                } ${btnClass}`}
              >
                <span className="pixel-font font-black text-xs px-1.5 py-0.5 rounded bg-[#120f1c] border border-white/20 shrink-0">
                  {idx + 1}
                </span>
                <span className="leading-snug flex-1">{choice}</span>
              </button>
            );
          })}
        </div>

        {/* Result & Explanation Feedback */}
        {isSubmitted && (
          <div
            className={`p-3.5 rounded-xl border-2 text-xs space-y-1.5 animate-in fade-in duration-200 ${
              isCorrect
                ? "bg-[#1a7a4a]/30 border-[#2fbf71] text-[#2fbf71]"
                : "bg-[#7d1d10]/30 border-[#c0283a] text-[#ff4d6d]"
            }`}
          >
            <div className="font-extrabold flex items-center flex-wrap gap-2">
              <span>
                {isCorrect
                  ? t("ตอบถูก! โจมตีสำเร็จ", "Direct Hit!")
                  : t("ตอบผิด! เสีย 1 หัวใจ", "Miss! -1 Heart")}
              </span>
              {isCorrect && (
                <span className="px-2 py-0.5 rounded bg-[#0c4a6e]/70 border border-[#38bdf8]/60 text-[#38bdf8] pixel-font text-[10px] font-black">
                  💧 +{heroStats.mpRegenOnCorrect} MP!
                </span>
              )}
              {isCorrect && isMonsterDefeated && (
                <span className="pixel-font text-[#ffe27a]">VICTORY!</span>
              )}
            </div>
            {isCorrect ? (
              <p className="text-[#f4efe6] text-xs leading-relaxed">
                <strong>{t("คำอธิบาย:", "Explanation:")}</strong> {displayExplanation}
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-[#f4efe6] text-xs leading-relaxed">
                  <strong>{t("คำอธิบายแนวคิด:", "Concept Guidance:")}</strong>{" "}
                  {buildFallbackHint(activeQuestion, isEn)}
                </p>
                <p className="text-[11px] text-[#fca5a5]">
                  {t(
                    "💡 ลองวิเคราะห์โค้ดและตัวเลือกที่เหลืออีกครั้ง (ระบบตัดข้อที่ตอบผิดออกให้แล้ว)",
                    "💡 Analyze the code and remaining choices again (your wrong pick has been eliminated)."
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-[#4a4766] flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#9a93ad] hidden sm:inline">
            {isSubmitted
              ? t("กด Enter เพื่อไปต่อ", "Enter to continue")
              : t("กด 1-4 เลือก · Enter โจมตี", "1-4 pick · Enter attack")}
          </span>

          {!isSubmitted ? (
            <button
              type="button"
              disabled={selectedChoice === null || isSubmitting}
              onClick={() => void handleSubmit()}
              className={`retro-button ml-auto px-5 py-2.5 rounded-xl text-xs font-black pixel-font transition-all ${
                selectedChoice !== null && !isSubmitting
                  ? "bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] cursor-pointer"
                  : "bg-[#2f2d45] text-[#9a93ad] cursor-not-allowed opacity-50"
              }`}
            >
              {t("โจมตี / ATTACK →", "ATTACK →")}
            </button>
          ) : isCorrect && hasMorePhases ? (
            <button
              type="button"
              onClick={handleNextPhase}
              className="retro-button ml-auto px-5 py-2.5 rounded-xl bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] text-xs font-black pixel-font cursor-pointer transition-colors"
            >
              {t(
                `เฟสถัดไป (${phaseIndex + 2}/${totalPhases}) →`,
                `NEXT PHASE (${phaseIndex + 2}/${totalPhases}) →`
              )}
            </button>
          ) : !isCorrect && isMultiPhase && playerHearts > 0 ? (
            <button
              type="button"
              onClick={handleRetryPhase}
              className="retro-button ml-auto px-5 py-2.5 rounded-xl bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] text-xs font-black pixel-font cursor-pointer transition-colors"
            >
              {t("ลองโจมตีเฟสนี้อีกครั้ง (RETRY)", "RETRY PHASE")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="retro-button ml-auto px-5 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#120f1c] text-xs font-black pixel-font cursor-pointer transition-colors"
            >
              {t("เดินหน้าต่อ / CONTINUE →", "CONTINUE →")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
