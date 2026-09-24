-- New reservations expire 30 minutes after creation.

create or replace function public.create_booking_hold(
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
  new_id := gen_random_uuid(); new_code := 'VAL-' || upper(substr(replace(new_id::text, '-', ''), 1, 8)); expires_at := now() + interval '30 minutes'; new_payment_token := gen_random_uuid();
  insert into public.bookings (id, booking_code, space_id, rate_id, amount_cents, payment_token, customer_name, customer_email, customer_phone, customer_document, customer_address, company_name, start_at, end_at, status, hold_expires_at, contract_required, contract_status)
  values (new_id, new_code, p_space_id, selected_rate.id, selected_rate.price_cents, new_payment_token, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone), nullif(normalized_document, ''), nullif(trim(p_customer_address), ''), nullif(trim(p_company_name), ''), p_start_at, p_end_at, 'pending_payment', expires_at, needs_contract, case when needs_contract then 'pending_configuration' else 'not_required' end);
  return query select new_id, new_code, expires_at, selected_rate.price_cents, new_payment_token;
exception when exclusion_violation then raise exception 'Horário indisponível';
end;
$$;

create or replace function public.create_multi_day_booking_hold(
  p_space_id uuid,
  p_rate_id uuid,
  p_occurrences jsonb,
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
  selected_rate public.space_rates%rowtype;
  occurrence jsonb;
  occurrence_start timestamptz;
  occurrence_end timestamptz;
  local_start timestamp;
  local_end timestamp;
  expected_end timestamp;
  previous_date date;
  expected_start_time time;
  expected_end_time time;
  new_id uuid := gen_random_uuid();
  new_group_id uuid := gen_random_uuid();
  new_code text := 'VAL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  expires_at timestamptz := now() + interval '30 minutes';
  new_payment_token uuid := gen_random_uuid();
  occurrence_count integer;
  occurrence_number integer := 0;
begin
  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_customer_email), '') = '' or coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Preencha nome, e-mail e telefone';
  end if;
  if jsonb_typeof(p_occurrences) <> 'array' then raise exception 'Datas inválidas'; end if;
  occurrence_count := jsonb_array_length(p_occurrences);
  if occurrence_count < 2 then raise exception 'Selecione pelo menos duas datas'; end if;

  perform private.enforce_public_rate_limit('booking_hold', p_customer_email, 5, interval '15 minutes');
  if not exists (select 1 from public.spaces s where s.id = p_space_id and s.active) then raise exception 'Espaço indisponível'; end if;
  select r.* into selected_rate from public.space_rates r where r.id = p_rate_id and r.space_id = p_space_id and r.active;
  if not found or selected_rate.booking_unit not in ('day', 'hour') then raise exception 'Modalidade indisponível para várias datas'; end if;

  perform pg_advisory_xact_lock(hashtext(p_space_id::text));
  perform public.expire_stale_holds();

  for occurrence in select value from jsonb_array_elements(p_occurrences) loop
    occurrence_number := occurrence_number + 1;
    occurrence_start := (occurrence->>'start_at')::timestamptz;
    occurrence_end := (occurrence->>'end_at')::timestamptz;
    local_start := occurrence_start at time zone 'America/Sao_Paulo';
    local_end := occurrence_end at time zone 'America/Sao_Paulo';

    if occurrence_start < now() or occurrence_end <= occurrence_start then raise exception 'Horário inválido'; end if;
    if previous_date is not null and local_start::date <> previous_date + (case when extract(dow from previous_date) = 6 then 2 else 1 end) then raise exception 'As datas devem ser consecutivas'; end if;
    if extract(dow from local_start) = 0 or (selected_rate.days_of_week is not null and not extract(dow from local_start) = any(selected_rate.days_of_week)) then raise exception 'Uma das datas não está disponível para esta modalidade'; end if;

    if selected_rate.booking_unit = 'hour' then
      if occurrence_end <> occurrence_start + interval '1 hour'
        or (extract(dow from local_start) = 6 and (local_start::time < time '08:00' or local_end::time > time '13:00'))
        or (extract(dow from local_start) between 1 and 5 and (local_start::time < time '08:00' or local_end::time > time '18:00')) then
        raise exception 'Horário fora do funcionamento';
      end if;
      if expected_start_time is null then
        expected_start_time := local_start::time;
        expected_end_time := local_end::time;
      elsif local_start::time <> expected_start_time or local_end::time <> expected_end_time then
        raise exception 'Escolha o mesmo horário para todas as datas';
      end if;
    else
      expected_end := date_trunc('day', local_start) + case when extract(dow from local_start) = 6 then interval '13 hours' else interval '18 hours' end;
      if local_start::time <> time '08:00' or local_end <> expected_end then raise exception 'Diária fora do funcionamento'; end if;
    end if;

    insert into public.bookings (id, booking_code, booking_group_id, space_id, rate_id, amount_cents, payment_token, customer_name, customer_email, customer_phone, start_at, end_at, status, hold_expires_at, contract_required, contract_status)
    values (
      case when occurrence_number = 1 then new_id else gen_random_uuid() end,
      case when occurrence_number = 1 then new_code else new_code || '-' || lpad(occurrence_number::text, 2, '0') end,
      new_group_id,
      p_space_id,
      selected_rate.id,
      case when occurrence_number = 1 then selected_rate.price_cents * occurrence_count else 0 end,
      case when occurrence_number = 1 then new_payment_token else gen_random_uuid() end,
      trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone), occurrence_start, occurrence_end,
      'pending_payment', expires_at, false, 'not_required'
    );
    previous_date := local_start::date;
  end loop;

  return query select new_id, new_code, expires_at, selected_rate.price_cents * occurrence_count, new_payment_token;
exception when exclusion_violation then raise exception 'Uma ou mais datas ou horários já estão reservados';
end;
$$;
