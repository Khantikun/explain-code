import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, question, studentAnswer, apiKey } = body;
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;

    if (!keyToUse) {
      return NextResponse.json(
        { mode: "offline", message: "Using built-in deterministic AST evaluator" },
        { status: 200 }
      );
    }

    const prompt = `คุณคือ "สารวัตรเป็ดไซเบอร์ (Cyber Duck Interrogator)" กรรมการสอบปากเปล่าวิชาเขียนโปรแกรม
โค้ดของนักเรียน:
\`\`\`
${code}
\`\`\`
คำถามที่ถามนักเรียน: "${question}"
คำตอบของนักเรียน: "${studentAnswer}"

จงประเมินว่านักเรียนเข้าใจการทำงานของโค้ดจริงหรือไม่ และตอบกลับเป็น JSON เท่านั้นในรูปแบบ:
{
  "score": ตัวเลข 0-100,
  "passed": true หรือ false (ผ่านถ้า score >= 60),
  "feedback": "คำวิจารณ์สั้นๆ กวนๆ แต่ให้ความรู้ชัดเจน 2-3 ประโยคภาษาไทย",
  "followUpTip": "คำแนะนำเพิ่มเติมเพื่อให้เข้าใจลึกขึ้น 1 ประโยค"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ mode: "fallback" }, { status: 200 });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(rawText);

    return NextResponse.json({
      mode: "gemini-live",
      score: typeof parsed.score === "number" ? parsed.score : 75,
      passed: Boolean(parsed.passed),
      feedback: parsed.feedback || "วิเคราะห์ด้วย Gemini AI สำเร็จ",
      followUpTip: parsed.followUpTip || ""
    });
  } catch {
    return NextResponse.json({ mode: "fallback" }, { status: 200 });
  }
}
