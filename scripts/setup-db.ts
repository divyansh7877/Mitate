import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is required to run setup-db");
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL, {
    ssl: "require",
    max: 1,
    idle_timeout: 20,
  });

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

  console.log("Database schema ready");

  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error("setup-db failed:", err);
  process.exit(1);
});
