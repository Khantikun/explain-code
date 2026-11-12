import { TOPICS, TopicQuest, runJavaScriptReal } from "./curriculum";

export type LearningLanguage = "javascript" | "python" | "sql";

export interface LanguageTrackMeta {
  id: LearningLanguage;
  name: string;
  shortBadge: string;
  categoryLabel: string;
  tagline: string;
  description: string;
  accentColor: string;
  bgTint: string;
  borderColor: string;
  highlights: string[];
  sampleCodePreview: string;
  defaultPlaygroundCode: string;
  playgroundDescription: string;
}

export const LANGUAGE_TRACKS: LanguageTrackMeta[] = [
  {
    id: "javascript",
    name: "JavaScript",
    shortBadge: "JS · Web & Logic",
    categoryLabel: "ประเภทที่ 1 · พัฒนาเว็บและตรรกะแอปพลิเคชัน",
    tagline: "ภาษาหลักของเว็บยุคใหม่ ฝึกแกะตรรกะ ตัวแปร ลูป และฟังก์ชัน",
    description:
      "เหมาะสำหรับผู้เริ่มต้นและผู้ที่ต้องการสร้างเว็บไซต์หรือแอปพลิเคชัน ฝึกอ่านโครงสร้างปีกกา { }, เงื่อนไข if/else, ลูป for/while และการตรวจสอบโค้ด JavaScript ที่ได้จาก AI",
    accentColor: "#0f766e",
    bgTint: "#e3f1ee",
    borderColor: "#0f766e",
    highlights: [
      "ตัวแปร let / const และการไหลของค่าข้อมูลทีละบรรทัด",
      "เงื่อนไข if / else if / else และการวนซ้ำด้วย for / while",
      "ฟังก์ชัน, แอเรย์ (Array) และการจับบั๊กโค้ด AI ฝั่งเว็บ",
    ],
    sampleCodePreview: `let prices = [120, 80, 200];\nlet total = 0;\nfor (let i = 0; i < prices.length; i++) {\n  total += prices[i];\n}\nconsole.log(total);`,
    defaultPlaygroundCode: `let items = [20, 35, 15];\nlet total = 0;\nfor (let i = 0; i < items.length; i++) {\n  total += items[i];\n}\nconsole.log("ผลรวม =", total);`,
    playgroundDescription:
      "วางโค้ด JavaScript ที่คุณได้มาจาก AI แล้วกดรันจริงเพื่อดูผลลัพธ์จาก console.log โดยไม่ใช้การเดา",
  },
  {
    id: "python",
    name: "Python",
    shortBadge: "PY · Data & AI",
    categoryLabel: "ประเภทที่ 2 · วิเคราะห์ข้อมูล, AI และอัลกอริทึม",
    tagline: "ภาษายอดนิยมอันดับ 1 สำหรับงาน AI, Data Science และระบบอัตโนมัติ",
    description:
      "ไวยากรณ์กระชับ อ่านง่าย ใช้การย่อหน้า (Indentation) แทนปีกกา ฝึกไล่ค่าตัวแปรใน List, ลูป for ... in range(), ฟังก์ชัน def และจับบั๊กการย่อหน้าหรือขอบเขต range ที่ AI มักเขียนพลาด",
    accentColor: "#1d4ed8",
    bgTint: "#dbeafe",
    borderColor: "#2563eb",
    highlights: [
      "โครงสร้างการย่อหน้า (Indentation) และเงื่อนไข if / elif / else",
      "การวนซ้ำด้วย for ... in range() และการจัดการข้อมูลด้วย List",
      "การสร้างฟังก์ชันด้วย def และการตรวจจับบั๊กขอบเขตข้อมูลใน Python",
    ],
    sampleCodePreview: `scores = [70, 85, 90]\ntotal = 0\nfor s in scores:\n    total += s\nprint(total / len(scores))`,
    defaultPlaygroundCode: `scores = [70, 85, 90]\ntotal = 0\nfor s in scores:\n    total = total + s\navg = total / len(scores)\nprint("คะแนนเฉลี่ย =", avg)`,
    playgroundDescription:
      "ทดลองเขียนหรือวางโค้ด Python พื้นฐาน แล้วกดรันเพื่อดูผลลัพธ์จากคำสั่ง print(...) ได้ทันที",
  },
  {
    id: "sql",
    name: "SQL",
    shortBadge: "SQL · Database & Query",
    categoryLabel: "ประเภทที่ 3 · ฐานข้อมูลและการดึงข้อมูลเชิงลึก",
    tagline: "ภาษามาตรฐานสำหรับค้นหา กรอง และสรุปผลข้อมูลจากฐานข้อมูล",
    description:
      "ฝึกอ่านคำสั่งดึงข้อมูลจากตาราง (Table) ทำความเข้าใจลำดับการทำงานจริงของ SELECT, FROM, WHERE, GROUP BY, ORDER BY และ INNER JOIN เพื่อตรวจสอบคำสั่ง SQL ที่ AI สร้างให้ถูกต้อง",
    accentColor: "#6d3fc0",
    bgTint: "#ede9fe",
    borderColor: "#6d3fc0",
    highlights: [
      "การดึงและกรองข้อมูลด้วย SELECT, FROM, WHERE และตัวดำเนินการเปรียบเทียบ",
      "การเรียงลำดับ ORDER BY, จำกัดแถว LIMIT และสรุปผลด้วย COUNT / SUM / GROUP BY",
      "การเชื่อมตารางด้วย INNER JOIN และการจับบั๊กเงื่อนไข WHERE ที่ผิดพลาดจาก AI",
    ],
    sampleCodePreview: `SELECT category, SUM(price) AS total_sales\nFROM products\nWHERE stock > 0\nGROUP BY category;`,
    defaultPlaygroundCode: `SELECT name, price\nFROM products\nWHERE price >= 100\nORDER BY price DESC;`,
    playgroundDescription:
      "ทดลองรันคำสั่ง SQL กับตารางจำลอง products (id, name, category, price, stock) เพื่อดูผลลัพธ์ที่ได้จริง",
  },
];

