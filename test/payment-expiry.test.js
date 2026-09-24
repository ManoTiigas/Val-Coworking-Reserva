import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('new reservations and Pix orders use a 30-minute payment limit', async () => {
  const [singleHold, multiHold, pix, planPayment, checkout] = await Promise.all([
    readFile('supabase/migrations/20260924183055_shorten_payment_hold.sql', 'utf8'),
    readFile('supabase/migrations/20260924183055_shorten_payment_hold.sql', 'utf8'),
    readFile('supabase/functions/mercado-pago-pix/index.ts', 'utf8'),
    readFile('supabase/functions/plan-payment/index.ts', 'utf8'),
    readFile('work/app.js', 'utf8')
  ]);

  assert.match(singleHold, /create_booking_hold[\s\S]*interval '30 minutes'/);
  assert.match(multiHold, /create_multi_day_booking_hold[\s\S]*interval '30 minutes'/);
  assert.match(pix, /expiration_time:"PT30M"/);
  assert.match(planPayment, /expiration_time:"PT30M"/);
  assert.match(checkout, /Tempo restante para pagar/);
});
