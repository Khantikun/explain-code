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
  {
    id: "is-palindrome",
    name: "มนตร์กระจกส่องคำ (Is Palindrome)",
    category: "Two-Pointer & Early Return",
    difficulty: "ปานกลาง",
    description:
      "เวทมนตร์ตรวจสอบว่าข้อความอ่านจากหน้าไปหลังเหมือนหลังมาหน้าหรือไม่ ใช้เทคนิค Two-Pointer วิ่งเข้าหากันและคืนค่าผลลัพธ์ทันที",
    code: `function isPalindrome(text) {
  let left = 0;
  let right = text.length - 1;
  while (left < right) {
    if (text[left] !== text[right]) {
      return false;
    }
    left++;
    right--;
  }
  return true;
}`,
    primaryConcepts: ["strings.indexing", "loops.while", "conditions.early_return", "two_pointers"],
  },
  {
    id: "fizz-buzz",
    name: "มนตร์จำแนกเสียงสะท้อน (FizzBuzz Classifier)",
    category: "Condition Hierarchy & Modulo",
    difficulty: "ง่าย",
    description:
      "เวทมนตร์จำแนกตัวเลขตามการหารลงตัว จุดสำคัญคือการจัดลำดับเงื่อนไข 15 ก่อน 3 และ 5 เพื่อป้องกันการดักจับผิดพลาด",
    code: `function fizzBuzz(n) {
  let result = [];
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) {
      result.push("FizzBuzz");
    } else if (i % 3 === 0) {
      result.push("Fizz");
    } else if (i % 5 === 0) {
      result.push("Buzz");
    } else {
      result.push(String(i));
    }
  }
  return result;
}`,
    primaryConcepts: ["loops.for", "conditions.hierarchy", "modulo", "arrays.push"],
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

// -----------------------------------------------------------------------------
// 1. SUM POSITIVE ENCOUNTER SUITE
// -----------------------------------------------------------------------------
function createSumPositiveRooms(code: string): Record<string, DungeonRoom> {
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
        id: "enc-f0-sum",
        title: "ทำนายผลลัพธ์แรกของเวทมนตร์",
        subtitle: "ประเมินพฤติกรรมของโค้ดเมื่อป้อนชุดข้อมูลตั้งต้น",
        monsterName: "โกเลมเฝ้าประตู",
        monsterType: "Construct",
        roomType: "combat",
        interactionType: "predict",
        prompt: "หากเรียกใช้งานฟังก์ชันด้วยชุดข้อมูลตัวเลข [3, -2, 4] ผลลัพธ์สุดท้ายที่ส่งกลับคืนมาคือค่าใด?",
        codeSnippet: code,
        testSimulation: "Sandbox Run: sumPositive([3, -2, 4]) => ส่งคืนค่า 7 (3 + 4 = 7, ข้าม -2)",
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
        testSimulation: "RAM Trace รอบ i=1: numbers[1]=-2 ไม่ผ่านเงื่อนไข > 0 -> total ยังคงเป็น 3",
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
        testSimulation: "Sandbox Test: หากประกาศ let total; โดยไม่ใส่ 0 -> total += 3 ได้ผลลัพธ์เป็น NaN ทันที",
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
        testSimulation: "Boundary Test: sumPositive([]) => 0 (แอเรย์ว่าง คืนค่าเริ่มต้น 0 ปลอดภัย)",
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
        testSimulation: "Pattern Analysis: Accumulator Pattern กวาดตรวจข้อมูลทีละตัว Time O(N) Space O(1)",
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
        prompt: "หากต้องการแก้ไขโค้ดให้บวกเฉพาะ เลขคู่ที่เป็นบวก (เช่น [2, 3, 4, -2] -> 2 + 4 = 6) ควรแก้เงื่อนไข if บรรทัดใดและอย่างไร?",
        codeSnippet: `for (let i = 0; i < numbers.length; i++) {
  // บรรทัดนี้ควรเปลี่ยนเป็นอย่างไร?
  if (numbers[i] > 0) {
    total += numbers[i];
  }
}`,
        testSimulation: "Clean Code Check: การเพิ่ม Guard Clause ตรวจสอบ Array.isArray() ทำให้โปรแกรมทนทานต่อข้อมูลผิดพลาด",
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
for (let i = 0; i <= numbers.length; i++) { // จุดที่โกเลมแอบวางยา
  if (numbers[i] > 0) total += numbers[i];
}
return total;`,
        testSimulation: "Boss Phase 1: numbers[numbers.length] คืนค่า undefined ใน JS ไม่เกิด Crash แต่ทำให้เงื่อนไขเป็นเท็จ",
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
        prompt: "หากย้ายคำสั่ง `let total = 0;` เข้าไปไว้ ภายในปีกกาของลูป for จะส่งผลเสียอย่างไรต่อการทำงานของโปรแกรม?",
        codeSnippet: `for (let i = 0; i < numbers.length; i++) {
  let total = 0; // ย้ายเข้ามาข้างในลูป
  if (numbers[i] > 0) total += numbers[i];
}
return total;`,
        testSimulation: "Boss Phase 2: total ถูกจำกัด Scope อยู่เฉพาะในฟังก์ชัน ป้องกันการชนกับตัวแปรภายนอก",
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
        prompt: "เพื่อป้องกันบั๊กทั้งหมด ฟังก์ชัน sumPositive ที่ปลอดภัยที่สุด (Defensive Programming) ควรมี Guard Clause ตรวจสอบเงื่อนไขใดก่อนเริ่มลูป?",
        codeSnippet: `function sumPositive(numbers) {
  // Guard clause ที่ดีควรใส่ที่บรรทัดนี้:
  ...
  let total = 0;
  for (let i = 0; i < numbers.length; i++) { ... }
  return total;
}`,
        testSimulation: "Boss Phase 3: รัน Automated Tests ครอบคลุม: [1,2,3], [], [-5], [0, 10] ผ่านฉลุย 100% ผนึกโกเลมสำเร็จ",
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

  return {
    [room0.id]: room0,
    [room1A.id]: room1A,
    [room1B.id]: room1B,
    [room2A.id]: room2A,
    [room2B.id]: room2B,
    [room3.id]: room3,
    [room4.id]: room4,
  };
}

// -----------------------------------------------------------------------------
// 2. FIND MAXIMUM ENCOUNTER SUITE
// -----------------------------------------------------------------------------
function createFindMaxRooms(code: string): Record<string, DungeonRoom> {
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
        id: "enc-f0-max",
        title: "ทำนายผลลัพธ์การค้นหาค่าสูงสุด",
        subtitle: "ประเมินพฤติกรรมเมื่อป้อนชุดข้อมูลตัวเลข [12, 45, 8, 31]",
        monsterName: "โกเลมเฝ้าประตู",
        monsterType: "Construct",
        roomType: "combat",
        interactionType: "predict",
        prompt: "หากเรียกใช้งาน findMax([12, 45, 8, 31]) ฟังก์ชันจะคืนค่าใดออกมาเป็นผลลัพธ์สุดท้าย?",
        codeSnippet: code,
        testSimulation: "Sandbox Run: findMax([12, 45, 8, 31]) => ส่งคืนค่า 45",
        options: [
          {
            id: "opt-1",
            label: "45 (เนื่องจาก 45 เป็นค่าที่มากที่สุด และ maxVal ถูกอัปเดตเมื่อพบ 45)",
            isCorrect: true,
            feedback: "ถูกต้องเฉียบคม! ลูปเปรียบเทียบค่าทีละตัว และจำค่าที่มากที่สุดไว้ใน maxVal ตลอดการทำงาน",
          },
          {
            id: "opt-2",
            label: "31 (คืนค่าสมาชิกตัวสุดท้ายของแอเรย์)",
            isCorrect: false,
            feedback: "ผิดพลาด! ลูปไม่ได้คืนค่าตัวสุดท้าย แต่เก็บค่าสูงสุดไว้ใน maxVal",
          },
          {
            id: "opt-3",
            label: "12 (ค่าเริ่มต้นของ maxVal ไม่ถูกอัปเดต)",
            isCorrect: false,
            feedback: "ผิดพลาด! เมื่อลูปตรวจสอบ index 1 พบ 45 > 12 ตัวแปร maxVal จะถูกเปลี่ยนค่าแน่นอน",
          },
          {
            id: "opt-4",
            label: "4 (จำนวนสมาชิกทั้งหมดในแอเรย์)",
            isCorrect: false,
            feedback: "ผิดพลาด! ฟังก์ชันนี้คืนค่าสูงสุด ไม่ใช่คืนความยาว .length",
          },
        ],
        hint: "สังเกตการทำงานของ if (scores[i] > maxVal) เมื่อเปรียบเทียบกับ 45",
        blockCell: "E2",
        conceptId: "loops.execution",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "predict",
      },
    ],
  };

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
        id: "enc-f1-trace-max",
        title: "แกะรอยค่า maxVal ใน RAM",
        subtitle: "ตรวจสอบค่าของตัวแปรในหน่วยความจำขณะวนลูปมาถึง index ที่ 2",
        monsterName: "สไลม์แกะรอย",
        monsterType: "Slime",
        roomType: "combat",
        interactionType: "trace",
        prompt: "เมื่อวนลูปมาถึงรอบที่ i = 2 (scores[2] มีค่าเป็น 8 ขณะที่ maxVal ปัจจุบันคือ 45) ค่าของ maxVal ใน RAM หลังจบบรรทัดที่ 5 จะเป็นเท่าใด?",
        codeSnippet: `// scores = [12, 45, 8, 31]
let maxVal = scores[0]; // 12
for (let i = 1; i < scores.length; i++) {
  if (scores[i] > maxVal) {
    maxVal = scores[i];
  }
}`,
        activeLine: 4,
        variableTrace: {
          i: "2",
          "scores[i]": "8",
          maxVal: "45",
          "scores[i] > maxVal": "false (8 > 45 เป็นเท็จ)",
        },
        testSimulation: "RAM Trace รอบ i=2: scores[2]=8 ไม่มากกว่า maxVal(45) -> maxVal คงที่ 45",
        options: [
          {
            id: "opt-1",
            label: "maxVal มีค่าเท่ากับ 45 (คงเดิม เพราะ 8 ไม่ได้มากกว่า 45 คำสั่งอัปเดตจึงไม่ทำงาน)",
            isCorrect: true,
            feedback: "ถูกต้อง! เมื่อ 8 > 45 เป็น false ปีกกา if จะถูกข้ามไป ทำให้ maxVal รักษาสถานะ 45 ไว้เช่นเดิม",
          },
          {
            id: "opt-2",
            label: "maxVal เปลี่ยนเป็น 8 (ถูกเขียนทับด้วยค่าล่าสุด)",
            isCorrect: false,
            feedback: "ผิดพลาด! เงื่อนไข if ป้องกันไม่ให้เขียนทับค่าที่น้อยกว่า",
          },
          {
            id: "opt-3",
            label: "maxVal เปลี่ยนเป็น 53 (นำ 45 + 8 มารวมกัน)",
            isCorrect: false,
            feedback: "ผิดพลาด! โค้ดนี้ใช้เครื่องหมาย = กำหนดค่า ไม่ใช่ += บวกสะสม",
          },
        ],
        hint: "ดูเงื่อนไข if: 8 มากกว่า 45 หรือไม่? ถ้าไม่ คำสั่งใน if จะทำงานหรือไม่",
        blockCell: "E1",
        conceptId: "variables.state",
        damageOnFail: 20,
        xpReward: 30,
        learningPillar: "predict",
      },
    ],
  };

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
        id: "enc-f1-why-max",
        title: "ทำไมต้องเริ่ม maxVal ที่ scores[0]?",
        subtitle: "ทำความเข้าใจปัญหา State Initialization และตัวเลขติดลบ",
        monsterName: "วิญญาณผู้พิทักษ์ความรู้",
        monsterType: "Spirit",
        roomType: "shrine",
        interactionType: "why",
        prompt: "ทำไมในบรรทัดที่ 3 จึงควรกำหนด `let maxVal = scores[0];` แทนการตั้งค่าเริ่มต้นเป็น `let maxVal = 0;`?",
        codeSnippet: `function findMax(scores) {
  if (!scores || scores.length === 0) return null;
  let maxVal = scores[0]; // ทำไมไม่ตั้งเป็น 0?
  for (let i = 1; i < scores.length; i++) { ... }
}`,
        testSimulation: "Sandbox Test: หากตั้ง maxVal = 0 กับแอเรย์ตัวเลขติดลบ [-5, -2, -9] -> จะคืน 0 ซึ่งผิดมหันต์!",
        options: [
          {
            id: "opt-1",
            label: "เพื่อรองรับกรณีที่ข้อมูลในแอเรย์เป็นเลขติดลบทั้งหมด เช่น [-10, -5, -20] หากเริ่มที่ 0 จะได้คำตอบผิดเพี้ยนเป็น 0 ทันที",
            isCorrect: true,
            feedback: "เฉียบขาดมาก! หากตั้ง maxVal = 0 และแอเรย์มีแต่เลขติดลบ โปรแกรมจะตอบ 0 ซึ่งไม่มีอยู่จริงในข้อมูล",
          },
          {
            id: "opt-2",
            label: "เพราะภาษา JavaScript ไม่อนุญาตให้ใช้เลข 0 ในการเปรียบเทียบค่า",
            isCorrect: false,
            feedback: "ผิดพลาด! ภาษา JavaScript เปรียบเทียบเลข 0 ได้ตามปกติ แต่เป็นเรื่องของความถูกต้องทางคณิตศาสตร์",
          },
          {
            id: "opt-3",
            label: "เพื่อให้ตัวแปร maxVal มีชนิดข้อมูลตรงกับ index ตัวแรกเท่านั้น",
            isCorrect: false,
            feedback: "ไม่ใช่เหตุผลหลัก เหตุผลคือการตั้งค่าเริ่มต้นจากขอบเขตข้อมูลจริง (Domain-grounded Initialization)",
          },
        ],
        hint: "ลองจินตนาการว่าถ้าข้อมูลคะแนนเป็น [-8, -2, -15] แล้วเราเริ่ม maxVal = 0 เลข 0 จะมากกว่าทุกตัวเลยหรือไม่",
        blockCell: "F1",
        conceptId: "variables.purpose",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "explain",
      },
    ],
  };

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
        id: "enc-f2-edge-max",
        title: "ทดสอบกรณีแอเรย์ว่างหรือ null",
        subtitle: "ค้นหาจุดเปราะบางเมื่อรับข้อมูลไร้ค่า",
        monsterName: "ค้างคาวตกขอบ",
        monsterType: "Beast",
        roomType: "trap",
        interactionType: "bug",
        prompt: "หากเรียก `findMax([])` ด้วยแอเรย์ว่าง บรรทัดที่ 2 `if (!scores || scores.length === 0) return null;` ทำหน้าที่ป้องกันอันตรายใด?",
        codeSnippet: `function findMax(scores) {
  if (!scores || scores.length === 0) return null;
  let maxVal = scores[0];
  for (let i = 1; i < scores.length; i++) { ... }
  return maxVal;
}`,
        testSimulation: "Boundary Test: findMax([]) => null (Guard Clause ป้องกันข้อผิดพลาดเมื่อ scores ว่าง)",
        options: [
          {
            id: "opt-1",
            label: "ป้องกันไม่ให้ maxVal ถูกกำหนดเป็น undefined จาก scores[0] ซึ่งจะทำให้การเปรียบเทียบในลูปให้ผลลัพธ์ผิดพลาด",
            isCorrect: true,
            feedback: "ถูกต้อง! เมื่อแอเรย์ว่าง scores[0] คือ undefined การเปรียบเทียบ undefined > x จะเป็น false ตลอด และคืนค่าขยะออกมา",
          },
          {
            id: "opt-2",
            label: "ป้องกันไม่ให้คอมพิวเตอร์กินแรมเกิน 100%",
            isCorrect: false,
            feedback: "ไม่ตรงประเด็น! แอเรย์ว่างไม่ได้กินแรม แต่สร้างความผิดพลาดเชิงตรรกะ",
          },
          {
            id: "opt-3",
            label: "บังคับให้โปรแกรมเด้งหน้าต่างแจ้งเตือนทันที",
            isCorrect: false,
            feedback: "ผิดพลาด! return null เป็นการจัดการอย่างเงียบสงบและปลอดภัย (Graceful Degradation)",
          },
        ],
        hint: "ถ้า scores เป็นแอเรย์ว่าง scores[0] จะมีค่าเป็นอะไรใน JavaScript",
        blockCell: "E3",
        conceptId: "edge_case.boundary",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "debug",
      },
    ],
  };

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
        id: "enc-f2-transfer-max",
        title: "จำแนก Pattern การค้นหาสุดโต่งในโค้ดใหม่",
        subtitle: "พิสูจน์การโอนย้ายความรู้ (Transfer) ไปยังโค้ดชุดอื่น",
        monsterName: "เงาสะท้อนรูปแบบ",
        monsterType: "Shadow",
        roomType: "transfer",
        interactionType: "transfer",
        prompt: "พิจารณาโค้ดหานักวิ่งที่ทำเวลาได้เร็วที่สุดต่อไปนี้: โค้ดนี้ใช้ตรรกะเปรียบเทียบเดียวกับ findMax อย่างไร?",
        codeSnippet: `function findFastestRunner(runners) {
  if (!runners || runners.length === 0) return null;
  let best = runners[0];
  for (let i = 1; i < runners.length; i++) {
    if (runners[i].time < best.time) {
      best = runners[i];
    }
  }
  return best;
}`,
        testSimulation: "Pattern Analysis: Linear Extremum Traversal ตรวจสอบ O(N) เพื่อหาจุดสูงสุด",
        options: [
          {
            id: "opt-1",
            label: "ใช้โครงสร้างค้นหาค่าสุดโต่ง (Extremum Search) โดยเปลี่ยนจากการหาค่ามากสุดเป็นค่าน้อยที่สุดด้วยเครื่องหมาย <",
            isCorrect: true,
            feedback: "ยอดเยี่ยมมาก! ทั้งสองฟังก์ชันใช้ตรรกะเดียวกันเป๊ะ คือตั้งค่าเริ่มต้นจากตัวแรก แล้ววนลูปอัปเดตตัวแปรสภาวะเมื่อพบค่าที่ตรงเกณฑ์กว่า",
          },
          {
            id: "opt-2",
            label: "เป็นโค้ดคนละประเภทโดยสิ้นเชิงเพราะมีคำว่า .time ที่ไม่มีใน findMax",
            isCorrect: false,
            feedback: "ผิดพลาด! แม้โครงสร้างข้อมูลจะเป็น Object แต่ Pattern เชิงขั้นตอนวิธีคือ Extremum Traversal เดียวกัน",
          },
          {
            id: "opt-3",
            label: "โค้ดนี้เป็นลูปไม่รู้จบเพราะ runners ไม่ใช่ตัวเลขธรรมดา",
            isCorrect: false,
            feedback: "ผิดพลาด! ลูป for วิ่งตาม runners.length อย่างจำกัดรอบ",
          },
        ],
        hint: "ดูการตั้ง best = runners[0] และการวนลูปเปรียบเทียบค่าที่ดีกว่า",
        blockCell: "F3",
        conceptId: "patterns.transfer",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "transfer",
      },
    ],
  };

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
        id: "enc-f3-forge-max",
        title: "ดัดแปลงเป็นฟังก์ชันหาค่าน้อยที่สุด (findMin)",
        subtitle: "Modify โค้ดเดิมให้สลับทิศทางการเปรียบเทียบ",
        monsterName: "ช่างตีเหล็กอาคม",
        monsterType: "Construct",
        roomType: "forge",
        interactionType: "modify",
        prompt: "หากต้องการดัดแปลงฟังก์ชันนี้ให้กลายเป็น findMin (หาค่าน้อยที่สุด) ควรแก้ไขส่วนใดของโค้ด?",
        codeSnippet: `for (let i = 1; i < scores.length; i++) {
  // บรรทัดนี้ควรเปลี่ยนเงื่อนไขอย่างไร?
  if (scores[i] > maxVal) {
    maxVal = scores[i];
  }
}`,
        testSimulation: "Clean Code Check: ตรวจสอบ !scores || scores.length === 0 ที่ต้นฟังก์ชันป้องกันบั๊ก 100%",
        options: [
          {
            id: "opt-1",
            label: "เปลี่ยนเงื่อนไขเปรียบเทียบเป็น `if (scores[i] < minVal)` และเปลี่ยนชื่อตัวแปรให้อ่านเข้าใจง่าย",
            isCorrect: true,
            feedback: "ยอดเยี่ยม! สลับเครื่องหมายจาก > เป็น < และเปลี่ยนตัวแปรเป็น minVal จะได้ฟังก์ชันค้นหาค่าน้อยที่สุดอย่างสมบูรณ์",
          },
          {
            id: "opt-2",
            label: "เปลี่ยนค่าเริ่มต้นของ maxVal ให้เท่ากับ Infinity โดยไม่ต้องแก้เงื่อนไข if",
            isCorrect: false,
            feedback: "ถ้าเงื่อนไขยังเป็น > maxVal ค่า scores[i] จะไม่มีวันมากกว่า Infinity ได้เลย",
          },
          {
            id: "opt-3",
            label: "เปลี่ยนลูปให้วิ่งถอยหลังตั้งแต่ scores.length - 1 ลงมา",
            isCorrect: false,
            feedback: "การวิ่งถอยหลังไม่ได้เปลี่ยนทิศทางการเปรียบเทียบค่ามากสุดหรือน้อยสุด",
          },
        ],
        hint: "ค่าน้อยที่สุดต้องการตัวที่ 'น้อยกว่า' ตัวแปรปัจจุบัน",
        blockCell: "T2",
        conceptId: "logic.comparison_inversion",
        damageOnFail: 20,
        xpReward: 45,
        learningPillar: "debug",
      },
    ],
  };

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
        id: "enc-boss-p1-max",
        title: "บอสเฟสที่ 1: หลุมพรางเลขติดลบ (Predict Phase)",
        subtitle: "ทดสอบการทำงานเมื่อเจอกับดักเลขลบทั้งหมด",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "predict",
        prompt: "โกเลมแอบแก้โค้ดโดยตัด Guard Clause ทิ้ง แล้วตั้งค่าเริ่มต้นเป็น `let maxVal = 0;` เมื่อส่ง `scores = [-8, -3, -15]` ผลลัพธ์ที่ได้จะเป็นค่าใด?",
        codeSnippet: `let maxVal = 0; // โกเลมแอบตั้งเป็น 0
for (let i = 0; i < scores.length; i++) {
  if (scores[i] > maxVal) maxVal = scores[i];
}
return maxVal;`,
        testSimulation: "Boss Phase 1: การเริ่มวนลูปที่ i = 1 หลีกเลี่ยงการเปรียบเทียบ scores[0] กับตัวเองซ้ำซ้อน",
        options: [
          {
            id: "opt-1",
            label: "คืนค่า 0 ซึ่งผิดพลาดร้ายแรง เพราะในแอเรย์ไม่มีเลข 0 อยู่จริง และเลขลบทุกตัวน้อยกว่า 0 ทั้งหมด",
            isCorrect: true,
            feedback: "ทะลวงเกราะบอสสำเร็จ! คุณมองเห็นกับดักร้ายแรงของการตั้งค่าเริ่มต้นไม่สอดคล้องกับโดเมนข้อมูล",
          },
          {
            id: "opt-2",
            label: "คืนค่า -3 ได้ถูกต้องตามปกติ",
            isCorrect: false,
            feedback: "โดนโกเลมโจมตีสวนกลับ! เนื่องจาก -3 < 0 เงื่อนไข scores[i] > maxVal จะไม่เป็นจริงเลย",
          },
          {
            id: "opt-3",
            label: "โปรแกรม Crash ด้วย TypeError",
            isCorrect: false,
            feedback: "ผิดพลาด! โปรแกรมรันได้จนจบ แต่ให้คำตอบที่ผิดเพี้ยนเชิงตรรกะ (Silent Logic Bug)",
          },
        ],
        hint: "ทุกตัวใน scores เป็นเลขติดลบ ซึ่งน้อยกว่า 0 ทั้งหมด ดังนั้น maxVal จะเคยถูกแก้หรือไม่",
        blockCell: "E2",
        conceptId: "boundary.negative_numbers",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "predict",
      },
      {
        id: "enc-boss-p2-max",
        title: "บอสเฟสที่ 2: วินิจฉัยรอบลูป (Explain Phase)",
        subtitle: "อธิบายว่าทำไมลูปจึงเริ่มที่ index 1",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "why",
        prompt: "ทำไมในลูป for จึงเริ่มต้นรอบที่ `let i = 1` แทนที่จะเริ่มที่ `i = 0`?",
        codeSnippet: `let maxVal = scores[0];
for (let i = 1; i < scores.length; i++) { // ทำไมเริ่มที่ 1?
  if (scores[i] > maxVal) maxVal = scores[i];
}`,
        testSimulation: "Boss Phase 2: maxVal ถูกผูกไว้กับ Local Scope ไม่สร้างปัญหาต่อฟังก์ชันอื่น",
        options: [
          {
            id: "opt-1",
            label: "เพราะ maxVal ได้เก็บค่าของ index ที่ 0 ไปแล้ว การเริ่มที่ 1 จึงช่วยลดการเปรียบเทียบตัวเองซ้ำรอบแรกโดยไม่จำเป็น",
            isCorrect: true,
            feedback: "ฟันแกนกลางบอสเข้าเป้า! การเริ่มที่ i=1 เป็นการเขียนโค้ดที่กระชับและประหยัดรอบการประมวลผล",
          },
          {
            id: "opt-2",
            label: "เพราะ index 0 ใน JavaScript ห้ามนำมาวนลูป",
            isCorrect: false,
            feedback: "ผิดพลาด! index 0 วนลูปได้ตามปกติ แต่รอบแรกจะกลายเป็น scores[0] > scores[0] ซึ่งเป็นเท็จเสมอ",
          },
          {
            id: "opt-3",
            label: "เพราะตัวแปร i ถูกใช้เป็นตัวหารในภายหลัง",
            isCorrect: false,
            feedback: "ผิดพลาด! ในโค้ดไม่มีการนำ i ไปหารอะไรเลย",
          },
        ],
        hint: "ดูว่าก่อนเข้าลูป บรรทัดบนทำอะไรกับ scores[0]",
        blockCell: "F2",
        conceptId: "loops.redundancy_elimination",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "explain",
      },
      {
        id: "enc-boss-p3-max",
        title: "บอสเฟสสุดท้าย: กรองข้อมูลแปลกปลอม (Repair & Transfer Phase)",
        subtitle: "เขียนโค้ดเวอร์ชันสมบูรณ์ที่พร้อมรองรับทุกสถานการณ์",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "modify",
        prompt: "หากต้องการให้ฟังก์ชัน findMax ทนทานเมื่อมีสมาชิกที่ไม่ใช่ตัวเลขปะปนอยู่ (เช่น [10, 'invalid', 25]) ควรเขียนตัวกรองข้อมูลอย่างไรก่อนเปรียบเทียบ?",
        codeSnippet: `for (let i = 1; i < scores.length; i++) {
  // บรรทัดนี้ควรกรองข้อมูลอย่างไรก่อนเปรียบเทียบ?
  if (scores[i] > maxVal) { ... }
}`,
        testSimulation: "Boss Phase 3: รัน Automated Tests: [100], [-10, -5], [1, 2, 3, 4] ผ่านฉลุย 100% ผนึกโกเลมสำเร็จ",
        options: [
          {
            id: "opt-1",
            label: "`if (typeof scores[i] === 'number' && !Number.isNaN(scores[i]))` เพื่อตรวจสอบว่าเป็นตัวเลขที่ถูกต้องก่อนเปรียบเทียบ",
            isCorrect: true,
            feedback: "ผนึกโกเลมสำเร็จ! การตรวจสอบ Type และ NaN ทำให้ฟังก์ชันทนทานต่อข้อมูลที่ผิดรูป",
          },
          {
            id: "opt-2",
            label: "แปลงข้อมูลทุกตัวให้เป็น 0 ด้วย `Number(scores[i]) || 0`",
            isCorrect: false,
            feedback: "อันตราย! การแปลงเป็น 0 จะทำให้ข้อมูลเลขติดลบถูกแทนที่ด้วย 0 ผิดพลาด",
          },
          {
            id: "opt-3",
            label: "ลบสมาชิกตัวนั้นทิ้งออกจากแอเรย์ทันทีด้วย `delete scores[i]`",
            isCorrect: false,
            feedback: "การ mutate แอเรย์ขณะกำลังวนลูปเป็น anti-pattern ร้ายแรง",
          },
        ],
        hint: "จะรู้ได้อย่างไรว่าตัวแปรใดตัวหนึ่งเป็น number จริงๆ และไม่ใช่ NaN ในภาษา JavaScript",
        blockCell: "T4",
        conceptId: "defensive_programming",
        damageOnFail: 25,
        xpReward: 60,
        learningPillar: "transfer",
      },
    ],
  };

  return {
    [room0.id]: room0,
    [room1A.id]: room1A,
    [room1B.id]: room1B,
    [room2A.id]: room2A,
    [room2B.id]: room2B,
    [room3.id]: room3,
    [room4.id]: room4,
  };
}

// -----------------------------------------------------------------------------
// 3. COUNT VOWELS ENCOUNTER SUITE
// -----------------------------------------------------------------------------
function createCountVowelsRooms(code: string): Record<string, DungeonRoom> {
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
        id: "enc-f0-vowels",
        title: "ทำนายจำนวนสระในข้อความ",
        subtitle: "ประเมินพฤติกรรมเมื่อป้อนข้อความ 'Hello World'",
        monsterName: "โกเลมเฝ้าประตู",
        monsterType: "Construct",
        roomType: "combat",
        interactionType: "predict",
        prompt: "หากเรียกใช้งาน countVowels(\"Hello World\") ฟังก์ชันจะคืนตัวเลขใดออกมาเป็นผลลัพธ์สุดท้าย?",
        codeSnippet: code,
        testSimulation: "Sandbox Run: countVowels('Explain Code') => ส่งคืนค่า 5 (E, a, i, o, e)",
        options: [
          {
            id: "opt-1",
            label: "3 (ตัวอักษร 'e', 'o' ใน Hello และ 'o' ใน World เข้าเงื่อนไขสระ)",
            isCorrect: true,
            feedback: "ถูกต้องเฉียบคม! ตรวจพบสระ 3 ตัว ได้แก่ e, o, o ตามลำดับ",
          },
          {
            id: "opt-2",
            label: "2 (นับเฉพาะ e และ o ตัวแรก โดยไม่นับ o ซ้ำ)",
            isCorrect: false,
            feedback: "ผิดพลาด! ฟังก์ชันนี้นับทุกครั้งที่พบตัวอักษรสระ ไม่ได้ตัดตัวซ้ำออก",
          },
          {
            id: "opt-3",
            label: "10 (จำนวนตัวอักษรทั้งหมดในข้อความ)",
            isCorrect: false,
            feedback: "ผิดพลาด! โค้ดนับเฉพาะสระ ไม่ใช่ความยาวของข้อความทั้งหมด",
          },
          {
            id: "opt-4",
            label: "0 (ไม่พบนับเพราะมีช่องว่างคั่นกลาง)",
            isCorrect: false,
            feedback: "ผิดพลาด! ช่องว่างไม่ใช่สระจึงถูกข้ามไป แต่ตัวอักษรอื่นยังถูกตรวจตามปกติ",
          },
        ],
        hint: "นับดูว่าในคำว่า 'Hello' มีสระกี่ตัว และใน 'World' มีสระกี่ตัว",
        blockCell: "E2",
        conceptId: "loops.execution",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "predict",
      },
    ],
  };

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
        id: "enc-f1-trace-vowels",
        title: "แกะรอยตัวแปร count ใน RAM",
        subtitle: "ตรวจสอบค่าของตัวแปรในหน่วยความจำขณะกำลังตรวจอักษร 'e'",
        monsterName: "สไลม์แกะรอย",
        monsterType: "Slime",
        roomType: "combat",
        interactionType: "trace",
        prompt: "เมื่อรันลูปถึงรอบที่ i = 1 (กำลังตรวจ text[1] ซึ่งคือตัวอักษร 'e') ตัวแปร count ใน RAM จะเปลี่ยนเป็นเท่าใด?",
        codeSnippet: `// text = "Hello"
const vowels = "aeiouAEIOU";
let count = 0;
for (let i = 0; i < text.length; i++) {
  if (vowels.includes(text[i])) {
    count++;
  }
}`,
        activeLine: 4,
        variableTrace: {
          i: "1",
          "text[i]": "'e'",
          "vowels.includes('e')": "true",
          count: "0 -> 1",
        },
        testSimulation: "RAM Trace รอบ i=1: text[1]='x' ไม่ใช่สระ -> count ยังคงเป็น 1",
        options: [
          {
            id: "opt-1",
            label: "count เพิ่มขึ้นจาก 0 เป็น 1 (เพราะ 'e' อยู่ในสายอักขระ vowels)",
            isCorrect: true,
            feedback: "ถูกต้อง! เมื่อ vowels.includes('e') เป็น true คำสั่ง count++ จะทำงานทันที",
          },
          {
            id: "opt-2",
            label: "count ยังคงเป็น 0 เพราะลูปยังไม่สิ้นสุด",
            isCorrect: false,
            feedback: "ผิดพลาด! ตัวแปร count อัปเดตทันทีในแต่ละรอบ ไม่ได้รอจบลูป",
          },
          {
            id: "opt-3",
            label: "count เปลี่ยนเป็น 2",
            isCorrect: false,
            feedback: "ผิดพลาด! ในรอบที่ i=0 (ตัวอักษร 'H') ไม่ใช่สระ count จึงยังคงเป็น 0 ก่อนมารอบนี้",
          },
        ],
        hint: "รอบแรก text[0] คือ 'H' ไม่เข้าเงื่อนไข count จึงยังเป็น 0 พอเจอ 'e' จะบวก 1",
        blockCell: "E1",
        conceptId: "variables.state",
        damageOnFail: 20,
        xpReward: 30,
        learningPillar: "predict",
      },
    ],
  };

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
        id: "enc-f1-why-vowels",
        title: "ทำไม vowels จึงต้องมีทั้งพิมพ์เล็กและใหญ่?",
        subtitle: "เจาะลึกเรื่อง Case Sensitivity ในการประมวลผลข้อความ",
        monsterName: "วิญญาณผู้พิทักษ์ความรู้",
        monsterType: "Spirit",
        roomType: "shrine",
        interactionType: "why",
        prompt: "ทำไมในตัวแปร vowels จึงต้องกำหนดทั้งตัวพิมพ์เล็กและตัวพิมพ์ใหญ่ (\"aeiouAEIOU\")?",
        codeSnippet: `function countVowels(text) {
  const vowels = "aeiouAEIOU"; // ทำไมต้องมีทั้งเล็กและใหญ่?
  let count = 0;
  for (let i = 0; i < text.length; i++) { ... }
}`,
        testSimulation: "Sandbox Test: vowels รวม 'aeiouAEIOU' รองรับทั้งพิมพ์เล็กและพิมพ์ใหญ่",
        options: [
          {
            id: "opt-1",
            label: "เพราะการเปรียบเทียบตัวอักษรในภาษา JavaScript เป็นแบบ Case-sensitive ('A' ไม่เท่ากับ 'a')",
            isCorrect: true,
            feedback: "ยอดเยี่ยมมาก! JavaScript ถือว่า 'A' และ 'a' เป็นรหัสอักขระคนละตัวกัน จึงต้องระบุทั้งสองแบบหากไม่แปลงรูปก่อน",
          },
          {
            id: "opt-2",
            label: "เพื่อให้สายอักขระมีความยาวครบ 10 ตัวอักษรตามมาตรฐานหน่วยความจำ",
            isCorrect: false,
            feedback: "ไม่ใช่ข้อกำหนดของหน่วยความจำ แต่เป็นเรื่องความถูกต้องของเงื่อนไข",
          },
          {
            id: "opt-3",
            label: "เป็นข้อบังคับตามไวยากรณ์ของภาษา JavaScript",
            isCorrect: false,
            feedback: "ผิดพลาด! ภาษาไม่ได้บังคับ เราสามารถใช้ 'aeiou' ร่วมกับ toLowerCase() แทนได้",
          },
        ],
        hint: "คิดถึงคำว่า 'Apple' ตัว 'A' ตัวใหญ่จะตรงกับ 'a' ตัวเล็กใน 'aeiou' หรือไม่",
        blockCell: "F1",
        conceptId: "variables.purpose",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "explain",
      },
    ],
  };

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
        id: "enc-f2-edge-vowels",
        title: "ทดสอบคำที่ไม่มีสระเลย",
        subtitle: "ค้นหาจุดเปราะบางเมื่อรับคำไร้สระภาษาอังกฤษ",
        monsterName: "ค้างคาวตกขอบ",
        monsterType: "Beast",
        roomType: "trap",
        interactionType: "bug",
        prompt: "หากผู้ใช้นำเข้าข้อความ \"Rhythm\" (ไม่มีสระภาษาอังกฤษเลย) โค้ดนี้จะตอบกลับอย่างไร?",
        codeSnippet: `function countVowels(text) {
  const vowels = "aeiouAEIOU";
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (vowels.includes(text[i])) count++;
  }
  return count;
}`,
        testSimulation: "Boundary Test: countVowels('') => 0 (ข้อความว่าง คืนค่า 0 ทันที)",
        options: [
          {
            id: "opt-1",
            label: "คืนค่า 0 ออกมาอย่างปลอดภัย เพราะไม่มีตัวอักษรใดตรงกับ a, e, i, o, u เลย",
            isCorrect: true,
            feedback: "ถูกต้อง! โค้ดจะวนลูปครบทุกตัวโดยเงื่อนไขไม่เป็นจริงเลย แล้วส่งคืนค่าเริ่มต้น 0 ออกมา",
          },
          {
            id: "opt-2",
            label: "เกิดข้อผิดพลาด TypeError",
            isCorrect: false,
            feedback: "ผิดพลาด! 'Rhythm' เป็น string ที่ถูกต้อง โค้ดจะทำงานได้จนจบ",
          },
          {
            id: "opt-3",
            label: "คืนค่า -1 เพื่อระบุว่าหาไม่เจอ",
            isCorrect: false,
            feedback: "ผิดพลาด! ฟังก์ชันนี้คือตัวนับจำนวน (Counter) หากไม่เจอจะตอบ 0 ไม่ใช่ -1",
          },
        ],
        hint: "ตัวแปร count เริ่มต้นที่ 0 ถ้าไม่มีตัวไหนเข้าเงื่อนไขเลย count จะเปลี่ยนหรือไม่",
        blockCell: "E3",
        conceptId: "edge_case.boundary",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "debug",
      },
    ],
  };

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
        id: "enc-f2-transfer-vowels",
        title: "จำแนก Pattern การตรวจสมาชิกในโค้ดใหม่",
        subtitle: "พิสูจน์การโอนย้ายความรู้ (Transfer) ไปยังโค้ดชุดอื่น",
        monsterName: "เงาสะท้อนรูปแบบ",
        monsterType: "Shadow",
        roomType: "transfer",
        interactionType: "transfer",
        prompt: "พิจารณาโค้ดนับตัวเลขในรหัสผ่านต่อไปนี้: ตัวแปรใดทำหน้าที่ตรวจหาการเป็นสมาชิก (Membership Check) เทียบเท่ากับ vowels ในโค้ดเดิม?",
        codeSnippet: `function countDigits(password) {
  const digits = "0123456789";
  let totalDigits = 0;
  for (let i = 0; i < password.length; i++) {
    if (digits.includes(password[i])) {
      totalDigits++;
    }
  }
  return totalDigits;
}`,
        testSimulation: "Pattern Analysis: String Membership Inspection O(N) ผ่าน String.includes()",
        options: [
          {
            id: "opt-1",
            label: "digits (เก็บชุดอักขระเป้าหมายที่ต้องการตรวจสอบการเป็นสมาชิก)",
            isCorrect: true,
            feedback: "เฉียบขาดมาก! digits และ vowels ทำหน้าที่เป็น Reference Set เพื่อตรวจว่าอักขระปัจจุบันตรงกับกลุ่มเป้าหมายหรือไม่",
          },
          {
            id: "opt-2",
            label: "totalDigits (ตัวสะสมผลลัพธ์)",
            isCorrect: false,
            feedback: "ผิดพลาด! totalDigits เทียบเท่ากับ count (ตัวสะสมค่า) ไม่ใช่ชุดตัวตรวจ",
          },
          {
            id: "opt-3",
            label: "password[i] (ตัวอักษรปัจจุบัน)",
            isCorrect: false,
            feedback: "ผิดพลาด! password[i] คือตัวที่ถูกนำไปตรวจ ไม่ใช่ชุดอักขระอ้างอิง",
          },
        ],
        hint: "ดูตัวแปรที่เป็นสตริงเก็บตัวอักษรที่อนุญาต/เป้าหมาย",
        blockCell: "F3",
        conceptId: "patterns.transfer",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "transfer",
      },
    ],
  };

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
        id: "enc-f3-forge-vowels",
        title: "ปรับปรุงด้วย toLowerCase() เพื่อความกระชับ",
        subtitle: "Modify โค้ดให้ใช้ vowels สั้นลงโดยยังคงนับตัวพิมพ์ใหญ่ได้",
        monsterName: "ช่างตีเหล็กอาคม",
        monsterType: "Construct",
        roomType: "forge",
        interactionType: "modify",
        prompt: "หากต้องการปรับปรุงโค้ดให้ vowels มีเฉพาะตัวพิมพ์เล็ก (\"aeiou\") แต่ยังคงนับตัวพิมพ์ใหญ่ได้ถูกต้อง ควรแก้เงื่อนไข if อย่างไร?",
        codeSnippet: `const vowels = "aeiou";
for (let i = 0; i < text.length; i++) {
  // บรรทัดนี้ควรเขียนเงื่อนไขอย่างไร?
  if (...) {
    count++;
  }
}`,
        testSimulation: "Clean Code Check: การแปลง text.toLowerCase() หรือใช้ Set ช่วยเพิ่มประสิทธิภาพและความกระชับ",
        options: [
          {
            id: "opt-1",
            label: "เปลี่ยนเป็น `if (vowels.includes(text[i].toLowerCase()))`",
            isCorrect: true,
            feedback: "ยอดเยี่ยม! แปลงตัวอักษรปัจจุบันให้เป็นพิมพ์เล็กก่อนตรวจ ทำให้เทียบกับ 'aeiou' ได้ทั้งเล็กและใหญ่",
          },
          {
            id: "opt-2",
            label: "เปลี่ยนเป็น `if (vowels.includes(text[i] + 'a'))`",
            isCorrect: false,
            feedback: "ผิดพลาด! การต่อ 'a' เข้าไปจะทำให้สตริงยาว 2 ตัวอักษรและไม่ตรงกับสระตัวใดเลย",
          },
          {
            id: "opt-3",
            label: "เปลี่ยนเป็น `if (vowels == text[i])`",
            isCorrect: false,
            feedback: "ผิดพลาด! เครื่องหมาย == จะตรวจความเท่ากันทั้งหมด ไม่ใช่การตรวจว่ามีตัวอักษรนั้นอยู่ข้างในหรือไม่",
          },
        ],
        hint: "ฟังก์ชันใดใน JavaScript ที่ใช้แปลงตัวอักษรให้กลายเป็นตัวพิมพ์เล็กทั้งหมด",
        blockCell: "T2",
        conceptId: "strings.normalization",
        damageOnFail: 20,
        xpReward: 45,
        learningPillar: "debug",
      },
    ],
  };

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
        id: "enc-boss-p1-vowels",
        title: "บอสเฟสที่ 1: ลูปขาดตัวสุดท้าย (Predict Phase)",
        subtitle: "ทดสอบการทำงานเมื่อเจอกับดัก Off-by-one ในสตริง",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "predict",
        prompt: "โกเลมแอบตัดเงื่อนไขลูปเป็น `for (let i = 0; i < text.length - 1; i++)` (มีลบหนึ่ง) เมื่อส่ง \"Banana\" จะได้ผลลัพธ์เท่าใด?",
        codeSnippet: `const vowels = "aeiouAEIOU";
let count = 0;
for (let i = 0; i < text.length - 1; i++) { // โกเลมแอบใส่ - 1
  if (vowels.includes(text[i])) count++;
}
return count;`,
        testSimulation: "Boss Phase 1: การเข้าถึง text[text.length] ใน JS ได้ undefined ไม่เกิด Exception",
        options: [
          {
            id: "opt-1",
            label: "ได้ผลลัพธ์ 2 (เพราะตัว 'a' ตัวสุดท้ายที่ index 5 ถูกข้ามไป ไม่ถูกนับ)",
            isCorrect: true,
            feedback: "ทะลวงเกราะบอสสำเร็จ! คุณสังเกตเห็นว่า i < text.length - 1 หยุดก่อนถึงตัวสุดท้าย ทำให้พลาด 'a' ตัวท้ายสุดไป",
          },
          {
            id: "opt-2",
            label: "ได้ผลลัพธ์ 3 เท่าเดิม",
            isCorrect: false,
            feedback: "โดนโกเลมโจมตีสวนกลับ! ลูปนี้จะตรวจถึงแค่อักษร 'n' ที่ index 4 ข้าม 'a' ตัวที่ 5 ไป",
          },
          {
            id: "opt-3",
            label: "โปรแกรม Crash ด้วย StringIndexOutOfBounds",
            isCorrect: false,
            feedback: "ผิดพลาด! ลูปวิ่งน้อยลงกว่าเดิม จึงไม่มีทางหลุดขอบเกินขนาด",
          },
        ],
        hint: "คำว่า 'Banana' ยาว 6 ตัวอักษร (index 0 ถึง 5) ถ้า i < 5 รอบสุดท้าย i จะมีค่าเท่าใด",
        blockCell: "E2",
        conceptId: "boundary.off_by_one_underflow",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "predict",
      },
      {
        id: "enc-boss-p2-vowels",
        title: "บอสเฟสที่ 2: วินิจฉัยตำแหน่งการประกาศ (Explain Phase)",
        subtitle: "อธิบายผลกระทบของประสิทธิภาพและความปลอดภัย",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "why",
        prompt: "หากย้าย `const vowels = 'aeiouAEIOU';` เข้าไปไว้ ภายในลูป for จะเกิดผลกระทบใดต่อการทำงานของโปรแกรม?",
        codeSnippet: `for (let i = 0; i < text.length; i++) {
  const vowels = "aeiouAEIOU"; // ย้ายเข้ามาข้างในลูป
  if (vowels.includes(text[i])) count++;
}`,
        testSimulation: "Boss Phase 2: const vowels ป้องกันการถูก Reassign ระหว่างการทำงาน",
        options: [
          {
            id: "opt-1",
            label: "โปรแกรมยังทำงานได้ผลลัพธ์ถูกต้อง แต่สร้างสายอักขระ vowels ใหม่ทุกรอบที่วนลูป ทำให้สิ้นเปลืองหน่วยความจำโดยไม่จำเป็น",
            isCorrect: true,
            feedback: "ฟันแกนกลางบอสเข้าเป้า! ค่าคงที่ที่ไม่มีการเปลี่ยนค่าควรประกาศไว้นอกลูปเพื่อประสิทธิภาพสูงสุด",
          },
          {
            id: "opt-2",
            label: "ทำให้ผลลัพธ์กลายเป็น 0 เสมอ",
            isCorrect: false,
            feedback: "ผิดพลาด! ในลูปยังเข้าถึง vowels ได้ปกติ แต่เปลืองทรัพยากร",
          },
          {
            id: "opt-3",
            label: "โปรแกรมจะหยุดทำงานทันทีเพราะ const ห้ามอยู่ในลูป",
            isCorrect: false,
            feedback: "ผิดพลาด! const สามารถประกาศใน Block scope ของลูปได้ จะสร้าง instance ใหม่ตามรอบ",
          },
        ],
        hint: "คิดถึงเรื่องการสร้างอ็อบเจกต์ซ้ำๆ ในทุกรอบที่วนลูป",
        blockCell: "F2",
        conceptId: "performance.scope_efficiency",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "explain",
      },
      {
        id: "enc-boss-p3-vowels",
        title: "บอสเฟสสุดท้าย: ปกป้องฟังก์ชันจากชนิดข้อมูลผิดรูป (Repair & Transfer Phase)",
        subtitle: "เขียนโค้ดเวอร์ชันสมบูรณ์ที่พร้อมรองรับทุกสถานการณ์",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "modify",
        prompt: "หากต้องการให้ countVowels ปลอดภัยเมื่อมีผู้ส่งค่า null, undefined หรือตัวเลขเข้ามา ควรใส่ Guard Clause ใดที่ต้นฟังก์ชัน?",
        codeSnippet: `function countVowels(text) {
  // บรรทัดนี้ควรใส่ Guard Clause ใด?
  ...
  const vowels = "aeiouAEIOU";
  let count = 0;
  for (let i = 0; i < text.length; i++) { ... }
  return count;
}`,
        testSimulation: "Boss Phase 3: รัน Automated Tests: 'hello', 'rhythm', '', 'AEIOU' ผ่านฉลุย 100% ผนึกโกเลมสำเร็จ",
        options: [
          {
            id: "opt-1",
            label: "`if (typeof text !== 'string') return 0;`",
            isCorrect: true,
            feedback: "ผนึกโกเลมสำเร็จ! การตรวจสอบ typeof string ป้องกัน TypeError จากการเรียก .length หรือ .includes บนค่าที่ไม่ใช่ข้อความ",
          },
          {
            id: "opt-2",
            label: "`if (text === null) throw new Error();`",
            isCorrect: false,
            feedback: "ไม่ครอบคลุม! ดักได้แค่ null แต่ตัวเลขหรือ undefined จะยังทำให้โค้ดพัง",
          },
          {
            id: "opt-3",
            label: "`text = text.toString();` โดยไม่ตรวจชนิดข้อมูล",
            isCorrect: false,
            feedback: "อันตราย! ถ้า text เป็น null หรือ undefined การเรียก .toString() จะ Throw TypeError ทันที",
          },
        ],
        hint: "คำสั่งใดใช้ตรวจสอบว่าตัวแปรมีประเภทเป็น string ใน JavaScript",
        blockCell: "T4",
        conceptId: "defensive_programming",
        damageOnFail: 25,
        xpReward: 60,
        learningPillar: "transfer",
      },
    ],
  };

  return {
    [room0.id]: room0,
    [room1A.id]: room1A,
    [room1B.id]: room1B,
    [room2A.id]: room2A,
    [room2B.id]: room2B,
    [room3.id]: room3,
    [room4.id]: room4,
  };
}

// -----------------------------------------------------------------------------
// 4. IS PALINDROME ENCOUNTER SUITE
// -----------------------------------------------------------------------------
function createIsPalindromeRooms(code: string): Record<string, DungeonRoom> {
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
        id: "enc-f0-pal",
        title: "ทำนายผลลัพธ์กระจกสะท้อนคำ",
        subtitle: "ประเมินพฤติกรรมเมื่อตรวจสอบคำว่า 'racecar'",
        monsterName: "โกเลมเฝ้าประตู",
        monsterType: "Construct",
        roomType: "combat",
        interactionType: "predict",
        prompt: "หากเรียกใช้งาน isPalindrome(\"racecar\") ฟังก์ชันจะคืนค่าใดออกมาเป็นผลลัพธ์สุดท้าย?",
        codeSnippet: code,
        testSimulation: "Sandbox Run: isPalindrome('racecar') => true, isPalindrome('hello') => false",
        options: [
          {
            id: "opt-1",
            label: "true (เพราะตัวอักษรจากซ้ายไปขวาและขวาไปซ้ายตรงกันทุกคู่จนพอยน์เตอร์เดินชนกันตรงกลาง)",
            isCorrect: true,
            feedback: "ถูกต้องเฉียบคม! 'racecar' อ่านกลับหลังได้คำเดิม และเงื่อนไขในลูปไม่เคยเจอตัวอักษรที่ไม่ตรงกัน",
          },
          {
            id: "opt-2",
            label: "false (เพราะความยาวของคำเป็นเลขคี่ 7 ตัวอักษร)",
            isCorrect: false,
            feedback: "ผิดพลาด! พาลินโดรมเป็นได้ทั้งความยาวเลขคู่และเลขคี่ สำหรับเลขคี่ตัวตรงกลางจะถูกข้ามเมื่อ left ชน right",
          },
          {
            id: "opt-3",
            label: "undefined (เพราะลูปทำงานไม่รู้จบ)",
            isCorrect: false,
            feedback: "ผิดพลาด! คำสั่ง left++ และ right-- ทำให้ลูปขยับเข้าหากันและจบอย่างแน่นอน",
          },
        ],
        hint: "ดูคู่ตัวอักษร: r-r, a-a, c-c ตรงกันหมดหรือไม่",
        blockCell: "E2",
        conceptId: "loops.execution",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "predict",
      },
    ],
  };

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
        id: "enc-f1-trace-pal",
        title: "แกะรอยพอยน์เตอร์ left และ right ใน RAM",
        subtitle: "ตรวจสอบตำแหน่งตัวชี้เมื่อทดสอบคำว่า 'noon'",
        monsterName: "สไลม์แกะรอย",
        monsterType: "Slime",
        roomType: "combat",
        interactionType: "trace",
        prompt: "เมื่อทดสอบด้วยคำว่า \"noon\" (ความยาว 4) ในรอบแรกเริ่มต้น left = 0 ('n') และ right = 3 ('n') หลังผ่านคำสั่ง left++ และ right-- ค่าของพอยน์เตอร์ทั้งสองใน RAM จะเป็นเท่าใดในรอบถัดไป?",
        codeSnippet: `// text = "noon"
let left = 0;
let right = text.length - 1; // 3
while (left < right) {
  if (text[left] !== text[right]) return false;
  left++;
  right--;
}`,
        activeLine: 5,
        variableTrace: {
          left: "0 -> 1 ('o')",
          right: "3 -> 2 ('o')",
          "left < right": "true (1 < 2)",
          status: "กำลังเข้าสู่รอบที่สอง",
        },
        testSimulation: "RAM Trace รอบที่ 1: text[0]='r', text[6]='r' ตรงกัน -> left=1, right=5",
        options: [
          {
            id: "opt-1",
            label: "left = 1 และ right = 2 (ตัวชี้ทั้งสองฝั่งขยับเข้าหากันคนละ 1 ตำแหน่ง)",
            isCorrect: true,
            feedback: "ถูกต้อง! left เพิ่มขึ้นเป็น 1 และ right ลดลงเหลือ 2 เพื่อเปรียบเทียบคู่ถัดไป",
          },
          {
            id: "opt-2",
            label: "left = 0 และ right = 3 (ไม่เปลี่ยนค่า)",
            isCorrect: false,
            feedback: "ผิดพลาด! คำสั่ง left++ และ right-- เปลี่ยนค่าตัวแปรใน RAM ทันที",
          },
          {
            id: "opt-3",
            label: "left = 2 และ right = 1 (สวนทางกันทันทีในรอบแรก)",
            isCorrect: false,
            feedback: "ผิดพลาด! ตัวชี้จะขยับทีละ 1 ตำแหน่งต่อรอบเท่านั้น",
          },
        ],
        hint: "0 บวก 1 ได้เท่าใด และ 3 ลบ 1 เหลือเท่าใด",
        blockCell: "E1",
        conceptId: "variables.state",
        damageOnFail: 20,
        xpReward: 30,
        learningPillar: "predict",
      },
    ],
  };

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
        id: "enc-f1-why-pal",
        title: "ทำไมเงื่อนไขจึงใช้ left < right?",
        subtitle: "เจาะลึกบทบาทของ Two-Pointer Termination Invariant",
        monsterName: "วิญญาณผู้พิทักษ์ความรู้",
        monsterType: "Spirit",
        roomType: "shrine",
        interactionType: "why",
        prompt: "ทำไมเงื่อนไขในลูป while จึงต้องใช้ `left < right` แทนที่จะเป็น `left <= text.length`?",
        codeSnippet: `function isPalindrome(text) {
  let left = 0;
  let right = text.length - 1;
  while (left < right) { // ทำไมใช้ left < right?
    ...
  }
  return true;
}`,
        testSimulation: "Sandbox Test: return false ทันทีที่เจอตัวอักษรไม่ตรงกัน ช่วยลดเวลาลงครึ่งหนึ่ง (Early Exit)",
        options: [
          {
            id: "opt-1",
            label: "เพราะการเปรียบเทียบจากหัวและท้ายพร้อมกันจะสมบูรณ์เมื่อตัวชี้มาชนหรือสวนทางกันตรงกลาง การวิ่งต่อจะกลายเป็นการตรวจซ้ำซ้อน",
            isCorrect: true,
            feedback: "ยอดเยี่ยมมาก! เมื่อ left >= right แปลว่าเราตรวจครบทุกคู่แล้ว และตัวอักษรตรงกลาง (กรณีเลขคี่) ไม่จำเป็นต้องเปรียบเทียบกับตัวเอง",
          },
          {
            id: "opt-2",
            label: "เพราะภาษา JavaScript บังคับให้ลูป while มีตัวแปรไม่เกิน 2 ตัว",
            isCorrect: false,
            feedback: "ไม่ใช่ข้อกำหนดของภาษา แต่เป็นหลักอัลกอริทึม",
          },
          {
            id: "opt-3",
            label: "เพื่อป้องกันไม่ให้ right มีค่าติดลบ",
            isCorrect: false,
            feedback: "ไม่ใช่เหตุผลหลัก การหยุดที่จุดกึ่งกลางช่วยประหยัดเวลาการประมวลผลไปครึ่งหนึ่ง (O(N/2))",
          },
        ],
        hint: "คิดถึงจุดที่นิ้วชี้สองข้างจิ้มจากขอบซ้ายขวาแล้วมาชนกันตรงกลาง",
        blockCell: "F1",
        conceptId: "variables.purpose",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "explain",
      },
    ],
  };

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
        id: "enc-f2-edge-pal",
        title: "ทดสอบคำที่มีอักษรตัวเดียวหรือข้อความว่าง",
        subtitle: "ค้นหาจุดเปราะบางเมื่อรับข้อความขนาดเล็กสุด",
        monsterName: "ค้างคาวตกขอบ",
        monsterType: "Beast",
        roomType: "trap",
        interactionType: "bug",
        prompt: "หากป้อนข้อความตัวอักษรเดี่ยว เช่น \"A\" หรือข้อความว่าง \"\" ฟังก์ชันนี้จะตอบกลับอย่างไร?",
        codeSnippet: `function isPalindrome(text) {
  let left = 0;
  let right = text.length - 1;
  while (left < right) {
    if (text[left] !== text[right]) return false;
    left++;
    right--;
  }
  return true;
}`,
        testSimulation: "Boundary Test: isPalindrome('') => true, isPalindrome('a') => true",
        options: [
          {
            id: "opt-1",
            label: "คืนค่า true ทันที เพราะเงื่อนไข left < right เป็นเท็จตั้งแต่แรก ลูปจึงไม่ทำงานและลงมาที่ return true",
            isCorrect: true,
            feedback: "ถูกต้อง! สำหรับ 'A' (length=1) left=0, right=0 เงื่อนไข 0 < 0 เป็นเท็จ จึงคืน true ตามนิยามทางคณิตศาสตร์",
          },
          {
            id: "opt-2",
            label: "เกิดข้อผิดพลาด Infinite Loop",
            isCorrect: false,
            feedback: "ผิดพลาด! ลูปจะไม่เริ่มทำงานด้วยซ้ำเพราะเงื่อนไขไม่ผ่าน",
          },
          {
            id: "opt-3",
            label: "คืนค่า false เพราะความยาวไม่พอตรวจ",
            isCorrect: false,
            feedback: "ผิดพลาด! ตัวอักษรเดี่ยวถือว่าเป็นพาลินโดรมในทางวิทยาการคอมพิวเตอร์",
          },
        ],
        hint: "ถ้า text = 'A' ค่า left คือ 0 และ right คือ 1 - 1 = 0 แล้ว 0 < 0 หรือไม่",
        blockCell: "E3",
        conceptId: "edge_case.boundary",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "debug",
      },
    ],
  };

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
        id: "enc-f2-transfer-pal",
        title: "จำแนก Pattern Two-Pointer ในโค้ดใหม่",
        subtitle: "พิสูจน์การโอนย้ายความรู้ (Transfer) ไปยังโค้ดชุดอื่น",
        monsterName: "เงาสะท้อนรูปแบบ",
        monsterType: "Shadow",
        roomType: "transfer",
        interactionType: "transfer",
        prompt: "พิจารณาโค้ดกลับด้านสมาชิกในแอเรย์ต่อไปนี้: โค้ดนี้ใช้กลยุทธ์การเขียนโปรแกรม (Pattern) ใดร่วมกับ isPalindrome?",
        codeSnippet: `function reverseArray(arr) {
  let start = 0;
  let end = arr.length - 1;
  while (start < end) {
    let temp = arr[start];
    arr[start] = arr[end];
    arr[end] = temp;
    start++;
    end--;
  }
  return arr;
}`,
        testSimulation: "Pattern Analysis: Two-Pointer Inward Scan O(N/2) Space O(1)",
        options: [
          {
            id: "opt-1",
            label: "กลยุทธ์ Two-Pointer Inward Traversal (สองตัวชี้วิ่งเข้าหากันจากสองฝั่งเพื่อประมวลผลข้อมูลสมมาตร)",
            isCorrect: true,
            feedback: "เฉียบขาดมาก! ทั้งสองฟังก์ชันใช้เทคนิค Two-Pointer โดยตัวหนึ่งเริ่มที่ต้น อีกตัวเริ่มที่ท้าย แล้วบีบเข้าหากันจนบรรจบกันตรงกลาง",
          },
          {
            id: "opt-2",
            label: "กลยุทธ์ Divide and Conquer",
            isCorrect: false,
            feedback: "ผิดพลาด! ไม่มีการแบ่งปัญหาย่อยแบบ Recursion",
          },
          {
            id: "opt-3",
            label: "กลยุทธ์ Dynamic Programming",
            isCorrect: false,
            feedback: "ผิดพลาด! ไม่มีการจำผลลัพธ์ในตาราง Memoization",
          },
        ],
        hint: "สังเกต start++ และ end-- ที่วิ่งเข้าหากันจากปลายทั้งสองฝั่ง",
        blockCell: "F3",
        conceptId: "patterns.transfer",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "transfer",
      },
    ],
  };

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
        id: "enc-f3-forge-pal",
        title: "ปรับปรุงให้ตรวจแบบ Case-Insensitive",
        subtitle: "Modify โค้ดให้คำอย่าง 'Madam' หรือ 'Racecar' ได้ผลลัพธ์เป็น true",
        monsterName: "ช่างตีเหล็กอาคม",
        monsterType: "Construct",
        roomType: "forge",
        interactionType: "modify",
        prompt: "หากต้องการให้ isPalindrome ตรวจคำอย่าง \"Madam\" หรือ \"Racecar\" ให้ได้ผลเป็น true ควรอัปเดตเงื่อนไขเปรียบเทียบอย่างไร?",
        codeSnippet: `while (left < right) {
  // บรรทัดนี้ควรปรับปรุงอย่างไร?
  if (text[left] !== text[right]) {
    return false;
  }
  left++;
  right--;
}`,
        testSimulation: "Clean Code Check: Two-Pointer ประหยัดหน่วยความจำกว่าการสร้าง string ใหม่ด้วย reverse()",
        options: [
          {
            id: "opt-1",
            label: "เปลี่ยนเป็น `if (text[left].toLowerCase() !== text[right].toLowerCase()) return false;`",
            isCorrect: true,
            feedback: "ยอดเยี่ยม! แปลงตัวอักษรทั้งสองฝั่งเป็นตัวพิมพ์เล็กก่อนเปรียบเทียบ ทำให้ 'M' เท่ากับ 'm'",
          },
          {
            id: "opt-2",
            label: "เปลี่ยนเป็น `if (text[left] == text[right]) return true;`",
            isCorrect: false,
            feedback: "ผิดพลาดร้ายแรง! การคืนค่า true ทันทีในลูปจะทำให้ตรวจแค่คู่แรกคู่เดียวแล้วจบการทำงาน",
          },
          {
            id: "opt-3",
            label: "ลบเงื่อนไข if ทิ้งแล้วให้คืนค่า true เสมอ",
            isCorrect: false,
            feedback: "ผิดพลาด! จะทำให้คำที่ไม่ใช่พาลินโดรมผ่านไปด้วย",
          },
        ],
        hint: "ต้องแปลงทั้งตัวซ้ายและตัวขวาให้มีขนาดตัวพิมพ์เดียวกันก่อนเปรียบเทียบ",
        blockCell: "T2",
        conceptId: "strings.case_folding",
        damageOnFail: 20,
        xpReward: 45,
        learningPillar: "debug",
      },
    ],
  };

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
        id: "enc-boss-p1-pal",
        title: "บอสเฟสที่ 1: ลืมขยับพอยน์เตอร์ (Predict Phase)",
        subtitle: "ทดสอบการทำงานเมื่อเจอกับดักลูปไม่รู้จบ",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "predict",
        prompt: "โกเลมแอบลบบรรทัด `right--;` ทิ้งไป เมื่อเรียก `isPalindrome(\"abba\")` จะเกิดสิ่งใดขึ้น?",
        codeSnippet: `let left = 0;
let right = text.length - 1;
while (left < right) {
  if (text[left] !== text[right]) return false;
  left++;
  // โกเลมแอบลบ right--; ทิ้ง
}
return true;`,
        testSimulation: "Boss Phase 1: เงื่อนไข while (left < right) หยุดอย่างปลอดภัยเมื่อ pointer ชนกันตรงกลาง",
        options: [
          {
            id: "opt-1",
            label: "ในรอบที่สอง left=1 ('b') แต่ right=3 ('a') ทำให้เงื่อนไขไม่ตรงกัน และคืนค่า false ออกมาผิดเพี้ยน",
            isCorrect: true,
            feedback: "ทะลวงเกราะบอสสำเร็จ! เมื่อ right ไม่ลดลง ตัวชี้จะเทียบผิดคู่ในรอบถัดไปและคืนค่า false ที่ไม่ถูกต้อง",
          },
          {
            id: "opt-2",
            label: "ได้ค่า true เหมือนเดิมไม่มีข้อผิดพลาด",
            isCorrect: false,
            feedback: "โดนโกเลมโจมตีสวนกลับ! พอยน์เตอร์ขยับข้างเดียวทำให้เปรียบเทียบตำแหน่งผิดคู่",
          },
          {
            id: "opt-3",
            label: "โปรแกรมเด้ง OutOfMemoryError ทันที",
            isCorrect: false,
            feedback: "ผิดพลาด! แม้ลูปจะแปลกไปแต่มันจะสะดุดคืนค่า false ในรอบที่สองทันที",
          },
        ],
        hint: "รอบแรก 'a' === 'a' ผ่าน พอ left++ กลายเป็น 1 ('b') แต่ right ยังเป็น 3 ('a') เปรียบเทียบแล้วจะได้อะไร",
        blockCell: "E2",
        conceptId: "pointers.synchronization",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "predict",
      },
      {
        id: "enc-boss-p2-pal",
        title: "บอสเฟสที่ 2: วินิจฉัยรูปแบบ Early Return (Explain Phase)",
        subtitle: "อธิบายข้อดีของการคืนค่าทันทีที่เจอข้อผิดพลาด",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "why",
        prompt: "ทำไมเมื่อพบ `text[left] !== text[right]` ฟังก์ชันจึงสามารถ `return false;` ออกไปได้ทันทีโดยไม่ต้องตรวจตัวอักษรที่เหลือ?",
        codeSnippet: `if (text[left] !== text[right]) {
  return false; // ทำไมคืนค่าได้ทันที?
}`,
        testSimulation: "Boss Phase 2: ตัวแปร left, right อัปเดตพร้อมกันในแต่ละรอบ ป้องกัน Infinite Loop",
        options: [
          {
            id: "opt-1",
            label: "เพราะตามนิยามของพาลินโดรม หากมีตัวอักษรแม้แต่คู่เดียวที่ไม่สมมาตร ข้อความนั้นย่อมไม่มีทางเป็นพาลินโดรมได้อีกต่อไป (Short-circuit Evaluation)",
            isCorrect: true,
            feedback: "ฟันแกนกลางบอสเข้าเป้า! หลักการ Early Return ช่วยประหยัดเวลาการคำนวณอย่างมหาศาล",
          },
          {
            id: "opt-2",
            label: "เพราะคำสั่ง return ในลูป while บังคับให้เขียนเฉพาะ false เท่านั้น",
            isCorrect: false,
            feedback: "ไม่ใช่ข้อกำหนดของภาษา แต่เป็นตรรกะทางคณิตศาสตร์",
          },
          {
            id: "opt-3",
            label: "เพื่อป้องกันไม่ให้ซีพียูร้อนเกินไป",
            isCorrect: false,
            feedback: "ไม่ใช่คำตอบทางวิศวกรรมซอฟต์แวร์",
          },
        ],
        hint: "ถ้าอักษรตัวแรกกับตัวสุดท้ายไม่เหมือนกัน คำนั้นยังมีโอกาสอ่านกลับหลังได้คำเดิมอยู่ไหม",
        blockCell: "F2",
        conceptId: "patterns.early_return",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "explain",
      },
      {
        id: "enc-boss-p3-pal",
        title: "บอสเฟสสุดท้าย: ซ่อมแซมและผนึกแกนกลาง (Repair & Transfer Phase)",
        subtitle: "เขียนโค้ดเวอร์ชันสมบูรณ์ที่พร้อมรองรับทุกสถานการณ์",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "modify",
        prompt: "หากต้องการให้ isPalindrome รองรับข้อความที่มีช่องว่างหรือเครื่องหมายวรรคตอน (เช่น \"A man, a plan, a canal: Panama\") ควรเพิ่มขั้นตอนใดก่อนเริ่ม Two-Pointer?",
        codeSnippet: `function isPalindrome(text) {
  // ขั้นตอนเตรียมข้อมูล (Sanitization) ควรทำอย่างไรที่นี่?
  ...
  let left = 0;
  let right = cleaned.length - 1;
  ...
}`,
        testSimulation: "Boss Phase 3: รัน Automated Tests: 'level', 'noon', 'abcba', 'world' ผ่านฉลุย 100% ผนึกโกเลมสำเร็จ",
        options: [
          {
            id: "opt-1",
            label: "ทำความสะอาดข้อความโดยแปลงเป็นตัวพิมพ์เล็กและคัดกรองเอาเฉพาะตัวอักษรและตัวเลขด้วย `text.toLowerCase().replace(/[^a-z0-9]/g, '')`",
            isCorrect: true,
            feedback: "ผนึกโกเลมสำเร็จ! การ Sanitize ข้อมูลก่อนประมวลผลเป็นหัวใจสำคัญของการเขียนโปรแกรมระดับโปรดักชัน",
          },
          {
            id: "opt-2",
            label: "ลบตัวอักษรตัวแรกและตัวสุดท้ายทิ้งเสมอ",
            isCorrect: false,
            feedback: "ผิดพลาด! การตัดตัวอักษรทิ้งจะทำให้ข้อมูลเสียรูป",
          },
          {
            id: "opt-3",
            label: "สลับตำแหน่งข้อความด้วย text.split('').reverse().join('') โดยไม่กรองสัญลักษณ์",
            isCorrect: false,
            feedback: "ไม่ตรงประเด็น! สัญลักษณ์วรรคตอนยังคงทำให้การเปรียบเทียบล้มเหลว",
          },
        ],
        hint: "เราต้องการตัดช่องว่างและเครื่องหมายออก ให้เหลือเฉพาะตัวอักษรตัวเล็ก",
        blockCell: "T4",
        conceptId: "data_sanitization",
        damageOnFail: 25,
        xpReward: 60,
        learningPillar: "transfer",
      },
    ],
  };

  return {
    [room0.id]: room0,
    [room1A.id]: room1A,
    [room1B.id]: room1B,
    [room2A.id]: room2A,
    [room2B.id]: room2B,
    [room3.id]: room3,
    [room4.id]: room4,
  };
}

