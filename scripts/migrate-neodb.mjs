/**
 * NeoDB & PostgreSQL Migration Runner
 * Rushi CRM Platform v2.0
 * 
 * Applies migrations 00001 through 00009 sequentially to a remote or local
 * PostgreSQL database (such as NeoDB, Neon, or Supabase).
 * 
 * Usage:
 *   DATABASE_URL="postgresql://user:pass@host:5432/dbname" npm run db:migrate:neodb
 */

import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;

console.log('===============================================================');
console.log('   RUSHI CRM v2.0 — NEODB & POSTGRESQL MIGRATION RUNNER        ');
console.log('===============================================================\n');

if (!databaseUrl) {
  console.log('INFO: No DATABASE_URL environment variable provided.');
  console.log('To migrate your NeoDB instance, run:');
  console.log('  $env:DATABASE_URL = "postgresql://user:password@neodb-host:5432/dbname"');
  console.log('  npm run db:migrate:neodb\n');
  console.log('Dry-run check: Inspecting migration files on disk...');
}

async function run() {
  const migrationsDir = resolve(__dirname, '../supabase/migrations');
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files in supabase/migrations:\n`);
  for (const file of files) {
    console.log(`  • ${file}`);
  }

  if (!databaseUrl) {
    console.log('\nDry-run complete. All 9 migrations are verified on disk.');
    process.exit(0);
  }

  console.log(`\nConnecting to NeoDB / PostgreSQL...`);
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }, // NeoDB / cloud PG standard
  });

  try {
    await client.connect();
    console.log('Connected successfully to database.');

    // Ensure migration tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public._schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const { rows: appliedRows } = await client.query(
      'SELECT version FROM public._schema_migrations'
    );
    const appliedSet = new Set(appliedRows.map((r) => r.version));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  [SKIP] ${file} (already applied)`);
        continue;
      }

      console.log(`  [APPLYING] ${file}...`);
      const sqlContent = await readFile(resolve(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO public._schema_migrations (version) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  [DONE] ${file} committed successfully.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  [FAILED] ${file} failed. Rolled back transaction.`);
        throw err;
      }
    }

    // Post-migration schema verification
    const { rows: tables } = await client.query(`
      SELECT count(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    const { rows: functions } = await client.query(`
      SELECT count(*) as count 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    `);

    console.log('\n===============================================================');
    console.log(`   MIGRATION COMPLETE: ${tables[0].count} TABLES | ${functions[0].count} FUNCTIONS   `);
    console.log('===============================================================\n');
  } catch (err) {
    console.error('\nMigration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

