import {
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
  CodeExplanation,
} from "./supabase";

export const LMS_COURSES_STORAGE_KEY = "explain_code_lms_courses_v1";
export const LMS_LESSONS_STORAGE_KEY = "explain_code_lms_lessons_v1";
export const LMS_ENROLLMENTS_STORAGE_KEY = "explain_code_lms_enrollments_v1";
export const LMS_PROGRESS_STORAGE_KEY = "explain_code_lms_progress_v1";
export const LMS_HISTORY_STORAGE_KEY = "explain_code_explanations_history_v1";
export const LMS_UNLOCKED_PRIVATE_COURSES_KEY =
  "explain_code_unlocked_private_courses_v1";

export function isCoursePublic(course: Course): boolean {
  if (course.visibility === "private") return false;
  if (course.visibility === "public") return true;
  return Boolean(course.is_published);
}

export function loadUnlockedPrivateCourseIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LMS_UNLOCKED_PRIVATE_COURSES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function unlockPrivateCourseId(courseId: string): string[] {
  if (typeof window === "undefined" || !courseId) return [];
  const current = loadUnlockedPrivateCourseIds();
  if (current.includes(courseId)) return current;
  const updated = [courseId, ...current];
  try {
    localStorage.setItem(
      LMS_UNLOCKED_PRIVATE_COURSES_KEY,
      JSON.stringify(updated)
    );
  } catch {
    // ignore
  }
  return updated;
}

export const INITIAL_COURSES: Course[] = [
  {
    id: "course-js-fundamentals",
    teacher_id: "tch-1",
    teacher_name: "ครูสมชาย ใจดี",
    title: "พื้นฐานการอ่านและแกะโค้ด JavaScript สำหรับยุค AI",
    description:
      "ฝึกอ่านโค้ดที่ AI เขียนให้เข้าใจทะลุปรุโปร่ง ตั้งแต่ตัวแปร เงื่อนไข if/else การวนซ้ำ ไปจนถึงฟังก์ชัน ตามหลัก Block Model",
    join_code: "JS2026",
    level: "beginner",
    is_published: true,
    created_at: "2026-11-10T08:00:00.000Z",
    updated_at: "2026-11-10T08:00:00.000Z",
  },
  {
    id: "course-async-debugging",
    teacher_id: "tch-1",
    teacher_name: "ครูสมชาย ใจดี",
    title: "จับบั๊กโค้ด AI: Array, Function และ Async/Await",
    description:
      "เรียนรู้วิธีไล่ค่าตัวแปรใน Array, การส่งค่าเข้า-ออกฟังก์ชัน และการตรวจสอบบั๊กยอดฮิตที่มักเกิดเมื่อสั่ง AI เขียนโค้ด",
    join_code: "AI2026",
    level: "intermediate",
    is_published: true,
    created_at: "2026-11-10T09:00:00.000Z",
    updated_at: "2026-11-10T09:00:00.000Z",
  },
  {
    id: "course-python-fundamentals",
    teacher_id: "tch-1",
    teacher_name: "ดร.นภา วิทยาการข้อมูล",
    title: "พื้นฐาน Python สำหรับการอ่านโค้ด AI และวิเคราะห์ข้อมูล",
    description:
      "เข้าใจโครงสร้างการย่อหน้า (Indentation), เงื่อนไข if/elif/else, ลูป for ... in range() และการจัดการ List ในภาษา Python",
    join_code: "PY2026",
    level: "beginner",
    is_published: true,
    created_at: "2026-11-10T10:00:00.000Z",
    updated_at: "2026-11-10T10:00:00.000Z",
  },
  {
    id: "course-sql-fundamentals",
    teacher_id: "tch-1",
    teacher_name: "อ.กิตติ ระบบฐานข้อมูล",
    title: "การอ่านและตรวจสอบคำสั่ง SQL สำหรับดึงข้อมูลเชิงลึก",
    description:
      "ฝึกแกะลำดับการทำงานจริงของ SELECT, FROM, WHERE, GROUP BY, HAVING และ ORDER BY เพื่อให้ตรวจคำสั่ง SQL ที่ AI สร้างได้อย่างแม่นยำ",
    join_code: "SQL2026",
    level: "beginner",
    is_published: true,
    created_at: "2026-11-10T11:00:00.000Z",
    updated_at: "2026-11-10T11:00:00.000Z",
  },
  {
    id: "course-ts-fundamentals",
    teacher_id: "tch-1",
    teacher_name: "อ.ธนากร เว็บสถาปัตย์",
    title: "TypeScript ฉบับนักแกะโค้ด: Interface, Union และ Generics",
    description:
      "ฝึกอ่านสัญญาข้อมูล (interface), การบีบชนิดข้อมูล (Type Narrowing) และ Generic <T> เพื่อตรวจจับข้อผิดพลาดในโค้ดเว็บที่ AI สร้าง",
    join_code: "TS2026",
    level: "beginner",
    is_published: true,
    created_at: "2026-11-10T12:00:00.000Z",
    updated_at: "2026-11-10T12:00:00.000Z",
  },
  {
    id: "course-cpp-fundamentals",
    teacher_id: "tch-1",
    teacher_name: "ดร.ปวีณา ระบบคอมพิวเตอร์",
    title: "พื้นฐาน C++: การหารจำนวนเต็ม, Reference (&) และ std::vector",
    description:
      "เจาะลึกกับดัก C++ ที่พบบ่อยในโค้ดจาก AI ทั้ง Integer Division, Pass-by-Reference (&) และขอบเขตดัชนีใน vector",
    join_code: "CPP2026",
    level: "intermediate",
    is_published: true,
    created_at: "2026-11-10T13:00:00.000Z",
    updated_at: "2026-11-10T13:00:00.000Z",
  },
  {
    id: "course-java-fundamentals",
    teacher_id: "tch-1",
    teacher_name: "อ.ภานุพงศ์ วิศวกรรมซอฟต์แวร์",
    title: "Java & OOP: คลาส, String.equals() และการคุมสถานะ Object",
    description:
      "ฝึกอ่านโครงสร้าง Class, เมธอด main, ความต่างระหว่าง == กับ .equals() และ การออกแบบเมธอดเปลี่ยนสถานะใน OOP",
    join_code: "JAVA2026",
    level: "beginner",
    is_published: true,
    created_at: "2026-11-10T14:00:00.000Z",
    updated_at: "2026-11-10T14:00:00.000Z",
  },
];

