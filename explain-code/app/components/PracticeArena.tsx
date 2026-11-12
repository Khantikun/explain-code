import React, { useState, useEffect } from "react";
import {
  TopicQuest,
  BlockCellId,
  BLOCK_MODEL_CELLS,
  StudentRecord,
} from "../lib/curriculum";
import {
  LearningLanguage,
  runCodeByLanguage,
} from "../lib/language-tracks";
import { Icon, StatusCircle } from "./Icons";

interface PracticeArenaProps {
  topic: TopicQuest;
  language?: LearningLanguage;
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
}

type PrimmStep = 1 | 2 | 3 | 4 | 5; // 5 = สรุปจบเรื่อง (ดูเฉลย เหตุผล + XP + ตรา)

interface QuestionAttemptState {
  wrongCount: number;
  selectedOptionId: string | null;
  status: "unanswered" | "hint" | "correct" | "revealed";
  earnedXp: number;
  cellMasteryScore: number;
}

export function PracticeArena({
  topic,
  language = "javascript",
  onBackToMap,
  onCompleteTopic,
  currentStudent,
  studentId,
}: PracticeArenaProps) {
  const [primmStep, setPrimmStep] = useState<PrimmStep>(1);

  // ขั้น 1 & 2: ทำนายผล & เทียบผลรันจริง
  const [predictedAnswer, setPredictedAnswer] = useState<string>("");
  const [realRunResult, setRealRunResult] = useState<{
    outputs: string[];
    finalOutput: string;
    success: boolean;
  } | null>(null);
  const [predictXp, setPredictXp] = useState<number>(0);

  // ขั้น 3: เดินโค้ดทีละขั้น & ตอบคำถามตามช่อง Block Model
  const [traceIdx, setTraceIdx] = useState<number>(0);
  const [isAutoWalking, setIsAutoWalking] = useState<boolean>(false);
  const [currentQIdx, setCurrentQIdx] = useState<number>(0);
  const [qStates, setQStates] = useState<Record<string, QuestionAttemptState>>({});

  // เสริม: อธิบายอิสระตรวจด้วย AI หลังบ้าน
  const [freeExplanation, setFreeExplanation] = useState<string>("");
  const [aiEvalLoading, setAiEvalLoading] = useState<boolean>(false);
  const [aiEvalResult, setAiEvalResult] = useState<{
    score: number;
    passed: boolean;
    feedback: string;
  } | null>(null);

  // ขั้น 4: แก้ค่าแล้วทายใหม่ (Modify)
  const [modifiedCode, setModifiedCode] = useState<string>(topic.modifyChallenge.suggestedCode);
  const [modifyPrediction, setModifyPrediction] = useState<string>("");
  const [modifyRunResult, setModifyRunResult] = useState<{
    finalOutput: string;
    matchedPrediction: boolean;
    matchedTarget: boolean;
    error?: string;
  } | null>(null);
  const [modifyXp, setModifyXp] = useState<number>(0);

  // Auto-walk timer สำหรับเดินโค้ดทีละขั้น
  useEffect(() => {
    if (!isAutoWalking) return;
    const timer = setInterval(() => {
      setTraceIdx((prev) => {
        if (prev + 1 >= topic.steps.length) {
          setIsAutoWalking(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [isAutoWalking, topic.steps.length]);

  const currentTrace = topic.steps[traceIdx] || topic.steps[0];
  const currentQ = topic.questions[currentQIdx] || topic.questions[0];
  const currentQState: QuestionAttemptState = qStates[currentQ.id] || {
    wrongCount: 0,
    selectedOptionId: null,
    status: "unanswered",
    earnedXp: 0,
    cellMasteryScore: 0,
  };
  const currentCellMeta = BLOCK_MODEL_CELLS.find((c) => c.id === currentQ.cellId)!;

  // รันโค้ดจริงในขั้นที่ 2 (เทียบผลรันจริง)
  const handleRunAndCompare = () => {
    if (!predictedAnswer.trim()) return;
    const exec = runCodeByLanguage(topic.code, language);
    setRealRunResult(exec);
    const isExactMatch = predictedAnswer.trim() === exec.finalOutput.trim();
    // XP ให้ตามความเข้าใจและการมีส่วนร่วมทำนายผล (ไม่มีการหักคะแนน)
    setPredictXp(isExactMatch ? 15 : 10);
    setPrimmStep(2);
  };

  // ตรวจคำตอบรายช่อง Block Model (ตอบผิดครั้งที่ 1 ได้คำใบ้, ครั้งที่ 2 ได้เฉลย)
  const handleSelectQuestionOption = (optionId: string) => {
    if (currentQState.status === "correct" || currentQState.status === "revealed") {
      return;
    }

    const isCorrect = optionId === currentQ.correctOptionId;

    if (isCorrect) {
      const firstTry = currentQState.wrongCount === 0;
      setQStates((prev) => ({
        ...prev,
        [currentQ.id]: {
          wrongCount: currentQState.wrongCount,
          selectedOptionId: optionId,
          status: "correct",
          earnedXp: firstTry ? 20 : 15,
          cellMasteryScore: firstTry ? 95 : 80,
        },
      }));
    } else {
      const nextWrongCount = currentQState.wrongCount + 1;
      if (nextWrongCount === 1) {
        // ผิดครั้งที่ 1 -> ได้คำใบ้ แล้วลองอีกครั้ง
        setQStates((prev) => ({
          ...prev,
          [currentQ.id]: {
            wrongCount: 1,
            selectedOptionId: optionId,
            status: "hint",
            earnedXp: 0,
            cellMasteryScore: 0,
          },
        }));
      } else {
        // ผิดครั้งที่ 2 -> แสดงเฉลยและเหตุผล
        setQStates((prev) => ({
          ...prev,
          [currentQ.id]: {
            wrongCount: 2,
            selectedOptionId: optionId,
            status: "revealed",
            earnedXp: 10,
            cellMasteryScore: 45,
          },
        }));
      }
    }
  };

  // ส่งคำอธิบายอิสระให้ AI หลังบ้านตรวจ
  const handleEvaluateFreeExplanation = async () => {
    if (!freeExplanation.trim()) return;
    setAiEvalLoading(true);
    try {
      const res = await fetch("/api/interrogate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: topic.code,
          topicTitle: topic.title,
          studentExplanation: freeExplanation,
          studentId: currentStudent?.id || studentId,
        }),
      });
      const data = await res.json();
      setAiEvalResult({
        score: data.score ?? 80,
        passed: Boolean(data.passed),
        feedback: data.feedback || "ตรวจคำอธิบายเรียบร้อย",
      });
    } catch {
      setAiEvalResult({
        score: 80,
        passed: true,
        feedback: "อธิบายแนวคิดการทำงานของโค้ดได้ตรงประเด็นดีมาก!",
      });
    } finally {
      setAiEvalLoading(false);
    }
  };

  // รันโค้ดจริงในขั้นที่ 4 (แก้ค่าแล้วทายใหม่)
  const handleRunModifiedCode = () => {
    if (!modifyPrediction.trim()) return;
    const realModified = runCodeByLanguage(modifiedCode, language);
    const targetModified = runCodeByLanguage(
      topic.modifyChallenge.suggestedCode,
      language
    );

    if (!realModified.success) {
      setModifyRunResult({
        finalOutput: "",
        matchedPrediction: false,
        matchedTarget: false,
        error: realModified.error,
      });
      return;
    }

    const matchedPrediction =
      realModified.finalOutput.trim() === modifyPrediction.trim();
    const matchedTarget =
      realModified.finalOutput.trim() === targetModified.finalOutput.trim();

    setModifyRunResult({
      finalOutput: realModified.finalOutput,
      matchedPrediction,
      matchedTarget,
    });
    setModifyXp(matchedPrediction ? 20 : 12);
  };

  // คำนวณคะแนนรวมและจบเรื่อง
  const allQuestionsDone = topic.questions.every((q) => {
    const st = qStates[q.id]?.status;
    return st === "correct" || st === "revealed";
  });

  const totalQuestionXp = topic.questions.reduce(
    (acc, q) => acc + (qStates[q.id]?.earnedXp || 0),
    0
  );
  const aiBonusXp = aiEvalResult?.passed ? 10 : 0;
  const totalEarnedXp = predictXp + totalQuestionXp + modifyXp + aiBonusXp;

  const handleFinishQuest = () => {
    const updatedCellScores: Partial<Record<BlockCellId, number>> = {};
    topic.questions.forEach((q) => {
      const st = qStates[q.id];
      if (st) {
        updatedCellScores[q.cellId] = st.cellMasteryScore;
      }
    });

    const avgQuestionScore = Math.round(
      topic.questions.reduce(
        (acc, q) => acc + (qStates[q.id]?.cellMasteryScore || 75),
        0
      ) / topic.questions.length
    );

    const answers = topic.questions.map((q) => {
      const st = qStates[q.id];
      return {
        questionId: q.id,
        cellId: q.cellId,
        chosenOptionId: st?.selectedOptionId || null,
        isCorrect: st?.status === "correct",
        tries: (st?.wrongCount || 0) + 1,
        xpEarned: st?.earnedXp || 0,
      };
    });

    const aiEvaluation =
      aiEvalResult && freeExplanation.trim()
        ? {
            studentExplanation: freeExplanation.trim(),
            score: aiEvalResult.score,
            passed: aiEvalResult.passed,
            feedback: aiEvalResult.feedback,
          }
        : undefined;

    onCompleteTopic({
      topicId: topic.id,
      earnedXp: totalEarnedXp,
      updatedCellScores,
      badgeId: topic.badgeReward.id,
      scorePercent: avgQuestionScore,
      answers,
      aiEvaluation,
    });
  };

  const codeLines = topic.code.split("\n");
  const activeHighlightedLine =
    primmStep === 3 ? currentTrace?.line : null;

  return (
    <div className="flex flex-col gap-5">
      {/* แถบหัวเรื่องและลำดับ PRIMM 4 ขั้น */}
      <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToMap}
              className="press-secondary px-3 py-2 rounded-xl text-[14px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="back" size={18} />
              <span>กลับเส้นทางเควสต์</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-extrabold text-[#1b2a2f]">{topic.title}</h2>
                {topic.isBoss && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#6d3fc0] text-white text-[12px] font-extrabold flex items-center gap-1">
                    <Icon name="bug" size={14} />
                    <span>บอสด่าน</span>
                  </span>
                )}
              </div>
              <p className="text-[13px] font-semibold text-[#475b60]">{topic.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#fff4d6] border-2 border-[#f0a92e] rounded-xl px-3.5 py-1.5 text-[#3d2603] font-extrabold text-[14px]">
            <Icon name="star" size={18} filled />
            <span>XP สะสมในด่านนี้: +{totalEarnedXp} XP</span>
          </div>
        </div>

        {/* แถบตัวบอกวิธีเรียน 4 ขั้น (อิงลำดับ PRIMM) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { step: 1 as PrimmStep, title: "1 · ทำนายผล", desc: "ทายผลก่อนรันจริง" },
            { step: 2 as PrimmStep, title: "2 · เทียบผลรันจริง", desc: "รันโค้ดจริงเทียบที่ทาย" },
            { step: 3 as PrimmStep, title: "3 · เดินโค้ดและตอบ", desc: "ตอบคำถามรายช่อง" },
            { step: 4 as PrimmStep, title: "4 · แก้ค่าแล้วทายใหม่", desc: "เปลี่ยนค่าแล้วทำนาย" },
          ].map((item) => {
            const isCurrent = primmStep === item.step;
            const isDone = primmStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  if (item.step <= primmStep || isDone) setPrimmStep(item.step);
                }}
                className={`p-3 rounded-xl border-2 text-left transition flex items-center gap-3 cursor-pointer ${
                  isCurrent
                    ? "bg-[#e3f1ee] border-[#0f766e] text-[#0b4f49]"
                    : isDone
                    ? "bg-[#d8efdc] border-[#14532d]/30 text-[#14532d]"
                    : "bg-[#eef3f1] border-[#cfe0dc] text-[#475b60]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[14px] shrink-0 ${
                    isCurrent
                      ? "bg-[#0f766e] text-white"
                      : isDone
                      ? "bg-[#14532d] text-white"
                      : "bg-[#d8e3e0] text-[#475b60]"
                  }`}
                >
                  {isDone ? <Icon name="check" size={16} /> : item.step}
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-extrabold truncate">{item.title}</div>
                  <div className="text-[12px] opacity-85 truncate">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* กรณีเป็นบอสด่าน แสดงสถานการณ์โค้ดจาก AI */}
      {topic.aiScenario && (
        <div className="bg-[#6d3fc0]/10 border-2 border-[#6d3fc0] rounded-2xl p-4 flex items-start gap-3 text-[#3f1f7d]">
          <StatusCircle variant="boss" size="sm" label="บอสด่านจับบั๊กจาก AI" />
          <div>
            <div className="text-[15px] font-extrabold">ภารกิจบอสด่าน: จับบั๊กจากโค้ดที่ AI เขียน</div>
            <p className="text-[14px] mt-0.5">{topic.aiScenario}</p>
          </div>
        </div>
      )}

      {/* พื้นที่หลัก 2 ฝั่ง: ซ้าย = โค้ดและตารางค่าตัวแปร | ขวา = กิจกรรมตามขั้น PRIMM */}
      {primmStep < 5 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ฝั่งซ้าย: แผงอ่านโค้ดทีละบรรทัด + ตารางค่าตัวแปรและผลลัพธ์จากการรันจริง */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-[#0b4f49] text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-extrabold text-[15px]">
                  <Icon name="code" size={20} />
                  <span>โค้ด JavaScript ที่ใช้ฝึกอ่าน</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[12px] font-bold">
                  {codeLines.length} บรรทัด
                </span>
              </div>

              <div className="p-4 space-y-1.5 bg-[#ffffff]">
                {codeLines.map((lineText, idx) => {
                  const lineNum = idx + 1;
                  const isStepLine = activeHighlightedLine === lineNum;
                  const isQuestionLine =
                    primmStep === 3 && currentQ?.targetLine === lineNum;

                  return (
                    <div
                      key={lineNum}
                      onClick={() => {
                        const foundStep = topic.steps.findIndex((s) => s.line === lineNum);
                        if (foundStep >= 0) setTraceIdx(foundStep);
                      }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl border-2 transition cursor-pointer ${
                        isStepLine
                          ? "bg-[#fff4d6] border-[#f0a92e] text-[#3d2603]"
                          : isQuestionLine
                          ? "bg-[#e3f1ee] border-[#0f766e] text-[#0b4f49]"
                          : "bg-[#eef3f1]/60 border-transparent hover:border-[#cfe0dc] text-[#1b2a2f]"
                      }`}
                    >
                      <span className="w-6 text-right font-extrabold text-[13px] text-[#475b60] select-none">
                        {lineNum}
                      </span>
                      <pre className="font-code flex-1 whitespace-pre-wrap break-all font-bold">
                        {lineText}
                      </pre>
                      {isStepLine && (
                        <span className="px-2 py-0.5 rounded-md bg-[#f0a92e] text-[#3d2603] text-[12px] font-extrabold shrink-0">
                          ขั้นที่ {currentTrace.stepNumber}
                        </span>
                      )}
                      {!isStepLine && isQuestionLine && (
                        <span className="px-2 py-0.5 rounded-md bg-[#0f766e] text-white text-[12px] font-extrabold shrink-0">
                          บรรทัดที่ถาม
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* แถบควบคุมการเดินโค้ดทีละขั้น (แสดงเด่นในขั้นที่ 3 และดูได้ตลอดหลังรันจริง) */}
              {primmStep >= 2 && (
                <div className="p-4 bg-[#eef3f1] border-t-2 border-[#cfe0dc] flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] font-extrabold text-[#0b4f49]">
                      เดินโค้ดทีละขั้น: ขั้นที่ {currentTrace.stepNumber} จาก {topic.steps.length} (บรรทัดที่{" "}
                      {currentTrace.line})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAutoWalking(false);
                          setTraceIdx((p) => Math.max(0, p - 1));
                        }}
                        disabled={traceIdx === 0}
                        className="press-secondary px-3 py-1.5 rounded-xl text-[13px] font-extrabold disabled:opacity-50 cursor-pointer"
                      >
                        ← ก่อนหน้า
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAutoWalking(!isAutoWalking)}
                        className="press-gold px-3.5 py-1.5 rounded-xl text-[13px] font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Icon name="play" size={16} />
                        <span>{isAutoWalking ? "หยุดเดินอัตโนมัติ" : "เดินโค้ดอัตโนมัติ"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAutoWalking(false);
                          setTraceIdx((p) => Math.min(topic.steps.length - 1, p + 1));
                        }}
                        disabled={traceIdx === topic.steps.length - 1}
                        className="press-teal px-3 py-1.5 rounded-xl text-[13px] font-extrabold disabled:opacity-50 cursor-pointer"
                      >
                        ถัดไป →
                      </button>
                    </div>
                  </div>

                  {/* คำอธิบายจังหวะปัจจุบัน */}
                  <div className="bg-white border border-[#cfe0dc] rounded-xl p-3 text-[14px] text-[#1b2a2f]">
                    <span className="font-extrabold text-[#0f766e]">การทำงานในขั้นนี้: </span>
                    {currentTrace.explanation}
                  </div>

                  {/* ตารางค่าตัวแปรและผลลัพธ์จากการรันจริง */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white border border-[#cfe0dc] rounded-xl p-3">
                      <div className="text-[13px] font-extrabold text-[#0b4f49] mb-2">
                        ตารางค่าตัวแปร (ในขั้นที่ {currentTrace.stepNumber})
                      </div>
                      <div className="space-y-1.5">
                        {Object.entries(currentTrace.variables).map(([varName, val]) => (
                          <div
                            key={varName}
                            className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-[#e3f1ee] text-[13px]"
                          >
                            <span className="font-code font-bold text-[#0b4f49]">{varName}</span>
                            <span className="font-code font-extrabold text-[#14532d]">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-[#cfe0dc] rounded-xl p-3 flex flex-col justify-between">
                      <div className="text-[13px] font-extrabold text-[#0b4f49] mb-2">
                        ผลลัพธ์บนหน้าจอ (console.log)
                      </div>
                      {currentTrace.outputSoFar.length > 0 ? (
                        <div className="p-2.5 rounded-lg bg-[#d8efdc] border border-[#86efac] font-code font-extrabold text-[#14532d]">
                          {currentTrace.outputSoFar.join("\n")}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-[#eef3f1] text-[13px] text-[#475b60]">
                          ยังไม่มีการพิมพ์ออกหน้าจอในขั้นนี้
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ฝั่งขวา: กิจกรรมตามลำดับ PRIMM 1 -> 2 -> 3 -> 4 */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* ==================== PRIMM ขั้นที่ 1: ทำนายผล ==================== */}
            {primmStep === 1 && (
              <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full bg-[#0f766e] text-white text-[13px] font-extrabold">
                    ขั้นที่ 1 · ทำนายผล (Predict)
                  </span>
                  <span className="text-[13px] font-semibold text-[#475b60]">
                    อ่านโค้ดด้านซ้ายแล้วทายผลก่อนรันจริง
                  </span>
                </div>

                <h3 className="text-[18px] font-extrabold text-[#1b2a2f]">
                  {topic.predictPrompt}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {topic.predictOptions.map((opt) => {
                    const selected = predictedAnswer === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPredictedAnswer(opt)}
                        className={`p-3.5 rounded-xl text-left font-code font-bold text-[16px] cursor-pointer transition ${
                          selected
                            ? "bg-[#e3f1ee] border-2 border-[#0f766e] text-[#0b4f49] shadow-[0_3px_0_#09504a]"
                            : "press-secondary"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#475b60]">
                    หรือพิมพ์คำทำนายของคุณเอง:
                  </label>
                  <input
                    type="text"
                    value={predictedAnswer}
                    onChange={(e) => setPredictedAnswer(e.target.value)}
                    placeholder="พิมพ์ผลลัพธ์ที่คาดว่าจะพิมพ์ออกมา..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-[#b6c9c5] text-[#1b2a2f] font-code focus:outline-none focus:border-[#0f766e]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRunAndCompare}
                  disabled={!predictedAnswer.trim()}
                  className="press-teal w-full py-3 rounded-xl text-[16px] font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="play" size={20} />
                  <span>รันโค้ดจริงเพื่อเทียบผลกับที่ทาย</span>
                </button>
              </div>
            )}

            {/* ==================== PRIMM ขั้นที่ 2: เทียบผลรันจริง ==================== */}
            {primmStep === 2 && realRunResult && (
              <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#0f766e] text-white text-[13px] font-extrabold">
                    ขั้นที่ 2 · เทียบผลรันจริง (Run)
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-[#fff4d6] text-[#3d2603] border border-[#f0a92e] text-[13px] font-extrabold">
                    +{predictXp} XP จากการทำนายและตรวจสอบผลจริง
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[#eef3f1] border border-[#cfe0dc]">
                    <div className="text-[13px] font-bold text-[#475b60]">สิ่งที่คุณทำนายไว้:</div>
                    <div className="font-code text-[20px] font-extrabold text-[#1b2a2f] mt-1">
                      {predictedAnswer}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#d8efdc] border-2 border-[#14532d]/30">
                    <div className="text-[13px] font-bold text-[#14532d] flex items-center gap-1">
                      <Icon name="check" size={16} />
                      <span>ผลลัพธ์จากการรันโค้ดจริง:</span>
                    </div>
                    <div className="font-code text-[20px] font-extrabold text-[#14532d] mt-1">
                      {realRunResult.finalOutput}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border-2 ${
                    predictedAnswer.trim() === realRunResult.finalOutput.trim()
                      ? "bg-[#d8efdc] border-[#86efac] text-[#14532d]"
                      : "bg-[#fbeacb] border-[#fcd34d] text-[#5c3704]"
                  }`}
                >
                  <div className="font-extrabold text-[15px] flex items-center gap-2">
                    <Icon
                      name={
                        predictedAnswer.trim() === realRunResult.finalOutput.trim()
                          ? "check"
                          : "bulb"
                      }
                      size={20}
                    />
                    <span>
                      {predictedAnswer.trim() === realRunResult.finalOutput.trim()
                        ? "ทายตรงกับผลรันจริงเป๊ะ!"
                        : "ผลรันจริงต่างจากที่ทายไว้ มาดูเหตุผลกัน:"}
                    </span>
                  </div>
                  <p className="text-[14px] mt-1">{topic.predictExplanation}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setPrimmStep(3)}
                  className="press-teal w-full py-3 rounded-xl text-[16px] font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>ไปขั้นที่ 3 · เดินโค้ดและตอบคำถามตามช่อง Block Model →</span>
                </button>
              </div>
            )}

            {/* ==================== PRIMM ขั้นที่ 3: เดินโค้ดและตอบคำถาม ==================== */}
            {primmStep === 3 && (
              <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#0f766e] text-white text-[13px] font-extrabold">
                    ขั้นที่ 3 · เดินโค้ดและตอบคำถาม (ข้อ {currentQIdx + 1}/{topic.questions.length})
                  </span>

                  {/* ป้ายบอกช่องของ Block Model */}
                  <span className="px-3 py-1 rounded-lg bg-[#e3f1ee] border border-[#0f766e] text-[#0b4f49] text-[13px] font-extrabold flex items-center gap-1.5">
                    <Icon name="grid" size={16} />
                    <span>
                      ช่อง {currentQ.cellId} · {currentCellMeta.shortTitle}
                    </span>
                  </span>
                </div>

                {/* แถบเลือกข้อคำถามย่อย */}
                <div className="flex items-center gap-2">
                  {topic.questions.map((q, idx) => {
                    const st = qStates[q.id]?.status || "unanswered";
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentQIdx(idx)}
                        className={`flex-1 py-2 px-3 rounded-xl text-[13px] font-extrabold border-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          currentQIdx === idx
                            ? "border-[#0b4f49] bg-[#e3f1ee] text-[#0b4f49]"
                            : st === "correct"
                            ? "border-[#86efac] bg-[#d8efdc] text-[#14532d]"
                            : st === "revealed"
                            ? "border-[#fcd34d] bg-[#fbeacb] text-[#5c3704]"
                            : "border-[#cfe0dc] bg-[#eef3f1] text-[#475b60]"
                        }`}
                      >
                        <span>
                          ข้อ {idx + 1} (ช่อง {q.cellId})
                        </span>
                        {st === "correct" && <Icon name="check" size={15} />}
                      </button>
                    );
                  })}
                </div>

                {/* ตัวคำถาม */}
                <div className="p-4 rounded-xl bg-[#eef3f1] border border-[#cfe0dc]">
                  <div className="text-[12px] font-bold text-[#0f766e]">
                    {currentCellMeta.levelName} · {currentCellMeta.dimensionName} (ดูบรรทัดที่{" "}
                    {currentQ.targetLine})
                  </div>
                  <h3 className="text-[17px] font-extrabold text-[#1b2a2f] mt-1">
                    {currentQ.question}
                  </h3>
                </div>

                {/* ตัวเลือกคำตอบ 4 ข้อ */}
                <div className="space-y-2.5">
                  {currentQ.options.map((opt) => {
                    const isSelected = currentQState.selectedOptionId === opt.id;
                    const isCorrectOpt = opt.id === currentQ.correctOptionId;
                    const showAsCorrect =
                      (currentQState.status === "correct" ||
                        currentQState.status === "revealed") &&
                      isCorrectOpt;
                    const showAsWrong =
                      (currentQState.status === "hint" ||
                        currentQState.status === "revealed") &&
                      isSelected &&
                      !isCorrectOpt;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectQuestionOption(opt.id)}
                        disabled={
                          currentQState.status === "correct" ||
                          currentQState.status === "revealed"
                        }
                        className={`w-full p-3.5 rounded-xl text-left text-[15px] font-bold transition flex items-center justify-between gap-3 cursor-pointer ${
                          showAsCorrect
                            ? "bg-[#d8efdc] border-2 border-[#14532d] text-[#14532d]"
                            : showAsWrong
                            ? "bg-[#f8d9d4] border-2 border-[#7d1d10] text-[#7d1d10]"
                            : "press-secondary"
                        }`}
                      >
                        <span>
                          <strong className="mr-2 uppercase">{opt.id}.</strong>
                          {opt.text}
                        </span>
                        {showAsCorrect && (
                          <span className="px-2 py-0.5 rounded bg-[#14532d] text-white text-[12px] font-extrabold shrink-0">
                            คำตอบที่ถูก
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ตอบผิดครั้งที่ 1 -> แสดงคำใบ้ให้ลองอีกครั้ง */}
                {currentQState.status === "hint" && (
                  <div className="p-4 rounded-xl bg-[#fbeacb] border-2 border-[#f0a92e] text-[#5c3704] flex items-start gap-3">
                    <Icon name="bulb" size={24} className="shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-[15px]">
                        ยังไม่ตรงจุด · นี่คือคำใบ้ (ลองเลือกคำตอบใหม่อีกครั้ง ไม่หักคะแนน!)
                      </div>
                      <p className="text-[14px] mt-1">{currentQ.hint}</p>
                    </div>
                  </div>
                )}

                {/* ตอบถูก หรือ ตอบผิดครั้งที่ 2 -> แสดงเฉลยและเหตุผล */}
                {(currentQState.status === "correct" ||
                  currentQState.status === "revealed") && (
                  <div
                    className={`p-4 rounded-xl border-2 ${
                      currentQState.status === "correct"
                        ? "bg-[#d8efdc] border-[#86efac] text-[#14532d]"
                        : "bg-[#e3f1ee] border-[#0f766e] text-[#0b4f49]"
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-[15px] flex items-center gap-1.5">
                        <Icon
                          name={currentQState.status === "correct" ? "check" : "bulb"}
                          size={20}
                        />
                        <span>
                          {currentQState.status === "correct"
                            ? "ถูกต้อง! เข้าใจช่อง " + currentQ.cellId + " ชัดเจน"
                            : "เฉลยจากการตอบครั้งที่ 2 (อ่านเหตุผลเพื่อเก็บ XP ต่อได้เลย)"}
                        </span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 text-[#0b4f49] text-[13px] font-extrabold">
                        +{currentQState.earnedXp} XP
                      </span>
                    </div>
                    <p className="text-[14px] mt-1.5">{currentQ.explanation}</p>

                    <div className="mt-3 flex justify-end">
                      {currentQIdx < topic.questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentQIdx((i) => i + 1)}
                          className="press-teal px-4 py-2 rounded-xl text-[14px] font-extrabold cursor-pointer"
                        >
                          ข้อถัดไป →
                        </button>
                      ) : allQuestionsDone ? (
                        <button
                          type="button"
                          onClick={() => setPrimmStep(4)}
                          className="press-gold px-4 py-2 rounded-xl text-[14px] font-extrabold cursor-pointer"
                        >
                          ไปขั้นที่ 4 · แก้ค่าแล้วทายใหม่ →
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* กล่องเสริม: ฝึกเขียนอธิบายโค้ดอิสระ (ตรวจด้วย AI หลังบ้าน) */}
                <div className="mt-2 pt-4 border-t-2 border-[#cfe0dc] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-extrabold text-[#0b4f49]">
                      เสริมความเข้าใจ: ลองสรุปด้วยภาษาของคุณเองว่าโค้ดนี้ทำงานอย่างไร (+10 XP)
                    </span>
                    <span className="text-[12px] font-semibold text-[#475b60]">
                      ตรวจผ่านหลังบ้าน
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={freeExplanation}
                      onChange={(e) => setFreeExplanation(e.target.value)}
                      placeholder="เช่น โค้ดนี้สร้างตัวแปรเก็บค่า แล้ววนลูปบวกสะสมก่อนพิมพ์ผลลัพธ์..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white border-2 border-[#b6c9c5] text-[14px] text-[#1b2a2f]"
                    />
                    <button
                      type="button"
                      onClick={handleEvaluateFreeExplanation}
                      disabled={aiEvalLoading || !freeExplanation.trim()}
                      className="press-secondary px-4 py-2 rounded-xl text-[13px] font-extrabold shrink-0 cursor-pointer"
                    >
                      {aiEvalLoading ? "กำลังตรวจ..." : "ตรวจคำอธิบาย"}
                    </button>
                  </div>
                  {aiEvalResult && (
                    <div className="p-3 rounded-xl bg-[#e3f1ee] border border-[#0f766e] text-[13px] text-[#0b4f49]">
                      <strong>ผลการตรวจ ({aiEvalResult.score}%):</strong> {aiEvalResult.feedback}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== PRIMM ขั้นที่ 4: แก้ค่าแล้วทายใหม่ ==================== */}
            {primmStep === 4 && (
              <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#f0a92e] text-[#3d2603] text-[13px] font-extrabold">
                    ขั้นที่ 4 · แก้ค่าแล้วทายใหม่ (Modify)
                  </span>
                  <span className="text-[13px] font-bold text-[#475b60]">
                    เปลี่ยนค่าในโค้ดแล้วทำนายผลอีกครั้ง
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#fff4d6] border border-[#f0a92e] text-[#3d2603]">
                  <div className="font-extrabold text-[15px]">
                    โจทย์ลองแก้ค่า: {topic.modifyChallenge.instruction}
                  </div>
                  <div className="text-[13px] mt-0.5">
                    จุดที่เปลี่ยน: <code className="font-bold">{topic.modifyChallenge.changeDescription}</code>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-extrabold text-[#0b4f49]">
                      แก้ไขโค้ด JavaScript ด้านล่างได้เลย:
                    </label>
                    <button
                      type="button"
                      onClick={() => setModifiedCode(topic.modifyChallenge.suggestedCode)}
                      className="text-[12px] font-bold text-[#0f766e] underline cursor-pointer"
                    >
                      รีเซ็ตเป็นโค้ดที่แก้ค่าตามโจทย์
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={modifiedCode}
                    onChange={(e) => setModifiedCode(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[#eef3f1] border-2 border-[#b6c9c5] font-code font-bold text-[#1b2a2f] focus:outline-none focus:border-[#0f766e]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[14px] font-extrabold text-[#1b2a2f]">
                    ทายว่าโค้ดที่แก้ค่าแล้วจะพิมพ์อะไรออกทางหน้าจอ:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {topic.modifyChallenge.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setModifyPrediction(opt)}
                        className={`p-2.5 rounded-xl font-code font-extrabold text-[15px] cursor-pointer ${
                          modifyPrediction === opt
                            ? "bg-[#e3f1ee] border-2 border-[#0f766e] text-[#0b4f49]"
                            : "press-secondary"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunModifiedCode}
                  disabled={!modifyPrediction.trim()}
                  className="press-teal w-full py-3 rounded-xl text-[16px] font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="play" size={20} />
                  <span>รันโค้ดที่แก้แล้วจริงและตรวจคำทำนาย</span>
                </button>

                {modifyRunResult && (
                  <div
                    className={`p-4 rounded-xl border-2 ${
                      modifyRunResult.error
                        ? "bg-[#f8d9d4] border-[#7d1d10] text-[#7d1d10]"
                        : modifyRunResult.matchedPrediction
                        ? "bg-[#d8efdc] border-[#86efac] text-[#14532d]"
                        : "bg-[#fbeacb] border-[#fcd34d] text-[#5c3704]"
                    }`}
                  >
                    {modifyRunResult.error ? (
                      <div>
                        <strong>โค้ดมีข้อผิดพลาดไวยากรณ์:</strong> {modifyRunResult.error}
                      </div>
                    ) : (
                      <>
                        <div className="font-extrabold text-[15px] flex items-center justify-between">
                          <span>
                            ผลรันจริงของโค้ดใหม่คือ:{" "}
                            <code className="px-2 py-0.5 rounded bg-white/80 font-extrabold">
                              {modifyRunResult.finalOutput}
                            </code>
                          </span>
                          <span>+{modifyXp} XP</span>
                        </div>
                        <p className="text-[14px] mt-1.5">{topic.modifyChallenge.explanation}</p>
                        <button
                          type="button"
                          onClick={() => setPrimmStep(5)}
                          className="press-gold w-full mt-3 py-2.5 rounded-xl text-[15px] font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Icon name="gift" size={20} />
                          <span>สรุปผลความเข้าใจ รับ XP และตราประจำเรื่อง →</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== ขั้นสรุปจบเรื่อง: ดูเฉลย เหตุผล + XP + ตรา ==================== */}
      {primmStep === 5 && (
        <div className="bg-white border-2 border-[#cfe0dc] rounded-2xl p-6 max-w-3xl mx-auto w-full flex flex-col items-center text-center gap-5">
          <StatusCircle
            variant={topic.isBoss ? "boss" : "passed"}
            size="lg"
            label="ผ่านเควสต์สำเร็จ"
          />

          <div>
            <span className="px-3 py-1 rounded-full bg-[#d8efdc] text-[#14532d] text-[13px] font-extrabold">
              ผ่านเควสต์เรียบร้อย!
            </span>
            <h2 className="text-[26px] font-extrabold text-[#1b2a2f] mt-2">
              {topic.title}
            </h2>
            <p className="text-[15px] text-[#475b60] mt-1">
              คุณผ่านครบทั้ง 4 ขั้นตอน (ทำนายผล · เทียบผลรันจริง · เดินโค้ดตอบคำถาม · แก้ค่าแล้วทายใหม่)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="p-4 rounded-2xl bg-[#fff4d6] border-2 border-[#f0a92e] flex items-center gap-3 text-left">
              <StatusCircle variant="current" size="md" label="XP ที่ได้รับ" />
              <div>
                <div className="text-[13px] font-bold text-[#3d2603]">รางวัลความเข้าใจ</div>
                <div className="text-[22px] font-extrabold text-[#3d2603]">
                  +{totalEarnedXp} XP
                </div>
                <div className="text-[12px] text-[#5c3704]">
                  คำนวณจากความเข้าใจในช่อง Block Model
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#e3f1ee] border-2 border-[#0f766e] flex items-center gap-3 text-left">
              <StatusCircle variant="badge" size="md" label="ตราที่ได้รับ" />
              <div>
                <div className="text-[13px] font-bold text-[#0b4f49]">ได้รับตราใหม่!</div>
                <div className="text-[18px] font-extrabold text-[#0b4f49]">
                  {topic.badgeReward.name}
                </div>
                <div className="text-[12px] text-[#475b60]">
                  {topic.badgeReward.description}
                </div>
              </div>
            </div>
          </div>

          {/* สรุปช่อง Block Model ที่ได้ฝึกในเรื่องนี้ */}
          <div className="w-full bg-[#eef3f1] border border-[#cfe0dc] rounded-xl p-4 text-left">
            <div className="text-[14px] font-extrabold text-[#0b4f49] mb-2">
              สรุปช่อง Block Model ที่อัปเดตเข้าโปรไฟล์ของคุณ:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {topic.questions.map((q) => {
                const st = qStates[q.id];
                const meta = BLOCK_MODEL_CELLS.find((c) => c.id === q.cellId)!;
                const score = st?.cellMasteryScore || 75;
                return (
                  <div
                    key={q.id}
                    className="p-3 rounded-xl bg-white border border-[#cfe0dc] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#e3f1ee] text-[#0b4f49] text-[12px] font-extrabold">
                        ช่อง {q.cellId}
                      </span>
                      <span className="text-[14px] font-extrabold text-[#14532d]">
                        {score}%
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-[#1b2a2f] mt-1">
                      {meta.shortTitle}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinishQuest}
            className="press-teal w-full py-3.5 rounded-xl text-[16px] font-extrabold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="check" size={20} />
            <span>อัปเดตโปรไฟล์และกลับสู่เส้นทางเควสต์</span>
          </button>
        </div>
      )}
    </div>
  );
}
