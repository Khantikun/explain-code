"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MonsterDef } from "../../lib/dungeon/monsters";
import { DungeonQuestion } from "../../lib/dungeon/questions";
import { PixelSpriteView } from "./PixelSpriteView";
import { dungeonSound } from "../../lib/dungeon/sound";

interface BattleOverlayProps {
  runId?: string;
  monster: MonsterDef;
  question: DungeonQuestion;
  monsterHp: number;
  maxMonsterHp: number;
  playerHearts: number;
  courseId?: string;
  lessonId?: string;
  onCorrectAnswer: (xpAwarded?: number, coinsAwarded?: number, lessonCompleted?: boolean) => void;
  onWrongAnswer: () => void;
  onClose: () => void;
}

export function BattleOverlay({
  runId,
  monster,
  question,
  monsterHp,
  maxMonsterHp,
  playerHearts,
  courseId,
  lessonId,
  onCorrectAnswer,
  onWrongAnswer,
  onClose,
}: BattleOverlayProps) {
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [serverExplanation, setServerExplanation] = useState<string>("");
  const [flashDamage, setFlashDamage] = useState<"monster" | "player" | null>(null);

  const handleSelectChoice = (index: number) => {
    if (isSubmitted || isSubmitting) return;
    setSelectedChoice(index);
  };

  const handleSubmit = useCallback(async () => {
    if (selectedChoice === null || isSubmitted || isSubmitting) return;

    setIsSubmitting(true);
    let correct = false;
    let explanationText = question.explanation;
    let xp = 25;
    let coins = 10;
    let isLessonDone = false;

    try {
      const res = await fetch("/api/dungeon/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: runId || "trial",
          questionId: question.id,
          selectedIndex: selectedChoice,
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
        correct = selectedChoice === question.correctIndex;
      }
    } catch {
      correct = selectedChoice === question.correctIndex;
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setIsCorrect(correct);
      setServerExplanation(explanationText);

      if (correct) {
        setFlashDamage("monster");
        dungeonSound.playHit();
        onCorrectAnswer(xp, coins, isLessonDone);
      } else {
        setFlashDamage("player");
        dungeonSound.playHurt();
        onWrongAnswer();
      }
    }
  }, [selectedChoice, isSubmitted, isSubmitting, runId, question, courseId, lessonId, onCorrectAnswer, onWrongAnswer]);

  // Keyboard shortcut listener for numbers 1-4 and Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitted) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (idx < question.choices.length) {
          setSelectedChoice(idx);
        }
      } else if (e.key === "Enter" && selectedChoice !== null) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedChoice, isSubmitted, question.choices.length, handleSubmit, onClose]);

  const isMonsterDefeated = monsterHp <= (isCorrect ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="retro-panel rounded-2xl max-w-xl w-full p-5 sm:p-7 flex flex-col gap-5 text-[#f4efe6] relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Monster Header with HP Bar */}
        <div className="flex items-center justify-between border-b border-[#4a4766] pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl bg-[#120f1c] border-2 border-[#4a4766] flex items-center justify-center transition-transform ${
                flashDamage === "monster" ? "scale-110 bg-[#c0283a] ring-4 ring-[#ff4d6d]" : ""
              }`}
            >
              <PixelSpriteView sprite={monster.sprite} size={48} animateBounce />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-[#f6c945] text-sm sm:text-base">
                  {monster.name}
                </h3>
              </div>
              <span className="text-[11px] text-[#9a93ad]">{monster.title}</span>
            </div>
          </div>

          {/* Monster HP */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-xs pixel-font font-bold">
              <span className="text-[#ff4d6d]">HP</span>
              <span>
                {Math.max(0, monsterHp - (isCorrect ? 1 : 0))}/{maxMonsterHp}
              </span>
            </div>
            <div className="w-24 sm:w-32 h-2.5 bg-[#120f1c] rounded-full overflow-hidden border border-[#4a4766]">
              <div
                className="h-full bg-gradient-to-r from-[#ff4d6d] to-[#c0283a] transition-all duration-300"
                style={{
                  width: `${Math.max(0, ((monsterHp - (isCorrect ? 1 : 0)) / maxMonsterHp) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="pixel-font text-[10px] text-[#ffe27a] bg-[#5a2d91] px-2 py-0.5 rounded font-bold">
              QUIZ ATTACK
            </span>
            {question.blockModelCell && (
              <span className="text-[10px] font-bold text-[#2fbf71] bg-[#1a7a4a]/30 px-2 py-0.5 rounded border border-[#2fbf71]/40">
                Block Model: {question.blockModelCell}
              </span>
            )}
          </div>

          <h4 className="text-sm sm:text-base font-bold text-[#f4efe6] leading-relaxed">
            {question.question}
          </h4>

          {question.codeSnippet && (
            <pre className="p-3 rounded-xl bg-[#0b0b14] border border-[#4a4766] text-[#ffe27a] text-xs font-mono overflow-x-auto leading-relaxed">
              <code>{question.codeSnippet}</code>
            </pre>
          )}
        </div>

        {/* 4 Choices */}
        <div className="grid grid-cols-1 gap-2.5">
          {question.choices.map((choice, idx) => {
            const isSelected = selectedChoice === idx;
            let btnClass = "bg-[#252238] border-[#4a4766] hover:bg-[#322c4a] text-[#f4efe6]";

            if (isSubmitted) {
              if (idx === question.correctIndex) {
                btnClass = "bg-[#1a7a4a] border-[#2fbf71] text-white font-black";
              } else if (isSelected && !isCorrect) {
                btnClass = "bg-[#7d1d10] border-[#c0283a] text-white";
              } else {
                btnClass = "bg-[#120f1c] border-[#2f2d45] text-[#9a93ad] opacity-60";
              }
            } else if (isSelected) {
              btnClass = "bg-[#5a2d91] border-[#f6c945] text-[#ffe27a] shadow-[0_0_10px_rgba(246,201,69,0.3)]";
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isSubmitted}
                onClick={() => handleSelectChoice(idx)}
                className={`retro-button px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer ${btnClass}`}
              >
                <span className="pixel-font font-black text-xs px-1.5 py-0.5 rounded bg-[#120f1c] border border-white/20 shrink-0">
                  {idx + 1}
                </span>
                <span className="leading-snug">{choice}</span>
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
            <div className="font-extrabold flex items-center gap-2">
              <span>{isCorrect ? "ตอบถูก! โจมตีสำเร็จ" : "ตอบผิด! เสีย 1 หัวใจ"}</span>
              {isCorrect && isMonsterDefeated && (
                <span className="pixel-font text-[#ffe27a]">VICTORY!</span>
              )}
            </div>
            <p className="text-[#f4efe6] text-xs leading-relaxed">
              <strong>คำอธิบาย:</strong> {serverExplanation || question.explanation}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-[#4a4766] flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#9a93ad] hidden sm:inline">
            {isSubmitted
              ? "กด Enter หรือคลิกเพื่อดำเนินการต่อ"
              : "กดตัวเลข 1-4 หรือคลิกเพื่อเลือกคำตอบ"}
          </span>

          {!isSubmitted ? (
            <button
              type="button"
              disabled={selectedChoice === null}
              onClick={handleSubmit}
              className={`retro-button ml-auto px-5 py-2.5 rounded-xl text-xs font-black pixel-font transition-all ${
                selectedChoice !== null
                  ? "bg-[#f6c945] hover:bg-[#ffe27a] text-[#120f1c] cursor-pointer"
                  : "bg-[#2f2d45] text-[#9a93ad] cursor-not-allowed opacity-50"
              }`}
            >
              ATTACK (โจมตี) →
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="retro-button ml-auto px-5 py-2.5 rounded-xl bg-[#2fbf71] hover:bg-[#34d37d] text-[#120f1c] text-xs font-black pixel-font cursor-pointer transition-colors"
            >
              CONTINUE (เดินหน้าต่อ) →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
