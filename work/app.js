import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const sb = createClient('https://htsnhqyhhlzqjgqlgkvt.supabase.co', 'sb_publishable_l1jEP6P84wREppUZwEHwSw_RRw8Ht5y');
const mercadoPagoPublicKey = 'APP_USR-02015adc-df8b-4c73-ae52-80796f6e4284';
const reservationFont = document.createElement('link');
reservationFont.rel = 'stylesheet';
reservationFont.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,600&display=swap';
document.head.appendChild(reservationFont);
const oldCheckoutStyle = document.createElement('style');
oldCheckoutStyle.textContent = `.payment{padding:18px;background:linear-gradient(135deg,#002b27,#001715)!important;color:#fff!important;border-color:rgba(217,166,75,.65)!important}.payment:before{display:none}.payment .eyebrow{color:#d9a64b!important}.payment h2{color:#fff!important;font-size:24px!important}.payment>p{color:#9aafaa!important}.payment .summary{margin:17px 0!important;padding:14px!important;border:1px solid rgba(217,166,75,.35)!important;border-radius:9px!important;background:#003833!important;color:#eff6f4!important;box-shadow:none!important}.payment .summary strong{color:#eff6f4!important;font-size:inherit!important}.payment-methods{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}.payment-methods .button{min-height:auto!important;flex-direction:row!important;border:1px solid rgba(217,166,75,.5)!important;border-radius:999px!important;background:transparent!important;color:#f1f1e9!important;font-size:11px!important;text-transform:none!important;box-shadow:none!important}.payment-methods .button i{font-size:16px!important;color:#d9a64b!important}.payment-methods #pay-pix{border:0!important;background:#d9a64b!important;color:#001e1b!important}.payment-methods #pay-pix i{color:#001e1b!important}.payment .button.secondary{color:#f1f1e9!important;border-color:rgba(217,166,75,.5)!important}.payment .pix-box{background:#003833!important;border-color:rgba(217,166,75,.65)!important;color:#eff6f4!important}.payment .pix-code{background:#001e1b!important;border-color:#315a54!important;color:#fff!important}.payment #card-payment-area{padding:0!important;border:0!important;background:transparent!important}`;
document.head.appendChild(oldCheckoutStyle);
const bookingFlowStyle = document.createElement('style');
bookingFlowStyle.textContent = `.choice{position:relative;display:flex;align-items:flex-end;min-height:112px;padding:16px;isolation:isolate}.choice b{position:relative;z-index:1;font-family:'DM Sans',Arial,sans-serif;font-size:clamp(18px,2.5vw,23px);font-weight:700;line-height:1.05;letter-spacing:-.04em;text-shadow:0 2px 10px rgba(0,0,0,.78)}.choice.active{box-shadow:0 0 0 2px #d9a64b,0 10px 24px rgba(0,0,0,.35)}.rate-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px}.rate-option{display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-height:70px;padding:13px;border:1px solid #d9a64b;border-radius:12px;background:#003833;color:#fff;font:inherit;text-align:left;cursor:pointer}.rate-option strong{font-size:18px}.rate-option small{color:#bdd1cb}.rate-option.active{background:#d9a64b;color:#001e1b}.rate-option.active small{color:#244039}@media(max-width:520px){.choice{min-height:96px}.rate-grid{grid-template-columns:1fr}}`;
document.head.appendChild(bookingFlowStyle);
const paymentEaseStyle = document.createElement('style');
paymentEaseStyle.textContent = `#payment-summary{display:grid!important;gap:13px!important}.booking-ref{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#fff;font-size:14px;font-weight:800}.booking-ref span{padding:5px 8px;border-radius:999px;background:rgba(217,166,75,.16);color:#e5b14e;font-size:10px;letter-spacing:.06em}.booking-details{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:12px;border-top:1px solid rgba(217,166,75,.24)}.booking-detail{display:grid;gap:2px}.booking-detail small{color:#aabdb8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}.booking-detail b{color:#fff;font-size:14px}.booking-detail.total{grid-column:1/-1;padding-top:10px;border-top:1px solid rgba(217,166,75,.18)}.booking-detail.total b{color:#e5b14e;font-size:20px}.payment-help{margin:20px 0 10px!important;color:#dce8e4!important;font-size:14px!important}.payment-methods{gap:12px!important;margin:0!important}.payment-methods .payment-choice{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;min-height:76px!important;padding:14px 17px!important;border:1px solid rgba(217,166,75,.58)!important;border-radius:13px!important;text-align:left!important}.payment-methods .payment-choice--recommended{background:#d9a64b!important;color:#001e1b!important;border-color:#d9a64b!important}.payment-choice .method-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:rgba(0,30,27,.13);font-size:20px}.payment-choice:not(.payment-choice--recommended) .method-icon{background:rgba(217,166,75,.13);color:#e5b14e}.payment-choice .method-copy{display:grid;gap:3px}.payment-choice .method-copy b{font-size:14px}.payment-choice .method-copy small{font-size:11px;font-weight:500;opacity:.78}.payment-methods .payment-choice i{font-size:20px!important}.payment-choice .method-arrow{margin-left:auto;font-size:18px!important}@media(max-width:520px){.booking-details{grid-template-columns:1fr}.payment-methods .payment-choice{min-height:70px!important}}`;
document.head.appendChild(paymentEaseStyle);
const $ = (id) => document.getElementById(id);
const steps = ['espaco', 'agenda', 'dados', 'contrato', 'pagamento'];
const state = { space: null, date: new Date(), day: null, rate: null, slot: null, booking: null };
const monthlyContractStep = document.createElement('section');
monthlyContractStep.className = 'step';
monthlyContractStep.dataset.step = 'contrato';
monthlyContractStep.innerHTML = '<div class="card payment"><p class="eyebrow">CONTRATO MENSAL</p><h2>Assine seu contrato</h2><p>O pagamento será liberado após a assinatura digital.</p><div id="booking-contract" class="summary"></div><div class="actions"><button class="button secondary" data-back="dados"><i class="ph ph-arrow-left"></i> Voltar</button></div></div>';
document.querySelector('[data-step="pagamento"]').before(monthlyContractStep);