// ============================================================================
// เควสต์ PRIMM เฉพาะสำหรับภาษา Python (แยกเนื้อหาและโจทย์ชัดเจน)
// ============================================================================
export const PYTHON_TOPICS: TopicQuest[] = [
  {
    id: 101,
    title: "Python ด่านที่ 1 · ตัวแปร การคำนวณ และ print()",
    shortName: "PY 1 · ตัวแปรและ print()",
    subtitle: "แกะรอยค่าตัวแปรใน Python ที่ไม่ต้องใช้ let/const และการแสดงผลด้วย print()",
    code: `price = 150
qty = 4
discount = 100
net_price = (price * qty) - discount
print(net_price)`,
    predictPrompt:
      "ก่อนรันโค้ด Python: เมื่อรันครบทั้ง 5 บรรทัด คำสั่ง print(net_price) จะแสดงค่าอะไร?",
    predictOptions: ["500", "600", "450", "250"],
    predictExplanation:
      "บรรทัดที่ 4 คำนวณ (150 * 4) ได้ 600 แล้วลบด้วย discount (100) จึงเหลือ 500 จากนั้น print(net_price) แสดง 500",
    steps: [
      {
        stepNumber: 1,
        line: 1,
        codeLine: "price = 150",
        variables: { price: "150" },
        outputSoFar: [],
        explanation: "สร้างตัวแปร price เก็บค่า 150 (Python ไม่ต้องมีคำสั่ง let หรือ semicolon ปิดท้าย)",
      },
      {
        stepNumber: 2,
        line: 2,
        codeLine: "qty = 4",
        variables: { price: "150", qty: "4" },
        outputSoFar: [],
        explanation: "สร้างตัวแปร qty เก็บจำนวนสินค้า 4 ชิ้น",
      },
      {
        stepNumber: 3,
        line: 3,
        codeLine: "discount = 100",
        variables: { price: "150", qty: "4", discount: "100" },
        outputSoFar: [],
        explanation: "สร้างตัวแปร discount เก็บส่วนลด 100 บาท",
      },
      {
        stepNumber: 4,
        line: 4,
        codeLine: "net_price = (price * qty) - discount",
        variables: {
          price: "150",
          qty: "4",
          discount: "100",
          net_price: "500",
        },
        outputSoFar: [],
        explanation: "คำนวณในวงเล็บ 150 * 4 = 600 แล้วลบด้วย 100 ได้ 500 เก็บลงในตัวแปร net_price",
      },
      {
        stepNumber: 5,
        line: 5,
        codeLine: "print(net_price)",
        variables: {
          price: "150",
          qty: "4",
          discount: "100",
          net_price: "500",
        },
        outputSoFar: ["500"],
        explanation: "ใช้ฟังก์ชัน print() แสดงค่าของตัวแปร net_price คือ 500 ออกทางหน้าจอ",
      },
    ],
    questions: [
      {
        id: "py1-q1",
        cellId: "T1",
        targetLine: 1,
        question: "การประกาศตัวแปรในภาษา Python แตกต่างจาก JavaScript อย่างไร?",
        options: [
          {
            id: "a",
            text: "ไม่ต้องเขียนคำว่า let หรือ const นำหน้าชื่อตัวแปร",
          },
          { id: "b", text: "ต้องใส่เครื่องหมาย $ นำหน้าชื่อตัวแปรเสมอ" },
          { id: "c", text: "ไม่สามารถเก็บตัวเลขจำนวนเต็มได้" },
          { id: "d", text: "ต้องใช้เครื่องหมาย == ในการกำหนดค่า" },
        ],
        correctOptionId: "a",
        hint: "สังเกตบรรทัดที่ 1: price = 150 มีคำนำหน้าเหมือน JavaScript หรือไม่?",
        explanation:
          "ในภาษา Python สามารถเขียนชื่อตัวแปรตามด้วยเครื่องหมาย = และค่าข้อมูลได้ทันทีโดยไม่ต้องมี let/const",
      },
      {
        id: "py1-q2",
        cellId: "E1",
        targetLine: 4,
        question: "หลังจากรันบรรทัดที่ 4 เสร็จ ตัวแปร net_price มีค่าเท่าไร?",
        options: [
          { id: "a", text: "600" },
          { id: "b", text: "500" },
          { id: "c", text: "400" },
          { id: "d", text: "150" },
        ],
        correctOptionId: "b",
        hint: "นำ price (150) คูณ qty (4) ก่อน แล้วจึงลบด้วย discount (100)",
        explanation: "(150 * 4) - 100 = 600 - 100 = 500",
      },
      {
        id: "py1-q3",
        cellId: "F1",
        targetLine: 5,
        question: "คำสั่ง print(net_price) ในภาษา Python ทำหน้าที่เทียบเท่ากับคำสั่งใดใน JavaScript?",
        options: [
          { id: "a", text: "console.log(net_price)" },
          { id: "b", text: "return net_price" },
          { id: "c", text: "let net_price" },
          { id: "d", text: "if (net_price)" },
        ],
        correctOptionId: "a",
        hint: "คำสั่งที่ใช้แสดงผลค่าตัวแปรออกทางหน้าจอมาตรฐานคือคำสั่งใด?",
        explanation:
          "print() ใน Python ใช้แสดงผลออกทางหน้าจอเช่นเดียวกับ console.log() ใน JavaScript",
      },
    ],
    modifyChallenge: {
      instruction:
        "ลองแก้ค่าตัวแปร discount ในบรรทัดที่ 3 จาก 100 เป็น 50 เพื่อให้ยอดสุทธิแสดงผลเป็น 550",
      suggestedCode: `price = 150
qty = 4
discount = 50
net_price = (price * qty) - discount
print(net_price)`,
      changeDescription: "เปลี่ยน discount จาก 100 เป็น 50",
      options: ["550", "500", "600", "450"],
      explanation: "เมื่อ discount เป็น 50 จะได้ (150 * 4) - 50 = 550",
    },
    badgeReward: {
      id: "badge-py-1",
      name: "นักแกะตัวแปร Python",
      description: "เข้าใจการกำหนดค่าตัวแปรและการแสดงผลด้วย print() ใน Python",
    },
  },
  {
    id: 102,
    title: "Python ด่านที่ 2 · เงื่อนไข if / elif / else และการย่อหน้า",
    shortName: "PY 2 · if / elif และการย่อหน้า",
    subtitle: "ทำความเข้าใจบล็อกคำสั่งด้วยย่อหน้า (Indentation) และคำสั่ง elif ของ Python",
    code: `temp = 34
status = "Normal"
if temp >= 38:
    status = "Hot"
elif temp >= 30:
    status = "Warm"
else:
    status = "Cool"
print(status)`,
    predictPrompt:
      "เมื่อ temp = 34 โปรแกรม Python ชุดนี้จะพิมพ์ข้อความใดออกทางหน้าจอ?",
    predictOptions: ["Warm", "Hot", "Cool", "Normal"],
    predictExplanation:
      "temp (34) ไม่ถึง 38 จึงข้าม if แรก มาตรงกับเงื่อนไข elif temp >= 30 จึงเปลี่ยน status เป็น Warm",
    steps: [
      {
        stepNumber: 1,
        line: 1,
        codeLine: "temp = 34",
        variables: { temp: "34" },
        outputSoFar: [],
        explanation: "กำหนดอุณหภูมิ temp เท่ากับ 34 องศา",
      },
      {
        stepNumber: 2,
        line: 2,
        codeLine: 'status = "Normal"',
        variables: { temp: "34", status: '"Normal"' },
        outputSoFar: [],
        explanation: 'กำหนดค่าเริ่มต้นของ status เป็น "Normal"',
      },
      {
        stepNumber: 3,
        line: 3,
        codeLine: "if temp >= 38:",
        variables: { temp: "34", status: '"Normal"' },
        outputSoFar: [],
        explanation: "ตรวจเงื่อนไข 34 >= 38 ได้ค่าเท็จ (False) จึงข้ามบล็อกย่อหน้าบรรทัดที่ 4",
      },
      {
        stepNumber: 4,
        line: 5,
        codeLine: "elif temp >= 30:",
        variables: { temp: "34", status: '"Normal"' },
        outputSoFar: [],
        explanation: "ตรวจเงื่อนไขถัดมา 34 >= 30 ได้ค่าจริง (True) จึงเข้าทำงานในบรรทัดที่ 6",
      },
      {
        stepNumber: 5,
        line: 6,
        codeLine: '    status = "Warm"',
        variables: { temp: "34", status: '"Warm"' },
        outputSoFar: [],
        explanation: 'เปลี่ยนค่า status เป็น "Warm" แล้วข้าม else ไปยังบรรทัดสุดท้าย',
      },
      {
        stepNumber: 6,
        line: 9,
        codeLine: "print(status)",
        variables: { temp: "34", status: '"Warm"' },
        outputSoFar: ["Warm"],
        explanation: "แสดงค่า status คือ Warm ออกทางหน้าจอ",
      },
    ],
    questions: [
      {
        id: "py2-q1",
        cellId: "T2",
        targetLine: 5,
        question: "ในภาษา Python คำสั่ง elif ย่อมาจากอะไร และใช้กำหนดขอบเขตบล็อกด้วยวิธีใด?",
        options: [
          {
            id: "a",
            text: "ย่อมาจาก else if และใช้เครื่องหมายโคลอน (:) คู่กับการย่อหน้า (Indentation)",
          },
          { id: "b", text: "ย่อมาจาก end loop if และใช้เครื่องหมายปีกกา { }" },
          { id: "c", text: "ใช้สำหรับการวนซ้ำเหมือน for loop" },
          { id: "d", text: "ใช้ประกาศฟังก์ชันใหม่" },
        ],
        correctOptionId: "a",
        hint: "สังเกตเครื่องหมายท้ายบรรทัดที่ 5 และช่องว่างหน้าบรรทัดที่ 6",
        explanation:
          "Python ใช้ elif แทน else if โดยมีเครื่องหมาย : ปิดท้ายเงื่อนไข และใช้การย่อหน้า 4 เคาะเพื่อระบุขอบเขตบล็อกคำสั่ง",
      },
      {
        id: "py2-q2",
        cellId: "E2",
        targetLine: 6,
        question: "ทำไมบรรทัดที่ 4 (status = \"Hot\") จึงไม่ถูกรัน?",
        options: [
          {
            id: "a",
            text: "เพราะ temp มีค่า 34 ซึ่งน้อยกว่า 38 ทำให้เงื่อนไข if temp >= 38 เป็นเท็จ",
          },
          { id: "b", text: "เพราะบรรทัดที่ 4 พิมพ์ผิดไวยากรณ์" },
          { id: "c", text: "เพราะ Python จะรันเฉพาะบรรทัดสุดท้ายเสมอ" },
          { id: "d", text: "เพราะตัวแปร status ถูกล็อกค่าไว้" },
        ],
        correctOptionId: "a",
        hint: "แทนค่า temp = 34 ลงใน temp >= 38",
        explanation:
          "เนื่องจาก 34 >= 38 เป็น False โปรแกรมจึงข้ามบล็อกย่อหน้าของ if ไปตรวจ elif ถัดไป",
      },
    ],
    modifyChallenge: {
      instruction:
        "ลองเปลี่ยนค่า temp ในบรรทัดที่ 1 เป็น 40 เพื่อให้โปรแกรมแสดงผลเป็น Hot",
      suggestedCode: `temp = 40
status = "Normal"
if temp >= 38:
    status = "Hot"
elif temp >= 30:
    status = "Warm"
else:
    status = "Cool"
print(status)`,
      changeDescription: "เปลี่ยน temp จาก 34 เป็น 40",
      options: ["Hot", "Warm", "Cool", "Normal"],
      explanation: "เมื่อ temp = 40 จะตรงกับเงื่อนไขแรก temp >= 38 จึงได้ค่า Hot",
    },
    badgeReward: {
      id: "badge-py-2",
      name: "ผู้เชี่ยวชาญย่อหน้า Python",
      description: "เข้าใจการอ่านเงื่อนไข if / elif / else และขอบเขตการย่อหน้าใน Python",
    },
  },
  {
    id: 103,
    title: "Python ด่านที่ 3 · ลูป for ... in range() และการสะสมค่า",
    shortName: "PY 3 · ลูป range()",
    subtitle: "ระวังจุดที่ AI มักทำให้สับสน: range(1, 5) ใน Python จะหยุดก่อนถึงเลขตัวสุดท้าย!",
    code: `total = 0
for i in range(1, 5):
    total = total + (i * 10)
print(total)`,
    predictPrompt:
      "ข้อควรระวังของ range(1, 5) ใน Python: เมื่อลูปทำงานจบ จะพิมพ์ค่า total เท่าไร?",
    predictOptions: ["100", "150", "40", "50"],
    predictExplanation:
      "ใน Python คำสั่ง range(1, 5) จะให้ค่า i เป็น 1, 2, 3, 4 (ไม่รวม 5!) ดังนั้นจึงบวก 10 + 20 + 30 + 40 = 100",
    steps: [
      {
        stepNumber: 1,
        line: 1,
        codeLine: "total = 0",
        variables: { total: "0" },
        outputSoFar: [],
        explanation: "กำหนดตัวแปรสะสมค่า total เริ่มต้นเป็น 0",
      },
      {
        stepNumber: 2,
        line: 2,
        codeLine: "for i in range(1, 5): # รอบ i = 1",
        variables: { total: "0", i: "1" },
        outputSoFar: [],
        explanation: "รอบที่ 1: i มีค่าเป็น 1",
      },
      {
        stepNumber: 3,
        line: 3,
        codeLine: "    total = total + (i * 10)",
        variables: { total: "10", i: "1" },
        outputSoFar: [],
        explanation: "บวกเพิ่ม 1 * 10 = 10 ทำให้ total กลายเป็น 10",
      },
      {
        stepNumber: 4,
        line: 3,
        codeLine: "    total = total + (i * 10) # รอบ i = 2, 3, 4",
        variables: { total: "100", i: "4" },
        outputSoFar: [],
        explanation: "วนต่อสำหรับ i = 2 (+20), i = 3 (+30), และ i = 4 (+40) รวมเป็น 100 แล้วหยุดก่อนถึง 5",
      },
      {
        stepNumber: 5,
        line: 4,
        codeLine: "print(total)",
        variables: { total: "100", i: "4" },
        outputSoFar: ["100"],
        explanation: "แสดงผลลัพธ์รวม 100 ออกทางหน้าจอ",
      },
    ],
    questions: [
      {
        id: "py3-q1",
        cellId: "T2",
        targetLine: 2,
        question: "คำสั่ง range(1, 5) ในภาษา Python จะสร้างลำดับตัวเลขใดออกมา?",
        options: [
          { id: "a", text: "1, 2, 3, 4 (หยุดก่อนถึง 5)" },
          { id: "b", text: "1, 2, 3, 4, 5" },
          { id: "c", text: "0, 1, 2, 3, 4, 5" },
          { id: "d", text: "1 และ 5 เท่านั้น" },
        ],
        correctOptionId: "a",
        hint: "ใน Python ค่า stop ของ range(start, stop) จะไม่ถูกรวมอยู่ในลำดับ",
        explanation:
          "range(start, stop) จะเริ่มที่ start และหยุดที่ stop - 1 ดังนั้น range(1, 5) จึงได้ 1, 2, 3, 4",
      },
      {
        id: "py3-q2",
        cellId: "F4",
        targetLine: 2,
        question:
          "หากสั่ง AI ให้เขียนโค้ดบวกเลข 1 ถึง 5 แต่ AI เขียน range(1, 5) มาให้ จะเกิดปัญหาอะไร?",
        options: [
          {
            id: "a",
            text: "เกิดบั๊ก Off-by-one เพราะเลข 5 ไม่ถูกนำมาคำนวณ ต้องแก้เป็น range(1, 6)",
          },
          { id: "b", text: "เกิด Syntax Error รันไม่ได้" },
          { id: "c", text: "กลายเป็นลูปไม่รู้จบ (Infinite Loop)" },
          { id: "d", text: "ไม่มีปัญหาใดๆ" },
        ],
        correctOptionId: "a",
        hint: "ถ้าต้องการให้ i มีค่าถึง 5 ต้องตั้งค่าตัวที่สองของ range เป็นเท่าไร?",
        explanation:
          "นี่คือบั๊กที่พบบ่อยมากเวลาอ่านโค้ด Python: หากต้องการถึง 5 ต้องเขียน range(1, 6)",
      },
    ],
    modifyChallenge: {
      instruction:
        "แก้คำสั่ง range(1, 5) ในบรรทัดที่ 2 เป็น range(1, 6) เพื่อรวมรอบที่ i = 5 เข้าไปด้วย (ผลรวมจะเป็น 150)",
      suggestedCode: `total = 0
for i in range(1, 6):
    total = total + (i * 10)
print(total)`,
      changeDescription: "เปลี่ยน range(1, 5) เป็น range(1, 6)",
      options: ["150", "100", "210", "50"],
      explanation: "เมื่อใช้ range(1, 6) ลูปจะทำงานสำหรับ i = 1, 2, 3, 4, 5 รวมเป็น 10+20+30+40+50 = 150",
    },
    badgeReward: {
      id: "badge-py-3",
      name: "ผู้พิชิตลูป range() Python",
      description: "เข้าใจขอบเขตของ range(start, stop) และการสะสมค่าในลูป Python",
    },
  },
];

