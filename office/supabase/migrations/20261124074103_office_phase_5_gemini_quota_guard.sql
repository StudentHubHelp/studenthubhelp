-- Phase 5: Gemini Free Tier quota guard and server-side gateway.
-- Applied remotely as migration 20261124074103_office_phase_5_gemini_quota_guard.

create table if not exists office.office_gemini_quota_reservations (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  estimated_input_tokens integer not null check (estimated_input_tokens > 0),
  reserved_output_tokens integer not null check (reserved_output_tokens > 0),
  request_status text not null default 'reserved'
    check (request_status in ('reserved','success','rate_limited','quota_exceeded','error','blocked')),
  actual_input_tokens integer not null default 0 check (actual_input_tokens >= 0),
  actual_output_tokens integer not null default 0 check (actual_output_tokens >= 0),
  provider_error_code text,
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);
create index if not exists office_gemini_quota_reservations_created_idx
  on office.office_gemini_quota_reservations (created_at desc);
create index if not exists office_gemini_quota_reservations_model_created_idx
  on office.office_gemini_quota_reservations (model, created_at desc);
alter table office.office_gemini_quota_reservations enable row level security;
revoke all on table office.office_gemini_quota_reservations from public, anon, authenticated, service_role;

insert into office.office_settings (setting_key, setting_value, description, is_secret_reference)
values
  ('gemini_free_tier_confirmed', 'false'::jsonb, 'Owner confirmation that the Google AI Studio project has no billing account attached. Required before Gemini requests can run.', false),
  ('gemini_gateway_enabled', 'false'::jsonb, 'Global kill switch for Gemini requests. Remains off until API key and verified Free Tier caps are configured.', false),
  ('gemini_tpm_app_cap', 'null'::jsonb, 'Conservative application cap for total input plus reserved output tokens per minute. Must be lower than the exact project quota.', false),
  ('gemini_max_output_tokens', '512'::jsonb, 'Hard maximum output tokens per Gemini request. The browser cannot override this value.', false),
  ('gemini_api_key_secret_name', '"GEMINI_API_KEY"'::jsonb, 'Name of the Supabase Edge Function secret; the secret value is never stored in office_settings.', true)
on conflict (setting_key) do nothing;

