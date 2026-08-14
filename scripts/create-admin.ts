/**
 * Create an /admn user in Cosmos.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts --username sandip --password 'YourPass123' --role owner
 *   npx tsx scripts/create-admin.ts --username editor1 --password 'YourPass123' --role editor
 *   npx tsx scripts/create-admin.ts --username viewer --password 'YourPass123' --role viewer --expires-days 30
 *
 * Roles:
 *   owner  — sole account manager (prefer migrate-admn-roles / transfer; only one)
 *   editor — view + edit data (former write)
 *   viewer — view only (former read)
 *
 * Optional expiry (editor/viewer only):
 *   --expires-hours N
 *   --expires-days N
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
  const roleRaw = (arg('role') || 'editor').toLowerCase();
  const expiresHours = arg('expires-hours');
  const expiresDays = arg('expires-days');
  if (!username || !password) {
    console.error(
      'Usage: npx tsx scripts/create-admin.ts --username USER --password PASS --role owner|editor|viewer [--expires-hours N|--expires-days N]'
    );
    process.exit(1);
  }

  const { getUsersContainer } = await import('../src/lib/cosmosUsers');
  const { hashPassword } = await import('../src/admn/admnAuth');
  const {
    ensureSoleOwner,
    createAdmnUser,
    findUserByUsername,
  } = await import('../src/admn/admnUsersStore');
  const { normalizeUsername, normalizeRole } = await import('../src/admn/admnTypes');

  if (roleRaw === 'owner') {
    const existing = await findUserByUsername(username);
    if (existing) {
      const { ensureSoleOwner: promote } = await import('../src/admn/admnUsersStore');
      const owner = await promote(normalizeUsername(username));
      console.log('Promoted to sole owner:', owner);
      return;
    }
    const now = new Date().toISOString();
    const id = normalizeUsername(username);
    await getUsersContainer().items.create({
      id,
      username: id,
      role: 'owner',
      passwordHash: await hashPassword(password),
      createdAt: now,
      updatedAt: now,
      expiresAt: null,
    });
    await ensureSoleOwner(id);
    console.log('Created owner:', { username: id, role: 'owner' });
    return;
  }

  const role = normalizeRole(roleRaw);
  if (role !== 'editor' && role !== 'viewer') {
    console.error('Role must be owner, editor, or viewer');
    process.exit(1);
  }

  let expiresInAmount: number | null = null;
  let expiresInUnit: 'hours' | 'days' | null = null;
  if (expiresHours) {
    expiresInAmount = parseInt(expiresHours, 10);
    expiresInUnit = 'hours';
  } else if (expiresDays) {
    expiresInAmount = parseInt(expiresDays, 10);
    expiresInUnit = 'days';
  }

  const user = await createAdmnUser({
    username,
    password,
    role,
    expiresInAmount,
    expiresInUnit,
  });
  console.log('Created admin:', user);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
