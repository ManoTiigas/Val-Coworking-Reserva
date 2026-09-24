alter table public.bookings
  add column if not exists payment_started_at timestamptz;

create or replace function public.start_booking_payment_window(
  p_booking_id uuid,
  p_payment_token uuid
)
returns table(payment_started_at timestamptz, hold_expires_at timestamptz)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  target_booking public.bookings%rowtype;
  target_group_id uuid;
begin
  select * into target_booking
  from public.bookings
  where id = p_booking_id and payment_token = p_payment_token;

  if not found then raise exception 'Reserva não encontrada'; end if;
  if target_booking.status <> 'pending_payment' or target_booking.hold_expires_at <= now() then
    raise exception 'Esta reserva expirou. Escolha outro horário.';
  end if;

  target_group_id := target_booking.booking_group_id;
  if target_booking.payment_started_at is null then
    if target_group_id is null then
      update public.bookings
      set payment_started_at = now(), hold_expires_at = now() + interval '30 minutes'
      where id = target_booking.id and status = 'pending_payment';
    else
      update public.bookings
      set payment_started_at = now(), hold_expires_at = now() + interval '30 minutes'
      where booking_group_id = target_group_id and status = 'pending_payment';
    end if;
  end if;

  return query
  select b.payment_started_at, b.hold_expires_at
  from public.bookings b
  where b.id = target_booking.id;
end;
$$;
