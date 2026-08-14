/**
 * BV registration — Cosmos helpers (parity with archived `docs/archive/google-apps-script-bv.js`).
 * Live migrated tab name is `Sheet1` (not BvRegistrations).
 */
import { createHash, randomInt } from 'node:crypto';
import { getRowsContainer, isCosmosConfigured } from '@/lib/cosmos';

export const BV_TABLE_ID = 'bv';
export const BV_TAB_ID = 'Sheet1';

export const BV_HEADERS = [
  'Timestamp',
  'RegistrationId',
  'Name',
  'Age',
  'Mobile',
  'Gender',
  'Location',
  'PaymentStatus',
  'PaymentId',
  'PaymentTime',
  'PaymentAmount',
  'RazorpaySignature',
] as const;

export type BvRegisterInput = {
  name: string;
  age: string;
  mobile: string;
  gender: string;
  location: string;
};

function kolkataTimestamp(): string {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

export function generateRegistrationId(): string {
  return `BV-${Date.now()}-${randomInt(0, 100000)}`;
}

function stableRowId(registrationId: string): string {
  return createHash('sha256')
    .update(`${BV_TABLE_ID}\0${BV_TAB_ID}\0${registrationId}`)
    .digest('hex')
    .slice(0, 32);
}

export async function registerBv(input: BvRegisterInput): Promise<{
  success: true;
  registrationId: string;
  paymentStatus: 'Unpaid';
}> {
  if (!isCosmosConfigured()) {
    throw new Error('Cosmos DB is not configured.');
  }

  const registrationId = generateRegistrationId();
  const timestamp = kolkataTimestamp();
  const now = new Date().toISOString();
  const data: Record<string, string> = {
    Timestamp: timestamp,
    RegistrationId: registrationId,
    Name: input.name || '',
    Age: input.age || '',
    Mobile: input.mobile || '',
    Gender: input.gender || '',
    Location: input.location || '',
    PaymentStatus: 'Unpaid',
    PaymentId: '',
    PaymentTime: '',
    PaymentAmount: '',
    RazorpaySignature: '',
  };

  const doc = {
    id: stableRowId(registrationId),
    tableId: BV_TABLE_ID,
    tabId: BV_TAB_ID,
    sheetRowKey: registrationId,
    data,
    updatedAt: now,
    updatedBy: 'app' as const,
    syncStatus: 'synced' as const,
    source: {
      spreadsheetId: '1Lp9pJtgIx2QZ92FH3_HbqnCv5Dt2yMAr_TkYyNygkdg',
      sheetName: BV_TAB_ID,
    },
  };

  await getRowsContainer().items.upsert(doc);
  return { success: true, registrationId, paymentStatus: 'Unpaid' };
}

type BvRowDoc = {
  id: string;
  tableId: string;
  tabId: string;
  data: Record<string, string>;
  updatedAt?: string;
};

export async function findBvByRegistrationId(
  registrationId: string
): Promise<BvRowDoc | null> {
  const container = getRowsContainer();
  const { resources } = await container.items
    .query<BvRowDoc>({
      query:
        'SELECT * FROM c WHERE c.tableId = @tableId AND c.data.RegistrationId = @rid',
      parameters: [
        { name: '@tableId', value: BV_TABLE_ID },
        { name: '@rid', value: registrationId },
      ],
    })
    .fetchAll();
  return resources[0] || null;
}

export async function markBvPaid(input: {
  registrationId: string;
  paymentId?: string;
  razorpay_payment_id?: string;
  amount?: string | number;
  razorpay_signature?: string;
}): Promise<
  | { success: true; registrationId: string; paymentStatus: 'Paid' }
  | { success: false; error: string }
> {
  if (!isCosmosConfigured()) {
    return { success: false, error: 'Cosmos DB is not configured.' };
  }

  const registrationId = (input.registrationId || '').toString().trim();
  if (!registrationId) {
    return { success: false, error: 'registrationId is required' };
  }

  const existing = await findBvByRegistrationId(registrationId);
  if (!existing) {
    return { success: false, error: 'Registration not found' };
  }

  const paymentTime = kolkataTimestamp();
  const data = {
    ...existing.data,
    PaymentStatus: 'Paid',
    PaymentId: String(input.razorpay_payment_id || input.paymentId || ''),
    PaymentTime: paymentTime,
    PaymentAmount: String(input.amount ?? ''),
    RazorpaySignature: String(input.razorpay_signature || ''),
  };

  await getRowsContainer().items.upsert({
    ...existing,
    data,
    updatedAt: new Date().toISOString(),
    updatedBy: 'app',
    syncStatus: 'synced',
  });

  return { success: true, registrationId, paymentStatus: 'Paid' };
}
