import test from 'node:test';
import assert from 'node:assert/strict';
import {
  consecutiveDays,
  isRateAvailableForDays,
  isFutureRange,
  bookingTotalCents,
  occurrenceRanges
} from '../work/booking-range.js';

const dayRate = { booking_unit: 'day', price_cents: 10000 };
const hourRate = { booking_unit: 'hour', price_cents: 2500 };
const monthRate = { booking_unit: 'month', price_cents: 50000 };
const eventRate = { booking_unit: 'event', price_cents: 50000 };

test('lists every day in a consecutive reservation interval', () => {
  assert.deepEqual(
    consecutiveDays(new Date(2026, 8, 10), new Date(2026, 8, 12)).map((day) => day.toISOString().slice(0, 10)),
    ['2026-09-10', '2026-09-11', '2026-09-12']
  );
});

test('rejects a range whose start time has already passed', () => {
  const now = new Date('2026-09-18T15:30:00-03:00');
  assert.equal(isFutureRange({ start: new Date('2026-09-18T08:00:00-03:00'), end: new Date('2026-09-18T18:00:00-03:00') }, now), false);
  assert.equal(isFutureRange({ start: new Date('2026-09-18T16:00:00-03:00'), end: new Date('2026-09-18T17:00:00-03:00') }, now), true);
});

test('excludes Sunday from a reservation interval', () => {
  assert.deepEqual(
    consecutiveDays(new Date(2026, 8, 18), new Date(2026, 8, 21)).map((day) => day.toISOString().slice(0, 10)),
    ['2026-09-18', '2026-09-19', '2026-09-21']
  );
});

test('disables only monthly rates when multiple days are selected', () => {
  const days = [new Date(2026, 8, 10), new Date(2026, 8, 11)];
  assert.equal(isRateAvailableForDays(dayRate, days), true);
  assert.equal(isRateAvailableForDays(hourRate, days), true);
  assert.equal(isRateAvailableForDays(monthRate, days), false);
  assert.equal(isRateAvailableForDays(eventRate, days), false);
});

test('sums the existing daily price for each selected day', () => {
  assert.equal(bookingTotalCents(dayRate, 3), 30000);
});

test('replicates the chosen hourly time across selected days', () => {
  const ranges = occurrenceRanges(
    [new Date(2026, 8, 10), new Date(2026, 8, 11)],
    { startTime: '14:00', endTime: '16:00' }
  );
  assert.deepEqual(
    ranges.map(({ start, end }) => [start.toISOString(), end.toISOString()]),
    [
      ['2026-09-10T17:00:00.000Z', '2026-09-10T19:00:00.000Z'],
      ['2026-09-11T17:00:00.000Z', '2026-09-11T19:00:00.000Z']
    ]
  );
});
