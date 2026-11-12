import {
  CodeSpellPreset,
  DungeonRoom,
  DungeonRunState,
  EncounterSpec,
  RelicItem,
} from "./types";

export const CODE_SPELL_PRESETS: CodeSpellPreset[] = [
  {
    id: "sum-positive",
    name: "มนตร์บวกเฉพาะเลขบวก (Sum Positive)",
    category: "Array & Loop Accumulator",
    difficulty: "ง่าย",
    description:
      "เวทมนตร์คลาสสิกที่กวาดตรวจสมาชิกในแอเรย์ แล้วสะสมเฉพาะค่าที่มากกว่าศูนย์ มักเจอปัญหาเมื่อรับแอเรย์ว่างหรือมีแต่เลขลบ",
    code: `function sumPositive(numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] > 0) {
      total += numbers[i];
    }
  }
  return total;
}`,
    primaryConcepts: ["variables", "loops.for", "arrays.indexing", "conditions.if", "accumulator"],
  },
  {
    id: "find-max",
    name: "มนตร์เฟ้นหาแต้มสูงสุด (Find Maximum)",
    category: "Array Traversal & State Comparison",
    difficulty: "ปานกลาง",
    description:
      "เวทมนตร์เปรียบเทียบค่าในแอเรย์เพื่อหาค่าสูงสุด จุดอันตรายคือการตั้งค่าเริ่มต้นเป็น 0 แทนที่จะเป็นสมาชิกตัวแรก",
    code: `function findMax(scores) {
  if (!scores || scores.length === 0) return null;
  let maxVal = scores[0];
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > maxVal) {
      maxVal = scores[i];
    }
  }
  return maxVal;
}`,
    primaryConcepts: ["conditions.guard", "arrays.indexing", "loops.for", "boundary", "state_comparison"],
  },
  {
    id: "count-vowels",
    name: "มนตร์นับเสียงสระ (Count Vowels)",
    category: "String Traversal & Membership",
    difficulty: "ง่าย",
    description:
      "เวทมนตร์ตรวจหาตัวอักษรที่เป็นสระ (a, e, i, o, u) ในข้อความ แล้วคืนจำนวนที่พบทั้งหมด",
    code: `function countVowels(text) {
  const vowels = "aeiouAEIOU";
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (vowels.includes(text[i])) {
      count++;
    }
  }
  return count;
}`,
    primaryConcepts: ["strings.traversal", "accumulator", "conditions.membership", "loops.for"],
  },
];

export const INITIAL_RELICS: RelicItem[] = [
  {
    id: "relic-rubber-duck",
    name: "สารวัตรเป็ดใบ้ทาง (Rubber Duck Oracle)",
    description: "ใช้เปิดคำใบ้สาระสำคัญและตัดตัวเลือกผิดทิ้ง 1 ข้อ",
    iconName: "duck",
    focusCost: 20,
    usesLeft: 3,
  },
  {
    id: "relic-trace-lens",
    name: "แว่นส่องสถานะแรม (Trace Lens)",
    description: "เปิดเผยค่าตัวแปรในหน่วยความจำทันทีเพื่อช่วยวิเคราะห์",
    iconName: "lens",
    focusCost: 25,
    usesLeft: 3,
  },
  {
    id: "relic-test-oracle",
    name: "ผลึกทดสอบเวท (Test Oracle)",
    description: "รันโค้ดจำลองใน Sandbox ตรวจสอบพฤติกรรมจริงก่อนตอบ",
    iconName: "crystal",
    focusCost: 30,
    usesLeft: 2,
  },
];

export interface CodeFeatures {
  hasLoop: boolean;
  hasIf: boolean;
  hasAccumulator: boolean;
  hasArray: boolean;
  hasFunction: boolean;
  variableNames: string[];
  risks: string[];
}

