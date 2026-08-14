/**
 * 3.1 smoke: Sadhana Cosmos helpers (no HTTP / UI).
 * Usage from repo root:
 *   npx tsx scripts/smoke-sadhana-3.1.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  loadEnvLocal();

  const { updateTableAdminKey } = await import('../src/admn/admnDataStore');
  const {
    runSadhanaAction,
    sadhanaListNames,
    sadhanaLookup,
    sadhanaChangePin,
    sadhanaSeeAll,
    sadhanaSubmit,
  } = await import('../src/sadhana/sadhanaCosmosStore');

  const smokeKey = '2026';
  await updateTableAdminKey('sadhana', smokeKey);

  console.log('--- SADHANA_NAMES ---');
  const namesRes = await sadhanaListNames();
  assert(namesRes.status === 'success', JSON.stringify(namesRes));
  const names = namesRes.status === 'success' ? namesRes.names || [] : [];
  console.log('names count', names.length, 'sample', names.slice(0, 3));
  assert(names.length > 0, 'expected migrated unique names');

  const testName = names.includes('Vikram Kumar') ? 'Vikram Kumar' : names[0];
  console.log('using name', testName);

  console.log('--- SADHANA_LOOKUP wrong pin ---');
  const wrong = await sadhanaLookup({ name: testName, pin: '0000', pinLength: 4 });
  assert(wrong.status === 'error' && wrong.code === 'WRONG_PIN', JSON.stringify(wrong));
  console.log('ok WRONG_PIN');

  console.log('--- SADHANA_LOOKUP correct pin ---');
  const pin = testName === 'Vikram Kumar' ? '3489' : '1111';
  const lookup = await sadhanaLookup({ name: testName, pin, pinLength: 4 });
  assert(lookup.status === 'success', JSON.stringify(lookup));
  const rows = lookup.status === 'success' ? lookup.rows || [] : [];
  console.log('history rows', rows.length, 'first Date', rows[0]?.Date, 'Hearing', rows[0]?.Hearing);
  assert(rows.length > 0, 'expected history rows');
  assert(typeof rows[0]?.Date === 'string', 'Date field required');
  assert('Hearing' in (rows[0] || {}), 'Hearing mapped');

  console.log('--- seeAllSadhanas names ---');
  const adminBad = await sadhanaSeeAll({ adminKey: 'nope', mode: 'names' });
  assert(adminBad.status === 'error' && adminBad.code === 'FORBIDDEN', JSON.stringify(adminBad));
  const adminNames = await sadhanaSeeAll({
    adminKey: smokeKey,
    mode: 'names',
  });
  assert(adminNames.status === 'success', JSON.stringify(adminNames));
  console.log('admin names', adminNames.status === 'success' ? adminNames.names?.length : 0);

  console.log('--- seeAllSadhanas lookup ---');
  const adminLookup = await sadhanaSeeAll({
    adminKey: smokeKey,
    mode: 'lookup',
    name: testName,
  });
  assert(adminLookup.status === 'success', JSON.stringify(adminLookup));
  console.log(
    'admin lookup rows',
    adminLookup.status === 'success' ? adminLookup.rows?.length : 0
  );

  console.log('--- SADHANA_SUBMIT ---');
  const smokeName = `Smoke Test ${Date.now()}`;
  const submit = await sadhanaSubmit({
    fieldOrder: [
      'devotee_name',
      'sadhana_date',
      'sleep_time_range',
      'wake_time_range',
      'mala_count_range',
      'mala_completed_by_time',
      'sp_books_minutes',
      'sp_books_which',
      'sravanam_duration',
    ],
    responses: {
      devotee_name: smokeName,
      sadhana_date: '2026-08-14',
      sleep_time_range: 'रात 9–10 बजे',
      wake_time_range: 'सुबह 4–5 बजे',
      mala_count_range: '16 माला',
      mala_completed_by_time: 'सुबह 7 बजे तक',
      sp_books_minutes: 'आधे घंटे तक',
      sp_books_which: ['भगवद्-गीता'],
      sravanam_duration: '1 घंटे तक',
    },
  });
  assert(submit.status === 'success', JSON.stringify(submit));
  console.log('submit ok');

  const names2 = await sadhanaListNames();
  assert(
    names2.status === 'success' &&
      (names2.names || []).some((n) => n.toLowerCase() === smokeName.toLowerCase()),
    'new name should appear in unique names'
  );

  const lookupNew = await sadhanaLookup({ name: smokeName, pin: '1111', pinLength: 4 });
  assert(lookupNew.status === 'success', JSON.stringify(lookupNew));
  assert(
    lookupNew.status === 'success' && (lookupNew.rows || []).length >= 1,
    'new devotee should have history'
  );
  console.log('new devotee history', lookupNew.status === 'success' ? lookupNew.rows?.[0] : null);

  console.log('--- SADHANA_CHANGE_PIN ---');
  const change = await sadhanaChangePin({
    name: smokeName,
    oldPin: '1111',
    newPin: '2222',
    pinLength: 4,
  });
  assert(change.status === 'success', JSON.stringify(change));
  const afterWrong = await sadhanaLookup({ name: smokeName, pin: '1111', pinLength: 4 });
  assert(afterWrong.status === 'error' && afterWrong.code === 'WRONG_PIN', 'old pin rejected');
  const afterOk = await sadhanaLookup({ name: smokeName, pin: '2222', pinLength: 4 });
  assert(afterOk.status === 'success', JSON.stringify(afterOk));
  console.log('change pin ok');

  console.log('--- runSadhanaAction unknown ---');
  const unk = await runSadhanaAction({ action: 'NOPE' });
  assert(unk.status === 'error' && unk.code === 'UNKNOWN_ACTION', JSON.stringify(unk));

  console.log('\n3.1 SMOKE PASSED');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
