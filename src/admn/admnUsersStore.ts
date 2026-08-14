import { getUsersContainer } from '@/lib/cosmosUsers';
import { isCosmosConfigured } from '@/lib/cosmos';
import { hashPassword, verifyPassword } from './admnAuth';
import {
  computeExpiresAt,
  isAccessExpired,
  normalizeRole,
  normalizeUsername,
  parseAssignableRole,
  parseRole,
  toPublicUser,
  type AdmnRole,
  type AdmnUserPublic,
  type AdmnUserRecord,
} from './admnTypes';

export async function findUserByUsername(
  username: string
): Promise<AdmnUserRecord | null> {
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

/** Persist legacy read/write → viewer/editor when encountered. */
async function persistNormalizedRole(
  user: AdmnUserRecord
): Promise<AdmnUserRecord> {
  const normalized = normalizeRole(user.role);
  if (!normalized || user.role === normalized) return user;
  const next: AdmnUserRecord = {
    ...user,
    role: normalized,
    updatedAt: new Date().toISOString(),
  };
  await getUsersContainer().items.upsert(next);
  return next;
}

export async function getLiveUser(
  username: string
): Promise<AdmnUserPublic | null> {
  const raw = await findUserByUsername(username);
  if (!raw) return null;
  const user = await persistNormalizedRole(raw);
  if (isAccessExpired(user)) return null;
  return toPublicUser(user);
}

export async function createAdmnUser(input: {
  username: string;
  password: string;
  role: AdmnRole | string;
  /** Optional expiry for editor/viewer only. */
  expiresInAmount?: number | null;
  expiresInUnit?: 'hours' | 'days' | null;
  expiresAt?: string | null;
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

  const role = parseAssignableRole(input.role);
  if (!role) {
    throw new Error('Role must be "editor" or "viewer". Use transfer ownership for owner.');
  }

  const existing = await findUserByUsername(username);
  if (existing) throw new Error(`User already exists: ${username}`);

  let expiresAt: string | null = null;
  if (input.expiresAt) {
    const t = Date.parse(input.expiresAt);
    if (Number.isNaN(t)) throw new Error('Invalid expiresAt.');
    expiresAt = new Date(t).toISOString();
  } else if (
    input.expiresInAmount != null &&
    input.expiresInAmount !== undefined &&
    input.expiresInUnit
  ) {
    expiresAt = computeExpiresAt(
      Number(input.expiresInAmount),
      input.expiresInUnit
    );
  }

  const now = new Date().toISOString();
  const doc: AdmnUserRecord = {
    id: username,
    username,
    role,
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };
  await getUsersContainer().items.create(doc);
  return toPublicUser(doc);
}

export async function authenticateAdmnUser(
  username: string,
  password: string
): Promise<AdmnUserPublic | null> {
  const raw = await findUserByUsername(username);
  if (!raw) return null;
  const user = await persistNormalizedRole(raw);
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  if (isAccessExpired(user)) {
    throw new Error('Access expired. Ask the owner to renew or recreate your account.');
  }
  return toPublicUser(user);
}

export async function listAdmnUsers(): Promise<AdmnUserPublic[]> {
  const { resources } = await getUsersContainer().items
    .query<AdmnUserRecord>({
      query: 'SELECT c.id, c.username, c.role, c.expiresAt, c.createdAt, c.updatedAt, c.passwordHash FROM c',
    })
    .fetchAll();
  const out: AdmnUserPublic[] = [];
  for (const r of resources || []) {
    const user = await persistNormalizedRole(r);
    out.push(toPublicUser(user));
  }
  out.sort((a, b) => {
    const order = { owner: 0, editor: 1, viewer: 2 } as const;
    const d = order[a.role] - order[b.role];
    if (d !== 0) return d;
    return a.username.localeCompare(b.username);
  });
  return out;
}

export async function updateAdmnUser(input: {
  username: string;
  role?: AdmnRole | string;
  /** Set null to clear expiry; omit to leave unchanged. */
  expiresAt?: string | null;
  expiresInAmount?: number | null;
  expiresInUnit?: 'hours' | 'days' | null;
  clearExpiry?: boolean;
}): Promise<AdmnUserPublic> {
  const user = await findUserByUsername(input.username);
  if (!user) throw new Error('User not found');
  const currentRole = normalizeRole(user.role) || 'viewer';
  if (currentRole === 'owner') {
    throw new Error('Change the owner via Transfer ownership, not role update.');
  }

  let nextRole = currentRole;
  if (input.role !== undefined) {
    const assigned = parseAssignableRole(input.role);
    if (!assigned) throw new Error('Role must be "editor" or "viewer".');
    nextRole = assigned;
  }

  let expiresAt = user.expiresAt ?? null;
  if (input.clearExpiry) {
    expiresAt = null;
  } else if (input.expiresAt !== undefined) {
    if (input.expiresAt === null || input.expiresAt === '') {
      expiresAt = null;
    } else {
      const t = Date.parse(input.expiresAt);
      if (Number.isNaN(t)) throw new Error('Invalid expiresAt.');
      expiresAt = new Date(t).toISOString();
    }
  } else if (
    input.expiresInAmount != null &&
    input.expiresInUnit
  ) {
    expiresAt = computeExpiresAt(
      Number(input.expiresInAmount),
      input.expiresInUnit
    );
  }

  const next: AdmnUserRecord = {
    ...user,
    role: nextRole,
    expiresAt,
    updatedAt: new Date().toISOString(),
  };
  await getUsersContainer().items.upsert(next);
  return toPublicUser(next);
}

export async function transferOwnership(input: {
  currentOwnerUsername: string;
  newOwnerUsername: string;
}): Promise<{ previousOwner: AdmnUserPublic; newOwner: AdmnUserPublic }> {
  const currentName = normalizeUsername(input.currentOwnerUsername);
  const newName = normalizeUsername(input.newOwnerUsername);
  if (!newName) throw new Error('New owner username required.');
  if (currentName === newName) throw new Error('Already the owner.');

  const current = await findUserByUsername(currentName);
  const nextOwner = await findUserByUsername(newName);
  if (!current) throw new Error('Current owner record not found.');
  if (normalizeRole(current.role) !== 'owner') {
    throw new Error('Only the current owner can transfer ownership.');
  }
  if (!nextOwner) throw new Error('Target user not found. Create their account first.');
  if (isAccessExpired(nextOwner)) {
    throw new Error('Target user access has expired. Renew expiry first.');
  }

  const now = new Date().toISOString();
  const demoted: AdmnUserRecord = {
    ...current,
    role: 'editor',
    expiresAt: null,
    updatedAt: now,
  };
  const promoted: AdmnUserRecord = {
    ...nextOwner,
    role: 'owner',
    expiresAt: null,
    updatedAt: now,
  };
  await getUsersContainer().items.upsert(demoted);
  await getUsersContainer().items.upsert(promoted);
  return {
    previousOwner: toPublicUser(demoted),
    newOwner: toPublicUser(promoted),
  };
}

export async function deleteAdmnUser(input: {
  username: string;
  actorUsername: string;
  actorRole: AdmnRole;
}): Promise<void> {
  const targetName = normalizeUsername(input.username);
  const actorName = normalizeUsername(input.actorUsername);
  if (!targetName) throw new Error('Username required.');

  const target = await findUserByUsername(targetName);
  if (!target) throw new Error('User not found');
  const targetRole = normalizeRole(target.role) || 'viewer';

  const isSelf = targetName === actorName;
  if (input.actorRole === 'owner') {
    if (targetRole === 'owner' && isSelf) {
      throw new Error('Owner cannot delete themselves. Transfer ownership first.');
    }
    if (targetRole === 'owner' && !isSelf) {
      throw new Error('Cannot delete the owner account.');
    }
  } else {
    if (!isSelf) {
      throw new Error('Only the owner can delete other accounts.');
    }
    if (targetRole === 'owner') {
      throw new Error('Owner cannot delete their own account.');
    }
  }

  await getUsersContainer().item(targetName, targetName).delete();
}

/** Promote sandip (or given user) to the sole owner; map legacy roles. */
export async function ensureSoleOwner(
  preferredOwnerUsername = 'sandip'
): Promise<AdmnUserPublic | null> {
  if (!isCosmosConfigured()) return null;
  const { resources } = await getUsersContainer().items
    .query<AdmnUserRecord>({ query: 'SELECT * FROM c' })
    .fetchAll();
  const users = resources || [];
  if (!users.length) return null;

  const preferred = normalizeUsername(preferredOwnerUsername);
  let ownerDoc =
    users.find((u) => normalizeRole(u.role) === 'owner') ||
    users.find((u) => normalizeUsername(u.username) === preferred) ||
    users.find((u) => normalizeRole(u.role) === 'editor') ||
    users[0];

  const now = new Date().toISOString();
  for (const u of users) {
    const name = normalizeUsername(u.username);
    const wantOwner = name === normalizeUsername(ownerDoc.username);
    const nextRole: AdmnRole = wantOwner
      ? 'owner'
      : normalizeRole(u.role) === 'owner'
        ? 'editor'
        : normalizeRole(u.role) || 'viewer';
    const next: AdmnUserRecord = {
      ...u,
      role: nextRole,
      expiresAt: nextRole === 'owner' ? null : u.expiresAt ?? null,
      updatedAt: now,
    };
    if (
      u.role !== next.role ||
      (nextRole === 'owner' && u.expiresAt) ||
      normalizeRole(u.role) !== nextRole
    ) {
      await getUsersContainer().items.upsert(next);
    }
    if (wantOwner) ownerDoc = next;
  }
  return toPublicUser(ownerDoc);
}

export { parseRole };