// -----------------------------------------------------------------------------
// 5. FIZZBUZZ ENCOUNTER SUITE
// -----------------------------------------------------------------------------
function createFizzBuzzRooms(code: string): Record<string, DungeonRoom> {
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
        id: "enc-f0-fb",
        title: "ทำนายผลลัพธ์การจำแนกตัวเลข",
        subtitle: "ประเมินผลลัพธ์เมื่อเรียกใช้งาน fizzBuzz(5)",
        monsterName: "โกเลมเฝ้าประตู",
        monsterType: "Construct",
        roomType: "combat",
        interactionType: "predict",
        prompt: "หากเรียกใช้งาน fizzBuzz(5) ผลลัพธ์ในแอเรย์ตัวสุดท้าย (สมาชิกตำแหน่งที่ index 4 ของผลลัพธ์) คือข้อความใด?",
        codeSnippet: code,
        testSimulation: "Sandbox Run: fizzBuzz(5) => ['1', '2', 'Fizz', '4', 'Buzz']",
        options: [
          {
            id: "opt-1",
            label: "\"Buzz\" (เนื่องจากในรอบที่ i = 5 ตัวเลข 5 หารด้วย 5 ลงตัว)",
            isCorrect: true,
            feedback: "ถูกต้องเฉียบคม! ในรอบสุดท้าย i=5 ตรงกับเงื่อนไข else if (i % 5 === 0) จึงได้ 'Buzz'",
          },
          {
            id: "opt-2",
            label: "\"Fizz\" (เพราะ 5 เป็นตัวเลขเดี่ยว)",
            isCorrect: false,
            feedback: "ผิดพลาด! 'Fizz' จะได้เมื่อหาร 3 ลงตัวเท่านั้น",
          },
          {
            id: "opt-3",
            label: "\"5\" (เป็นตัวเลขธรรมดา)",
            isCorrect: false,
            feedback: "ผิดพลาด! 5 หารด้วย 5 ลงตัว (5 % 5 === 0) จึงไม่ตกไปที่ else ธรรมดา",
          },
          {
            id: "opt-4",
            label: "\"FizzBuzz\"",
            isCorrect: false,
            feedback: "ผิดพลาด! 'FizzBuzz' จะได้เมื่อหาร 15 ลงตัวเท่านั้น",
          },
        ],
        hint: "ดูเงื่อนไข i % 5 === 0 ว่า 5 หาร 5 ลงตัวหรือไม่",
        blockCell: "E2",
        conceptId: "loops.execution",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "predict",
      },
    ],
  };

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
        id: "enc-f1-trace-fb",
        title: "แกะรอยการทำงานในรอบที่ i = 3",
        subtitle: "ตรวจสอบการแตกกิ่งเงื่อนไขในหน่วยความจำ RAM",
        monsterName: "สไลม์แกะรอย",
        monsterType: "Slime",
        roomType: "combat",
        interactionType: "trace",
        prompt: "เมื่อรันมาถึงรอบที่ i = 3 ข้อความใดจะถูก push เข้าสู่แอเรย์ result ในหน่วยความจำ?",
        codeSnippet: `for (let i = 1; i <= n; i++) {
  if (i % 15 === 0) result.push("FizzBuzz");
  else if (i % 3 === 0) result.push("Fizz");
  else if (i % 5 === 0) result.push("Buzz");
  else result.push(String(i));
}`,
        activeLine: 3,
        variableTrace: {
          i: "3",
          "i % 15 === 0": "false (3 หาร 15 ไม่ลงตัว)",
          "i % 3 === 0": "true (3 หาร 3 ลงตัว)",
          pushedValue: "\"Fizz\"",
        },
        testSimulation: "RAM Trace รอบ i=3: 3 % 3 === 0 เป็นจริง -> push 'Fizz' ลงใน result",
        options: [
          {
            id: "opt-1",
            label: "\"Fizz\" (เพราะผ่านเงื่อนไข else if (i % 3 === 0) แรกที่เจอ)",
            isCorrect: true,
            feedback: "ถูกต้อง! เมื่อเงื่อนไข i % 3 === 0 เป็นจริง คำสั่ง result.push('Fizz') จะทำงานทันทีและข้ามกิ่งที่เหลือ",
          },
          {
            id: "opt-2",
            label: "\"3\"",
            isCorrect: false,
            feedback: "ผิดพลาด! กิ่ง else ท้ายสุดจะไม่ทำงานเพราะเงื่อนไขก่อนหน้าเป็นจริงไปแล้ว",
          },
          {
            id: "opt-3",
            label: "\"FizzBuzz\"",
            isCorrect: false,
            feedback: "ผิดพลาด! 3 หาร 15 ไม่ลงตัว เงื่อนไขแรกจึงเป็นเท็จ",
          },
        ],
        hint: "3 % 3 ได้เศษเท่าใด",
        blockCell: "E1",
        conceptId: "variables.state",
        damageOnFail: 20,
        xpReward: 30,
        learningPillar: "predict",
      },
    ],
  };

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
        id: "enc-f1-why-fb",
        title: "ทำไมเงื่อนไข i % 15 === 0 ต้องอยู่แรกสุด?",
        subtitle: "เจาะลึกเรื่อง Condition Specificity และ Precedence",
        monsterName: "วิญญาณผู้พิทักษ์ความรู้",
        monsterType: "Spirit",
        roomType: "shrine",
        interactionType: "why",
        prompt: "ทำไมเงื่อนไข `i % 15 === 0` จึงต้องอยู่เป็น if แรกสุด ก่อนหน้า `i % 3 === 0` และ `i % 5 === 0`?",
        codeSnippet: `if (i % 15 === 0) {
  result.push("FizzBuzz"); // ทำไมต้องเช็ก 15 ก่อน 3 และ 5?
} else if (i % 3 === 0) { ... }`,
        testSimulation: "Sandbox Test: หากเช็ค i%3 ก่อน 15 -> เลข 15 จะถูกดักเป็น 'Fizz' แทนที่จะเป็น 'FizzBuzz'!",
        options: [
          {
            id: "opt-1",
            label: "เพราะตัวเลขที่หาร 15 ลงตัวย่อมหาร 3 และ 5 ลงตัวด้วยเสมอ หากตรวจ 3 ก่อน ตัวเลขอย่าง 15 จะถูกดักจับและกลายเป็น 'Fizz' โดยไม่มีวันลงมาถึง 15",
            isCorrect: true,
            feedback: "ยอดเยี่ยมมาก! การจัดลำดับเงื่อนไขจากเฉพาะเจาะจงมากไปหาน้อย (Most Specific to Least Specific) เป็นกฎเหล็กของโครงสร้าง if-else",
          },
          {
            id: "opt-2",
            label: "เพราะ 15 เป็นตัวเลขที่มีค่ามากที่สุดในโจทย์",
            isCorrect: false,
            feedback: "ไม่ใช่เรื่องของค่าตัวเลข แต่เป็นเรื่องของความสัมพันธ์ของเซตเงื่อนไข (Subsumption)",
          },
          {
            id: "opt-3",
            label: "เพราะโครงสร้าง else if บังคับให้เรียงจากตัวเลขมากไปน้อยตามไวยากรณ์",
            isCorrect: false,
            feedback: "ผิดพลาด! ภาษา JavaScript ไม่ได้บังคับไวยากรณ์ แต่เป็นเรื่องของตรรกะโปรแกรมเมอร์",
          },
        ],
        hint: "ถ้าตรวจ i % 3 ก่อน แล้วตัวเลขเป็น 15 เงื่อนไข i % 3 จะเป็นจริงหรือไม่",
        blockCell: "F1",
        conceptId: "conditions.hierarchy",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "explain",
      },
    ],
  };

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
        id: "enc-f2-edge-fb",
        title: "ทดสอบกรณีค่า n ไม่มากกว่า 0",
        subtitle: "ค้นหาจุดเปราะบางเมื่อรับค่าขอบเขต 0 หรือติดลบ",
        monsterName: "ค้างคาวตกขอบ",
        monsterType: "Beast",
        roomType: "trap",
        interactionType: "bug",
        prompt: "หากเรียก `fizzBuzz(0)` หรือ `fizzBuzz(-3)` ด้วยค่าที่ไม่มากกว่า 0 ผลลัพธ์จะเป็นอย่างไร?",
        codeSnippet: `function fizzBuzz(n) {
  let result = [];
  for (let i = 1; i <= n; i++) { ... }
  return result;
}`,
        testSimulation: "Boundary Test: fizzBuzz(0) => [] (ไม่เข้าลูป ส่งคืนแอเรย์ว่างอย่างปลอดภัย)",
        options: [
          {
            id: "opt-1",
            label: "คืนค่าแอเรย์ว่าง [] เพราะลูปเริ่มต้นที่ i = 1 ซึ่งไม่ผ่านเงื่อนไข i <= n ตั้งแต่รอบแรก",
            isCorrect: true,
            feedback: "ถูกต้อง! เมื่อ n=0 เงื่อนไข 1 <= 0 เป็นเท็จตั้งแต่เริ่ม ลูปจึงไม่ทำงานแม้แต่รอบเดียวและคืน []",
          },
          {
            id: "opt-2",
            label: "โปรแกรม Crash ด้วย OutOfMemoryError",
            isCorrect: false,
            feedback: "ผิดพลาด! ลูปจะไม่ทำงานเลย จึงไม่มีการใช้หน่วยความจำ",
          },
          {
            id: "opt-3",
            label: "เกิดบั๊ก Infinite Loop",
            isCorrect: false,
            feedback: "ผิดพลาด! i จะไม่เพิ่มขึ้นเพราะไม่เคยเข้าลูป",
          },
        ],
        hint: "ดูรอบเริ่มต้น: i = 1 แล้ว 1 <= 0 เป็นจริงหรือเท็จ",
        blockCell: "E3",
        conceptId: "edge_case.boundary",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "debug",
      },
    ],
  };

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
        id: "enc-f2-transfer-fb",
        title: "จำแนก Pattern การจัดลำดับเงื่อนไขในโค้ดใหม่",
        subtitle: "พิสูจน์การโอนย้ายความรู้ (Transfer) ไปยังโค้ดชุดอื่น",
        monsterName: "เงาสะท้อนรูปแบบ",
        monsterType: "Shadow",
        roomType: "transfer",
        interactionType: "transfer",
        prompt: "พิจารณาโค้ดตัดเกรดนักเรียนต่อไปนี้: เหตุผลที่ต้องเรียงเกรด A -> B -> C -> D สอดคล้องกับโครงสร้างใดของ fizzBuzz?",
        codeSnippet: `function getGrade(score) {
  if (score >= 80) return "A";
  else if (score >= 70) return "B";
  else if (score >= 60) return "C";
  else if (score >= 50) return "D";
  else return "F";
}`,
        testSimulation: "Pattern Analysis: Multi-way Branch Hierarchy ตรวจสอบเงื่อนไขจำเพาะสูงสุดก่อน",
        options: [
          {
            id: "opt-1",
            label: "สอดคล้องกับการจัดลำดับเงื่อนไขจากเฉพาะเจาะจงมากไปหาน้อย (Specificity Hierarchy) เพื่อป้องกันไม่ให้คะแนนสูงตกไปเข้าเงื่อนไขคะแนนต่ำก่อน",
            isCorrect: true,
            feedback: "เฉียบขาดมาก! หากเอา score >= 50 มาไว้ข้างบน คะแนน 85 จะได้เกรด D ทันที เช่นเดียวกับการที่ต้องตรวจ 15 ก่อน 3 ใน FizzBuzz",
          },
          {
            id: "opt-2",
            label: "สอดคล้องกับการใช้ตัวแปรแบบ String เท่านั้น",
            isCorrect: false,
            feedback: "ผิดพลาด! สิ่งที่สอดคล้องคือโครงสร้างตรรกะ ไม่ใช่ชนิดข้อมูล",
          },
          {
            id: "opt-3",
            label: "ไม่สอดคล้องกันเลยเพราะเกรดไม่มีการหารเอาเศษ (Modulo)",
            isCorrect: false,
            feedback: "ผิดพลาด! โครงสร้างการแตกกิ่งแบบครอบงำ (Branch Invariance) เป็นแนวคิดสากล",
          },
        ],
        hint: "ถ้าเอา score >= 50 ไว้บนสุด คนได้ 90 จะได้เกรดอะไร",
        blockCell: "F3",
        conceptId: "patterns.transfer",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "transfer",
      },
    ],
  };

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
        id: "enc-f3-forge-fb",
        title: "เพิ่มเงื่อนไขใหม่ 'Jazz' สำหรับเลขหาร 7 ลงตัว",
        subtitle: "Modify โค้ดเพื่อรองรับความต้องการขยายระบบ",
        monsterName: "ช่างตีเหล็กอาคม",
        monsterType: "Construct",
        roomType: "forge",
        interactionType: "modify",
        prompt: "หากต้องการเพิ่มเงื่อนไขว่าถ้าตัวเลขหาร 7 ลงตัว ให้ส่ง 'Jazz' ออกมา ควรแทรกคำสั่งอย่างไรอย่างถูกต้อง?",
        codeSnippet: `if (i % 15 === 0) result.push("FizzBuzz");
else if (i % 3 === 0) result.push("Fizz");
else if (i % 5 === 0) result.push("Buzz");
// แทรกเงื่อนไข Jazz ที่ตรงนี้
else result.push(String(i));`,
        testSimulation: "Clean Code Check: การใช้ String concatenation หรือ Guard Table ช่วยลดการซ้ำซ้อนของเงื่อนไข",
        options: [
          {
            id: "opt-1",
            label: "เพิ่ม `else if (i % 7 === 0) { result.push('Jazz'); }` ก่อนหน้ากิ่ง else สุดท้าย",
            isCorrect: true,
            feedback: "ยอดเยี่ยม! การแทรก branch เพิ่มเติมก่อน fallback else เป็นแนวทางที่ถูกต้องและไม่กระทบเงื่อนไขเดิม",
          },
          {
            id: "opt-2",
            label: "แทนที่บรรทัด else ด้วย result.push('Jazz')",
            isCorrect: false,
            feedback: "ผิดพลาด! จะทำให้ตัวเลขธรรมดาที่หารไม่ลงตัวทั้งหมดกลายเป็น Jazz ไปด้วย",
          },
          {
            id: "opt-3",
            label: "เปลี่ยนเงื่อนไขลูปเป็น i <= 7",
            isCorrect: false,
            feedback: "ผิดพลาด! นั่นเป็นการจำกัดรอบ ไม่ใช่การเพิ่มเงื่อนไขของตัวเลข",
          },
        ],
        hint: "ใช้ else if ร่วมกับตัวดำเนินการหารเอาเศษ % 7 === 0",
        blockCell: "T2",
        conceptId: "logic.branch_expansion",
        damageOnFail: 20,
        xpReward: 45,
        learningPillar: "debug",
      },
    ],
  };

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
        id: "enc-boss-p1-fb",
        title: "บอสเฟสที่ 1: สลับลำดับเงื่อนไขวางยา (Predict Phase)",
        subtitle: "ทดสอบการทำงานเมื่อเงื่อนไข 3 ถูกย้ายขึ้นมาบน 15",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "predict",
        prompt: "โกเลมแอบสลับบรรทัดเงื่อนไข โดยย้าย `if (i % 3 === 0)` มาไว้แรกสุด และเอา `i % 15 === 0` ไปไว้ข้างล่าง เมื่อเรียก fizzBuzz(15) สมาชิกตัวที่ 15 จะได้ค่าใด?",
        codeSnippet: `if (i % 3 === 0) result.push("Fizz"); // โกเลมสลับมาไว้บนสุด
else if (i % 15 === 0) result.push("FizzBuzz");
else if (i % 5 === 0) result.push("Buzz");`,
        testSimulation: "Boss Phase 1: การเริ่มที่ i = 1 ทำให้ขนาดของ result เท่ากับ n พอดี",
        options: [
          {
            id: "opt-1",
            label: "\"Fizz\" (เพราะ 15 % 3 === 0 เป็นจริง จึงเข้ากิ่งแรกและข้ามกิ่ง FizzBuzz ไปอย่างน่าเสียดาย)",
            isCorrect: true,
            feedback: "ทะลวงเกราะบอสสำเร็จ! คุณจับไต๋ได้ว่าเมื่อเช็ก 3 ก่อน ตัวเลข 15 จะถูกดักจับที่ Fizz เสมอ และไม่มีวันเข้า FizzBuzz ได้เลย",
          },
          {
            id: "opt-2",
            label: "\"FizzBuzz\" ได้ตามปกติ",
            isCorrect: false,
            feedback: "โดนโกเลมโจมตีสวนกลับ! เมื่อกิ่ง if แรกเป็นจริง JavaScript จะไม่ประเมิน else if ด้านล่างอีกต่อไป",
          },
          {
            id: "opt-3",
            label: "\"Buzz\"",
            isCorrect: false,
            feedback: "ผิดพลาด! กิ่งแรกดักจับไว้ได้ก่อน",
          },
        ],
        hint: "15 หารด้วย 3 ลงตัวไหม ถ้าลงตัวจะเข้ากิ่งแรกทันทีหรือไม่",
        blockCell: "E2",
        conceptId: "boundary.condition_shadowing",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "predict",
      },
      {
        id: "enc-boss-p2-fb",
        title: "บอสเฟสที่ 2: วินิจฉัยความสัมพันธ์ของเซตตัวเลข (Explain Phase)",
        subtitle: "อธิบายหลักคณิตศาสตร์ของตัวคูณร่วมน้อย",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "why",
        prompt: "ทำไมตัวเลข 15 จึงเป็นตัวแทนของการหารด้วยทั้ง 3 และ 5 ลงตัวพร้อมกัน?",
        codeSnippet: `if (i % 15 === 0) { ... }`,
        testSimulation: "Boss Phase 2: String(i) แปลงตัวเลขเป็นสตริงสอดคล้องกับ Type ของสมาชิกตัวอื่นในแอเรย์",
        options: [
          {
            id: "opt-1",
            label: "เพราะ 15 เป็นตัวคูณร่วมน้อย (ค.ร.น. / Least Common Multiple) ของ 3 และ 5 ซึ่งเป็นจำนวนเฉพาะสัมพัทธ์",
            isCorrect: true,
            feedback: "ฟันแกนกลางบอสเข้าเป้า! 3 x 5 = 15 การตรวจ % 15 จึงเทียบเท่ากับ (i % 3 === 0 && i % 5 === 0)",
          },
          {
            id: "opt-2",
            label: "เพราะ 3 บวกกับ 5 และบวก 7 ได้ 15",
            isCorrect: false,
            feedback: "ไม่เกี่ยวกับการบวก แต่เป็นเรื่องของการหารลงตัว",
          },
          {
            id: "opt-3",
            label: "เป็นกฎตายตัวของภาษา JavaScript โดยเฉพาะ",
            isCorrect: false,
            feedback: "เป็นหลักคณิตศาสตร์จำนวน ไม่ใช่กฎของภาษา",
          },
        ],
        hint: "คิดถึงเรื่อง ค.ร.น. ของ 3 และ 5",
        blockCell: "F2",
        conceptId: "logic.lcm_mathematics",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "explain",
      },
      {
        id: "enc-boss-p3-fb",
        title: "บอสเฟสสุดท้าย: ป้องกันค่าพารามิเตอร์ผิดพลาด (Repair & Transfer Phase)",
        subtitle: "เขียนโค้ดเวอร์ชันสมบูรณ์ที่พร้อมรองรับทุกสถานการณ์",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "modify",
        prompt: "เพื่อป้องกันไม่ให้โปรแกรมทำงานหนักเกินไปเมื่อมีผู้ส่งค่าล้านลูปเข้ามา ฟังก์ชัน fizzBuzz ควรมี Guard Clause ควบคุมความปลอดภัยอย่างไร?",
        codeSnippet: `function fizzBuzz(n) {
  // บรรทัดนี้ควรใส่การจำกัดขอบเขตอย่างไร?
  ...
  let result = [];
  for (let i = 1; i <= n; i++) { ... }
  return result;
}`,
        testSimulation: "Boss Phase 3: รัน Automated Tests: n=15 ได้ FizzBuzz ที่ index สุดท้าย ผ่านฉลุย 100% ผนึกโกเลมสำเร็จ",
        options: [
          {
            id: "opt-1",
            label: "`if (typeof n !== 'number' || n < 1 || n > 1000) return [];` เพื่อจำกัดขอบเขตการทำงานให้อยู่ในระดับที่ปลอดภัยต่อเบราว์เซอร์",
            isCorrect: true,
            feedback: "ผนึกโกเลมสำเร็จ! การใส่ Upper-bound และ Type validation ป้องกันอาการเบราว์เซอร์ค้างจาก memory exhaustion",
          },
          {
            id: "opt-2",
            label: "`if (n == 0) return 0;`",
            isCorrect: false,
            feedback: "ไม่ตรงสัญญา! ฟังก์ชันคืนค่าแอเรย์ ไม่ควรคืนตัวเลข 0",
          },
          {
            id: "opt-3",
            label: "`n = Infinity;`",
            isCorrect: false,
            feedback: "อันตรายสูงสุด! จะทำให้เกิดลูปไม่รู้จบและเบราว์เซอร์แคลชทันที",
          },
        ],
        hint: "ฟังก์ชันนี้ควรคืนค่าแอเรย์ และต้องป้องกันทั้งค่าติดลบและค่าที่ใหญ่เกินไป",
        blockCell: "T4",
        conceptId: "defensive_programming",
        damageOnFail: 25,
        xpReward: 60,
        learningPillar: "transfer",
      },
    ],
  };

  return {
    [room0.id]: room0,
    [room1A.id]: room1A,
    [room1B.id]: room1B,
    [room2A.id]: room2A,
    [room2B.id]: room2B,
    [room3.id]: room3,
    [room4.id]: room4,
  };
}

