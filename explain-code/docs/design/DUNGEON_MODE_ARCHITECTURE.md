# สถาปัตยกรรมต่อยอด: Explain-Code Dungeon Mode

เข้าใจแล้วครับ ฐานที่มีอยู่ค่อนข้างครบและแข็งแรงมาก โดยเฉพาะ **Block Model, PRIMM, Execution Trace, AI Interrogation และ Teacher Analytics** ดังนั้นไม่ควรเริ่มเกมใหม่จากศูนย์ แต่ควรเพิ่ม **Dungeon/Run Layer** ครอบระบบเดิม พร้อมแยก "คะแนนการเล่นเกม" ออกจาก "หลักฐานความเข้าใจ" ให้ชัดเจน

---

## 1. ภาพรวมการต่อยอดจากระบบเดิม

ระบบเดิมยังคงเป็นแกนหลัก:

- **PracticeArena** เป็นพื้นที่ทำกิจกรรม PRIMM และตอบคำถาม
- **Block Model 12 ช่อง** เป็น Learner Model สำหรับประเมินความเข้าใจ
- **codeAnalyzer** เป็นฐานสำหรับสร้าง Trace และ Encounter
- **attempts / attempt_cell_scores / attempt_answers** เป็นหลักฐานการเรียนรู้
- **Teacher Dashboard** ใช้ดูจุดอ่อนและสั่งทบทวน
- **Supabase** เป็นฐานข้อมูลและระบบสิทธิ์

สิ่งที่ต้องเพิ่มมี 4 ส่วนหลัก:

1. **Dungeon Run Service** — ควบคุมแผนที่ ห้อง HP ไอเทม และสถานะรอบเกม
2. **Encounter Planner** — วางแผนกิจกรรมจากโค้ด จุดอ่อนของผู้เล่น และ Knowledge Graph
3. **Concept Graph** — เชื่อมโค้ดกับความรู้พื้นฐาน ข้อเข้าใจผิด และโจทย์ประยุกต์
4. **Learning Evidence Separation** — แยกคะแนนเกมออกจากหลักฐานความเข้าใจ เพื่อไม่ให้ไอเทมหรือดวงในเกมทำให้คะแนนความเข้าใจสูงเกินจริง

แนวทางคือ **เพิ่ม Dungeon Layer ครอบ PracticeArena เดิม ไม่เขียน PracticeArena ใหม่ทั้งหมด**

---

## 2. สถาปัตยกรรมที่เสนอ

```text
Student / Teacher UI
├── QuestMap + DungeonMap
├── DungeonRunScreen
│   ├── Combat / Encounter View
│   ├── Code Trace View
│   ├── QuestionView
│   └── Boss Interrogation
├── PracticeArena
└── TeacherDashboard
              │
              ▼
Application Services
├── DungeonRunService
│   ├── Run lifecycle / Seed / Map / Rewards
│   └── Save and resume run
├── EncounterService
│   ├── Predict / Trace / Explain
│   ├── Debug / Modify / Transfer
│   └── Resolve game effects
├── LearnerModelService
│   └── Block Model evidence + concept mastery + misconception history
├── DungeonPlanner
│   └── สร้างรอบเกมจากโค้ด จุดอ่อน และหลักสูตร
└── Attempt Service
    └── บันทึก Game Score แยกจาก Learning Evidence

Infrastructure
├── Supabase / PostgreSQL / RLS
├── IndexedDB + Sync Queue สำหรับ Offline
├── JavaScript Static Analyzer + Execution Tracer
├── Gemini Evaluation ผ่าน Server Route
└── Content Repository เริ่มจาก TypeScript ก่อนย้ายไป CMS
```

หลักสำคัญคือ `DungeonRunService` ไม่ควรเรียก Supabase หรือ Gemini โดยตรงจาก UI แต่ควรทำงานผ่าน service กลาง เพื่อให้ทดสอบการสร้างดันเจี้ยนและการให้คะแนนแยกจาก React ได้

---

## 3. Dungeon Planner: หัวใจของระบบใหม่

ดันเจี้ยนไม่ควรถูกสร้างจากโค้ดที่นำเข้าเพียงอย่างเดียว แต่ควรรวมข้อมูล 4 ส่วน:

```text
DungeonPlan =
    LearnerWeaknesses
  + CurriculumPrerequisites
  + ImportedCodeFeatures
  + TransferOpportunities
```

### แหล่งกำเนิดกิจกรรม