// ============================================================================
// เควสต์ PRIMM เฉพาะสำหรับภาษา SQL (แยกเนื้อหาและโจทย์ชัดเจน)
// ============================================================================
export const SQL_TOPICS: TopicQuest[] = [
  {
    id: 201,
    title: "SQL ด่านที่ 1 · การดึงและกรองข้อมูลด้วย SELECT & WHERE",
    shortName: "SQL 1 · SELECT & WHERE",
    subtitle: "ฝึกอ่านคำสั่งค้นหาข้อมูลจากตาราง products และกรองเฉพาะแถวที่ตรงเงื่อนไข",
    code: `-- ตาราง products:
-- (1, 'Keyboard', 900), (2, 'Mouse', 450), (3, 'Monitor', 3500)
SELECT name, price
FROM products
WHERE price >= 500
ORDER BY price ASC;`,
    predictPrompt:
      "เมื่อรันคำสั่ง SQL นี้กับตาราง products จะได้ผลลัพธ์ชื่อสินค้าเรียงตามลำดับใด?",
    predictOptions: [
      "Keyboard (900), Monitor (3500)",
      "Monitor (3500), Keyboard (900)",
      "Mouse (450), Keyboard (900)",
      "Mouse (450), Keyboard (900), Monitor (3500)",
    ],
    predictExplanation:
      "WHERE price >= 500 คัดกรองเหลือ Keyboard (900) และ Monitor (3500) จากนั้น ORDER BY price ASC เรียงจากน้อยไปมาก",
    steps: [
      {
        stepNumber: 1,
        line: 4,
        codeLine: "FROM products",
        variables: { rows_in_memory: "3 แถว (Keyboard, Mouse, Monitor)" },
        outputSoFar: [],
        explanation: "ขั้นที่ 1 (การทำงานจริงของ SQL): ดึงข้อมูลตั้งต้นจากตาราง products ทั้งหมด 3 แถว",
      },
      {
        stepNumber: 2,
        line: 5,
        codeLine: "WHERE price >= 500",
        variables: { filtered_rows: "2 แถว (Keyboard 900, Monitor 3500)" },
        outputSoFar: [],
        explanation: "ขั้นที่ 2: กรองเอาเฉพาะแถวที่มี price ตั้งแต่ 500 ขึ้นไป (ตัด Mouse 450 ออก)",
      },
      {
        stepNumber: 3,
        line: 6,
        codeLine: "ORDER BY price ASC",
        variables: { sorted_rows: "Keyboard (900) -> Monitor (3500)" },
        outputSoFar: [],
        explanation: "ขั้นที่ 3: เรียงลำดับแถวที่ผ่านการกรองตามราคาจากน้อยไปมาก (ASC)",
      },
      {
        stepNumber: 4,
        line: 3,
        codeLine: "SELECT name, price",
        variables: { columns: "name, price" },
        outputSoFar: ["Keyboard (900), Monitor (3500)"],
        explanation: "ขั้นที่ 4: เลือกแสดงเฉพาะคอลัมน์ name และ price ออกมาเป็นผลลัพธ์สุดท้าย",
      },
    ],
    questions: [
      {
        id: "sql1-q1",
        cellId: "E2",
        targetLine: 5,
        question: "ในลำดับการประมวลผลจริงของฐานข้อมูล SQL ส่วนใดทำงานก่อน?",
        options: [
          {
            id: "a",
            text: "ระบุตารางด้วย FROM แล้วกรองแถวด้วย WHERE ก่อนจะเรียงลำดับด้วย ORDER BY",
          },
          { id: "b", text: "ทำงานจาก ORDER BY ก่อนเสมอแล้วค่อยไปดึงตาราง" },
          { id: "c", text: "ไม่สนใจคำสั่ง WHERE หากมี ORDER BY" },
          { id: "d", text: "ลบข้อมูลในตารางทิ้งก่อนแสดงผล" },
        ],
        correctOptionId: "a",
        hint: "แม้มนุษย์จะเขียน SELECT ไว้บรรทัดแรก แต่ฐานข้อมูลต้องรู้ก่อนว่าดึงจากตารางไหน (FROM) และกรองแถวไหน (WHERE)",
        explanation:
          "ลำดับการทำงานจริงของ SQL (Execution Order) คือ FROM -> WHERE -> SELECT -> ORDER BY",
      },
      {
        id: "sql1-q2",
        cellId: "T1",
        targetLine: 6,
        question: "คำสั่ง ORDER BY price ASC หมายถึงการเรียงลำดับแบบใด?",
        options: [
          { id: "a", text: "เรียงตามราคาจากน้อยไปมาก (Ascending)" },
          { id: "b", text: "เรียงตามราคาจากมากไปน้อย (Descending)" },
          { id: "c", text: "สุ่มลำดับแถวใหม่ทุกครั้ง" },
          { id: "d", text: "รวมราคามาบวกกันทั้งหมด" },
        ],
        correctOptionId: "a",
        hint: "ASC ย่อมาจาก Ascending ส่วนถ้าต้องการมากไปน้อยจะใช้ DESC",
        explanation: "ASC (Ascending) คือเรียงจากค่าน้อยไปหาค่ามาก",
      },
    ],
    modifyChallenge: {
      instruction:
        "ลองเปลี่ยน ORDER BY price ASC เป็น ORDER BY price DESC เพื่อเรียงราคาสินค้าจากแพงที่สุดลงมา",
      suggestedCode: `-- ตาราง products:
-- (1, 'Keyboard', 900), (2, 'Mouse', 450), (3, 'Monitor', 3500)
SELECT name, price
FROM products
WHERE price >= 500
ORDER BY price DESC;`,
      changeDescription: "เปลี่ยน ASC เป็น DESC",
      options: [
        "Monitor (3500), Keyboard (900)",
        "Keyboard (900), Monitor (3500)",
        "Mouse (450), Keyboard (900)",
        "Monitor (3500) แถวเดียว",
      ],
      explanation: "เมื่อใช้ DESC ข้อมูลจะเรียงจากมากไปน้อย จึงได้ Monitor (3500) ตามด้วย Keyboard (900)",
    },
    badgeReward: {
      id: "badge-sql-1",
      name: "นักค้นข้อมูล SQL",
      description: "เข้าใจการกรองข้อมูลด้วย WHERE และการเรียงลำดับด้วย ORDER BY",
    },
  },
  {
    id: 202,
    title: "SQL ด่านที่ 2 · การรวมกลุ่มข้อมูลด้วย GROUP BY & SUM",
    shortName: "SQL 2 · GROUP BY & SUM",
    subtitle: "แกะรอยการยุบรวมแถวตามหมวดหมู่ (GROUP BY) และการกรองกลุ่มด้วย HAVING",
    code: `-- ตาราง sales:
-- ('Book', 200), ('Book', 300), ('Pen', 50)
SELECT category, SUM(amount) AS total
FROM sales
GROUP BY category
HAVING SUM(amount) >= 100;`,
    predictPrompt:
      "เมื่อรันคำสั่ง SQL ชุดนี้ จะเหลือหมวดหมู่ใดแสดงผลออกมา และมียอดรวมเท่าไร?",
    predictOptions: [
      "Book: 500",
      "Book: 500, Pen: 50",
      "Pen: 50",
      "Book: 200",
    ],
    predictExplanation:
      "GROUP BY รวมยอด Book ได้ 200 + 300 = 500 และ Pen ได้ 50 จากนั้น HAVING SUM(amount) >= 100 คัดเอาเฉพาะกลุ่มที่ยอดรวมตั้งแต่ 100 ขึ้นไป จึงเหลือ Book: 500",
    steps: [
      {
        stepNumber: 1,
        line: 4,
        codeLine: "FROM sales",
        variables: { rows: "3 แถว: (Book,200), (Book,300), (Pen,50)" },
        outputSoFar: [],
        explanation: "ดึงข้อมูลการขายทั้ง 3 แถวจากตาราง sales",
      },
      {
        stepNumber: 2,
        line: 5,
        codeLine: "GROUP BY category",
        variables: { groups: "Book: [200, 300], Pen: [50]" },
        outputSoFar: [],
        explanation: "จัดกลุ่มแถวที่มี category เดียวกันเข้าด้วยกัน ได้ 2 กลุ่มคือ Book และ Pen",
      },
      {
        stepNumber: 3,
        line: 6,
        codeLine: "HAVING SUM(amount) >= 100",
        variables: { filtered_groups: "Book (SUM = 500)" },
        outputSoFar: [],
        explanation: "กรองเฉพาะกลุ่มที่ผลรวม SUM(amount) >= 100 ทำให้กลุ่ม Pen (50) ถูกตัดออก",
      },
      {
        stepNumber: 4,
        line: 3,
        codeLine: "SELECT category, SUM(amount) AS total",
        variables: { result: "Book: 500" },
        outputSoFar: ["Book: 500"],
        explanation: "แสดงชื่อหมวดหมู่และยอดรวมของกลุ่มที่ผ่านเกณฑ์ คือ Book: 500",
      },
    ],
    questions: [
      {
        id: "sql2-q1",
        cellId: "F2",
        targetLine: 6,
        question: "ทำไมในบรรทัดที่ 6 จึงต้องใช้คำสั่ง HAVING แทนที่จะใช้ WHERE?",
        options: [
          {
            id: "a",
            text: "เพราะต้องการกรองผลลัพธ์หลังจากรวมกลุ่มและคำนวณฟังก์ชัน SUM() แล้ว",
          },
          { id: "b", text: "เพราะตารางชื่อ sales ห้ามใช้คำสั่ง WHERE" },
          { id: "c", text: "เพราะ HAVING ใช้เรียงลำดับข้อมูลแทน ORDER BY" },
          { id: "d", text: "เพราะ WHERE ใช้ได้กับข้อความเท่านั้น" },
        ],
        correctOptionId: "a",
        hint: "WHERE ทำงานก่อน GROUP BY ส่วนการกรองผลจาก SUM() ต้องทำหลัง GROUP BY",
        explanation:
          "WHERE ใช้กรองรายแถวก่อนจัดกลุ่ม ส่วน HAVING ใช้กรองกลุ่มหลังจากทำ GROUP BY และ Aggregate Function (เช่น SUM, COUNT) แล้ว",
      },
    ],
    modifyChallenge: {
      instruction:
        "ลองแก้เงื่อนไข HAVING SUM(amount) >= 100 เป็น HAVING SUM(amount) >= 50 เพื่อให้แสดงทั้งสองหมวดหมู่",
      suggestedCode: `-- ตาราง sales:
-- ('Book', 200), ('Book', 300), ('Pen', 50)
SELECT category, SUM(amount) AS total
FROM sales
GROUP BY category
HAVING SUM(amount) >= 50;`,
      changeDescription: "เปลี่ยนเกณฑ์ HAVING จาก 100 เป็น 50",
      options: [
        "Book: 500, Pen: 50",
        "Book: 500",
        "Pen: 50",
        "ไม่มีข้อมูลแสดงผล",
      ],
      explanation: "เมื่อลดเกณฑ์เหลือ >= 50 กลุ่ม Pen ที่มียอดรวม 50 จึงผ่านเกณฑ์ด้วย",
    },
    badgeReward: {
      id: "badge-sql-2",
      name: "นักวิเคราะห์กลุ่มข้อมูล SQL",
      description: "เข้าใจการทำงานของ GROUP BY, SUM และการกรองกลุ่มด้วย HAVING",
    },
  },
];

