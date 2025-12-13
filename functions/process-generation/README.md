# process-generation (worker)

This Appwrite Function is the **background worker** for the pipeline.

It processes a previously-created request document:

ArXiv fetch → LLM summary (DigitalOcean Gradient) → optional FIBO poster → store result → update status.

## 🧰 Usage

### Typical flow

- Another function (usually `functions/generate`) creates a row in the `requests` collection and triggers this function **asynchronously** with `{ "requestId": "<id>" }`.

### Manual execution (for debugging)

Execute this function with:

```json
{ "requestId": "YOUR_REQUEST_DOC_ID" }
```

## ⚙️ Configuration

| Setting | Value |
| --- | --- |
| Runtime | Node (18.0) |
| Entrypoint | `src/main.js` |
| Build Commands | `npm install` |
| Permissions | `any` |
| Timeout (Seconds) | **900 recommended** (LLM + image generation can exceed 15s) |

## 🔒 Environment Variables

### Required

- **`APPWRITE_API_KEY`**: Server API key with permissions to read/write `mitate-db` documents and upload to Storage.

### Recommended (LLM summarization)

- **`DO_GRADIENT_API_KEY`**: DigitalOcean Gradient API key  
  - **Aliases supported**: `DIGITALOCEAN_API_KEY`, `DO_API_KEY`
- **`DO_GRADIENT_MODEL`** (optional): Defaults to `meta-llama/llama-3-70b-instruct`  
  - **Alias supported**: `DIGITALOCEAN_MODEL`

If no DigitalOcean key is set, the worker uses a **fallback summary** extracted from the abstract.

### Optional (poster generation)

- **`FIBO_API_KEY`** (or **`BRIA_API_KEY`**): Enables real poster generation via Bria/FIBO.  
  If not set, the worker stores a placeholder image URL and still completes.

### Optional (IDs)

- **`DATABASE_ID`**: Defaults to `mitate-db`
- **`BUCKET_ID`**: Defaults to `poster-images`

## Notes

- This worker is resilient to **schema drift** between deployments (e.g., if your `requests` or `results` collections don’t have optional fields like `error` / `fibo_*`, it will retry with a minimal document shape).
