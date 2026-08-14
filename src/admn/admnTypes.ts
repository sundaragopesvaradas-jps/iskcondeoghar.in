export type AdmnRole = 'owner' | 'editor' | 'viewer';

/** Legacy roles stored before owner/editor/viewer. */
export type AdmnLegacyRole = 'read' | 'write';

export type AdmnUserPublic = {
  username: string;
  role: AdmnRole;
  /** ISO timestamp; omitted/null means no expiry (owners never expire). */
  expiresAt?: string | null;
};

export type AdmnUserRecord = {
  id: string;
  username: string;
  role: AdmnRole | AdmnLegacyRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
};

export function normalizeUsername(username: string): string {
  return String(username || '')
    .trim()
    .toLowerCase();
}

/** Map legacy + current role strings to AdmnRole. */
export function normalizeRole(role: unknown): AdmnRole | null {
  const r = String(role || '')
    .trim()
    .toLowerCase();
  if (r === 'owner') return 'owner';
  if (r === 'editor' || r === 'write') return 'editor';
  if (r === 'viewer' || r === 'read') return 'viewer';
  return null;
}

export function parseRole(role: unknown): AdmnRole | null {
  return normalizeRole(role);
}

/** Roles that may be assigned when creating/updating (not via transfer). */
export function parseAssignableRole(role: unknown): 'editor' | 'viewer' | null {
  const r = normalizeRole(role);
  if (r === 'editor' || r === 'viewer') return r;
  return null;
}

export function canWrite(role: AdmnRole): boolean {
  return role === 'owner' || role === 'editor';
}

export function isOwner(role: AdmnRole): boolean {
  return role === 'owner';
}

export function roleLabel(role: AdmnRole): string {
  if (role === 'owner') return 'Owner';
  if (role === 'editor') return 'Editor';
  return 'Viewer';
}

export function toPublicUser(record: AdmnUserRecord): AdmnUserPublic {
  const role = normalizeRole(record.role) || 'viewer';
  return {
    username: record.username,
    role,
    expiresAt: role === 'owner' ? null : record.expiresAt ?? null,
  };
}

export function isAccessExpired(user: {
  role: AdmnRole | AdmnLegacyRole;
  expiresAt?: string | null;
}): boolean {
  const role = normalizeRole(user.role);
  if (role === 'owner') return false;
  const exp = user.expiresAt;
  if (!exp) return false;
  const t = Date.parse(exp);
  if (Number.isNaN(t)) return false;
  return Date.now() >= t;
}

export function computeExpiresAt(
  amount: number,
  unit: 'hours' | 'days'
): string {
  const n = Math.floor(amount);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error('Expiry amount must be a positive integer.');
  }
  if (unit !== 'hours' && unit !== 'days') {
    throw new Error('Expiry unit must be hours or days.');
  }
  const ms = unit === 'hours' ? n * 60 * 60 * 1000 : n * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}
