import {
  BlockCellId,
  BlockQuestion,
  ModifyChallenge,
  TopicQuest,
  TraceStep,
} from "../curriculum";
import { ExplainCodeResult } from "../explain-code";
import { LearningLanguage, runCodeByLanguage } from "../language-tracks";
import { CustomDungeonPayload, normalizeLearningLanguage } from "../custom-dungeon";
import { DungeonQuestion, DungeonTraceStep } from "./questions";
import { hashString } from "./seed";

export interface ToDungeonInput {
  code: string;
  language: string;
  uiLang?: "th" | "en";
  explanation?: Partial<ExplainCodeResult> | null;
}

const VALID_CELLS: ReadonlySet<BlockCellId> = new Set<BlockCellId>([
  "T1", "E1", "F1",
  "T2", "E2", "F2",
  "T3", "E3", "F3",
  "T4", "E4", "F4",
]);

function normalizeCellId(raw?: string | null, fallback: BlockCellId = "E4"): BlockCellId {
  const upper = (raw || "").toUpperCase().trim() as BlockCellId;
  return VALID_CELLS.has(upper) ? upper : fallback;
}

function uniqueChoices(primary: string, distractors: string[]): { choices: string[]; correctIndex: number } {
  const cleanPrimary = primary.trim() || "ดำเนินการตามลำดับคำสั่งของโปรแกรม";
  const pool: string[] = [cleanPrimary];
  for (const d of distractors) {
    const trimmed = d.trim();
    if (trimmed && !pool.includes(trimmed)) {
      pool.push(trimmed);
    }
    if (pool.length >= 4) break;
  }
  const fallbacks = [
    "เกิด Syntax Error ทันทีก่อนเริ่มทำงาน",
    "ข้ามการทำงานทั้งหมดและคืนค่า undefined",
    "วนลูปไม่รู้จบ (Infinite Loop)",
    "ลบข้อมูลในตัวแปรทั้งหมดทิ้ง",
  ];
  for (const fb of fallbacks) {
    if (pool.length >= 4) break;
    if (!pool.includes(fb)) pool.push(fb);
  }

  // Deterministic rotation so correctIndex isn't always 0
  const shift = cleanPrimary.length % pool.length;
  const rotated = [...pool.slice(shift), ...pool.slice(0, shift)];
  const correctIndex = rotated.indexOf(cleanPrimary);
  return {
    choices: rotated,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
  };
}

function buildTraceStepsFromCode(
  code: string,
  explanation?: Partial<ExplainCodeResult> | null,
  isEn = false
): TraceStep[] {
  if (explanation?.lineByLine && explanation.lineByLine.length > 0) {
    return explanation.lineByLine.slice(0, 8).map((item, idx) => ({
      stepNumber: idx + 1,
      line: item.lineNumber,
      codeLine: item.code,
      variables: {},
      outputSoFar: [],
      explanation: item.explanation,
    }));
  }

  const lines = code.split(/\r?\n/);
  const steps: TraceStep[] = [];
  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();
    if (!trimmed) return;
    if (steps.length >= 8) return;
    steps.push({
      stepNumber: steps.length + 1,
      line: idx + 1,
      codeLine: trimmed,
      variables: {},
      outputSoFar: [],
      explanation: isEn
        ? `Execute line ${idx + 1}: ${trimmed}`
        : `ประมวลผลคำสั่งบรรทัดที่ ${idx + 1}: ${trimmed}`,
    });
  });

  if (steps.length === 0) {
    steps.push({
      stepNumber: 1,
      line: 1,
      codeLine: code.trim().slice(0, 80) || "// code",
      variables: {},
      outputSoFar: [],
      explanation: isEn ? "Execute code block" : "ประมวลผลชุดคำสั่ง",
    });
  }
  return steps;
}

