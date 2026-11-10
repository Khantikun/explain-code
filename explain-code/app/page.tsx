"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CODE_PRESETS,
  CodePreset,
  analyzeCustomCode,
  evaluateExplanation,
} from "./lib/codeAnalyzer";

interface SessionRecord {
  id: string;
  studentName: string;
  presetTitle: string;
  totalScore: number;
  rank: string;
  timestamp: string;
  radar: {
    logic: number;
    state: number;
    edgeCase: number;
    syntax: number;
  };
}

type Stage = "xray" | "interrogate" | "sabotage" | "mastery";
type DuckMood = "idle" | "speaking" | "impressed" | "suspicious" | "sabotage";

const STORAGE_KEY = "duckvibe_sessions_v1";

export default function DuckVibeApp() {
  // Preset & Custom Code State
  const [selectedPreset, setSelectedPreset] = useState<CodePreset>(CODE_PRESETS[0]);
  const [customCodeInput, setCustomCodeInput] = useState<string>("");
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [studentName, setStudentName] = useState<string>("น้องเอ็ม (Vibe Coder)");
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [showApiModal, setShowApiModal] = useState<boolean>(false);

  // Stage Navigation
  const [activeStage, setActiveStage] = useState<Stage>("xray");

  // Stage 1: X-Ray Execution Visualizer State
  const [activeNodeIndex, setActiveNodeIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Stage 2: Duck Interrogation State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [answerText, setAnswerText] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [duckMood, setDuckMood] = useState<DuckMood>("idle");
  const [questionResults, setQuestionResults] = useState<
    Record<
      string,
      {
        score: number;
        passed: boolean;
        feedback: string;
        studentAnswer: string;
        mode?: string;
      }
    >
  >({});

  // Stage 3: Sabotage Lab State
  const [selectedSabotageLine, setSelectedSabotageLine] = useState<number | null>(null);
  const [selectedSabotageOpt, setSelectedSabotageOpt] = useState<string | null>(null);
  const [sabotageSolved, setSabotageSolved] = useState<boolean>(false);

  // Radar Scores (4 Dimensions)
  const [radarScores, setRadarScores] = useState({
    logic: 45,
    state: 45,
    edgeCase: 40,
    syntax: 50,
  });

  // Persistent History (LocalStorage No-SQL Store)
  const [savedSessions, setSavedSessions] = useState<SessionRecord[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved sessions from LocalStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSavedSessions(JSON.parse(raw));
      } else {
        const seed: SessionRecord[] = [
          {
            id: "seed-1",
            studentName: "กิตติพงศ์ (CS ปี 3)",
            presetTitle: "ระบบคิดเงินตะกร้าสินค้า + เช็คสต็อก (Async/Await)",
            totalScore: 92,
            rank: "SSS",
            timestamp: "10 นาทีที่แล้ว",
            radar: { logic: 95, state: 90, edgeCase: 88, syntax: 95 },
          },
          {
            id: "seed-2",
            studentName: "แพรวา (IT ปี 2)",
            presetTitle: "ค้นหาคะแนนสอบด้วย Binary Search",
            totalScore: 81,
            rank: "S",
            timestamp: "25 นาทีที่แล้ว",
            radar: { logic: 85, state: 80, edgeCase: 75, syntax: 84 },
          },
        ];
        setSavedSessions(seed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Auto-step X-Ray animation when playing
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setActiveNodeIndex((prev) => {
          if (prev + 1 >= selectedPreset.nodes.length) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1800);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, selectedPreset.nodes.length]);

  // Text-to-Speech helper for the Cyber Duck
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "th-TH";
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.onstart = () => setDuckMood("speaking");
      utterance.onend = () => setDuckMood("idle");
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore speech errors
    }
  };

  // Switch code preset
  const handleSelectPreset = (preset: CodePreset) => {
    setIsPlaying(false);
    setSelectedPreset(preset);
    setActiveNodeIndex(0);
    setCurrentQuestionIdx(0);
    setAnswerText("");
    setQuestionResults({});
    setSelectedSabotageLine(null);
    setSelectedSabotageOpt(null);
    setSabotageSolved(false);
    setRadarScores({ logic: 45, state: 45, edgeCase: 40, syntax: 50 });
    setActiveStage("xray");
  };

  // Handle Custom Code submission
  const handleAnalyzeCustomCode = () => {
    if (!customCodeInput.trim()) return;
    const analyzed = analyzeCustomCode(customCodeInput.trim());
    handleSelectPreset(analyzed);
    setShowCustomModal(false);
  };

  // Web Speech API Microphone Input
  const handleToggleMic = () => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("เบราว์เซอร์ของคุณไม่รองรับการสั่งงานด้วยเสียง (แนะนำให้เปิดด้วย Chrome หรือ Edge ครับ)");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "th-TH";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setDuckMood("suspicious");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAnswerText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
      setDuckMood("idle");
    };

    recognition.onerror = () => {
      setIsListening(false);
      setDuckMood("idle");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Evaluate student's explanation (Hybrid: Live Gemini API if key exists + instant AST heuristic engine)
  const handleSubmitExplanation = async () => {
    const currentQ = selectedPreset.questions[currentQuestionIdx];
    if (!currentQ || !answerText.trim()) return;

    setIsEvaluating(true);
    setDuckMood("suspicious");

    let finalResult = evaluateExplanation(answerText, currentQ);
    let modeUsed = "AST Heuristic Engine";

    if (geminiApiKey.trim()) {
      try {
        const res = await fetch("/api/interrogate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: selectedPreset.code,
            question: currentQ.question,
            studentAnswer: answerText,
            apiKey: geminiApiKey.trim(),
          }),
        });
        const data = await res.json();
        if (data.mode === "gemini-live") {
          finalResult = {
            score: data.score,
            passed: data.passed,
            matchedKeywords: [],
            feedback: `${data.feedback} ${data.followUpTip ? `💡 (${data.followUpTip})` : ""}`,
          };
          modeUsed = "Gemini 2.5 Flash Live";
        }
      } catch {
        // Fallback to instant engine
      }
    }

    setQuestionResults((prev) => ({
      ...prev,
      [currentQ.id]: {
        score: finalResult.score,
        passed: finalResult.passed,
        feedback: finalResult.feedback,
        studentAnswer: answerText,
        mode: modeUsed,
      },
    }));

    // Update 4D Radar Chart
    setRadarScores((prev) => ({
      ...prev,
      [currentQ.dimension]: Math.min(100, Math.max(prev[currentQ.dimension], finalResult.score)),
      state: Math.min(100, Math.round((prev.state + finalResult.score) / 1.8)),
    }));

    setIsEvaluating(false);
    setDuckMood(finalResult.passed ? "impressed" : "suspicious");
    speakText(finalResult.feedback);
  };

  // Handle Sabotage Answer
  const handleSelectSabotageOption = (optId: string, isCorrect: boolean, feedback: string) => {
    setSelectedSabotageOpt(optId);
    if (isCorrect) {
      setSabotageSolved(true);
      setDuckMood("impressed");
      setRadarScores((prev) => ({
        logic: Math.min(100, prev.logic + 12),
        state: Math.min(100, prev.state + 12),
        edgeCase: Math.min(100, prev.edgeCase + 18),
        syntax: Math.min(100, prev.syntax + 10),
      }));
      speakText("สุดยอด! คุณหาจุดที่ถูกวางยาเจอ แปลว่าเข้าใจโค้ดชุดนี้ทะลุปรุโปร่งของจริง!");
    } else {
      setDuckMood("sabotage");
      speakText(feedback);
    }
  };

  // Compute overall score & rank
  const totalMasteryScore = Math.round(
    (radarScores.logic + radarScores.state + radarScores.edgeCase + radarScores.syntax) / 4
  );
  const masteryRank =
    totalMasteryScore >= 88
      ? "SSS"
      : totalMasteryScore >= 78
      ? "S"
      : totalMasteryScore >= 65
      ? "A"
      : "B";

  // Save Session to LocalStorage Leaderboard
  const handleSaveMasterySession = () => {
    const newRecord: SessionRecord = {
      id: "sess-" + Date.now(),
      studentName: studentName.trim() || "นิสิตนิรนาม",
      presetTitle: selectedPreset.title,
      totalScore: totalMasteryScore,
      rank: masteryRank,
      timestamp: "เมื่อสักครู่",
      radar: { ...radarScores },
    };
    const updated = [newRecord, ...savedSessions.slice(0, 9)];
    setSavedSessions(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    speakText(`บันทึกผลคะแนนระดับ ${masteryRank} ของ ${newRecord.studentName} เรียบร้อย!`);
  };

  // Export JSON report for Teacher
  const handleExportTeacherReport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      platform: "DuckVibe X-Ray (Vibe Coding Competition Edition)",
      studentName,
      codeTitle: selectedPreset.title,
      totalMasteryScore,
      masteryRank,
      radarScores,
      questionResults,
      sabotageSolved,
      allClassroomSessions: savedSessions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `duckvibe-report-${studentName.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentNode = selectedPreset.nodes[activeNodeIndex] || selectedPreset.nodes[0];
  const currentQuestion =
    selectedPreset.questions[currentQuestionIdx] || selectedPreset.questions[0];
  const currentQResult = currentQuestion ? questionResults[currentQuestion.id] : undefined;

  // Determine which line of code should be highlighted right now
  const highlightedLine =
    activeStage === "xray"
      ? currentNode?.line
      : activeStage === "interrogate"
      ? currentQuestion?.targetLine
      : activeStage === "sabotage"
      ? selectedSabotageLine
      : null;

  // Build code lines (in Sabotage mode, inject mutated line!)
  const codeLines = selectedPreset.code.split("\n").map((lineText, idx) => {
    const lineNum = idx + 1;
    if (activeStage === "sabotage" && lineNum === selectedPreset.sabotage.sabotagedLine) {
      return selectedPreset.sabotage.mutatedCode;
    }
    return lineText;
  });

  // Calculate SVG Radar polygon points
  const getRadarPoints = () => {
    const cx = 110;
    const cy = 110;
    const maxR = 80;
    const top = `${cx},${cy - (radarScores.logic / 100) * maxR}`;
    const right = `${cx + (radarScores.state / 100) * maxR},${cy}`;
    const bottom = `${cx},${cy + (radarScores.edgeCase / 100) * maxR}`;
    const left = `${cx - (radarScores.syntax / 100) * maxR},${cy}`;
    return `${top} ${right} ${bottom} ${left}`;
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* Cyberpunk Ambient Glow Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-[130px]" />
      </div>

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#070913]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-600 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#0b0f1f] rounded-[14px] flex items-center justify-center text-2xl">
                🦆
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-amber-300 via-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">
                  DuckVibe X-Ray
                </h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Vibe Coding Edition
                </span>
              </div>
              <p className="text-xs text-slate-400">
                แก้ปัญหา &ldquo;นักเรียนเขียนโค้ดได้ แต่อธิบายไม่ได้ว่าโค้ดทำงานอย่างไร&rdquo;
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-xs text-slate-400">ชื่อผู้เข้าสอบ:</span>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="bg-transparent text-xs font-medium text-cyan-300 focus:outline-none w-32 sm:w-36"
                placeholder="ชื่อของคุณ..."
              />
            </div>

            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                voiceEnabled
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
              title="เปิด/ปิดเสียงพากย์สารวัตรเป็ด"
            >
              {voiceEnabled ? "🔊 เสียงเป็ด: เปิด" : "🔇 เสียงเป็ด: ปิด"}
            </button>

            <button
              onClick={() => setShowCustomModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition cursor-pointer"
            >
              + วางโค้ดของคุณเอง
            </button>

            <button
              onClick={() => setShowApiModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              {geminiApiKey ? "🟢 Gemini API เชื่อมแล้ว" : "⚙️ ตั้งค่า AI Key"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Preset Selector & 4-Step Mission Progress Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-900/60 border border-slate-800/90 rounded-2xl p-4 backdrop-blur-md">
          {/* Code Preset Pills */}
          <div className="lg:col-span-5 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">
              1. เลือกโจทย์โค้ดที่ต้องการผ่าตัด (หรือวางโค้ดสด):
            </span>
            <div className="flex flex-wrap gap-2">
              {CODE_PRESETS.map((preset) => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-cyan-500/25 to-blue-600/25 text-cyan-200 border border-cyan-400/50 shadow-sm shadow-cyan-500/20"
                        : "bg-slate-950/70 hover:bg-slate-800/80 text-slate-400 border border-slate-800"
                    }`}
                  >
                    <span>{preset.id === "async-cart" ? "🛒" : "🔍"}</span>
                    <span className="truncate max-w-[190px]">{preset.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Interactive Stages */}
          <div className="lg:col-span-7 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">
              2. ขั้นตอนเปลี่ยน &ldquo;คนก๊อปโค้ด&rdquo; ให้เป็น &ldquo;คนเข้าใจโค้ดจริง&rdquo;:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: "xray" as Stage,
                  step: "STEP 1",
                  title: "🧬 ผ่าตัด X-Ray",
                  sub: "เห็นข้อมูลไหลจริง",
                },
                {
                  id: "interrogate" as Stage,
                  step: "STEP 2",
                  title: "🦆 ห้องสืบสวนเป็ด",
                  sub: "สอบปากเปล่าไมค์สด",
                },
                {
                  id: "sabotage" as Stage,
                  step: "STEP 3",
                  title: "💣 ด่านวางยาโค้ด",
                  sub: "จับผิดโค้ดที่ถูกบิด",
                },
                {
                  id: "mastery" as Stage,
                  step: "STEP 4",
                  title: "🏆 ใบรับรอง & สถิติ",
                  sub: `คะแนนรวม: ${totalMasteryScore}%`,
                },
              ].map((st) => {
                const active = activeStage === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveStage(st.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      active
                        ? "bg-gradient-to-br from-amber-500/20 via-cyan-500/15 to-fuchsia-500/20 border-cyan-400/60 shadow-lg shadow-cyan-500/10"
                        : "bg-slate-950/60 hover:bg-slate-900 border-slate-800/80 text-slate-400"
                    }`}
                  >
                    <div className="text-[10px] font-bold tracking-wider text-cyan-400">
                      {st.step}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-100 mt-0.5">
                      {st.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{st.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Core Split Workspace: Left = Live Code X-Ray Editor | Right = Interactive Stage Arena */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: Live Code Inspector + Cyber Duck Radar */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Code Viewer Card */}
            <div className="bg-slate-900/75 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-slate-300 font-semibold">
                    {selectedPreset.title}
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                  {selectedPreset.language}
                </span>
              </div>

              {activeStage === "sabotage" && (
                <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2 text-xs text-rose-200 flex items-center justify-between">
                  <span>⚠️ โหมดวางยา: มีโค้ด 1 บรรทัดถูกแอบดัดแปลง คลิกบรรทัดที่น่าสงสัย!</span>
                  <span className="font-mono text-[11px] bg-rose-500/30 px-2 py-0.5 rounded">
                    MUTATION ACTIVE
                  </span>
                </div>
              )}

              <div className="p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto space-y-1">
                {codeLines.map((line, index) => {
                  const lineNumber = index + 1;
                  const isHighlighted = highlightedLine === lineNumber;
                  const isSabotageTarget =
                    activeStage === "sabotage" &&
                    lineNumber === selectedPreset.sabotage.sabotagedLine;

                  return (
                    <div
                      key={lineNumber}
                      onClick={() => {
                        if (activeStage === "sabotage") {
                          setSelectedSabotageLine(lineNumber);
                        } else if (activeStage === "xray") {
                          const foundIdx = selectedPreset.nodes.findIndex(
                            (n) => n.line === lineNumber
                          );
                          if (foundIdx >= 0) setActiveNodeIndex(foundIdx);
                        }
                      }}
                      className={`group flex items-start gap-3 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        isHighlighted
                          ? activeStage === "sabotage"
                            ? "bg-rose-500/25 border border-rose-400/60 text-rose-100 shadow-sm"
                            : "bg-cyan-500/20 border border-cyan-400/60 text-cyan-100 shadow-sm"
                          : "hover:bg-slate-800/60 text-slate-300 border border-transparent"
                      }`}
                    >
                      <span
                        className={`w-6 text-right select-none text-xs ${
                          isHighlighted ? "text-cyan-300 font-bold" : "text-slate-600"
                        }`}
                      >
                        {lineNumber}
                      </span>
                      <pre className="flex-1 whitespace-pre-wrap break-all">{line || " "}</pre>
                      {isHighlighted && (
                        <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300">
                          {activeStage === "xray"
                            ? "⚡ กำลังทำงาน"
                            : activeStage === "interrogate"
                            ? "🦆 เป็ดถามจุดนี้"
                            : isSabotageTarget
                            ? "🎯 จุดต้องสงสัย"
                            : "🔍 ตรวจสอบ"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real-time 4D Understanding Radar & Cyber Duck Status */}
            <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
              {/* Animated SVG Cyber Duck Avatar */}
              <div className="flex flex-col items-center text-center w-full sm:w-44 shrink-0">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div
                    className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${
                      duckMood === "impressed"
                        ? "bg-emerald-500/30 scale-110"
                        : duckMood === "sabotage"
                        ? "bg-rose-500/35 scale-110"
                        : duckMood === "speaking"
                        ? "bg-amber-400/35 scale-105 animate-pulse"
                        : "bg-cyan-500/20"
                    }`}
                  />
                  <svg
                    viewBox="0 0 120 120"
                    className="w-24 h-24 relative z-10 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                  >
                    {/* Duck Body */}
                    <ellipse cx="60" cy="82" rx="34" ry="24" fill="#fbbf24" />
                    {/* Duck Head */}
                    <circle cx="60" cy="46" r="24" fill="#f59e0b" />
                    {/* Detective Cyber Visor */}
                    <rect
                      x="38"
                      y="34"
                      width="44"
                      height="13"
                      rx="6"
                      fill="#0f172a"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                    />
                    {/* Visor Glowing Eyes */}
                    <circle
                      cx="50"
                      cy="40.5"
                      r="3.5"
                      fill={
                        duckMood === "sabotage"
                          ? "#f43f5e"
                          : duckMood === "impressed"
                          ? "#34d399"
                          : "#22d3ee"
                      }
                    />
                    <circle
                      cx="70"
                      cy="40.5"
                      r="3.5"
                      fill={
                        duckMood === "sabotage"
                          ? "#f43f5e"
                          : duckMood === "impressed"
                          ? "#34d399"
                          : "#22d3ee"
                      }
                    />
                    {/* Duck Beak (opens when speaking) */}
                    {duckMood === "speaking" ? (
                      <ellipse cx="60" cy="56" rx="14" ry="7" fill="#ea580c" />
                    ) : (
                      <path
                        d="M46 53 Q60 62 74 53 Q60 57 46 53 Z"
                        fill="#ea580c"
                        stroke="#c2410c"
                        strokeWidth="2"
                      />
                    )}
                    {/* Detective Cyber Hat */}
                    <path d="M32 28 L88 28 L76 14 L44 14 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-amber-300 mt-1">
                  สารวัตรเป็ดไซเบอร์ (AI)
                </span>
                <span className="text-[11px] text-slate-400">
                  {duckMood === "impressed"
                    ? "🤩 ประทับใจในคำอธิบาย!"
                    : duckMood === "suspicious"
                    ? "🧐 กำลังจับผิดตรรกะของคุณ..."
                    : duckMood === "sabotage"
                    ? "😈 โหมดวางยาโค้ดทำงาน!"
                    : "🎙️ พร้อมฟังคุณอธิบายโค้ด"}
                </span>
              </div>

              {/* 4D Understanding Radar SVG */}
              <div className="flex-1 flex flex-col items-center">
                <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-2">
                  <span>เรดาร์วัดความเข้าใจโค้ด 4 มิติ</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300">
                    Rank {masteryRank} ({totalMasteryScore}%)
                  </span>
                </div>
                <svg viewBox="0 0 220 220" className="w-44 h-44">
                  {/* Background Grid Diamonds */}
                  {[0.25, 0.5, 0.75, 1].map((scale, i) => {
                    const r = 80 * scale;
                    return (
                      <polygon
                        key={i}
                        points={`110,${110 - r} ${110 + r},110 110,${110 + r} ${110 - r},110`}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                  {/* Axes */}
                  <line x1="110" y1="30" x2="110" y2="190" stroke="#334155" strokeWidth="1" />
                  <line x1="30" y1="110" x2="190" y2="110" stroke="#334155" strokeWidth="1" />

                  {/* Dynamic Student Score Polygon */}
                  <polygon
                    points={getRadarPoints()}
                    fill="rgba(34, 211, 238, 0.28)"
                    stroke="#22d3ee"
                    strokeWidth="2.5"
                  />

                  {/* Labels */}
                  <text x="110" y="18" textAnchor="middle" fill="#94a3b8" fontSize="10">
                    Logic ({radarScores.logic}%)
                  </text>
                  <text x="208" y="113" textAnchor="end" fill="#94a3b8" fontSize="10">
                    State ({radarScores.state}%)
                  </text>
                  <text x="110" y="208" textAnchor="middle" fill="#94a3b8" fontSize="10">
                    Edge Case ({radarScores.edgeCase}%)
                  </text>
                  <text x="12" y="113" textAnchor="start" fill="#94a3b8" fontSize="10">
                    Syntax ({radarScores.syntax}%)
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Active Stage Interactive Arena */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* ==================== STAGE 1: CODE X-RAY VISUALIZER ==================== */}
            {activeStage === "xray" && (
              <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      STEP 1 • CODE X-RAY & DATA FLOW
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                      ผ่าตัดการทำงานของโค้ดทีละจังหวะ (Step-by-Step Execution)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      กดปุ่มจำลองการรันเพื่อดูว่าตัวแปรเปลี่ยนค่าอย่างไรในแต่ละบรรทัดก่อนไปสอบปากเปล่ากับเป็ด!
                    </p>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setActiveNodeIndex((prev) => Math.max(0, prev - 1));
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      ⏮ ก่อนหน้า
                    </button>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isPlaying
                          ? "bg-amber-500 text-slate-950"
                          : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                      }`}
                    >
                      {isPlaying ? "⏸ หยุดชั่วคราว" : "▶ รันจำลองอัตโนมัติ"}
                    </button>
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setActiveNodeIndex((prev) =>
                          prev + 1 < selectedPreset.nodes.length ? prev + 1 : 0
                        );
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      ถัดไป ⏭
                    </button>
                  </div>
                </div>

                {/* Interactive Flowchart Nodes */}
                <div className="grid grid-cols-1 gap-2.5">
                  {selectedPreset.nodes.map((node, idx) => {
                    const isCurrent = idx === activeNodeIndex;
                    const isPassed = idx < activeNodeIndex;

                    const badgeColor =
                      node.type === "async"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        : node.type === "condition"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : node.type === "loop"
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                        : node.type === "output"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";

                    return (
                      <div
                        key={node.id}
                        onClick={() => {
                          setIsPlaying(false);
                          setActiveNodeIndex(idx);
                          speakText(node.explanation);
                        }}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                          isCurrent
                            ? "bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10 scale-[1.01]"
                            : isPassed
                            ? "bg-slate-950/60 border-slate-800/80 opacity-80"
                            : "bg-slate-950/40 border-slate-800/60 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                                isCurrent
                                  ? "bg-cyan-400 text-slate-950"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-bold text-sm text-slate-100">{node.label}</span>
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${badgeColor}`}
                            >
                              บรรทัด {node.line} • {node.type}
                            </span>
                          </div>
                          {isCurrent && (
                            <span className="text-xs font-semibold text-cyan-300 animate-pulse">
                              ● ข้อมูลกำลังไหลผ่านจุดนี้
                            </span>
                          )}
                        </div>

                        {isCurrent && (
                          <div className="mt-1 pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                            <div className="sm:col-span-7 text-xs text-slate-300 leading-relaxed">
                              💡 <strong className="text-cyan-300">สิ่งที่เกิดขึ้นจริง:</strong>{" "}
                              {node.explanation}
                            </div>
                            <div className="sm:col-span-5 bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px]">
                              <div className="text-[10px] text-slate-400 mb-1 uppercase">
                                📦 ค่าตัวแปรในหน่วยความจำ (RAM State):
                              </div>
                              {Object.entries(node.variableState).map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-2 text-cyan-200">
                                  <span className="text-slate-400">{k}:</span>
                                  <span className="font-semibold truncate">{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Next Step CTA */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveStage("interrogate");
                      speakText(selectedPreset.questions[0]?.question || "พร้อมสอบปากเปล่าหรือยัง");
                    }}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-400 via-orange-500 to-pink-600 text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 transition cursor-pointer"
                  >
                    เข้าใจ Flow แล้ว! ไปด่านที่ 2: สอบปากเปล่ากับสารวัตรเป็ด 🦆 ➔
                  </button>
                </div>
              </div>
            )}

            {/* ==================== STAGE 2: AI RUBBER DUCK INTERROGATION ==================== */}
            {activeStage === "interrogate" && currentQuestion && (
              <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      STEP 2 • THE RUBBER DUCK INTERROGATION
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                      ห้องสืบสวนปากเปล่า: อธิบายให้เป็ดฟังว่าบรรทัดนี้ทำงานอย่างไร!
                    </h2>
                  </div>

                  {/* Question Selector Pills */}
                  <div className="flex items-center gap-1.5">
                    {selectedPreset.questions.map((q, idx) => {
                      const done = Boolean(questionResults[q.id]);
                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            setCurrentQuestionIdx(idx);
                            setAnswerText(questionResults[q.id]?.studentAnswer || "");
                            speakText(q.question);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            idx === currentQuestionIdx
                              ? "bg-amber-400 text-slate-950"
                              : done
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          ข้อที่ {idx + 1} {done ? "✓" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question Bubble from Cyber Duck */}
                <div className="bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 relative">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      🎯 เป้าหมายสืบสวน: บรรทัดที่ {currentQuestion.targetLine} (
                      {currentQuestion.dimensionLabel})
                    </span>
                    <button
                      onClick={() => speakText(currentQuestion.question)}
                      className="text-xs text-amber-300 hover:underline cursor-pointer"
                    >
                      🔊 ให้เป็ดอ่านคำถามซ้ำ
                    </button>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                    &ldquo;{currentQuestion.question}&rdquo;
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    💡 <strong>คำใบ้จากเป็ด:</strong> {currentQuestion.hint}
                  </p>
                </div>

                {/* Student Voice / Text Input Box */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-300">
                      คำอธิบายของคุณ (พูดใส่ไมค์ หรือพิมพ์ด้วยภาษาของคุณเอง):
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAnswerText(currentQuestion.modelAnswer)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition cursor-pointer"
                        title="ปุ่มช่วยสาธิตตอนแข่ง: กรอกคำตอบตัวอย่างทันที"
                      >
                        ⚡ กรอกคำตอบสาธิต (สำหรับโชว์กรรมการ)
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleMic}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isListening
                            ? "bg-rose-500 text-white animate-pulse"
                            : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {isListening ? "🔴 กำลังฟังเสียงพูด..." : "🎙️ เปิดไมค์พูดตอบ"}
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="อธิบายด้วยภาษามนุษย์ได้เลย เช่น ถ้าเอา await ออก ตัวแปรจะได้ค่าเป็น Promise ทำให้เช็คเงื่อนไขผิด..."
                    className="w-full rounded-xl bg-slate-950/90 border border-slate-700 focus:border-cyan-400 focus:outline-none p-3.5 text-sm text-slate-100 placeholder:text-slate-600"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={handleSubmitExplanation}
                      disabled={isEvaluating || !answerText.trim()}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 disabled:opacity-40 transition cursor-pointer"
                    >
                      {isEvaluating
                        ? "⏳ สารวัตรเป็ดกำลังวิเคราะห์ตรรกะ..."
                        : "✅ ส่งคำอธิบายให้เป็ดตรวจ"}
                    </button>

                    <button
                      onClick={() => setActiveStage("sabotage")}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                    >
                      ข้ามไปด่านที่ 3: โหมดวางยาโค้ด 💣 ➔
                    </button>
                  </div>
                </div>

                {/* Evaluation Result Card */}
                {currentQResult && (
                  <div
                    className={`p-4 rounded-xl border ${
                      currentQResult.passed
                        ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-100"
                        : "bg-amber-950/30 border-amber-500/50 text-amber-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold">
                        ผลประเมินความเข้าใจ: {currentQResult.score}/100 คะแนน
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900/80 text-slate-300">
                        Engine: {currentQResult.mode}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed">{currentQResult.feedback}</p>
                    <div className="mt-3 pt-2.5 border-t border-white/10 text-xs text-slate-300">
                      <strong className="text-cyan-300">แนวคิดมาตรฐาน (Mental Model):</strong>{" "}
                      {currentQuestion.modelAnswer}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== STAGE 3: SABOTAGE LAB (FIND THE MUTANT BUG) ==================== */}
            {activeStage === "sabotage" && (
              <div className="bg-slate-900/75 border border-rose-500/40 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 shadow-2xl">
                <div className="border-b border-slate-800 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    STEP 3 • SABOTAGE LAB (REVERSE DEBUGGING)
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                    ด่านวางยาโค้ด: ถ้าคุณเข้าใจโค้ดจริง ต้องรู้ว่าบรรทัดไหนถูกแอบดัดแปลง!
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    AI ได้แอบแก้ไขโค้ดฝั่งซ้ายไป 1 จุดจนเกิดบั๊กร้ายแรง อ่านอาการพังด้านล่างแล้ววินิจฉัยสาเหตุที่แท้จริง
                  </p>
                </div>

                {/* Production Bug Symptom Alert */}
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-300 mb-1">
                    อาการบั๊กที่เกิดขึ้นจริง (Production Incident):
                  </div>
                  <p className="text-sm sm:text-base font-semibold">
                    {selectedPreset.sabotage.symptom}
                  </p>
                </div>

                {/* Code Diff Hint if line clicked */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">บรรทัดที่คุณคลิกตรวจสอบในโค้ดฝั่งซ้าย: </span>
                    {selectedSabotageLine ? (
                      <span
                        className={`font-bold ${
                          selectedSabotageLine === selectedPreset.sabotage.sabotagedLine
                            ? "text-emerald-400"
                            : "text-amber-300"
                        }`}
                      >
                        บรรทัดที่ {selectedSabotageLine}{" "}
                        {selectedSabotageLine === selectedPreset.sabotage.sabotagedLine
                          ? "(🎯 เจอจุดที่ถูกวางยาแล้ว!)"
                          : "(ยังไม่ใช่วายร้ายตัวจริง ลองดูบรรทัดอื่น)"}
                      </span>
                    ) : (
                      <span className="text-cyan-300">
                        ลองคลิกบรรทัดที่น่าสงสัยในหน้าต่างโค้ดด้านซ้ายได้เลย!
                      </span>
                    )}
                  </div>
                </div>

                {/* Diagnosis Options */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold text-slate-300">
                    เลือกคำอธิบายสาเหตุของบั๊กที่ถูกต้องที่สุด:
                  </span>
                  {selectedPreset.sabotage.options.map((opt) => {
                    const isPicked = selectedSabotageOpt === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() =>
                          handleSelectSabotageOption(opt.id, opt.isCorrect, opt.feedback)
                        }
                        className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                          isPicked
                            ? opt.isCorrect
                              ? "bg-emerald-950/50 border-emerald-400 text-emerald-100"
                              : "bg-rose-950/50 border-rose-400 text-rose-100"
                            : "bg-slate-950/70 hover:bg-slate-900 border-slate-800 text-slate-200"
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-semibold">{opt.text}</div>
                        {isPicked && (
                          <div className="mt-2 pt-2 border-t border-white/10 text-xs">
                            {opt.feedback}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {sabotageSolved && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/50 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-emerald-300">
                        🎉 ภารกิจสำเร็จ! คุณซ่อมโค้ดที่ถูกวางยาได้สำเร็จ!
                      </div>
                      <div className="text-xs text-slate-300">
                        โค้ดเดิมที่ถูกต้องคือ:{" "}
                        <code className="text-cyan-300 font-mono">
                          {selectedPreset.sabotage.originalCode.trim()}
                        </code>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveStage("mastery")}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-400 text-slate-950 hover:brightness-110 transition cursor-pointer"
                    >
                      รับใบรับรอง Code Mastery Card 🏆 ➔
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ==================== STAGE 4: HOLOGRAPHIC MASTERY CARD & LEADERBOARD ==================== */}
            {activeStage === "mastery" && (
              <div className="bg-slate-900/75 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-6 shadow-2xl">
                {/* Holographic Mastery Card */}
                <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-cyan-950/80 via-slate-900 to-fuchsia-950/80 border border-cyan-400/50 shadow-xl">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                        VERIFIED CODE COMPREHENSION CERTIFICATE
                      </span>
                      <h2 className="text-2xl font-extrabold text-white mt-2">{studentName}</h2>
                      <p className="text-xs text-cyan-200 mt-0.5">
                        ผ่านการพิสูจน์ความเข้าใจโค้ด: <strong>{selectedPreset.title}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase">ระดับความเข้าใจ</div>
                      <div className="text-4xl font-black bg-gradient-to-r from-amber-300 via-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">
                        RANK {masteryRank}
                      </div>
                      <div className="text-xs font-bold text-emerald-300">
                        คะแนนรวม {totalMasteryScore}/100
                      </div>
                    </div>
                  </div>

                  {/* 4 Pillar Bars */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    {[
                      { label: "Logic & Flow", val: radarScores.logic },
                      { label: "Data State", val: radarScores.state },
                      { label: "Edge Cases", val: radarScores.edgeCase },
                      { label: "Syntax Pattern", val: radarScores.syntax },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="bg-slate-950/70 border border-slate-800 rounded-xl p-3"
                      >
                        <div className="text-[11px] text-slate-400">{stat.label}</div>
                        <div className="text-lg font-bold text-cyan-300">{stat.val}%</div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-400"
                            style={{ width: `${stat.val}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-white/10">
                    <button
                      onClick={handleSaveMasterySession}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 hover:brightness-110 transition cursor-pointer"
                    >
                      💾 บันทึกคะแนนลงกระดานสถิติ (LocalStorage DB)
                    </button>
                    <button
                      onClick={handleExportTeacherReport}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 transition cursor-pointer"
                    >
                      📥 ดาวน์โหลดไฟล์ JSON ส่งอาจารย์
                    </button>
                  </div>
                </div>

                {/* Classroom Leaderboard Table */}
                <div>
                  <h3 className="text-sm font-bold text-slate-200 mb-2.5 flex items-center justify-between">
                    <span>📊 กระดานสถิติความเข้าใจโค้ดของห้องเรียน (ไม่ต้องตั้งเซิร์ฟเวอร์ DB)</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      เก็บข้อมูลอัตโนมัติใน Browser LocalStorage
                    </span>
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">ผู้เรียน</th>
                          <th className="py-2.5 px-3">โจทย์โค้ด</th>
                          <th className="py-2.5 px-3">คะแนน</th>
                          <th className="py-2.5 px-3">Rank</th>
                          <th className="py-2.5 px-3">เวลา</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
                        {savedSessions.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-semibold text-slate-200">
                              {s.studentName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 truncate max-w-[180px]">
                              {s.presetTitle}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-cyan-300 font-bold">
                              {s.totalScore}%
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded font-bold bg-amber-400/20 text-amber-300">
                                {s.rank}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{s.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal: Paste Custom Code */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                ✨ วางโค้ดของคุณเองเพื่อให้ระบบผ่าตัด X-Ray สด
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>
            <p className="text-xs text-slate-400">
              วางโค้ดภาษาใดก็ได้ (JS, TS, Python, C, Java) ระบบจะสร้าง X-Ray Flow, คำถามสืบสวนจากเป็ด และด่านวางยาให้อัตโนมัติทันที!
            </p>
            <textarea
              rows={8}
              value={customCodeInput}
              onChange={(e) => setCustomCodeInput(e.target.value)}
              placeholder={`function calculateGrade(score) {\n  if (score >= 80) return "A";\n  if (score >= 50) return "Pass";\n  return "Fail";\n}`}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 font-mono text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 rounded-xl text-xs bg-slate-800 text-slate-300 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAnalyzeCustomCode}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 cursor-pointer"
              >
                🧬 เริ่มผ่าตัดโค้ดชุดนี้ทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Optional Gemini API Key */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                ⚙️ ตั้งค่า Gemini API Key (ทางเลือกเสริม)
              </h3>
              <button
                onClick={() => setShowApiModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              เว็บนี้ทำงานได้ <strong>100% ทันทีโดยไม่ต้องมี API Key</strong> ด้วยระบบ AST Heuristic Engine ในตัวเครื่อง (ปลอดภัยแม้เน็ตในห้องแข่งหลุด!) แต่ถ้าต้องการให้ Gemini 2.5 Flash ช่วยตรวจคำตอบแบบสดๆ สามารถใส่ API Key ด้านล่างได้เลยครับ
            </p>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
            />
            <div className="flex justify-end">
              <button
                onClick={() => setShowApiModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 cursor-pointer"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