create or replace function public.office_gemini_reserve(p_user_id uuid,p_estimated_input_tokens integer)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_model text; v_daily_cap integer; v_rpm_cap integer; v_tpm_cap integer; v_max_output integer;
  v_daily_count integer; v_minute_count integer; v_minute_tokens bigint;
  v_day_start timestamptz; v_reservation_id uuid;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa
    where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then raise exception using errcode='42501',message='owner_access_denied'; end if;
  if p_estimated_input_tokens is null or p_estimated_input_tokens<1 or p_estimated_input_tokens>16000 then
    raise exception using errcode='22023',message='invalid_input_token_estimate';
  end if;
  if coalesce((select setting_value='true'::jsonb from office.office_settings where setting_key='quota_guard_enabled'),false) is not true then
    raise exception using errcode='P0001',message='quota_guard_disabled';
  end if;
  if coalesce((select setting_value='true'::jsonb from office.office_settings where setting_key='gemini_gateway_enabled'),false) is not true then
    raise exception using errcode='P0001',message='gemini_gateway_disabled';
  end if;
  if coalesce((select setting_value='true'::jsonb from office.office_settings where setting_key='gemini_free_tier_confirmed'),false) is not true then
    raise exception using errcode='P0001',message='free_tier_not_confirmed';
  end if;
  if (select setting_value from office.office_settings where setting_key='api_billing_mode') is distinct from '"free_tier_only"'::jsonb then
    raise exception using errcode='P0001',message='paid_billing_mode_forbidden';
  end if;
  select setting_value #>> '{}' into v_model from office.office_settings where setting_key='ai_model';
  if v_model is distinct from 'gemini-2.5-flash-lite' then
    raise exception using errcode='P0001',message='model_not_allowlisted';
  end if;
  select nullif(setting_value #>> '{}','')::integer into v_daily_cap from office.office_settings where setting_key='gemini_daily_app_cap';
  select nullif(setting_value #>> '{}','')::integer into v_rpm_cap from office.office_settings where setting_key='gemini_rpm_app_cap';
  select nullif(setting_value #>> '{}','')::integer into v_tpm_cap from office.office_settings where setting_key='gemini_tpm_app_cap';
  select nullif(setting_value #>> '{}','')::integer into v_max_output from office.office_settings where setting_key='gemini_max_output_tokens';
  if coalesce(v_daily_cap,0)<1 or coalesce(v_rpm_cap,0)<1 or coalesce(v_tpm_cap,0)<1 or coalesce(v_max_output,0)<1 then
    raise exception using errcode='P0001',message='free_tier_caps_not_configured';
  end if;
  if v_daily_cap>10000 or v_rpm_cap>100 or v_tpm_cap>250000 or v_max_output>2048 then
    raise exception using errcode='22023',message='application_cap_exceeds_safety_ceiling';
  end if;
  if p_estimated_input_tokens+v_max_output>v_tpm_cap then
    raise exception using errcode='P0001',message='request_exceeds_tpm_app_cap';
  end if;
  perform pg_advisory_xact_lock(hashtext('office_gemini_quota:'||v_model)::bigint);
  v_day_start := date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  select count(*)::integer into v_daily_count from office.office_gemini_quota_reservations
  where model=v_model and created_at>=v_day_start;
  if v_daily_count>=v_daily_cap then raise exception using errcode='P0001',message='daily_app_cap_reached'; end if;
  select count(*)::integer,coalesce(sum(estimated_input_tokens+reserved_output_tokens),0)
  into v_minute_count,v_minute_tokens from office.office_gemini_quota_reservations
  where model=v_model and created_at>=now()-interval '1 minute';
  if v_minute_count>=v_rpm_cap then raise exception using errcode='P0001',message='rpm_app_cap_reached'; end if;
  if v_minute_tokens+p_estimated_input_tokens+v_max_output>v_tpm_cap then
    raise exception using errcode='P0001',message='tpm_app_cap_reached';
  end if;
  insert into office.office_gemini_quota_reservations(model,estimated_input_tokens,reserved_output_tokens,request_status)
  values(v_model,p_estimated_input_tokens,v_max_output,'reserved') returning id into v_reservation_id;
  return jsonb_build_object('reservation_id',v_reservation_id,'model',v_model,'max_output_tokens',v_max_output,
    'daily_used',v_daily_count+1,'daily_cap',v_daily_cap,'rpm_used',v_minute_count+1,'rpm_cap',v_rpm_cap,
    'tpm_reserved',v_minute_tokens+p_estimated_input_tokens+v_max_output,'tpm_cap',v_tpm_cap);
end;
$function$;

create or replace function public.office_gemini_finalize(
  p_user_id uuid,p_reservation_id uuid,p_request_status text,
  p_actual_input_tokens integer default 0,p_actual_output_tokens integer default 0,p_provider_error_code text default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_res office.office_gemini_quota_reservations%rowtype;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa
    where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then raise exception using errcode='42501',message='owner_access_denied'; end if;
  if p_request_status not in ('success','rate_limited','quota_exceeded','error','blocked') then
    raise exception using errcode='22023',message='invalid_request_status';
  end if;
  if coalesce(p_actual_input_tokens,0)<0 or coalesce(p_actual_output_tokens,0)<0 then
    raise exception using errcode='22023',message='invalid_token_usage';
  end if;
  select * into v_res from office.office_gemini_quota_reservations where id=p_reservation_id for update;
  if not found then raise exception using errcode='22023',message='reservation_not_found'; end if;
  if v_res.request_status<>'reserved' then raise exception using errcode='22023',message='reservation_already_finalized'; end if;
  update office.office_gemini_quota_reservations set request_status=p_request_status,
    actual_input_tokens=coalesce(p_actual_input_tokens,0),actual_output_tokens=coalesce(p_actual_output_tokens,0),
    provider_error_code=left(p_provider_error_code,80),finalized_at=now() where id=p_reservation_id;
  insert into office.office_ai_usage(employee_id,task_id,provider,model,request_status,input_tokens,output_tokens,request_count,estimated_cost,metadata)
  values(null,null,'google',v_res.model,p_request_status,coalesce(p_actual_input_tokens,0),
    coalesce(p_actual_output_tokens,0),1,0,
    jsonb_build_object('reservation_id',p_reservation_id,'provider_error_code',left(p_provider_error_code,80)));
  return jsonb_build_object('ok',true,'request_status',p_request_status);
end;
$function$;

create or replace function public.office_gemini_quota_status(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_model text; v_daily_cap integer; v_rpm_cap integer; v_tpm_cap integer;
  v_daily_used integer; v_rpm_used integer; v_tpm_used bigint;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa
    where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then raise exception using errcode='42501',message='owner_access_denied'; end if;
  select setting_value #>> '{}' into v_model from office.office_settings where setting_key='ai_model';
  select nullif(setting_value #>> '{}','')::integer into v_daily_cap from office.office_settings where setting_key='gemini_daily_app_cap';
  select nullif(setting_value #>> '{}','')::integer into v_rpm_cap from office.office_settings where setting_key='gemini_rpm_app_cap';
  select nullif(setting_value #>> '{}','')::integer into v_tpm_cap from office.office_settings where setting_key='gemini_tpm_app_cap';
  select count(*)::integer into v_daily_used from office.office_gemini_quota_reservations
    where model=v_model and created_at >= (date_trunc('day',now() at time zone 'UTC') at time zone 'UTC');
  select count(*)::integer,coalesce(sum(estimated_input_tokens+reserved_output_tokens),0)
    into v_rpm_used,v_tpm_used from office.office_gemini_quota_reservations
    where model=v_model and created_at>=now()-interval '1 minute';
  return jsonb_build_object(
    'provider','google','model',v_model,
    'billing_mode',(select setting_value #>> '{}' from office.office_settings where setting_key='api_billing_mode'),
    'quota_guard_enabled',coalesce((select (setting_value #>> '{}')::boolean from office.office_settings where setting_key='quota_guard_enabled'),false),
    'gateway_enabled',coalesce((select (setting_value #>> '{}')::boolean from office.office_settings where setting_key='gemini_gateway_enabled'),false),
    'free_tier_confirmed',coalesce((select (setting_value #>> '{}')::boolean from office.office_settings where setting_key='gemini_free_tier_confirmed'),false),
    'daily_app_cap',v_daily_cap,'rpm_app_cap',v_rpm_cap,'tpm_app_cap',v_tpm_cap,
    'max_output_tokens',(select nullif(setting_value #>> '{}','')::integer from office.office_settings where setting_key='gemini_max_output_tokens'),
    'daily_used',v_daily_used,'rpm_used',v_rpm_used,'tpm_reserved',v_tpm_used,
    'ready',(coalesce((select (setting_value #>> '{}')::boolean from office.office_settings where setting_key='quota_guard_enabled'),false)
      and coalesce((select (setting_value #>> '{}')::boolean from office.office_settings where setting_key='gemini_gateway_enabled'),false)
      and coalesce((select (setting_value #>> '{}')::boolean from office.office_settings where setting_key='gemini_free_tier_confirmed'),false)
      and v_daily_cap is not null and v_daily_cap>0 and v_rpm_cap is not null and v_rpm_cap>0
      and v_tpm_cap is not null and v_tpm_cap>0 and v_model='gemini-2.5-flash-lite')
  );
end;
$function$;

revoke all on function public.office_gemini_reserve(uuid,integer) from public,anon,authenticated;
revoke all on function public.office_gemini_finalize(uuid,uuid,text,integer,integer,text) from public,anon,authenticated;
revoke all on function public.office_gemini_quota_status(uuid) from public,anon,authenticated;
grant execute on function public.office_gemini_reserve(uuid,integer) to service_role;
grant execute on function public.office_gemini_finalize(uuid,uuid,text,integer,integer,text) to service_role;
grant execute on function public.office_gemini_quota_status(uuid) to service_role;
