/**
 * Local Dev API Server (App Platform friendly, Postgres optional)
 *
 * Exposes a minimal API compatible with the frontend:
 * - POST /api/generate { query, knowledge_level } -> { request_id, status, message }
 * - GET  /api/status?requestId=... -> { request_id, status, message, result?, error? }
 *
 * Storage:
 * - Uses Postgres when DATABASE_URL is set (Managed DB on DO)
 * - Falls back to in-memory Map otherwise
 *
 * Run:
 *   bun run src/local/devApiServer.ts
 */

import postgres, { type Sql } from "postgres";

import { createFiboService } from "../services/fiboService";
import { createPosterGenerationOrchestrator } from "../services/posterGenerationOrchestrator";
import type { GenerationInput, KnowledgeLevel, Summary } from "../types/poster";

type RequestStatus =
  | "pending"
  | "finding_paper"
  | "summarizing"
  | "generating_image"
  | "complete"
  | "failed";

type StoredResult = {
  paper_title: string;
  paper_url: string;
  image_url: string;
  summary: Summary;
};

type StoredRequest = {
  request_id: string;
  status: RequestStatus;
  message: string;
  created_at: string;
  updated_at: string;
  error?: string;
  result?: StoredResult;
  // internal
  input: {
    query: string;
    knowledge_level: KnowledgeLevel;
  };
};

type Storage = {
  type: "memory" | "db";
  ready: Promise<void>;
  saveRequest: (req: StoredRequest) => Promise<void>;
  updateStatus: (reqId: string, status: RequestStatus, error?: string) => Promise<void>;
  setResult: (reqId: string, result: StoredResult) => Promise<void>;
  getRequest: (reqId: string) => Promise<StoredRequest | null>;
};

