/**
 * One-time / safe-to-rerun: map legacy read/write → viewer/editor and
 * ensure a single owner (prefers username "sandip").
 *
 *   npx tsx scripts/migrate-admn-roles.ts
 *   npx tsx scripts/migrate-admn-roles.ts --owner sandip
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
  const preferred = arg('owner') || 'sandip';
  const { ensureSoleOwner, listAdmnUsers } = await import('../src/admn/admnUsersStore');
  const owner = await ensureSoleOwner(preferred);
  const users = await listAdmnUsers();
  console.log('Owner:', owner);
  console.log('Users:');
  for (const u of users) {
    console.log(`  - ${u.username} · ${u.role}${u.expiresAt ? ` · expires ${u.expiresAt}` : ''}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