function buildDeterministicDungeon(
  code: string,
  lang: LearningLanguage,
  uiLang: "th" | "en",
  explanation?: Partial<ExplainCodeResult> | null
): {
  title: string;
  subtitle: string;
  questions: DungeonQuestion[];
  steps: TraceStep[];
  modifyChallenge: ModifyChallenge;
  provider: "mock-generator";
} {
  const isEn = uiLang === "en";
  const steps = buildTraceStepsFromCode(code, explanation, isEn);
  const dungeonTraceSteps: DungeonTraceStep[] = steps.map((s) => ({
    line: s.line,
    codeLine: s.codeLine,
    variables: s.variables,
    explanation: s.explanation,
  }));

  const execResult = runCodeByLanguage(code, lang);
  const actualOutput = execResult.success ? execResult.finalOutput.trim() : "";

  const summary =
    explanation?.summary?.trim() ||
    (isEn
      ? `Analyze and trace this ${lang.toUpperCase()} snippet step by step.`
      : `วิเคราะห์และไล่ลำดับการทำงานของโค้ดภาษา ${lang.toUpperCase()} ชุดนี้`);

  const concepts =
    explanation?.keyConcepts && explanation.keyConcepts.length > 0
      ? explanation.keyConcepts
      : [lang.toUpperCase(), "Logic", "Control Flow"];

  const nonEmptyLines = code
    .split(/\r?\n/)
    .map((l, idx) => ({ lineNumber: idx + 1, code: l.trim() }))
    .filter((l) => l.code.length > 0 && !l.code.startsWith("//") && !l.code.startsWith("#"));

  const targetLine =
    explanation?.lineByLine?.find((l) => l.code.trim().length > 3) ||
    (nonEmptyLines[0]
      ? {
          lineNumber: nonEmptyLines[0].lineNumber,
          code: nonEmptyLines[0].code,
          explanation: isEn
            ? `Executes statement: ${nonEmptyLines[0].code}`
            : `ทำงานตามคำสั่ง: ${nonEmptyLines[0].code}`,
        }
      : {
          lineNumber: 1,
          code: code.trim().slice(0, 60),
          explanation: summary,
        });

  const questions: DungeonQuestion[] = [];

  // Phase 1: Execution / Predict Output (E4)
  if (actualOutput) {
    const numericVal = Number(actualOutput);
    const distractors = Number.isFinite(numericVal)
      ? [
          String(numericVal + 1),
          String(Math.max(0, numericVal - 1)),
          String(numericVal * 2 || 10),
        ]
      : [
          isEn ? "No output (empty)" : "ไม่มีผลลัพธ์แสดงออกทางหน้าจอ",
          "undefined",
          "Error: Invalid syntax",
        ];
    const p1 = uniqueChoices(actualOutput, distractors);
    questions.push({
      id: "custom-phase-1",
      language: lang,
      question: isEn
        ? "Phase 1 [Predict]: What output will this code produce when executed?"
        : "เฟส 1 [ทายผลลัพธ์]: เมื่อรันโค้ดชุดนี้แล้ว จะได้ผลลัพธ์ใดออกมา?",
      questionEn: "Phase 1 [Predict]: What output will this code produce when executed?",
      codeSnippet: code,
      choices: p1.choices,
      correctIndex: p1.correctIndex,
      explanation: isEn
        ? `Running the code outputs: ${actualOutput}`
        : `เมื่อรันโค้ดจริงจะได้ผลลัพธ์คือ: ${actualOutput}`,
      difficulty: "easy",
      blockModelCell: "E4",
      hint: steps[0]?.explanation,
      traceSteps: dungeonTraceSteps,
      expectedOutput: actualOutput,
      phaseLabel: isEn ? "Phase 1 · Predict Output" : "เฟส 1 · ทำนายผลลัพธ์",
    });
  } else {
    const flowAnswer =
      explanation?.stepByStepFlow?.[0]?.trim() ||
      summary;
    const p1 = uniqueChoices(flowAnswer, [
      isEn
        ? "It immediately terminates without executing any statements."
        : "โปรแกรมหยุดทำงานทันทีโดยไม่ประมวลผลคำสั่งใดๆ",
      isEn
        ? "It deletes all variables from memory before starting."
        : "ลบตัวแปรทั้งหมดออกจากหน่วยความจำก่อนเริ่มทำงาน",
      isEn
        ? "It runs in reverse order from the last line to the first line."
        : "ทำงานย้อนกลับจากบรรทัดสุดท้ายขึ้นไปบรรทัดแรก",
    ]);
    questions.push({
      id: "custom-phase-1",
      language: lang,
      question: isEn
        ? "Phase 1 [Execution]: How does this code begin or execute?"
        : "เฟส 1 [การทำงานจริง]: ขั้นตอนการทำงานหลักของโค้ดชุดนี้คืออะไร?",
      questionEn: "Phase 1 [Execution]: How does this code begin or execute?",
      codeSnippet: code,
      choices: p1.choices,
      correctIndex: p1.correctIndex,
      explanation: flowAnswer,
      difficulty: "easy",
      blockModelCell: "E2",
      hint: steps[0]?.explanation,
      traceSteps: dungeonTraceSteps,
      phaseLabel: isEn ? "Phase 1 · Execution Flow" : "เฟส 1 · ลำดับการทำงาน",
    });
  }

  // Phase 2: Line-level Text Surface / Structure (T1 / T2)
  const otherLineExplanations = (explanation?.lineByLine || [])
    .filter((l) => l.lineNumber !== targetLine.lineNumber)
    .map((l) => l.explanation);
  const p2 = uniqueChoices(targetLine.explanation, [
    ...otherLineExplanations,
    isEn
      ? "Declares a syntax error handler that stops the program"
      : "ประกาศตัวจัดการข้อผิดพลาดเพื่อหยุดโปรแกรมทันที",
    isEn
      ? "Imports an external graphics library for 3D rendering"
      : "นำเข้าไลบรารีกราฟิก 3 มิติจากภายนอก",
    isEn
      ? "Resets all system memory and restarts the runtime"
      : "ล้างหน่วยความจำทั้งหมดและรีสตาร์ทระบบ",
  ]);
  questions.push({
    id: "custom-phase-2",
    language: lang,
    question: isEn
      ? `Phase 2 [Code Structure]: What does line ${targetLine.lineNumber} (\`${targetLine.code}\`) do?`
      : `เฟส 2 [โครงสร้างโค้ด]: บรรทัดที่ ${targetLine.lineNumber} (\`${targetLine.code}\`) ทำหน้าที่อะไร?`,
    questionEn: `Phase 2 [Code Structure]: What does line ${targetLine.lineNumber} (\`${targetLine.code}\`) do?`,
    codeSnippet: code,
    choices: p2.choices,
    correctIndex: p2.correctIndex,
    explanation: targetLine.explanation,
    difficulty: "medium",
    blockModelCell: "T1",
    hint: isEn
      ? `Focus on line ${targetLine.lineNumber} in the code scroll.`
      : `ลองสังเกตคำสั่งในบรรทัดที่ ${targetLine.lineNumber} บนคัมภีร์โค้ด`,
    traceSteps: dungeonTraceSteps,
    phaseLabel: isEn ? "Phase 2 · Structure (T1)" : "เฟส 2 · โครงสร้างคำสั่ง (T1)",
  });

  // Phase 3: Purpose / Function (F2)
  const p3 = uniqueChoices(summary, [
    isEn
      ? "A database migration script that drops all user tables."
      : "สคริปต์สำหรับลบตารางทั้งหมดในฐานข้อมูล",
    isEn
      ? "A network firewall configuration for blocking HTTP traffic."
      : "สคริปต์ตั้งค่าไฟร์วอลล์เพื่อบล็อกการเชื่อมต่ออินเทอร์เน็ต",
    isEn
      ? "An infinite background loop that only sleeps without computing."
      : "ลูปทำงานเบื้องหลังแบบไม่รู้จบโดยไม่มีการคำนวณใดๆ",
  ]);
  questions.push({
    id: "custom-phase-3",
    language: lang,
    question: isEn
      ? `Phase 3 [Purpose]: Which statement best summarizes the overall goal of this code (${concepts.slice(0, 2).join(", ")})?`
      : `เฟส 3 [หน้าที่โค้ด]: ข้อใดสรุปเป้าหมายหลักของโค้ดชุดนี้ (${concepts.slice(0, 2).join(", ")}) ได้ถูกต้องที่สุด?`,
    questionEn: `Phase 3 [Purpose]: Which statement best summarizes the overall goal of this code?`,
    codeSnippet: code,
    choices: p3.choices,
    correctIndex: p3.correctIndex,
    explanation: summary,
    difficulty: "medium",
    blockModelCell: "F2",
    hint: concepts.join(" · "),
    traceSteps: dungeonTraceSteps,
    phaseLabel: isEn ? "Phase 3 · Purpose (F2)" : "เฟส 3 · เป้าหมายของโค้ด (F2)",
  });

  const title = isEn
    ? `Custom ${lang.toUpperCase()} Dungeon`
    : `ดันเจี้ยนโค้ดส่วนตัว (${lang.toUpperCase()})`;

  return {
    title,
    subtitle: summary.slice(0, 140),
    questions,
    steps,
    modifyChallenge: {
      instruction: isEn
        ? "Try modifying a value or condition in this code and run a quick test!"
        : "ลองแก้ไขค่าตัวแปรหรือเงื่อนไขในโค้ดนี้ แล้วกดรันทดสอบผลลัพธ์",
      suggestedCode: code,
      changeDescription: isEn
        ? "Modify an input value or condition and observe the output."
        : "แก้ไขค่าตั้งต้นหรือเงื่อนไข 1 จุด แล้วสังเกตผลลัพธ์ที่เปลี่ยนไป",
      options: [],
      explanation: isEn
        ? "Modifying inputs helps verify how control flow and variables react."
        : "การลองแก้ค่าตั้งต้นช่วยให้เข้าใจความสัมพันธ์ของตัวแปรและผลลัพธ์มากขึ้น",
    },
    provider: "mock-generator",
  };
}