// -----------------------------------------------------------------------------
// 6. DYNAMIC CUSTOM CODE SUITE GENERATOR
// -----------------------------------------------------------------------------
function createCustomRooms(code: string, features: CodeFeatures): Record<string, DungeonRoom> {
  const funcMatch =
    code.match(/function\s+([a-zA-Z0-9_$]+)/) ||
    code.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/) ||
    code.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*function/);
  const funcName = funcMatch ? funcMatch[1] : "customSpell";
  const paramMatch = code.match(/(?:function\s+[a-zA-Z0-9_$]*|\=\>|\=\s*function)\s*\(([^)]*)\)/);
  const paramNames = paramMatch ? paramMatch[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
  const primaryVar = features.variableNames[0] || paramNames[0] || "result";

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
        id: "enc-f0-custom",
        title: `ทำนายพฤติกรรมของฟังก์ชัน ${funcName}`,
        subtitle: "ประเมินผลลัพธ์และทิศทางการคืนค่าของโค้ดที่นำเข้า",
        monsterName: "โกเลมเฝ้าประตู",
        monsterType: "Construct",
        roomType: "combat",
        interactionType: "predict",
        prompt: `เมื่อรันฟังก์ชัน ${funcName} ด้วยชุดข้อมูลนำเข้าเริ่มต้น กระบวนการหลักจะมุ่งเน้นไปที่สิ่งใด?`,
        codeSnippet: code,
        testSimulation: `ผลลัพธ์จาก Sandbox: เรียก ${funcName}() -> ตรวจสอบการไหลของข้อมูลและการส่งคืนค่าผ่าน ${primaryVar}`,
        options: [
          {
            id: "opt-1",
            label: `ประมวลผลข้อมูลผ่านโครงสร้างตรรกะและส่งคืนผลลัพธ์สุดท้ายผ่านตัวแปร ${primaryVar}`,
            isCorrect: true,
            feedback: "ถูกต้อง! คุณเข้าใจบทบาทของตัวแปรเป้าหมายและการไหลของข้อมูลในฟังก์ชันนี้",
          },
          {
            id: "opt-2",
            label: "โค้ดจะหยุดทำงานทันทีเพราะไม่มีคำสั่งพิมพ์ console.log",
            isCorrect: false,
            feedback: "ผิดพลาด! ฟังก์ชันส่งคืนค่าผ่าน return ไม่จำเป็นต้องมี console.log",
          },
          {
            id: "opt-3",
            label: "ตัวแปรทุกตัวจะถูกล้างค่ากลายเป็น undefined ก่อนส่งคืน",
            isCorrect: false,
            feedback: "ผิดพลาด! ตัวแปรจะคงค่าผลลัพธ์สุดท้ายที่คำนวณได้",
          },
        ],
        hint: `สังเกตที่คำสั่ง return ท้ายฟังก์ชันว่าส่งคืนตัวแปรใด`,
        blockCell: "E2",
        conceptId: "loops.execution",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "predict",
      },
    ],
  };

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
        id: "enc-f1-trace-custom",
        title: `แกะรอยสถานะตัวแปร ${primaryVar} ใน RAM`,
        subtitle: "ตรวจสอบการเปลี่ยนแปลงของหน่วยความจำขณะกำลังประมวลผล",
        monsterName: "สไลม์แกะรอย",
        monsterType: "Slime",
        roomType: "combat",
        interactionType: "trace",
        prompt: `ในระหว่างการประมวลผล ค่าของตัวแปร ${primaryVar} ใน RAM จะมีพฤติกรรมอย่างไร?`,
        codeSnippet: code,
        activeLine: 2,
        variableTrace: {
          [primaryVar]: "สถานะเริ่มต้น -> กำลังประมวลผล",
          status: "กำลังวิเคราะห์โครงสร้าง",
        },
        testSimulation: `สถานะ RAM: ตัวแปร ${primaryVar} ถูกจองพื้นที่ในหน่วยความจำและพร้อมรับการประมวลผล`,
        options: [
          {
            id: "opt-1",
            label: `เก็บสถานะที่ถูกคำนวณและอัปเดตค่าตามเงื่อนไขที่กำหนดไว้ในฟังก์ชัน`,
            isCorrect: true,
            feedback: "ถูกต้อง! ตัวแปรสถานะจะเปลี่ยนไปตามคำสั่งการคำนวณในแต่ละสเต็ป",
          },
          {
            id: "opt-2",
            label: "จะถูกรีเซ็ตค่ากลับเป็น null ทุกครั้งที่มีการตรวจสอบ if",
            isCorrect: false,
            feedback: "ผิดพลาด! ตัวแปรจะไม่ถูกรีเซ็ตเว้นแต่จะมีคำสั่งกำหนดค่าใหม่",
          },
          {
            id: "opt-3",
            label: "ไม่สามารถอ่านค่าในหน่วยความจำได้เพราะเป็นตัวแปร local",
            isCorrect: false,
            feedback: "ผิดพลาด! ขณะที่ฟังก์ชันกำลังทำงาน ตัวแปร local จะมีอยู่ใน Call Stack และ RAM เสมอ",
          },
        ],
        hint: "ดูว่าตัวแปรนี้ถูกประกาศไว้ตรงไหนและถูกอัปเดตอย่างไรในโค้ด",
        blockCell: "E1",
        conceptId: "variables.state",
        damageOnFail: 20,
        xpReward: 30,
        learningPillar: "predict",
      },
    ],
  };

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
        id: "enc-f1-why-custom",
        title: "ทำไมต้องกำหนดขอบเขตตัวแปรให้เหมาะสม?",
        subtitle: "ทำความเข้าใจเรื่อง Scope และ Lifetime ของตัวแปร",
        monsterName: "วิญญาณผู้พิทักษ์ความรู้",
        monsterType: "Spirit",
        roomType: "shrine",
        interactionType: "why",
        prompt: `ทำไมตัวแปรอย่าง ${primaryVar} จึงควรประกาศด้วย let หรือ const และกำหนดขอบเขตให้อยู่เฉพาะในฟังก์ชัน?`,
        codeSnippet: code,
        testSimulation: `Sandbox ตรวจสอบ Scope: ตัวแปร ${primaryVar} อยู่ใน Local Scope ไม่กระทบตัวแปรภายนอก`,
        options: [
          {
            id: "opt-1",
            label: "เพื่อป้องกันไม่ให้ค่าตัวแปรไปทับซ้อนกับตัวแปรชื่อเดียวกันในส่วนอื่นของโปรแกรม (Scope Isolation)",
            isCorrect: true,
            feedback: "ยอดเยี่ยมมาก! การจำกัด Scope ช่วยลด Side Effect และทำให้ฟังก์ชันทำงานได้อย่างเป็นเอกเทศ (Pure Function)",
          },
          {
            id: "opt-2",
            label: "เพราะ JavaScript ไม่อนุญาตให้ประกาศตัวแปรนอกฟังก์ชัน",
            isCorrect: false,
            feedback: "ผิดพลาด! สามารถประกาศตัวแปร Global ได้ แต่เป็นแนวทางที่ไม่ดี",
          },
          {
            id: "opt-3",
            label: "เพื่อบังคับให้คอมไพเลอร์แปลงเป็นภาษา C",
            isCorrect: false,
            feedback: "ไม่ตรงประเด็น! JavaScript รันบน V8 Engine หรือ JS Runtime",
          },
        ],
        hint: "คิดถึงอันตรายของการใช้ตัวแปร Global ร่วมกันหลายๆ ฟังก์ชัน",
        blockCell: "F1",
        conceptId: "variables.purpose",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "explain",
      },
    ],
  };

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
        id: "enc-f2-edge-custom",
        title: "ทดสอบกรณีขอบเขตสุดขั้ว (Edge Case)",
        subtitle: "ค้นหาจุดเปราะบางเมื่อรับข้อมูลไร้ค่าหรือขนาด 0",
        monsterName: "ค้างคาวตกขอบ",
        monsterType: "Beast",
        roomType: "trap",
        interactionType: "bug",
        prompt: "หากฟังก์ชันนี้ได้รับค่าอินพุตที่เป็นค่าว่าง (เช่น [] หรือ \"\") พฤติกรรมที่ปลอดภัยที่สุดควรเป็นอย่างไร?",
        codeSnippet: code,
        testSimulation: `ทดสอบขอบเขตใน Sandbox: การป้อนค่าว่าง / null ถูกดักจับและจัดการอย่างปลอดภัย`,
        options: [
          {
            id: "opt-1",
            label: "ควรมี Guard Clause ตรวจสอบและส่งคืนค่าเริ่มต้นที่ปลอดภัยทันทีโดยไม่ให้เกิด Exception",
            isCorrect: true,
            feedback: "ถูกต้องเฉียบคม! การเขียนโปรแกรมแบบป้องกันล่วงหน้า (Defensive Programming) ช่วยรับมือกับอินพุตว่างได้เสมอ",
          },
          {
            id: "opt-2",
            label: "ควรปล่อยให้โปรแกรม Crash ทันทีเพื่อแจ้งเตือนผู้ใช้",
            isCorrect: false,
            feedback: "ไม่ควรทำ! โปรแกรมระดับ Production ควรจัดการข้อผิดพลาดอย่างนุ่มนวล",
          },
          {
            id: "opt-3",
            label: "ควรวนลูปต่อไปเรื่อยๆ จนกว่าจะมีข้อมูลส่งเข้ามา",
            isCorrect: false,
            feedback: "ผิดพลาด! จะทำให้โปรแกรมติด Infinite Wait",
          },
        ],
        hint: "ดูว่าโค้ดมีการตรวจสอบค่าว่างที่ต้นฟังก์ชันหรือไม่",
        blockCell: "E3",
        conceptId: "edge_case.boundary",
        damageOnFail: 20,
        xpReward: 35,
        learningPillar: "debug",
      },
    ],
  };

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
        id: "enc-f2-transfer-custom",
        title: "จำแนกแบบแผนการประมวลผล",
        subtitle: "เชื่อมโยงความรู้ไปยังโครงสร้างขั้นตอนวิธีมาตรฐาน",
        monsterName: "เงาสะท้อนรูปแบบ",
        monsterType: "Shadow",
        roomType: "transfer",
        interactionType: "transfer",
        prompt: "โครงสร้างหลักของโค้ดชุดนี้จัดอยู่ในแบบแผนขั้นตอนวิธี (Algorithm Pattern) ใดมากที่สุด?",
        codeSnippet: code,
        testSimulation: `การวิเคราะห์ Pattern: โค้ดนี้มีโครงสร้างตรงตามมาตรฐานขั้นตอนวิธีคอมพิวเตอร์`,
        options: [
          {
            id: "opt-1",
            label: features.hasLoop
              ? "การวนลูปตรวจสอบและสะสมผลลัพธ์ (Sequential Traversal & Accumulation)"
              : "การตัดสินใจเชิงเงื่อนไขและการแปลงรูปข้อมูล (Conditional Transformation)",
            isCorrect: true,
            feedback: "ถูกต้อง! คุณจำแนกโครงสร้างอัลกอริทึมหลักของโค้ดชุดนี้ได้อย่างแม่นยำ",
          },
          {
            id: "opt-2",
            label: "การเข้ารหัสข้อมูลแบบควอนตัม (Quantum Cryptography)",
            isCorrect: false,
            feedback: "ผิดประเภท! นี่คือขั้นตอนวิธีพื้นฐานทั่วไป",
          },
          {
            id: "opt-3",
            label: "การจัดสรรหน่วยความจำแบบมัลติเธรดต่ำสุด",
            isCorrect: false,
            feedback: "ไม่ตรงประเด็น! JavaScript รันแบบ Single-threaded Event Loop",
          },
        ],
        hint: "ดูว่ามีการใช้ลูปหรือการแตกกิ่งเงื่อนไขเป็นกลไกหลัก",
        blockCell: "F3",
        conceptId: "patterns.transfer",
        damageOnFail: 15,
        xpReward: 40,
        learningPillar: "transfer",
      },
    ],
  };

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
        id: "enc-f3-forge-custom",
        title: "ปรับปรุงโค้ดให้อ่านง่ายและปลอดภัยขึ้น (Refactoring)",
        subtitle: "Modify โค้ดเดิมให้มีคุณภาพระดับ Clean Code",
        monsterName: "ช่างตีเหล็กอาคม",
        monsterType: "Construct",
        roomType: "forge",
        interactionType: "modify",
        prompt: "แนวทางการปรับปรุงโค้ด (Refactoring) ที่ดีที่สุดสำหรับฟังก์ชันนี้คือข้อใด?",
        codeSnippet: code,
        testSimulation: `ผลึกวิเคราะห์ Clean Code: เพิ่ม Guard Clause และตั้งชื่อตัวแปรสื่อความหมาย ช่วยลดบั๊ก`,
        options: [
          {
            id: "opt-1",
            label: "ตั้งชื่อตัวแปรให้สื่อความหมาย ตรวจสอบเงื่อนไขขอบเขตล่วงหน้า (Early Guard) และแยกฟังก์ชันย่อยหากยาวเกินไป",
            isCorrect: true,
            feedback: "ยอดเยี่ยม! นี่คือหัวใจสำคัญของ Clean Code และ Defensive Programming",
          },
          {
            id: "opt-2",
            label: "ตัดการเว้นวรรคและชื่อตัวแปรออกให้หมดเพื่อลดขนาดไฟล์",
            isCorrect: false,
            feedback: "ไม่ควรทำ! จะทำให้โค้ดอ่านยากมาก (Minification ควรทำในขั้นตอน Build)",
          },
          {
            id: "opt-3",
            label: "เปลี่ยนตัวแปรทั้งหมดให้เป็นตัวแปร Global",
            isCorrect: false,
            feedback: "อันตรายมาก! เป็น anti-pattern ร้ายแรง",
          },
        ],
        hint: "Clean Code ให้ความสำคัญกับความชัดเจนและการป้องกันบั๊ก",
        blockCell: "T2",
        conceptId: "refactoring.clean_code",
        damageOnFail: 20,
        xpReward: 45,
        learningPillar: "debug",
      },
    ],
  };

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
        id: "enc-boss-p1-custom",
        title: "บอสเฟสที่ 1: ตรวจสอบความถูกต้องของขอบเขต (Predict Phase)",
        subtitle: "ทดสอบการทำงานเมื่อเจอกับดัก Off-by-one",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "predict",
        prompt: "หากมีการเข้าถึง index นอกขอบเขตของข้อมูล (เช่น index เกินขนาด) พฤติกรรมของ JavaScript จะเป็นอย่างไร?",
        codeSnippet: code,
        testSimulation: `Sandbox Boss Phase 1: การเข้าถึง index นอกขอบเขตใน JS คืนค่า undefined`,
        options: [
          {
            id: "opt-1",
            label: "จะได้ค่า undefined ออกมา ซึ่งอาจนำไปสู่ข้อผิดพลาด NaN หรือ TypeError ในบรรทัดถัดไป",
            isCorrect: true,
            feedback: "ทะลวงเกราะบอสสำเร็จ! JavaScript จะไม่แคลชทันที แต่คืน undefined ซึ่งมักสร้าง Silent Bug",
          },
          {
            id: "opt-2",
            label: "โปรแกรมจะปิดตัวเองลงทันทีพร้อมแจ้งเตือนไปยังระบบปฏิบัติการ",
            isCorrect: false,
            feedback: "ไม่ใช่สำหรับ JS Runtime ทั่วไป",
          },
          {
            id: "opt-3",
            label: "จะทำการวนรอบกลับมาที่ index 0 อัตโนมัติ",
            isCorrect: false,
            feedback: "ผิดพลาด! แอเรย์ไม่ได้เป็น Circular Buffer อัตโนมัติ",
          },
        ],
        hint: "ใน JavaScript arr[999] เมื่อไม่มีสมาชิกตัวนั้นจะได้ค่าใด",
        blockCell: "E2",
        conceptId: "boundary.off_by_one",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "predict",
      },
      {
        id: "enc-boss-p2-custom",
        title: "บอสเฟสที่ 2: วินิจฉัยความคงอยู่ของตัวแปร (Explain Phase)",
        subtitle: "อธิบายโครงสร้างและความเชื่อมโยงของระบบ",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "why",
        prompt: "ทำไมตัวแปรที่เก็บผลลัพธ์สะสมจึงต้องเริ่มต้นค่าที่ถูกต้องก่อนเริ่มการประมวลผล?",
        codeSnippet: code,
        testSimulation: `Sandbox Boss Phase 2: ตัวแปรเริ่มต้นถูกกำหนดค่าก่อนเข้าลูป ป้องกันข้อผิดพลาด NaN`,
        options: [
          {
            id: "opt-1",
            label: "เพื่อให้มีสถานะตั้งต้นที่สอดคล้องกับเอกลักษณ์ของการดำเนินการ (Identity Element) และป้องกันไม่ให้เกิด NaN หรือ undefined",
            isCorrect: true,
            feedback: "ฟันแกนกลางบอสเข้าเป้า! State Initialization คือรากฐานของความถูกต้องในการคำนวณ",
          },
          {
            id: "opt-2",
            label: "เพื่อจองพื้นที่บนฮาร์ดดิสก์ให้โปรแกรมทำงานเร็วขึ้น",
            isCorrect: false,
            feedback: "ตัวแปรอยู่ใน RAM ไม่ใช่ฮาร์ดดิสก์",
          },
          {
            id: "opt-3",
            label: "เป็นข้อบังคับที่หากไม่ทำเบราว์เซอร์จะไม่ยอมเปิดหน้าเว็บ",
            isCorrect: false,
            feedback: "ไม่ใช่ข้อกำหนดของเบราว์เซอร์",
          },
        ],
        hint: "คิดถึงผลลัพธ์ถ้าตัวแปรเริ่มต้นไม่มีค่า (เป็น undefined)",
        blockCell: "F2",
        conceptId: "variables.scope_and_lifetime",
        damageOnFail: 25,
        xpReward: 50,
        learningPillar: "explain",
      },
      {
        id: "enc-boss-p3-custom",
        title: "บอสเฟสสุดท้าย: ซ่อมแซมและผนึกแกนกลาง (Repair & Transfer Phase)",
        subtitle: "เขียนโค้ดเวอร์ชันสมบูรณ์ที่พร้อมรองรับทุกสถานการณ์",
        monsterName: "เดอะ คอร์: โกเลมโค้ดโบราณ",
        monsterType: "Boss",
        roomType: "boss",
        interactionType: "modify",
        prompt: "เพื่อทำให้ฟังก์ชันนี้สมบูรณ์ระดับ Production สิ่งที่จำเป็นที่สุดในการรับรองความน่าเชื่อถือคือสิ่งใด?",
        codeSnippet: code,
        testSimulation: `Sandbox Boss Phase 3: ฟังก์ชัน ${funcName} ผ่านเกณฑ์ Defensive Programming และ Automated Tests ครบ 100%`,
        options: [
          {
            id: "opt-1",
            label: "การเขียนชุดทดสอบครอบคลุมกรณีปกติ ขอบเขตสุดขั้ว (Edge Cases) และการตรวจสอบ Input Validation",
            isCorrect: true,
            feedback: "ผนึกโกเลมสำเร็จ! การมี Automated Unit Tests และ Defensive Guard ทำให้ซอฟต์แวร์เสถียรและทนทาน",
          },
          {
            id: "opt-2",
            label: "การเพิ่มจำนวนคำสั่งพิมพ์เพื่อดูสถานะตลอดเวลา",
            isCorrect: false,
            feedback: "console.log ช่วยในการดีบั๊ก แต่ไม่ใช่กลไกความปลอดภัยระดับโปรดักชัน",
          },
          {
            id: "opt-3",
            label: "การครอบคำสั่งทั้งหมดด้วย try-catch โดยไม่จัดการ error ข้างใน",
            isCorrect: false,
            feedback: "การกลืน Error (Swallowing Exception) เป็นอันตรายต่อการบำรุงรักษาระบบ",
          },
        ],
        hint: "วิธีใดทำให้นักพัฒนาและครูมั่นใจว่าโค้ดจะไม่พังเมื่อมีคนป้อนข้อมูลแปลกๆ",
        blockCell: "T4",
        conceptId: "defensive_programming",
        damageOnFail: 25,
        xpReward: 60,
        learningPillar: "transfer",
      },
    ],
  };

  return {
    [room0.id]: room0,
    [room1A.id]: room1A,
    [room1B.id]: room1B,
    [room2A.id]: room2A,
    [room2B.id]: room2B,
    [room3.id]: room3,
    [room4.id]: room4,
  };
}

