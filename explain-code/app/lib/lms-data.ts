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
    return JSON.parse(raw);
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
    return JSON.parse(raw);
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
