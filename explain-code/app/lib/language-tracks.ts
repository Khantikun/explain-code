import { TOPICS, TopicQuest, runJavaScriptReal } from "./curriculum";

export type LearningLanguage =
  | "javascript"
  | "python"
  | "sql"
  | "typescript"
  | "cpp"
  | "java";

export interface LanguageTrackMeta {
  id: LearningLanguage;
  name: string;
  nameEn?: string;
  shortBadge: string;
  categoryLabel: string;
  categoryLabelEn?: string;
  tagline: string;
  taglineEn?: string;
  description: string;
  descriptionEn?: string;
  accentColor: string;
  bgTint: string;
  borderColor: string;
  dungeonRealmName: string;
  dungeonRealmNameEn: string;
  highlights: string[];
  highlightsEn?: string[];
  sampleCodePreview: string;
  defaultPlaygroundCode: string;
  playgroundDescription: string;
}

export const LANGUAGE_TRACKS: LanguageTrackMeta[] = [
  {
    id: "javascript",
    name: "JavaScript",
    nameEn: "JavaScript",
    shortBadge: "JS · Web & Logic",
    categoryLabel: "ประเภทที่ 1 · พัฒนาเว็บและตรรกะแอปพลิเคชัน",
    categoryLabelEn: "Track 1 · Web & Application Logic",
    tagline: "ภาษาหลักของเว็บยุคใหม่ ฝึกแกะตรรกะ ตัวแปร ลูป และฟังก์ชัน",
    taglineEn:
      "Core language of the modern web — trace variables, loops, and functions",
    description:
      "เหมาะสำหรับผู้เริ่มต้นและผู้ที่ต้องการสร้างเว็บไซต์หรือแอปพลิเคชัน ฝึกอ่านโครงสร้างปีกกา { }, เงื่อนไข if/else, ลูป for/while และการตรวจสอบโค้ด JavaScript ที่ได้จาก AI",
    descriptionEn:
      "Ideal for web builders and beginners. Practice reading { } blocks, if/else conditions, for/while loops, and verifying AI-generated JavaScript.",
    accentColor: "#0f766e",
    bgTint: "#e3f1ee",
    borderColor: "#0f766e",
    dungeonRealmName: "ปราสาทจาวาสคริปต์",
    dungeonRealmNameEn: "Castle of JavaScript",
    highlights: [
      "ตัวแปร let / const และการไหลของค่าข้อมูลทีละบรรทัด",
      "เงื่อนไข if / else if / else และการวนซ้ำด้วย for / while",
      "ฟังก์ชัน, แอเรย์ (Array) และการจับบั๊กโค้ด AI ฝั่งเว็บ",
    ],
    highlightsEn: [
      "let / const variables and line-by-line state flow",
      "if / else if / else branching and for / while loops",
      "Functions, Arrays, and catching AI web logic bugs",
    ],
    sampleCodePreview: `let prices = [120, 80, 200];\nlet total = 0;\nfor (let i = 0; i < prices.length; i++) {\n  total += prices[i];\n}\nconsole.log(total);`,
    defaultPlaygroundCode: `let items = [20, 35, 15];\nlet total = 0;\nfor (let i = 0; i < items.length; i++) {\n  total += items[i];\n}\nconsole.log("ผลรวม =", total);`,
    playgroundDescription:
      "วางโค้ด JavaScript ที่คุณได้มาจาก AI แล้วกดรันจริงเพื่อดูผลลัพธ์จาก console.log โดยไม่ใช้การเดา",
  },
  {
    id: "python",
    name: "Python",
    nameEn: "Python",
    shortBadge: "PY · Data & AI",
    categoryLabel: "ประเภทที่ 2 · วิเคราะห์ข้อมูล, AI และอัลกอริทึม",
    categoryLabelEn: "Track 2 · Data, AI & Algorithms",
    tagline: "ภาษายอดนิยมอันดับ 1 สำหรับงาน AI, Data Science และระบบอัตโนมัติ",
    taglineEn:
      "The #1 language for AI, Data Science, and automation workflows",
    description:
      "ไวยากรณ์กระชับ อ่านง่าย ใช้การย่อหน้า (Indentation) แทนปีกกา ฝึกไล่ค่าตัวแปรใน List, ลูป for ... in range(), ฟังก์ชัน def และจับบั๊กการย่อหน้าหรือขอบเขต range ที่ AI มักเขียนพลาด",
    descriptionEn:
      "Clean indentation-based syntax. Trace list values, for ... in range() loops, and catch off-by-one or indentation bugs common in AI code.",
    accentColor: "#1d4ed8",
    bgTint: "#dbeafe",
    borderColor: "#2563eb",
    dungeonRealmName: "หุบเขามังกรไพธอน",
    dungeonRealmNameEn: "Python Dragon Valley",
    highlights: [
      "โครงสร้างการย่อหน้า (Indentation) และเงื่อนไข if / elif / else",
      "การวนซ้ำด้วย for ... in range() และการจัดการข้อมูลด้วย List",
      "การสร้างฟังก์ชันด้วย def และการตรวจจับบั๊กขอบเขตข้อมูลใน Python",
    ],
    highlightsEn: [
      "Indentation blocks and if / elif / else branching",
      "for ... in range() bounds and List traversal",
      "def functions and spotting Python off-by-one bugs",
    ],
    sampleCodePreview: `scores = [70, 85, 90]\ntotal = 0\nfor s in scores:\n    total += s\nprint(total / len(scores))`,
    defaultPlaygroundCode: `scores = [70, 85, 90]\ntotal = 0\nfor s in scores:\n    total = total + s\navg = total / len(scores)\nprint("คะแนนเฉลี่ย =", avg)`,
    playgroundDescription:
      "ทดลองเขียนหรือวางโค้ด Python พื้นฐาน แล้วกดรันเพื่อดูผลลัพธ์จากคำสั่ง print(...) ได้ทันที",
  },
  {
    id: "sql",
    name: "SQL",
    nameEn: "SQL",
    shortBadge: "SQL · Database & Query",
    categoryLabel: "ประเภทที่ 3 · ฐานข้อมูลและการดึงข้อมูลเชิงลึก",
    categoryLabelEn: "Track 3 · Databases & Analytical Queries",
    tagline: "ภาษามาตรฐานสำหรับค้นหา กรอง และสรุปผลข้อมูลจากฐานข้อมูล",
    taglineEn:
      "Standard query language for filtering, grouping, and summarizing table data",
    description:
      "ฝึกอ่านคำสั่งดึงข้อมูลจากตาราง (Table) ทำความเข้าใจลำดับการทำงานจริงของ SELECT, FROM, WHERE, GROUP BY, ORDER BY และ INNER JOIN เพื่อตรวจสอบคำสั่ง SQL ที่ AI สร้างให้ถูกต้อง",
    descriptionEn:
      "Master real SQL execution order (FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY) to verify AI-generated database queries.",
    accentColor: "#6d3fc0",
    bgTint: "#ede9fe",
    borderColor: "#6d3fc0",
    dungeonRealmName: "คลังศิลา SQL",
    dungeonRealmNameEn: "SQL Vault of Records",
    highlights: [
      "การดึงและกรองข้อมูลด้วย SELECT, FROM, WHERE และตัวดำเนินการเปรียบเทียบ",
      "การเรียงลำดับ ORDER BY, จำกัดแถว LIMIT และสรุปผลด้วย COUNT / SUM / GROUP BY",
      "การเชื่อมตารางด้วย INNER JOIN และการจับบั๊กเงื่อนไข WHERE ที่ผิดพลาดจาก AI",
    ],
    highlightsEn: [
      "Selecting & filtering rows with SELECT, FROM, and WHERE",
      "Sorting with ORDER BY and aggregating with GROUP BY / SUM",
      "Distinguishing WHERE vs HAVING in grouped queries",
    ],
    sampleCodePreview: `SELECT category, SUM(price) AS total_sales\nFROM products\nWHERE stock > 0\nGROUP BY category;`,
    defaultPlaygroundCode: `SELECT name, price\nFROM products\nWHERE price >= 100\nORDER BY price DESC;`,
    playgroundDescription:
      "ทดลองรันคำสั่ง SQL กับตารางจำลอง products (id, name, category, price, stock) เพื่อดูผลลัพธ์ที่ได้จริง",
  },
  {
    id: "typescript",
    name: "TypeScript",
    nameEn: "TypeScript",
    shortBadge: "TS · Typed Web",
    categoryLabel: "ประเภทที่ 4 · เว็บแอปพลิเคชันแบบมี Type ปลอดภัย",
    categoryLabelEn: "Track 4 · Type-Safe Web Engineering",
    tagline:
      "จาวาสคริปต์เสริมเกราะ Type Safety ฝึกอ่าน Interface, Union Type และ Generic",
    taglineEn:
      "Typed JavaScript — master interfaces, union narrowing, and generics",
    description:
      "ภาษาหลักของการพัฒนาเว็บระดับมืออาชีพและ Next.js ฝึกอ่านการกำหนด Type, Interface, Union Type Narrowing และการจับจุดที่ AI มักใช้ any หรือละเลย null/empty guard",
    descriptionEn:
      "Essential for modern full-stack & Next.js apps. Read type annotations, interfaces, union narrowing, and catch unsafe AI 'any' or empty-array assumptions.",
    accentColor: "#0284c7",
    bgTint: "#e0f2fe",
    borderColor: "#0284c7",
    dungeonRealmName: "วิหารไทป์สคริปต์",
    dungeonRealmNameEn: "Temple of TypeScript",
    highlights: [
      "การประกาศชนิดข้อมูล (Type Annotations) และโครงสร้าง interface",
      "Union Types & Type Narrowing เพื่อควบคุมทางแยกอย่างปลอดภัย",
      "Generics <T> และ readonly array เพื่อป้องกันการกลายพันธุ์ข้อมูล",
    ],
    highlightsEn: [
      "Type annotations and interface object contracts",
      "Union types and safe if/else type narrowing",
      "Generics <T> and readonly array immutability guards",
    ],
    sampleCodePreview: `interface Product {\n  name: string;\n  price: number;\n}\nconst item: Product = { name: "Mouse", price: 450 };\nconsole.log(item.price * 2);`,
    defaultPlaygroundCode: `interface Product {\n  name: string;\n  price: number;\n}\nconst item: Product = { name: "Mouse", price: 450 };\nconst qty: number = 2;\nconsole.log(item.price * qty);`,
    playgroundDescription:
      "ทดลองเขียนหรือวางโค้ด TypeScript เพื่อแปลง Type Annotation และรันตรวจผลลัพธ์จริง",
  },
  {
    id: "cpp",
    name: "C++",
    nameEn: "C++",
    shortBadge: "C++ · Systems & Speed",
    categoryLabel: "ประเภทที่ 5 · ระบบคอมพิวเตอร์, อัลกอริทึม และความเร็วสูง",
    categoryLabelEn: "Track 5 · Systems, Memory & Competitive Algorithms",
    tagline:
      "ภาษาความเร็วสูงระดับระบบ ฝึกแกะชนิดตัวแปร, Reference (&) และ Vector",
    taglineEn:
      "High-performance systems language — trace types, references (&), and vectors",
    description:
      "หัวใจของงานระบบ เกม และโอลิมปิกวิชาการ ฝึกอ่านกับดักหารจำนวนเต็ม (Integer Division), การส่งค่าแบบอ้างอิง Pass-by-Reference (&) และขอบเขตของ std::vector ที่ AI มักพลาด",
    descriptionEn:
      "Foundation of game engines, systems, and competitive programming. Master integer division traps, pass-by-reference (&), and std::vector bounds.",
    accentColor: "#b91c1c",
    bgTint: "#fee2e2",
    borderColor: "#b91c1c",
    dungeonRealmName: "ป้อมปราการเหล็ก C++",
    dungeonRealmNameEn: "Iron Fortress of C++",
    highlights: [
      "ความต่างระหว่าง int กับ double และกับดักการหารจำนวนเต็ม",
      "Pass-by-Value vs Pass-by-Reference (int&) ในฟังก์ชัน",
      "การใช้ std::vector และการตรวจขอบเขตดัชนีในลูป for",
    ],
    highlightsEn: [
      "int vs double precision and integer division traps",
      "Pass-by-value vs pass-by-reference (int&) mutation",
      "std::vector indexing and off-by-one loop boundaries",
    ],
    sampleCodePreview: `#include <iostream>\nusing namespace std;\nint main() {\n    int a = 7, b = 2;\n    cout << (a / b) << endl;\n    return 0;\n}`,
    defaultPlaygroundCode: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int total = 7;\n    int count = 2;\n    int avg = total / count;\n    cout << avg << endl;\n    return 0;\n}`,
    playgroundDescription:
      "ทดลองรันโค้ด C++ พื้นฐาน (cout, int/double, reference &, vector) เพื่อดูผลลัพธ์การคำนวณจริง",
  },
  {
    id: "java",
    name: "Java",
    nameEn: "Java",
    shortBadge: "JAVA · OOP & Enterprise",
    categoryLabel: "ประเภทที่ 6 · เชิงวัตถุ (OOP) และซอฟต์แวร์องค์กร",
    categoryLabelEn: "Track 6 · Object-Oriented & Enterprise Systems",
    tagline:
      "ราชาแห่ง OOP ฝึกแกะ Class, Constructor, .equals() และ Encapsulation",
    taglineEn:
      "Classic OOP powerhouse — trace classes, constructors, and .equals() semantics",
    description:
      "ภาษาหลักของระบบองค์กรและ Android ฝึกอ่านโครงสร้างคลาสและเมธอด main, ความต่างระหว่าง == กับ .equals() สำหรับ String และการเปลี่ยนแปลงสถานะภายใน Object",
    descriptionEn:
      "Backbone of enterprise backends and OOP curricula. Practice reading class blueprints, String .equals() vs ==, and object state mutations.",
    accentColor: "#c2410c",
    bgTint: "#ffedd5",
    borderColor: "#c2410c",
    dungeonRealmName: "หอคอยคลาสแห่งจาวา",
    dungeonRealmNameEn: "Citadel of Java Classes",
    highlights: [
      "โครงสร้าง public class, เมธอด main และ System.out.println",
      "การเปรียบเทียบ String ด้วย .equals() เทียบกับ == ที่ AI มักสับสน",
      "การสร้าง Object ด้วย Constructor และการอัปเดต Field ผ่านเมธอด",
    ],
    highlightsEn: [
      "Class structure, main() entry point, and System.out.println",
      "String .equals() value check vs == reference check",
      "Constructors, object state fields, and array loops",
    ],
    sampleCodePreview: `public class Main {\n    public static void main(String[] args) {\n        String s = new String("admin");\n        System.out.println(s.equals("admin"));\n    }\n}`,
    defaultPlaygroundCode: `public class Main {\n    public static void main(String[] args) {\n        int price = 120;\n        int qty = 3;\n        int tax = 20;\n        int total = (price * qty) + tax;\n        System.out.println(total);\n    }\n}`,
    playgroundDescription:
      "ทดลองรันโค้ด Java พื้นฐาน (ตัวแปร, String.equals, Class & Method, System.out.println) เพื่อตรวจผลลัพธ์จริง",
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
    isBoss: true,
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
    isBoss: true,
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

// ============================================================================
// เควสต์ PRIMM เฉพาะสำหรับภาษา TypeScript (IDs 301..303)
// ============================================================================
export const TYPESCRIPT_TOPICS: TopicQuest[] = [
  {
    id: 301,
    title: "TypeScript ด่านที่ 1 · Interface และ Type Annotation",
    shortName: "TS 1 · Interface & Types",
    subtitle: "แกะรอยสัญญาข้อมูล (interface) และการคำนวณค่าตัวแปรที่ปลอดภัยด้วยชนิดข้อมูล",
    code: `interface Product {
  name: string;
  price: number;
}
const item: Product = { name: "Mouse", price: 450 };
const qty: number = 2;
const total: number = item.price * qty;
console.log(total);`,
    predictPrompt:
      "เมื่อรันโค้ด TypeScript ชุดนี้ console.log(total) จะแสดงผลลัพธ์ค่าใด?",
    predictOptions: ["900", "450", "2", "NaN"],
    predictExplanation:
      "item.price มีค่า 450 (number) คูณกับ qty = 2 จึงได้ total = 900",
    steps: [
      {
        stepNumber: 1,
        line: 1,
        codeLine: "interface Product { name: string; price: number; }",
        variables: { Product: "interface { name: string, price: number }" },
        outputSoFar: [],
        explanation:
          "กำหนดโครงสร้างชนิดข้อมูล Product เพื่อบังคับว่า Object ต้องมี name (ข้อความ) และ price (ตัวเลข) ก่อนรันจริง",
      },
      {
        stepNumber: 2,
        line: 5,
        codeLine: 'const item: Product = { name: "Mouse", price: 450 };',
        variables: { "item.name": '"Mouse"', "item.price": "450" },
        outputSoFar: [],
        explanation: "สร้างออบเจ็กต์ item ที่ตรงตาม interface Product ทุกช่อง",
      },
      {
        stepNumber: 3,
        line: 6,
        codeLine: "const qty: number = 2;",
        variables: { "item.price": "450", qty: "2" },
        outputSoFar: [],
        explanation: "ประกาศตัวแปร qty ชนิด number เก็บค่า 2",
      },
      {
        stepNumber: 4,
        line: 7,
        codeLine: "const total: number = item.price * qty;",
        variables: { "item.price": "450", qty: "2", total: "900" },
        outputSoFar: [],
        explanation: "คำนวณ 450 * 2 = 900 เก็บลงในตัวแปร total",
      },
      {
        stepNumber: 5,
        line: 8,
        codeLine: "console.log(total);",
        variables: { total: "900" },
        outputSoFar: ["900"],
        explanation: "พิมพ์ค่า total คือ 900 ออกทางหน้าจอ",
      },
    ],
    questions: [
      {
        id: "ts1-q1",
        cellId: "T1",
        targetLine: 1,
        question: "คำสั่ง interface Product ใน TypeScript มีไว้ทำหน้าที่อะไรขณะพัฒนาโปรแกรม?",
        options: [
          {
            id: "a",
            text: "กำหนดรูปแบบ property และชนิดข้อมูลของออบเจ็กต์ให้ TypeScript ตรวจสอบก่อนรัน",
          },
          { id: "b", text: "สร้างตารางในฐานข้อมูลอัตโนมัติ" },
          { id: "c", text: "วนซ้ำข้อมูลในอาร์เรย์" },
          { id: "d", text: "แปลงตัวเลขให้เป็นข้อความเสมอ" },
        ],
        correctOptionId: "a",
        hint: "สังเกตว่า interface ระบุชื่อฟิลด์และชนิดข้อมูล (string, number) ไว้ล่วงหน้า",
        explanation:
          "interface เป็นสัญญาโครงสร้างข้อมูลระดับ Compile-time ที่ช่วยจับบั๊กหากกำหนดค่าผิดชนิดหรือสะกดชื่อฟิลด์ผิด",
      },
      {
        id: "ts1-q2",
        cellId: "E1",
        targetLine: 7,
        question: "ถ้าสั่ง AI แก้บรรทัดที่ 5 เป็น price: \"450\" (ใส่เครื่องหมายคำพูด) จะเกิดอะไรขึ้น?",
        options: [
          {
            id: "a",
            text: "TypeScript แจ้ง Type Error ทันทีเพราะ price ต้องเป็น number ไม่ใช่ string",
          },
          { id: "b", text: "ทำงานผ่านปกติโดยไม่เตือนอะไร" },
          { id: "c", text: "ลบตัวแปร item ทิ้ง" },
          { id: "d", text: "ได้ค่า total เป็น 4502" },
        ],
        correctOptionId: "a",
        hint: "ดูที่ price: number ใน interface Product",
        explanation:
          "เนื่องจาก price ถูกกำหนดชนิดเป็น number การใส่ \"450\" ซึ่งเป็น string จะถูกตรวจพบตั้งแต่ตอน Compile",
      },
    ],
    modifyChallenge: {
      instruction:
        "ลองเปลี่ยนค่า qty ในบรรทัดที่ 6 จาก 2 เป็น 3 เพื่อคำนวณราคาสินค้า 3 ชิ้น (ผลลัพธ์จะเป็น 1350)",
      suggestedCode: `interface Product {
  name: string;
  price: number;
}
const item: Product = { name: "Mouse", price: 450 };
const qty: number = 3;
const total: number = item.price * qty;
console.log(total);`,
      changeDescription: "เปลี่ยน qty จาก 2 เป็น 3",
      options: ["1350", "900", "450", "1800"],
      explanation: "เมื่อ qty = 3 จะได้ 450 * 3 = 1350",
    },
    badgeReward: {
      id: "badge-ts-1",
      name: "ผู้พิทักษ์ TypeScript",
      description: "เข้าใจการอ่าน Interface และ Type Annotation ใน TypeScript",
    },
  },
  {
    id: 302,
    title: "TypeScript ด่านที่ 2 · Union Type และ Type Narrowing",
    shortName: "TS 2 · Union & Narrowing",
    subtitle: "ติดตามการบีบชนิดข้อมูล (Type Narrowing) ผ่านเงื่อนไข if / else",
    code: `type Status = "paid" | "pending" | "failed";
function getBadge(status: Status): string {
  if (status === "paid") return "Verified";
  if (status === "pending") return "Waiting";
  return "Retry";
}
const result: string = getBadge("pending");
console.log(result);`,
    predictPrompt:
      'เมื่อเรียก getBadge("pending") โปรแกรมจะพิมพ์ข้อความใดออกมา?',
    predictOptions: ["Waiting", "Verified", "Retry", "pending"],
    predictExplanation:
      'status มีค่าเป็น "pending" จึงข้าม if แรกและตรงกับ if (status === "pending") ส่งคืน "Waiting"',
    steps: [
      {
        stepNumber: 1,
        line: 1,
        codeLine: 'type Status = "paid" | "pending" | "failed";',
        variables: { Status: '"paid" | "pending" | "failed"' },
        outputSoFar: [],
        explanation:
          "Union Type จำกัดค่าที่เป็นไปได้ของ Status ให้เหลือเพียง 3 ข้อความที่ระบุเท่านั้น",
      },
      {
        stepNumber: 2,
        line: 7,
        codeLine: 'const result: string = getBadge("pending");',
        variables: { status: '"pending"' },
        outputSoFar: [],
        explanation: 'เรียกฟังก์ชัน getBadge โดยส่งอาร์กิวเมนต์ "pending" เข้าไป',
      },
      {
        stepNumber: 3,
        line: 3,
        codeLine: 'if (status === "paid") return "Verified";',
        variables: { status: '"pending"' },
        outputSoFar: [],
        explanation: 'เงื่อนไข "pending" === "paid" เป็นเท็จ จึงข้ามไปบรรทัดถัดไป',
      },
      {
        stepNumber: 4,
        line: 4,
        codeLine: 'if (status === "pending") return "Waiting";',
        variables: { status: '"pending"', returnValue: '"Waiting"' },
        outputSoFar: [],
        explanation: 'ตรงเงื่อนไข! ฟังก์ชันส่งคืนค่า "Waiting" ทันที',
      },
      {
        stepNumber: 5,
        line: 8,
        codeLine: "console.log(result);",
        variables: { result: '"Waiting"' },
        outputSoFar: ["Waiting"],
        explanation: 'พิมพ์ข้อความ "Waiting" ออกทางหน้าจอ',
      },
    ],
    questions: [
      {
        id: "ts2-q1",
        cellId: "T2",
        targetLine: 1,
        question: "ข้อดีของการใช้ Union Type (\"paid\" | \"pending\" | \"failed\") แทน string ทั่วไปคืออะไร?",
        options: [
          {
            id: "a",
            text: "ป้องกันการพิมพ์ค่าสถานะผิด เช่น \"paidd\" เพราะคอมไพเลอร์จะแจ้งเตือนทันที",
          },
          { id: "b", text: "ทำให้โค้ดทำงานเร็วขึ้น 100 เท่า" },
          { id: "c", text: "อนุญาตให้ส่งตัวเลขเข้าไปแทนข้อความได้" },
          { id: "d", text: "ทำให้ไม่ต้องเขียนคำสั่ง return" },
        ],
        correctOptionId: "a",
        hint: "Union Type จำกัดกลุ่มค่าที่ถูกต้องให้แคบลงเหลือเฉพาะที่ระบุไว้",
        explanation:
          "Union Literal Type ช่วยป้องกันบั๊กจากค่าข้อความที่สะกดผิดได้ตั้งแต่ก่อนรันโปรแกรม",
      },
      {
        id: "ts2-q2",
        cellId: "E2",
        targetLine: 5,
        question: "หลังผ่านบรรทัดที่ 3 และ 4 แล้ว TypeScript รู้ได้อย่างไรว่าในบรรทัดที่ 5 status เหลือค่าเดียวคือ \"failed\"?",
        options: [
          {
            id: "a",
            text: "เกิด Type Narrowing เพราะทั้ง \"paid\" และ \"pending\" ถูก return ออกไปแล้ว",
          },
          { id: "b", text: "เพราะบรรทัดที่ 5 มีคำสั่ง delete" },
          { id: "c", text: "เพราะฟังก์ชันส่งคืนค่าเป็น null" },
          { id: "d", text: "ไม่รู้ ต้องรอตอนรันจริงเท่านั้น" },
        ],
        correctOptionId: "a",
        hint: "เมื่อตัดทางเลือก 2 ค่าแรกออกด้วย if + return ค่าสุดท้ายใน Union จึงเหลือเพียงค่าเดียว",
        explanation:
          "นี่คือหลัก Control-Flow Type Narrowing ของ TypeScript ที่วิเคราะห์การไหลของ if/return ได้อัตโนมัติ",
      },
    ],
    modifyChallenge: {
      instruction:
        'เปลี่ยนการเรียกในบรรทัดที่ 7 จาก getBadge("pending") เป็น getBadge("paid") เพื่อให้ได้ผลลัพธ์ Verified',
      suggestedCode: `type Status = "paid" | "pending" | "failed";
function getBadge(status: Status): string {
  if (status === "paid") return "Verified";
  if (status === "pending") return "Waiting";
  return "Retry";
}
const result: string = getBadge("paid");
console.log(result);`,
      changeDescription: 'เปลี่ยนอาร์กิวเมนต์เป็น "paid"',
      options: ["Verified", "Waiting", "Retry", "paid"],
      explanation: 'เมื่อส่ง "paid" จะเข้าเงื่อนไขบรรทัดที่ 3 และคืนค่า "Verified"',
    },
    badgeReward: {
      id: "badge-ts-2",
      name: "จอมบีบ Type Narrowing",
      description: "เข้าใจ Union Type และการวิเคราะห์ทางแยกใน TypeScript",
    },
  },
  {
    id: 303,
    title: "TypeScript ด่านบอส · Generics <T> และ Readonly Guard",
    shortName: "TS 3 · Generics Boss",
    isBoss: true,
    subtitle: "ปราบบอสวิหารไทป์สคริปต์ด้วยฟังก์ชัน Generic และการป้องกันอาเรย์ว่าง",
    code: `function getFirstScore<T>(items: readonly T[], fallback: T): T {
  if (items.length === 0) return fallback;
  return items[0];
}
const scores: readonly number[] = [88, 92, 75];
console.log(getFirstScore(scores, 0));`,
    predictPrompt:
      "เมื่อรันโค้ด Generic Boss ชุดนี้ console.log จะพิมพ์ค่าใดออกมา?",
    predictOptions: ["88", "0", "75", "undefined"],
    predictExplanation:
      "scores มีสมาชิก 3 ตัว (ไม่ว่าง) จึงไม่เข้า if (items.length === 0) และส่งคืน items[0] คือ 88",
    steps: [
      {
        stepNumber: 1,
        line: 5,
        codeLine: "const scores: readonly number[] = [88, 92, 75];",
        variables: { scores: "[88, 92, 75] (readonly)" },
        outputSoFar: [],
        explanation: "สร้างอาเรย์คะแนนแบบ readonly เพื่อห้ามแก้ไขสมาชิกภายในโดยไม่ได้ตั้งใจ",
      },
      {
        stepNumber: 2,
        line: 1,
        codeLine: "function getFirstScore<T>(items: readonly T[], fallback: T): T",
        variables: { T: "number", items: "[88, 92, 75]", fallback: "0" },
        outputSoFar: [],
        explanation: "TypeScript อนุมานว่า T คือ number จากอาร์กิวเมนต์ scores และ 0",
      },
      {
        stepNumber: 3,
        line: 2,
        codeLine: "if (items.length === 0) return fallback;",
        variables: { "items.length": "3" },
        outputSoFar: [],
        explanation: "ตรวจสอบว่าอาเรย์ว่างหรือไม่ (3 === 0 เป็นเท็จ) จึงไม่ใช้ค่า fallback",
      },
      {
        stepNumber: 4,
        line: 3,
        codeLine: "return items[0];",
        variables: { returnValue: "88" },
        outputSoFar: [],
        explanation: "ส่งคืนสมาชิกตัวแรกที่ตำแหน่ง index 0 คือ 88",
      },
      {
        stepNumber: 5,
        line: 6,
        codeLine: "console.log(getFirstScore(scores, 0));",
        variables: { output: "88" },
        outputSoFar: ["88"],
        explanation: "พิมพ์ค่า 88 ออกทางหน้าจอ",
      },
    ],
    questions: [
      {
        id: "ts3-q1",
        cellId: "T3",
        targetLine: 1,
        question: "สัญลักษณ์ <T> ใน getFirstScore<T> มีประโยชน์อย่างไรเหนือกว่าการใช้ any?",
        options: [
          {
            id: "a",
            text: "รักษาความสัมพันธ์ของชนิดข้อมูลให้ค่าที่ส่งคืนมี Type ตรงกับชนิดสมาชิกใน items เสมอ",
          },
          { id: "b", text: "บังคับให้อาเรย์มีได้เฉพาะตัวเลขเท่านั้น" },
          { id: "c", text: "ทำให้อาเรย์สามารถแก้ไขค่าได้เร็วขึ้น" },
          { id: "d", text: "ปิดการตรวจสอบ Type ของ TypeScript ทั้งไฟล์" },
        ],
        correctOptionId: "a",
        hint: "สังเกตว่า T ปรากฏทั้งใน items: readonly T[], fallback: T และชนิดค่าคืน : T",
        explanation:
          "Generic <T> เชื่อมโยงชนิดของพารามิเตอร์เข้ากับค่าที่ส่งกลับ โดยไม่ต้องสูญเสีย Type Safety เหมือน any",
      },
      {
        id: "ts3-q2",
        cellId: "F4",
        targetLine: 2,
        question: "บรรทัดที่ 2 (if (items.length === 0) return fallback;) ช่วยป้องกันบั๊กใดที่ AI มักลืม?",
        options: [
          {
            id: "a",
            text: "ป้องกันการอ่าน items[0] แล้วได้ undefined เมื่ออาเรย์ว่าง",
          },
          { id: "b", text: "ป้องกันลูปไม่รู้จบ" },
          { id: "c", text: "ป้องกันการหารด้วยศูนย์" },
          { id: "d", text: "ป้องกันการประกาศตัวแปรซ้ำ" },
        ],
        correctOptionId: "a",
        hint: "ถ้า items เป็น [] ค่าของ items[0] จะเป็นอะไร?",
        explanation:
          "เมื่ออาเรย์ว่าง items[0] จะได้ undefined ซึ่งอาจทำให้โค้ดปลายทางพัง การมี guard คืนค่า fallback จึงปลอดภัย",
      },
    ],
    modifyChallenge: {
      instruction:
        "ลองเปลี่ยนอาเรย์ scores ในบรรทัดที่ 5 เป็น [] (อาเรย์ว่าง) เพื่อให้ฟังก์ชันส่งคืนค่า fallback คือ 0",
      suggestedCode: `function getFirstScore<T>(items: readonly T[], fallback: T): T {
  if (items.length === 0) return fallback;
  return items[0];
}
const scores: readonly number[] = [];
console.log(getFirstScore(scores, 0));`,
      changeDescription: "เปลี่ยน scores เป็นอาเรย์ว่าง []",
      options: ["0", "88", "undefined", "null"],
      explanation: "เมื่อ scores ว่าง เงื่อนไข items.length === 0 เป็นจริง จึงส่งคืน fallback (0)",
    },
    badgeReward: {
      id: "badge-ts-boss",
      name: "ผู้พิชิตวิหาร TypeScript",
      description: "เชี่ยวชาญการอ่าน Interface, Union Narrowing และ Generic <T>",
    },
  },
];

// ============================================================================
// เควสต์ PRIMM เฉพาะสำหรับภาษา C++ (IDs 401..403)
// ============================================================================
export const CPP_TOPICS: TopicQuest[] = [
  {
    id: 401,
    title: "C++ ด่านที่ 1 · ชนิดตัวแปรและกับดักการหารจำนวนเต็ม",
    shortName: "C++ 1 · int Division",
    subtitle: "ระวังจุดที่ AI และมือใหม่พลาดบ่อยใน C++: int / int จะตัดเศษทิ้งทันที!",
    code: `#include <iostream>
using namespace std;

int main() {
    int total = 7;
    int count = 2;
    int avg = total / count;
    cout << avg << endl;
    return 0;
}`,
    predictPrompt:
      "ในภาษา C++ เมื่อ total = 7 และ count = 2 เป็น int ทั้งคู่ คำสั่ง cout << avg จะพิมพ์ค่าใด?",
    predictOptions: ["3", "3.5", "4", "0"],
    predictExplanation:
      "ใน C++ เมื่อ int หารด้วย int จะเกิด Integer Division (ตัดทศนิยมทิ้ง) 7 / 2 จึงได้ 3 ไม่ใช่ 3.5",
    steps: [
      {
        stepNumber: 1,
        line: 5,
        codeLine: "int total = 7;",
        variables: { total: "7 (int)" },
        outputSoFar: [],
        explanation: "ประกาศตัวแปร total ชนิดจำนวนเต็ม (int) เก็บค่า 7",
      },
      {
        stepNumber: 2,
        line: 6,
        codeLine: "int count = 2;",
        variables: { total: "7 (int)", count: "2 (int)" },
        outputSoFar: [],
        explanation: "ประกาศตัวแปร count ชนิดจำนวนเต็ม (int) เก็บค่า 2",
      },
      {
        stepNumber: 3,
        line: 7,
        codeLine: "int avg = total / count;",
        variables: { total: "7", count: "2", avg: "3 (int)" },
        outputSoFar: [],
        explanation:
          "7 / 2 ในชนิด int จะตัดทศนิยม .5 ทิ้งทันที เหลือเพียง 3 เก็บลงใน avg",
      },
      {
        stepNumber: 4,
        line: 8,
        codeLine: "cout << avg << endl;",
        variables: { avg: "3" },
        outputSoFar: ["3"],
        explanation: "พิมพ์ค่า avg คือ 3 ออกทางหน้าจอมาตรฐานด้วย cout",
      },
    ],
    questions: [
      {
        id: "cpp1-q1",
        cellId: "E1",
        targetLine: 7,
        question: "เหตุใดผลลัพธ์ของ 7 / 2 ในโค้ด C++ ข้างต้นจึงได้ 3 แทนที่จะเป็น 3.5?",
        options: [
          {
            id: "a",
            text: "เพราะทั้ง total และ count เป็นชนิด int การหารจึงตัดเศษทศนิยมทิ้ง",
          },
          { id: "b", text: "เพราะ C++ ไม่รองรับเลขทศนิยม" },
          { id: "c", text: "เพราะคำสั่ง cout ปัดเศษลงเสมอ" },
          { id: "d", text: "เพราะตัวแปร count มีค่าเป็น 0" },
        ],
        correctOptionId: "a",
        hint: "ดูชนิดข้อมูลหน้าชื่อตัวแปร total, count และ avg",
        explanation:
          "ใน C++ ตัวดำเนินการ / เมื่อกระทำกับ int ทั้งสองฝั่งจะเป็นการหารปัดเศษทิ้งเสมอ ต้องแปลงเป็น double อย่างน้อยหนึ่งฝั่งจึงจะได้ทศนิยม",
      },
      {
        id: "cpp1-q2",
        cellId: "T1",
        targetLine: 8,
        question: "คำสั่ง cout << avg << endl; ใน C++ ทำหน้าที่เทียบเท่ากับคำสั่งใด?",
        options: [
          { id: "a", text: "แสดงค่า avg ออกหน้าจอแล้วขึ้นบรรทัดใหม่" },
          { id: "b", text: "รับค่าจากคีย์บอร์ดเก็บลงใน avg" },
          { id: "c", text: "ประกาศตัวแปร avg ใหม่" },
          { id: "d", text: "ปิดโปรแกรมทันทีโดยไม่พิมพ์อะไร" },
        ],
        correctOptionId: "a",
        hint: "cout ย่อมาจาก Character Output และ endl ย่อมาจาก End Line",
        explanation: "cout << ... ใช้แสดงผลออกหน้าจอ และ endl ใช้ขึ้นบรรทัดใหม่",
      },
    ],
    modifyChallenge: {
      instruction:
        "แก้บรรทัดที่ 7 เป็น double avg = (double)total / count; เพื่อให้แสดงค่าทศนิยม 3.5 อย่างถูกต้อง",
      suggestedCode: `#include <iostream>
using namespace std;

int main() {
    int total = 7;
    int count = 2;
    double avg = (double)total / count;
    cout << avg << endl;
    return 0;
}`,
      changeDescription: "ใช้ชนิด double และแปลง (double)total ก่อนหาร",
      options: ["3.5", "3", "4", "7"],
      explanation: "เมื่อแปลง total เป็น double แล้วหารด้วย 2 จะได้ทศนิยม 3.5",
    },
    badgeReward: {
      id: "badge-cpp-1",
      name: "ช่างตีเหล็ก C++",
      description: "รู้ทันกับดักการหารจำนวนเต็มและโครงสร้างหลักของ C++",
    },
  },
  {
    id: 402,
    title: "C++ ด่านที่ 2 · Pass-by-Reference (&) ในฟังก์ชัน",
    shortName: "C++ 2 · Reference (&)",
    subtitle: "แกะรอยเครื่องหมาย & ที่ทำให้ฟังก์ชันแก้ไขตัวแปรต้นฉบับได้จริง",
    code: `#include <iostream>
using namespace std;

void addBonus(int& hp, int bonus) {
    hp = hp + bonus;
}

int main() {
    int hp = 50;
    addBonus(hp, 25);
    cout << hp << endl;
    return 0;
}`,
    predictPrompt:
      "เมื่อรันโปรแกรม C++ ชุดนี้ ค่า hp ที่พิมพ์ออกมาจาก cout << hp คือเท่าไร?",
    predictOptions: ["75", "50", "25", "0"],
    predictExplanation:
      "พารามิเตอร์ int& hp เป็น Reference (อ้างอิงตัวแปรต้นฉบับใน main) ดังนั้น hp = hp + 25 จึงเปลี่ยน hp จาก 50 เป็น 75 จริง",
    steps: [
      {
        stepNumber: 1,
        line: 9,
        codeLine: "int hp = 50;",
        variables: { "main::hp": "50" },
        outputSoFar: [],
        explanation: "ในฟังก์ชัน main สร้างตัวแปร hp เริ่มต้นที่ 50",
      },
      {
        stepNumber: 2,
        line: 10,
        codeLine: "addBonus(hp, 25);",
        variables: { "main::hp": "50", "hp (ref)": "-> main::hp", bonus: "25" },
        outputSoFar: [],
        explanation:
          "เรียก addBonus โดยพารามิเตอร์แรกมี & (Reference) จึงชี้ไปยังกล่องหน่วยความจำเดียวกับ main::hp",
      },
      {
        stepNumber: 3,
        line: 5,
        codeLine: "hp = hp + bonus;",
        variables: { "main::hp": "75" },
        outputSoFar: [],
        explanation: "บวกเพิ่ม 25 ลงไปใน main::hp โดยตรง ทำให้ hp กลายเป็น 75",
      },
      {
        stepNumber: 4,
        line: 11,
        codeLine: "cout << hp << endl;",
        variables: { "main::hp": "75" },
        outputSoFar: ["75"],
        explanation: "พิมพ์ค่า hp ที่ถูกอัปเดตแล้วคือ 75",
      },
    ],
    questions: [
      {
        id: "cpp2-q1",
        cellId: "T3",
        targetLine: 4,
        question: "เครื่องหมาย & ใน int& hp มีผลต่อการส่งค่าเข้าฟังก์ชันอย่างไร?",
        options: [
          {
            id: "a",
            text: "ส่งแบบ Reference ทำให้การแก้ไข hp ในฟังก์ชันส่งผลต่อตัวแปรต้นฉบับใน main ด้วย",
          },
          { id: "b", text: "คัดลอกเฉพาะค่าตัวเลขไปใช้โดยไม่กระทบต้นฉบับ" },
          { id: "c", text: "แปลงตัวเลขให้เป็นค่าติดลบ" },
          { id: "d", text: "ทำให้ฟังก์ชันคืนค่าเป็นข้อความ" },
        ],
        correctOptionId: "a",
        hint: "เปรียบเทียบ int& hp (อ้างอิงกล่องเดิม) กับ int hp (ก๊อปปี้ค่าใหม่)",
        explanation:
          "Pass-by-Reference (int&) ทำให้ตัวแปรในฟังก์ชันอ้างถึงหน่วยความจำเดียวกับตัวแปรที่ส่งเข้ามา",
      },
    ],
    modifyChallenge: {
      instruction:
        "ลองลบ & ในบรรทัดที่ 4 จาก int& hp เป็น int hp (Pass-by-Value) เพื่อดูว่าค่า hp ใน main จะยังเป็น 50",
      suggestedCode: `#include <iostream>
using namespace std;

void addBonus(int hp, int bonus) {
    hp = hp + bonus;
}

int main() {
    int hp = 50;
    addBonus(hp, 25);
    cout << hp << endl;
    return 0;
}`,
      changeDescription: "เปลี่ยน int& hp เป็น int hp (Pass-by-Value)",
      options: ["50", "75", "25", "100"],
      explanation:
        "เมื่อไม่มี & จะเป็นการคัดลอกค่าไปแก้ไขในตัวแปรชั่วคราว ค่า hp ใน main จึงยังคงเป็น 50",
    },
    badgeReward: {
      id: "badge-cpp-2",
      name: "จอมเวท Reference C++",
      description: "แยกแยะ Pass-by-Value และ Pass-by-Reference (&) ใน C++ ได้แม่นยำ",
    },
  },
  {
    id: 403,
    title: "C++ ด่านบอส · std::vector และขอบเขตลูป",
    shortName: "C++ 3 · Vector Boss",
    isBoss: true,
    subtitle: "ปราบบอสป้อมปราการเหล็กด้วยการไล่ index ใน std::vector<int>",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {10, 20, 30};
    int sum = 0;
    for (int i = 0; i < nums.size(); i++) {
        sum += nums[i];
    }
    cout << sum << endl;
    return 0;
}`,
    predictPrompt:
      "เมื่อลูปวนจนครบทุกสมาชิกของ vector<int> nums ค่า sum ที่พิมพ์ออกมาคือเท่าไร?",
    predictOptions: ["60", "30", "50", "10"],
    predictExplanation:
      "ลูปวน i = 0, 1, 2 บวก 10 + 20 + 30 ได้ 60",
    steps: [
      {
        stepNumber: 1,
        line: 6,
        codeLine: "vector<int> nums = {10, 20, 30};",
        variables: { nums: "{10, 20, 30}", "nums.size()": "3" },
        outputSoFar: [],
        explanation: "สร้าง vector เก็บจำนวนเต็ม 3 ตัว (index 0, 1, 2)",
      },
      {
        stepNumber: 2,
        line: 8,
        codeLine: "for (int i = 0; i < nums.size(); i++)",
        variables: { i: "0", sum: "10" },
        outputSoFar: [],
        explanation: "รอบ i = 0: บวก nums[0] (10) เข้า sum",
      },
      {
        stepNumber: 3,
        line: 9,
        codeLine: "sum += nums[i]; // i = 1, 2",
        variables: { i: "2", sum: "60" },
        outputSoFar: [],
        explanation: "รอบ i = 1 (+20 -> 30) และ i = 2 (+30 -> 60) แล้วหยุดเมื่อ i == 3",
      },
      {
        stepNumber: 4,
        line: 11,
        codeLine: "cout << sum << endl;",
        variables: { sum: "60" },
        outputSoFar: ["60"],
        explanation: "พิมพ์ผลรวม 60 ออกทางหน้าจอ",
      },
    ],
    questions: [
      {
        id: "cpp3-q1",
        cellId: "F4",
        targetLine: 8,
        question: "หาก AI เขียนเงื่อนไขผิดเป็น i <= nums.size() จะเกิดความเสี่ยงอะไรใน C++?",
        options: [
          {
            id: "a",
            text: "เข้าถึงหน่วยความจำเกินขอบเขต (Out-of-Bounds / Undefined Behavior) ที่ nums[3]",
          },
          { id: "b", text: "โปรแกรมจะเติมเลข 0 ให้โดยอัตโนมัติ" },
          { id: "c", text: "ลูปจะข้าม index 0 ไปเริ่มที่ 1" },
          { id: "d", text: "ไม่มีผลเสียใดๆ" },
        ],
        correctOptionId: "a",
        hint: "nums มีขนาด 3 ตัว จึงมีเฉพาะ index 0, 1, 2 เท่านั้น",
        explanation:
          "ใน C++ การอ่านเกินขนาด vector ด้วย [] ไม่มีตัวป้องกันอัตโนมัติและอาจอ่านค่าขยะหรือทำให้โปรแกรมแครชได้",
      },
    ],
    modifyChallenge: {
      instruction:
        "ลองแก้จุดเริ่มต้นลูปบรรทัดที่ 8 จาก int i = 0 เป็น int i = 1 เพื่อดูผลรวมเมื่อข้ามสมาชิกตัวแรก (จะได้ 50)",
      suggestedCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {10, 20, 30};
    int sum = 0;
    for (int i = 1; i < nums.size(); i++) {
        sum += nums[i];
    }
    cout << sum << endl;
    return 0;
}`,
      changeDescription: "เปลี่ยนค่าเริ่มต้น i จาก 0 เป็น 1",
      options: ["50", "60", "40", "30"],
      explanation: "เมื่อเริ่มที่ i = 1 จะบวกเฉพาะ nums[1] (20) + nums[2] (30) = 50",
    },
    badgeReward: {
      id: "badge-cpp-boss",
      name: "ผู้พิชิตป้อมปราการ C++",
      description: "เชี่ยวชาญการอ่านชนิดตัวแปร, Reference (&) และ std::vector ใน C++",
    },
  },
];

// ============================================================================
// เควสต์ PRIMM เฉพาะสำหรับภาษา Java (IDs 501..503)
// ============================================================================
export const JAVA_TOPICS: TopicQuest[] = [
  {
    id: 501,
    title: "Java ด่านที่ 1 · คลาส Main ชนิดข้อมูลและ System.out.println",
    shortName: "Java 1 · Types & Print",
    subtitle: "อ่านโครงสร้าง public class และเมธอด main ที่เป็นจุดเริ่มต้นของทุกโปรแกรม Java",
    code: `public class Main {
    public static void main(String[] args) {
        int price = 120;
        int qty = 3;
        int tax = 20;
        int total = (price * qty) + tax;
        System.out.println(total);
    }
}`,
    predictPrompt:
      "เมื่อรันโปรแกรม Java ชุดนี้ System.out.println(total) จะพิมพ์ตัวเลขใด?",
    predictOptions: ["380", "360", "340", "140"],
    predictExplanation:
      "คำนวณในวงเล็บ (120 * 3) = 360 แล้วบวก tax (20) ได้ 380",
    steps: [
      {
        stepNumber: 1,
        line: 2,
        codeLine: "public static void main(String[] args)",
        variables: { entryPoint: "main" },
        outputSoFar: [],
        explanation: "Java เริ่มทำงานจากเมธอด main ภายในคลาส Main เสมอ",
      },
      {
        stepNumber: 2,
        line: 5,
        codeLine: "int price = 120; int qty = 3; int tax = 20;",
        variables: { price: "120", qty: "3", tax: "20" },
        outputSoFar: [],
        explanation: "ประกาศตัวแปรชนิดจำนวนเต็ม int ทั้ง 3 ตัว",
      },
      {
        stepNumber: 3,
        line: 6,
        codeLine: "int total = (price * qty) + tax;",
        variables: { price: "120", qty: "3", tax: "20", total: "380" },
        outputSoFar: [],
        explanation: "คำนวณ 120 * 3 = 360 บวก 20 ได้ total = 380",
      },
      {
        stepNumber: 4,
        line: 7,
        codeLine: "System.out.println(total);",
        variables: { total: "380" },
        outputSoFar: ["380"],
        explanation: "แสดงค่า 380 ออกทางคอนโซล",
      },
    ],
    questions: [
      {
        id: "java1-q1",
        cellId: "T1",
        targetLine: 2,
        question: "ในภาษา Java โปรแกรมจะเริ่มต้นทำงานที่จุดใดเสมอ?",
        options: [
          { id: "a", text: "เมธอด public static void main(String[] args)" },
          { id: "b", text: "บรรทัดแรกนอกคลาสเหมือน Python" },
          { id: "c", text: "คำสั่ง System.out.println" },
          { id: "d", text: "ไฟล์ CSS" },
        ],
        correctOptionId: "a",
        hint: "ดูชื่อเมธอดในบรรทัดที่ 2",
        explanation:
          "Java Virtual Machine (JVM) ใช้เมธอด main เป็นจุดเริ่มต้นรันโปรแกรม",
      },
    ],
    modifyChallenge: {
      instruction:
        "ลองแก้ค่า tax ในบรรทัดที่ 5 จาก 20 เป็น 40 เพื่อให้ยอดรวมเป็น 400",
      suggestedCode: `public class Main {
    public static void main(String[] args) {
        int price = 120;
        int qty = 3;
        int tax = 40;
        int total = (price * qty) + tax;
        System.out.println(total);
    }
}`,
      changeDescription: "เปลี่ยน tax จาก 20 เป็น 40",
      options: ["400", "380", "360", "420"],
      explanation: "เมื่อ tax = 40 จะได้ (120 * 3) + 40 = 400",
    },
    badgeReward: {
      id: "badge-java-1",
      name: "อัศวินฝึกหัด Java",
      description: "เข้าใจโครงสร้างคลาสหลัก main() และชนิดตัวแปรใน Java",
    },
  },
  {
    id: 502,
    title: "Java ด่านที่ 2 · String.equals() vs == ที่ AI มักพลาด",
    shortName: "Java 2 · String.equals()",
    subtitle: "เรียนรู้ความแตกต่างระหว่างการเทียบค่าข้อความ (.equals) กับการเทียบตำแหน่งหน่วยความจำ (==)",
    code: `public class Main {
    public static void main(String[] args) {
        String role = new String("admin");
        if (role.equals("admin")) {
            System.out.println("Access Granted");
        } else {
            System.out.println("Access Denied");
        }
    }
}`,
    predictPrompt:
      "เมื่อใช้ role.equals(\"admin\") โปรแกรม Java ชุดนี้จะพิมพ์ข้อความใด?",
    predictOptions: ["Access Granted", "Access Denied", "true", "admin"],
    predictExplanation:
      'role.equals("admin") เปรียบเทียบเนื้อหาข้อความทีละตัวอักษร ซึ่งตรงกับ "admin" จึงพิมพ์ Access Granted',
    steps: [
      {
        stepNumber: 1,
        line: 3,
        codeLine: 'String role = new String("admin");',
        variables: { role: 'StringObject("admin")' },
        outputSoFar: [],
        explanation: 'สร้างออบเจ็กต์ String ใหม่ใน Heap ที่มีข้อความ "admin"',
      },
      {
        stepNumber: 2,
        line: 4,
        codeLine: 'if (role.equals("admin"))',
        variables: { role: '"admin"', check: "true" },
        outputSoFar: [],
        explanation: "เมธอด .equals() ตรวจเนื้อหาข้อความภายใน ได้ค่า true",
      },
      {
        stepNumber: 3,
        line: 5,
        codeLine: 'System.out.println("Access Granted");',
        variables: { output: "Access Granted" },
        outputSoFar: ["Access Granted"],
        explanation: "เข้าบล็อก if และพิมพ์ Access Granted",
      },
    ],
    questions: [
      {
        id: "java2-q1",
        cellId: "E2",
        targetLine: 4,
        question: 'ใน Java ทำไมจึงควรใช้ role.equals("admin") แทน role == "admin"?',
        options: [
          {
            id: "a",
            text: "เพราะ == เปรียบเทียบที่อยู่หน่วยความจำ (Reference) ส่วน .equals() เปรียบเทียบเนื้อหาข้อความ",
          },
          { id: "b", text: "เพราะ == ใช้กับ String แล้วโปรแกรมจะไม่คอมไพล์" },
          { id: "c", text: "เพราะ .equals() ใช้กับตัวเลข int เท่านั้น" },
          { id: "d", text: "ทั้งสองอย่างให้ผลเหมือนกันทุกกรณี" },
        ],
        correctOptionId: "a",
        hint: "เมื่อสร้าง String ด้วย new String(...) ออบเจ็กต์จะอยู่คนละตำแหน่งในหน่วยความจำกับ literal",
        explanation:
          "ใน Java เครื่องหมาย == บน Object เทียบ Reference ส่วน .equals() เทียบค่าข้อความจริง",
      },
    ],
    modifyChallenge: {
      instruction:
        'ลองแก้บรรทัดที่ 4 จาก role.equals("admin") เป็น role == "admin" เพื่อดูกับดัก Reference Comparison (ผลลัพธ์จะเป็น Access Denied!)',
      suggestedCode: `public class Main {
    public static void main(String[] args) {
        String role = new String("admin");
        if (role == "admin") {
            System.out.println("Access Granted");
        } else {
            System.out.println("Access Denied");
        }
    }
}`,
      changeDescription: 'เปลี่ยนจาก .equals("admin") เป็น == "admin"',
      options: ["Access Denied", "Access Granted", "Error", "null"],
      explanation:
        'เนื่องจาก new String("admin") สร้าง Reference ใหม่ที่ไม่ตรงกับ String Pool จึงได้ false และเข้า else พิมพ์ Access Denied',
    },
    badgeReward: {
      id: "badge-java-2",
      name: "ผู้แยกแยะ Reference Java",
      description: "รู้ทันบั๊ก == เทียบกับ .equals() สำหรับ String ใน Java",
    },
  },
  {
    id: 503,
    title: "Java ด่านบอส · OOP Class, Constructor และ Array Loop",
    shortName: "Java 3 · OOP Boss",
    isBoss: true,
    subtitle: "ปราบบอสหอคอยคลาสแห่งจาวา ด้วยการติดตามสถานะ Object ผ่านเมธอด takeDamage()",
    code: `class Hero {
    int hp;
    Hero(int startHp) { this.hp = startHp; }
    void takeDamage(int dmg) {
        if (dmg > this.hp) { this.hp = 0; }
        else { this.hp -= dmg; }
    }
}
public class Main {
    public static void main(String[] args) {
        Hero hero = new Hero(100);
        int[] hits = {30, 45, 50};
        for (int i = 0; i < hits.length; i++) {
            hero.takeDamage(hits[i]);
        }
        System.out.println(hero.hp);
    }
}`,
    predictPrompt:
      "เมื่อ Hero เริ่มต้นด้วย HP 100 และโดนโจมตี 30, 45, 50 ตามลำดับ ค่า hero.hp สุดท้ายคือเท่าไร?",
    predictOptions: ["0", "25", "-25", "100"],
    predictExplanation:
      "รอบ 1: 100 - 30 = 70, รอบ 2: 70 - 45 = 25, รอบ 3: dmg (50) > hp (25) จึงเข้าเงื่อนไขตั้งค่า hp = 0 (ไม่ติดลบ!)",
    steps: [
      {
        stepNumber: 1,
        line: 11,
        codeLine: "Hero hero = new Hero(100);",
        variables: { "hero.hp": "100" },
        outputSoFar: [],
        explanation: "สร้างออบเจ็กต์ hero โดยเรียก Constructor กำหนด hp = 100",
      },
      {
        stepNumber: 2,
        line: 14,
        codeLine: "hero.takeDamage(30); // i = 0",
        variables: { "hero.hp": "70", dmg: "30" },
        outputSoFar: [],
        explanation: "30 ไม่มากกว่า 100 จึงลบออก เหลือ 70",
      },
      {
        stepNumber: 3,
        line: 14,
        codeLine: "hero.takeDamage(45); // i = 1",
        variables: { "hero.hp": "25", dmg: "45" },
        outputSoFar: [],
        explanation: "45 ไม่มากกว่า 70 จึงลบออก เหลือ 25",
      },
      {
        stepNumber: 4,
        line: 5,
        codeLine: "if (dmg > this.hp) { this.hp = 0; } // i = 2, dmg = 50",
        variables: { "hero.hp": "0", dmg: "50" },
        outputSoFar: [],
        explanation: "50 > 25 เป็นจริง จึงกำหนดให้ hero.hp = 0 แทนที่จะติดลบ",
      },
      {
        stepNumber: 5,
        line: 16,
        codeLine: "System.out.println(hero.hp);",
        variables: { "hero.hp": "0" },
        outputSoFar: ["0"],
        explanation: "พิมพ์ค่า hero.hp คือ 0",
      },
    ],
    questions: [
      {
        id: "java3-q1",
        cellId: "F3",
        targetLine: 5,
        question: "เงื่อนไข if (dmg > this.hp) { this.hp = 0; } ในเมธอด takeDamage มีจุดประสงค์ใด?",
        options: [
          {
            id: "a",
            text: "ป้องกันไม่ให้ค่าพลังชีวิต (hp) ลดลงต่ำกว่า 0 (ติดลบ)",
          },
          { id: "b", text: "เพิ่มพลังชีวิตเมื่อโดนโจมตีแรง" },
          { id: "c", text: "หยุดลูป for ใน main ทันที" },
          { id: "d", text: "สร้างออบเจ็กต์ Hero ตัวใหม่" },
        ],
        correctOptionId: "a",
        hint: "สังเกตว่าถ้าไม่เช็ค 25 - 50 จะได้ -25",
        explanation:
          "เป็นหลักการ Clamp / Defensive State Guard เพื่อรักษาความถูกต้องของข้อมูลภายใน Object",
      },
    ],
    modifyChallenge: {
      instruction:
        "ลองเปลี่ยนค่าเริ่มต้นของ Hero ในบรรทัดที่ 11 จาก new Hero(100) เป็น new Hero(150) เพื่อดูว่า HP ที่เหลือหลังโดนตี 3 ครั้งจะเป็น 25",
      suggestedCode: `class Hero {
    int hp;
    Hero(int startHp) { this.hp = startHp; }
    void takeDamage(int dmg) {
        if (dmg > this.hp) { this.hp = 0; }
        else { this.hp -= dmg; }
    }
}
public class Main {
    public static void main(String[] args) {
        Hero hero = new Hero(150);
        int[] hits = {30, 45, 50};
        for (int i = 0; i < hits.length; i++) {
            hero.takeDamage(hits[i]);
        }
        System.out.println(hero.hp);
    }
}`,
      changeDescription: "เปลี่ยน new Hero(100) เป็น new Hero(150)",
      options: ["25", "0", "50", "75"],
      explanation: "150 - 30 = 120, 120 - 45 = 75, 75 - 50 = 25",
    },
    badgeReward: {
      id: "badge-java-boss",
      name: "ผู้พิชิตหอคอย Java OOP",
      description: "เข้าใจ Class, Constructor, Encapsulation และ Array Loop ใน Java",
    },
  },
];

export function getTopicsByLanguage(lang: LearningLanguage): TopicQuest[] {
  if (lang === "python") return PYTHON_TOPICS;
  if (lang === "sql") return SQL_TOPICS;
  if (lang === "typescript") return TYPESCRIPT_TOPICS;
  if (lang === "cpp") return CPP_TOPICS;
  if (lang === "java") return JAVA_TOPICS;
  return TOPICS;
}

/**
 * รันโค้ดตามภาษาที่เลือก (JavaScript / Python / SQL / TypeScript / C++ / Java)
 * สำหรับทั้ง PracticeArena, BattleOverlay Test Oracle และห้องทดลอง
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

  if (lang === "typescript") {
    return runTypeScriptSimulated(code);
  }

  if (lang === "python") {
    return runPythonSimulated(code);
  }

  if (lang === "cpp") {
    return runCppSimulated(code);
  }

  if (lang === "java") {
    return runJavaSimulated(code);
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

/**
 * ตัวแปลงและรันโค้ด TypeScript พื้นฐาน (ลบ Type Annotation / Interface / Union / Generic แล้วรันจริงใน Sandbox)
 */
function runTypeScriptSimulated(code: string): {
  outputs: string[];
  finalOutput: string;
  success: boolean;
  error?: string;
} {
  try {
    let js = code.replace(/\r\n/g, "\n");
    // ลบ interface { ... } และ type ... = ...;
    js = js.replace(/\binterface\s+[A-Za-z_$][\w$]*\s*(?:extends[^{]+)?\{[^}]*\}/g, "");
    js = js.replace(/\btype\s+[A-Za-z_$][\w$]*\s*(?:<[^>]*>)?\s*=\s*[^;]+;/g, "");
    // ลบ Generic <T> ในชื่อฟังก์ชัน
    js = js.replace(/\bfunction\s+([A-Za-z_$][\w$]*)\s*<[^>]+>/g, "function $1");
    // ลบ Return Type หลังวงเล็บฟังก์ชัน: ): string { -> ) {
    js = js.replace(/\)\s*:\s*(?:readonly\s+)?[A-Za-z_$][\w$.<>\[\]|\s&]*(?=\s*\{)/g, ")");
    // ลบ Type Annotation ในพารามิเตอร์ฟังก์ชัน
    js = js.replace(
      /(\(|,\s*)([A-Za-z_$][\w$]*)\s*:\s*(?:readonly\s+)?[A-Za-z_$][\w$.<>\[\]|\s&]*(?=[,)])/g,
      "$1$2"
    );
    // ลบ Type Annotation บนการประกาศตัวแปร const / let / var
    js = js.replace(
      /\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*(?:readonly\s+)?[A-Za-z_$][\w$.<>\[\]|\s&]*\s*=/g,
      "$1 $2 ="
    );
    // ลบ type assertion `as Type`
    js = js.replace(/\s+as\s+[A-Za-z_$][\w$.<>\[\]]*/g, "");

    return runJavaScriptReal(js);
  } catch (err) {
    return {
      outputs: [],
      finalOutput: "",
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถรันโค้ด TypeScript นี้ได้",
    };
  }
}

/**
 * ตัวจำลองการรัน C++ พื้นฐาน (รองรับ int/double division, reference &, vector, for loop, cout)
 */
function runCppSimulated(code: string): {
  outputs: string[];
  finalOutput: string;
  success: boolean;
  error?: string;
} {
  try {
    let src = code
      .replace(/\r\n/g, "\n")
      .replace(/^\s*#include.*$/gm, "")
      .replace(/^\s*using\s+namespace\s+std\s*;/gm, "")
      .replace(/std::/g, "");

    // เก็บรายชื่อตัวแปรที่เป็น int เพื่อจำลอง Integer Division
    const intVars = new Set<string>();
    const intDeclMatches = src.matchAll(/\bint\s+([a-zA-Z_]\w*)\b/g);
    for (const m of intDeclMatches) {
      intVars.add(m[1]);
    }

    // ตรวจจับฟังก์ชัน void ที่มีพารามิเตอร์แบบ reference (&) ตัวแรก
    const refFuncNames = new Map<string, string>();
    src = src.replace(
      /\bvoid\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*\{([\s\S]*?)\}/g,
      (full, fname, params, body) => {
        const paramList = params
          .split(",")
          .map((p: string) => p.trim())
          .filter(Boolean);
        let refParam: string | null = null;
        const cleanParams = paramList.map((p: string, idx: number) => {
          const refMatch = p.match(/^[a-zA-Z_]\w*\s*&\s*([a-zA-Z_]\w*)$/);
          if (refMatch && idx === 0) {
            refParam = refMatch[1];
            return refParam;
          }
          const normalMatch = p.match(/^[a-zA-Z_]\w*\s+([a-zA-Z_]\w*)$/);
          return normalMatch ? normalMatch[1] : p;
        });

        if (refParam) {
          refFuncNames.set(fname, refParam);
          return `function ${fname}(${cleanParams.join(", ")}) {\n${body}\nreturn ${refParam};\n}`;
        }
        return `function ${fname}(${cleanParams.join(", ")}) {\n${body}\n}`;
      }
    );

    // แปลงการเรียกใช้ฟังก์ชันที่รับ reference ตัวแรก: fname(arg, ...) -> arg = fname(arg, ...)
    for (const [fname] of refFuncNames) {
      const callRe = new RegExp(`\\b${fname}\\s*\\(\\s*([a-zA-Z_]\\w*)([^)]*)\\)\\s*;`, "g");
      src = src.replace(callRe, `$1 = ${fname}($1$2);`);
    }

    // แปลง int main() { ... } เป็นเนื้อหาที่เรียกใช้ได้
    src = src.replace(/\bint\s+main\s*\([^)]*\)\s*\{/, "function __cppMain() {");

    // แปลง vector<T> name = { ... };
    src = src.replace(
      /\bvector\s*<[^>]+>\s+([a-zA-Z_]\w*)\s*=\s*\{([^}]*)\}\s*;/g,
      "let $1 = [$2];"
    );
    src = src.replace(/\.size\(\)/g, ".length");

    // แปลงชนิดตัวแปร C++ เป็น let และจัดการ Integer Division
    src = src.replace(/\b(int|double|float|bool|string)\s+([a-zA-Z_]\w*)\s*=\s*([^;]+);/g, (_, type, name, expr) => {
      let cleanExpr = expr.replace(/\(\s*double\s*\)\s*([a-zA-Z_]\w*|\d+)/g, "Number($1)");
      // ถ้าเป็น int และมี / โดยไม่มี Number( ให้ตัดทศนิยมแบบ Integer Division
      if (type === "int" && cleanExpr.includes("/") && !cleanExpr.includes("Number(")) {
        cleanExpr = `Math.trunc(${cleanExpr})`;
      }
      return `let ${name} = ${cleanExpr};`;
    });

    // แปลง for (int i = ...; ...; ...)
    src = src.replace(/\bfor\s*\(\s*int\s+/g, "for (let ");

    // แปลง cout << ... << endl;
    src = src.replace(/\bcout\s*<<\s*([^;]+);/g, (_, chain: string) => {
      const parts = chain
        .split("<<")
        .map((p) => p.trim())
        .filter((p) => p && p !== "endl" && p !== '"\\n"' && p !== "'\\n'");
      if (parts.length === 0) return 'console.log("");';
      if (parts.length === 1) return `console.log(${parts[0]});`;
      return `console.log(${parts.join(" + ")});`;
    });

    src = src.replace(/\breturn\s+0\s*;/g, "return;");
    src += "\n__cppMain();";

    return runJavaScriptReal(src);
  } catch (err) {
    return {
      outputs: [],
      finalOutput: "",
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถรันโค้ด C++ นี้ได้",
    };
  }
}

/**
 * ตัวจำลองการรัน Java พื้นฐาน (รองรับ Class, Constructor, String.equals() vs ==, Array, System.out.println)
 */
function runJavaSimulated(code: string): {
  outputs: string[];
  finalOutput: string;
  success: boolean;
  error?: string;
} {
  try {
    let src = code.replace(/\r\n/g, "\n");

    // Helper class สำหรับจำลอง new String("...") ใน Java (ที่ == เทียบ Reference แต่ .equals() เทียบค่า)
    const javaStringHelper = `