| สัดส่วนเริ่มต้น | แหล่งเนื้อหา | ตัวอย่าง |
|---|---|---|
| 40% | โค้ดของนักเรียน | ทำนาย output, trace ค่าตัวแปร, อธิบายฟังก์ชัน |
| 30% | พื้นฐานที่เกี่ยวข้อง | scope, accumulator, boundary, ข้อเข้าใจผิด |
| 30% | การประยุกต์ | โค้ดใหม่ที่ใช้ pattern เดิม หรือความต้องการที่เปลี่ยนไป |

ตัวเลขนี้เป็นนโยบายเริ่มต้น ไม่ใช่ค่าคงที่ หากนักเรียนอ่านโค้ดตัวเองได้แต่ใช้กับโค้ดใหม่ไม่ได้ ระบบควรเพิ่ม Transfer Encounter ในรอบถัดไป

### ตัวอย่างผังดันเจี้ยน

```text
Start
  ├─ Predict Gate
  │    └─ Trace Slime
  ├─ Concept Shrine
  │    └─ Edge-case Trap
  └─ Challenge Route
       └─ Transfer Encounter
            ↓
          Boss
```

ทุก node ต้องมี `learningObjective` และ `blockCells` ที่จะประเมิน ไม่ควรสุ่มข้อสอบเข้าห้องโดยไม่มีเหตุผลทางการศึกษา

---

## 4. โครงสร้าง Encounter กลาง

ควรนิยาม Encounter แบบเดียวกันสำหรับทุกด่าน เพื่อให้ทั้ง Dungeon, PracticeArena และบอสใช้ร่วมกัน:

```typescript
type EncounterSource =
  | "imported-code"
  | "prerequisite"
  | "misconception"
  | "edge-case"
  | "transfer";

type InteractionType =
  | "predict-output"
  | "trace-state"
  | "control-flow"
  | "select-input"
  | "spot-bug"
  | "explain"
  | "modify";

interface EncounterSpec {
  id: string;
  conceptIds: string[];
  blockCells: BlockCellId[];
  source: EncounterSource;
  interaction: InteractionType;
  difficulty: number;
  content: unknown;
  validationStrategy: "runtime" | "rubric" | "hybrid";
  hintPolicy: {
    maxHints: number;
    revealAfterAttempts: number;
  };
}
```

### Encounter ที่ควรมีใน MVP

1. **Predict Gate** — ทำนาย output ก่อนรัน
2. **Trace Room** — ระบุค่าตัวแปรหรือลำดับบรรทัด
3. **Concept Shrine** — ตอบแนวคิดที่เกี่ยวข้อง เช่น accumulator หรือ scope
4. **Edge-case Trap** — เลือก input ที่ทำให้โค้ดผิดพลาด
5. **Transfer Gate** — อ่านโค้ดใหม่ที่ใช้ pattern เดียวกัน
6. **Boss Room** — Predict -> Explain -> Debug/Modify -> Transfer

AI สามารถช่วยสร้างร่างคำถามได้ แต่คำถามที่เกี่ยวกับ output, state หรือพฤติกรรมของโค้ด ควรมีการตรวจด้วย runtime หรือ test จริง ไม่ควรเชื่อคำตอบจาก LLM เพียงอย่างเดียว

---

## 5. ตัวอย่างการทำงานจริง

สมมตินักเรียนนำเข้า:

```javascript
function sumPositive(numbers) {
  let total = 0;

  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] > 0) {
      total += numbers[i];
    }
  }

  return total;
}
```

ระบบตรวจพบ:
- variable initialization
- accumulator pattern
- `for` loop
- array indexing
- conditional
- function input/output
- ความเสี่ยงเรื่อง empty array และค่าที่ไม่ใช่ตัวเลข

ดันเจี้ยนจึงอาจเป็น:
1. **Predict Gate:** ทำนายผลของ `sumPositive([2, -1, 3])`
2. **Trace Slime:** ระบุ `i`, `numbers[i]` และ `total` ในแต่ละรอบ
3. **Concept Shrine:** อธิบายบทบาทของ `total` และเหตุผลที่ต้องเริ่มจาก `0`
4. **Edge Trap:** ตรวจว่าโค้ดทำงานอย่างไรกับ `[]`, `[-2, -3]` หรือ input ที่ไม่ใช่ array
5. **Transfer Gate:** แสดงฟังก์ชันคำนวณจำนวนค่าที่ผ่านเงื่อนไข แล้วให้ระบุ accumulator และ control flow
6. **Boss:** แก้เงื่อนไขหรือเพิ่มพฤติกรรมใหม่ พร้อมอธิบายว่าทำไมการแก้จึงถูกต้อง

