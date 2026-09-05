alter table public.bookings
  add column if not exists customer_document text,
  add column if not exists customer_address text,
  add column if not exists company_name text,
  add column if not exists contract_required boolean not null default false,
  add column if not exists contract_status text not null default 'not_required',
  add column if not exists contract_signed_at timestamptz,
  add column if not exists clicksign_envelope_id text,
  add column if not exists clicksign_document_id text,
  add column if not exists clicksign_signer_id text,
  add column if not exists clicksign_ready_at timestamptz;

alter table public.bookings drop constraint if exists bookings_contract_status_check;
alter table public.bookings add constraint bookings_contract_status_check
  check (contract_status in ('not_required', 'pending_configuration', 'sent', 'signed')) not valid;

insert into public.space_rates (space_id, rate_code, label, price_cents, booking_unit, active)
select id, 'mensal', 'Mensal', 170000, 'month', true
from public.spaces
where code = 'sala-treinamento'
on conflict (space_id, rate_code) do update
  set label = excluded.label, price_cents = excluded.price_cents, booking_unit = excluded.booking_unit, active = true;

drop function if exists public.create_booking_hold(uuid, uuid, timestamptz, timestamptz, text, text, text);

create function public.create_booking_hold(
  p_space_id uuid,
  p_rate_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_document text default null,
  p_customer_address text default null,
  p_company_name text default null
)
returns table(id uuid, booking_code text, hold_expires_at timestamptz, amount_cents integer, payment_token uuid)
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $$
declare
  local_start timestamp;
  local_end timestamp;
  selected_rate public.space_rates%rowtype;
  expected_end timestamp;
  new_id uuid;
  new_code text;
  expires_at timestamptz;
  new_payment_token uuid;
  normalized_document text;
  needs_contract boolean;
begin
  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_customer_email), '') = '' or coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Preencha nome, e-mail e telefone';
  end if;
  perform private.enforce_public_rate_limit('booking_hold', p_customer_email, 5, interval '15 minutes');
  if not exists (select 1 from public.spaces s where s.id = p_space_id and s.active) then raise exception 'Espaço indisponível'; end if;
  select r.* into selected_rate from public.space_rates r where r.id = p_rate_id and r.space_id = p_space_id and r.active;
  if not found then raise exception 'Modalidade indisponível'; end if;

  local_start := p_start_at at time zone 'America/Sao_Paulo';
  local_end := p_end_at at time zone 'America/Sao_Paulo';
  if p_start_at < now() or p_end_at <= p_start_at then raise exception 'Horário inválido'; end if;
  if selected_rate.booking_unit = 'event' then
    if not extract(dow from local_start) = any(selected_rate.days_of_week) or local_start::time <> selected_rate.start_time or local_end::time <> time '00:00' or local_end::date <> local_start::date + 1 then raise exception 'Horário do Rooftop inválido'; end if;
  elsif selected_rate.booking_unit = 'hour' then
    if extract(dow from local_start) = 0 or local_end <> local_start + interval '1 hour' or (extract(dow from local_start) = 6 and (local_start::time < time '08:00' or local_end::time > time '13:00')) or (extract(dow from local_start) between 1 and 5 and (local_start::time < time '08:00' or local_end::time > time '18:00')) then raise exception 'Horário fora do funcionamento'; end if;
  elsif selected_rate.booking_unit = 'day' then
    expected_end := date_trunc('day', local_start) + case when extract(dow from local_start) = 6 then interval '13 hours' else interval '18 hours' end;
    if extract(dow from local_start) = 0 or local_start::time <> time '08:00' or local_end <> expected_end then raise exception 'Diária fora do funcionamento'; end if;
  elsif selected_rate.booking_unit = 'month' then
    expected_end := local_start + interval '1 month';
    if extract(dow from local_start) = 0 or local_start::time <> time '08:00' or local_end <> expected_end then raise exception 'Reserva mensal inválida'; end if;
  else raise exception 'Modalidade inválida'; end if;

  needs_contract := selected_rate.booking_unit = 'month';
  normalized_document := regexp_replace(coalesce(p_customer_document, ''), '[^0-9]', '', 'g');
  if needs_contract and (normalized_document !~ '^([0-9]{11}|[0-9]{14})$' or char_length(trim(coalesce(p_customer_address, ''))) < 8 or char_length(trim(coalesce(p_company_name, ''))) < 2) then
    raise exception 'Para a reserva mensal, informe empresa, endereço e CPF ou CNPJ do responsável.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_space_id::text));
  perform public.expire_stale_holds();
  new_id := gen_random_uuid(); new_code := 'VAL-' || upper(substr(replace(new_id::text, '-', ''), 1, 8)); expires_at := now() + interval '24 hours'; new_payment_token := gen_random_uuid();
  insert into public.bookings (id, booking_code, space_id, rate_id, amount_cents, payment_token, customer_name, customer_email, customer_phone, customer_document, customer_address, company_name, start_at, end_at, status, hold_expires_at, contract_required, contract_status)
  values (new_id, new_code, p_space_id, selected_rate.id, selected_rate.price_cents, new_payment_token, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone), nullif(normalized_document, ''), nullif(trim(p_customer_address), ''), nullif(trim(p_company_name), ''), p_start_at, p_end_at, 'pending_payment', expires_at, needs_contract, case when needs_contract then 'pending_configuration' else 'not_required' end);
  return query select new_id, new_code, expires_at, selected_rate.price_cents, new_payment_token;
exception when exclusion_violation then raise exception 'Horário indisponível';
end;
$$;
