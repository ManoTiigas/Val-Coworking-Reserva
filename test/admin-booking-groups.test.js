import test from 'node:test';
import assert from 'node:assert/strict';

import { groupBookings } from '../work/admin-booking-groups.js';

test('groups consecutive reservations into one admin record with a date range', () => {
  const rows = groupBookings([
    { id: 'a1', booking_group_id: 'group-a', booking_code: 'VAL-ABCD', start_at: '2026-09-22T11:00:00Z', end_at: '2026-09-22T21:00:00Z', status: 'paid' },
    { id: 'a2', booking_group_id: 'group-a', booking_code: 'VAL-ABCD-02', start_at: '2026-09-23T11:00:00Z', end_at: '2026-09-23T21:00:00Z', status: 'paid' },
    { id: 'b1', booking_code: 'VAL-SINGLE', start_at: '2026-09-25T11:00:00Z', end_at: '2026-09-25T21:00:00Z', status: 'pending_payment' }
  ]);

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    id: 'b1',
    booking_code: 'VAL-SINGLE',
    start_at: '2026-09-25T11:00:00Z',
    end_at: '2026-09-25T21:00:00Z',
    status: 'pending_payment',
    day_count: 1,
    is_multi_day: false
  });
  assert.equal(rows[1].booking_code, 'VAL-ABCD');
  assert.equal(rows[1].start_at, '2026-09-22T11:00:00Z');
  assert.equal(rows[1].end_at, '2026-09-23T21:00:00Z');
  assert.equal(rows[1].day_count, 2);
  assert.equal(rows[1].is_multi_day, true);
});
