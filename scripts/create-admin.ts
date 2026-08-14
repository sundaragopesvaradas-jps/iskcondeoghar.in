/**
 * Create an /admn user in Cosmos.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts --username sandip --password 'YourPass123' --role write
 *   npx tsx scripts/create-admin.ts --username viewer --password 'YourPass123' --role read
 *
 * Roles:
 *   read  — view tables/tabs/rows only
 *   write — view + edit rows, create tables/tabs, create other admins
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

function arg(name: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return '';
  return String(process.argv[idx + 1] || '').trim();
}

async function main() {
  loadEnvLocal();
  const username = arg('username');
  const password = arg('password');
  const role = arg('role') || 'write';
  if (!username || !password) {
    console.error(
      'Usage: npx tsx scripts/create-admin.ts --username USER --password PASS --role read|write'
    );
    process.exit(1);
  }
  const { createAdmnUser } = await import('../src/admn/admnUsersStore');
  const user = await createAdmnUser({
    username,
    password,
    role: role as 'read' | 'write',
  });
  console.log('Created admin:', user);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
