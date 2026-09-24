import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('starts the 10-minute payment window only after a payment method is chosen', async () => {
  const migration = await readFile('supabase/migrations/20260924193000_shorten_payment_window.sql', 'utf8');
  const app = await readFile('work/app.js', 'utf8');

  assert.match(migration, /now\(\) \+ interval '10 minutes'/);
  assert.match(app, /O prazo de 10 minutos começa quando você escolher Pix ou Cartão/);
});