function monthlyFields() {
  let fields = $('monthly-contract-fields');
  if (state.rate?.booking_unit !== 'month') { fields?.remove(); return; }
  if (!fields) { fields = document.createElement('div'); fields.id = 'monthly-contract-fields'; fields.className = 'form'; $('form-status').before(fields); }
  fields.innerHTML = '<label>Empresa<input required name="company" placeholder="Nome da empresa"/></label><label>CPF ou CNPJ<input required name="document" inputmode="numeric" placeholder="000.000.000-00"/></label><label style="grid-column:1/-1">Endereço atual<input required name="address" placeholder="Rua, número, bairro, cidade/UF e CEP"/></label>';
}

async function bookingContract(action) {
  const { data, error } = await sb.functions.invoke('clicksign-booking-signature', { body: { booking_id: state.booking.id, payment_token: state.booking.payment_token, action } });
  if (error) { const body = await error.context?.json().catch(() => null); throw new Error(body?.error || error.message); }
  if (data?.error) throw new Error(data.error);
  return data;
}
async function mountBookingContract() {
  go('contrato');
  const area = $('booking-contract');
  area.textContent = 'Preparando o contrato para assinatura…';
  try {
    const result = await bookingContract('create');
    if (result.signed) { renderPayment(); go('pagamento'); return; }
    if (result.environment === 'production' && location.protocol !== 'https:') { area.textContent = 'Abra esta etapa pelo site publicado para assinar com segurança.'; return; }
    if (!window.Clicksign) await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://cdn-public-library.clicksign.com/embedded/embedded.min-2.1.0.js'; script.onload = resolve; script.onerror = reject; document.body.append(script); });
    area.innerHTML = '<div id="booking-clicksign" style="height:560px;background:#fff;border-radius:10px;overflow:hidden"></div><button id="verify-booking-contract" class="button primary" style="margin-top:14px">Já assinei — verificar</button>';
    const widget = new window.Clicksign(result.signer_id); widget.endpoint = result.environment === 'production' ? 'https://app.clicksign.com' : 'https://sandbox.clicksign.com'; widget.origin = location.origin; widget.mount('booking-clicksign');
    $('verify-booking-contract').onclick = async () => { const status = await bookingContract('status'); if (status.signed) { renderPayment(); go('pagamento'); } else notice('A assinatura ainda está pendente.'); };
  } catch (error) { area.textContent = error.message || 'Não foi possível preparar o contrato.'; }
}

