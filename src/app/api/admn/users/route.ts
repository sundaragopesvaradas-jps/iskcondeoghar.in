import { NextRequest, NextResponse } from 'next/server';
import { requireAdmnOwner, requireAdmnSession } from '@/admn/admnApiGuard';
import {
  createAdmnUser,
  deleteAdmnUser,
  ensureSoleOwner,
  listAdmnUsers,
  transferOwnership,
  updateAdmnUser,
} from '@/admn/admnUsersStore';
import { isOwner, normalizeUsername, parseAssignableRole } from '@/admn/admnTypes';

export const runtime = 'nodejs';

/** List users — owner only. Also ensures a sole owner exists (promotes sandip if needed). */
export async function GET() {
  const auth = await requireAdmnOwner();
  if ('error' in auth) return auth.error;
  try {
    await ensureSoleOwner('sandip');
    const users = await listAdmnUsers();
    return NextResponse.json({ status: 'success', users });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/** Create editor/viewer — owner only. Optional expiry in hours or days. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmnOwner();
  if ('error' in auth) return auth.error;
  try {
    const body = (await req.json()) as {
      username?: string;
      password?: string;
      role?: string;
      expiresInAmount?: number | null;
      expiresInUnit?: 'hours' | 'days' | null;
    };
    const role = parseAssignableRole(body.role);
    if (!role) {
      return NextResponse.json(
        { status: 'error', message: 'role must be editor or viewer', code: 'INVALID' },
        { status: 400 }
      );
    }
    const user = await createAdmnUser({
      username: String(body.username || ''),
      password: String(body.password || ''),
      role,
      expiresInAmount: body.expiresInAmount ?? null,
      expiresInUnit: body.expiresInUnit ?? null,
    });
    return NextResponse.json({ status: 'success', user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}

/**
 * Update role/expiry (owner) or transfer ownership.
 * Body: { username, role?, expiresInAmount?, expiresInUnit?, clearExpiry?, transferOwnership? }
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmnOwner();
  if ('error' in auth) return auth.error;
  try {
    const body = (await req.json()) as {
      username?: string;
      role?: string;
      expiresInAmount?: number | null;
      expiresInUnit?: 'hours' | 'days' | null;
      clearExpiry?: boolean;
      transferOwnership?: boolean;
    };
    const username = String(body.username || '').trim();
    if (!username) {
      return NextResponse.json(
        { status: 'error', message: 'username required', code: 'INVALID' },
        { status: 400 }
      );
    }

    if (body.transferOwnership) {
      const result = await transferOwnership({
        currentOwnerUsername: auth.user.username,
        newOwnerUsername: username,
      });
      return NextResponse.json({ status: 'success', ...result });
    }

    const user = await updateAdmnUser({
      username,
      role: body.role,
      expiresInAmount: body.expiresInAmount,
      expiresInUnit: body.expiresInUnit,
      clearExpiry: body.clearExpiry,
    });
    return NextResponse.json({ status: 'success', user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}

/**
 * Delete a user.
 * - Owner: may delete any non-owner account
 * - Editor/viewer: may delete only themselves
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmnSession();
  if ('error' in auth) return auth.error;
  try {
    const sp = req.nextUrl.searchParams;
    let username = sp.get('username') || '';
    if (!username) {
      try {
        const body = (await req.json()) as { username?: string };
        username = String(body.username || '');
      } catch {
        username = '';
      }
    }
    username = username.trim();
    if (!username) {
      return NextResponse.json(
        { status: 'error', message: 'username required', code: 'INVALID' },
        { status: 400 }
      );
    }

    const isSelf =
      normalizeUsername(username) === normalizeUsername(auth.user.username);
    if (!isOwner(auth.user.role) && !isSelf) {
      return NextResponse.json(
        { status: 'error', message: 'Only the owner can delete other accounts', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    await deleteAdmnUser({
      username,
      actorUsername: auth.user.username,
      actorRole: auth.user.role,
    });
    return NextResponse.json({ status: 'success', deleted: normalizeUsername(username) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json(
      { status: 'error', message, code: 'SERVER_ERROR' },
      { status: 400 }
    );
  }
}
