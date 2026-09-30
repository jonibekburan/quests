const hits = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || "x";
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  if (list.length >= 30) return res.status(429).json({ error: "limit" });
  hits.set(ip, [...list, now]);

  const prompt = String((req.body || {}).prompt || "").slice(0, 4000);
  if (!prompt) return res.status(400).json({ error: "empty" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await r.json();
    const text = (data.content || []).map(c => c.text || "").join("");
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    res.status(200).json(JSON.parse(json));
  } catch (e) {
    res.status(500).json({ error: "fail" });
  }
}
