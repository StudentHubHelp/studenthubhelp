create or replace function public.set_appointment_defaults()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  new.status := 'pending';
  if new.source is distinct from 'website' then
    new.source := 'website';
  end if;
  new.admin_note := null;
  new.confirmed_date := null;
  new.confirmed_time := null;
  new.updated_at := timezone('utc', now());
  if new.appointment_code is null or btrim(new.appointment_code) = '' then
    new.appointment_code := 'SHH-APT-' || upper(substr(md5(random()::text || clock_timestamp()::text),1,10));
  end if;
  return new;
end;
$function$;

drop policy if exists "public can submit appointments" on public.appointments;
create policy "public can submit appointments"
on public.appointments
as permissive
for insert
to anon, authenticated
with check (status = 'pending' and source = 'website');