const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const at = (date, time) => new Date(`${iso(date)}T${time}:00-03:00`);
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
const dayName = (date) => date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

function notice(message) {
  const el = $('site-notice');
  el.innerHTML = message ? '<i class="ph ph-x-circle notice-icon"></i><span class="notice-copy"><b class="notice-title">Atenção</b><span>' + message + '</span></span>' : '';
  el.hidden = !message;
}

function go(step) {
  notice('');
  const index = steps.indexOf(step);
  history.pushState({}, '', `?etapa=${step}`);
  document.querySelectorAll('.step').forEach((el) => el.classList.toggle('active', el.dataset.step === step));
  document.querySelectorAll('.progress i').forEach((el, i) => el.classList.toggle('active', i <= index));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function slotRange(slot) {
  return { start: slot.start, end: slot.end };
}

function renderSummary() {
  if (!state.space || !state.day || !state.rate || !state.slot) return;
  $('selection-summary').innerHTML = `<b>${state.space.name}</b><br>${dayName(state.day)}<br>${state.slot.label}<br><strong>${money(state.rate.price_cents)}</strong>`;
}

function renderPayment() {
  if (!state.booking) return;
  $('payment-summary').innerHTML = `<div class="booking-ref"><span>RESERVA</span>${state.booking.booking_code}</div><div class="booking-details"><div class="booking-detail"><small>Espaço</small><b>${state.booking.space_name}</b></div><div class="booking-detail"><small>Horário</small><b>${state.booking.slot_label}</b></div><div class="booking-detail total"><small>Total a pagar</small><b>${money(state.booking.amount_cents)}</b></div></div><small>Seu horário está reservado por 24 horas.</small>`;
}

async function createPix() {
  if (!state.booking) return;
  const button = $('pay-pix');
  button.disabled = true;
  button.textContent = 'Gerando Pix…';
  const { data, error } = await sb.functions.invoke('mercado-pago-pix', {
    body: { booking_id: state.booking.id, payment_token: state.booking.payment_token }
  });
  button.disabled = false;
  button.innerHTML = pixButtonMarkup();
  if (error || !data?.qr_code_base64) {
    let message = data?.error || 'Não foi possível gerar o Pix. Tente novamente.';
    if (error?.context) {
      const body = await error.context.json().catch(() => null);
      message = body?.error || message;
    }
    $('pix-area').hidden = false;
    $('pix-area').innerHTML = `<p class="notice">${message}</p>`;
    return;
  }
  $('pix-area').hidden = false;
  $('pix-area').innerHTML = `<div class="pix-box"><p><b>Escaneie o QR Code com o app do seu banco</b></p><img src="data:image/png;base64,${data.qr_code_base64}" alt="QR Code Pix"/><p>Ou use o Pix Copia e Cola:</p><textarea class="pix-code" readonly>${data.qr_code}</textarea><button id="copy-pix" class="button secondary">Copiar código Pix</button></div>`;
  $('copy-pix').onclick = async () => {
    await navigator.clipboard.writeText(data.qr_code);
    $('copy-pix').textContent = 'Código copiado';
  };
}

async function loadMercadoPagoSdk() {
  if (window.MercadoPago) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function openCardPayment() {
  if (!state.booking) return;
  const area = document.createElement('div');
  area.id = 'card-payment-area';
  document.querySelector('.payment-methods').after(area);
  try {
    await loadMercadoPagoSdk();
    const mp = new window.MercadoPago(mercadoPagoPublicKey, { locale: 'pt-BR' });
    const bricks = mp.bricks();
    window.cardPaymentBrickController?.unmount();
    window.cardPaymentBrickController = await bricks.create('cardPayment', 'card-payment-area', {
      initialization: { amount: state.booking.amount_cents / 100 },
      callbacks: {
        onSubmit: (formData, additionalData) => new Promise(async (resolve, reject) => {
          const { data, error } = await sb.functions.invoke('mercado-pago-card', {
            body: {
              booking_id: state.booking.id,
              payment_token: state.booking.payment_token,
              card_token: formData.token,
              payment_method_id: formData.payment_method_id,
              payment_type: additionalData.paymentTypeId,
              installments: formData.installments
            }
          });
          if (error || data?.error) { notice(data?.error || 'Não foi possível processar o cartão.'); reject(); return; }
          notice('Pagamento enviado. Aguarde a confirmação.');
          resolve();
        }),
        onError: () => notice('Verifique os dados do cartão e tente novamente.')
      }
    });
  } catch {
    notice('Não foi possível carregar o formulário de cartão.');
  }
}

async function loadSpaces() {
  const { data, error } = await sb
    .from('spaces')
    .select('id,name,code,capacity,space_rates(id,rate_code,label,price_cents,booking_unit,days_of_week,start_time,end_time)')
    .eq('active', true)
    .order('name');
  if (error) {
    notice('Não foi possível carregar os espaços. Atualize a página.');
    return;
  }

  $('spaces').innerHTML = data.map((space) => `<button class="choice" data-space="${space.id}" aria-label="Selecionar ${space.name}"><b>${space.name}</b></button>`).join('');
  document.querySelectorAll('[data-space]').forEach((button) => {
    button.onclick = () => {
      state.space = data.find((space) => space.id === button.dataset.space);
      state.day = null;
      state.rate = null;
      state.slot = null;
      document.querySelectorAll('[data-space]').forEach((el) => el.classList.toggle('active', el === button));
      calendar();
    };
  });
}

function calendar() {
  const first = new Date(state.date.getFullYear(), state.date.getMonth(), 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = new Date(state.date.getFullYear(), state.date.getMonth() + 1, 0).getDate();
  $('month-label').textContent = first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  $('calendar').innerHTML = Array(first.getDay()).fill('<i></i>').join('') + Array.from({ length: days }, (_, index) => {
    const date = new Date(state.date.getFullYear(), state.date.getMonth(), index + 1);
    const closed = date < today || (date.getDay() === 0 && state.space?.code !== 'rooftop');
    const chosen = state.day && iso(date) === iso(state.day);
    return `<button class="day ${chosen ? 'active' : ''}" data-day="${iso(date)}" ${closed ? 'disabled' : ''}>${date.getDate()}</button>`;
  }).join('');
  document.querySelectorAll('[data-day]').forEach((button) => {
    button.onclick = () => {
      state.day = new Date(`${button.dataset.day}T12:00:00`);
      state.rate = null;
      state.slot = null;
      calendar();
      renderRates();
    };
  });
}

function availableRates() {
  if (!state.space || !state.day) return [];
  const day = state.day.getDay();
  return (state.space.space_rates || []).filter((rate) => !rate.days_of_week || rate.days_of_week.includes(day));
}

function renderRates() {
  const rates = availableRates();
  $('rates').innerHTML = '';
  $('times').innerHTML = '';
  if (!state.space || !state.day) {
    $('rate-help').textContent = 'Selecione primeiro um espaço e uma data.';
    return;
  }
  if (!rates.length) {
    $('rate-help').textContent = 'Não há modalidade disponível para esta data.';
    return;
  }
  $('rate-help').textContent = 'Escolha a modalidade.';
  $('rates').className = 'rate-grid';
  $('rates').innerHTML = rates.map((rate) => `<button class="rate-option ${state.rate?.id === rate.id ? 'active' : ''}" data-rate="${rate.id}"><b>${rate.label}</b><strong>${money(rate.price_cents)}</strong><small>${rate.booking_unit === 'hour' ? 'Escolha o horário depois' : 'Horário fixo conforme a modalidade'}</small></button>`).join('');
  document.querySelectorAll('[data-rate]').forEach((button) => {
    button.onclick = () => {
      state.rate = rates.find((rate) => rate.id === button.dataset.rate);
      state.slot = null;
      monthlyFields();
      renderRates();
      if (state.rate.booking_unit === 'hour') {
        renderSlots();
      } else {
        state.slot = createSlots(state.rate)[0];
        $('times').innerHTML = '';
        $('time-help').textContent = `Período selecionado: ${state.slot.label}.`;
        renderSummary();
      }
    };
  });
  if (state.rate?.booking_unit === 'hour') renderSlots();
}

function createSlots(rate) {
  const day = state.day.getDay();
  if (rate.booking_unit === 'event') {
    const start = at(state.day, rate.start_time.slice(0, 5));
    const end = at(new Date(state.day.getTime() + 86400000), '00:00');
    return [{ key: 'evento', label: `${rate.start_time.slice(0, 5)} às 00:00`, start, end }];
  }
  if (rate.booking_unit === 'day') {
    // Daily rates occupy every bookable hour for that date. Older rates may not
    // have times stored, so keep the same hours enforced by create_booking_hold.
    const startTime = typeof rate.start_time === 'string' ? rate.start_time.slice(0, 5) : '08:00';
    const defaultEndTime = state.day.getDay() === 6 ? '13:00' : '18:00';
    const endTime = typeof rate.end_time === 'string' ? rate.end_time.slice(0, 5) : defaultEndTime;
    const endsNextDay = endTime === '00:00';
    return [{
      key: 'diaria',
      label: `Diária · ${startTime} às ${endTime}`,
      start: at(state.day, startTime),
      end: at(endsNextDay ? new Date(state.day.getTime() + 86400000) : state.day, endTime)
    }];
  }
  if (rate.booking_unit === 'month') {
    const start = at(state.day, '08:00');
    const lastDayNextMonth = new Date(state.day.getFullYear(), state.day.getMonth() + 2, 0).getDate();
    const nextMonth = new Date(state.day.getFullYear(), state.day.getMonth() + 1, Math.min(state.day.getDate(), lastDayNextMonth));
    return [{ key: 'mensal', label: 'Mensal · 1 mês a partir das 08:00', start, end: at(nextMonth, '08:00') }];
  }
  const hours = day === 6 ? [8, 9, 10, 11, 12] : [8, 9, 10, 11, 13, 14, 15, 16, 17];
  return hours.map((hour) => ({ key: String(hour), label: `${String(hour).padStart(2, '0')}:00`, start: at(state.day, `${String(hour).padStart(2, '0')}:00`), end: at(state.day, `${String(hour + 1).padStart(2, '0')}:00`) }));
}

function ensureFixedSlot() {
  if (state.day && state.rate && state.rate.booking_unit !== 'hour' && !state.slot) {
    state.slot = createSlots(state.rate)[0];
  }
}

async function renderSlots() {
  if (!state.rate || !state.day) return;
  const slots = createSlots(state.rate);
  const range = slots.reduce((acc, slot) => ({ start: acc.start < slot.start ? acc.start : slot.start, end: acc.end > slot.end ? acc.end : slot.end }));
  const { data, error } = await sb.rpc('get_occupied_slots', { p_space_id: state.space.id, p_from: range.start.toISOString(), p_to: range.end.toISOString() });
  if (error) {
    $('time-help').textContent = 'Não foi possível consultar a agenda.';
    return;
  }
  $('time-help').textContent = state.rate.booking_unit === 'event' ? 'O Rooftop é reservado pelo período completo.' : 'Escolha um horário disponível.';
  $('times').innerHTML = slots.map((slot) => {
    const busy = data.some((booking) => new Date(booking.start_at) < slot.end && new Date(booking.end_at) > slot.start);
    return `<button class="time ${state.slot?.key === slot.key ? 'active' : ''}" data-slot="${slot.key}" ${busy ? 'disabled' : ''}>${slot.label}</button>`;
  }).join('');
  document.querySelectorAll('[data-slot]').forEach((button) => {
    button.onclick = () => {
      state.slot = slots.find((slot) => slot.key === button.dataset.slot);
      renderSlots();
      renderSummary();
    };
  });
}

document.querySelectorAll('[data-next]').forEach((button) => {
  button.onclick = () => {
    const next = button.dataset.next;
    if (next === 'agenda' && !state.space) return notice('Escolha um espaço para continuar.');
    if (next === 'dados') ensureFixedSlot();
    if (next === 'dados' && (!state.day || !state.rate || !state.slot)) return notice('Escolha data, modalidade e horário para continuar.');
    renderSummary();
    go(next);
  };
});
document.querySelectorAll('[data-back]').forEach((button) => button.onclick = () => go(button.dataset.back));
$('prev-month').onclick = () => { state.date = new Date(state.date.getFullYear(), state.date.getMonth() - 1, 1); calendar(); };
$('next-month').onclick = () => { state.date = new Date(state.date.getFullYear(), state.date.getMonth() + 1, 1); calendar(); };

$('booking-form').onsubmit = async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const button = event.submitter;
  button.disabled = true;
  $('form-status').textContent = 'Retendo sua reserva…';
  const { start, end } = slotRange(state.slot);
  const { data, error } = await sb.rpc('create_booking_hold', {
    p_space_id: state.space.id,
    p_rate_id: state.rate.id,
    p_start_at: start.toISOString(),
    p_end_at: end.toISOString(),
    p_customer_name: form.get('name'),
    p_customer_email: form.get('email'),
    p_customer_phone: form.get('phone'),
    p_customer_document: form.get('document'),
    p_customer_address: form.get('address'),
    p_company_name: form.get('company')
  });
  button.disabled = false;
  if (error) {
    $('form-status').textContent = error.message;
    return;
  }
  const booking = { ...data[0], space_name: state.space.name, slot_label: state.slot.label };
  state.booking = booking;
  sessionStorage.setItem('val-coworking-payment', JSON.stringify(booking));
  if (state.rate.booking_unit === 'month') { mountBookingContract(); return; }
  renderPayment();
  go('pagamento');
};

$('pay-pix').onclick = createPix;
function pixButtonMarkup() {
  return '<span class="method-icon"><i class="ph ph-qr-code"></i></span><span class="method-copy"><b>Pix</b><small>Gere o QR Code para pagar agora</small></span><i class="ph ph-caret-right method-arrow"></i>';
}
const pixButton = $('pay-pix');
pixButton.className = 'button payment-choice payment-choice--recommended';
pixButton.innerHTML = pixButtonMarkup();
const cardButton = document.querySelector('.payment-methods button[disabled]');
cardButton.disabled = false;
cardButton.id = 'pay-card';
cardButton.className = 'button payment-choice';
cardButton.innerHTML = '<span class="method-icon"><i class="ph ph-credit-card"></i></span><span class="method-copy"><b>Cartão</b><small>Informe os dados do cartão</small></span><i class="ph ph-caret-right method-arrow"></i>';
cardButton.onclick = openCardPayment;

loadSpaces();
calendar();
try {
  const savedBooking = sessionStorage.getItem('val-coworking-payment');
  if (savedBooking) state.booking = JSON.parse(savedBooking);
} catch {}
const requestedStep = new URLSearchParams(location.search).get('etapa');
if (requestedStep === 'pagamento' && state.booking) {
  renderPayment();
  go('pagamento');
} else {
  go('espaco');
}
