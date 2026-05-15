// POST /api/canva/auth/disconnect → clears the Canva session cookie

import { clearCanvaTokens } from '../../../lib/cookies.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  clearCanvaTokens(res);
  res.status(200).json({ ok: true });
}
