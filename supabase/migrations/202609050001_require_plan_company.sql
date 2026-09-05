alter table public.plan_applications
  drop constraint if exists plan_applications_company_required;

alter table public.plan_applications
  add constraint plan_applications_company_required
  check (company_name is not null and char_length(trim(company_name)) >= 2) not valid;
