/**
 * Local Dev API Server (NO Appwrite, NO DB)
 *
 * Exposes a minimal API compatible with the frontend:
 * - POST /api/generate { query, knowledge_level } -> { request_id, status, message }
 * - GET  /api/status?requestId=... -> { request_id, status, message, result?, error? }
 *
 * Stores request state in-memory only.
 *
 * Run:
 *   bun run src/local/devApiServer.ts
 */

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

const requests = new Map<string, StoredRequest>();

const PORT = Number(process.env.LOCAL_API_PORT || 8787);
const HOST = process.env.LOCAL_API_HOST || "127.0.0.1";

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
      "Access-Control-Allow-Origin": "*",
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

function setStatus(reqId: string, status: RequestStatus, error?: string) {
  const existing = requests.get(reqId);
  if (!existing) return;
  existing.status = status;
  existing.message = statusMessage(status);
  existing.updated_at = new Date().toISOString();
  if (error) existing.error = error;
  requests.set(reqId, existing);
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
  const req = requests.get(reqId);
  if (!req) return;

  try {
    setStatus(reqId, "finding_paper");

    const { query, knowledge_level } = req.input;

    const arxivId = query.includes("arxiv.org") ? extractArxivId(query) : null;
    const paper = arxivId
      ? await fetchArxivById(arxivId)
      : await searchArxivByTopic(query);

    setStatus(reqId, "summarizing");
    const summary = await summarizeWithDigitalOcean(
      paper.title,
      paper.abstract,
      knowledge_level
    );

    setStatus(reqId, "generating_image");
    const poster = await generatePoster(paper.arxiv_id, summary, knowledge_level);

    const updated = requests.get(reqId);
    if (!updated) return;
    updated.status = "complete";
    updated.message = statusMessage("complete");
    updated.updated_at = new Date().toISOString();
    updated.result = {
      paper_title: paper.title,
      paper_url: paper.arxiv_url,
      image_url: poster.image_url,
      summary,
    };
    requests.set(reqId, updated);
  } catch (e: any) {
    setStatus(reqId, "failed", e?.message || "Unknown error");
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

      requests.set(request_id, stored);
      // Fire and forget
      processRequest(request_id);

      return json(null, {
        request_id,
        status: "pending",
        message: "Your visual explainer is being generated",
      });
    }

    if (request.method === "GET" && url.pathname === "/api/status") {
      const requestId = url.searchParams.get("requestId");
      if (!requestId) return json(null, { error: "Missing requestId" }, 400);

      const stored = requests.get(requestId);
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
  `[local-dev-api] listening on http://${HOST}:${PORT} (DO=${DO_API_KEY ? "on" : "off"}, FIBO=${process.env.FIBO_API_KEY || process.env.BRIA_API_KEY ? "on" : "off"})`
);


