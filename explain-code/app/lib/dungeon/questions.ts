import { TopicQuest } from "../curriculum";
import {
  LearningLanguage,
  LANGUAGE_TRACKS,
  getTopicsByLanguage,
  runCodeByLanguage,
} from "../language-tracks";
import { INITIAL_LESSONS } from "../lms-data";

export interface DungeonTraceStep {
  line: number;
  codeLine: string;
  variables: Record<string, string>;
  explanation: string;
}

export interface DungeonQuestion {
  id: string;
  language?: LearningLanguage;
  question: string;
  questionEn?: string;
  codeSnippet?: string;
  choices: string[];
  choicesEn?: string[];
  correctIndex: number;
  explanation: string;
  explanationEn?: string;
  difficulty: "easy" | "medium" | "hard";
  blockModelCell?: string;
  hint?: string;
  hintEn?: string;
  traceSteps?: DungeonTraceStep[];
  expectedOutput?: string;
  phaseLabel?: string;
}

function inferLanguageFromTopicId(topicId: number): LearningLanguage {
  if (topicId >= 600) return "html";
  if (topicId >= 500) return "java";
  if (topicId >= 400) return "cpp";
  if (topicId >= 300) return "typescript";
  if (topicId >= 200) return "sql";
  if (topicId >= 100) return "python";
  return "javascript";
}

function inferLanguageFromCourseId(courseId?: string): LearningLanguage | undefined {
  if (!courseId) return undefined;
  const lower = courseId.toLowerCase();
  if (lower.includes("python") || lower.includes("-py-")) return "python";
  if (lower.includes("sql")) return "sql";
  if (lower.includes("typescript") || lower.includes("-ts-")) return "typescript";
  if (lower.includes("cpp") || lower.includes("c++")) return "cpp";
  if (lower.includes("java")) return "java";
  if (lower.includes("html") || lower.includes("css")) return "html";
  if (lower.includes("-js-") || lower.includes("async")) return "javascript";

  const matchedLesson = INITIAL_LESSONS.find((l) => l.course_id === courseId);
  if (matchedLesson) {
    const lang = matchedLesson.programming_language as LearningLanguage;
    if (LANGUAGE_TRACKS.some((t) => t.id === lang)) return lang;
  }
  return undefined;
}

function resolveOptionIndex(options: string[], targetOutput: string): number {
  const cleanTarget = targetOutput.trim();
  if (!cleanTarget) return 0;

  const exactIdx = options.findIndex((o) => o.trim() === cleanTarget);
  if (exactIdx !== -1) return exactIdx;

  const partialIdx = options.findIndex(
    (o) => o.includes(cleanTarget) || cleanTarget.includes(o.trim())
  );
  if (partialIdx !== -1) return partialIdx;

  return 0;
}

/**
 * สร้างลำดับการต่อสู้แบบ Multi-Phase สำหรับ TopicQuest 1 ด่าน:
 * Phase 1: Predict Output
 * Phase 2..N: Block Model Questions
 * Final Phase: Modify Challenge
 */