function isValidDatabaseUrl(url: string | undefined): url is string {
  if (!url) return false;
  // Protect against unresolved templates like "${production-database.DATABASE_URL}"
  if (url.includes("${")) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const memoryRequests = new Map<string, StoredRequest>();

const memoryStorage: Storage = {
  type: "memory",
  ready: Promise.resolve(),
  async saveRequest(req) {
    memoryRequests.set(req.request_id, req);
  },
  async updateStatus(reqId, status, error) {
    const existing = memoryRequests.get(reqId);
    if (!existing) return;
    existing.status = status;
    existing.message = statusMessage(status);
    existing.updated_at = new Date().toISOString();
    existing.error = error;
    memoryRequests.set(reqId, existing);
  },
  async setResult(reqId, result) {
    const existing = memoryRequests.get(reqId);
    if (!existing) return;
    existing.status = "complete";
    existing.message = statusMessage("complete");
    existing.updated_at = new Date().toISOString();
    existing.error = undefined;
    existing.result = result;
    memoryRequests.set(reqId, existing);
  },
  async getRequest(reqId) {
    return memoryRequests.get(reqId) || null;
  },
};

type DbRow = {
  request_id: string;
  status: string;
  message: string;
  created_at: Date | string;
  updated_at: Date | string;
  error: string | null;
  query: string;
  knowledge_level: string;
  paper_title: string | null;
  paper_url: string | null;
  image_url: string | null;
  summary: any | null;
};

function mapRowToStored(row: DbRow): StoredRequest {
  return {
    request_id: row.request_id,
    status: row.status as RequestStatus,
    message: row.message,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    error: row.error || undefined,
    result:
      row.status === "complete" && row.paper_title && row.paper_url && row.image_url && row.summary
        ? {
            paper_title: row.paper_title,
            paper_url: row.paper_url,
            image_url: row.image_url,
            summary: row.summary as Summary,
          }
        : undefined,
    input: {
      query: row.query,
      knowledge_level: row.knowledge_level as KnowledgeLevel,
    },
  };
}

async function ensureDbSchema(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS generation_requests (
      request_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      error TEXT,
      query TEXT NOT NULL,
      knowledge_level TEXT NOT NULL,
      paper_title TEXT,
      paper_url TEXT,
      image_url TEXT,
      summary JSONB
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS generation_requests_status_idx
    ON generation_requests(status)
  `;
}

function createDbStorage(url: string): Storage {
  const sql = postgres(url, {
    ssl: "require",
    max: 1,
    idle_timeout: 20,
  });

  const ready = ensureDbSchema(sql);

  return {
    type: "db",
    ready,
    async saveRequest(req) {
      await ready;
      await sql`
        INSERT INTO generation_requests (
          request_id, status, message, created_at, updated_at, error, query, knowledge_level
        ) VALUES (
          ${req.request_id},
          ${req.status},
          ${req.message},
          ${req.created_at},
          ${req.updated_at},
          ${req.error ?? null},
          ${req.input.query},
          ${req.input.knowledge_level}
        )
        ON CONFLICT (request_id) DO UPDATE
        SET
          status = EXCLUDED.status,
          message = EXCLUDED.message,
          updated_at = EXCLUDED.updated_at,
          error = EXCLUDED.error,
          query = EXCLUDED.query,
          knowledge_level = EXCLUDED.knowledge_level
      `;
    },
    async updateStatus(reqId, status, error) {
      await ready;
      await sql`
        UPDATE generation_requests
        SET
          status = ${status},
          message = ${statusMessage(status)},
          updated_at = NOW(),
          error = ${error ?? null}
        WHERE request_id = ${reqId}
      `;
    },
    async setResult(reqId, result) {
      await ready;
      await sql`
        UPDATE generation_requests
        SET
          status = 'complete',
          message = ${statusMessage("complete")},
          updated_at = NOW(),
          error = NULL,
          paper_title = ${result.paper_title},
          paper_url = ${result.paper_url},
          image_url = ${result.image_url},
          summary = ${sql.json(result.summary)}
        WHERE request_id = ${reqId}
      `;
    },
    async getRequest(reqId) {
      await ready;
      const rows = await sql<DbRow[]>`
        SELECT
          request_id,
          status,
          message,
          created_at,
          updated_at,
          error,
          query,
          knowledge_level,
          paper_title,
          paper_url,
          image_url,
          summary
        FROM generation_requests
        WHERE request_id = ${reqId}
        LIMIT 1
      `;

      if (!rows || rows.length === 0) return null;
      return mapRowToStored(rows[0]);
    },
  };
}

let storage: Storage = memoryStorage;

if (isValidDatabaseUrl(DATABASE_URL)) {
  try {
    const dbStorage = createDbStorage(DATABASE_URL);
    storage = dbStorage;

    dbStorage.ready
      .then(() => {
        console.log("[storage] Using Postgres for request persistence");
      })
      .catch((err) => {
        console.error("[storage] Postgres unavailable, falling back to memory:", err);
        storage = memoryStorage;
      });
  } catch (err) {
    console.error("[storage] Invalid DATABASE_URL, using memory:", err);
    storage = memoryStorage;
  }
} else {
  console.warn(
    "[storage] DATABASE_URL not set or not usable (likely unresolved template). Using in-memory storage."
  );
}

async function ensureStorageReady(): Promise<Storage> {
  try {
    await storage.ready;
    return storage;
  } catch (err) {
    console.warn("[storage] Storage not ready, switching to in-memory:", err);
    storage = memoryStorage;
    return storage;
  }
}

// DigitalOcean App Platform provides PORT. Prefer it if present.
const PORT = Number(process.env.PORT || process.env.LOCAL_API_PORT || 8787);
// For local dev we default to 127.0.0.1, but for hosting we typically need 0.0.0.0.
const HOST = process.env.LOCAL_API_HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");

// CORS: by default allow all in local dev, but you can lock it down in hosting
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const DO_ENDPOINT = "https://inference.do-ai.run/v1/chat/completions";
const DO_API_KEY =
  process.env.DO_GRADIENT_API_KEY ||
  process.env.DIGITALOCEAN_API_KEY ||
  process.env.DO_API_KEY;
const DO_MODEL =
  process.env.DO_GRADIENT_MODEL ||
  process.env.DIGITALOCEAN_MODEL ||
  "meta-llama/llama-3-70b-instruct";

function json(res: any, body: any, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      // very permissive for local dev
      "Access-Control-Allow-Origin": CORS_ORIGIN,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function statusMessage(status: RequestStatus) {
  const messages: Record<RequestStatus, string> = {
    pending: "Request received, starting processing...",
    finding_paper: "Finding relevant papers on ArXiv...",
    summarizing: "Reading and summarizing the paper...",
    generating_image: "Generating your visual infographic...",
    complete: "Generation complete!",
    failed: "Generation failed. Please try again.",
  };
  return messages[status];
}

async function updateStatus(reqId: string, status: RequestStatus, error?: string) {
  const store = await ensureStorageReady();
  await store.updateStatus(reqId, status, error);
}

function extractArxivId(url: string): string | null {
  const match = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
  return match ? match[1] : null;
}

async function fetchArxivById(arxivId: string) {
  const resp = await fetch(
    `http://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`
  );
  const text = await resp.text();
  return parseFirstArxivEntry(text, arxivId);
}

async function searchArxivByTopic(query: string) {
  const resp = await fetch(
    `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
      query
    )}&max_results=1`
  );
  const text = await resp.text();
  return parseFirstArxivEntry(text, null);
}

function parseFirstArxivEntry(xml: string, forcedId: string | null) {
  // Minimal parsing for local dev (Atom XML).
  // We extract the first <entry>...</entry> block then pull title/summary/id.
  const entryMatch = xml.match(/<entry\b[\s\S]*?<\/entry>/);
  if (!entryMatch) throw new Error("No arXiv entries found");
  const entry = entryMatch[0];

  const title =
    (entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "Untitled")
      .replace(/\s+/g, " ")
      .trim();

  const summary =
    (entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || "")
      .replace(/\s+/g, " ")
      .trim();

  const idUrl =
    (entry.match(/<id>([\s\S]*?)<\/id>/)?.[1] || "").trim() ||
    (forcedId ? `https://arxiv.org/abs/${forcedId}` : "");

  const arxivId =
    forcedId ||
    (idUrl.match(/arxiv\.org\/abs\/([^<\s]+)/)?.[1] || "unknown");

  return {
    arxiv_id: arxivId,
    title,
    abstract: summary,
    arxiv_url: idUrl.includes("arxiv.org") ? idUrl : `https://arxiv.org/abs/${arxivId}`,
  };
}

function clampConcepts(concepts: any[], min = 3, max = 6) {
  const arr = Array.isArray(concepts) ? concepts : [];
  const normalized = arr
    .map((c) => ({
      name: String(c?.name || "").trim(),
      explanation: String(c?.explanation || "").trim(),
      visual_metaphor: String(c?.visual_metaphor || "").trim(),
    }))
    .filter((c) => c.name && c.explanation && c.visual_metaphor);

  if (normalized.length >= min && normalized.length <= max) return normalized;
  if (normalized.length > max) return normalized.slice(0, max);

  // pad if too few
  while (normalized.length < min) {
    normalized.push({
      name: `Key Idea ${normalized.length + 1}`,
      explanation:
        "A core idea from the paper (fallback).",
      visual_metaphor: "a clear diagram with labeled parts",
    });
  }
  return normalized;
}

function fallbackSummary(title: string, abstract: string): Summary {
  const sentences = abstract
    .split(". ")
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  return {
    title,
    one_liner:
      sentences[0] ||
      "A research paper exploring advances in this area.",
    key_concepts: clampConcepts(
      [
        {
          name: "Main Idea",
          explanation: sentences[1] || "The paper proposes a key approach.",
          visual_metaphor: "a blueprint on a table",
        },
        {
          name: "How It Works",
          explanation: sentences[2] || "It explains the mechanism at a high level.",
          visual_metaphor: "gears turning in sync",
        },
        {
          name: "Why It Matters",
          explanation: sentences[3] || "It improves performance or understanding.",
          visual_metaphor: "a graph trending upward",
        },
      ],
      3,
      6
    ),
    key_finding:
      sentences.at(-1) || "The results show meaningful improvements.",
    real_world_impact:
      "This could improve real-world systems and applications.",
  };
}

async function summarizeWithDigitalOcean(
  title: string,
  abstract: string,
  level: KnowledgeLevel
): Promise<Summary> {
  if (!DO_API_KEY) return fallbackSummary(title, abstract);

  const levelHint =
    level === "beginner"
      ? "Use very simple language and analogies."
      : level === "intermediate"
      ? "Use professional language; define terms briefly."
      : "Use technical vocabulary and be precise.";

  const prompt = `Summarize the paper titled "${title}" for a ${level} audience.
${levelHint}

Abstract:
"""
${abstract}
"""

Return ONLY valid JSON with this structure:
{
  "one_liner": string,
  "key_concepts": [{"name": string, "explanation": string, "visual_metaphor": string}],
  "key_finding": string,
  "real_world_impact": string
}

Constraints:
- key_concepts MUST be 3 to 6 items
- visual_metaphor must be concrete and visualizable
JSON:`;

  const resp = await fetch(DO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DO_API_KEY}`,
    },
    body: JSON.stringify({
      model: DO_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert paper summarizer. Return JSON only, no markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.warn("DigitalOcean summarization failed:", resp.status, t);
    return fallbackSummary(title, abstract);
  }

  const data: any = await resp.json();
  const content = String(data?.choices?.[0]?.message?.content || "").trim();
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = (codeBlock ? codeBlock[1] : content).trim();

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return fallbackSummary(title, abstract);
  }

  return {
    title,
    one_liner: String(parsed?.one_liner || "").trim() || fallbackSummary(title, abstract).one_liner,
    key_concepts: clampConcepts(parsed?.key_concepts, 3, 6),
    key_finding: String(parsed?.key_finding || "").trim() || "Key finding (fallback).",
    real_world_impact: String(parsed?.real_world_impact || "").trim() || "Impact (fallback).",
  };
}

async function generatePoster(
  arxivId: string,
  summary: Summary,
  knowledge_level: KnowledgeLevel
) {
  const fiboKey = process.env.FIBO_API_KEY || process.env.BRIA_API_KEY;

  if (!fiboKey) {
    return {
      image_url: `https://placehold.co/1024x1024/059669/white?text=${encodeURIComponent(
        summary.title
      )}`,
    };
  }

  const fibo = createFiboService();
  const orchestrator = createPosterGenerationOrchestrator(fibo);
  const input: GenerationInput = {
    summary,
    knowledge_level,
    tags: ["local-dev"],
    arxiv_id: arxivId,
    options: {
      generation_mode: "single",
    },
  };

  const out = await orchestrator.generate(input);
  if (out.status !== "complete" || !out.final_image_url) {
    throw new Error(out.error || "Poster generation failed");
  }
  return { image_url: out.final_image_url };
}

async function processRequest(reqId: string) {
  const store = await ensureStorageReady();
  const req = await store.getRequest(reqId);
  if (!req) return;

  try {
    await store.updateStatus(reqId, "finding_paper");

    const { query, knowledge_level } = req.input;

    const arxivId = query.includes("arxiv.org") ? extractArxivId(query) : null;
    const paper = arxivId
      ? await fetchArxivById(arxivId)
      : await searchArxivByTopic(query);

    await store.updateStatus(reqId, "summarizing");
    const summary = await summarizeWithDigitalOcean(
      paper.title,
      paper.abstract,
      knowledge_level
    );

    await store.updateStatus(reqId, "generating_image");
    const poster = await generatePoster(paper.arxiv_id, summary, knowledge_level);

    await store.setResult(reqId, {
      paper_title: paper.title,
      paper_url: paper.arxiv_url,
      image_url: poster.image_url,
      summary,
    });
  } catch (e: any) {
    await store.updateStatus(reqId, "failed", e?.message || "Unknown error");
  }
}

Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch: async (request) => {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return json(null, {}, 200);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json(null, { ok: true, service: "local-dev-api" }, 200);
    }

    if (request.method === "POST" && url.pathname === "/api/generate") {
      const store = await ensureStorageReady();
      let payload: any = {};
      try {
        payload = await request.json();
      } catch {
        return json(null, { error: "Invalid JSON" }, 400);
      }

      const query = String(payload?.query || "").trim();
      const knowledge_level = String(payload?.knowledge_level || "").trim() as KnowledgeLevel;

      if (!query) return json(null, { error: "Missing query" }, 400);
      if (!["beginner", "intermediate", "advanced"].includes(knowledge_level)) {
        return json(null, { error: "Invalid knowledge_level" }, 400);
      }

      const request_id = `local_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const stored: StoredRequest = {
        request_id,
        status: "pending",
        message: statusMessage("pending"),
        created_at: now,
        updated_at: now,
        input: { query, knowledge_level },
      };

      await store.saveRequest(stored);
      // Fire and forget
      processRequest(request_id);

      return json(null, {
        request_id,
        status: "pending",
        message: "Your visual explainer is being generated",
      });
    }

    if (request.method === "GET" && url.pathname === "/api/status") {
      const store = await ensureStorageReady();
      const requestId = url.searchParams.get("requestId");
      if (!requestId) return json(null, { error: "Missing requestId" }, 400);

      const stored = await store.getRequest(requestId);
      if (!stored) return json(null, { error: "Request not found", request_id: requestId }, 404);

      const base: any = {
        request_id: stored.request_id,
        status: stored.status,
        message: stored.message,
      };

      if (stored.status === "complete" && stored.result) base.result = stored.result;
      if (stored.status === "failed" && stored.error) base.error = stored.error;

      return json(null, base);
    }

    return json(null, { error: "Not found" }, 404);
  },
});

console.log(
  `[local-dev-api] listening on http://${HOST}:${PORT} (storage=${storage.type}, DO=${
    DO_API_KEY ? "on" : "off"
  }, FIBO=${process.env.FIBO_API_KEY || process.env.BRIA_API_KEY ? "on" : "off"})`
);


