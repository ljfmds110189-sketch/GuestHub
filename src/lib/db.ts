import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { assertEnv, env } from "@/lib/env";

declare global {
  var __guesthubPool__: Pool | undefined;
}

function getPool() {
  if (global.__guesthubPool__) {
    return global.__guesthubPool__;
  }

  assertEnv();

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 15,
    idleTimeoutMillis: 30_000,
  });

  global.__guesthubPool__ = pool;
  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return getPool().query<T>(text, values);
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
