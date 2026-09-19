import { createClient } from '@supabase/supabase-js';
import { archiveMonthKey, buildArchiveCsv } from './admin-archive.js';
import { pageBounds } from './admin-pagination.js';

const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://htsnhqyhhlzqjgqlgkvt.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_l1jEP6P84wREppUZwEHwSw_RRw8Ht5y',
);
const $ = (id) => document.getElementById(id);
const labels = {
  pending_payment: 'Em processo',
  paid: 'Pago',
  cancelled: 'Cancelado',
  expired: 'Expirado',
  failed: 'Falhou',
};
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const time = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' });
const pageSize = 10;
let currentPage = 1;
let archivedBookings = [];

function setMessage(id, text = '') {
  $(id).textContent = text;
}

function showDashboard(isSignedIn) {
  $('login-view').hidden = isSignedIn;
  $('dashboard-view').hidden = !isSignedIn;
}

function expirationCutoff() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return cutoff.toISOString();
}

function monthLabel(key) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(`${key}-01T12:00:00-03:00`));
}

function bookingRow(booking) {
  const startsAt = new Date(booking.start_at);
  const endsAt = new Date(booking.end_at);
  const status = labels[booking.status] || booking.status;
  return `<tr>
    <td data-label="Reserva"><strong>${booking.booking_code}</strong><small>Criada em ${date.format(new Date(booking.created_at))}</small></td>
    <td data-label="Cliente"><strong>${booking.customer_name}</strong><small>${booking.customer_email}<br/>${booking.customer_phone}</small></td>
    <td data-label="Espaço">${booking.spaces?.name || '—'}</td>
    <td data-label="Data e horário">${date.format(startsAt)}<small>${time.format(startsAt)} — ${time.format(endsAt)}</small></td>
    <td data-label="Status"><span class="badge ${booking.status}">${status}</span></td>
  </tr>`;
}

function renderPagination(total) {
  const { totalPages } = pageBounds({ total, page: currentPage, pageSize });
  $('bookings-pagination').hidden = total <= pageSize;
  $('pagination-info').textContent = `Página ${currentPage} de ${totalPages}`;
  $('previous-page').disabled = currentPage === 1;
  $('next-page').disabled = currentPage === totalPages;
}

function render(bookings, counts) {
  $('stat-pending').textContent = counts.pending;
  $('stat-paid').textContent = counts.paid;
  $('stat-cancelled').textContent = counts.cancelled;
  $('stat-total').textContent = counts.total;
  $('bookings-list').innerHTML = bookings.length
    ? bookings.map(bookingRow).join('')
    : '<tr><td class="empty" colspan="5">Nenhuma reserva encontrada.</td></tr>';
  renderPagination(counts.total);
}

async function loadBookings(page = currentPage) {
  currentPage = Math.max(1, page);
  setMessage('dashboard-message', 'Carregando reservas…');
  const from = (currentPage - 1) * pageSize;
  const cutoff = expirationCutoff();
  const [pageResult, pendingResult, paidResult, cancelledResult] = await Promise.all([
    sb.from('bookings').select('booking_code,customer_name,customer_email,customer_phone,start_at,end_at,status,created_at,spaces(name)', { count: 'exact' }).or(`status.neq.expired,hold_expires_at.gte.${cutoff}`).order('start_at', { ascending: false }).range(from, from + pageSize - 1),
    sb.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending_payment'),
    sb.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    sb.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ]);
  const { data, error, count } = pageResult;

  if (error || pendingResult.error || paidResult.error || cancelledResult.error) {
    const requestError = error || pendingResult.error || paidResult.error || cancelledResult.error;
    render([], { pending: 0, paid: 0, cancelled: 0, total: 0 });
    setMessage('dashboard-message', requestError.code === '42501'
      ? 'Seu usuário não tem acesso às reservas.'
      : 'Não foi possível carregar as reservas.');
    return;
  }

  const total = count || 0;
  const { totalPages } = pageBounds({ total, page: currentPage, pageSize });
  if (currentPage > totalPages) return loadBookings(totalPages);
  render(data || [], { pending: pendingResult.count || 0, paid: paidResult.count || 0, cancelled: cancelledResult.count || 0, total });
  setMessage('dashboard-message');
}

function renderArchive() {
  const months = [...new Set(archivedBookings.map((booking) => archiveMonthKey(booking.hold_expires_at)))].sort().reverse();
  const selected = $('archive-month').value;
  $('archive-month').innerHTML = months.length
    ? months.map((month) => `<option value="${month}">${monthLabel(month)}</option>`).join('')
    : '<option value="">Nenhum mês disponível</option>';
  if (months.includes(selected)) $('archive-month').value = selected;
  $('archive-month').disabled = !months.length;
  $('export-archive').disabled = !months.length;
  setMessage('archive-message', months.length ? `${archivedBookings.length} reserva(s) preservada(s) para exportação.` : 'Não há reservas expiradas há mais de uma semana.');
}

async function loadArchive() {
  const { data, error } = await sb
    .from('bookings')
    .select('booking_code,customer_name,customer_email,customer_phone,start_at,end_at,hold_expires_at,spaces(name)')
    .eq('status', 'expired')
    .lt('hold_expires_at', expirationCutoff())
    .order('hold_expires_at', { ascending: false });

  if (error) {
    archivedBookings = [];
    renderArchive();
    setMessage('archive-message', 'Não foi possível carregar o arquivo de reservas expiradas.');
    return;
  }
  archivedBookings = data || [];
  renderArchive();
}

async function syncSession() {
  const { data: { session } } = await sb.auth.getSession();
  showDashboard(Boolean(session));
  if (session) await Promise.all([loadBookings(), loadArchive()]);
}

$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('login-message', 'Entrando…');
  const form = new FormData(event.currentTarget);
  const { error } = await sb.auth.signInWithPassword({
    email: form.get('email'),
    password: form.get('password'),
  });
  if (error) {
    setMessage('login-message', 'E-mail ou senha inválidos.');
    return;
  }
  setMessage('login-message');
});

$('previous-page').addEventListener('click', () => loadBookings(currentPage - 1));
$('next-page').addEventListener('click', () => loadBookings(currentPage + 1));
$('export-archive').addEventListener('click', () => {
  const month = $('archive-month').value;
  const rows = archivedBookings.filter((booking) => archiveMonthKey(booking.hold_expires_at) === month);
  const blob = new Blob([`\uFEFF${buildArchiveCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `reservas-expiradas-${month}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

sb.auth.onAuthStateChange((_event, session) => {
  showDashboard(Boolean(session));
  if (session) Promise.all([loadBookings(), loadArchive()]);
});

syncSession();
