create or replace function public.block_monthly_payment_before_signature()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.contract_required
     and new.contract_status <> 'signed'
     and new.payment_reference is distinct from old.payment_reference
     and new.payment_reference is not null then
    raise exception 'Assine o contrato mensal antes de gerar o pagamento.';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_block_unsigned_monthly_payment on public.bookings;
create trigger bookings_block_unsigned_monthly_payment
before update of payment_reference on public.bookings
for each row execute function public.block_monthly_payment_before_signature();
