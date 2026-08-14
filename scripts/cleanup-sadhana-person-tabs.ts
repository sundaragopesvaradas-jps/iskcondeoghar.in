/**
 * One-time: keep only Responses + Unique Names tabs on sadhana;
 * delete legacy per-person tabs/rows; optionally seed adminKey from env.
 *
 *   npx tsx scripts/cleanup-sadhana-person-tabs.ts
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
const KEEP = new Set(['Sadhana Responses', 'Sadhana Unique Names']);

async function main() {
  loadEnvLocal();
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const dbName = process.env.COSMOS_DB || 'iskcon';
  if (!endpoint || !key) throw new Error('COSMOS_ENDPOINT and COSMOS_KEY required');

  const client = new CosmosClient({ endpoint, key });
  const db = client.database(dbName);
  const tables = db.container('tables');
  const rows = db.container('rows');

  const { resource: table } = await tables.item(TABLE_ID, TABLE_ID).read<{
    id: string;
    tabs?: Array<{ id: string; name: string }>;
    adminKey?: string;
    [k: string]: unknown;
  }>();
  if (!table) throw new Error('sadhana table not found');

  const removeTabs = (table.tabs || []).filter((t) => !KEEP.has(t.id) && !KEEP.has(t.name));
  console.log(`Tabs to remove: ${removeTabs.length}`);

  let deletedRows = 0;
  for (const tab of removeTabs) {
    const iterator = rows.items.query<{ id: string }>({
      query: 'SELECT c.id FROM c WHERE c.tableId=@t AND c.tabId=@tab',
      parameters: [
        { name: '@t', value: TABLE_ID },
        { name: '@tab', value: tab.id },
      ],
    });
    while (iterator.hasMoreResults()) {
      const { resources } = await iterator.fetchNext();
      for (const r of resources || []) {
        await rows.item(r.id, TABLE_ID).delete();
        deletedRows += 1;
      }
    }
    console.log(`  removed tab "${tab.id}"`);
  }

  const envKey = (process.env.SADHANA_ADMIN_KEY || '').trim();
  let adminKey = String(table.adminKey || '').trim();
  if (!adminKey && envKey) {
    adminKey = envKey;
    console.log('Seeded adminKey from SADHANA_ADMIN_KEY env');
  } else if (!adminKey) {
    console.log('No adminKey on table yet — set it in /admn after cleanup');
  }

  await tables.items.upsert({
    ...table,
    tabs: (table.tabs || []).filter((t) => KEEP.has(t.id) || KEEP.has(t.name)),
    ...(adminKey ? { adminKey } : {}),
    updatedAt: new Date().toISOString(),
  });

  console.log(`Done. deletedRows=${deletedRows}, kept tabs=${[...KEEP].join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
