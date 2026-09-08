import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

function setMessage(id, text = '') {
  $(id).textContent = text;
}

function showDashboard(isSignedIn) {
  $('login-view').hidden = isSignedIn;
  $('dashboard-view').hidden = !isSignedIn;
}

function bookingRow(booking) {
  const startsAt = new Date(booking.start_at);
  const endsAt = new Date(booking.end_at);
  const status = labels[booking.status] || booking.status;
  return `<tr>
    <td><strong>${booking.booking_code}</strong><small>Criada em ${date.format(new Date(booking.created_at))}</small></td>
    <td><strong>${booking.customer_name}</strong><small>${booking.customer_email}<br/>${booking.customer_phone}</small></td>
    <td>${booking.spaces?.name || '—'}</td>
    <td>${date.format(startsAt)}<small>${time.format(startsAt)} — ${time.format(endsAt)}</small></td>
    <td><span class="badge ${booking.status}">${status}</span></td>
  </tr>`;
}

function render(bookings) {
  $('stat-pending').textContent = bookings.filter((booking) => booking.status === 'pending_payment').length;
  $('stat-paid').textContent = bookings.filter((booking) => booking.status === 'paid').length;
  $('stat-cancelled').textContent = bookings.filter((booking) => booking.status === 'cancelled').length;
  $('stat-total').textContent = bookings.length;
  $('bookings-list').innerHTML = bookings.length
    ? bookings.map(bookingRow).join('')
    : '<tr><td class="empty" colspan="5">Nenhuma reserva encontrada.</td></tr>';
}

async function loadBookings() {
  setMessage('dashboard-message', 'Carregando reservas…');
  const { data, error } = await sb
    .from('bookings')
    .select('booking_code,customer_name,customer_email,customer_phone,start_at,end_at,status,created_at,spaces(name)')
    .order('start_at', { ascending: false });

  if (error) {
    render([]);
    setMessage('dashboard-message', error.code === '42501'
      ? 'Seu usuário não tem acesso às reservas.'
      : 'Não foi possível carregar as reservas.');
    return;
  }

  render(data || []);
  setMessage('dashboard-message');
}

async function syncSession() {
  const { data: { session } } = await sb.auth.getSession();
  showDashboard(Boolean(session));
  if (session) await loadBookings();
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

sb.auth.onAuthStateChange((_event, session) => {
  showDashboard(Boolean(session));
  if (session) loadBookings();
});

syncSession();
