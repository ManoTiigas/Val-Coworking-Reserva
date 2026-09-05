insert into public.space_rates (space_id, rate_code, label, price_cents, booking_unit, active)
select id, 'mensal', 'Mensal', 170000, 'month', true
from public.spaces
where code = 'sala-reuniao'
on conflict (space_id, rate_code) do update
  set label = excluded.label,
      price_cents = excluded.price_cents,
      booking_unit = excluded.booking_unit,
      active = true;
