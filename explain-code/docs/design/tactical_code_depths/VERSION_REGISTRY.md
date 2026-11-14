# สารบัญและประวัติเวอร์ชันแนวคิด (CONCEPT & ARCHITECTURE VERSION REGISTRY)
## ระบบ CODE DEPTHS : ดันเจี้ยนแห่งการเข้าใจ (Tactical Code-Battler)

โฟลเดอร์นี้รวบรวมเอกสารการออกแบบและพัฒนาแนวคิดของระบบ **CODE DEPTHS** ทั้งหมด โดยแบ่งตามลำดับการพัฒนาการ (Evolution Timeline) เพื่อให้ติดตามสถานะล่าสุดและประวัติการตัดสินใจทางสถาปัตยกรรมได้อย่างชัดเจน

---

## สรุปภาพรวมเวอร์ชัน (Version Overview)

| เลขเวอร์ชัน | สถานะ | ชื่อแนวคิด | หัวใจสำคัญของการพัฒนา |
|---|---|---|---|
| **v1.0** | เสร็จสมบูรณ์ (Archived) | Original Game Concept (Roguelite Dungeon) | เปลี่ยนการสอบเป็นการผจญภัยดันเจี้ยน 15-25 นาที, อัตราส่วน 40:30:30, บอส 3 เฟส, 4 มิติความเข้าใจ (Predict, Explain, Debug, Transfer) |
| **v1.1** | เสร็จสมบูรณ์ (Archived) | Explain-Code Integration Architecture | สถาปัตยกรรมเชื่อมต่อระบบเดิม, แยก 3 เลเยอร์คะแนน (Gameplay vs Evidence vs Mastery), ขยาย Supabase Schema, ทำ Vertical Slice |
| **v2.0** | เสร็จสมบูรณ์ (Archived) | Tactical Code-Battler Prototype | ทดลองระบบแก้ดาเมจอิสระในสนามรบ (พบข้อจำกัด: ผู้เล่นแก้ดาเมจเป็น 9999999 เพื่อผ่านด่านได้ง่าย และโค้ดอ่านยากกว่าเดิม) |
| **v2.1 (ล่าสุด)** | **เสร็จสมบูรณ์ (ACTIVE PLAYABLE)** | **Dynamic Tailored Dungeon & Pedagogical Roguelite** | **การคืนความสมดุล:** กลับมาใช้หน้าจอ Clean UI ที่อ่านโค้ดง่าย พร้อมแก้ปัญหาคอขวดที่แท้จริง: **ชุดโจทย์และด่านจะเปลี่ยนตามมนตร์ที่เลือก 100%** (ทั้ง `sumPositive`, `findMax`, `countVowels`) ไม่ให้เกิดช่องโหว่แก้ดาเมจ 9999999 |

---

## รายละเอียดเอกสารแยกตามเวอร์ชัน

