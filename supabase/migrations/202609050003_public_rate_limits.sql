-- Rate limits live outside the public schema so they cannot be read through the Data API.
create schema if not exists private;

create table if not exists private.request_rate_limits (
  bucket text primary key,
  window_started_at timestamptz not null default now(),
  hits integer not null default 0 check (hits >= 0),
  updated_at timestamptz not null default now()
);

revoke all on schema private from public;
revoke all on table private.request_rate_limits from public;

create or replace function private.enforce_public_rate_limit(
  p_action text,
  p_subject text,
  p_limit integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path to 'private', 'pg_catalog', 'pg_temp'
as $$
declare
  v_headers jsonb;
  v_ip text;
  v_identity text;
  v_bucket text;
  v_hits integer;
begin
  if p_limit < 1 or p_window <= interval '0 seconds' then
    raise exception 'Configuração de limite inválida';
  end if;

  v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_ip := nullif(trim(split_part(coalesce(
    v_headers ->> 'x-forwarded-for',
    v_headers ->> 'cf-connecting-ip',
    v_headers ->> 'x-real-ip',
    ''
  ), ',', 1)), '');
  v_identity := coalesce(nullif(lower(trim(p_subject)), '') || ':' || coalesce(v_ip, 'unknown'), v_ip, 'anonymous');
  v_bucket := md5(p_action || ':' || v_identity);

  insert into private.request_rate_limits as limits (bucket, window_started_at, hits, updated_at)
  values (v_bucket, now(), 1, now())
  on conflict (bucket) do update
    set window_started_at = case
          when limits.window_started_at + p_window <= now() then now()
          else limits.window_started_at
        end,
        hits = case
          when limits.window_started_at + p_window <= now() then 1
          else limits.hits + 1
        end,
        updated_at = now()
  returning hits into v_hits;

  if v_hits > p_limit then
    raise exception 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
  end if;
end;
$$;

create or replace function public.get_occupied_slots(
  p_space_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table(start_at timestamptz, end_at timestamptz, status public.booking_status)
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $$
begin
  perform private.enforce_public_rate_limit('availability', null, 90, interval '1 minute');
  perform public.expire_stale_holds();

  return query
  select b.start_at, b.end_at, b.status
    from public.bookings b
   where b.space_id = p_space_id
     and b.status in ('pending_payment', 'paid')
     and b.start_at < p_to
     and b.end_at > p_from
   order by b.start_at;
end;
$$;

create or replace function public.create_booking_hold(
  p_space_id uuid,
  p_rate_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text
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
begin
  if coalesce(trim(p_customer_name), '') = ''
     or coalesce(trim(p_customer_email), '') = ''
     or coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Preencha nome, e-mail e telefone';
  end if;
  perform private.enforce_public_rate_limit('booking_hold', p_customer_email, 5, interval '15 minutes');

  if not exists (select 1 from public.spaces as s where s.id = p_space_id and s.active) then
    raise exception 'Espaço indisponível';
  end if;

  select r.* into selected_rate
  from public.space_rates as r
  where r.id = p_rate_id and r.space_id = p_space_id and r.active;
  if not found then raise exception 'Modalidade indisponível'; end if;

  local_start := p_start_at at time zone 'America/Sao_Paulo';
  local_end := p_end_at at time zone 'America/Sao_Paulo';
  if p_start_at < now() or p_end_at <= p_start_at then raise exception 'Horário inválido'; end if;

  if selected_rate.booking_unit = 'event' then
    if not extract(dow from local_start) = any(selected_rate.days_of_week)
       or local_start::time <> selected_rate.start_time
       or local_end::time <> time '00:00'
       or local_end::date <> local_start::date + 1 then raise exception 'Horário do Rooftop inválido'; end if;
  elsif selected_rate.booking_unit = 'hour' then
    if extract(dow from local_start) = 0 or local_end <> local_start + interval '1 hour'
       or (extract(dow from local_start) = 6 and (local_start::time < time '08:00' or local_end::time > time '13:00'))
       or (extract(dow from local_start) between 1 and 5 and (local_start::time < time '08:00' or local_end::time > time '18:00')) then raise exception 'Horário fora do funcionamento'; end if;
  elsif selected_rate.booking_unit = 'day' then
    expected_end := date_trunc('day', local_start) + case when extract(dow from local_start) = 6 then interval '13 hours' else interval '18 hours' end;
    if extract(dow from local_start) = 0 or local_start::time <> time '08:00' or local_end <> expected_end then raise exception 'Diária fora do funcionamento'; end if;
  elsif selected_rate.booking_unit = 'month' then
    expected_end := local_start + interval '1 month';
    if extract(dow from local_start) = 0 or local_start::time <> time '08:00' or local_end <> expected_end then raise exception 'Reserva mensal inválida'; end if;
  else
    raise exception 'Modalidade inválida';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_space_id::text));
  perform public.expire_stale_holds();
  new_id := gen_random_uuid();
  new_code := 'VAL-' || upper(substr(replace(new_id::text, '-', ''), 1, 8));
  expires_at := now() + interval '24 hours';
  new_payment_token := gen_random_uuid();

  insert into public.bookings (id, booking_code, space_id, rate_id, amount_cents, payment_token, customer_name, customer_email, customer_phone, start_at, end_at, status, hold_expires_at)
  values (new_id, new_code, p_space_id, selected_rate.id, selected_rate.price_cents, new_payment_token, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone), p_start_at, p_end_at, 'pending_payment', expires_at);
  return query select new_id, new_code, expires_at, selected_rate.price_cents, new_payment_token;
