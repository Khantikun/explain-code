export interface DungeonQuestion {
  id: string;
  question: string;
  codeSnippet?: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  blockModelCell?: string;
}

export const SAMPLE_DUNGEON_QUESTIONS: DungeonQuestion[] = [
  {
    id: "q-trial-1",
    question: "โค้ดด้านล่างนี้ ค่าของตัวแปร x หลังจบลูปจะมีค่าเท่าใด?",
    codeSnippet: "let x = 0;\nfor (let i = 1; i <= 3; i++) {\n  x += i;\n}",
    choices: ["3", "6", "0", "4"],
    correctIndex: 1,
    explanation:
      "รอบที่ 1: i=1 -> x=1, รอบที่ 2: i=2 -> x=1+2=3, รอบที่ 3: i=3 -> x=3+3=6 ดังนั้นเมื่อจบลูป x จะเท่ากับ 6",
    difficulty: "easy",
    blockModelCell: "Execution-Flow",
  },
  {
    id: "q-var-1",
    question: "ใน JavaScript ข้อใดคือความแตกต่างระหว่าง let และ const?",
    choices: [
      "let เปลี่ยนแปลงค่าไม่ได้ แต่ const เปลี่ยนแปลงได้",
      "const ต้องกำหนดค่าเริ่มต้นและไม่สามารถกำหนดค่าใหม่ได้ แต่ let กำหนดค่าใหม่ได้",
      "ทั้งสองตัวทำงานเหมือนกันทุกประการ",
      "const ใช้สำหรับตัวเลขเท่านั้น ส่วน let ใช้สำหรับข้อความ",
    ],
    correctIndex: 1,
    explanation:
      "const (Constant) กำหนดตัวแปรคงที่ ไม่สามารถ assign ค่าใหม่ได้ ส่วน let อนุญาตให้ reassign ค่าใหม่ได้",
    difficulty: "easy",
    blockModelCell: "Text-Syntax",
  },
  {
    id: "q-cond-1",
    question: "เงื่อนไขใดจะทำให้บล็อกคำสั่ง if ทำงาน?",
    codeSnippet: "let score = 75;\nif (score >= 80) {\n  result = 'A';\n} else {\n  result = 'B';\n}",
    choices: [
      "เมื่อ score มีค่าน้อยกว่า 80",
      "เมื่อ score มีค่าตั้งแต่ 80 ขึ้นไป",
      "เมื่อ score เท่ากับ 75 เท่านั้น",
      "คำสั่ง if จะทำงานเสมอไม่ว่า score จะมีค่าเท่าใด",
    ],
    correctIndex: 1,
    explanation:
      "เครื่องหมาย >= หมายถึงมากกว่าหรือเท่ากับ ดังนั้นบล็อก if จะทำงานเมื่อ score มีค่า 80 ขึ้นไป",
    difficulty: "easy",
    blockModelCell: "Execution-Value",
  },
  {
    id: "q-func-1",
    question: "ฟังก์ชัน greet นี้มีจุดประสงค์หลัก (Function-Purpose) ตาม Block Model เพื่ออะไร?",
    codeSnippet: "function greet(name) {\n  return 'สวัสดี ' + name;\n}",
    choices: [
      "พิมพ์ข้อความลงในคอนโซลทันที",
      "รับชื่อเป็นอาร์กิวเมนต์แล้วส่งคืนข้อความทักทายกลับไปให้ผู้เรียก",
      "วนซ้ำเพื่อค้นหาชื่อในฐานข้อมูล",
      "ลบค่าตัวแปร name ออกจากระบบ",
    ],
    correctIndex: 1,
    explanation:
      "ฟังก์ชันนี้ไม่ได้เรียก console.log แต่ใช้ return เพื่อส่งคืนสตริงที่นำคำว่า 'สวัสดี ' มาต่อกับค่า parameter ที่ส่งเข้ามา",
    difficulty: "medium",
    blockModelCell: "Function-Purpose",
  },
  {
    id: "q-boss-1",
    question: "จอมมารลูปโจมตี! โค้ดใดต่อไปนี้จะทำให้เกิด 'Infinite Loop' (ลูปไม่สิ้นสุด)?",
    codeSnippet: "// ตัวเลือก ก: for (let i = 0; i < 5; i++)\n// ตัวเลือก ข: while (true)\n// ตัวเลือก ค: while (x > 10) โดย x = 5",
    choices: [
      "ตัวเลือก ก เท่านั้น",
      "ตัวเลือก ข: while (true) ที่ไม่มีเงื่อนไข break",
      "ตัวเลือก ค เท่านั้น",
      "ไม่มีข้อใดทำให้เกิด Infinite Loop",
    ],
    correctIndex: 1,
    explanation:
      "while (true) จะตรวจสอบเงื่อนไขเป็นจริงตลอดกาล หากภายในบล็อกไม่มีคำสั่ง break หรือ return จะทำให้ระบบค้างเนื่องจากเกิด Infinite Loop",
    difficulty: "hard",
    blockModelCell: "Execution-Flow",
  },
];

export function getQuestionForFloor(floorIndex: number, isBoss: boolean): DungeonQuestion {
  if (isBoss) {
    return SAMPLE_DUNGEON_QUESTIONS[SAMPLE_DUNGEON_QUESTIONS.length - 1];
  }
  const idx = floorIndex % (SAMPLE_DUNGEON_QUESTIONS.length - 1);
  return SAMPLE_DUNGEON_QUESTIONS[idx] || SAMPLE_DUNGEON_QUESTIONS[0];
}
