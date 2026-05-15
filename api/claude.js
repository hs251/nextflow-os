// POST /api/claude — server-side Anthropic proxy so the API key stays on the server.
// Body: { userMessage, systemOverride?, maxTokens?, images?, model? }

export const config = { api: { bodyParser: { sizeLimit: '15mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel env vars.' });
    return;
  }
  try {
    const { userMessage, systemOverride, maxTokens = 2500, images, model = 'claude-sonnet-4-5' } = req.body || {};
    if (!userMessage) {
      res.status(400).json({ error: 'userMessage required' });
      return;
    }
    let content;
    if (Array.isArray(images) && images.length) {
      content = images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } }));
      content.push({ type: 'text', text: userMessage });
    } else {
      content = userMessage;
    }
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemOverride || undefined,
        messages: [{ role: 'user', content }]
      })
    });
    if (!r.ok) {
      const t = await r.text();
      res.status(r.status).json({ error: 'Anthropic ' + r.status, detail: t });
      return;
    }
    const data = await r.json();
    res.status(200).json({ text: data?.content?.[0]?.text || '', usage: data.usage });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