เนื้อหา Concept และ Transfer มาจากหลักสูตรหรือชุดโจทย์ที่ผ่านการตรวจสอบ ไม่จำเป็นต้องสร้างด้วย LLM ทุกครั้ง วิธีนี้ทำให้เนื้อหาเสถียรและตรวจสอบคุณภาพได้ง่ายกว่า

---

## 6. ผลกระทบต่อ Block Model และคะแนน

ควรแยกคะแนนออกเป็น 3 ชุด:

### 1. Gameplay Score
ใช้สำหรับความสนุก เช่น:
- HP หรือ Program Integrity
- XP
- ดาเมจ
- combo
- relic
- รางวัลท้ายรอบ

### 2. Assessment Evidence
หลักฐานดิบ เช่น:
- คำทำนายก่อนรัน
- คำตอบและจำนวนครั้งที่ตอบ
- state ที่นักเรียนเลือก
- input ที่ใช้ทดสอบ
- โค้ดก่อนและหลัง Modify
- คำอธิบายและ AI evaluation

### 3. Learning Mastery
- คะแนน Block Model 12 ช่อง
- Concept mastery
- ความสามารถในการ Predict / Explain / Debug / Transfer
- ความมั่นใจของระบบต่อการประเมิน

**ไอเทมในเกมต้องไม่ทำให้คะแนนความเข้าใจสูงขึ้นโดยอัตโนมัติ** เช่น relic ที่เปิดคำใบ้อาจช่วยให้ผ่านด่าน แต่ต้องบันทึกว่ามีการใช้คำใบ้ และไม่ควรตีความว่าเป็นการตอบได้ independently

นอกจากนี้ ไม่จำเป็นต้องให้ทุก encounter ประเมินครบ 12 ช่อง เซลล์ที่ไม่มีหลักฐานควรเป็น `not_assessed` ไม่ใช่ให้คะแนน 0 หรือ 100 อัตโนมัติ

---

## 7. โครงสร้างข้อมูลที่ควรเพิ่ม

ยังใช้ตาราง `attempts`, `attempt_answers`, `attempt_cell_scores`, `ai_evaluations` และ `topic_progress` เดิมได้ โดยเพิ่มประมาณนี้:

### `learning_concepts`
เก็บแนวคิดและความสัมพันธ์ เช่น:
```text
loops.for
├── requires: variables, sequence
├── related: arrays.indexing
├── misconceptions: off_by_one, infinite_loop
└── transfer_targets: while_loop, accumulator
```

### `imported_programs`
เก็บโค้ดหรือข้อมูลอ้างอิงโค้ด ผลการวิเคราะห์ และเวอร์ชันของ analyzer โดยต้องกำหนดข้อจำกัดขนาดและระยะเวลาเก็บข้อมูล

### `dungeon_runs`
เก็บ seed, dungeon plan, build, สถานะ HP/relics และผลจบรอบ

### `dungeon_encounters`
เก็บ encounter ที่เกิดขึ้นจริง รวมถึง input variant และ spec ที่ใช้ตรวจคำตอบ เพื่อให้ตรวจย้อนหลังและสร้างผลซ้ำเพื่อดีบักได้

### `concept_evidence` หรือขยาย `attempt_answers`
เชื่อมคำตอบกับแนวคิด ไม่ใช่เฉพาะ `question_id` และ `block_cell` เพื่อให้ระบบรู้ว่านักเรียนอ่อนเรื่องใด แม้คำถามจะถูกสร้างแบบไดนามิก

ส่วน `attempts` เดิมยังใช้เป็นหน่วยสรุปผลการเรียนได้ ไม่จำเป็นต้องผูก attempt ทุกครั้งกับ topic เดียว เพราะหนึ่งดันเจี้ยนอาจครอบคลุมหลาย concept

---

## 8. API ที่ควรเพิ่ม

```text
POST /api/dungeon-runs
```
สร้าง DungeonPlan จาก learner model, curriculum และ imported code โดย Server เป็นผู้กำหนดหรือรับรอง spec ที่ใช้จริง

```text
POST /api/dungeon-runs/:id/encounters/:encounterId/resolve
```
บันทึกคำตอบ ประเมินผล คืนผลการต่อสู้ และหลักฐานการเรียนรู้ โดย Server คำนวณผลที่มีผลต่อ mastery ไม่รับคะแนนสำเร็จรูปจาก client เพียงอย่างเดียว

