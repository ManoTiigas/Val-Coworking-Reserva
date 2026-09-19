import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveMonthKey, buildArchiveCsv } from '../work/admin-archive.js';

test('groups an expiration in Brazil by its local month', () => {
  assert.equal(archiveMonthKey('2026-10-01T01:00:00.000Z'), '2026-09');
});

test('exports CSV values safely', () => {
  const csv = buildArchiveCsv([{
    booking_code: 'VAL-123',
    customer_name: 'Ana "Silva"',
    customer_email: 'ana@example.com',
    customer_phone: '81999999999',
    hold_expires_at: '2026-09-15T12:00:00.000Z',
    start_at: '2026-09-16T11:00:00.000Z',
    end_at: '2026-09-16T12:00:00.000Z',
    spaces: { name: 'Sala de Reunião' },
  }]);

  assert.match(csv, /"Ana ""Silva"""/);
  assert.match(csv, /Código da reserva;Cliente;E-mail/);
});