/**
 * Procedural Dungeon Plan Generator (v1.0 + Multi-Spell Custom Integration)
 * Creates a 5-floor DAG (Directed Acyclic Graph) of encounters matching the code
 */
export function generateDungeonPlan(
  code: string,
  spellName: string = "มนตร์คำนวณ",
  targetGoal: string = "เข้าใจโค้ดนี้และเตรียมป้องกันบั๊ก",
  presetId?: string
): DungeonRunState {
  const features = extractCodeFeatures(code);
  const runId = `run-${Date.now().toString(36)}`;

  let rooms: Record<string, DungeonRoom>;

  if (presetId) {
    if (presetId === "sum-positive") {
      rooms = createSumPositiveRooms(code);
    } else if (presetId === "find-max") {
      rooms = createFindMaxRooms(code);
    } else if (presetId === "count-vowels") {
      rooms = createCountVowelsRooms(code);
    } else if (presetId === "is-palindrome") {
      rooms = createIsPalindromeRooms(code);
    } else if (presetId === "fizz-buzz") {
      rooms = createFizzBuzzRooms(code);
    } else {
      rooms = createCustomRooms(code, features);
    }
  } else {
    // Detect matching algorithm preset from function identifier (precise match, no loose word collisions)
    const normalized = code.toLowerCase();
    if (/\b(findmax|find_max|findmaximum)\b/i.test(normalized)) {
      rooms = createFindMaxRooms(code);
    } else if (/\b(countvowels|count_vowels)\b/i.test(normalized)) {
      rooms = createCountVowelsRooms(code);
    } else if (/\b(ispalindrome|is_palindrome)\b/i.test(normalized)) {
      rooms = createIsPalindromeRooms(code);
    } else if (/\b(fizzbuzz|fizz_buzz)\b/i.test(normalized)) {
      rooms = createFizzBuzzRooms(code);
    } else if (/\b(sumpositive|sum_positive)\b/i.test(normalized)) {
      rooms = createSumPositiveRooms(code);
    } else {
      // Arbitrary Custom Code -> Dynamic Tailored Question Synthesis
      rooms = createCustomRooms(code, features);
    }
  }

  const mapFloors: string[][] = [
    ["room-f0-predict"],
    ["room-f1-trace", "room-f1-shrine"],
    ["room-f2-trap", "room-f2-transfer"],
    ["room-f3-forge"],
    ["room-f4-boss"],
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