async function generateWithGemini(
  code: string,
  lang: LearningLanguage,
  uiLang: "th" | "en",
  explanation: Partial<ExplainCodeResult> | null | undefined,
  apiKey: string
): Promise<{
  title: string;
  subtitle: string;
  questions: DungeonQuestion[];
  steps: TraceStep[];
  modifyChallenge: ModifyChallenge;
} | null> {
  const isEn = uiLang === "en";
  const numberedLines = code
    .split(/\r?\n/)
    .map((line, idx) => `${idx + 1}: ${line}`)
    .join("\n");

  const execResult = runCodeByLanguage(code, lang);
  const verifiedOutput =
    execResult.success && execResult.finalOutput.trim()
      ? execResult.finalOutput.trim()
      : null;

  const prompt = isEn
    ? `You are designing a 3-phase RPG coding dungeon battle based on the user's ${lang} code.
Return ONLY valid JSON (no markdown fences) with this exact structure:
{
  "title": "Short dungeon title (max 50 chars)",
  "subtitle": "1 concise sentence describing what this dungeon tests",
  "questions": [
    {
      "question": "Clear question text",
      "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "correctIndex": 0,
      "explanation": "Why the correct choice is right",
      "hint": "Helpful hint without giving away the answer",
      "blockModelCell": "E4",
      "difficulty": "easy",
      "phaseLabel": "Phase 1 · Predict"
    }
  ],
  "steps": [
    { "line": 1, "codeLine": "exact line", "variables": { "x": "10" }, "explanation": "what happens" }
  ]
}
Rules:
- Create exactly 3 questions covering: (1) Predict Output / Execution (E2 or E4), (2) Code Structure / Syntax (T1 or T2), and (3) Function / Purpose (F2 or F3).
- Each question MUST have exactly 4 distinct choices and correctIndex in 0..3.
${verifiedOutput ? `- Verified runtime output of this code is: ${JSON.stringify(verifiedOutput)}. For the Predict Output question, the correct choice MUST match this exact output.` : ""}
${explanation?.summary ? `- Code summary context: ${explanation.summary}` : ""}

Code:
${numberedLines}`
    : `คุณคือผู้ออกแบบด่านเกม RPG ฝึกเขียนโปรแกรม 3 เฟส จากโค้ดภาษา ${lang} ของผู้เรียน
ตอบกลับเป็น JSON ที่ถูกต้องเท่านั้น (ห้ามใส่ markdown fence) ตามโครงสร้างนี้:
{
  "title": "ชื่อดันเจี้ยนสั้นๆ (ไม่เกิน 50 ตัวอักษร)",
  "subtitle": "คำอธิบายสั้นๆ 1 ประโยคว่าด่านนี้ฝึกเรื่องอะไร",
  "questions": [
    {
      "question": "คำถามภาษาไทยที่ชัดเจน",
      "choices": ["ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4"],
      "correctIndex": 0,
      "explanation": "คำอธิบายเฉลยภาษาไทย",
      "hint": "คำใบ้สั้นๆ ที่ไม่เฉลยตรงๆ",
      "blockModelCell": "E4",
      "difficulty": "easy",
      "phaseLabel": "เฟส 1 · ทำนายผลลัพธ์"
    }
  ],
  "steps": [
    { "line": 1, "codeLine": "โค้ดบรรทัดนั้น", "variables": { "x": "10" }, "explanation": "อธิบายการทำงาน" }
  ]
}
กติกา:
- สร้างคำถาม 3 ข้อ ครอบคลุม: (1) ทำนายผลลัพธ์/การทำงาน (E2 หรือ E4), (2) โครงสร้าง/ไวยากรณ์โค้ด (T1 หรือ T2), (3) หน้าที่และเป้าหมายของโค้ด (F2 หรือ F3)
- ทุกข้อต้องมี 4 ตัวเลือกที่ไม่ซ้ำกัน และ correctIndex อยู่ระหว่าง 0 ถึง 3
${verifiedOutput ? `- ผลลัพธ์จริงจากการรันโค้ดคือ: ${JSON.stringify(verifiedOutput)} ดังนั้นข้อทำนายผลลัพธ์ต้องใช้ค่านี้เป็นตัวเลือกที่ถูกต้อง` : ""}
${explanation?.summary ? `- บริบทสรุปโค้ด: ${explanation.summary}` : ""}

โค้ด:
${numberedLines}`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.25,
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== "string") {
      return null;
    }

    const cleanedText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedText);
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length < 2) {
      return null;
    }

    const steps: TraceStep[] =
      Array.isArray(parsed.steps) && parsed.steps.length > 0
        ? parsed.steps.slice(0, 8).map((s: Record<string, unknown>, idx: number) => ({
            stepNumber: idx + 1,
            line: typeof s.line === "number" && s.line >= 1 ? s.line : idx + 1,
            codeLine: typeof s.codeLine === "string" ? s.codeLine : "",
            variables:
              s.variables && typeof s.variables === "object"
                ? Object.fromEntries(
                    Object.entries(s.variables as Record<string, unknown>).map(([k, v]) => [
                      k,
                      String(v),
                    ])
                  )
                : {},
            outputSoFar: [],
            explanation: typeof s.explanation === "string" ? s.explanation : "",
          }))
        : buildTraceStepsFromCode(code, explanation, isEn);

    const dungeonTraceSteps: DungeonTraceStep[] = steps.map((s) => ({
      line: s.line,
      codeLine: s.codeLine,
      variables: s.variables,
      explanation: s.explanation,
    }));

    const questions: DungeonQuestion[] = parsed.questions
      .filter((q: unknown): q is Record<string, unknown> => Boolean(q && typeof q === "object"))
      .slice(0, 4)
      .map((q: Record<string, unknown>, idx: number) => {
        const rawChoices = Array.isArray(q.choices)
          ? q.choices.map((c) => String(c)).filter((c) => c.trim().length > 0)
          : [];
        const choices = rawChoices.length >= 2 ? rawChoices.slice(0, 4) : ["Option A", "Option B", "Option C", "Option D"];
        const rawIdx = typeof q.correctIndex === "number" && Number.isInteger(q.correctIndex) ? q.correctIndex : 0;
        const correctIndex = rawIdx >= 0 && rawIdx < choices.length ? rawIdx : 0;
        const difficulty =
          q.difficulty === "easy" || q.difficulty === "medium" || q.difficulty === "hard"
            ? q.difficulty
            : idx === 0
            ? "easy"
            : "medium";

        return {
          id: `custom-ai-phase-${idx + 1}`,
          language: lang,
          question: typeof q.question === "string" && q.question.trim() ? q.question.trim() : `Phase ${idx + 1}`,
          questionEn: typeof q.question === "string" ? q.question.trim() : undefined,
          codeSnippet: code,
          choices,
          correctIndex,
          explanation:
            typeof q.explanation === "string" && q.explanation.trim()
              ? q.explanation.trim()
              : explanation?.summary || "",
          difficulty,
          blockModelCell: normalizeCellId(
            typeof q.blockModelCell === "string" ? q.blockModelCell : undefined,
            idx === 0 ? "E4" : idx === 1 ? "T1" : "F2"
          ),
          hint: typeof q.hint === "string" ? q.hint : undefined,
          traceSteps: dungeonTraceSteps,
          expectedOutput: idx === 0 && verifiedOutput ? verifiedOutput : undefined,
          phaseLabel: typeof q.phaseLabel === "string" ? q.phaseLabel : undefined,
        };
      });

    if (questions.length < 2) {
      return null;
    }

    return {
      title:
        typeof parsed.title === "string" && parsed.title.trim()
          ? parsed.title.trim()
          : isEn
          ? `Custom ${lang.toUpperCase()} Dungeon`
          : `ดันเจี้ยนโค้ด (${lang.toUpperCase()})`,
      subtitle:
        typeof parsed.subtitle === "string" && parsed.subtitle.trim()
          ? parsed.subtitle.trim()
          : explanation?.summary || "",
      questions,
      steps,
      modifyChallenge: {
        instruction: isEn
          ? "Try modifying a value or condition in this code and run a quick test!"
          : "ลองแก้ไขค่าตัวแปรหรือเงื่อนไขในโค้ดนี้ แล้วกดรันทดสอบผลลัพธ์",
        suggestedCode: code,
        changeDescription: isEn
          ? "Modify an input value or condition and observe the output."
          : "แก้ไขค่าตั้งต้นหรือเงื่อนไข 1 จุด แล้วสังเกตผลลัพธ์ที่เปลี่ยนไป",
        options: [],
        explanation: isEn
          ? "Modifying inputs helps verify how control flow and variables react."
          : "การลองแก้ค่าตั้งต้นช่วยให้เข้าใจความสัมพันธ์ของตัวแปรและผลลัพธ์มากขึ้น",
      },
    };
  } catch (err) {
    console.warn("Gemini to-dungeon fallback:", err);
    return null;
  }
}

