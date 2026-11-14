"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DungeonQuestion } from "../../lib/dungeon/questions";
import {
  CHEST_CLOSED_SPRITE,
  CHEST_OPEN_SPRITE,
  COIN_SPRITE,
} from "../../lib/dungeon/sprites";
import { dungeonSound } from "../../lib/dungeon/sound";
import { PixelSpriteView } from "./PixelSpriteView";
import { useUiLanguage } from "../LanguageProvider";

export interface CodeChestModalProps {
  question: DungeonQuestion;
  xpReward?: number;
  coinReward?: number;
  onSolved: (reward: { xpAwarded: number; coinsAwarded: number }) => void;
  onClose: () => void;
}

export function CodeChestModal({
  question,
  xpReward = 20,
  coinReward = 15,
  onSolved,
  onClose,
}: CodeChestModalProps) {
  const { uiLang, t } = useUiLanguage();
  const isEn = uiLang === "en";

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [eliminatedChoices, setEliminatedChoices] = useState<number[]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const displayQuestion = isEn ? question.questionEn || question.question : question.question;
  const displayChoices = useMemo(() => {
    if (
      isEn &&
      question.choicesEn &&
      question.choicesEn.length === question.choices.length
    ) {
      return question.choicesEn;
    }
    return question.choices;
  }, [isEn, question.choices, question.choicesEn]);

  const displayExplanation = isEn
    ? question.explanationEn || question.explanation
    : question.explanation;

  const handleSubmit = useCallback(
    (choiceOverride?: number) => {
      const chosen = choiceOverride ?? selectedChoice;
      if (chosen === null || isSolved || eliminatedChoices.includes(chosen)) return;

      if (chosen === question.correctIndex) {
        setIsSolved(true);
        setFeedbackError(null);
        dungeonSound.playCoin();
        onSolved({ xpAwarded: xpReward, coinsAwarded: coinReward });
      } else {
        dungeonSound.playHurt();
        setEliminatedChoices((prev) =>
          prev.includes(chosen) ? prev : [...prev, chosen]
        );
        setSelectedChoice(null);
        setFeedbackError(
          isEn
            ? question.hintEn || question.hint || "Not quite! Try another choice."
            : question.hint || "ยังไม่ถูกต้อง ลองไล่โค้ดและเลือกคำตอบอื่นดูอีกครั้ง!"
        );
      }
    },
    [
      selectedChoice,
      isSolved,
      eliminatedChoices,
      question.correctIndex,
      question.hint,
      question.hintEn,
      isEn,
      xpReward,
      coinReward,
      onSolved,
    ]
  );

  const handleSelectChoice = (idx: number) => {
    if (isSolved || eliminatedChoices.includes(idx)) return;
    if (selectedChoice === idx) {
      handleSubmit(idx);
      return;
    }
    setSelectedChoice(idx);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (isSolved) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClose();
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
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSolved, displayChoices.length, eliminatedChoices, selectedChoice, handleSubmit, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs select-none overflow-y-auto">
      <div className="retro-panel rounded-2xl max-w-xl w-full p-4 sm:p-6 flex flex-col gap-4 text-[#f4efe6] border-2 border-[#f6c945]/70 my-auto max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#4a4766] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#120f1c] border border-[#f6c945]/50 shrink-0">
              <PixelSpriteView
                sprite={isSolved ? CHEST_OPEN_SPRITE : CHEST_CLOSED_SPRITE}
                size={36}
                animateBounce={!isSolved}
              />
            </div>
            <div>
              <span className="pixel-font text-[10px] text-[#f6c945] font-black uppercase">
                {t("📦 หีบปริศนาโค้ด (CODE CHEST)", "📦 CODE CHEST EVENT")}
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-[#ffe27a]">
                {isSolved
                  ? t("เปิดหีบสำเร็จ! รับสมบัติเลย", "Chest Unlocked!")
                  : t("ตอบคำถามสั้นๆ เพื่อไขรหัสเปิดหีบ", "Solve the Predict/Trace puzzle to open")}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#252238] hover:bg-[#c0283a]/85 border border-[#4a4766] text-sm font-black text-[#f4efe6] flex items-center justify-center cursor-pointer shrink-0"
            aria-label={t("ปิดหีบ", "Close chest")}
          >
            ✕
          </button>
        </div>

        {/* Question & Code */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {question.language && (
              <span className="pixel-font text-[10px] text-[#38bdf8] bg-[#0c4a6e]/40 border border-[#38bdf8]/40 px-2 py-0.5 rounded font-bold uppercase">
                {question.language}
              </span>
            )}
            <span className="pixel-font text-[10px] text-[#f6c945] bg-[#120f1c] border border-[#f6c945]/40 px-2 py-0.5 rounded font-bold">
              +{xpReward} XP · +{coinReward} G
            </span>
          </div>

          <p className="text-sm font-bold text-[#f4efe6] leading-relaxed">
            {displayQuestion}
          </p>

          {question.codeSnippet && (
            <pre className="p-3 rounded-xl bg-[#0b0b14] border border-[#4a4766] text-[#ffe27a] text-xs font-mono overflow-x-auto leading-relaxed">
              <code>
                {question.codeSnippet.split("\n").map((line, lineIdx) => (
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

        {/* Choices */}
        <div className="grid grid-cols-1 gap-2">
          {displayChoices.map((choice, idx) => {
            const isSelected = selectedChoice === idx;
            const isEliminated = eliminatedChoices.includes(idx);
            let btnClass = "bg-[#252238] border-[#4a4766] hover:bg-[#322c4a] text-[#f4efe6]";

            if (isEliminated) {
              btnClass = "bg-[#120f1c] border-[#2f2d45] text-[#6b6580] opacity-40 line-through cursor-not-allowed";
            } else if (isSolved && idx === question.correctIndex) {
              btnClass = "bg-[#1a7a4a] border-[#2fbf71] text-white font-black";
            } else if (isSolved) {
              btnClass = "bg-[#120f1c] border-[#2f2d45] text-[#9a93ad] opacity-60";
            } else if (isSelected) {
              btnClass = "bg-[#5a2d91] border-[#f6c945] text-[#ffe27a]";
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isSolved || isEliminated}
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

        {/* Feedback */}
        {feedbackError && !isSolved && (
          <div className="p-3 rounded-xl border border-[#c0283a] bg-[#7d1d10]/30 text-xs text-[#fca5a5]">
            💡 {feedbackError}
          </div>
        )}

        {isSolved && (
          <div className="p-3.5 rounded-xl border-2 border-[#2fbf71] bg-[#1a7a4a]/30 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2 font-extrabold text-[#86efac]">
              <span>{t("✓ เปิดหีบสำเร็จ!", "✓ Chest Opened!")}</span>
              <span className="flex items-center gap-1.5 pixel-font text-[#f6c945]">
                <PixelSpriteView sprite={COIN_SPRITE} size={14} />+{coinReward} G · +{xpReward} XP
              </span>
            </div>
            <p className="text-[#f4efe6] leading-relaxed">
              <strong>{t("คำอธิบาย:", "Explanation:")}</strong> {displayExplanation}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#4a4766]">
          {!isSolved ? (
            <button
              type="button"
              disabled={selectedChoice === null}
              onClick={() => handleSubmit()}
              className={`retro-button px-5 py-2.5 rounded-xl text-xs font-black pixel-font transition-all ${
                selectedChoice !== null
                  ? "bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] cursor-pointer"
                  : "bg-[#2f2d45] text-[#9a93ad] cursor-not-allowed opacity-50"
              }`}
            >
              {t("ไขรหัสเปิดหีบ →", "UNLOCK CHEST →")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="retro-button px-5 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#120f1c] text-xs font-black pixel-font cursor-pointer"
            >
              {t("เก็บสมบัติ & เดินต่อ →", "COLLECT & CONTINUE →")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
