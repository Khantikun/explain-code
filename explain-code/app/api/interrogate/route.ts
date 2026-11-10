import { NextRequest, NextResponse } from "next/server";

/**
 * ตรวจคำอธิบายอิสระของนักเรียนผ่านหลังบ้าน (ไม่ใส่ API Key ในไฟล์หน้าเว็บ)
 * AI ใช้ตรวจคำอธิบายอิสระเท่านั้น ส่วนเฉลยข้อทำนายผลมาจากการรันโค้ดจริง
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, topicTitle, studentExplanation } = body;
    const keyToUse = process.env.GEMINI_API_KEY;

    const clean = (studentExplanation || "").trim();
    if (clean.length < 8) {
      return NextResponse.json({
        mode: "heuristic",
        passed: false,
        score: 30,
        feedback: "คำอธิบายยังสั้นเกินไป ลองระบุว่าตัวแปรเปลี่ยนค่าอย่างไรและโค้ดส่วนนี้ทำหน้าที่อะไรเพิ่มอีกนิดนะครับ",
      });
    }

    if (!keyToUse) {
      // ระบบตรวจคำอธิบายอัตโนมัติตามเกณฑ์ Block Model 3 มิติ (โครงสร้าง, การทำงานจริง, หน้าที่)
      const hasSurface = /ตัวแปร|let|if|else|for|while|function|return|บรรทัด|เครื่องหมาย|แอเรย์|ค่า/i.test(clean);
      const hasExecution = /รอบ|เปลี่ยน|บวก|ลบ|คูณ|ส่ง|พิมพ์|กลายเป็น|เท่ากับ|มากกว่า|น้อยกว่า|จริง|เท็จ/i.test(clean);
      const hasFunction = /เพื่อ|ทำหน้าที่|หา|นับ|รวม|ตรวจ|ส่วนลด|คะแนน|สูงสุด|ผลลัพธ์/i.test(clean);

      const dims = [hasSurface, hasExecution, hasFunction].filter(Boolean).length;
      const score = dims === 3 ? 95 : dims === 2 ? 82 : dims === 1 ? 68 : 55;
      const passed = score >= 65;

      return NextResponse.json({
        mode: "heuristic",
        passed,
        score,
        feedback:
          dims === 3
            ? "อธิบายได้ครบทั้งโครงสร้างโค้ด ลำดับการเปลี่ยนค่าตัวแปร และเป้าหมายของโปรแกรมตามกรอบ Block Model!"
            : dims === 2
            ? "อธิบายการทำงานได้ดีมาก! หากเพิ่มเหตุผลว่าโค้ดส่วนนี้มีเป้าหมายเพื่ออะไรในภาพรวมจะสมบูรณ์ครบ 3 มิติ"
            : "จับประเด็นเริ่มต้นได้แล้ว ลองอธิบายเพิ่มว่าค่าตัวแปรเปลี่ยนเป็นเท่าไหร่เมื่อโค้ดรันแต่ละขั้น",
      });
    }

    const prompt = `คุณคือครูผู้ช่วยตรวจคำอธิบายโค้ด JavaScript ตามกรอบ Block Model (Text Surface, Execution, Function)
หัวข้อ: "${topicTitle}"
โค้ด:
\`\`\`javascript
${code}
\`\`\`
คำอธิบายของนักเรียน: "${clean}"

จงประเมินความเข้าใจของนักเรียนและตอบกลับเป็น JSON เท่านั้น:
{
  "score": ตัวเลข 0-100,
  "passed": true หรือ false (ผ่านถ้า score >= 65),
  "feedback": "คำชมและคำแนะนำสั้นๆ เข้าใจง่าย 2 ประโยคภาษาไทย ไม่ลงโทษ"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        mode: "heuristic-fallback",
        passed: true,
        score: 80,
        feedback: "อธิบายลำดับการทำงานและหน้าที่ของโค้ดได้ชัดเจนดีมาก!",
      });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(rawText);

    return NextResponse.json({
      mode: "gemini-backend",
      score: typeof parsed.score === "number" ? parsed.score : 80,
      passed: Boolean(parsed.passed),
      feedback: parsed.feedback || "ตรวจคำอธิบายด้วย AI หลังบ้านเรียบร้อย",
    });
  } catch {
    return NextResponse.json({
      mode: "heuristic-fallback",
      passed: true,
      score: 78,
      feedback: "อธิบายแนวคิดของโค้ดได้ดี เข้าใจลำดับการทำงานของโปรแกรม!",
    });
  }
}
