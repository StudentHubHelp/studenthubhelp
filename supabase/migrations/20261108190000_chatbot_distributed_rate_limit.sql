-- Durable, atomic rate limiting for the StudentHubHelp chatbot.
create table if not exists private.chatbot_rate_limits (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  hit_count integer not null default 0,
  primary key (scope, key_hash)
);
revoke all on table private.chatbot_rate_limits from public, anon, authenticated;
grant all on table private.chatbot_rate_limits to service_role;

create or replace function public.consume_chatbot_rate_limit(
  p_scope text, p_key text, p_limit integer, p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if p_scope not in ('chat', 'owner_lead') or p_key is null or length(p_key)=0
     or p_limit < 1 or p_limit > 1000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit arguments';
  end if;
  insert into private.chatbot_rate_limits(scope,key_hash,window_started_at,hit_count)
  values(p_scope,md5(p_key),now(),1)
  on conflict(scope,key_hash) do update
  set window_started_at=case when private.chatbot_rate_limits.window_started_at <= now()-make_interval(secs=>p_window_seconds) then now() else private.chatbot_rate_limits.window_started_at end,
      hit_count=case when private.chatbot_rate_limits.window_started_at <= now()-make_interval(secs=>p_window_seconds) then 1 else private.chatbot_rate_limits.hit_count+1 end
  returning hit_count into v_count;
  if mod(extract(epoch from now())::bigint,100)=0 then
    delete from private.chatbot_rate_limits where window_started_at < now()-interval '2 days';
  end if;
  return v_count <= p_limit;
end;
$$;
revoke all on function public.consume_chatbot_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_chatbot_rate_limit(text,text,integer,integer) to service_role;
