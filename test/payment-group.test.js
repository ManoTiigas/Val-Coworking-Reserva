import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentReferenceUpdates, paymentStatusTarget } from '../supabase/functions/_shared/booking-payment-group.js';

test('stores a Pix reference only on the primary booking of a multi-day group', () => {
  const updates = paymentReferenceUpdates(
    { id: 'primary-booking', payment_token: 'payment-token', booking_group_id: 'booking-group' },
    'ORD-123'
  );

  assert.deepEqual(updates, [
    { values: { payment_provider: 'mercado_pago' }, filters: { booking_group_id: 'booking-group' } },
    { values: { payment_reference: 'ORD-123' }, filters: { id: 'primary-booking', payment_token: 'payment-token' } }
  ]);
});

test('confirms every booking that belongs to a paid multi-day group', () => {
  assert.deepEqual(
    paymentStatusTarget({ id: 'primary-booking', booking_group_id: 'booking-group' }),
    { booking_group_id: 'booking-group' }
  );
});