export async function generateCustomDungeonFromCode(
  input: ToDungeonInput
): Promise<CustomDungeonPayload> {
  const lang = normalizeLearningLanguage(input.language);
  const uiLang: "th" | "en" = input.uiLang === "en" ? "en" : "th";
  const code = input.code.trim();
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  const aiResult = apiKey
    ? await generateWithGemini(code, lang, uiLang, input.explanation, apiKey)
    : null;

  const built =
    aiResult !== null
      ? { ...aiResult, provider: "ai-api" as const }
      : buildDeterministicDungeon(code, lang, uiLang, input.explanation);

  const numericId = 9000 + (hashString(code + lang) % 900);
  const summary =
    input.explanation?.summary?.trim() || built.subtitle;
  const keyConcepts =
    input.explanation?.keyConcepts && input.explanation.keyConcepts.length > 0
      ? input.explanation.keyConcepts
      : [lang.toUpperCase(), "Custom Code"];

  const firstQ = built.questions[0];
  const blockQuestions: BlockQuestion[] = built.questions.map((q, idx) => ({
    id: q.id,
    cellId: normalizeCellId(q.blockModelCell, idx === 0 ? "E4" : idx === 1 ? "T1" : "F2"),
    targetLine: built.steps[idx]?.line || 1,
    question: q.question,
    options: q.choices.map((text, cIdx) => ({
      id: `opt-${cIdx}`,
      text,
    })),
    correctOptionId: `opt-${q.correctIndex}`,
    hint: q.hint || "",
    explanation: q.explanation,
  }));

  const topic: TopicQuest = {
    id: numericId,
    title: built.title,
    shortName: built.title.slice(0, 28),
    isBoss: false,
    subtitle: built.subtitle,
    aiScenario: summary,
    code,
    predictPrompt: firstQ?.question || built.subtitle,
    predictOptions: firstQ?.choices || [],
    predictExplanation: firstQ?.explanation || summary,
    steps: built.steps,
    questions: blockQuestions,
    modifyChallenge: built.modifyChallenge,
    badgeReward: {
      id: `custom-${numericId}`,
      name: uiLang === "en" ? "Custom Code Conqueror" : "ผู้พิชิตดันเจี้ยนโค้ดส่วนตัว",
      description:
        uiLang === "en"
          ? "Cleared a custom dungeon generated from your own code."
          : "พิชิตดันเจี้ยนที่สร้างขึ้นจากโค้ดของคุณเองได้สำเร็จ",
    },
  };

  return {
    id: `custom-${Date.now().toString(36)}-${(hashString(code) % 10000).toString(36)}`,
    title: built.title,
    subtitle: built.subtitle,
    language: lang,
    code,
    summary,
    keyConcepts,
    topic,
    questions: built.questions,
    provider: built.provider,
    createdAt: new Date().toISOString(),
  };
}