```text
GET /api/dungeon-runs/:id
```
กู้คืนสถานะรอบเกมเมื่อรีเฟรชหรือกลับมาเล่นต่อ

```text
POST /api/code-imports
```
วิเคราะห์โค้ดเบื้องต้นและคืน concept/features ที่ระบบระบุได้ พร้อมข้อจำกัด เช่น syntax ที่ยังไม่รองรับ

การส่ง `scorePercent`, `earnedXp` และ `updatedCellScores` จาก client แบบเดิมไม่ควรถือเป็นข้อมูลที่เชื่อถือได้สำหรับการประเมินจริง ฝั่ง Server ควรตรวจสิทธิ์ ตรวจความสัมพันธ์ของ `studentId` กับ session และคำนวณผลจากข้อมูลที่ตรวจสอบได้มากที่สุด

---

## 9. ประเด็นด้านความปลอดภัยที่ควรแก้ก่อนรองรับโค้ดอิสระ

`Function constructor` ร่วมกับ timeout **ไม่ใช่ security sandbox ที่สมบูรณ์** และการจำกัดเวลาใน thread เดียวกันไม่สามารถหยุด infinite loop ได้อย่างน่าเชื่อถือ เพราะอาจทำให้ UI ค้าง

สำหรับระบบที่จะรับโค้ดจากผู้ใช้ ควรแยกอย่างน้อย:
- การตรวจ syntax ด้วย parser ที่เหมาะสม
- จำกัดภาษาและขนาดโค้ดใน MVP
- จำกัด output, หน่วยความจำ และเวลาทำงาน
- ใช้ execution runtime ที่แยกจากแอปหลัก
- ไม่ถือ `Function constructor` เป็น security boundary
- ไม่ส่งโค้ดหรือคำอธิบายของนักเรียนไปยัง LLM โดยไม่จำเป็น และไม่บันทึก prompt/ข้อความเกินความจำเป็น

ถ้าในอนาคตรองรับโค้ดที่ไม่ไว้วางใจจริง ต้องออกแบบ sandbox ใหม่ ไม่ควรถือว่า `Function` เป็น security boundary

---

## 10. Vertical Slice ที่แนะนำ

ยังไม่ต้องทำโหมดเสียง, CMS, realtime หรือโค้ดทุกภาษา ให้สร้างหนึ่งชุดที่พิสูจน์แนวคิดได้ก่อน:

1. เพิ่ม `DungeonRunScreen` และ node map แบบ 2D
2. ใช้ JavaScript ขนาดเล็กหนึ่งชุด หรือโค้ดจากด่าน `for`
3. ทำ encounter 5 แบบ: Predict, Trace, Spot Bug, Edge Case และ Transfer
4. มี Concept Graph ขนาดเล็กสำหรับ variables, loops, arrays, conditions และ functions
5. มีบอสหนึ่งแบบที่ใช้ Predict -> Explain -> Modify -> Test
6. บอสจบด้วยคำถามจากโค้ดใหม่ที่ใช้แนวคิดเดียวกัน ไม่ใช่คำถามจากโค้ดเดิมเท่านั้น
7. บันทึกผลเข้า Block Model และ Teacher Dashboard เดิม
8. ทดสอบว่าหลังเล่น นักเรียนทำโจทย์ใหม่ได้ดีขึ้นหรือไม่ ไม่ใช่วัดเพียงว่าเคลียร์ดันเจี้ยนได้หรือไม่

### สรุปสถาปัตยกรรมที่ควรส่งต่อให้ Architect

> ใช้ Explain-Code เดิมเป็น **Learning Evidence Engine** และเพิ่ม Dungeon Layer เป็นเกมที่นำหลักฐานการเรียนรู้ไปสร้างการผจญภัย โดย Dungeon Planner ต้องผสมจุดอ่อนของผู้เรียน หลักสูตร โค้ดที่นำเข้า และโจทย์ประยุกต์ ส่วนคะแนนเกมกับคะแนนความเข้าใจต้องแยกกัน  
>
> สิ่งที่ควรพัฒนาเป็นอันดับแรกไม่ใช่เสียงพูด Realtime หรือ CMS แต่คือ **DungeonPlanner, Concept Graph, EncounterSpec, Learner Model และการแยก PracticeArena ออกจาก God Component** เพื่อให้พิสูจน์ก่อนว่า "โหมดดันเจี้ยนช่วยให้นักเรียนอธิบายและประยุกต์โค้ดได้จริง" ก่อนขยายคอนเทนต์หรือระบบเกมส่วนอื่น
