const monthFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
});

export function archiveMonthKey(value) {
  const parts = Object.fromEntries(monthFormatter.formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}`;
}

function csvValue(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function buildArchiveCsv(bookings) {
  const rows = bookings.map((booking) => [
    booking.booking_code,
    booking.customer_name,
    booking.customer_email,
    booking.customer_phone,
    booking.spaces?.name || '',
    booking.start_at,
    booking.end_at,
    booking.hold_expires_at,
  ].map(csvValue).join(';'));

  return ['Código da reserva;Cliente;E-mail;Telefone;Espaço;Início;Fim;Expirada em', ...rows].join('\n');
}
