create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.contact_email_rate_limits (
  rate_key text primary key check (length(rate_key) = 64),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);
alter table private.contact_email_rate_limits enable row level security;
revoke all on table private.contact_email_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table private.contact_email_rate_limits to service_role;

create or replace function public.consume_contact_email_rate_limit(p_rate_key text, p_limit integer, p_window_seconds integer)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = ''
as $$
declare v_count integer; v_started timestamptz;
begin
  if p_rate_key is null or length(p_rate_key) <> 64 or p_limit < 1 or p_limit > 100 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit parameters';
  end if;
  insert into private.contact_email_rate_limits as current_limit (rate_key,window_started_at,request_count,updated_at)
  values (p_rate_key,clock_timestamp(),1,clock_timestamp())
  on conflict (rate_key) do update set
    window_started_at = case when current_limit.window_started_at <= clock_timestamp()-make_interval(secs=>p_window_seconds) then clock_timestamp() else current_limit.window_started_at end,
    request_count = case when current_limit.window_started_at <= clock_timestamp()-make_interval(secs=>p_window_seconds) then 1 else current_limit.request_count+1 end,
    updated_at = clock_timestamp()
  returning current_limit.request_count,current_limit.window_started_at into v_count,v_started;
  if random() < 0.02 then delete from private.contact_email_rate_limits where updated_at < clock_timestamp()-interval '1 day'; end if;
  return query select v_count <= p_limit,greatest(0,ceil(extract(epoch from (v_started+make_interval(secs=>p_window_seconds)-clock_timestamp())))::integer);
end; $$;
revoke all on function public.consume_contact_email_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_contact_email_rate_limit(text,integer,integer) to service_role;
