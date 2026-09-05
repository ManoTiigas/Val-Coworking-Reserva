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
  if p_customer_email is null or lower(trim(p_customer_email)) !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Informe um e-mail válido.'; end if;
  if p_customer_phone is null or char_length(trim(p_customer_phone)) < 8 then raise exception 'Informe um telefone válido.'; end if;
  if p_company_name is null or char_length(trim(p_company_name)) < 2 then raise exception 'Informe o nome da empresa.'; end if;
  if p_customer_address is null or char_length(trim(p_customer_address)) < 8 then raise exception 'Informe o endereço completo da contratante.'; end if;
  v_document := regexp_replace(coalesce(p_customer_document, ''), '[^0-9]', '', 'g');
  if v_document !~ '^([0-9]{11}|[0-9]{14})$' then raise exception 'Informe um CPF ou CNPJ válido.'; end if;
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
  return query
  insert into public.plan_applications (
    request_code, plan_key, plan_name, amount_cents, billing_label,
    customer_name, customer_email, customer_phone, customer_address, company_name, company_cnpj, customer_document
  ) values (
    v_code, p_plan_key, v_plan_name, v_amount, v_billing_label,
    trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone), trim(p_customer_address), trim(p_company_name), nullif(trim(p_company_cnpj), ''), v_document
  ) returning plan_applications.id, plan_applications.request_code, plan_applications.access_token, plan_applications.contract_status;
end;
$$;
