#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/guesthub';
const INIT_DIR = path.join(process.cwd(), 'db', 'init');
const DB_ROOT_DIR = path.join(process.cwd(), 'db');
const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');
const READY_FILE = process.env.DB_BOOTSTRAP_READY_FILE || path.join(process.cwd(), 'data', 'db-bootstrap.ready');

const RETRY_ATTEMPTS = Number.parseInt(process.env.DB_BOOTSTRAP_RETRIES || '20', 10);
const RETRY_DELAY_MS = Number.parseInt(process.env.DB_BOOTSTRAP_RETRY_DELAY_MS || '3000', 10);
const DISABLED = ['1', 'true', 'yes', 'on'].includes((process.env.DB_BOOTSTRAP_DISABLED || '').toLowerCase());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maskDbUrl(url) {
  return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
}

function getConfigFromUrl(url) {
  const parsed = new URL(url);
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '') || 'postgres'),
  };
}

function quoteIdentifier(name) {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return name;
  return `"${name.replace(/"/g, '""')}"`;
}

function getSortedSqlFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => {
      const numA = Number.parseInt((a.match(/^(\d+)/) || ['999999'])[0], 10);
      const numB = Number.parseInt((b.match(/^(\d+)/) || ['999999'])[0], 10);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
}

async function writeReadyFile() {
  const dir = path.dirname(READY_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    READY_FILE,
    JSON.stringify({
      ready: true,
      timestamp: new Date().toISOString(),
    }, null, 2)
  );
}

function clearReadyFile() {
  try {
    if (fs.existsSync(READY_FILE)) {
      fs.unlinkSync(READY_FILE);
    }
  } catch {
    // ignore stale marker cleanup errors
  }
}

async function withRetry(task, name) {
  let lastError;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      console.log(`[DB Bootstrap] ${name} failed (attempt ${attempt}/${RETRY_ATTEMPTS}): ${error.message}`);
      if (attempt < RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
}

async function createDatabaseIfNeeded(config) {
  const adminClient = new Client({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    database: 'postgres',
  });

  await adminClient.connect();
  try {
    const exists = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [config.database]);
    if (exists.rowCount === 0) {
      console.log(`[DB Bootstrap] Creating database: ${config.database}`);
      await adminClient.query(`CREATE DATABASE ${quoteIdentifier(config.database)}`);
      console.log('[DB Bootstrap] Database created');
    } else {
      console.log('[DB Bootstrap] Database already exists');
    }
  } finally {
    await adminClient.end();
  }
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

async function getTrackedScripts(client) {
  const result = await client.query('SELECT name FROM _migrations');
  return new Set(result.rows.map((row) => row.name));
}

async function markScriptTracked(client, name) {
  await client.query(
    'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
    [name]
  );
}

async function runInitScripts(client) {
  const initFiles = getSortedSqlFiles(INIT_DIR);
  const rootFiles = getSortedSqlFiles(DB_ROOT_DIR);

  let files = initFiles;
  let sourceDir = INIT_DIR;
  let trackPrefix = 'init/';

  if (files.length === 0 && rootFiles.length > 0) {
    files = rootFiles;
    sourceDir = DB_ROOT_DIR;
    trackPrefix = 'db/';
    console.log('[DB Bootstrap] db/init is empty; using db/*.sql files for initialization');
  }

  if (files.length === 0) {
    console.log('[DB Bootstrap] No init scripts found');
    return;
  }

  await ensureMigrationsTable(client);
  const tracked = await getTrackedScripts(client);

  console.log(`[DB Bootstrap] Running ${files.length} init scripts...`);

  const ignorableCodes = new Set([
    '42P07',
    '42710',
    '23505',
    '42701',
    '42P16',
  ]);

  for (const file of files) {
    const trackName = `${trackPrefix}${file}`;
    if (tracked.has(trackName)) {
      console.log(`[DB Bootstrap]   ↷ ${file} (already tracked)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(sourceDir, file), 'utf8');
    try {
      await client.query(sql);
      await markScriptTracked(client, trackName);
      console.log(`[DB Bootstrap]   ✓ ${file}`);
    } catch (error) {
      if (ignorableCodes.has(error.code)) {
        await markScriptTracked(client, trackName);
        console.log(`[DB Bootstrap]   ↷ ${file} (already applied: ${error.code})`);
      } else {
        throw new Error(`Init script failed (${file}): ${error.message}`);
      }
    }
  }
}

async function runMigrations(client) {
  const files = getSortedSqlFiles(MIGRATIONS_DIR);
  if (files.length === 0) {
    console.log('[DB Bootstrap] No migrations found');
    return;
  }

  await ensureMigrationsTable(client);
  const tracked = await getTrackedScripts(client);

  console.log(`[DB Bootstrap] Checking ${files.length} migrations...`);

  for (const file of files) {
    if (tracked.has(file)) {
      console.log(`[DB Bootstrap]   ↷ ${file} (already tracked)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    try {
      await client.query(sql);
      await markScriptTracked(client, file);
      console.log(`[DB Bootstrap]   ✓ ${file}`);
    } catch (error) {
      throw new Error(`Migration failed (${file}): ${error.message}`);
    }
  }
}

async function main() {
  clearReadyFile();

  if (DISABLED) {
    console.log('[DB Bootstrap] Skipped (DB_BOOTSTRAP_DISABLED=true)');
    await writeReadyFile();
    return;
  }

  console.log(`[DB Bootstrap] Starting with DATABASE_URL=${maskDbUrl(DATABASE_URL)}`);

  const config = getConfigFromUrl(DATABASE_URL);

  await withRetry(() => createDatabaseIfNeeded(config), 'createDatabaseIfNeeded');

  await withRetry(async () => {
    const client = new Client({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      database: config.database,
    });

    await client.connect();
    try {
      await runInitScripts(client);
      await runMigrations(client);
    } finally {
      await client.end();
    }
  }, 'applyInitAndMigrations');

  await writeReadyFile();

  console.log('[DB Bootstrap] Complete');
}

main().catch((error) => {
  console.error('[DB Bootstrap] Failed:', error.message);
  process.exit(1);
});
