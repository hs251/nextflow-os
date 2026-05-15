# Next-Flow LinkedIn OS — Hosted version with real Canva integration

Personal LinkedIn brand operating system for Muhammad Haris Siddiqui — Next-Flow.

This is the **deployable version** that runs on Vercel as a real website (not a local file) so the Canva integration actually works.

---

## How to deploy (one-time setup, ~20 minutes)

Follow `DEPLOY.html` in this folder — open it in Chrome for the visual step-by-step guide. The high-level flow is:

1. **Sign up for a Canva developer account** at https://www.canva.com/developers — free.
2. **Create an integration** → get a `Client ID` and `Client Secret`.
3. **Sign up for Vercel** at https://vercel.com — free.
4. **Push this folder to GitHub** (Vercel reads from GitHub).
5. **Import the GitHub repo into Vercel** → paste your Canva keys + Anthropic key → Deploy.
6. **Copy your new Vercel URL** (e.g. `https://nextflow-os-haris.vercel.app`).
7. **Go back to Canva developer settings** → set the redirect URI to `https://your-vercel-url.vercel.app/api/canva/auth/callback`.
8. **Open your Vercel URL** in Chrome → Settings → click **Connect Canva** → authorize.
9. Push slides to Canva from the Designer tab.

---

## Required environment variables

Paste these in Vercel's project settings → Environment Variables:

| Name | Where to get it |
|------|-----------------|
| `CANVA_CLIENT_ID` | Canva developer app page |
| `CANVA_CLIENT_SECRET` | Canva developer app page |
| `COOKIE_SECRET` | Any 50+ char random string — generate at https://generate-secret.vercel.app/64 |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `PUBLIC_URL` | Your Vercel URL, set AFTER first deploy. Optional but recommended. |
| `BUFFER_ACCESS_TOKEN` | Optional — for LinkedIn scheduling |
| `BUFFER_CHANNEL_ID` | Optional — for LinkedIn scheduling |

---

## Architecture

```
nextflow-os-vercel/
├── index.html           ← The OS (served as the homepage)
├── api/
│   ├── claude.js                          (Anthropic proxy — keys stay server-side)
│   ├── buffer.js                          (Buffer proxy — for scheduling)
│   └── canva/
│       ├── auth/start.js                  (OAuth init with PKCE)
│       ├── auth/callback.js               (OAuth callback — sets signed cookie)
│       ├── auth/status.js                 (Is the user connected?)
│       ├── auth/disconnect.js             (Clears the cookie)
│       ├── upload-asset.js                (Uploads a slide PNG as a Canva asset)
│       └── create-design.js               (Creates a Canva design from uploaded assets)
├── lib/
│   ├── cookies.js                         (Signed-cookie helpers)
│   └── canva.js                           (Canva API client + token refresh)
├── vercel.json                            (Routing + function config)
├── package.json
└── .env.example
```

**Cookie-based session.** The user's Canva tokens are stored in a signed httpOnly cookie. No database needed. Tokens auto-refresh on every call.

**PKCE OAuth.** Required by Canva — the OAuth start endpoint generates a code_verifier, stores it in a short-lived cookie, then verifies on callback.

**Slide upload pipeline.** When the user clicks "Push slides to Canva," the frontend uses `html2canvas` to render each slide DOM element as a PNG, uploads each PNG to Canva via `/api/canva/upload-asset`, then calls `/api/canva/create-design` to create a multi-slide Canva design from those assets. The design's edit URL opens in a new tab — fully editable inside Canva.

---

## Local development (optional, requires Node 18+)

```bash
npm i -g vercel
vercel dev
```

Open http://localhost:3000.
