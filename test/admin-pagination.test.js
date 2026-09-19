import test from 'node:test';
import assert from 'node:assert/strict';
import { pageBounds } from '../work/admin-pagination.js';

test('calculates the records and total pages for an admin page', () => {
  assert.deepEqual(pageBounds({ total: 23, page: 2, pageSize: 10 }), {
    from: 10,
    to: 19,
    totalPages: 3,
  });
});

test('keeps the last page within the available range', () => {
  assert.deepEqual(pageBounds({ total: 12, page: 8, pageSize: 10 }), {
    from: 10,
    to: 11,
    totalPages: 2,
  });
});