export function getQuestionsForTopic(
  topic: TopicQuest,
  lang?: LearningLanguage
): DungeonQuestion[] {
  const resolvedLang = lang ?? inferLanguageFromTopicId(topic.id);

  const traceSteps: DungeonTraceStep[] = topic.steps.map((s) => ({
    line: s.line,
    codeLine: s.codeLine,
    variables: { ...s.variables },
    explanation: s.explanation,
  }));

  const predictRun = runCodeByLanguage(topic.code, resolvedLang);
  const predictExpected = predictRun.success ? predictRun.finalOutput.trim() : "";
  const predictCorrectIndex = resolveOptionIndex(
    topic.predictOptions,
    predictExpected
  );

  const predictQuestion: DungeonQuestion = {
    id: `topic-${topic.id}-predict`,
    language: resolvedLang,
    question: topic.predictPrompt,
    questionEn: `[Predict Output] ${topic.predictPrompt}`,
    codeSnippet: topic.code,
    choices: topic.predictOptions,
    correctIndex: predictCorrectIndex,
    explanation: topic.predictExplanation,
    difficulty: topic.isBoss ? "hard" : "easy",
    blockModelCell: "E4",
    hint:
      topic.steps[0]?.explanation ||
      "ลองไล่ค่าตัวแปรทีละบรรทัดตั้งแต่บรรทัดแรกจนถึงคำสั่งแสดงผล",
    hintEn:
      "Trace each variable line by line from top to bottom before the output statement.",
    traceSteps,
    expectedOutput: predictExpected || topic.predictOptions[predictCorrectIndex],
    phaseLabel: "Phase 1 · Predict Output",
  };

  const blockQuestions: DungeonQuestion[] = topic.questions.map((q, idx) => {
    const correctIdx = Math.max(
      0,
      q.options.findIndex((o) => o.id === q.correctOptionId)
    );
    return {
      id: `topic-${topic.id}-${q.id}`,
      language: resolvedLang,
      question: q.question,
      questionEn: `[Block ${q.cellId}] ${q.question}`,
      codeSnippet: topic.code,
      choices: q.options.map((o) => o.text),
      correctIndex: correctIdx,
      explanation: q.explanation,
      difficulty: topic.isBoss ? "hard" : "medium",
      blockModelCell: q.cellId,
      hint: q.hint,
      hintEn: q.hint,
      traceSteps,
      expectedOutput: predictExpected || topic.predictOptions[predictCorrectIndex],
      phaseLabel: `Phase ${idx + 2} · Block Model (${q.cellId})`,
    };
  });

  const modRun = runCodeByLanguage(topic.modifyChallenge.suggestedCode, resolvedLang);
  const modExpected = modRun.success ? modRun.finalOutput.trim() : "";
  const modCorrectIndex = resolveOptionIndex(
    topic.modifyChallenge.options,
    modExpected
  );

  const modifyQuestion: DungeonQuestion = {
    id: `topic-${topic.id}-modify`,
    language: resolvedLang,
    question: topic.modifyChallenge.instruction,
    questionEn: `[Modify Challenge] ${topic.modifyChallenge.instruction}`,
    codeSnippet: topic.modifyChallenge.suggestedCode,
    choices: topic.modifyChallenge.options,
    correctIndex: modCorrectIndex,
    explanation: topic.modifyChallenge.explanation,
    difficulty: "hard",
    blockModelCell: "F4",
    hint: topic.modifyChallenge.changeDescription,
    hintEn: topic.modifyChallenge.changeDescription,
    traceSteps,
    expectedOutput: modExpected || topic.modifyChallenge.options[modCorrectIndex],
    phaseLabel: "Final Phase · Modify Challenge",
  };

  return [predictQuestion, ...blockQuestions, modifyQuestion];
}