export const INITIAL_LESSONS: Lesson[] = [
  {
    id: "lesson-js-1",
    course_id: "course-js-fundamentals",
    title: "บทที่ 1: ตัวแปรและการไหลของค่าข้อมูล (Variables & State)",
    content_md: `### ทำไมต้องเข้าใจตัวแปรเวลาอ่านโค้ด AI?
เวลาเราสั่ง AI ให้เขียนโปรแกรมคำนวณ เช่น คิดราคาสินค้าหรือคำนวณเกรด สิ่งแรกที่ต้องมองหาคือ **ตัวแปร (Variables)** ว่าแต่ละบรรทัดเก็บค่าอะไร และค่าเปลี่ยนไปอย่างไร

- \`let\` ใช้ประกาศตัวแปรที่เปลี่ยนแปลงค่าได้ในภายหลัง (เช่น คะแนนสะสม หรือราคารวม)
- \`const\` ใช้ประกาศค่าคงที่ที่ไม่เปลี่ยนค่าตลอดการทำงาน
- เครื่องหมาย \`=\` ในการเขียนโปรแกรมไม่ใช่การเปรียบเทียบเท่ากัน แต่คือ **การนำค่าฝั่งขวามาเก็บลงในตัวแปรฝั่งซ้าย**`,
    code_example: `let price = 120;
let quantity = 3;
let discount = 40;
let netTotal = price * quantity - discount;
console.log("ยอดสุทธิ =", netTotal);`,
    programming_language: "javascript",
    external_url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps/Variables",
    video_url: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
    quiz_questions: [
      {
        id: "q-js-1-1",
        question: "หลังจากรันโค้ดตัวอย่างเสร็จ ตัวแปร netTotal จะมีค่าเท่ากับเท่าไร?",
        options: ["320", "360", "240", "120"],
        correctIndex: 0,
        explanation: "เพราะ 120 * 3 ได้ 360 จากนั้นลบส่วนลด 40 จึงเหลือ 320",
      },
      {
        id: "q-js-1-2",
        question: "หากต้องการเก็บค่าอัตราภาษีที่ไม่ต้องการให้ส่วนอื่นของโปรแกรมเผลอเปลี่ยนค่า ควรใช้คำสั่งใด?",
        options: ["const", "let", "var", "function"],
        correctIndex: 0,
        explanation: "const ใช้สำหรับประกาศค่าคงที่ที่ไม่สามารถกำหนดค่าทับใหม่ได้",
      },
    ],
    order_index: 1,
    is_published: true,
    created_at: "2026-11-10T08:10:00.000Z",
    updated_at: "2026-11-10T08:10:00.000Z",
  },
  {
    id: "lesson-js-2",
    course_id: "course-js-fundamentals",
    title: "บทที่ 2: การตัดสินใจด้วยเงื่อนไข if / else",
    content_md: `### การอ่านทางแยกของโปรแกรม (Conditionals)
เมื่อโปรแกรมต้องตัดสินใจ เช่น ตรวจว่าสอบผ่านหรือไม่ หรือได้รับส่วนลดพิเศษหรือเปล่า โค้ดจะใช้บล็อก \`if (...) { ... } else { ... }\`

**เทคนิคการอ่านตาม Block Model:**
1. ดู **เงื่อนไขในวงเล็บ** ก่อนว่าเปรียบเทียบอะไร (เช่น \`>= 80\` หรือ \`> 50\`)
2. ลองแทนค่าตัวแปรจริงลงไปเพื่อดูว่าเป็น \`true\` หรือ \`false\`
3. ถ้าเป็น \`true\` ให้ทำเฉพาะปีกกาแรกแล้วข้าม \`else\` ทันที`,
    code_example: `let score = 75;
let grade = "F";

if (score >= 80) {
  grade = "A";
} else if (score >= 70) {
  grade = "B";
} else if (score >= 50) {
  grade = "C";
}

console.log("เกรดที่ได้คือ:", grade);`,
    programming_language: "javascript",
    external_url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/conditionals",
    video_url: null,
    quiz_questions: [
      {
        id: "q-js-2-1",
        question: "เมื่อ score = 75 โปรแกรมจะพิมพ์เกรดอะไรออกทางหน้าจอ?",
        options: ["เกรด A", "เกรด B", "เกรด C", "เกรด F"],
        correctIndex: 1,
        explanation: "75 ไม่ถึง 80 จึงข้าม if แรก มาตรงกับเงื่อนไข else if (score >= 70) จึงได้เกรด B",
      },
    ],
    order_index: 2,
    is_published: true,
    created_at: "2026-11-10T08:20:00.000Z",
    updated_at: "2026-11-10T08:20:00.000Z",
  },
  {
    id: "lesson-js-3",
    course_id: "course-js-fundamentals",
    title: "บทที่ 3: การวนซ้ำด้วยลูป for และตัวแปรสะสมค่า",
    content_md: `### อ่านลูปอย่างไรไม่ให้งง?
ลูป \`for\` ประกอบด้วย 3 ส่วนสำคัญในวงเล็บ:
1. **จุดเริ่มต้น**: เช่น \`let i = 1\`
2. **เงื่อนไขทำต่อ**: เช่น \`i <= 4\` (ถ้ายังจริง ให้ทำในปีกกา)
3. **การขยับค่าหลังจบรอบ**: เช่น \`i++\` (เพิ่มค่าทีละ 1)

เวลาไล่โค้ด แนะนำให้เขียนตารางสั้นๆ ว่า **รอบที่ 1, รอบที่ 2, ...** ตัวแปรสะสมค่าเปลี่ยนเป็นเท่าไร`,
    code_example: `let sum = 0;
for (let i = 1; i <= 4; i++) {
  sum += i * 10;
}
console.log("ผลรวมสะสม =", sum);`,
    programming_language: "javascript",
    external_url: null,
    video_url: null,
    quiz_questions: [
      {
        id: "q-js-3-1",
        question: "เมื่อลูปทำงานครบทั้ง 4 รอบ ค่าของ sum จะเป็นเท่าใด?",
        options: ["40", "60", "100", "120"],
        correctIndex: 2,
        explanation: "บวกสะสม 10 + 20 + 30 + 40 = 100",
      },
    ],
    order_index: 3,
    is_published: true,
    created_at: "2026-11-10T08:30:00.000Z",
    updated_at: "2026-11-10T08:30:00.000Z",
  },
  {
    id: "lesson-ai-1",
    course_id: "course-async-debugging",
    title: "บทที่ 1: จับบั๊กขอบเขต Array (Off-by-One Error)",
    content_md: `### บั๊กยอดฮิตที่ต้องระวังเมื่ออ่านโค้ด Array
ใน JavaScript และภาษาส่วนใหญ่ สมาชิกตัวแรกของ Array เริ่มที่ตำแหน่ง **Index 0** และตัวสุดท้ายคือ **\`array.length - 1\`**

หากลูปเขียนเงื่อนไขเป็น \`i <= array.length\` แทนที่จะเป็น \`i < array.length\` รอบสุดท้ายจะดึงค่า \`undefined\` ออกมาคำนวณ ทำให้ผลลัพธ์กลายเป็น \`NaN\` ทันที!`,
    code_example: `const scores = [10, 20, 30];
let total = 0;

// สังเกตการใช้ i < scores.length ที่ถูกต้อง
for (let i = 0; i < scores.length; i++) {
  total += scores[i];
}
const average = total / scores.length;
console.log("ค่าเฉลี่ย =", average);`,
    programming_language: "javascript",
    external_url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
    video_url: null,
    quiz_questions: [
      {
        id: "q-ai-1-1",
        question: "ถ้าเปลี่ยนเงื่อนไขลูปเป็น i <= scores.length จะเกิดอะไรขึ้นในรอบที่ i = 3?",
        options: [
          "scores[3] มีค่าเป็น undefined ทำให้ total กลายเป็น NaN",
          "โปรแกรมทำงานปกติและได้ค่าเฉลี่ยเท่าเดิม",
          "โปรแกรมข้ามรอบที่ 3 อัตโนมัติ",
          "scores[3] มีค่าเป็น 0",
        ],
        correctIndex: 0,
        explanation: "เพราะ scores มีสมาชิก 3 ตัว (index 0, 1, 2) เมื่อเข้าถึง scores[3] จะได้ undefined พอนำไปบวกกับตัวเลขจึงได้ NaN",
      },
    ],
    order_index: 1,
    is_published: true,
    created_at: "2026-11-10T09:10:00.000Z",
    updated_at: "2026-11-10T09:10:00.000Z",
  },
  {
    id: "lesson-py-1",
    course_id: "course-python-fundamentals",
    title: "บทที่ 1: โครงสร้างการย่อหน้า (Indentation) และ if / elif / else ใน Python",
    content_md: `### จุดเด่นของ Python ที่ต้องสังเกตเวลาอ่านโค้ด
ในภาษา Python จะไม่ใช้เครื่องหมายปีกกา \`{ }\` เพื่อแบ่งขอบเขตบล็อกคำสั่ง แต่ใช้ **เครื่องหมายโคลอน (\`:\`)** คู่กับ **การย่อหน้า (Indentation)**

- ทุกบรรทัดที่ย่อหน้าเข้ามาในระดับเดียวกัน คือคำสั่งที่อยู่ในบล็อกเดียวกัน
- ใช้ \`elif\` แทนคำว่า \`else if\`
- ใช้ \`print(...)\` เพื่อแสดงผลออกทางหน้าจอ`,
    code_example: `score = 82
if score >= 80:
    grade = "A"
elif score >= 70:
    grade = "B"
else:
    grade = "C"
print("เกรดที่ได้ =", grade)`,
    programming_language: "python",
    external_url: "https://docs.python.org/3/tutorial/controlflow.html",
    video_url: null,
    quiz_questions: [
      {
        id: "q-py-1-1",
        question: "ในภาษา Python สิ่งใดใช้กำหนดขอบเขตว่าคำสั่งบรรทัดนั้นอยู่ในบล็อก if?",
        options: [
          "การย่อหน้า (Indentation) ใต้บรรทัดที่ลงท้ายด้วยเครื่องหมาย :",
          "เครื่องหมายปีกกา { }",
          "เครื่องหมายอัฒภาค (Semicolon ;)",
          "คำสั่ง end if",
        ],
        correctIndex: 0,
        explanation: "Python ใช้การย่อหน้า (Indentation) เพื่อระบุขอบเขตบล็อกคำสั่ง",
      },
    ],
    order_index: 1,
    is_published: true,
    created_at: "2026-11-10T10:10:00.000Z",
    updated_at: "2026-11-10T10:10:00.000Z",
  },
  {
    id: "lesson-py-2",
    course_id: "course-python-fundamentals",
    title: "บทที่ 2: การวนซ้ำด้วย for ... in range() และข้อควรระวังเรื่องขอบเขต",
    content_md: `### ระวังบั๊กจาก range(start, stop)
เวลาสั่ง AI เขียนลูปใน Python มักจะเจอคำสั่ง \`range(start, stop)\`
- **จุดสำคัญ**: \`range(1, 5)\` จะสร้างตัวเลข \`1, 2, 3, 4\` เท่านั้น (**ไม่รวมเลข 5!**)
- หากต้องการวนตั้งแต่ 1 ถึง 5 ต้องเขียน \`range(1, 6)\``,
    code_example: `total = 0
for i in range(1, 5):
    total += i * 10
print("ผลรวม =", total)`,
    programming_language: "python",
    external_url: null,
    video_url: null,
    quiz_questions: [
      {
        id: "q-py-2-1",
        question: "คำสั่ง range(1, 5) จะวนลูปทั้งหมดกี่รอบ?",
        options: ["4 รอบ (i = 1, 2, 3, 4)", "5 รอบ (i = 1 ถึง 5)", "6 รอบ", "3 รอบ"],
        correctIndex: 0,
        explanation: "เพราะค่า stop (5) จะไม่ถูกรวม จึงวนเฉพาะ 1, 2, 3, 4 รวม 4 รอบ",
      },
    ],
    order_index: 2,
    is_published: true,
    created_at: "2026-11-10T10:20:00.000Z",
    updated_at: "2026-11-10T10:20:00.000Z",
  },
  {
    id: "lesson-sql-1",
    course_id: "course-sql-fundamentals",
    title: "บทที่ 1: ลำดับการทำงานจริงของ SELECT, FROM, WHERE และ ORDER BY",
    content_md: `### เวลาอ่าน SQL อย่าอ่านจากบนลงล่างอย่างเดียว!
แม้เราจะเขียน \`SELECT\` ไว้บรรทัดแรก แต่เวลาฐานข้อมูลทำงานจริง มันจะประมวลผลตามลำดับนี้:
1. **\`FROM\`**: ไปดึงตารางข้อมูลตั้งต้นมาก่อน
2. **\`WHERE\`**: กรองเฉพาะแถวที่ตรงเงื่อนไข
3. **\`SELECT\`**: เลือกเฉพาะคอลัมน์ที่ต้องการแสดงผล
4. **\`ORDER BY\`**: เรียงลำดับผลลัพธ์จากน้อยไปมาก (\`ASC\`) หรือมากไปน้อย (\`DESC\`)`,
    code_example: `SELECT name, price
FROM products
WHERE price >= 500
ORDER BY price DESC;`,
    programming_language: "sql",
    external_url: "https://www.postgresql.org/docs/current/tutorial-select.html",
    video_url: null,
    quiz_questions: [
      {
        id: "q-sql-1-1",
        question: "ในคำสั่ง SQL ข้างต้น ส่วนใดถูกประมวลผลเพื่อคัดแถวข้อมูลออกก่อนจะนำมาเรียงลำดับ?",
        options: ["WHERE price >= 500", "SELECT name, price", "ORDER BY price DESC", "ASC"],
        correctIndex: 0,
        explanation: "ฐานข้อมูลจะดึงตารางจาก FROM แล้วกรองแถวด้วย WHERE ก่อนจะเลือกคอลัมน์และเรียงลำดับ",
      },
    ],
    order_index: 1,
    is_published: true,
    created_at: "2026-11-10T11:10:00.000Z",
    updated_at: "2026-11-10T11:10:00.000Z",
  },
  {
    id: "lesson-sql-2",
    course_id: "course-sql-fundamentals",
    title: "บทที่ 2: การจัดกลุ่มข้อมูลด้วย GROUP BY และการกรองกลุ่มด้วย HAVING",
    content_md: `### ความต่างของ WHERE กับ HAVING ที่ AI มักเขียนสลับกัน
- **\`WHERE\`**: ใช้กรองข้อมูล **รายแถว** ก่อนการจัดกลุ่ม \`GROUP BY\`
- **\`HAVING\`**: ใช้กรองข้อมูล **ระดับกลุ่ม** หลังจากทำ \`GROUP BY\` และคำนวณฟังก์ชันรวมผล เช่น \`SUM()\`, \`COUNT()\`, \`AVG()\` แล้ว`,
    code_example: `SELECT category, COUNT(*) AS item_count, SUM(price) AS total_price
FROM products
GROUP BY category
HAVING SUM(price) >= 1000;`,
    programming_language: "sql",
    external_url: null,
    video_url: null,
    quiz_questions: [
      {
        id: "q-sql-2-1",
        question: "หากต้องการกรองเฉพาะหมวดหมู่ที่มียอดรวม SUM(price) ตั้งแต่ 1000 ขึ้นไป ต้องใช้คำสั่งใด?",
        options: [
          "HAVING SUM(price) >= 1000",
          "WHERE SUM(price) >= 1000",
          "ORDER BY SUM(price) >= 1000",
          "GROUP BY SUM(price)",
        ],
        correctIndex: 0,
        explanation: "การกรองด้วยฟังก์ชันรวมผล (Aggregate Function) หลัง GROUP BY ต้องใช้ HAVING เสมอ",
      },
    ],
    order_index: 2,
    is_published: true,
    created_at: "2026-11-10T11:20:00.000Z",
    updated_at: "2026-11-10T11:20:00.000Z",
  },
  {
    id: "lesson-ts-1",
    course_id: "course-ts-fundamentals",
    title: "บทที่ 1: Interface และ Type Annotations ใน TypeScript",
    content_md: `### ทำไม TypeScript จึงช่วยลดบั๊กจากโค้ด AI ได้มาก?
ใน JavaScript ธรรมดา เราสามารถส่งค่าผิดชนิดเข้าไปคำนวณได้โดยไม่รู้ตัวจนกว่าโปรแกรมจะพังตอนรันจริง แต่ **TypeScript** จะตรวจชนิดข้อมูลตั้งแต่ก่อนรัน!

- \`interface\` ใช้กำหนดโครงสร้างฟิลด์และชนิดข้อมูลของ Object
- \`: number\`, \`: string\` ใช้ระบุชนิดข้อมูลของตัวแปรและพารามิเตอร์
- ตัวตรวจสอบ (Type Checker) จะแจ้งเตือนทันทีหากส่งค่าผิดชนิด`,
    code_example: `interface Product {
  name: string;
  price: number;
}
const item: Product = { name: "Mouse", price: 450 };
const qty: number = 2;
const total: number = item.price * qty;
console.log(total);`,
    programming_language: "typescript",
    external_url: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
    video_url: null,
    quiz_questions: [
      {
        id: "q-ts-1-1",
        question: "คำสั่ง interface Product ใน TypeScript มีหน้าที่หลักอย่างไร?",
        options: [
          "กำหนดโครงสร้าง property และชนิดข้อมูลของ Object เพื่อตรวจสอบก่อนรัน",
          "แปลงโค้ดให้กลายเป็นภาษา C++",
          "สร้างตารางในฐานข้อมูล SQL อัตโนมัติ",
          "บังคับให้ตัวแปรทุกตัวเปลี่ยนค่าได้ตลอดเวลา",
        ],
        correctIndex: 0,
        explanation: "interface คือสัญญาโครงสร้างข้อมูลระดับ Compile-time ที่ช่วยตรวจจับฟิลด์ที่หายไปหรือชนิดข้อมูลที่ผิด",
      },
      {
        id: "q-ts-1-2",
        question: "เมื่อรันโค้ดตัวอย่างข้างต้น console.log(total) จะแสดงค่าใด?",
        options: ["900", "450", "2", "452"],
        correctIndex: 0,
        explanation: "item.price (450) * qty (2) = 900",
      },
    ],
    order_index: 1,
    is_published: true,
    created_at: "2026-11-10T12:10:00.000Z",
    updated_at: "2026-11-10T12:10:00.000Z",
  },
  {
    id: "lesson-ts-2",
    course_id: "course-ts-fundamentals",
    title: "บทที่ 2: Union Type, Type Narrowing และ Generic <T>",
    content_md: `### การบีบชนิดข้อมูล (Type Narrowing) และ Generic <T>
เมื่อฟังก์ชันรับค่าได้หลายรูปแบบ เราใช้ **Union Type** เช่น \`"paid" | "pending" | "failed"\` จากนั้นใช้ \`if\` เพื่อแคบชนิดข้อมูลลงอย่างปลอดภัย

- **Generic \`<T>\`** ช่วยให้ฟังก์ชันทำงานกับข้อมูลหลายชนิดโดยยังคงความปลอดภัยของ Type ไว้ครบถ้วน (ดีกว่าการใช้ \`any\`)`,
    code_example: `type Status = "paid" | "pending" | "failed";
function getBadge(status: Status): string {
  if (status === "paid") return "Verified";
  if (status === "pending") return "Waiting";
  return "Retry";
}
console.log(getBadge("pending"));`,
    programming_language: "typescript",
    external_url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html",
    video_url: null,
    quiz_questions: [
      {
        id: "q-ts-2-1",
        question: 'เมื่อเรียก getBadge("pending") โปรแกรมจะพิมพ์ข้อความใด?',
        options: ["Waiting", "Verified", "Retry", "pending"],
        correctIndex: 0,
        explanation: 'ตรงกับเงื่อนไข if (status === "pending") จึงคืนค่า "Waiting"',
      },
    ],
    order_index: 2,
    is_published: true,
    created_at: "2026-11-10T12:20:00.000Z",
    updated_at: "2026-11-10T12:20:00.000Z",
  },
  {
    id: "lesson-cpp-1",
    course_id: "course-cpp-fundamentals",
    title: "บทที่ 1: ชนิดตัวแปรและกับดักการหารจำนวนเต็มใน C++",
    content_md: `### จุดที่ต้องระวังเมื่ออ่านโค้ดคำนวณ C++
ในภาษา C++ ตัวแปรต้องประกาศชนิดชัดเจน เช่น \`int\` (จำนวนเต็ม) หรือ \`double\` (ทศนิยม)

- **กับดัก Integer Division**: หากนำ \`int\` หารด้วย \`int\` เช่น \`7 / 2\` ผลลัพธ์จะถูก **ตัดทศนิยมทิ้งเหลือ 3** ทันที!
- หากต้องการค่าทศนิยม \`3.5\` ต้องแปลงฝั่งหนึ่งเป็น \`double\` เช่น \`(double)total / count\``,
    code_example: `#include <iostream>
using namespace std;

int main() {
    int total = 7;
    int count = 2;
    int avg = total / count;
    cout << avg << endl;
    return 0;
}`,
    programming_language: "cpp",
    external_url: "https://en.cppreference.com/w/cpp/language/operator_arithmetic",
    video_url: null,
    quiz_questions: [
      {
        id: "q-cpp-1-1",
        question: "ใน C++ หาก total = 7 และ count = 2 เป็น int ทั้งคู่ ผลของ total / count คือเท่าไร?",
        options: ["3", "3.5", "4", "2"],
        correctIndex: 0,
        explanation: "การหารจำนวนเต็ม (Integer Division) ใน C++ จะตัดเศษทศนิยมทิ้ง 7 / 2 จึงได้ 3",
      },
    ],
    order_index: 1,
    is_published: true,
    created_at: "2026-11-10T13:10:00.000Z",
    updated_at: "2026-11-10T13:10:00.000Z",
  },
  {
    id: "lesson-cpp-2",
    course_id: "course-cpp-fundamentals",
    title: "บทที่ 2: Pass-by-Reference (&) และ std::vector",
    content_md: `### การส่งตัวแปรเข้าฟังก์ชันด้วย Reference (&)
- \`void addBonus(int hp, int bonus)\`: ส่งแบบ **Pass-by-Value** (คัดลอกค่า) ตัวแปรเดิมใน \`main\` ไม่เปลี่ยน
- \`void addBonus(int& hp, int bonus)\`: ส่งแบบ **Pass-by-Reference** (อ้างอิงกล่องหน่วยความจำเดิม) การแก้ไขในฟังก์ชันจะเปลี่ยนค่าใน \`main\` จริง!`,
    code_example: `#include <iostream>
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
    programming_language: "cpp",
    external_url: "https://en.cppreference.com/w/cpp/container/vector",
    video_url: null,
    quiz_questions: [
      {
        id: "q-cpp-2-1",
        question: "เมื่อใช้ void addBonus(int& hp, int bonus) ค่า hp ที่พิมพ์ใน main จะเป็นเท่าใด?",
        options: ["75", "50", "25", "0"],
        correctIndex: 0,
        explanation: "พารามิเตอร์ int& hp อ้างอิงตัวแปร hp ใน main โดยตรง จึงเปลี่ยนจาก 50 เป็น 75",
      },
    ],
    order_index: 2,
    is_published: true,
    created_at: "2026-11-10T13:20:00.000Z",
    updated_at: "2026-11-10T13:20:00.000Z",
  },
  {
    id: "lesson-java-1",
    course_id: "course-java-fundamentals",
    title: "บทที่ 1: โครงสร้างคลาส Java และกับดัก String.equals() vs ==",
    content_md: `### อ่าน String Comparison ใน Java อย่างไรไม่ให้โดนหลอก?
ใน Java คำสั่ง \`String\` เป็น **Object** ไม่ใช่ Primitive (เช่น \`int\`)
- **\`role == "admin"\`**: เปรียบเทียบ **ตำแหน่งหน่วยความจำ (Reference)** ซึ่งอาจได้ \`false\` แม้ตัวอักษรเหมือนกัน!
- **\`role.equals("admin")\`**: เปรียบเทียบ **เนื้อหาข้อความจริง** ซึ่งเป็นวิธีที่ถูกต้อง`,
    code_example: `public class Main {
    public static void main(String[] args) {
        String role = new String("admin");
        if (role.equals("admin")) {
            System.out.println("Access Granted");
        } else {
            System.out.println("Access Denied");
        }
    }
}`,
    programming_language: "java",
    external_url: "https://docs.oracle.com/javase/tutorial/java/data/comparestrings.html",
    video_url: null,
    quiz_questions: [
      {
        id: "q-java-1-1",
        question: "หากสร้าง String role = new String(\"admin\"); ข้อใดเปรียบเทียบเนื้อหาข้อความได้ถูกต้องใน Java?",
        options: [
          'role.equals("admin")',
          'role == "admin"',
          'role = "admin"',
          'role === "admin"',
        ],
        correctIndex: 0,
        explanation: "ใน Java ต้องใช้ .equals() เพื่อเปรียบเทียบเนื้อหาข้อความของ String Object แทนเครื่องหมาย ==",
      },
    ],
    order_index: 1,
    is_published: true,
    created_at: "2026-11-10T14:10:00.000Z",
    updated_at: "2026-11-10T14:10:00.000Z",
  },
  {
    id: "lesson-java-2",
    course_id: "course-java-fundamentals",
    title: "บทที่ 2: OOP Class, Constructor และการควบคุมสถานะ Object",
    content_md: `### การอ่าน Class และ Object ใน Java
เวลา AI สร้าง Class เช่น \`class Hero\` ให้สังเกต 3 ส่วน:
1. **Fields**: ตัวแปรเก็บสถานะภายใน เช่น \`int hp;\`
2. **Constructor**: เมธอดชื่อเดียวกับคลาส (\`Hero(int startHp)\`) ที่ทำงานตอน \`new Hero(100)\`
3. **Methods**: พฤติกรรมที่อัปเดตสถานะ เช่น \`takeDamage(dmg)\` พร้อมเงื่อนไขป้องกันค่าติดลบ`,
    code_example: `class Hero {
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
    programming_language: "java",
    external_url: "https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html",
    video_url: null,
    quiz_questions: [
      {
        id: "q-java-2-1",
        question: "เมื่อ Hero เริ่มต้นด้วย HP 100 และโดนโจมตี 30, 45, 50 ตามลำดับ ค่า hero.hp สุดท้ายคือเท่าใด?",
        options: ["0", "-25", "25", "100"],
        correctIndex: 0,
        explanation: "100 - 30 = 70, 70 - 45 = 25, จากนั้น 50 > 25 จึงตั้งค่า hp = 0 ไม่ให้ติดลบ",
      },
    ],
    order_index: 2,
    is_published: true,
    created_at: "2026-11-10T14:20:00.000Z",
    updated_at: "2026-11-10T14:20:00.000Z",
  },
];

// ============================================================================
// LocalStorage Sync Helpers (Graceful Client Persistence + Supabase Bridge)
// ============================================================================

export function loadLocalCourses(): Course[] {
  if (typeof window === "undefined") return INITIAL_COURSES;
  try {
    const raw = localStorage.getItem(LMS_COURSES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LMS_COURSES_STORAGE_KEY, JSON.stringify(INITIAL_COURSES));
      return INITIAL_COURSES;
    }
    const parsed: Course[] = JSON.parse(raw);
    const missing = INITIAL_COURSES.filter(
      (ic) => !parsed.some((p) => p.id === ic.id)
    );
    if (missing.length > 0) {
      const merged = [...parsed, ...missing];
      localStorage.setItem(LMS_COURSES_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch {
    return INITIAL_COURSES;
  }
}

export function saveLocalCourses(courses: Course[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LMS_COURSES_STORAGE_KEY, JSON.stringify(courses));
  } catch {
    // ignore
  }
}

export function loadLocalLessons(): Lesson[] {
  if (typeof window === "undefined") return INITIAL_LESSONS;
  try {
    const raw = localStorage.getItem(LMS_LESSONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LMS_LESSONS_STORAGE_KEY, JSON.stringify(INITIAL_LESSONS));
      return INITIAL_LESSONS;
    }
    const parsed: Lesson[] = JSON.parse(raw);
    const missing = INITIAL_LESSONS.filter(
      (il) => !parsed.some((p) => p.id === il.id)
    );
    if (missing.length > 0) {
      const merged = [...parsed, ...missing];
      localStorage.setItem(LMS_LESSONS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch {
    return INITIAL_LESSONS;
  }
}

export function saveLocalLessons(lessons: Lesson[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LMS_LESSONS_STORAGE_KEY, JSON.stringify(lessons));
  } catch {
    // ignore
  }
}

export function loadLocalEnrollments(): Enrollment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LMS_ENROLLMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalEnrollments(enrollments: Enrollment[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LMS_ENROLLMENTS_STORAGE_KEY, JSON.stringify(enrollments));
  } catch {
    // ignore
  }
}

export function loadLocalLessonProgress(): LessonProgress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LMS_PROGRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalLessonProgress(progress: LessonProgress[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LMS_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function loadLocalExplanationsHistory(userId: string): CodeExplanation[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(LMS_HISTORY_STORAGE_KEY);
    const all: CodeExplanation[] = raw ? JSON.parse(raw) : [];
    return all.filter((item) => item.user_id === userId);
  } catch {
    return [];
  }
}

export function appendLocalExplanationHistory(item: CodeExplanation) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LMS_HISTORY_STORAGE_KEY);
    const all: CodeExplanation[] = raw ? JSON.parse(raw) : [];
    const updated = [item, ...all.filter((x) => x.id !== item.id)].slice(0, 100);
    localStorage.setItem(LMS_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function removeLocalExplanationHistory(id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LMS_HISTORY_STORAGE_KEY);
    const all: CodeExplanation[] = raw ? JSON.parse(raw) : [];
    const updated = all.filter((x) => x.id !== id);
    localStorage.setItem(LMS_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}