export function extractCodeFeatures(code: string): CodeFeatures {
  const hasLoop = /\b(for|while)\b/.test(code);
  const hasIf = /\bif\b/.test(code);
  const hasAccumulator = /\+\=|\-\=|\*\=|\+\+|\-\-/.test(code);
  const hasArray = /\[.*\]|\.length|\bpush\b|\bpop\b/.test(code);
  const hasFunction = /\bfunction\b|=>/.test(code);

  const varMatches = code.match(/\b(let|const|var)\s+([a-zA-Z0-9_]+)/g) || [];
  const variableNames = varMatches.map((m) => m.replace(/\b(let|const|var)\s+/, "").trim());

  const risks: string[] = [];
  if (hasArray && !/length\s*===?\s*0|!\w+/.test(code)) {
    risks.push("อาจเกิดข้อผิดพลาดเมื่อรับแอเรย์ว่าง (Empty Array)");
  }
  if (code.includes("<=")) {
    risks.push("ควรระวังความผิดพลาดรอบลูปเกิน 1 รอบ (Off-by-one Boundary)");
  }
  if (hasAccumulator && !variableNames.some((v) => ["total", "sum", "count", "res"].includes(v))) {
    risks.push("ตัวแปรสะสมค่าอาจไม่ได้ถูกระบุชื่อสื่อความหมายชัดเจน");
  }

  return {
    hasLoop,
    hasIf,
    hasAccumulator,
    hasArray,
    hasFunction,
    variableNames,
    risks,
  };
}

/**
 * Procedural Dungeon Plan Generator (v1.0 Original Prototype)
 * Creates a 5-floor DAG (Directed Acyclic Graph) of encounters matching the code
 */