const CURATED_DUNGEON_QUESTIONS: DungeonQuestion[] = [
  // ================= JavaScript =================
  {
    id: "q-trial-1",
    language: "javascript",
    question: "โค้ดด้านล่างนี้ ค่าของตัวแปร x หลังจบลูปจะมีค่าเท่าใด?",
    questionEn: "What will be the value of variable x after the loop finishes?",
    codeSnippet: "let x = 0;\nfor (let i = 1; i <= 3; i++) {\n  x += i;\n}",
    choices: ["3", "6", "0", "4"],
    choicesEn: ["3", "6", "0", "4"],
    correctIndex: 1,
    explanation:
      "รอบที่ 1: i=1 -> x=1, รอบที่ 2: i=2 -> x=1+2=3, รอบที่ 3: i=3 -> x=3+3=6 ดังนั้นเมื่อจบลูป x จะเท่ากับ 6",
    explanationEn:
      "Iteration 1: i=1 -> x=1; Iteration 2: i=2 -> x=3; Iteration 3: i=3 -> x=6.",
    difficulty: "easy",
    blockModelCell: "E2",
    hint: "ลองบวกค่า i ในแต่ละรอบ: 0 + 1 + 2 + 3",
    hintEn: "Sum i on each iteration: 0 + 1 + 2 + 3.",
    traceSteps: [
      { line: 1, codeLine: "let x = 0;", variables: { x: "0" }, explanation: "ตั้งค่าเริ่มต้น x = 0" },
      { line: 3, codeLine: "x += i; // i = 1", variables: { i: "1", x: "1" }, explanation: "รอบที่ 1: 0 + 1 = 1" },
      { line: 3, codeLine: "x += i; // i = 2", variables: { i: "2", x: "3" }, explanation: "รอบที่ 2: 1 + 2 = 3" },
      { line: 3, codeLine: "x += i; // i = 3", variables: { i: "3", x: "6" }, explanation: "รอบที่ 3: 3 + 3 = 6" },
    ],
    expectedOutput: "6",
    phaseLabel: "JavaScript · Loop Trace",
  },
  {
    id: "q-var-1",
    language: "javascript",
    question: "ใน JavaScript ข้อใดคือความแตกต่างระหว่าง let และ const?",
    questionEn: "In JavaScript, what is the key difference between let and const?",
    choices: [
      "let เปลี่ยนแปลงค่าไม่ได้ แต่ const เปลี่ยนแปลงได้",
      "const ต้องกำหนดค่าเริ่มต้นและไม่สามารถกำหนดค่าใหม่ได้ แต่ let กำหนดค่าใหม่ได้",
      "ทั้งสองตัวทำงานเหมือนกันทุกประการ",
      "const ใช้สำหรับตัวเลขเท่านั้น ส่วน let ใช้สำหรับข้อความ",
    ],
    choicesEn: [
      "let cannot be reassigned, while const can",
      "const cannot be reassigned after initialization, while let can be reassigned",
      "They behave identically in every way",
      "const is only for numbers, while let is only for strings",
    ],
    correctIndex: 1,
    explanation:
      "const (Constant) กำหนดตัวแปรคงที่ ไม่สามารถ assign ค่าใหม่ได้ ส่วน let อนุญาตให้ reassign ค่าใหม่ได้",
    explanationEn:
      "const creates a read-only binding that cannot be reassigned, whereas let allows reassignment.",
    difficulty: "easy",
    blockModelCell: "T1",
    hint: "const ย่อมาจาก Constant (ค่าคงที่)",
    hintEn: "const stands for Constant.",
    expectedOutput: "const cannot be reassigned",
  },
  {
    id: "q-cond-1",
    language: "javascript",
    question: "เงื่อนไขใดจะทำให้บล็อกคำสั่ง if ทำงาน?",
    questionEn: "Which condition causes the if block to execute?",
    codeSnippet: "let score = 75;\nif (score >= 80) {\n  result = 'A';\n} else {\n  result = 'B';\n}",
    choices: [
      "เมื่อ score มีค่าน้อยกว่า 80",
      "เมื่อ score มีค่าตั้งแต่ 80 ขึ้นไป",
      "เมื่อ score เท่ากับ 75 เท่านั้น",
      "คำสั่ง if จะทำงานเสมอไม่ว่า score จะมีค่าเท่าใด",
    ],
    choicesEn: [
      "When score is less than 80",
      "When score is 80 or greater",
      "Only when score equals 75",
      "The if block always runs regardless of score",
    ],
    correctIndex: 1,
    explanation:
      "เครื่องหมาย >= หมายถึงมากกว่าหรือเท่ากับ ดังนั้นบล็อก if จะทำงานเมื่อ score มีค่า 80 ขึ้นไป",
    explanationEn: ">= means greater than or equal to, so it runs when score is 80 or higher.",
    difficulty: "easy",
    blockModelCell: "E1",
    hint: "ดูที่เครื่องหมาย >= 80",
    hintEn: "Look at the >= 80 comparison operator.",
    expectedOutput: "result = 'B'",
  },
  {
    id: "q-func-1",
    language: "javascript",
    question: "ฟังก์ชัน greet นี้มีจุดประสงค์หลัก (Function-Purpose) ตาม Block Model เพื่ออะไร?",
    questionEn: "What is the primary purpose of the greet function?",
    codeSnippet: "function greet(name) {\n  return 'สวัสดี ' + name;\n}",
    choices: [
      "พิมพ์ข้อความลงในคอนโซลทันที",
      "รับชื่อเป็นอาร์กิวเมนต์แล้วส่งคืนข้อความทักทายกลับไปให้ผู้เรียก",
      "วนซ้ำเพื่อค้นหาชื่อในฐานข้อมูล",
      "ลบค่าตัวแปร name ออกจากระบบ",
    ],
    choicesEn: [
      "Immediately logs a message to the console",
      "Takes a name argument and returns a greeting string to the caller",
      "Loops through a database to find a user",
      "Deletes the name variable",
    ],
    correctIndex: 1,
    explanation:
      "ฟังก์ชันนี้ไม่ได้เรียก console.log แต่ใช้ return เพื่อส่งคืนสตริงที่นำคำว่า 'สวัสดี ' มาต่อกับค่า parameter ที่ส่งเข้ามา",
    explanationEn:
      "The function uses return (not console.log) to send back the concatenated greeting string.",
    difficulty: "medium",
    blockModelCell: "F3",
    hint: "สังเกตคำสั่ง return ภายในฟังก์ชัน",
    hintEn: "Notice the return statement inside the function.",
    expectedOutput: "'สวัสดี ...'",
  },
  {
    id: "q-boss-1",
    language: "javascript",
    question: "จอมมารลูปโจมตี! โค้ดใดต่อไปนี้จะทำให้เกิด 'Infinite Loop' (ลูปไม่สิ้นสุด)?",
    questionEn: "Boss Attack! Which snippet below creates an Infinite Loop?",
    codeSnippet: "// ตัวเลือก ก: for (let i = 0; i < 5; i++)\n// ตัวเลือก ข: while (true)\n// ตัวเลือก ค: while (x > 10) โดย x = 5",
    choices: [
      "ตัวเลือก ก เท่านั้น",
      "ตัวเลือก ข: while (true) ที่ไม่มีเงื่อนไข break",
      "ตัวเลือก ค เท่านั้น",
      "ไม่มีข้อใดทำให้เกิด Infinite Loop",
    ],
    choicesEn: [
      "Option A only",
      "Option B: while (true) with no break condition",
      "Option C only",
      "None of them",
    ],
    correctIndex: 1,
    explanation:
      "while (true) จะตรวจสอบเงื่อนไขเป็นจริงตลอดกาล หากภายในบล็อกไม่มีคำสั่ง break หรือ return จะทำให้ระบบค้างเนื่องจากเกิด Infinite Loop",
    explanationEn:
      "while (true) always evaluates to true, looping forever unless break or return is reached.",
    difficulty: "hard",
    blockModelCell: "E2",
    hint: "เงื่อนไขใดที่เป็นจริงตลอดเวลาไม่มีวันเป็นเท็จ?",
    hintEn: "Which loop condition never becomes false?",
    expectedOutput: "Infinite Loop",
  },

  // ================= Python =================
  {
    id: "q-py-dungeon-1",
    language: "python",
    question: "ในภาษา Python คำสั่ง range(1, 5) จะวนซ้ำสำหรับค่า i ใดบ้าง?",
    questionEn: "In Python, which values of i does range(1, 5) produce?",
    codeSnippet: "for i in range(1, 5):\n    print(i)",
    choices: ["1, 2, 3, 4", "1, 2, 3, 4, 5", "0, 1, 2, 3, 4", "1 และ 5"],
    choicesEn: ["1, 2, 3, 4", "1, 2, 3, 4, 5", "0, 1, 2, 3, 4", "1 and 5 only"],
    correctIndex: 0,
    explanation: "range(start, stop) จะหยุดก่อนถึง stop เสมอ จึงได้ 1, 2, 3, 4",
    explanationEn: "range(start, stop) is half-open and excludes stop, yielding 1, 2, 3, 4.",
    difficulty: "easy",
    blockModelCell: "T2",
    hint: "ใน Python เลขตัวท้ายของ range(1, 5) จะไม่ถูกรวม",
    hintEn: "The stop argument in range(start, stop) is exclusive.",
    expectedOutput: "1\n2\n3\n4",
  },
  {
    id: "q-py-dungeon-2",
    language: "python",
    question: "โค้ด Python ด้านล่างนี้จะพิมพ์ข้อความใดออกมา?",
    questionEn: "What will this Python snippet print?",
    codeSnippet: 'temp = 34\nif temp >= 38:\n    print("Hot")\nelif temp >= 30:\n    print("Warm")\nelse:\n    print("Cool")',
    choices: ["Hot", "Warm", "Cool", "Normal"],
    choicesEn: ["Hot", "Warm", "Cool", "Normal"],
    correctIndex: 1,
    explanation: "34 < 38 จึงข้าม if แรก และ 34 >= 30 เป็นจริงใน elif จึงพิมพ์ Warm",
    explanationEn: "34 < 38 skips if, and 34 >= 30 matches elif, printing Warm.",
    difficulty: "medium",
    blockModelCell: "E2",
    hint: "เช็คเงื่อนไขจากบนลงล่างทีละขั้นสำหรับ temp = 34",
    hintEn: "Evaluate conditions top-down with temp = 34.",
    expectedOutput: "Warm",
  },
  {
    id: "q-py-boss",
    language: "python",
    question: "บอสมังกรไพธอน! หาก AI เขียน total = sum([10, 20, 30]) แล้ววน for i in range(1, 3): total += i ค่าสุดท้ายคือเท่าไร?",
    questionEn: "Python Dragon Boss! Given total = 60 and for i in range(1, 3): total += i, what is the final total?",
    codeSnippet: "total = sum([10, 20, 30])\nfor i in range(1, 3):\n    total += i\nprint(total)",
    choices: ["66", "63", "61", "65"],
    choicesEn: ["66", "63", "61", "65"],
    correctIndex: 1,
    explanation: "sum([10, 20, 30]) = 60 จากนั้น range(1, 3) ให้ค่า i = 1 และ 2 (ไม่รวม 3) ดังนั้น 60 + 1 + 2 = 63",
    explanationEn: "sum([10, 20, 30]) is 60; range(1, 3) yields 1 and 2, so 60 + 1 + 2 = 63.",
    difficulty: "hard",
    blockModelCell: "E4",
    hint: "range(1, 3) มีแค่ 1 กับ 2 เท่านั้น",
    hintEn: "range(1, 3) produces only 1 and 2.",
    expectedOutput: "63",
  },

  // ================= SQL =================
  {
    id: "q-sql-dungeon-1",
    language: "sql",
    question: "ลำดับการทำงานจริง (Execution Order) ของฐานข้อมูล SQL ข้อใดถูกต้อง?",
    questionEn: "Which SQL execution order is actually used by the database engine?",
    codeSnippet: "SELECT name, price\nFROM products\nWHERE price >= 500\nORDER BY price ASC;",
    choices: [
      "SELECT -> FROM -> WHERE -> ORDER BY",
      "FROM -> WHERE -> SELECT -> ORDER BY",
      "ORDER BY -> WHERE -> FROM -> SELECT",
      "WHERE -> SELECT -> ORDER BY -> FROM",
    ],
    choicesEn: [
      "SELECT -> FROM -> WHERE -> ORDER BY",
      "FROM -> WHERE -> SELECT -> ORDER BY",
      "ORDER BY -> WHERE -> FROM -> SELECT",
      "WHERE -> SELECT -> ORDER BY -> FROM",
    ],
    correctIndex: 1,
    explanation: "ฐานข้อมูลต้องดึงตารางจาก FROM ก่อน แล้วกรองด้วย WHERE จากนั้นเลือกคอลัมน์ SELECT และเรียงด้วย ORDER BY",
    explanationEn: "Databases load FROM first, filter rows with WHERE, project columns in SELECT, then sort with ORDER BY.",
    difficulty: "easy",
    blockModelCell: "E2",
    hint: "ต้องรู้ตารางก่อนจึงจะกรองแถวได้",
    hintEn: "The engine must load the table before filtering rows.",
    expectedOutput: "Keyboard (900), Monitor (3500)",
  },
  {
    id: "q-sql-boss",
    language: "sql",
    question: "บอสคลังศิลา SQL! เหตุใดจึงใช้ WHERE SUM(amount) >= 100 หลัง GROUP BY ไม่ได้?",
    questionEn: "SQL Vault Boss! Why cannot WHERE SUM(amount) >= 100 be used after GROUP BY?",
    codeSnippet: "SELECT category, SUM(amount) AS total\nFROM sales\nGROUP BY category\nHAVING SUM(amount) >= 100;",
    choices: [
      "เพราะ WHERE กรองรายแถวก่อน GROUP BY ต้องใช้ HAVING กรองระดับกลุ่ม",
      "เพราะ SUM ใช้ได้เฉพาะกับข้อความ",
      "เพราะต้องใช้ ORDER BY แทน",
      "เพราะตาราง sales ห้ามใช้ตัวเลข",
    ],
    choicesEn: [
      "Because WHERE filters rows before GROUP BY; HAVING filters aggregated groups",
      "Because SUM only works on text",
      "Because ORDER BY must be used instead",
      "Because sales tables forbid numbers",
    ],
    correctIndex: 0,
    explanation: "WHERE ทำงานก่อนการรวมกลุ่ม (GROUP BY) จึงยังไม่รู้จักผลลัพธ์ของ SUM() ต้องใช้ HAVING กรองหลัง GROUP BY",
    explanationEn: "WHERE executes before GROUP BY; HAVING evaluates aggregate conditions after grouping.",
    difficulty: "hard",
    blockModelCell: "F2",
    hint: "คิดถึงลำดับระหว่าง WHERE -> GROUP BY -> HAVING",
    hintEn: "Remember execution order: WHERE -> GROUP BY -> HAVING.",
    expectedOutput: "Book: 500",
  },

  // ================= TypeScript =================
  {
    id: "q-ts-dungeon-1",
    language: "typescript",
    question: "เมื่อรันโค้ด TypeScript ด้านล่าง console.log จะพิมพ์ค่าใดออกมา?",
    questionEn: "What does console.log output for this TypeScript snippet?",
    codeSnippet: 'interface Product { name: string; price: number; }\nconst item: Product = { name: "Mouse", price: 450 };\nconsole.log(item.price * 2);',
    choices: ["450", "900", "Mouse", "NaN"],
    choicesEn: ["450", "900", "Mouse", "NaN"],
    correctIndex: 1,
    explanation: "item.price เป็น number มีค่า 450 เมื่อคูณ 2 จึงได้ 900",
    explanationEn: "item.price is 450 (number), so 450 * 2 outputs 900.",
    difficulty: "easy",
    blockModelCell: "E1",
    hint: "คูณค่า item.price ด้วย 2",
    hintEn: "Multiply item.price by 2.",
    expectedOutput: "900",
  },
  {
    id: "q-ts-boss",
    language: "typescript",
    question: "บอสวิหารไทป์สคริปต์! ข้อใดอธิบายประโยชน์ของ Generic <T> ใน function first<T>(arr: readonly T[]): T | undefined ได้ดีที่สุด?",
    questionEn: "TypeScript Temple Boss! What best describes the benefit of Generic <T> in first<T>(arr: readonly T[]): T | undefined?",
    codeSnippet: "function first<T>(arr: readonly T[]): T | undefined {\n  return arr[0];\n}",
    choices: [
      "คงชนิดข้อมูลของสมาชิกในอาเรย์ไว้ในค่าที่ return โดยไม่ต้องเสีย Type Safety แบบ any",
      "ลบ Type Annotation ออกจากโปรเจกต์ทั้งหมด",
      "อนุญาตให้แก้ไขอาร์เรย์ arr ภายในฟังก์ชันได้",
      "เปลี่ยนอาเรย์ให้เป็น SQL Table",
    ],
    choicesEn: [
      "Preserves the array element type in the return value without losing type safety like 'any'",
      "Removes all type checks across the project",
      "Allows mutating the readonly array inside the function",
      "Converts the array into a SQL table",
    ],
    correctIndex: 0,
    explanation: "Generic <T> จับคู่ชนิดของสมาชิก input เข้ากับชนิดของผลลัพธ์ output อย่างปลอดภัย",
    explanationEn: "Generic <T> links the input element type to the return type with full compile-time safety.",
    difficulty: "hard",
    blockModelCell: "T3",
    hint: "สังเกตว่าทั้ง readonly T[] และค่าที่ return ต่างใช้ตัวแปรชนิด T เดียวกัน",
    hintEn: "Notice both input readonly T[] and the return type share the same type parameter T.",
    expectedOutput: "arr[0]",
  },

  // ================= C++ =================
  {
    id: "q-cpp-dungeon-1",
    language: "cpp",
    question: "ในภาษา C++ โค้ดด้านล่างนี้จะพิมพ์ค่าใดออกทางหน้าจอ?",
    questionEn: "In C++, what does this snippet print to stdout?",
    codeSnippet: "int total = 7;\nint count = 2;\nint avg = total / count;\ncout << avg << endl;",
    choices: ["3.5", "3", "4", "7"],
    choicesEn: ["3.5", "3", "4", "7"],
    correctIndex: 1,
    explanation: "int หารด้วย int ใน C++ จะเกิด Integer Division ตัดทศนิยมทิ้ง 7 / 2 จึงได้ 3",
    explanationEn: "Dividing two ints in C++ performs integer division, truncating 3.5 down to 3.",
    difficulty: "easy",
    blockModelCell: "E1",
    hint: "ระวัง! ทั้ง total และ count เป็น int ทั้งคู่",
    hintEn: "Watch out! Both total and count are integers.",
    expectedOutput: "3",
  },
  {
    id: "q-cpp-boss",
    language: "cpp",
    question: "บอสป้อมปราการ C++! เมื่อส่ง hp เข้า void addBonus(int& hp, int bonus) ค่า hp ใน main หลังเรียก addBonus(hp, 25) คือเท่าไร?",
    questionEn: "C++ Fortress Boss! After calling addBonus(hp, 25) where hp = 50 and parameter is int& hp, what is hp in main?",
    codeSnippet: "void addBonus(int& hp, int bonus) {\n    hp = hp + bonus;\n}\nint main() {\n    int hp = 50;\n    addBonus(hp, 25);\n    cout << hp << endl;\n}",
    choices: ["50", "75", "25", "0"],
    choicesEn: ["50", "75", "25", "0"],
    correctIndex: 1,
    explanation: "int& hp คือ Pass-by-Reference จึงแก้ไขตัวแปร hp ใน main จาก 50 เป็น 75 จริง",
    explanationEn: "int& hp passes by reference, mutating the caller's hp from 50 to 75.",
    difficulty: "hard",
    blockModelCell: "E3",
    hint: "สังเกตเครื่องหมาย & หน้าชื่อพารามิเตอร์ hp",
    hintEn: "Notice the & reference symbol on parameter hp.",
    expectedOutput: "75",
  },

  // ================= Java =================
  {
    id: "q-java-dungeon-1",
    language: "java",
    question: "โค้ด Java ด้านล่างนี้จะพิมพ์ข้อความใดออกมา?",
    questionEn: "What will this Java code print?",
    codeSnippet: 'String role = new String("admin");\nif (role == "admin") {\n    System.out.println("Granted");\n} else {\n    System.out.println("Denied");\n}',
    choices: ["Granted", "Denied", "admin", "Compile Error"],
    choicesEn: ["Granted", "Denied", "admin", "Compile Error"],
    correctIndex: 1,
    explanation: 'new String("admin") สร้าง Reference ใหม่ที่ไม่ตรงกับ String Literal "admin" การใช้ == จึงได้ false และพิมพ์ Denied (ควรใช้ .equals())',
    explanationEn: 'new String("admin") allocates a distinct object reference, so == evaluates to false and prints Denied. Use .equals() instead.',
    difficulty: "medium",
    blockModelCell: "E2",
    hint: "ใน Java เครื่องหมาย == บน Object เทียบ Reference ไม่ได้เทียบตัวอักษร!",
    hintEn: "In Java, == compares object references, not string contents.",
    expectedOutput: "Denied",
  },
  {
    id: "q-java-boss",
    language: "java",
    question: "บอสหอคอย Java! เมื่อ Hero เริ่มที่ hp = 100 และโดน takeDamage(30), takeDamage(45), takeDamage(50) ค่า hero.hp สุดท้ายคือเท่าไร?",
    questionEn: "Java Citadel Boss! Hero starts at hp = 100 and takes hits of 30, 45, 50. What is final hero.hp?",
    codeSnippet: "void takeDamage(int dmg) {\n    if (dmg > this.hp) { this.hp = 0; }\n    else { this.hp -= dmg; }\n}",
    choices: ["-25", "0", "25", "100"],
    choicesEn: ["-25", "0", "25", "100"],
    correctIndex: 1,
    explanation: "100 -> 70 -> 25 -> รอบสุดท้าย dmg (50) > hp (25) จึงตั้งค่า this.hp = 0",
    explanationEn: "100 -> 70 -> 25 -> on hit 50 > 25, the guard clamps this.hp to 0.",
    difficulty: "hard",
    blockModelCell: "F3",
    hint: "เช็คเงื่อนไข if (dmg > this.hp) ในการโจมตีครั้งที่ 3",
    hintEn: "Check the if (dmg > this.hp) guard on the third hit.",
    expectedOutput: "0",
  },
];

