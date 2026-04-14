# Deploying PactSafe AI

Two targets:

- **Backend (FastAPI)** → Fly.io, built from `apps/api/`
- **Frontend (Next.js)** → Vercel, built from `apps/web/`

Do them in this order. The frontend needs the backend URL.

---

## 1. Backend → Fly.io

### Why it was crashing before

Fly was building from the repo root, saw `package.json` + `contractAnalyzer.js`,
picked Node as the runtime, started `node contractAnalyzer.js`, which tried to
hit Claude with no key, 401'd, and exited in a loop.

The fix is already in place: `apps/api/fly.toml` sets the build context to
`apps/api/` and uses the existing `apps/api/Dockerfile`, which runs
`uvicorn app.main:app` on port 8000. Fly never sees the root-level Node files.

### One-time setup

```bash
# From the repo root
cd apps/api

# Launch the app (only first time — this reads fly.toml and creates the app)
fly launch --no-deploy --copy-config --name pactsafe-ai --region iad

# Create the persistent volume for SQLite + uploaded files
fly volumes create pactsafe_data --region iad --size 1 -a pactsafe-ai

# Set secrets — THESE ARE WHY YOU WERE 401ING
fly secrets set \
  ANTHROPIC_API_KEY="sk-ant-api03-..." \
  -a pactsafe-ai

# (optional) Groq fallback
fly secrets set GROQ_API_KEY="gsk_..." -a pactsafe-ai

# Verify secrets are set (won't print values, just names)
fly secrets list -a pactsafe-ai
```

### Deploy

```bash
# Still inside apps/api/
fly deploy
```

### Smoke test

```bash
curl https://pactsafe-ai.fly.dev/api/health
```

Expected response:

```json
{"status":"ok","provider":"anthropic","ollama_reachable":false,"anthropic_configured":true,"groq_configured":false}
```

If you get `anthropic_configured: false`, your secret didn't land — re-run
`fly secrets set ANTHROPIC_API_KEY=...` and wait for the restart.

### Watch logs

```bash
fly logs -a pactsafe-ai
```

You should see `Uvicorn running on http://0.0.0.0:8000` — **not**
`node contractAnalyzer.js`. If you still see Node, Fly is using a cached
config; run `fly deploy --no-cache`.

---

## 2. Frontend → Vercel

### Option A (recommended): dashboard setting

1. Vercel → import the repo
2. **Settings → General → Root Directory** = `apps/web`
3. **Framework Preset** = Next.js (auto-detected once root is set)
4. **Environment Variables** (Production + Preview):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://pactsafe-ai.fly.dev` |
   | `NEXT_PUBLIC_WS_URL` | `wss://pactsafe-ai.fly.dev` |

5. Deploy.

### Option B: vercel.json + .vercelignore (already committed)

If you can't set Root Directory, the `vercel.json` at the repo root builds
`apps/web` explicitly, and `.vercelignore` hides the Python files so Vercel
doesn't try to compile them. Same env vars still required.

### Point CORS on the API at your Vercel domain

Once Vercel gives you a URL, add it to the API's allowed origins:

```bash
fly secrets set \
  CORS_ORIGINS="https://pactsafe-ai.vercel.app,http://localhost:3000" \
  -a pactsafe-ai
```

(Re-run for any custom domains you add later.)

---

## 3. End-to-end smoke test

From your laptop:

```bash
# Health
curl https://pactsafe-ai.fly.dev/api/health

# Create a job from raw text
curl -X POST https://pactsafe-ai.fly.dev/api/jobs \
  -F "text=This agreement grants Party A unlimited liability and a 10-year non-compete clause with no termination rights."

# Poll it (use the job_id from the response above)
curl https://pactsafe-ai.fly.dev/api/jobs/<job_id>
```

Then open `https://pactsafe-ai.vercel.app/analyze`, drop a PDF, and watch the
progress bar fill via WebSocket. No API keys appear in the browser — all LLM
traffic goes through Fly.

---

## Common failure modes

**Fly still runs Node.** You didn't deploy from `apps/api/` — Fly picked up
the root `package.json` again. Either `cd apps/api && fly deploy` or use
`fly deploy -c apps/api/fly.toml` with the config path.

**Vercel says "No python entrypoint found".** You didn't set Root Directory
to `apps/web`, and `.vercelignore` / `vercel.json` aren't committed. Commit
and redeploy.

**401 from Anthropic.** Your secret isn't set on Fly, or it's malformed.
Run `fly secrets list -a pactsafe-ai` — if `ANTHROPIC_API_KEY` isn't there,
set it. Do **not** put it in `.env` or `fly.toml`; use `fly secrets set`.

**WebSocket fails in the browser.** `NEXT_PUBLIC_WS_URL` is wrong. It must
use `wss://` (not `ws://`) because Fly forces HTTPS.

**CORS error in browser console.** The API's `CORS_ORIGINS` doesn't include
your Vercel URL. Update it with `fly secrets set CORS_ORIGINS=...`.
