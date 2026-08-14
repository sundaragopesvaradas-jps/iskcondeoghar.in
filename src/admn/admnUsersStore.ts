import { getUsersContainer } from '@/lib/cosmosUsers';
import { isCosmosConfigured } from '@/lib/cosmos';
import { hashPassword, verifyPassword } from './admnAuth';
import {
  normalizeUsername,
  parseRole,
  type AdmnRole,
  type AdmnUserPublic,
  type AdmnUserRecord,
} from './admnTypes';

export async function findUserByUsername(username: string): Promise<AdmnUserRecord | null> {
  if (!isCosmosConfigured()) return null;
  const id = normalizeUsername(username);
  if (!id) return null;
  try {
    const { resource } = await getUsersContainer().item(id, id).read<AdmnUserRecord>();
    return resource || null;
  } catch {
    return null;
  }
}

export async function createAdmnUser(input: {
  username: string;
  password: string;
  role: AdmnRole;
}): Promise<AdmnUserPublic> {
  if (!isCosmosConfigured()) {
    throw new Error('Cosmos DB is not configured.');
  }
  const username = normalizeUsername(input.username);
  if (!username || username.length < 3) {
    throw new Error('Username must be at least 3 characters.');
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw new Error('Username may only contain letters, numbers, ".", "_" or "-".');
  }
  if (!input.password || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  const role = parseRole(input.role);
  if (!role) throw new Error('Role must be "read" or "write".');

  const existing = await findUserByUsername(username);
  if (existing) throw new Error(`User already exists: ${username}`);

  const now = new Date().toISOString();
  const doc: AdmnUserRecord = {
    id: username,
    username,
    role,
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };
  await getUsersContainer().items.create(doc);
  return { username, role };
}

export async function authenticateAdmnUser(
  username: string,
  password: string
): Promise<AdmnUserPublic | null> {
  const user = await findUserByUsername(username);
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return { username: user.username, role: user.role };
}

export async function listAdmnUsers(): Promise<AdmnUserPublic[]> {
  const { resources } = await getUsersContainer().items
    .query<AdmnUserRecord>({ query: 'SELECT c.username, c.role FROM c' })
    .fetchAll();
  return (resources || []).map((u) => ({
    username: u.username,
    role: u.role,
  }));
}

export async function updateAdmnUserRole(
  username: string,
  role: AdmnRole
): Promise<AdmnUserPublic> {
  const user = await findUserByUsername(username);
  if (!user) throw new Error('User not found');
  const next = {
    ...user,
    role,
    updatedAt: new Date().toISOString(),
  };
  await getUsersContainer().items.upsert(next);
  return { username: next.username, role: next.role };
}
