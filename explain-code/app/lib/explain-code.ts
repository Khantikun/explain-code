import { LineExplanationItem } from "./supabase";

export interface ExplainCodeInput {
  code: string;
  language: string;
  uiLang?: "th" | "en";
}

export interface ExplainCodeResult {
  language: string;
  summary: string;
  lineByLine: LineExplanationItem[];
  keyConcepts: string[];
  stepByStepFlow: string[];
  potentialPitfalls: string[];
  provider: "mock-analyzer" | "ai-api";
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C / C++",
  html: "HTML / CSS",
  sql: "SQL",
};

/**
 * วิเคราะห์บรรทัดโค้ดแต่ละบรรทัดแบบอัจฉริยะ (Smart Deterministic Mock Analyzer)
 * พร้อมจุดเชื่อมต่อ AI API ฝั่ง Server เท่านั้น (เช่น GEMINI_API_KEY / OPENAI_API_KEY)
 */
function explainSingleLine(line: string, lineNumber: number, lang: string): string {
  const trimmed = line.trim();
  if (!trimmed) return "บรรทัดว่างสำหรับจัดระเบียบโค้ดให้อ่านง่าย";

  // Comments
  if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("--") || trimmed.startsWith("/*")) {
    return "คอมเมนต์อธิบายโค้ด (ไม่มีผลต่อการประมวลผลของโปรแกรม)";
  }

  // Imports / Includes
  if (/^(import\s|from\s.+import|#include|using\s|require\()/.test(trimmed)) {
    return "นำเข้าไลบรารีหรือโมดูลภายนอกเข้ามาใช้งานในไฟล์นี้";
  }

  // Function definitions
  if (/^(async\s+)?function\s+\w+|^(def|func|void|int|string|public|private)\s+\w+\s*\(|const\s+\w+\s*=\s*(async\s*)?\(/.test(trimmed)) {
    const isAsync = trimmed.includes("async");
    return isAsync
      ? "ประกาศฟังก์ชันแบบ Asynchronous (รองรับการรอผลด้วย await โดยไม่บล็อกการทำงาน)"
      : "ประกาศฟังก์ชันพร้อมพารามิเตอร์เพื่อรวบรวมชุดคำสั่งไว้เรียกใช้งานซ้ำ";
  }

  // Return statements
  if (/^return(\s|$|;)/.test(trimmed)) {
    return "ส่งค่าผลลัพธ์กลับออกจากฟังก์ชันและจบการทำงานของฟังก์ชันทันที";
  }

  // Loops
  if (/^(for|while)\b/.test(trimmed) || /\.forEach\(|\.map\(|\.filter\(|\.reduce\(/.test(trimmed)) {
    if (trimmed.includes(".map(")) {
      return "วนลูปแปลงค่าสมาชิกทุกตัวใน Array แล้วสร้างเป็น Array ใหม่";
    }
    if (trimmed.includes(".filter(")) {
      return "วนลูปคัดกรองเฉพาะสมาชิกใน Array ที่ตรงตามเงื่อนไข";
    }
    if (trimmed.startsWith("while")) {
      return "คำสั่งวนซ้ำ (while loop) ที่จะทำงานต่อเนื่องตราบใดที่เงื่อนไขยังเป็นจริง (ระวัง Infinite Loop หากไม่เปลี่ยนค่าตัวแปร)";
    }
    return "คำสั่งวนซ้ำ (Loop) เพื่อประมวลผลข้อมูลทีละรอบตามเงื่อนไขหรือจำนวนสมาชิก";
  }

  // Conditionals
  if (/^(if|else\s+if|elif)\b/.test(trimmed)) {
    return "ตรวจสอบเงื่อนไข (Condition) ว่ามีค่าเป็นจริง (true) หรือไม่ ก่อนตัดสินใจเลือกทางเดินของโปรแกรม";
  }
  if (/^else\b|^}\s*else/.test(trimmed)) {
    return "กรณีทางเลือกสำรอง (else) จะทำงานเมื่อเงื่อนไข if ก่อนหน้าเป็นเท็จทั้งหมด";
  }

  // Try / Catch
  if (/^(try|catch|except|finally)\b/.test(trimmed)) {
    return "ส่วนจัดการข้อผิดพลาด (Error Handling) เพื่อดักจับ Exception ไม่ให้โปรแกรมล่ม";
  }

  // Output / Logging
  if (/console\.(log|error|warn)|print\s*\(|System\.out\.print|cout\s*<</.test(trimmed)) {
    return "แสดงผลลัพธ์หรือค่าของตัวแปรออกทางหน้าจอ / Console เพื่อตรวจสอบการทำงาน";
  }

  // SQL queries
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WHERE|JOIN|GROUP BY|ORDER BY)\b/i.test(trimmed)) {
    return "คำสั่ง SQL สำหรับดึงหรือจัดการข้อมูลในตารางฐานข้อมูล";
  }

  // Async / Await
  if (/\bawait\b/.test(trimmed)) {
    return "หยุดรอให้การทำงานแบบ Asynchronous (Promise / API / Database) เสร็จสิ้นก่อนนำค่าไปใช้ต่อ";
  }

  // Variable declarations & assignments
  if (/^(const|let|var)\s+\w+/.test(trimmed)) {
    const keyword = trimmed.split(/\s+/)[0];
    if (keyword === "const") {
      return "ประกาศตัวแปรแบบค่าคงที่ (const) ที่ไม่สามารถกำหนดค่าทับใหม่ได้";
    }
    return "ประกาศตัวแปรและกำหนดค่าเริ่มต้นเพื่อเก็บข้อมูลไว้ในหน่วยความจำ";
  }

  if (/\+=|-=|\*=|\/=|\+\+|--/.test(trimmed)) {
    return "อัปเดตค่าในตัวแปรเดิม (เช่น บวกสะสมค่า หรือเพิ่มลดค่าทีละลำดับ)";
  }

  if (/^[a-zA-Z_$][\w$]*\s*=[^=]/.test(trimmed)) {
    return "กำหนดหรืออัปเดตค่าใหม่ให้กับตัวแปร";
  }

  if (/^[{}()[\];]+$/.test(trimmed)) {
    return "วงเล็บปิดขอบเขตของบล็อกคำสั่ง (Scope / Block Closure)";
  }

  return `คำสั่งประมวลผลในภาษา ${LANGUAGE_LABELS[lang] || lang} (บรรทัดที่ ${lineNumber})`;
}

/**
 * เรียกใช้ Gemini API ฝั่ง Server เท่านั้น (ผ่าน process.env.GEMINI_API_KEY)
 */
async function explainWithGemini(
  rawCode: string,
  language: string,
  langLabel: string,
  uiLang: "th" | "en",
  apiKey: string
): Promise<ExplainCodeResult | null> {
  const isEn = uiLang === "en";
  const numberedLines = rawCode
    .split(/\r?\n/)
    .map((line, idx) => `${idx + 1}: ${line}`)
    .join("\n");

  const prompt = isEn
    ? `You are a friendly programming tutor. Explain the following ${langLabel} code clearly for a high-school/vocational student.
Return ONLY valid JSON (no markdown fences) with this exact structure:
{
  "summary": "2-3 concise sentences summarizing what the code does overall.",
  "keyConcepts": ["Concept 1", "Concept 2", "Concept 3"],
  "stepByStepFlow": ["1. ...", "2. ...", "3. ..."],
  "lineByLine": [
    { "lineNumber": 1, "code": "exact line text", "explanation": "clear explanation of what this line does" }
  ],
  "potentialPitfalls": ["Important edge case or best-practice tip 1", "Tip 2"]
}
Rules:
- Include only non-empty lines in "lineByLine" using their 1-based lineNumber.
- Keep all explanations accurate, concise, and beginner-friendly in English.

Code:
${numberedLines}`
    : `คุณคือครูผู้ช่วยสอนเขียนโปรแกรมที่อธิบายเข้าใจง่าย จงวิเคราะห์และอธิบายโค้ดภาษา ${langLabel} ต่อไปนี้สำหรับนักเรียนมัธยม/อาชีวะ
ตอบกลับเป็น JSON ที่ถูกต้องเท่านั้น (ห้ามใส่ markdown fence) ตามโครงสร้างนี้:
{
  "summary": "สรุปภาพรวมการทำงานของโค้ดสั้นๆ กระชับ 2-3 ประโยคเป็นภาษาไทย",
  "keyConcepts": ["แนวคิดหลัก 1", "แนวคิดหลัก 2", "แนวคิดหลัก 3"],
  "stepByStepFlow": ["1. ...", "2. ...", "3. ..."],
  "lineByLine": [
    { "lineNumber": 1, "code": "ข้อความโค้ดบรรทัดนั้น", "explanation": "คำอธิบายการทำงานของบรรทัดนี้เป็นภาษาไทยที่เข้าใจง่าย" }
  ],
  "potentialPitfalls": ["จุดที่ควรระวังหรือคำแนะนำ 1", "คำแนะนำ 2"]
}
กติกา:
- ใน "lineByLine" ให้ใส่เฉพาะบรรทัดที่ไม่ว่าง โดยใช้เลขบรรทัด (lineNumber) เริ่มจาก 1 ให้ตรงกับโค้ดจริง
- อธิบายให้ตรงตามการทำงานจริงของโค้ด กระชับ และเข้าใจง่ายเป็นภาษาไทย

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
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      console.warn("Gemini API explain non-OK status:", response.status);
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
    if (
      !parsed ||
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.lineByLine)
    ) {
      return null;
    }

    const sourceLines = rawCode.split(/\r?\n/);
    const lineByLine: LineExplanationItem[] = parsed.lineByLine
      .filter(
        (item: unknown): item is { lineNumber?: unknown; code?: unknown; explanation?: unknown } =>
          Boolean(item && typeof item === "object")
      )
      .map((item: { lineNumber?: unknown; code?: unknown; explanation?: unknown }, idx: number) => {
        const lineNum =
          typeof item.lineNumber === "number" && item.lineNumber >= 1
            ? item.lineNumber
            : idx + 1;
        const actualCode =
          typeof item.code === "string" && item.code.length > 0
            ? item.code
            : sourceLines[lineNum - 1] ?? "";
        return {
          lineNumber: lineNum,
          code: actualCode,
          explanation:
            typeof item.explanation === "string" && item.explanation.trim().length > 0
              ? item.explanation.trim()
              : explainSingleLine(actualCode, lineNum, language),
        };
      });

    if (lineByLine.length === 0) {
      return null;
    }

    const keyConcepts = Array.isArray(parsed.keyConcepts)
      ? parsed.keyConcepts.filter((c: unknown): c is string => typeof c === "string" && c.trim().length > 0)
      : [];
    const stepByStepFlow = Array.isArray(parsed.stepByStepFlow)
      ? parsed.stepByStepFlow.filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
      : [];
    const potentialPitfalls = Array.isArray(parsed.potentialPitfalls)
      ? parsed.potentialPitfalls.filter((p: unknown): p is string => typeof p === "string" && p.trim().length > 0)
      : [];

    return {
      language,
      summary: parsed.summary.trim(),
      lineByLine,
      keyConcepts:
        keyConcepts.length > 0
          ? keyConcepts
          : [isEn ? `${langLabel} Fundamentals` : `พื้นฐานภาษา ${langLabel}`],
      stepByStepFlow:
        stepByStepFlow.length > 0
          ? stepByStepFlow
          : [isEn ? "1. Executes statements sequentially." : "1. ประมวลผลคำสั่งตามลำดับ"],
      potentialPitfalls:
        potentialPitfalls.length > 0
          ? potentialPitfalls
          : [
              isEn
                ? "Test with edge-case inputs such as empty or boundary values."
                : "ควรทดสอบด้วยข้อมูลขอบเขต (Edge Cases) เช่น ค่าว่าง หรือค่าขอบเขต",
            ],
      provider: "ai-api",
    };
  } catch (err) {
    console.warn("Gemini API explain fallback triggered:", err);
    return null;
  }
}

/**
 * ฟังก์ชัน Service เดียวสำหรับอธิบายโค้ด
 * ใช้ Gemini API ผ่าน Server Env (GEMINI_API_KEY) พร้อม Fallback กลับไปยัง Smart Mock Analyzer
 */
export async function explainCodeSnippet(
  input: ExplainCodeInput
): Promise<ExplainCodeResult> {
  const rawCode = (input.code || "").trim();
  const language = (input.language || "javascript").toLowerCase();
  const uiLang: "th" | "en" = input.uiLang === "en" ? "en" : "th";
  const langLabel = LANGUAGE_LABELS[language] || language;

  if (!rawCode) {
    throw new Error("กรุณาวางโค้ดที่ต้องการให้อธิบาย");
  }

  const serverAiKey = process.env.GEMINI_API_KEY || process.env.EXPLAIN_AI_API_KEY;
  if (serverAiKey) {
    const aiResult = await explainWithGemini(
      rawCode,
      language,
      langLabel,
      uiLang,
      serverAiKey
    );
    if (aiResult) {
      return aiResult;
    }
  }

  const lines = rawCode.split(/\r?\n/);
  const lineByLine: LineExplanationItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const codeLine = lines[i];
    if (codeLine.trim().length === 0) continue;
    lineByLine.push({
      lineNumber: i + 1,
      code: codeLine,
      explanation: explainSingleLine(codeLine, i + 1, language),
    });
  }

  // สกัดแนวคิดสำคัญ (Key Concepts) จากโครงสร้างโค้ด
  const keyConcepts: string[] = [];
  if (/\b(const|let|var)\b|=/.test(rawCode)) {
    keyConcepts.push("ตัวแปรและการเก็บสถานะข้อมูล (Variables & State)");
  }
  if (/\b(if|else|switch|elif)\b|\?.*:/.test(rawCode)) {
    keyConcepts.push("การตรวจสอบเงื่อนไขและทางเลือก (Control Flow: Conditionals)");
  }
  if (/\b(for|while)\b|\.(map|forEach|filter|reduce)\(/.test(rawCode)) {
    keyConcepts.push("การวนซ้ำและประมวลผลชุดข้อมูล (Loops & Iteration)");
  }
  if (/\b(function|def|func)\b|=>/.test(rawCode)) {
    keyConcepts.push("การแยกส่วนการทำงานด้วยฟังก์ชัน (Functions & Modularity)");
  }
  if (/\b(async|await|Promise|fetch)\b/.test(rawCode)) {
    keyConcepts.push("การทำงานแบบไม่พร้อมกัน (Asynchronous Programming)");
  }
  if (/\[.*\]|\bArray\b/.test(rawCode)) {
    keyConcepts.push("โครงสร้างข้อมูลแถวลำดับ (Arrays / Lists)");
  }
  if (/^(SELECT|INSERT|UPDATE|DELETE)\b/im.test(rawCode)) {
    keyConcepts.push("การสืบค้นและจัดการฐานข้อมูล (SQL Querying)");
  }
  if (keyConcepts.length === 0) {
    keyConcepts.push(`พื้นฐานไวยากรณ์ภาษา ${langLabel} (Syntax & Expressions)`);
  }

  // สรุปขั้นตอนการทำงาน (Step-by-step Flow)
  const stepByStepFlow: string[] = [
    `1. เตรียมข้อมูลตั้งต้นและประกาศตัวแปร/ฟังก์ชันในภาษา ${langLabel} (ทั้งหมด ${lines.length} บรรทัด)`,
  ];
  if (keyConcepts.some((c) => c.includes("Loops") || c.includes("Conditionals"))) {
    stepByStepFlow.push(
      "2. ดำเนินการตรวจสอบเงื่อนไขหรือวนลูปประมวลผลข้อมูลทีละลำดับตามตรรกะที่กำหนด"
    );
  } else {
    stepByStepFlow.push("2. ประมวลผลคำสั่งตามลำดับจากบนลงล่าง (Sequential Execution)");
  }
  stepByStepFlow.push(
    "3. คืนค่าผลลัพธ์ (Return) หรือแสดงผลออกทางหน้าจอ/Console เมื่อจบการทำงาน"
  );

  // จุดที่ควรระวัง (Potential Pitfalls)
  const potentialPitfalls: string[] = [];
  if (/\bwhile\b/.test(rawCode)) {
    potentialPitfalls.push(
      "ระวัง Infinite Loop: ตรวจสอบว่าภายในลูป while มีการเปลี่ยนแปลงค่าตัวแปรที่ทำให้เงื่อนไขเป็นเท็จได้เสมอ"
    );
  }
  if (/\bawait\b/.test(rawCode) && !/\btry\b/.test(rawCode)) {
    potentialPitfalls.push(
      "มีการใช้ await โดยไม่มี try/catch: หาก API หรือ Promise ล้มเหลว อาจทำให้เกิด Unhandled Rejection ได้"
    );
  }
  if (/==[^=]/.test(rawCode) && (language === "javascript" || language === "typescript")) {
    potentialPitfalls.push(
      "พบการใช้ == แทน === ใน JavaScript/TypeScript: แนะนำให้ใช้ === เพื่อเปรียบเทียบทั้งค่าและชนิดข้อมูลอย่างแม่นยำ"
    );
  }
  if (potentialPitfalls.length === 0) {
    potentialPitfalls.push(
      "ควรทดสอบด้วยข้อมูลขอบเขต (Edge Cases) เช่น ค่าว่าง (null/empty) หรือตัวเลขติดลบ เพื่อให้มั่นใจว่าโค้ดทำงานถูกต้องทุกกรณี"
    );
  }

  const summary = `โค้ดภาษา ${langLabel} ความยาว ${lines.length} บรรทัดนี้ ประกอบด้วย ${keyConcepts.slice(0, 2).join(" และ ")} โดยทำงานตามลำดับตรรกะที่ชัดเจนและสามารถไล่ตรวจสอบค่าตัวแปรทีละบรรทัดได้ตามกรอบ Block Model`;

  return {
    language,
    summary,
    lineByLine,
    keyConcepts,
    stepByStepFlow,
    potentialPitfalls,
    provider: "mock-analyzer",
  };
}