exception
  when exclusion_violation then raise exception 'Horário indisponível';
end;
$$;

create or replace function public.create_plan_application(
  p_plan_key text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_company_name text,
  p_customer_address text,
  p_company_cnpj text default null,
  p_customer_document text default null
)
returns table(id uuid, request_code text, access_token uuid, contract_status text)
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $$
declare
  v_plan_name text;
  v_amount integer;
  v_billing_label text;
  v_code text;
  v_document text;
begin
  if p_customer_name is null or char_length(trim(p_customer_name)) < 3 then raise exception 'Informe seu nome completo.'; end if;
  if p_customer_email is null or p_customer_email !~* '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$' then raise exception 'Informe um e-mail válido.'; end if;
  if p_customer_phone is null or char_length(trim(p_customer_phone)) < 8 then raise exception 'Informe um telefone válido.'; end if;
  if p_company_name is null or char_length(trim(p_company_name)) < 2 then raise exception 'Informe o nome da empresa.'; end if;
  if p_customer_address is null or char_length(trim(p_customer_address)) < 8 then raise exception 'Informe o endereço completo da contratante.'; end if;
  v_document := regexp_replace(coalesce(p_customer_document, ''), '\\D', '', 'g');
  if v_document !~ '^(\\d{11}|\\d{14})$' then raise exception 'Informe um CPF ou CNPJ válido.'; end if;
  perform private.enforce_public_rate_limit('plan_application', p_customer_email, 4, interval '15 minutes');

  case p_plan_key
    when 'fiscal_monthly' then v_plan_name := 'Endereço Fiscal'; v_amount := 7800; v_billing_label := 'Mensal';
    when 'fiscal_annual' then v_plan_name := 'Endereço Fiscal'; v_amount := 69800; v_billing_label := 'Anual à vista';
    when 'fiscal_biennial' then v_plan_name := 'Endereço Fiscal'; v_amount := 91200; v_billing_label := 'Bianual à vista';
    when 'premium_monthly' then v_plan_name := 'Plano Premium'; v_amount := 19800; v_billing_label := 'Mensal';
    when 'premium_annual' then v_plan_name := 'Plano Premium'; v_amount := 169900; v_billing_label := 'Anual à vista';
    when 'premium_biennial' then v_plan_name := 'Plano Premium'; v_amount := 219900; v_billing_label := 'Bianual à vista';
    else raise exception 'Plano inválido.';
  end case;
  v_code := 'PLN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  return query insert into public.plan_applications (request_code, plan_key, plan_name, amount_cents, billing_label, customer_name, customer_email, customer_phone, customer_address, company_name, company_cnpj, customer_document)
  values (v_code, p_plan_key, v_plan_name, v_amount, v_billing_label, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone), trim(p_customer_address), trim(p_company_name), nullif(trim(p_company_cnpj), ''), v_document)
  returning plan_applications.id, plan_applications.request_code, plan_applications.access_token, plan_applications.contract_status;
end;
$$;
