#!/usr/bin/env node

const { Client } = require("pg");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[dev-preflight] DATABASE_URL is not set. Skipping DB check.");
    return;
  }

  const client = new Client({
    connectionString: dbUrl,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    console.log("[dev-preflight] Database connection OK");
  } catch (error) {
    const code = error && error.code ? error.code : "UNKNOWN";
    if (code === "28P01") {
      console.error("[dev-preflight] Database auth failed (28P01).");
      console.error("[dev-preflight] Check DATABASE_URL, POSTGRES_USER, and POSTGRES_PASSWORD.");
    } else {
      console.error(`[dev-preflight] Database check failed (${code}): ${error.message}`);
    }
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (_) {
      // Ignore client shutdown errors.
    }
  }
}

main().catch((error) => {
  console.error(`[dev-preflight] Unexpected error: ${error.message}`);
  process.exit(1);
});
