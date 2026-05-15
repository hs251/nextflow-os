// Handles the redirect back from Canva after the user authorizes.
// GET /api/canva/auth/callback?code=...&state=...

import { readStateCookie, clearStateCookie, setCanvaTokens } from '../../../lib/cookies.js';
import { exchangeCodeForTokens, getRedirectUri } from '../../../lib/canva.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('GET only');
    return;
  }

  const { code, state, error, error_description } = req.query;

  if (error) {
    return sendHtml(res, `<h2>Canva auth failed</h2><p>${escape(error)} — ${escape(error_description || '')}</p><p><a href="/">Back to OS</a></p>`);
  }

  if (!code) {
    return sendHtml(res, '<h2>Missing code</h2><p>Canva did not return an authorization code.</p>');
  }

  const stateCookie = readStateCookie(req);
  if (!stateCookie || stateCookie.state !== state) {
    return sendHtml(res, '<h2>Invalid state</h2><p>This callback did not match the request that started it. Try connecting Canva again from the OS.</p><p><a href="/">Back to OS</a></p>');
  }

  try {
    const tokens = await exchangeCodeForTokens(code, stateCookie.codeVerifier, getRedirectUri(req));
    setCanvaTokens(res, tokens);
    clearStateCookie(res);

    // Show a friendly success page that posts a message and auto-closes if opened as popup
    return sendHtml(res, `
      <style>body{font-family:'Syne',system-ui,sans-serif;background:#F6F5F2;color:#1A1A18;padding:40px;text-align:center;}h2{margin-bottom:8px;}.btn{display:inline-block;background:#7F77DD;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:14px;}</style>
      <h2>✓ Canva connected</h2>
      <p>You can close this tab and head back to Next-Flow OS.</p>
      <a class="btn" href="/">Back to OS</a>
      <script>
        try { window.opener && window.opener.postMessage({ type: 'canva-connected' }, '*'); } catch(e){}
        setTimeout(function(){ try { window.close(); } catch(e){} }, 800);
      </script>
    `);
  } catch (err) {
    return sendHtml(res, `<h2>Canva auth failed</h2><p>${escape(err.message)}</p><p><a href="/">Back to OS</a></p>`);
  }
}

function sendHtml(res, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send('<!DOCTYPE html><html><body>' + body + '</body></html>');
}

function escape(s) { return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
