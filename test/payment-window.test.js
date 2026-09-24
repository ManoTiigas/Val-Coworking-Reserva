import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('starts the 30-minute payment window only after a payment method is chosen', async () => {
  const [migration, app] = await Promise.all([
    readFile('supabase/migrations/20260924184222_start_payment_window.sql', 'utf8'),
    readFile('work/app.js', 'utf8')
  ]);

  assert.match(migration, /payment_started_at timestamptz/);
  assert.match(migration, /create or replace function public\.start_booking_payment_window/);
  assert.match(migration, /now\(\) \+ interval '30 minutes'/);
  assert.match(app, /sb\.rpc\('start_booking_payment_window'/);
});
