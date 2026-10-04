/**
 * Optional "Ask Me AI" proxy for Vercel (v10).
 *
 * 1. In Vercel → Project → Settings → Environment Variables add ANTHROPIC_API_KEY.
 * 2. In src/data/portfolio.ts set integrations.aiEndpoint = '/api/ask'.
 *
 * The key stays on the server; the browser only sends the question and the CV facts.
 * Without the key (or if this fails) the app keeps using its on-device answers.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'AI not configured' });
  try {
    const { question = '', facts = '', history = [] } = req.body || {};
    if (typeof question !== 'string' || !question.trim() || question.length > 800) return res.status(400).json({ error: 'Bad question' });
    const messages = [
      ...history
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.text.slice(0, 1500) })),
      { role: 'user', content: question },
    ];
    while (messages.length && messages[0].role !== 'user') messages.shift();
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system:
          'You answer questions about M.R. Ahamed for visitors of his portfolio. Use ONLY the facts below. ' +
          'If something is not in the facts, say you do not know and suggest contacting him. Be brief and friendly.\n\nFACTS:\n' +
          String(facts).slice(0, 8000),
        messages,
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'AI request failed' });
    const d = await r.json();
    const answer = (d.content || []).map((c) => c.text || '').join('').trim();
    return res.status(200).json({ answer });
  } catch {
    return res.status(500).json({ error: 'AI error' });
  }
}
