export type AdmnRole = 'read' | 'write';

export type AdmnUserPublic = {
  username: string;
  role: AdmnRole;
};

export type AdmnUserRecord = AdmnUserPublic & {
  id: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export function normalizeUsername(username: string): string {
  return String(username || '')
    .trim()
    .toLowerCase();
}

export function parseRole(role: unknown): AdmnRole | null {
  const r = String(role || '')
    .trim()
    .toLowerCase();
  if (r === 'read' || r === 'write') return r;
  return null;
}

export function canWrite(role: AdmnRole): boolean {
  return role === 'write';
}
