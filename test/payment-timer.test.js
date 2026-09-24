import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentTimeRemaining, formatPaymentTime } from '../work/payment-timer.js';

test('shows the remaining payment time in minutes and seconds', () => {
  const now = new Date('2026-09-24T18:00:00.000Z');
  const expiresAt = '2026-09-24T18:29:05.000Z';

  assert.equal(paymentTimeRemaining(expiresAt, now), 1745);
  assert.equal(formatPaymentTime(1745), '29:05');
});

test('does not show a negative payment countdown after expiry', () => {
  assert.equal(paymentTimeRemaining('2026-09-24T18:00:00.000Z', new Date('2026-09-24T18:01:00.000Z')), 0);
  assert.equal(formatPaymentTime(0), '00:00');
});
