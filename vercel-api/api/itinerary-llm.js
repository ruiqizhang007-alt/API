import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const input = req.body || {};

    const fs = require('fs'); const path = require('path');
    const examples = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'examples.json'), 'utf-8'));
    const shots = examples.filter(e => e.input.vibe === input.vibe || e.input.city === input.city).slice(0, 3);

    const systemPrompt = `你是一个行程生成助手。请根据用户输入生成详细Hangout计划，严格输出 JSON：
{
  "title": "城市 + 场景 + 人数",
  "segments": [ { "start":"HH:mm", "end":"HH:mm", "label":"活动类型", "detail":"活动说明" } ],
  "backup": "备用方案长文本",
  "full_text": "整段可复制的行程说明（自然口吻）"
}
注意：时间轴合理连续；描述具体、可执行；兼顾饮食/预算/交通/氛围；不要输出多余字段。`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...shots.flatMap(s => ([
        { role: "user", content: JSON.stringify(s.input, null, 2) },
        { role: "assistant", content: JSON.stringify(s.output, null, 2) }
      ])),
      { role: "user", content: JSON.stringify(input, null, 2) }
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 1200,
      messages
    });

    const text = completion.choices?.[0]?.message?.content || "";
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { plan_text: text }; }
    res.status(200).json(parsed);

  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