function buildAllTopicDungeonQuestions(): DungeonQuestion[] {
  const result: DungeonQuestion[] = [];
  for (const track of LANGUAGE_TRACKS) {
    const topics = getTopicsByLanguage(track.id);
    for (const topic of topics) {
      result.push(...getQuestionsForTopic(topic, track.id));
    }
  }
  return result;
}

function buildAllLessonDungeonQuestions(): DungeonQuestion[] {
  const result: DungeonQuestion[] = [];
  for (const lesson of INITIAL_LESSONS) {
    const lang = (lesson.programming_language || "javascript") as LearningLanguage;
    const validLang = LANGUAGE_TRACKS.some((t) => t.id === lang) ? lang : "javascript";
    for (const q of lesson.quiz_questions || []) {
      result.push({
        id: q.id,
        language: validLang,
        question: q.question,
        codeSnippet: lesson.code_example,
        choices: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation || "คำตอบถูกต้องตามบทเรียน",
        difficulty: lesson.order_index >= 3 ? "hard" : lesson.order_index === 2 ? "medium" : "easy",
        blockModelCell: "E2",
        hint: "สังเกตโค้ดตัวอย่างในบทเรียนแล้วไล่ทีละบรรทัด",
        hintEn: "Inspect the lesson code example line by line.",
        phaseLabel: lesson.title,
      });
    }
  }
  return result;
}