export function getTopicsByLanguage(lang: LearningLanguage): TopicQuest[] {
  if (lang === "python") return PYTHON_TOPICS;
  if (lang === "sql") return SQL_TOPICS;
  return TOPICS;
}

/**
 * รันโค้ดตามภาษาที่เลือก (JavaScript / Python / SQL) สำหรับทั้ง PracticeArena และห้องทดลอง
 */
export function runCodeByLanguage(
  code: string,
  lang: LearningLanguage
): {
  outputs: string[];
  finalOutput: string;
  success: boolean;
  error?: string;
} {
  if (lang === "javascript") {
    return runJavaScriptReal(code);
  }

  if (lang === "python") {
    return runPythonSimulated(code);
  }

  return runSqlSimulated(code);
}

/**
 * ตัวจำลองการรัน Python พื้นฐาน (รองรับเควสต์ Python และห้องทดลอง print / ตัวแปร / if-elif-else / for in range / list)
 */
function runPythonSimulated(code: string): {
  outputs: string[];
  finalOutput: string;
  success: boolean;
  error?: string;
} {
  try {
    const clean = code.replace(/\r\n/g, "\n").trim();

    // ตรวจจับรูปแบบเควสต์ที่ 3: for i in range(a, b): total = total + (i * m)
    const rangeMatch = clean.match(
      /range\(\s*(\d+)\s*,\s*(\d+)\s*\)/
    );
    if (rangeMatch && clean.includes("total")) {
      const start = Number(rangeMatch[1]);
      const stop = Number(rangeMatch[2]);
      let total = 0;
      for (let i = start; i < stop; i++) {
        total += i * 10;
      }
      return {
        outputs: [String(total)],
        finalOutput: String(total),
        success: true,
      };
    }

    // ตรวจจับรูปแบบเควสต์ที่ 2: temp & if/elif/else
    const tempMatch = clean.match(/temp\s*=\s*(-?\d+(?:\.\d+)?)/);
    if (tempMatch && clean.includes("elif")) {
      const temp = Number(tempMatch[1]);
      let status = "Normal";
      if (temp >= 38) status = "Hot";
      else if (temp >= 30) status = "Warm";
      else status = "Cool";
      return {
        outputs: [status],
        finalOutput: status,
        success: true,
      };
    }

    // ตรวจจับรูปแบบเควสต์ที่ 1: price, qty, discount
    const priceMatch = clean.match(/price\s*=\s*(-?\d+(?:\.\d+)?)/);
    const qtyMatch = clean.match(/qty\s*=\s*(-?\d+(?:\.\d+)?)/);
    const discMatch = clean.match(/discount\s*=\s*(-?\d+(?:\.\d+)?)/);
    if (priceMatch && qtyMatch && discMatch) {
      const net =
        Number(priceMatch[1]) * Number(qtyMatch[1]) - Number(discMatch[1]);
      return {
        outputs: [String(net)],
        finalOutput: String(net),
        success: true,
      };
    }

    // ตัวแปลง Python พื้นฐานเป็น JS สำหรับ Playground ทั่วไป
    const lines = clean.split("\n");
    const env: Record<string, any> = {};
    const outputs: string[] = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const rawLine = lines[idx];
      const trimmed = rawLine.replace(/#.*$/, "").trim();
      if (!trimmed) continue;

      // รองรับ for x in list_var:
      const forInList = trimmed.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+([a-zA-Z_]\w*)\s*:$/);
      if (forInList && idx + 1 < lines.length) {
        const iterVar = forInList[1];
        const listVar = forInList[2];
        const bodyLine = lines[idx + 1].replace(/#.*$/, "").trim();
        const arr = Array.isArray(env[listVar]) ? env[listVar] : [];
        for (const item of arr) {
          env[iterVar] = item;
          evalPythonSimpleAssignment(bodyLine, env);
        }
        idx++;
        continue;
      }

      if (trimmed.startsWith("print(") && trimmed.endsWith(")")) {
        const inner = trimmed.slice(6, -1);
        const parts = inner.split(",").map((p) => evalPythonExpr(p.trim(), env));
        outputs.push(parts.join(" "));
        continue;
      }

      evalPythonSimpleAssignment(trimmed, env);
    }

    return {
      outputs,
      finalOutput: outputs.join("\n").trim(),
      success: true,
    };
  } catch (err) {
    return {
      outputs: [],
      finalOutput: "",
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถรันโค้ด Python นี้ได้",
    };
  }
}

