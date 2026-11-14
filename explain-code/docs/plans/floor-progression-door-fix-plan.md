# แผนแก้ไขระบบปลดล็อกด่านและการเข้าประตูเพื่อไปยังชั้นถัดไป (Floor Progression & Exit Door Fix)

## 1. สาเหตุของปัญหาที่พบ (Root Cause Analysis)

จากการตรวจสอบไฟล์ [courses/page.tsx](../../app/courses/page.tsx) และ [TopicDungeonArena.tsx](../../app/components/dungeon/TopicDungeonArena.tsx) พบ 2 สาเหตุหลัก:

1. **ผ่านด่าน 1 แล้วไม่ปลดล็อกด่าน 2 ให้ (สำหรับโหมด Guest / ทดลองเล่น):**
   - ในฟังก์ชัน `handleCompleteTopic` เมื่อ `!session` (ยังไม่ได้เข้าสู่ระบบ) โค้ดจะ `return` ออกทันทีโดยไม่อัปเดต `completedTopics` ใดๆ เลย ทำให้ `currentStudent` ยังใช้ค่าคงที่ `GUEST_STUDENT` (`completedTopics: []`) อยู่ตลอด ด่าน 2 จึงยังคงล็อกอยู่แม้เพิ่งผ่านด่าน 1
   - *(หมายเหตุ: ตามกติกาเดิม โหมด Guest จะไม่บันทึกความคืบหน้าลง `localStorage`/Database เพื่อไม่ให้เซฟข้ามการรีเฟรช แต่ควรปลดล็อกด่านถัดไป **ภายใน Session การเล่นปัจจุบันในหน่วยความจำ (In-Memory State)** เพื่อให้เล่นต่อเนื่องได้)*

2. **เดินเข้าประตูหรือกดปุ่มผ่านด่าน 1 แล้วไม่พาไปด่าน 2:**
   - เมื่อผู้เล่นปราบมอนสเตอร์แล้วเดินเข้าประตู (`GameCanvas` เรียก `onEnterNextFloor` -> `TopicDungeonArena` เรียก `handleCompleteFloor` -> เรียก `onCompleteTopic`):
     - กรณี **Guest**: `handleCompleteTopic` สั่ง `setActiveTab("quest")` (เด้งกลับหน้าแผนที่แทนที่จะเข้าด่าน 2)
     - กรณี **ล็อกอินแล้ว**: `handleCompleteTopic` สั่ง `setActiveTab("learn")` (เด้งไปหน้า Skills & Sandbox แทนที่จะเข้าด่าน 2)

---

## 2. แนวทางแก้ไข (Proposed Changes)

### [MODIFY] `explain-code/app/courses/page.tsx`
1. **เพิ่ม In-Memory State สำหรับ Guest (`guestProgress`):**
   - สร้าง `const [guestProgress, setGuestProgress] = useState<StudentRecord>(GUEST_STUDENT);`
   - ใช้ `guestProgress` เป็น `currentStudent` เมื่อ `!session` (ไม่บันทึกลง `localStorage` หรือส่ง API ดังนั้นเมื่อรีเฟรชหน้าเว็บหรือเข้าใหม่จะเริ่มใหม่ตามกติกาเดิมทุกประการ)
   - เมื่อ Guest ผ่านด่าน 1 ใน `handleCompleteTopic` ให้เรียก `setGuestProgress(optimisticStudent)` เพื่อปลดล็อกด่าน 2, 3, ... ในรอบการเล่นปัจจุบันได้ทันที

2. **อัปเดต `handleCompleteTopic` ให้เข้าสู่ด่านถัดไปอัตโนมัติเมื่อเข้าประตู:**
   - ค้นหาด่านถัดไปในภาษาปัจจุบัน:
     ```tsx
     const currentIdx = currentLanguageTopics.findIndex((tp) => tp.id === result.topicId);
     const nextTopic =
       currentIdx >= 0 && currentIdx + 1 < currentLanguageTopics.length
         ? currentLanguageTopics[currentIdx + 1]
         : null;
     ```
   - หากมี `nextTopic` (ยังไม่ถึงบอสสุดท้ายของภาษานั้น):
     - อัปเดต `setSelectedTopicId(nextTopic.id)`
     - เพิ่ม `setPlayAttemptNonce((n) => n + 1)`
     - คง `setActiveTab("practice")` เพื่อให้ผู้เล่น **ก้าวเข้าประตูจากชั้น 1 ไปยังชั้น 2 ได้ทันที** โดยไม่ต้องกลับหน้าแผนที่
   - หากไม่มี `nextTopic` (ผ่านด่านบอสสุดท้ายของภาษานั้นแล้ว):
     - กลับไปยังหน้าแผนที่ `setActiveTab("quest")` พร้อมแสดงข้อความยินดีที่พิชิตปราสาทครบทุกชั้น

3. **ปรับปรุง `isTopicUnlocked` ให้ตรวจสอบแบบเฉพาะภาษา:**
   - แก้ไขเงื่อนไขของ Boss Floor (`topicId === 7`) ให้นับจำนวนด่านที่ผ่าน **เฉพาะใน `currentLanguageTopics`** (หรือผ่านด่านก่อนหน้า `prevTopic`) เพื่อไม่ให้นับปนกับภาษาอื่น

---

## 3. การตรวจสอบ (Verification Plan)
1. รัน `npm --prefix explain-code run build` เพื่อตรวจสอบ TypeScript และ Production Build
2. ทดสอบในเบราว์เซอร์ทั้งแบบ **Guest** และ **เข้าสู่ระบบ**:
   - เข้าเล่นชั้นที่ 1 -> ปราบมอนสเตอร์ -> เดินเข้าประตูด้านบน (หรือกดปุ่ม `🚪 ประตูเปิดแล้ว!`)
   - ยืนยันว่าเปลี่ยนเข้าสู่ **ชั้นที่ 2** ทันที
   - เมื่อกด `← กลับเส้นทาง` กลับมาที่แผนที่ ยืนยันว่าชั้นที่ 1 แสดงสถานะ **"พิชิตแล้ว"** และชั้นที่ 2 **ปลดล็อก ("พร้อมลุย")**
   - กรณี Guest: ทดลองรีเฟรชหน้าเว็บ ยืนยันว่าความคืบหน้าถูกรีเซ็ตกลับเป็นเริ่มต้น (ไม่เซฟลง localStorage)