const combinedQuestions = [
  ...CURATED_DUNGEON_QUESTIONS,
  ...buildAllTopicDungeonQuestions(),
  ...buildAllLessonDungeonQuestions(),
];

const seenQuestionIds = new Set<string>();
export const SAMPLE_DUNGEON_QUESTIONS: DungeonQuestion[] = combinedQuestions.filter((q) => {
  if (seenQuestionIds.has(q.id)) return false;
  seenQuestionIds.add(q.id);
  return true;
});

export function getQuestionForFloor(
  floorIndex: number,
  isBoss: boolean,
  lang?: LearningLanguage,
  courseId?: string
): DungeonQuestion {
  const resolvedLang = lang ?? inferLanguageFromCourseId(courseId);

  // หากระบุ courseId และมีคำถามบทเรียนใน INITIAL_LESSONS ให้จับคู่ตามภาษาและคอร์สก่อน
  if (courseId) {
    const courseLessonIds = new Set(
      INITIAL_LESSONS.filter((l) => l.course_id === courseId).flatMap((l) =>
        (l.quiz_questions || []).map((q) => q.id)
      )
    );
    const coursePool = SAMPLE_DUNGEON_QUESTIONS.filter((q) =>
      courseLessonIds.has(q.id)
    );
    if (coursePool.length > 0 && !isBoss) {
      return coursePool[floorIndex % coursePool.length];
    }
  }

  // กรองคำถามที่ตรงภาษา (หากมี)
  if (resolvedLang) {
    const curatedLangPool = CURATED_DUNGEON_QUESTIONS.filter(
      (q) => q.language === resolvedLang
    );
    const fullLangPool = SAMPLE_DUNGEON_QUESTIONS.filter(
      (q) => q.language === resolvedLang
    );
    const pool = curatedLangPool.length > 0 ? curatedLangPool : fullLangPool;

    if (pool.length > 0) {
      if (isBoss) {
        const bossCandidates = fullLangPool.filter((q) => q.difficulty === "hard");
        if (bossCandidates.length > 0) {
          return bossCandidates[floorIndex % bossCandidates.length];
        }
        return pool[pool.length - 1];
      }
      const regularCandidates = pool.filter((q) => q.difficulty !== "hard");
      const pickFrom = regularCandidates.length > 0 ? regularCandidates : pool;
      return pickFrom[floorIndex % pickFrom.length];
    }
  }

  // Default fallback (backwards compatible)
  if (isBoss) {
    const boss = CURATED_DUNGEON_QUESTIONS.find((q) => q.id === "q-boss-1");
    return boss || CURATED_DUNGEON_QUESTIONS[4] || SAMPLE_DUNGEON_QUESTIONS[0];
  }
  const nonBoss = CURATED_DUNGEON_QUESTIONS.filter(
    (q) => q.language === "javascript" && q.difficulty !== "hard"
  );
  return nonBoss[floorIndex % nonBoss.length] || SAMPLE_DUNGEON_QUESTIONS[0];
}