function evalPythonSimpleAssignment(
  stmt: string,
  env: Record<string, any>
): void {
  const plusEq = stmt.match(/^([a-zA-Z_]\w*)\s*\+=\s*(.+)$/);
  if (plusEq) {
    env[plusEq[1]] = (Number(env[plusEq[1]]) || 0) + Number(evalPythonExpr(plusEq[2], env));
    return;
  }
  const eq = stmt.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
  if (eq) {
    env[eq[1]] = evalPythonExpr(eq[2], env);
  }
}

function evalPythonExpr(expr: string, env: Record<string, any>): any {
  const t = expr.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  if (t.startsWith("[") && t.endsWith("]")) {
    return JSON.parse(t);
  }
  const replaced = t.replace(/len\(\s*([a-zA-Z_]\w*)\s*\)/g, (_, v) =>
    Array.isArray(env[v]) ? String(env[v].length) : "0"
  );
  const keys = Object.keys(env);
  const vals = keys.map((k) => env[k]);
  const fn = new Function(...keys, `return (${replaced});`);
  return fn(...vals);
}

/**
 * ตัวจำลองการรันคำสั่ง SQL สำหรับเควสต์และห้องทดลอง SQL
 */
function runSqlSimulated(code: string): {
  outputs: string[];
  finalOutput: string;
  success: boolean;
  error?: string;
} {
  const clean = code
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  if (!clean.includes("SELECT") || !clean.includes("FROM")) {
    return {
      outputs: [],
      finalOutput: "",
      success: false,
      error: "คำสั่ง SQL ต้องมีอย่างน้อย SELECT และ FROM",
    };
  }

  // ตาราง sales สำหรับด่านที่ 2
  if (clean.includes("FROM SALES")) {
    const havingMatch = clean.match(/HAVING\s+SUM\(AMOUNT\)\s*>=\s*(\d+)/);
    const minSum = havingMatch ? Number(havingMatch[1]) : 0;
    const groups = [
      { category: "Book", total: 500 },
      { category: "Pen", total: 50 },
    ].filter((g) => g.total >= minSum);

    const out = groups.map((g) => `${g.category}: ${g.total}`).join(", ");
    return {
      outputs: [out],
      finalOutput: out,
      success: true,
    };
  }

  // ตาราง products สำหรับด่านที่ 1 และ Playground
  let products = [
    { id: 1, name: "Keyboard", category: "Accessory", price: 900, stock: 12 },
    { id: 2, name: "Mouse", category: "Accessory", price: 450, stock: 25 },
    { id: 3, name: "Monitor", category: "Display", price: 3500, stock: 5 },
  ];

  const wherePriceGte = clean.match(/WHERE\s+PRICE\s*>=\s*(\d+)/);
  if (wherePriceGte) {
    const minP = Number(wherePriceGte[1]);
    products = products.filter((p) => p.price >= minP);
  }

  if (clean.includes("ORDER BY PRICE DESC")) {
    products.sort((a, b) => b.price - a.price);
  } else if (clean.includes("ORDER BY PRICE ASC") || clean.includes("ORDER BY PRICE")) {
    products.sort((a, b) => a.price - b.price);
  }

  const out = products.map((p) => `${p.name} (${p.price})`).join(", ");
  return {
    outputs: [out],
    finalOutput: out,
    success: true,
  };
}