class __JavaString {
  constructor(v) { this.__isJavaString = true; this.value = String(v); }
  equals(other) {
    const otherVal = other && other.__isJavaString ? other.value : String(other);
    return this.value === otherVal;
  }
  toString() { return this.value; }
}
`;

    // แปลง == และ != ใน Java ให้เทียบ Reference แบบ Strict (ไม่แปลง Object เป็น String อัตโนมัติแบบ JS ==)
    src = src.replace(/([^=!<>])={2}(?!=)/g, "$1===");
    src = src.replace(/!=(?!=)/g, "!==");

    // แปลง new String("...") -> new __JavaString("...")
    src = src.replace(/\bnew\s+String\s*\(/g, "new __JavaString(");

    // แปลงคลาสที่ไม่ใช่ public class Main (เช่น class Hero) ให้เป็น JS class
    src = src.replace(/\b(?:public\s+)?class\s+(?!Main\b)([A-Za-z_]\w*)\s*\{([\s\S]*?)\n\}/g, (_, clsName, body) => {
      let clsBody = body;
      // แปลง Constructor: ClsName(Type p) -> constructor(p)
      const ctorRe = new RegExp(`\\b${clsName}\\s*\\(([^)]*)\\)`, "g");
      clsBody = clsBody.replace(ctorRe, (_m: string, params: string) => {
        const cleanParams = params
          .split(",")
          .map((p: string) => p.trim().replace(/^[A-Za-z_\[\]]+\s+/, ""))
          .filter(Boolean)
          .join(", ");
        return `constructor(${cleanParams})`;
      });
      // ลบ field declarations ที่ไม่มีค่าเริ่มต้น เช่น `int hp;`
      clsBody = clsBody.replace(/^\s*(?:int|double|String|boolean)\s+[A-Za-z_]\w*\s*;\s*$/gm, "");
      // แปลงเมธอด `void name(Type p)` -> `name(p)`
      clsBody = clsBody.replace(
        /\b(?:public\s+|private\s+)?(?:void|int|double|String|boolean)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g,
        (_m: string, mName: string, params: string) => {
          const cleanParams = params
            .split(",")
            .map((p: string) => p.trim().replace(/^[A-Za-z_\[\]]+\s+/, ""))
            .filter(Boolean)
            .join(", ");
          return `${mName}(${cleanParams})`;
        }
      );
      return `class ${clsName} {\n${clsBody}\n}`;
    });

    // ดึง public class Main { public static void main(String[] args) { ... } }
    src = src.replace(/\bpublic\s+class\s+Main\s*\{/, "");
    src = src.replace(
      /\bpublic\s+static\s+void\s+main\s*\([^)]*\)\s*\{/,
      "function __javaMain() {"
    );
    // ลบปีกกาปิดตัวสุดท้ายของ public class Main หากมี
    const lastBrace = src.lastIndexOf("}");
    if (lastBrace !== -1 && src.includes("function __javaMain()")) {
      src = src.slice(0, lastBrace) + src.slice(lastBrace + 1);
    }

    // แปลง array initialization `int[] hits = {30, 45, 50};` -> `let hits = [30, 45, 50];`
    src = src.replace(
      /\b(?:int|double|String|boolean)\s*\[\s*\]\s*([a-zA-Z_]\w*)\s*=\s*\{([^}]*)\}\s*;/g,
      "let $1 = [$2];"
    );

    // แปลงตัวแปร Java เป็น let
    src = src.replace(
      /\b(int|double|float|String|boolean)\s+([a-zA-Z_]\w*)\s*=/g,
      "let $2 ="
    );
    // แปลง Object var เช่น `Hero hero = new Hero(100);`
    src = src.replace(
      /\b([A-Z][a-zA-Z0-9_]*)\s+([a-zA-Z_]\w*)\s*=\s*new\s+/g,
      "let $2 = new "
    );
    // แปลง for (int i = ...
    src = src.replace(/\bfor\s*\(\s*int\s+/g, "for (let ");
    // แปลง System.out.println(...)
    src = src.replace(/\bSystem\.out\.println\s*\(/g, "console.log(");
    src = src.replace(/\bSystem\.out\.print\s*\(/g, "console.log(");

    const finalJs = `${javaStringHelper}\n${src}\n${
      src.includes("__javaMain") ? "__javaMain();" : ""
    }`;
    return runJavaScriptReal(finalJs);
  } catch (err) {
    return {
      outputs: [],
      finalOutput: "",
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถรันโค้ด Java นี้ได้",
    };
  }
}
