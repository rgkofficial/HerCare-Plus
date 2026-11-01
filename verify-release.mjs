import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'README.md',
  'DEPLOYMENT.md',
  'OPERATIONS.md',
  'DISASTER_RECOVERY.md',
  '.github/workflows/ci.yml',
  'supabase/migrations',
];
const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));
if (missing.length) throw new Error(`Missing release artifacts: ${missing.join(', ')}`);

const migrations = readdirSync(join(root, 'supabase/migrations')).filter((file) => file.endsWith('.sql')).sort();
if (!migrations.length) throw new Error('No database migrations found');
for (const migration of migrations) {
  const sql = readFileSync(join(root, 'supabase/migrations', migration), 'utf8');
  if (!/create table/i.test(sql)) throw new Error(`Migration has no CREATE TABLE statement: ${migration}`);
}
console.log(`Release artifact validation passed (${migrations.length} migrations).`);
