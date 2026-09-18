do $$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.create_multi_day_booking_hold(uuid,uuid,jsonb,text,text,text,text,text,text)'::regprocedure)
    into function_definition;

  function_definition := replace(
    function_definition,
    'local_start::date <> previous_date + 1',
    'local_start::date <> previous_date + (case when extract(dow from previous_date) = 6 then 2 else 1 end)'
  );

  execute function_definition;
end;
$$;
