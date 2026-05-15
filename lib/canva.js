// Canva Connect API helpers — handles token refresh + authed fetches.

import { readCanvaTokens, setCanvaTokens, clearCanvaTokens } from './cookies.js';

const TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';

export function getPublicUrl(req) {
  return (
    process.env.PUBLIC_URL ||
    (req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : null) ||
    (req.headers.host ? `https://${req.headers.host}` : null)
  );
}

export function getRedirectUri(req) {
  return getPublicUrl(req) + '/api/canva/auth/callback';
}

// Exchange the OAuth `code` for tokens (uses PKCE — code_verifier required)
export async function exchangeCodeForTokens(code, codeVerifier, redirectUri) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri
  });
  const basic = Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + basic
    },
    body
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error('Canva token exchange failed: ' + r.status + ' ' + txt);
  }
  const data = await r.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000
  };
}

async function refreshTokens(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  const basic = Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + basic
    },
    body
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error('Canva refresh failed: ' + r.status + ' ' + txt);
  }
  const data = await r.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000
  };
}

// Returns a valid access token, refreshing if needed. Updates the cookie automatically.
export async function getValidAccessToken(req, res) {
  const tokens = readCanvaTokens(req);
  if (!tokens) return null;
  if (Date.now() < tokens.expires_at - 30_000) {
    return tokens.access_token;
  }
  // expired or about to expire — refresh
  try {
    const fresh = await refreshTokens(tokens.refresh_token);
    setCanvaTokens(res, fresh);
    return fresh.access_token;
  } catch (e) {
    clearCanvaTokens(res);
    return null;
  }
}

// Helper to perform an authed Canva API call
export async function canvaFetch(req, res, path, init = {}) {
  const token = await getValidAccessToken(req, res);
  if (!token) throw new Error('Not authenticated with Canva');
  const headers = Object.assign({}, init.headers || {}, {
    'Authorization': 'Bearer ' + token
  });
  return fetch('https://api.canva.com/rest/v1' + path, { ...init, headers });
}
