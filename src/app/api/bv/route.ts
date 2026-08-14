import { NextRequest, NextResponse } from 'next/server';
import { isCosmosConfigured } from '@/lib/cosmos';
import { markBvPaid, registerBv } from '@/bv/bvCosmosStore';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    status: 'Bv Registration + Payment API is running',
    cosmos: isCosmosConfigured(),
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!isCosmosConfigured()) {
      return NextResponse.json(
        { success: false, error: 'BV backend is not configured (Cosmos).' },
        { status: 503 }
      );
    }

    const text = await req.text();
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(text || '{}') as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const action = String(body.action || '').trim();

    if (action === 'register') {
      const result = await registerBv({
        name: String(body.name || ''),
        age: String(body.age || ''),
        mobile: String(body.mobile || ''),
        gender: String(body.gender || ''),
        location: String(body.location || ''),
      });
      return NextResponse.json(result);
    }

    if (action === 'markPaid') {
      const result = await markBvPaid({
        registrationId: String(body.registrationId || ''),
        paymentId: body.paymentId != null ? String(body.paymentId) : undefined,
        razorpay_payment_id:
          body.razorpay_payment_id != null
            ? String(body.razorpay_payment_id)
            : undefined,
        amount: body.amount as string | number | undefined,
        razorpay_signature:
          body.razorpay_signature != null
            ? String(body.razorpay_signature)
            : undefined,
      });
      const status = result.success ? 200 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use register or markPaid.' },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
