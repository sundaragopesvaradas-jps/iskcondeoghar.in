import { NextRequest, NextResponse } from 'next/server';
import { isCosmosConfigured } from '@/lib/cosmos';
import { loadNameRowsForGender } from '@/name/nameCosmosStore';
import { runNameSearch } from '@/name/nameSearchLogic';
import type { NameGender } from '@/name/nameSearchTypes';

export const runtime = 'nodejs';

async function handleSearch(body: {
  action?: string;
  gender?: string;
  wordCount?: string;
  query?: string;
}) {
  if (!isCosmosConfigured()) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Name search backend is not configured (Cosmos).',
      },
      { status: 503 }
    );
  }

  const action = (body.action || 'NAME_SEARCH').toString().trim();
  if (action !== 'NAME_SEARCH') {
    return NextResponse.json(
      { status: 'error', message: 'Invalid action. Use NAME_SEARCH.' },
      { status: 400 }
    );
  }

  const gender = (body.gender || '').toString().trim();
  if (gender !== 'Boy' && gender !== 'Girl') {
    return NextResponse.json(
      { status: 'error', message: 'gender must be Boy or Girl' },
      { status: 400 }
    );
  }

  const rows = await loadNameRowsForGender(gender as NameGender);
  const result = runNameSearch(rows, {
    gender,
    wordCount: (body.wordCount || '').toString(),
    query: (body.query || '').toString(),
  });

  if (result.status === 'error') {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    let body: {
      action?: string;
      gender?: string;
      wordCount?: string;
      query?: string;
    } = {};
    try {
      body = JSON.parse(text || '{}') as typeof body;
    } catch {
      return NextResponse.json(
        { status: 'error', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    return await handleSearch(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Name search API is running',
    cosmos: isCosmosConfigured(),
  });
}