export function generateDungeonPlan(
  code: string,
  spellName: string = "มนตร์คำนวณ",
  targetGoal: string = "เข้าใจโค้ดนี้และเตรียมป้องกันบั๊ก"
): DungeonRunState {
  const features = extractCodeFeatures(code);
  const runId = `run-${Date.now().toString(36)}`;

  // Room 0: Predict Gate (Floor 0)
  const room0: DungeonRoom = {
    id: "room-f0-predict",
    floor: 0,
    name: "ประตูเบิกเนตร (Predict Gate)",
    type: "combat",
    monsterName: "โกเลมเฝ้าประตู (Gate Sentry)",
    description: "ประตูหินโบราณที่ต้องทำนายผลลัพธ์ของเวทมนตร์ให้ถูกต้องก่อนจึงจะเปิดออก",
    status: "available",
    nextRoomIds: ["room-f1-trace", "room-f1-shrine"],
    encounters: [
      {
        id: "enc-f0-1",
        title: "ทำนายผลลัพธ์แรกของเวทมนตร์",
        subtitle: "ประเมินพฤติกรรมของโค้ดเมื่อป้อนชุดข้อมูลตั้งต้น",
        monsterName: "โกเลมเฝ้าประตู",
        monsterType: "Construct",
        roomType: "combat",
        interactionType: "predict",
        prompt: features.hasArray
          ? "หากเรียกใช้งานฟังก์ชันด้วยชุดข้อมูลตัวเลข [3, -2, 4] ผลลัพธ์สุดท้ายที่ส่งกลับคืนมาคือค่าใด?"
          : "เมื่อรันโค้ดชุดนี้จนจบ ฟังก์ชันจะคืนค่าใดออกมาเป็นผลลัพธ์สุดท้าย?",
        codeSnippet: code,
        options: [
          {
            id: "opt-1",
            label: "7 (เนื่องจาก 3 + 4 = 7 และข้าม -2 ที่ไม่ผ่านเงื่อนไข > 0)",
            isCorrect: true,
            feedback: "ถูกต้องเฉียบคม! คุณเข้าใจการกรองข้อมูลด้วย if และการสะสมค่าในลูป",
          },
          {
            id: "opt-2",
            label: "5 (เนื่องจากนำ 3 - 2 + 4 มารวมกันทั้งหมด)",
            isCorrect: false,
            feedback: "ผิดพลาด! เงื่อนไข if (numbers[i] > 0) ป้องกันไม่ให้บวกเลขลบเข้าไปใน total",
          },
          {
            id: "opt-3",
            label: "4 (คืนค่าตัวเลขตัวสุดท้ายของแอเรย์)",
            isCorrect: false,
            feedback: "ผิดพลาด! total ทำหน้าที่บวกสะสม ไม่ใช่บันทึกแค่ค่าสุดท้าย",
          },
          {
            id: "opt-4",
            label: "0 (ตัวแปร total ไม่ถูกอัปเดตเลย)",
            isCorrect: false,
            feedback: "ผิดพลาด! ลูปทำงานและเจอเลขบวกทำให้ total ถูกบวกเพิ่มแน่นอน",
          },
        ],
        hint: "สังเกตเงื่อนไข if ให้ดีว่าตัวเลขใดถูกบวกเข้า total และตัวเลขใดถูกข้ามไป",
        blockCell: "E2",
        conceptId: "loops.execution",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "predict",
      },
    ],
  };

  // Room 1A: Trace Slime (Floor 1, Path A)
  const room1A: DungeonRoom = {
    id: "room-f1-trace",
    floor: 1,
    name: "หนองน้ำแห่งการติดตาม (Trace Swamp)",
    type: "combat",
    monsterName: "สไลม์แกะรอย (Trace Slime)",
    description: "มอนสเตอร์ที่แยกตัวตามค่าตัวแปรในหน่วยความจำ คุณต้องระบุสถานะของตัวแปรให้ตรงรอบลูป",
    status: "locked",
    nextRoomIds: ["room-f2-trap", "room-f2-transfer"],
    encounters: [
      {
        id: "enc-f1-trace",
        title: "แกะรอยค่าตัวแปรรายรอบ",
        subtitle: "ตรวจสอบค่าของตัวแปรในหน่วยความจำ RAM ขณะกำลังวนลูป",
        monsterName: "สไลม์แกะรอย",
        monsterType: "Slime",
        roomType: "combat",
        interactionType: "trace",
        prompt: "เมื่อรันลูปผ่านรอบที่ i = 1 (กำลังประมวลผล numbers[1] = -2) ตัวแปร total ใน RAM มีค่าเท่าใด?",
        codeSnippet: `// numbers = [3, -2, 4]
for (let i = 0; i < numbers.length; i++) {
  if (numbers[i] > 0) {
    total += numbers[i];
  }
}`,
        activeLine: 3,
        variableTrace: {
          i: "1",
          "numbers[i]": "-2",
          "numbers[i] > 0": "false",
          total: "3 (คงเดิม)",
        },
        options: [
          {
            id: "opt-1",
            label: "total มีค่าเท่ากับ 3 (คงเดิมจากรอบก่อน เพราะ -2 ไม่ผ่านเงื่อนไข)",
            isCorrect: true,
            feedback: "ถูกต้อง! เมื่อเงื่อนไขเป็น false บรรทัด total += numbers[i] จะถูกข้ามไปโดยสิ้นเชิง",
          },
          {
            id: "opt-2",
            label: "total มีค่าเท่ากับ 1 (เพราะถูกลบออกไป 2)",
            isCorrect: false,
            feedback: "ผิดพลาด! เงื่อนไข > 0 กรอง -2 ทิ้ง โค้ดไม่ได้ทำงาน total += -2",
          },
          {
            id: "opt-3",
            label: "total มีค่าเท่ากับ 0 (ถูกรีเซ็ตค่า)",
            isCorrect: false,
            feedback: "ผิดพลาด! total ประกาศอยู่นอกลูปจึงไม่ถูกรีเซ็ตค่าในแต่ละรอบ",
          },
        ],
        hint: "ดูที่เงื่อนไข if: numbers[1] คือ -2 ซึ่งไม่ได้มากกว่า 0 ดังนั้นคำสั่งข้างในจะไม่ทำงาน",
        blockCell: "E1",
        conceptId: "variables.state",
        damageOnFail: 20,
        xpReward: 30,
        learningPillar: "predict",
      },
    ],
  };

  // Room 1B: Shrine of Why (Floor 1, Path B)
  const room1B: DungeonRoom = {
    id: "room-f1-shrine",
    floor: 1,
    name: "แท่นบูชาแห่งเหตุผล (Shrine of Why)",
    type: "shrine",
    monsterName: "วิญญาณผู้พิทักษ์ความรู้ (Keeper of Why)",
    description: "แท่นบูชาศักดิ์สิทธิ์ที่ทดสอบความเข้าใจเชิงเหตุผลว่าทำไมโค้ดจึงถูกเขียนขึ้นมาแบบนี้",
    status: "locked",
    nextRoomIds: ["room-f2-trap", "room-f2-transfer"],
    encounters: [
      {
        id: "enc-f1-why",
        title: "ทำไมต้องกำหนดค่าเริ่มต้นเป็น 0?",
        subtitle: "เจาะลึกบทบาทของ Accumulator Pattern และ Identity Element",
        monsterName: "วิญญาณผู้พิทักษ์ความรู้",
        monsterType: "Spirit",
        roomType: "shrine",
        interactionType: "why",
        prompt: "ทำไมในบรรทัดที่ 2 จึงต้องกำหนด `let total = 0;` ไว้นอกลูป แทนที่จะเป็น `let total;` หรือใส่ไว้ข้างในลูป?",
        codeSnippet: `function sumPositive(numbers) {
  let total = 0; // ทำไมต้อง 0 และทำไมต้องอยู่นอกลูป?
  for (let i = 0; i < numbers.length; i++) { ... }
}`,
        options: [
          {
            id: "opt-1",
            label: "เพราะ 0 เป็นเอกลักษณ์การบวก และหากไม่กำหนดค่าเริ่มต้น total จะเป็น undefined ทำให้การบวกกลายเป็น NaN",
            isCorrect: true,
            feedback: "ยอดเยี่ยมมาก! 0 + x = x และถ้าไม่ใส่ 0 ค่า undefined + number จะทำให้โปรแกรมพังเป็น NaN ทันที",
          },
          {
            id: "opt-2",
            label: "เพราะ JavaScript บังคับให้ตัวแปรตัวเลขทุกตัวต้องเริ่มที่ 0 เสมอตามไวยากรณ์",
            isCorrect: false,
            feedback: "ไม่ใช่ข้อกำหนดของภาษา แต่เป็นหลักตรรกะของ Accumulator ที่ต้องมีค่าเริ่มต้นที่ถูกต้อง",
          },
          {
            id: "opt-3",
            label: "ใส่ 0 เพื่อให้แอเรย์เริ่มต้นอ่านจาก index ที่ 0",
            isCorrect: false,
            feedback: "ผิดตัวแปร! ตัวที่ใช้อ้างอิง index คือตัวแปร i ไม่ใช่ตัวแปร total",
          },
        ],
        hint: "ลองคิดดูว่าจะเกิดอะไรขึ้นถ้าเอา undefined ไปบวกกับตัวเลข 3 ในภาษา JavaScript",
        blockCell: "F1",
        conceptId: "variables.purpose",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "explain",
      },
    ],
  };

  // Room 2A: Edge-case Trap (Floor 2, Path A)
  const room2A: DungeonRoom = {
    id: "room-f2-trap",
    floor: 2,
    name: "กับดักขอบเขตสุดขั้ว (Edge-Case Trap)",
    type: "trap",
    monsterName: "ค้างคาวตกขอบ (Off-by-one Bat)",
    description: "ห้องที่เต็มไปด้วยหลุมพรางขอบเขต คุณต้องหา Input ที่ทำให้เวทมนตร์นี้เกิดบั๊กหรือพฤติกรรมผิดปกติ",
    status: "locked",
    nextRoomIds: ["room-f3-forge"],
    encounters: [
      {
        id: "enc-f2-edge",
        title: "ทดสอบกรณีขอบเขตสุดขั้ว",
        subtitle: "ค้นหาจุดเปราะบางที่โค้ดอาจรับมือไม่ได้อย่างถูกต้อง",
        monsterName: "ค้างคาวตกขอบ",
        monsterType: "Beast",
        roomType: "trap",
        interactionType: "bug",
        prompt: "หากผู้ใช้นำเข้าค่า `numbers = [-5, -10, -1]` (ไม่มีเลขบวกเลย) โค้ดนี้จะตอบกลับอย่างไร และตรงตามที่ควรจะเป็นหรือไม่?",
        codeSnippet: `function sumPositive(numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] > 0) total += numbers[i];
  }
  return total;
}`,
        options: [
          {
            id: "opt-1",
            label: "คืนค่า 0 ออกมาอย่างปลอดภัย เพราะไม่มีตัวใดเข้าเงื่อนไข > 0 เลย",
            isCorrect: true,
            feedback: "ถูกต้อง! โค้ดจะวนลูปครบทุกรอบโดยไม่บวกอะไรเพิ่มเลย แล้วคืนค่าเริ่มต้นคือ 0 ออกมา",
          },
          {
            id: "opt-2",
            label: "โปรแกรมจะ Throw Error เพราะไม่มีเลขบวก",
            isCorrect: false,
            feedback: "ผิดพลาด! โค้ดไม่มีคำสั่ง throw หรือดัก error ใดๆ มันจะทำงานต่อไปจนจบลูป",
          },
          {
            id: "opt-3",
            label: "คืนค่า -16 (นำเลขลบทั้งหมดมารวมกัน)",
            isCorrect: false,
            feedback: "ผิดพลาด! เงื่อนไข > 0 ป้องกันเลขลบไว้แล้ว",
          },
        ],
        hint: "ดูว่าในลูปมีตัวใดทำให้ if (numbers[i] > 0) เป็นจริงบ้างไหม ถ้าไม่มีเลย total จะเปลี่ยนค่าหรือไม่",
        blockCell: "E3",
        conceptId: "edge_case.boundary",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "debug",
      },
    ],
  };

  // Room 2B: Transfer Gate (Floor 2, Path B)
  const room2B: DungeonRoom = {
    id: "room-f2-transfer",
    floor: 2,
    name: "ประตูเชื่อมภพ (Transfer Gate)",
    type: "transfer",
    monsterName: "เงาสะท้อนรูปแบบ (Pattern Shadow)",
    description: "ประตูมิติที่นำเสนอโค้ดชุดใหม่ที่ไม่เคยเห็นมาก่อน แต่ใช้ Pattern โครงสร้างเดียวกันเป๊ะ",
    status: "locked",
    nextRoomIds: ["room-f3-forge"],
    encounters: [
      {
        id: "enc-f2-transfer",
        title: "จำแนก Pattern เดียวกันในโค้ดใหม่",
        subtitle: "พิสูจน์การโอนย้ายความรู้ (Transfer) ไปยังโค้ดชุดอื่น",
        monsterName: "เงาสะท้อนรูปแบบ",
        monsterType: "Shadow",
        roomType: "transfer",
        interactionType: "transfer",
        prompt: "พิจารณาโค้ดใหม่ต่อไปนี้: ตัวแปรใดทำหน้าที่เป็น Accumulator (ตัวสะสมค่า) เหมือนกับ `total` ในโค้ดเดิม?",
        codeSnippet: `function countPassingStudents(scores, passingGrade) {
  let passedCount = 0;
  for (let idx = 0; idx < scores.length; idx++) {
    if (scores[idx] >= passingGrade) {
      passedCount += 1;
    }
  }
  return passedCount;
}`,
        options: [
          {
            id: "opt-1",
            label: "passedCount (สะสมจำนวนนักเรียนที่สอบผ่านทีละ 1 เมื่อเข้าเงื่อนไข)",
            isCorrect: true,
            feedback: "เฉียบขาด! passedCount คือ Accumulator ที่ทำหน้าที่นับความถี่ (Count Pattern) ในโครงสร้างเดียวกัน",
          },
          {
            id: "opt-2",
            label: "idx (ตัวแปรควบคุมลูป)",
            isCorrect: false,
            feedback: "ผิดพลาด! idx เป็น Loop Counter ไม่ใช่ตัวสะสมผลลัพธ์ของเป้าหมายโปรแกรม",
          },
          {
            id: "opt-3",
            label: "passingGrade (เกณฑ์คะแนนผ่าน)",
            isCorrect: false,
            feedback: "ผิดพลาด! passingGrade เป็นค่าคงที่สำหรับเปรียบเทียบในเงื่อนไข",
          },
        ],
        hint: "หาตัวแปรที่ถูกประกาศไว้ก่อนลูป และถูกบวกเพิ่มค่าเข้าไปเมื่อเงื่อนไขในลูปเป็นจริง",
        blockCell: "F3",
        conceptId: "patterns.transfer",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "transfer",
      },
    ],
  };

  // Room 3: Refactor Forge (Floor 3)
  const room3: DungeonRoom = {
    id: "room-f3-forge",
    floor: 3,
    name: "เตาหลอมมนตร์ (Refactor Forge)",
    type: "forge",
    monsterName: "ช่างตีเหล็กอาคม (Rune Smith)",
    description: "เตาหลอมที่ท้าทายให้คุณดัดแปลงโค้ดเพื่อตอบสนองความต้องการใหม่โดยแก้ไขให้น้อยที่สุด",
    status: "locked",
    nextRoomIds: ["room-f4-boss"],
    encounters: [
      {
        id: "enc-f3-forge",
        title: "ดัดแปลงเงื่อนไขเพื่อความต้องการใหม่",
        subtitle: "Modify โค้ดเดิมให้คำนวณเฉพาะเลขคู่ที่เป็นบวก (Positive Even Numbers)",
        monsterName: "ช่างตีเหล็กอาคม",
        monsterType: "Construct",
        roomType: "forge",
        interactionType: "modify",
        prompt: "หากต้องการแก้ไขโค้ดให้บวกเฉพาะ **เลขคู่ที่เป็นบวก** (เช่น [2, 3, 4, -2] -> 2 + 4 = 6) ควรแก้เงื่อนไข if บรรทัดใดและอย่างไร?",
        codeSnippet: `for (let i = 0; i < numbers.length; i++) {
  // บรรทัดนี้ควรเปลี่ยนเป็นอย่างไร?
  if (numbers[i] > 0) {
    total += numbers[i];
  }
}`,
        options: [
          {
            id: "opt-1",
            label: "เปลี่ยนเป็น `if (numbers[i] > 0 && numbers[i] % 2 === 0)`",
            isCorrect: true,
            feedback: "ยอดเยี่ยม! ใช้ตัวดำเนินการ && เพื่อรวมเงื่อนไข > 0 และหาร 2 ลงตัว (% 2 === 0)",
          },
          {
            id: "opt-2",
            label: "เปลี่ยนเป็น `if (numbers[i] > 0 || numbers[i] % 2 === 0)`",
            isCorrect: false,
            feedback: "ระวัง! เครื่องหมาย || หมายถึง 'หรือ' จะทำให้เลขลบคู่ เช่น -2 หลุดเข้ามาบวกด้วย",
          },
          {
            id: "opt-3",
            label: "เปลี่ยนเป็น `if (i % 2 === 0)`",
            isCorrect: false,
            feedback: "ผิดตัวแปร! i % 2 ตรวจสอบตำแหน่ง index ไม่ใช่ค่าของตัวเลขในแอเรย์",
          },
        ],
        hint: "เลขคู่คือเลขที่หารด้วย 2 แล้วเหลือเศษ 0 (number % 2 === 0) และต้องเป็นเลขบวกด้วย",
        blockCell: "T2",
        conceptId: "logic.compound_conditions",
        damageOnFail: 20,
        xpReward: 45,
        learningPillar: "debug",
      },
    ],
  };

  // Room 4: Boss Room - The Core: Code Golem (Floor 4)
  const room4: DungeonRoom = {
    id: "room-f4-boss",
    floor: 4,
    name: "ห้องบอส: The Core — โกเลมแกนกลางมนตร์",
    type: "boss",
    monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ (The Core: Code Golem)",
    description: "บอสใหญ่แกนกลางดันเจี้ยน การต่อสู้ 3 เฟส: Predict -> Explain -> Repair & Transfer",
    status: "locked",
    nextRoomIds: [],
    encounters: [
      {
        id: "enc-boss-p1",
        title: "บอสเฟสที่ 1: ทำนายพฤติกรรมสุดลึก (Predict Phase)",
        subtitle: "ทดสอบการทำงานเมื่อเจอกับดัก Off-by-one",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "predict",
        prompt: "โกเลมแอบแก้เงื่อนไขลูปเป็น `for (let i = 0; i <= numbers.length; i++)` (มีเครื่องหมายเท่ากับ) เมื่อส่ง `numbers = [5, 10]` จะเกิดสิ่งใดขึ้น?",
        codeSnippet: `let total = 0;
for (let i = 0; i <= numbers.length; i++) { // จุดที่โกเลมแอบวางยา!
  if (numbers[i] > 0) total += numbers[i];
}
return total;`,
        options: [
          {
            id: "opt-1",
            label: "total จะกลายเป็น NaN เพราะในรอบสุดท้าย numbers[2] มีค่าเป็น undefined",
            isCorrect: true,
            feedback: "การโจมตีทะลุเกราะโกเลม! index ตัวสุดท้ายคือ 1 เมื่อ i=2 numbers[2] เป็น undefined ทำให้การเปรียบเทียบและการบวกเกิดข้อผิดพลาด",
          },
          {
            id: "opt-2",
            label: "ได้ผลลัพธ์ 15 ปกติเหมือนเดิม",
            isCorrect: false,
            feedback: "โดนโกเลมโจมตีสวนกลับ! ลูปที่มี <= numbers.length จะวิ่งเกินขนาดแอเรย์ไป 1 รอบเสมอ",
          },
          {
            id: "opt-3",
            label: "โปรแกรมเด้ง IndexOutOfBoundsException ทันที",
            isCorrect: false,
            feedback: "ไม่ใช่สำหรับ JavaScript! JS จะคืนค่า undefined โดยไม่แคลชทันที แต่นำไปสู่ NaN ในภายหลัง",
          },
        ],
        hint: "แอเรย์ความยาว 2 สมาชิกตัวสุดท้ายอยู่ที่ index 1 ถ้าลูปวิ่งถึง i=2 numbers[2] จะได้ค่าอะไร",
        blockCell: "E2",
        conceptId: "boundary.off_by_one",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "predict",
      },
      {
        id: "enc-boss-p2",
        title: "บอสเฟสที่ 2: วินิจฉัยเชิงสาเหตุ (Explain Phase)",
        subtitle: "อธิบายโครงสร้างและความเชื่อมโยงของระบบ",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "why",
        prompt: "หากย้ายคำสั่ง `let total = 0;` เข้าไปไว้ **ภายในปีกกาของลูป for** จะส่งผลเสียอย่างไรต่อการทำงานของโปรแกรม?",
        codeSnippet: `for (let i = 0; i < numbers.length; i++) {
  let total = 0; // ย้ายเข้ามาข้างในลูป
  if (numbers[i] > 0) total += numbers[i];
}
return total;`,
        options: [
          {
            id: "opt-1",
            label: "total จะถูกรีเซ็ตเป็น 0 ในทุกๆ รอบของลูป และบรรทัด return total นอกลูปจะฟ้อง ReferenceError เพราะหาตัวแปรไม่เจอ (Scope issue)",
            isCorrect: true,
            feedback: "คริติคอลฮิตใส่แกนกลางบอส! ทั้งสูญเสียผลบวกสะสมและตัวแปร let มี Block Scope นอกปีกกาเข้าถึงไม่ได้",
          },
          {
            id: "opt-2",
            label: "ไม่มีผลใดๆ โปรแกรมทำงานได้ผลลัพธ์ 15 เหมือนเดิม",
            isCorrect: false,
            feedback: "พลาดท่า! การประกาศตัวแปรในลูปจะทำให้สร้างตัวแปรใหม่ทุกรอบที่วน",
          },
          {
            id: "opt-3",
            label: "ลูปจะกลายเป็น Infinite Loop ไม่รู้จบ",
            isCorrect: false,
            feedback: "ผิดพลาด! total ไม่ใช่ตัวแปรควบคุมเงื่อนไขลูป (ตัวควบคุมคือ i)",
          },
        ],
        hint: "คิดถึง 2 เรื่อง: 1. ค่าเดิมจะหายไปไหมเมื่อเริ่มรอบใหม่ 2. คำสั่ง return อยู่นอกปีกกาจะมองเห็นตัวแปรข้างในหรือไม่",
        blockCell: "F2",
        conceptId: "variables.scope_and_lifetime",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "explain",
      },
      {
        id: "enc-boss-p3",
        title: "บอสเฟสสุดท้าย: ซ่อมแซมและผนึกแกนกลาง (Repair & Transfer Phase)",
        subtitle: "เขียนโค้ดเวอร์ชันสมบูรณ์ที่พร้อมรองรับทุกสถานการณ์",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "modify",
        prompt: "เพื่อป้องกันบั๊กทั้งหมด ฟังก์ชัน `sumPositive` ที่ปลอดภัยที่สุด (Defensive Programming) ควรมี Guard Clause ตรวจสอบเงื่อนไขใดก่อนเริ่มลูป?",
        codeSnippet: `function sumPositive(numbers) {
  // Guard clause ที่ดีควรใส่ที่บรรทัดนี้:
  ...
  let total = 0;
  for (let i = 0; i < numbers.length; i++) { ... }
  return total;
}`,
        options: [
          {
            id: "opt-1",
            label: "`if (!Array.isArray(numbers) || numbers.length === 0) return 0;` เพื่อกันกรณีส่งค่า null, undefined หรือไม่ใช่แอเรย์",
            isCorrect: true,
            feedback: "ผนึกโกเลมสำเร็จ! การตรวจสอบ Input Validation ทำให้ฟังก์ชันทนทานต่อข้อผิดพลาดระดับ Production",
          },
          {
            id: "opt-2",
            label: "`if (numbers[0] < 0) return 0;`",
            isCorrect: false,
            feedback: "ไม่ถูกต้อง! ตัวแรกเป็นลบไม่ได้แปลว่าตัวถัดไปจะไม่มีเลขบวก",
          },
          {
            id: "opt-3",
            label: "`if (numbers.length > 100) throw new Error();`",
            isCorrect: false,
            feedback: "ไม่ตรงประเด็น! การจำกัดขนาดไม่ได้ช่วยป้องกันกรณี null หรือข้อมูลผิดประเภท",
          },
        ],
        hint: "Input อะไรที่อาจทำให้นักเรียนหรือผู้ใช้คนอื่นส่งเข้ามาแล้วโค้ดพังทันทีตอนเรียก .length",
        blockCell: "T4",
        conceptId: "defensive_programming",
        damageOnFail: 25,
        xpReward: 60,
        learningPillar: "transfer",
      },
    ],
  };

  const rooms: Record<string, DungeonRoom> = {
    [room0.id]: room0,
    [room1A.id]: room1A,
    [room1B.id]: room1B,
    [room2A.id]: room2A,
    [room2B.id]: room2B,
    [room3.id]: room3,
    [room4.id]: room4,
  };

  const mapFloors: string[][] = [
    [room0.id],
    [room1A.id, room1B.id],
    [room2A.id, room2B.id],
    [room3.id],
    [room4.id],
  ];

  return {
    id: runId,
    seedCode: code,
    spellName,
    targetGoal,
    integrity: 100,
    maxIntegrity: 100,
    focus: 100,
    maxFocus: 100,
    gold: 50,
    currentRoomId: null,
    currentEncounterIndex: 0,
    rooms,
    mapFloors,
    activeRelics: [...INITIAL_RELICS],
    answersLog: [],
    status: "navigating",
    conceptMastery: {
      "variables.state": { total: 0, correct: 0 },
      "loops.execution": { total: 0, correct: 0 },
      "variables.purpose": { total: 0, correct: 0 },
      "edge_case.boundary": { total: 0, correct: 0 },
      "patterns.transfer": { total: 0, correct: 0 },
      "logic.compound_conditions": { total: 0, correct: 0 },
      "boundary.off_by_one": { total: 0, correct: 0 },
      "variables.scope_and_lifetime": { total: 0, correct: 0 },
      defensive_programming: { total: 0, correct: 0 },
    },
    cellScoresDelta: {},
  };
}
