#!/usr/bin/env npx tsx
/**
 * Database Setup Script
 * 
 * این اسکریپت برای راه‌اندازی اولیه دیتابیس استفاده می‌شود:
 * 1. ایجاد دیتابیس (اگر وجود ندارد)
 * 2. اجرای فایل‌های init به ترتیب
 * 3. اجرای مایگریشن‌ها
 * 
 * Usage: pnpm db:setup
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/guesthub';
const IGNORED_SQL_ERROR_CODES = new Set(['42P07', '42710', '23505']);

// Parse database URL
function parseDbUrl(url: string) {
  const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  if (!match) throw new Error('Invalid DATABASE_URL format');
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

async function createDatabaseIfNotExists() {
  const config = parseDbUrl(DATABASE_URL);
  
  // Connect to default postgres database first
  const client = new Client({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL server');

    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [config.database]
    );

    if (result.rows.length === 0) {
      console.log(`📦 Creating database: ${config.database}`);
      await client.query(`CREATE DATABASE "${config.database}"`);
      console.log(`✅ Database "${config.database}" created`);
    } else {
      console.log(`✅ Database "${config.database}" already exists`);
    }
  } finally {
    await client.end();
  }
}

function getSortedSqlFiles(directory: string): string[] {
  return fs.readdirSync(directory)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => {
      // Sort by numeric prefix if exists, otherwise alphabetically
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999');
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999');
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
}

async function runSqlFiles(
  directory: string,
  description: string,
  options?: { trackPrefix?: string }
) {
  const config = parseDbUrl(DATABASE_URL);
  
  const client = new Client({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    database: config.database,
  });

  try {
    await client.connect();
    console.log(`\n📂 Running ${description}...`);

    const files = getSortedSqlFiles(directory);
    const trackPrefix = options?.trackPrefix || null;
    const trackedScripts = new Set<string>();

    if (trackPrefix) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP DEFAULT NOW()
        )
      `);
      const trackedResult = await client.query('SELECT name FROM _migrations');
      for (const row of trackedResult.rows) {
        trackedScripts.add(String(row.name));
      }
    }

    for (const file of files) {
      const trackName = trackPrefix ? `${trackPrefix}${file}` : file;
      if (trackPrefix && trackedScripts.has(trackName)) {
        console.log(`  ⏭️  ${file} (already tracked)`);
        continue;
      }

      const filePath = path.join(directory, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query(sql);
        if (trackPrefix) {
          await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [trackName]);
          trackedScripts.add(trackName);
        }
        console.log(`  ✅ ${file}`);
      } catch (error: any) {
        // Ignore "already exists" errors for idempotent scripts
        if (IGNORED_SQL_ERROR_CODES.has(String(error.code))) {
          if (trackPrefix) {
            await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [trackName]);
            trackedScripts.add(trackName);
          }
          console.log(`  ⏭️  ${file} (already applied)`);
        } else {
          console.error(`  ❌ ${file}: ${error.message}`);
          throw error;
        }
      }
    }
  } finally {
    await client.end();
  }
}

async function createMigrationsTable() {
  const config = parseDbUrl(DATABASE_URL);
  
  const client = new Client({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    database: config.database,
  });

  try {
    await client.connect();
    
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } finally {
    await client.end();
  }
}

async function runMigrations(directory: string) {
  const config = parseDbUrl(DATABASE_URL);
  
  const client = new Client({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    database: config.database,
  });

  try {
    await client.connect();
    console.log(`\n📂 Running migrations...`);

    // Get already applied migrations
    const applied = await client.query('SELECT name FROM _migrations');
    const appliedSet = new Set(applied.rows.map(r => r.name));

    const files = getSortedSqlFiles(directory);

    let migrationsRun = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  ⏭️  ${file} (already applied)`);
        continue;
      }

      const filePath = path.join(directory, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✅ ${file}`);
        migrationsRun++;
      } catch (error: any) {
        await client.query('ROLLBACK');
        // Handle partially-applied/idempotent migrations gracefully
        if (error.code === '42P07' || // relation already exists
            error.code === '42710' || // object already exists
            error.code === '23505' || // unique violation (for seeds)
            error.code === '42P13' || // invalid function definition (common on rerun with defaults)
            String(error.message || '').includes('cannot remove parameter defaults from existing function')) {
          await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [file]);
          console.log(`  ⏭️  ${file} (already applied)`);
          continue;
        }
        console.error(`  ❌ ${file}: ${error.message}`);
        throw error;
      }
    }

    if (migrationsRun === 0) {
      console.log('  ℹ️  No new migrations to apply');
    } else {
      console.log(`  ✅ Applied ${migrationsRun} migration(s)`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 GuestHub Database Setup\n');
  console.log(`📍 Database URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  
  const rootDir = path.resolve(__dirname, '..');
  const initDir = path.join(rootDir, 'db', 'init');
  const migrationsDir = path.join(rootDir, 'db', 'migrations');

  try {
    // Step 1: Create database if not exists
    await createDatabaseIfNotExists();

    // Step 2: Ensure migrations tracking table exists
    await createMigrationsTable();

    // Step 3: Run init scripts once (tracked as init/<filename>)
    if (fs.existsSync(initDir)) {
      await runSqlFiles(initDir, 'initialization scripts', { trackPrefix: 'init/' });
    }

    // Step 4: Run migrations
    if (fs.existsSync(migrationsDir)) {
      await runMigrations(migrationsDir);
    }

    console.log('\n✅ Database setup complete!');
  } catch (error: any) {
    console.error('\n❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

main();
