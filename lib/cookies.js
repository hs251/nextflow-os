// Signed-cookie helper. No external deps — uses Node's built-in crypto.
// Cookies are httpOnly + secure + sameSite=lax + HMAC-SHA256 signed.

import crypto from 'node:crypto';

const SECRET = process.env.COOKIE_SECRET || 'fallback-dev-secret-DO-NOT-USE-IN-PROD';

function sign(payloadStr) {
  return crypto.createHmac('sha256', SECRET).update(payloadStr).digest('base64url');
}

export function encodeCookie(obj) {
  const payload = Buffer.from(JSON.stringify(obj)).toString('base64url');
  const sig = sign(payload);
  return payload + '.' + sig;
}

export function decodeCookie(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
  catch { return null; }
}

const COOKIE_NAME = 'nf_canva';

export function setCanvaTokens(res, tokens) {
  // tokens = { access_token, refresh_token, expires_at }
  const val = encodeCookie(tokens);
  const maxAge = 60 * 60 * 24 * 90; // 90 days
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${val}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}

export function clearCanvaTokens(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

export function readCanvaTokens(req) {
  const cookie = req.headers.cookie || '';
  const pairs = cookie.split(';').map(s => s.trim());
  for (const p of pairs) {
    if (p.startsWith(COOKIE_NAME + '=')) {
      const val = p.slice(COOKIE_NAME.length + 1);
      return decodeCookie(val);
    }
  }
  return null;
}

// Short-lived state cookie for OAuth flow (holds code_verifier + return_to)
const STATE_COOKIE = 'nf_canva_state';

export function setStateCookie(res, obj) {
  const val = encodeCookie(obj);
  res.setHeader('Set-Cookie', `${STATE_COOKIE}=${val}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
}

export function readStateCookie(req) {
  const cookie = req.headers.cookie || '';
  for (const p of cookie.split(';').map(s => s.trim())) {
    if (p.startsWith(STATE_COOKIE + '=')) {
      return decodeCookie(p.slice(STATE_COOKIE.length + 1));
    }
  }
  return null;
}

export function clearStateCookie(res) {
  res.setHeader('Set-Cookie', `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}
