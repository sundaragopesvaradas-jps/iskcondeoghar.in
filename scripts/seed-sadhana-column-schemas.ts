/**
 * One-time seed: write current sadhana option lists into Cosmos columnSchemas.
 * Runtime app has no fallback arrays — run this before deploying Option A.
 *
 *   npx tsx scripts/seed-sadhana-column-schemas.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CosmosClient } from '@azure/cosmos';

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const TABLE_ID = 'sadhana';

/** Initial lists only for seeding — not imported by the app. */
const SEED: Array<{ name: string; allowedValues: string[] }> = [
  {
    name: 'Sleeping Time',
    allowedValues: [
      'रात 9 बजे से पहले',
      'रात 9–10 बजे',
      'रात 10–11 बजे',
      'रात 11 बजे के बाद',
    ],
  },
  {
    name: 'Waking up Time',
    allowedValues: [
      'सुबह 4 बजे से पहले',
      'सुबह 4–5 बजे',
      'सुबह 5–6 बजे',
      'सुबह 6 बजे के बाद',
    ],
  },
  {
    name: 'Chanting Rounds',
    allowedValues: [
      '16 माला',
      '17 से 20 माला',
      '21 से 25 माला',
      '26 से 32 माला',
      '32 से ज़्यादा माला',
    ],
  },
  {
    name: 'Chanting Completed',
    allowedValues: [
      'सुबह 7 बजे तक',
      'सुबह 9 बजे तक',
      'दोपहर 2 बजे तक',
      'शाम 6 बजे तक',
      'रात 9 बजे तक',
      'पूरी नहीं हुई',
    ],
  },
  {
    name: 'Book Reading',
    allowedValues: ['0', 'आधे घंटे तक', '1 घंटे तक', '2 घंटे तक', '2 घंटे से अधिक'],
  },
  {
    name: 'Which Book ?',
    allowedValues: [
      'भगवद्-गीता',
      'श्रीमद् भागवतम्',
      'श्रील प्रभुपाद की छोटी पुस्तकें',
      'अन्य',
    ],
  },
  {
    name: 'श्रवणम्',
    allowedValues: ['0', 'आधे घंटे तक', '1 घंटे तक', '2 घंटे तक', '2 घंटे से अधिक'],
  },
];

async function main() {
  loadEnvLocal();
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const dbName = process.env.COSMOS_DB || 'iskcon';
  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY required (.env.local)');
  }

  const client = new CosmosClient({ endpoint, key });
  const container = client.database(dbName).container('tables');
  const { resource } = await container.item(TABLE_ID, TABLE_ID).read<{
    id: string;
    columnSchemas?: Array<{ name: string; allowedValues?: string[] }>;
    [k: string]: unknown;
  }>();
  if (!resource) throw new Error('sadhana table doc not found');

  const existing = [...(resource.columnSchemas || [])];
  let changed = 0;
  for (const seed of SEED) {
    const idx = existing.findIndex((c) => c.name === seed.name);
    if (idx >= 0) {
      const cur = existing[idx].allowedValues || [];
      if (cur.length > 0) {
        console.log(`skip ${seed.name} (already has ${cur.length} values)`);
        continue;
      }
      existing[idx] = seed;
      changed += 1;
      console.log(`filled empty ${seed.name}`);
    } else {
      existing.push(seed);
      changed += 1;
      console.log(`added ${seed.name}`);
    }
  }

  if (!changed) {
    console.log('Nothing to seed — columnSchemas already populated.');
    return;
  }

  await container.items.upsert({
    ...resource,
    columnSchemas: existing,
    updatedAt: new Date().toISOString(),
  });
  console.log(`Seeded ${changed} column schema(s) on tables/${TABLE_ID}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