/**
 * Picks a short Predict/Trace question (1 question) for a Code Chest event.
 */
export function getChestQuestion(
  seedIndex: number,
  lang?: LearningLanguage,
  excludeQuestionId?: string
): DungeonQuestion {
  const resolvedLang = lang ?? "javascript";
  const langTopics = getTopicsByLanguage(resolvedLang);

  // Build short predict questions from language track topics
  const topicPredictPool: DungeonQuestion[] = langTopics.map((topic) => {
    const predictRun = runCodeByLanguage(topic.code, resolvedLang);
    const predictExpected = predictRun.success ? predictRun.finalOutput.trim() : "";
    const correctIdx = resolveOptionIndex(topic.predictOptions, predictExpected);
    return {
      id: `chest-${resolvedLang}-${topic.id}`,
      language: resolvedLang,
      question: topic.predictPrompt,
      questionEn: `[Predict Output] ${topic.predictPrompt}`,
      codeSnippet: topic.code,
      choices: topic.predictOptions,
      correctIndex: correctIdx,
      explanation: topic.predictExplanation,
      difficulty: "easy",
      blockModelCell: "E4",
      hint: topic.steps[0]?.explanation || "ไล่ค่าตัวแปรทีละบรรทัดจนถึงคำสั่งแสดงผล",
      hintEn: "Trace each variable line by line to predict the output.",
      expectedOutput: predictExpected || undefined,
      phaseLabel: "Code Chest · Predict",
    };
  });

  const samplePool = SAMPLE_DUNGEON_QUESTIONS.filter(
    (q) =>
      q.language === resolvedLang &&
      q.difficulty !== "hard" &&
      q.id !== excludeQuestionId
  );

  const pool =
    topicPredictPool.filter((q) => q.id !== excludeQuestionId).length > 0
      ? topicPredictPool.filter((q) => q.id !== excludeQuestionId)
      : samplePool.length > 0
      ? samplePool
      : SAMPLE_DUNGEON_QUESTIONS;

  const idx = Math.abs(seedIndex) % pool.length;
  return pool[idx] || SAMPLE_DUNGEON_QUESTIONS[0];
}
