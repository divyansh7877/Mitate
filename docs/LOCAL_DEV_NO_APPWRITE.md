# Local Development (No Appwrite, No DB)

This guide runs **everything locally**:
- Frontend: Vite dev server
- Backend: **local Bun API server** (in-memory; no database; no Appwrite)

The local API mimics the same request flow as the Appwrite functions:
ArXiv → (optional DigitalOcean summary) → (optional FIBO poster) → result

## Prerequisites

- **Bun** installed
- Optional keys (recommended if you want the “real” pipeline):
  - **DigitalOcean Gradient**: `DO_GRADIENT_API_KEY` (or `DIGITALOCEAN_API_KEY`)
  - **Bria/FIBO**: `FIBO_API_KEY` (or `BRIA_API_KEY`)

## 1) Install dependencies

```bash
cd /home/divyansh/Documents/Mitate
bun install
```

If Bun complains about a broken lockfile on your machine, regenerate it:

```bash
rm -f bun.lock
bun install
```

## 2) Configure environment

### 2.1 Frontend env (`.env`)

Set these (or put them in `.env.local`):

```env
VITE_USE_MOCKS=false
VITE_ALLOW_MOCK_FALLBACK=false

# Point the frontend to the local API server (no Appwrite)
VITE_LOCAL_API_BASE_URL=http://127.0.0.1:8787
```

### 2.2 Backend env (same `.env` is fine)

The local API server reads non-`VITE_` env vars from `process.env`.

#### Optional: DigitalOcean Gradient summarization

```env
DO_GRADIENT_API_KEY=your_do_key_here
DO_GRADIENT_MODEL=meta-llama/llama-3-70b-instruct
```

Aliases supported:
- `DIGITALOCEAN_API_KEY`, `DO_API_KEY`
- `DIGITALOCEAN_MODEL`

If you don’t set a DO key, the server will generate a **fallback summary** from the abstract.

#### Optional: FIBO poster generation

```env
FIBO_API_KEY=your_fibo_key_here
```

Alias supported: `BRIA_API_KEY`

If you don’t set a FIBO key, the server returns a **placeholder** poster image URL.

#### Optional: local API port/host

```env
LOCAL_API_PORT=8787
LOCAL_API_HOST=127.0.0.1
```

## 3) Run the local API server (Terminal 1)

```bash
cd /home/divyansh/Documents/Mitate
bun run dev:local-api
```

Health check (optional):

```bash
curl http://127.0.0.1:8787/health
```

## 4) Run the frontend (Terminal 2)

```bash
cd /home/divyansh/Documents/Mitate
bun run dev
```

Open:
- `http://localhost:3000`

## 5) Test the flow

Try:
- Query: `Vision transformer`
- Knowledge level: `beginner`

You should see:
- Request IDs starting with `local_...`
- Progress moving: `finding_paper` → `summarizing` → `generating_image` → `complete`

## Notes / Troubleshooting

### “I still see mock data”

Make sure:
- `VITE_USE_MOCKS=false`
- `VITE_LOCAL_API_BASE_URL` is set

### “I’m getting ‘Local API error (…): …’”

Check the local API server logs in Terminal 1.

### “It completes, but image is a placeholder”

Set:
- `FIBO_API_KEY=...`

### “Summaries look basic”

Set:
- `DO_GRADIENT_API_KEY=...` (or `DIGITALOCEAN_API_KEY=...`)


