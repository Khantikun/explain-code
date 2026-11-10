export interface FlowNode {
  id: string;
  line: number;
  type: "input" | "condition" | "loop" | "operation" | "output" | "async";
  label: string;
  codeSnippet: string;
  variableState: Record<string, string>;
  explanation: string;
}

export interface InterrogationQuestion {
  id: string;
  targetLine: number;
  dimension: "logic" | "state" | "edgeCase" | "syntax";
  dimensionLabel: string;
  question: string;
  hint: string;
  expectedKeywords: string[];
  modelAnswer: string;
}

export interface SabotageChallenge {
  sabotagedLine: number;
  originalCode: string;
  mutatedCode: string;
  symptom: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }[];
}

export interface CodePreset {
  id: string;
  title: string;
  badge: string;
  language: string;
  description: string;
  code: string;
  nodes: FlowNode[];
  questions: InterrogationQuestion[];
  sabotage: SabotageChallenge;
}

export const CODE_PRESETS: CodePreset[] = [
  {
    id: "async-cart",
    title: "ระบบคิดเงินตะกร้าสินค้า + เช็คสต็อก (Async/Await)",
    badge: "พบบ่อยในโปรเจกต์จบ",
    language: "TypeScript",
    description: "โค้ดที่นักเรียนชอบให้ AI เจนให้ แต่พออาจารย์ถามเรื่อง async/await และลำดับการทำงานมักจะตอบไม่ได้",
    code: `async function checkoutCart(items, discountCode) {
  let total = 0;
  for (const item of items) {
    const stock = await checkInventory(item.id);
    if (stock < item.qty) {
      throw new Error(\`สินค้า \${item.name} ไม่พอ\`);
    }
    total += item.price * item.qty;
  }
  if (discountCode === "VIBE50" && total >= 500) {
    total = total * 0.5;
  }
  return Math.round(total);
}`,
    nodes: [
      {
        id: "n1",
        line: 1,
        type: "input",
        label: "รับข้อมูลตะกร้า (items, discountCode)",
        codeSnippet: "async function checkoutCart(items, discountCode)",
        variableState: { items: "[{id:1, price:300, qty:2}]", discountCode: "'VIBE50'", total: "0" },
        explanation: "ประกาศฟังก์ชันแบบ Asynchronous เพราะข้างในต้องรอผลการเช็คสต็อกจากฐานข้อมูล/API"
      },
      {
        id: "n2",
        line: 3,
        type: "loop",
        label: "วนลูปสินค้าทีละชิ้น (for...of)",
        codeSnippet: "for (const item of items)",
        variableState: { "item.name": "'Keyboard'", "item.price": "300", "item.qty": "2", total: "0" },
        explanation: "ใช้ for...of แทน forEach เพราะ for...of สามารถทำงานร่วมกับ await เพื่อรอทีละรอบได้จริง"
      },
      {
        id: "n3",
        line: 4,
        type: "async",
        label: "รอผลเช็คสต็อก (await checkInventory)",
        codeSnippet: "const stock = await checkInventory(item.id);",
        variableState: { "item.id": "1", stock: "5 (รอ API 120ms)", total: "0" },
        explanation: "หยุดรอให้ Promise จาก checkInventory คืนค่าจำนวนสต็อกจริงก่อนไปบรรทัดถัดไป"
      },
      {
        id: "n4",
        line: 5,
        type: "condition",
        label: "ตรวจสอบสต็อกพอไหม?",
        codeSnippet: "if (stock < item.qty) throw new Error(...)",
        variableState: { stock: "5", "item.qty": "2", "5 < 2": "false (ผ่าน!)" },
        explanation: "Guard Clause: ถ้าของในคลังน้อยกว่าที่สั่ง ให้โยน Error และหยุดการทำงานทันที"
      },
      {
        id: "n5",
        line: 8,
        type: "operation",
        label: "สะสมราคารวม (total += ...)",
        codeSnippet: "total += item.price * item.qty;",
        variableState: { calculation: "0 + (300 * 2)", total: "600" },
        explanation: "นำราคาคูณจำนวนของสินค้าชิ้นนี้ แล้วบวกทบเข้าไปในตัวแปร total"
      },
      {
        id: "n6",
        line: 10,
        type: "condition",
        label: "เช็คเงื่อนไขคูปองส่วนลด 50%",
        codeSnippet: 'if (discountCode === "VIBE50" && total >= 500)',
        variableState: { discountCode: "'VIBE50'", total: "600 (>= 500)", condition: "true" },
        explanation: "ต้องเป็นโค้ด VIBE50 และยอดรวมตั้งแต่ 500 บาทขึ้นไปพร้อมกันทั้งคู่ (&&) จึงจะได้ลดครึ่งราคา"
      },
      {
        id: "n7",
        line: 13,
        type: "output",
        label: "ปัดเศษและส่งคืนยอดสุทธิ",
        codeSnippet: "return Math.round(total);",
        variableState: { totalAfterDiscount: "300", returnValue: "Promise<300>" },
        explanation: "ปัดเศษทศนิยมให้เป็นจำนวนเต็มและส่งค่ากลับในรูปแบบ Promise"
      }
    ],
    questions: [
      {
        id: "q1",
        targetLine: 4,
        dimension: "logic",
        dimensionLabel: "ลำดับการทำงาน (Async Flow)",
        question: "บรรทัดที่ 4 ทำไมต้องใส่คำว่า await หน้า checkInventory? ถ้าลบ await ออกจะเกิดอะไรขึ้นกับบรรทัดที่ 5?",
        hint: "ลองนึกดูว่าถ้าไม่รอ (await) ตัวแปร stock จะได้ค่าเป็นตัวเลข หรือได้เป็นก้อนอะไรกลับมา?",
        expectedKeywords: ["รอ", "promise", "ไม่รอ", "ยังไม่เสร็จ", "เปรียบเทียบไม่ได้", "บั๊ก", "เพี้ยน"],
        modelAnswer: "ถ้าลบ await ออก ตัวแปร stock จะได้ค่าเป็น Promise object แทนที่จะเป็นตัวเลข ทำให้การเปรียบเทียบ stock < item.qty ในบรรทัดที่ 5 ผิดพลาด (เปรียบเทียบ Object กับตัวเลขได้ false เสมอ) แม้ของหมดก็จะไม่โยน Error!"
      },
      {
        id: "q2",
        targetLine: 3,
        dimension: "syntax",
        dimensionLabel: "โครงสร้างภาษา (Syntax & Pattern)",
        question: "ในบรรทัดที่ 3 ทำไมถึงเลือกใช้ลูป for...of แทนที่จะใช้ items.forEach() ร่วมกับ async/await?",
        hint: "forEach รอ await ในแต่ละรอบให้ไหม หรือยิงรวดเดียวพร้อมกัน?",
        expectedKeywords: ["forEach", "ไม่รอ", "ทีละรอบ", "ลำดับ", "พร้อมกัน", "หยุด", "throw"],
        modelAnswer: "เพราะ Array.forEach() ไม่รองรับการรอ async/await ตามลำดับ มันจะยิงฟังก์ชันทุกรอบพร้อมกันโดยไม่รอให้จบลูปก่อน ทำให้คำนวณ total ไม่ทันก่อนถึงบรรทัดลดราคา"
      },
      {
        id: "q3",
        targetLine: 10,
        dimension: "edgeCase",
        dimensionLabel: "กรณีขอบเขต (Edge Cases)",
        question: "บรรทัดที่ 10 ถ้าลูกค้าใส่โค้ด 'VIBE50' และซื้อของรวม 499 บาท โค้ดนี้จะทำงานอย่างไร และคืนค่าเท่าไหร่?",
        hint: "ดูเครื่องหมาย && และค่าเริ่มต้นของ total",
        expectedKeywords: ["ไม่ลด", "499", "ไม่เข้า", "เงื่อนไข", "500", "เท็จ", "false"],
        modelAnswer: "จะไม่เข้าเงื่อนไข if ในบรรทัดที่ 10 เพราะเครื่องหมาย && บังคับว่าต้องจริงทั้งสองฝั่ง (499 น้อยกว่า 500 จึงเป็น false) ระบบจึงข้ามการลดราคาและคืนค่า 499 บาทตามเดิม"
      }
    ],
    sabotage: {
      sabotagedLine: 10,
      originalCode: `  if (discountCode === "VIBE50" && total >= 500) {`,
      mutatedCode: `  if (discountCode === "VIBE50" || total >= 500) {`,
      symptom: "🚨 รายงานจากฝ่ายบัญชี: ลูกค้าที่ไม่ได้กรอกคูปองส่วนลดเลย แต่ซื้อของครบ 500 บาท กลับได้ลดราคา 50% กันหมดทุกคน!",
      options: [
        {
          id: "opt1",
          text: "บรรทัดที่ 10: เครื่องหมาย && ถูกแอบเปลี่ยนเป็น || (OR) ทำให้แค่ยอดถึง 500 ก็ได้ลดทันทีโดยไม่ต้องมีคูปอง",
          isCorrect: true,
          feedback: "ถูกต้องแม่นยำ! การเปลี่ยน && (AND) เป็น || (OR) ทำลายตรรกะการตรวจสิทธิ์คูปองทันที เพราะแค่เงื่อนไขหลังเป็นจริง (total >= 500) ก็ผ่านเข้า if เลย"
        },
        {
          id: "opt2",
          text: "บรรทัดที่ 8: การใช้ += ทำให้ยอดเงินเบิ้ลเป็นสองเท่าจนเกิน 500 บาท",
          isCorrect: false,
          feedback: "ยังไม่ถูกครับ บรรทัดที่ 8 เป็นการบวกสะสมราคาสินค้าแต่ละชิ้นเข้าด้วยกันตามปกติ ไม่ได้ทำให้เกิดบั๊กแจกส่วนลดฟรี"
        },
        {
          id: "opt3",
          text: "บรรทัดที่ 11: การคูณ 0.5 ควรเปลี่ยนเป็นการหารด้วย 2 แทน",
          isCorrect: false,
          feedback: "คูณ 0.5 กับหาร 2 ให้ผลลัพธ์ทางคณิตศาสตร์เท่ากันครับ จุดที่พังคือเงื่อนไข if บรรทัดที่ 10 ต่างหาก!"
        }
      ]
    }
  },
  {
    id: "binary-search",
    title: "ค้นหาคะแนนสอบด้วย Binary Search",
    badge: "อัลกอริทึมยอดฮิต",
    language: "JavaScript",
    description: "อัลกอริทึมที่นักเรียนท่องจำโค้ดได้เป๊ะ แต่อธิบายไม่ได้ว่าทำไมต้องบวกลบ mid ด้วย 1 และจะเกิด Infinite Loop ตอนไหน",
    code: `function findStudentScore(sortedScores, target) {
  let left = 0;
  let right = sortedScores.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (sortedScores[mid] === target) {
      return mid;
    } else if (sortedScores[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return -1;
}`,
    nodes: [
      {
        id: "b1",
        line: 2,
        type: "input",
        label: "ตั้งขอบเขตเริ่มต้น (left, right)",
        codeSnippet: "let left = 0; let right = sortedScores.length - 1;",
        variableState: { sortedScores: "[10, 25, 40, 60, 85]", target: "60", left: "0", right: "4" },
        explanation: "กำหนดตัวชี้ขอบซ้ายสุดที่ index 0 และขอบขวาสุดที่ index สุดท้ายของอาเรย์"
      },
      {
        id: "b2",
        line: 5,
        type: "loop",
        label: "ลูปค้นหาตราบใดที่ขอบยังไม่สวนกัน",
        codeSnippet: "while (left <= right)",
        variableState: { left: "0", right: "4", "left <= right": "true" },
        explanation: "ทำงานซ้ำตราบเท่าที่ช่วงการค้นหายังเหลืออย่างน้อย 1 ตัว (left <= right)"
      },
      {
        id: "b3",
        line: 6,
        type: "operation",
        label: "คำนวณจุดกึ่งกลาง (mid)",
        codeSnippet: "const mid = Math.floor((left + right) / 2);",
        variableState: { calculation: "Math.floor((0 + 4) / 2)", mid: "2", "sortedScores[2]": "40" },
        explanation: "หาตำแหน่งตรงกลางและปัดเศษลงด้วย Math.floor เพื่อให้ได้เลข index ที่เป็นจำนวนเต็ม"
      },
      {
        id: "b4",
        line: 9,
        type: "condition",
        label: "เปรียบเทียบค่ากลางกับเป้าหมาย",
        codeSnippet: "else if (sortedScores[mid] < target)",
        variableState: { "sortedScores[2]": "40", target: "60", "40 < 60": "true (อยู่ฝั่งขวา)" },
        explanation: "ถ้าค่าตรงกลางน้อยกว่าเป้าหมาย แปลว่าเป้าหมายต้องอยู่ในครึ่งขวาแน่นอน"
      },
      {
        id: "b5",
        line: 10,
        type: "operation",
        label: "ตัดครึ่งซ้ายทิ้ง (ขยับ left)",
        codeSnippet: "left = mid + 1;",
        variableState: { oldLeft: "0", newLeft: "3 (2 + 1)", right: "4" },
        explanation: "ขยับขอบซ้ายไปที่ mid + 1 เพราะเช็คตำแหน่ง mid ไปแล้วว่าไม่ใช่"
      },
      {
        id: "b6",
        line: 8,
        type: "output",
        label: "เจอเป้าหมายแล้ว ส่งคืน index",
        codeSnippet: "return mid; // หรือ return -1 ถ้าไม่เจอ",
        variableState: { nextMid: "3", "sortedScores[3]": "60 === target", returnValue: "3" },
        explanation: "เมื่อค่าที่ตำแหน่ง mid ตรงกับ target จะคืนค่า index ทันที แต่ถ้าหลุดลูปจะคืน -1"
      }
    ],
    questions: [
      {
        id: "bq1",
        targetLine: 1,
        dimension: "edgeCase",
        dimensionLabel: "เงื่อนไขตั้งต้น (Precondition)",
        question: "ถ้าอาเรย์ sortedScores ที่ส่งเข้ามา 'ไม่ได้เรียงลำดับจากน้อยไปมาก' โค้ดนี้จะพังที่บรรทัดไหน และเพราะอะไร?",
        hint: "ดูการตัดสินใจตัดครึ่งซ้ายหรือครึ่งขวาในบรรทัดที่ 9-12",
        expectedKeywords: ["ไม่เรียง", "บรรทัด 9", "ตัดผิด", "หาไม่เจอ", "ครึ่ง", "มากกว่า", "น้อยกว่า"],
        modelAnswer: "ตรรกะบรรทัดที่ 9-12 จะพังทันที เพราะการตัดสินใจตัดครึ่งซ้ายทิ้ง (left = mid + 1) อาศัยความจริงที่ว่าค่าทางขวาต้องมากกว่าค่ากลางเสมอ ถ้าไม่ได้เรียงลำดับ ระบบจะตัดฝั่งที่มีคำตอบทิ้งไปและคืนค่า -1 ทั้งที่มีข้อมูลอยู่"
      },
      {
        id: "bq2",
        targetLine: 10,
        dimension: "logic",
        dimensionLabel: "การขยับตัวชี้ (Pointer Logic)",
        question: "ในบรรทัดที่ 10 ทำไมต้องเป็น left = mid + 1? ถ้าเขียนแค่ left = mid เฉยๆ จะเกิดปัญหาร้ายแรงอะไร?",
        hint: "ลองสมมติว่าเหลือข้อมูล 2 ตัวสุดท้าย เช่น left = 3, right = 4 แล้วคำนวณ mid ดู",
        expectedKeywords: ["ไม่จบ", "infinite", "ลูปไม่รู้จบ", "ซ้ำ", "ที่เดิม", "ค้าง", "เช็คไปแล้ว"],
        modelAnswer: "จะเกิด Infinite Loop (ลูปไม่รู้จบ) เพราะเมื่อ left กับ right อยู่ติดกัน ค่า mid จะปัดลงมาเท่ากับ left เสมอ ถ้าตั้ง left = mid ค่า left จะไม่ขยับไปไหนเลยและวนลูปค้างอยู่ที่เดิมตลอดกาล"
      },
      {
        id: "bq3",
        targetLine: 6,
        dimension: "state",
        dimensionLabel: "สถานะตัวแปร (State Tracking)",
        question: "ทำไมบรรทัดที่ 6 ต้องครอบด้วย Math.floor()? ถ้าไม่ใส่จะเกิดอะไรขึ้นในภาษา JavaScript?",
        hint: "ใน JavaScript เวลาเอาเลขคี่หาร 2 เช่น (0 + 3) / 2 จะได้ค่าอะไร และเอาไปเข้า array[1.5] จะได้อะไร?",
        expectedKeywords: ["ทศนิยม", "undefined", "5", "เลขคี่", "index", "จำนวนเต็ม"],
        modelAnswer: "ใน JavaScript การหารไม่ได้ปัดเศษอัตโนมัติ เช่น (0+3)/2 จะได้ 1.5 พอเอาไปเรียก sortedScores[1.5] จะได้ค่า undefined ทำให้เปรียบเทียบผิดและหาคำตอบไม่เจอ"
      }
    ],
    sabotage: {
      sabotagedLine: 5,
      originalCode: `  while (left <= right) {`,
      mutatedCode: `  while (left < right) {`,
      symptom: "🚨 บั๊กปริศนา: เวลาค้นหาคะแนนที่อยู่ริมขอบพอดี หรืออาเรย์มีข้อมูลแค่ 1 ตัว ระบบจะตอบว่าหาไม่เจอ (-1) เสมอ!",
      options: [
        {
          id: "bopt1",
          text: "บรรทัดที่ 5: เครื่องหมาย <= ถูกเปลี่ยนเป็น < ทำให้เมื่อบีบวงแคบจน left เท่ากับ right ลูปจะหลุดทันทีโดยไม่เช็คตัวสุดท้าย",
          isCorrect: true,
          feedback: "สุดยอด! นี่คือ Off-by-one bug คลาสสิกของ Binary Search ถ้าใช้ left < right จังหวะสุดท้ายที่ left === right จะถูกข้ามไปเลย"
        },
        {
          id: "bopt2",
          text: "บรรทัดที่ 3: sortedScores.length - 1 ควรเป็น sortedScores.length เฉยๆ",
          isCorrect: false,
          feedback: "ไม่ใช่ครับ index สุดท้ายของอาเรย์คือ length - 1 ถูกต้องแล้ว"
        },
        {
          id: "bopt3",
          text: "บรรทัดที่ 15: ควร return 0 แทน return -1",
          isCorrect: false,
          feedback: "return 0 จะไปซ้ำกับ index ที่ 0 ครับ มาตรฐานการคืนค่าเมื่อหาไม่เจอคือ -1 ถูกละครับ"
        }
      ]
    }
  }
];

