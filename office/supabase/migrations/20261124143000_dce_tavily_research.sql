-- DCE public web research: Tavily integration and conservative usage guard.
create table if not exists office.office_external_api_usage (
  provider_key text not null,
  usage_month date not null,
  usage_day date not null,
  credits_used integer not null default 0 check (credits_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider_key, usage_month, usage_day)
);
alter table office.office_external_api_usage enable row level security;
revoke all on table office.office_external_api_usage from public, anon, authenticated, service_role;

create or replace function public.office_dce_reserve_tavily_credit(
  p_user_id uuid,
  p_credits integer default 1
)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_month date := date_trunc('month', timezone('utc', now()))::date;
  v_day date := timezone('utc', now())::date;
  v_month_used integer := 0;
  v_day_used integer := 0;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa
    where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then raise exception using errcode='42501', message='owner_access_denied'; end if;
  if p_credits not in (0,1) then
    raise exception using errcode='22023', message='invalid_credit_reservation';
  end if;
  if not exists (
    select 1 from office.office_employees
    where role_key='data_collection_executive' and status='active'
  ) then raise exception using errcode='22023', message='employee_role_unavailable'; end if;

  perform pg_advisory_xact_lock(hashtext('office:tavily:' || p_user_id::text)::bigint);
  select coalesce(sum(credits_used),0)::integer into v_month_used
  from office.office_external_api_usage where provider_key='tavily' and usage_month=v_month;
  select coalesce(max(credits_used),0)::integer into v_day_used
  from office.office_external_api_usage
  where provider_key='tavily' and usage_month=v_month and usage_day=v_day;

  if p_credits=1 and (v_month_used+1>800 or v_day_used+1>30) then
    raise exception using errcode='22023', message='dce_usage_limit_reached';
  end if;
  if p_credits=1 then
    insert into office.office_external_api_usage(provider_key,usage_month,usage_day,credits_used)
    values('tavily',v_month,v_day,1)
    on conflict(provider_key,usage_month,usage_day)
    do update set credits_used=office.office_external_api_usage.credits_used+1, updated_at=now();
    v_month_used:=v_month_used+1;
    v_day_used:=v_day_used+1;
  end if;
  return jsonb_build_object(
    'authorized',true,'role_key','data_collection_executive',
    'month_used',v_month_used,'month_limit',800,
    'day_used',v_day_used,'day_limit',30
  );
end;
$function$;

revoke all on function public.office_dce_reserve_tavily_credit(uuid,integer) from public, anon, authenticated;
grant execute on function public.office_dce_reserve_tavily_credit(uuid,integer) to service_role;

insert into office.office_integrations(
  provider_key,display_name,connection_status,access_mode,secret_reference,allowed_scopes,notes
) values (
  'tavily','Tavily Web Search & Public Website Extract','needs_secret','read_only','TAVILY_API_KEY',
  '["public_web_search","public_website_extract","source_citation"]'::jsonb,
  'DCE-only public web research. Basic search/extract only; app caps at 800 credits/month and 30/day. No paid fallback or external writes.'
) on conflict(provider_key) do update set
  display_name=excluded.display_name, access_mode='read_only',
  secret_reference='TAVILY_API_KEY', allowed_scopes=excluded.allowed_scopes,
  notes=excluded.notes, updated_at=now();

insert into office.office_integration_action_catalog(
  provider_key,action_key,description,execution_mode,requires_approval,proposal_enabled,execution_enabled
) values
  ('tavily','public_web_search','Search public web pages for DCE research with source URLs.','read_only',false,false,false),
  ('tavily','public_website_extract','Extract readable text from validated public HTTPS pages.','read_only',false,false,false)
on conflict(provider_key,action_key) do update set
  description=excluded.description, execution_mode='read_only',
  requires_approval=false, proposal_enabled=false, execution_enabled=false;
