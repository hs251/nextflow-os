// Kicks off the Canva OAuth flow with PKCE.
// GET /api/canva/auth/start → redirects to Canva's authorize page.

import crypto from 'node:crypto';
import { setStateCookie } from '../../../lib/cookies.js';
import { getRedirectUri } from '../../../lib/canva.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET only' });
    return;
  }
  if (!process.env.CANVA_CLIENT_ID) {
    res.status(500).json({ error: 'CANVA_CLIENT_ID not set in Vercel env vars.' });
    return;
  }

  // PKCE
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('base64url');

  // remember verifier + state for the callback
  setStateCookie(res, { codeVerifier, state });

  const redirectUri = getRedirectUri(req);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.CANVA_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'asset:read asset:write design:content:read design:content:write design:meta:read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  res.writeHead(302, { Location: 'https://www.canva.com/api/oauth/authorize?' + params.toString() });
  res.end();
}