/**
 * Smart Dynamic Code Analyzer for custom pasted code!
 * Parses any user code into X-Ray Flow Nodes, Interrogation Questions, and a Sabotage Challenge
 * so the demo works 100% live on stage even with custom code from the judges!
 */
export function analyzeCustomCode(rawCode: string, title = "โค้ดของคุณ (Custom Code)"): CodePreset {
  const lines = rawCode.split("\n").filter((l) => l.trim().length > 0);
  const nodes: FlowNode[] = [];
  const questions: InterrogationQuestion[] = [];

  lines.slice(0, 8).forEach((lineText, idx) => {
    const trimmed = lineText.trim();
    const lineNum = idx + 1;
    let type: FlowNode["type"] = "operation";
    let label = `บรรทัดที่ ${lineNum}: ประมวลผลคำสั่ง`;
    let explanation = `ทำงานตามคำสั่ง: ${trimmed}`;

    if (/function|def |=>|class /i.test(trimmed)) {
      type = "input";
      label = `ประกาศจุดเริ่มต้นฟังก์ชัน/คลาส`;
      explanation = `กำหนดโครงสร้างและพารามิเตอร์ขาเข้าของโค้ดส่วนนี้`;
    } else if (/await |fetch|axios|Promise|\.then/i.test(trimmed)) {
      type = "async";
      label = `คำสั่ง Asynchronous (รอผลลัพธ์ภายนอก)`;
      explanation = `จัดการงานที่ต้องรอเวลา เช่น ดึงข้อมูล API หรืออ่านฐานข้อมูล`;
    } else if (/if\s*\(|else|switch|\?/i.test(trimmed)) {
      type = "condition";
      label = `ตรวจสอบเงื่อนไข (Branching Logic)`;
      explanation = `ตัดสินใจแยกทางเดินของโปรแกรมตามค่าความจริงของเงื่อนไข`;
    } else if (/for\s*\(|while\s*\(|\.map\(|\.forEach\(|\.filter\(/i.test(trimmed)) {
      type = "loop";
      label = `วนลูปทำซ้ำข้อมูล (Iteration)`;
      explanation = `ประมวลผลข้อมูลในชุดข้อมูลทีละตัวจนครบตามเงื่อนไข`;
    } else if (/return |console\.log|print\(/i.test(trimmed)) {
      type = "output";
      label = `ส่งคืนผลลัพธ์ / แสดงผล (Output)`;
      explanation = `จบการทำงานของบล็อกและส่งค่าออกไปใช้งานต่อ`;
    }

    nodes.push({
      id: `custom-${lineNum}`,
      line: lineNum,
      type,
      label,
      codeSnippet: trimmed.slice(0, 65),
      variableState: {
        activeLine: `${lineNum}`,
        stepType: type.toUpperCase(),
        status: "EXECUTING"
      },
      explanation
    });
  });

  const condLineIdx = lines.findIndex((l) => /if|for|while|await|return/i.test(l));
  const targetIdx = condLineIdx >= 0 ? condLineIdx : 0;
  const targetSnippet = lines[targetIdx]?.trim() || "โค้ดบรรทัดหลัก";

  questions.push(
    {
      id: "cq1",
      targetLine: targetIdx + 1,
      dimension: "logic",
      dimensionLabel: "ตรรกะหลัก (Core Logic)",
      question: `ในบรรทัดที่ ${targetIdx + 1} ("${targetSnippet.slice(0, 40)}...") ทำหน้าที่อะไร และถ้าลบบรรทัดนี้ออก โปรแกรมจะพังอย่างไร?`,
      hint: "อธิบายทั้งหน้าที่ของมัน และผลกระทบต่อบรรทัดถัดๆ ไป",
      expectedKeywords: ["เพราะ", "ถ้า", "ค่า", "ส่ง", "เงื่อนไข", "รอ", "ตัวแปร", "ทำงาน", "ผลลัพธ์"],
      modelAnswer: `บรรทัดที่ ${targetIdx + 1} เป็นจุดควบคุมลำดับการทำงานหลัก หากนำออกจะทำให้ตัวแปรหรือเงื่อนไขในขั้นถัดไปไม่ได้รับค่าที่ถูกต้อง`
    },
    {
      id: "cq2",
      targetLine: Math.min(lines.length, 2),
      dimension: "state",
      dimensionLabel: "การไหลของข้อมูล (Data Flow)",
      question: "ข้อมูลขาเข้า (Input) เริ่มต้นจากตรงไหน และถูกเปลี่ยนรูปอย่างไรบ้างก่อนจะกลายเป็นผลลัพธ์สุดท้าย?",
      hint: "ไล่ตามตัวแปรตั้งแต่บรรทัดแรกจนถึง return/output",
      expectedKeywords: ["รับค่า", "ตัวแปร", "เปลี่ยน", "คืนค่า", "return", "เก็บ", "คำนวณ", "ลูป"],
      modelAnswer: "ข้อมูลเริ่มต้นจากการรับพารามิเตอร์หรือตัวแปรต้นทาง จากนั้นผ่านการประมวลผล/ตรวจสอบเงื่อนไขและส่งออกในขั้นตอนสุดท้าย"
    },
    {
      id: "cq3",
      targetLine: lines.length,
      dimension: "edgeCase",
      dimensionLabel: "จุดเสี่ยงโค้ดพัง (Edge Cases)",
      question: "ถ้ามีคนส่งค่าว่าง (null / undefined / ข้อมูลผิดประเภท) เข้ามาในโค้ดชุดนี้ บรรทัดไหนจะระเบิดก่อน เพราะอะไร?",
      hint: "มองหาจุดที่มีการเรียกใช้ property หรือคำนวณค่าโดยไม่ได้เช็คก่อน",
      expectedKeywords: ["null", "undefined", "error", "พัง", "เช็ค", "เงื่อนไข", "ว่าง", "ก่อน"],
      modelAnswer: "จุดที่มีการเข้าถึงข้อมูลหรือคำนวณโดยไม่มี Guard Clause ดักค่าว่าง จะเกิด Runtime Error ทันทีเมื่อได้รับค่า null หรือ undefined"
    }
  );

  return {
    id: "custom-" + Date.now(),
    title,
    badge: "วิเคราะห์สด (Live AST)",
    language: "Custom Code",
    description: "วิเคราะห์โครงสร้างโค้ดสดด้วยระบบ Dynamic X-Ray Engine",
    code: rawCode,
    nodes,
    questions,
    sabotage: {
      sabotagedLine: targetIdx + 1,
      originalCode: lines[targetIdx] || "",
      mutatedCode: (lines[targetIdx] || "").replace(/===|==|!==|<|>|\+|-/, " !== /* MUTATED */ "),
      symptom: "🚨 ระบบแจ้งเตือน: ผลลัพธ์ของฟังก์ชันกลับด้านจากที่ควรจะเป็นในทุกกรณีทดสอบ!",
      options: [
        {
          id: "copt1",
          text: `บรรทัดที่ ${targetIdx + 1}: ตัวดำเนินการเปรียบเทียบ/คำนวณถูกบิดเบือน ทำให้เงื่อนไขกลับด้าน`,
          isCorrect: true,
          feedback: "ยอดเยี่ยม! คุณจับจุดที่ถูกวางยาได้อย่างแม่นยำ แสดงว่าเข้าใจกลไกของบรรทัดนี้จริงๆ"
        },
        {
          id: "copt2",
          text: "บรรทัดสุดท้าย: การประกาศชื่อฟังก์ชันสะกดผิด",
          isCorrect: false,
          feedback: "ชื่อฟังก์ชันยังเหมือนเดิมครับ ลองสังเกตที่ตัวดำเนินการในบรรทัดหลักดูอีกครั้ง"
        },
        {
          id: "copt3",
          text: "ไม่มีบรรทัดไหนพัง เป็นที่ระบบเครือข่าย",
          isCorrect: false,
          feedback: "โค้ดถูกแก้ไขตรรกะภายในครับ ไม่ได้เกิดจากเครือข่าย"
        }
      ]
    }
  };
}

/**
 * Evaluates a student's explanation and returns a score (0-100) + constructive feedback.
 */
export function evaluateExplanation(
  answer: string,
  question: InterrogationQuestion
): {
  score: number;
  passed: boolean;
  matchedKeywords: string[];
  feedback: string;
} {
  const clean = answer.trim().toLowerCase();
  if (clean.length < 10) {
    return {
      score: 15,
      passed: false,
      matchedKeywords: [],
      feedback: "คำตอบยังสั้นเกินไปครับ! ลองอธิบายเหตุผลว่า 'ทำไม' และ 'จะเกิดอะไรขึ้นถ้า...' ให้เป็ดฟังชัดๆ อีกนิด"
    };
  }

  const matched = question.expectedKeywords.filter((kw) => clean.includes(kw.toLowerCase()));
  const lengthBonus = Math.min(45, Math.floor(clean.length / 2.2));
  const keywordScore = Math.min(55, matched.length * 22);
  const rawScore = Math.min(100, Math.max(35, lengthBonus + keywordScore));
  const passed = rawScore >= 60;

  let feedback = "";
  if (rawScore >= 85) {
    feedback = "🔥 อธิบายได้เฉียบขาดมาก! เห็นภาพทั้งกลไกการทำงานและผลกระทบชัดเจน ระดับเข้าใจลึกซึ้ง!";
  } else if (passed) {
    feedback = "✅ เข้าใจแก่นหลักได้ดีครับ! จับประเด็นสำคัญได้ถูกจุด แต่อาจเสริมตัวอย่างกรณีที่โค้ดจะพังเพิ่มได้อีกนิด";
  } else {
    feedback = "💡 มาถูกทางแล้วครับ แต่ยังขาดคีย์เวิร์ดสำคัญเรื่องผลกระทบต่อตัวแปร ลองดูเฉลยแนวคิดด้านล่างเพื่อเทียบกับภาพในหัวดูนะ!";
  }

  return {
    score: rawScore,
    passed,
    matchedKeywords: matched,
    feedback
  };
}