### เวอร์ชัน 1.0 : แนวคิดเกมตั้งต้น (Original Game Concept)
* **ไฟล์:** [`v1.0_ORIGINAL_GAME_CONCEPT.md`](file:///C:/Users/User/Documents/GitHub/explain-code/explain-code/design_tactical_code_depths/v1.0_ORIGINAL_GAME_CONCEPT.md)
* **สาระสำคัญ:**
  * กำหนดปรัชญา "AI ประกอบมนตร์ให้คุณได้ แต่คุณต้องเข้าใจมนตร์ก่อนร่าย"
  * โครงสร้างห้องและมอนสเตอร์ตัวแทนความเข้าใจ (Trace Slime, Off-by-one Bat, Bug Mimic)
  * นิยามการวัดผล 4 มิติ โดยไม่พึ่งพาเครื่องมือตรวจจับ AI

### เวอร์ชัน 1.1 : สถาปัตยกรรมการเชื่อมต่อระบบเดิม (Integration Architecture)
* **ไฟล์:** [`v1.1_EXPLAIN_CODE_INTEGRATION.md`](file:///C:/Users/User/Documents/GitHub/explain-code/explain-code/design_tactical_code_depths/v1.1_EXPLAIN_CODE_INTEGRATION.md)
* **สาระสำคัญ:**
  * การครอบ Dungeon Layer บน PracticeArena เดิมเพื่อประหยัดเวลาพัฒนา
  * การแยกคะแนนการเล่นเกมออกจากหลักฐานความเข้าใจ (Assessment Evidence Integrity)
  * การออกแบบตาราง `dungeon_runs`, `dungeon_encounters`, และ `learning_concepts`

---

### เวอร์ชัน 2.0 : สถาปัตยกรรมระบบต่อสู้เชิงตรรกะแบบเรียลไทม์ (Tactical Code-Battler - LATEST)
การยกเครื่องให้กลายเป็นเกมวางแผนกลยุทธ์อย่างแท้จริง โค้ดคือเครื่องมือต่อสู้ที่มีต้นทุนและความเสี่ยง

* **พิมพ์เขียวข้อตกลงกลาง:**
  * [`00_MASTER_DESIGN_CHARTER.md`](file:///C:/Users/User/Documents/GitHub/explain-code/explain-code/design_tactical_code_depths/00_MASTER_DESIGN_CHARTER.md): ปรัชญาและขอบเขตการทำงานร่วมกันของทุกโมดูล
* **โมดูลที่ 1 (Combat & Execution Engine):**
  * [`01_COMBAT_AND_EXECUTION_ENGINE.md`](file:///C:/Users/User/Documents/GitHub/explain-code/explain-code/design_tactical_code_depths/01_COMBAT_AND_EXECUTION_ENGINE.md): ลูปการต่อสู้เทิร์นเบส 6 เฟส, การรันสคริปต์ใน Web Worker Sandbox, Multi-hit จากลูป, Proc chances จาก if, การเปลี่ยน Infinite Loop เป็นสถานะ Overheat, และ Spell Fizzle
* **โมดูลที่ 2 (Monster AI & Script Dueling):**
  * [`02_MONSTER_AI_AND_SCRIPT_DUELING.md`](file:///C:/Users/User/Documents/GitHub/explain-code/explain-code/design_tactical_code_depths/02_MONSTER_AI_AND_SCRIPT_DUELING.md): สคริปต์พฤติกรรมมอนสเตอร์, ตารางธาตุ 6 ธาตุพร้อม Cross-Elemental Reaction, ระบบส่องโค้ดศัตรู (Inspect Script / Code X-Ray), และบอสหลายเฟส (The Interpreter -> The Optimizer -> Corrupt Compiler)
* **โมดูลที่ 3 (Roguelite Progression & Code Runes):**
  * [`03_ROGUELITE_PROGRESSION_AND_RUNES.md`](file:///C:/Users/User/Documents/GitHub/explain-code/explain-code/design_tactical_code_depths/03_ROGUELITE_PROGRESSION_AND_RUNES.md): รูนดัดแปลงโค้ด 4 ช่อง Slot, เควสต์จาก NPC ในดันเจี้ยน (ช่างตีเหล็ก, นักเล่นแร่แปรธาตุ, นักพนัน), คำสาปสภาพแวดล้อม (ห้องพายุหิมะ, สนามพลังรบกวน), การพัฒนาโค้ดให้แกร่งขึ้นตลอดทาง, และการแมปหลักฐานความเข้าใจกลับสู่ Block Model 12 ช่อง
* **โมดูลที่ 4 (Data Models & Interface Contracts):**
  * [`04_DATA_MODELS_AND_INTERFACE_CONTRACTS.md`](file:///C:/Users/User/Documents/GitHub/explain-code/explain-code/design_tactical_code_depths/04_DATA_MODELS_AND_INTERFACE_CONTRACTS.md): TypeScript Interfaces กลางที่เชื่อมทั้ง 3 ระบบเข้าด้วยกันแบบไร้รอยต่อ

---

## สรุปสถานะล่าสุด (Current Status Summary)
* **เวอร์ชันปัจจุบัน:** `v2.0 (Tactical Code-Battler)`
* **จุดเก็บไฟล์รวมศูนย์:** [`design_tactical_code_depths/`](file:///C:/Users/User/Documents/GitHub/explain-code/explain-code/design_tactical_code_depths)
* **สถานะความพร้อม:** การออกแบบพิมพ์เขียวครบทั้ง 4 ด้านเสร็จสมบูรณ์ 100% เชื่อมต่อสัญญาข้อมูลเข้ากันได้อย่างสมบูรณ์ ปราศจากความขัดแย้ง และพร้อมนำไปพัฒนาเป็นระบบจริงในขั้นต่อไป
