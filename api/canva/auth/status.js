// GET /api/canva/auth/status → { connected: true/false, expires_in: seconds }

import { readCanvaTokens } from '../../../lib/cookies.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET only' });
    return;
  }
  const tokens = readCanvaTokens(req);
  if (!tokens) {
    res.status(200).json({ connected: false });
    return;
  }
  res.status(200).json({
    connected: true,
    expires_in: Math.max(0, Math.floor((tokens.expires_at - Date.now()) / 1000))
  });
}
