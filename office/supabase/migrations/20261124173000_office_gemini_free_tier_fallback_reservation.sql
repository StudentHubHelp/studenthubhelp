insert into office.office_settings(setting_key,setting_value,description,is_secret_reference)
values ('ai_fallback_model','"gemini-3.1-flash-lite"'::jsonb,
  'Free Tier-only fallback model used only after two transient 502/503 responses from the primary model.',false)
on conflict (setting_key) do update
set setting_value=excluded.setting_value,description=excluded.description,is_secret_reference=false,updated_at=now();

create or replace function public.office_gemini_reserve(p_user_id uuid,p_estimated_input_tokens integer)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_model text; v_fallback_model text; v_daily_cap integer; v_rpm_cap integer; v_tpm_cap integer; v_max_output integer;
  v_daily_count integer; v_minute_count integer; v_minute_tokens bigint; v_day_start timestamptz; v_reservation_id uuid;
begin
  if p_user_id is null or not exists(select 1 from office.owner_allowlist oa where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner') then
    raise exception using errcode='42501',message='owner_access_denied'; end if;
  if p_estimated_input_tokens is null or p_estimated_input_tokens<1 or p_estimated_input_tokens>16000 then
    raise exception using errcode='22023',message='invalid_input_token_estimate'; end if;
  if coalesce((select setting_value='true'::jsonb from office.office_settings where setting_key='quota_guard_enabled'),false) is not true then raise exception using errcode='P0001',message='quota_guard_disabled'; end if;
  if coalesce((select setting_value='true'::jsonb from office.office_settings where setting_key='gemini_gateway_enabled'),false) is not true then raise exception using errcode='P0001',message='gemini_gateway_disabled'; end if;
  if coalesce((select setting_value='true'::jsonb from office.office_settings where setting_key='gemini_free_tier_confirmed'),false) is not true then raise exception using errcode='P0001',message='free_tier_not_confirmed'; end if;
  if (select setting_value from office.office_settings where setting_key='api_billing_mode') is distinct from '"free_tier_only"'::jsonb then raise exception using errcode='P0001',message='paid_billing_mode_forbidden'; end if;
  select setting_value #>> '{}' into v_model from office.office_settings where setting_key='ai_model';
  select setting_value #>> '{}' into v_fallback_model from office.office_settings where setting_key='ai_fallback_model';
  if v_model is distinct from 'gemini-3.5-flash-lite' then raise exception using errcode='P0001',message='model_not_allowlisted'; end if;
  if v_fallback_model is not null and v_fallback_model is distinct from 'gemini-3.1-flash-lite' then raise exception using errcode='P0001',message='fallback_model_not_allowlisted'; end if;
  select nullif(setting_value #>> '{}','')::integer into v_daily_cap from office.office_settings where setting_key='gemini_daily_app_cap';
  select nullif(setting_value #>> '{}','')::integer into v_rpm_cap from office.office_settings where setting_key='gemini_rpm_app_cap';
  select nullif(setting_value #>> '{}','')::integer into v_tpm_cap from office.office_settings where setting_key='gemini_tpm_app_cap';
  select nullif(setting_value #>> '{}','')::integer into v_max_output from office.office_settings where setting_key='gemini_max_output_tokens';
  if coalesce(v_daily_cap,0)<1 or coalesce(v_rpm_cap,0)<1 or coalesce(v_tpm_cap,0)<1 or coalesce(v_max_output,0)<1 then raise exception using errcode='P0001',message='free_tier_caps_not_configured'; end if;
  if v_daily_cap>10000 or v_rpm_cap>100 or v_tpm_cap>250000 or v_max_output>2048 then raise exception using errcode='22023',message='application_cap_exceeds_safety_ceiling'; end if;
  if p_estimated_input_tokens+v_max_output>v_tpm_cap then raise exception using errcode='P0001',message='request_exceeds_tpm_app_cap'; end if;
  perform pg_advisory_xact_lock(hashtext('office_gemini_quota:shared')::bigint);
  v_day_start:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  select count(*)::integer into v_daily_count from office.office_gemini_quota_reservations
    where model in (v_model,coalesce(v_fallback_model,v_model)) and created_at>=v_day_start;
  if v_daily_count>=v_daily_cap then raise exception using errcode='P0001',message='daily_app_cap_reached'; end if;
  select count(*)::integer,coalesce(sum(estimated_input_tokens+reserved_output_tokens),0) into v_minute_count,v_minute_tokens
    from office.office_gemini_quota_reservations where model in (v_model,coalesce(v_fallback_model,v_model)) and created_at>=now()-interval '1 minute';
  if v_minute_count>=v_rpm_cap then raise exception using errcode='P0001',message='rpm_app_cap_reached'; end if;
  if v_minute_tokens+p_estimated_input_tokens+v_max_output>v_tpm_cap then raise exception using errcode='P0001',message='tpm_app_cap_reached'; end if;
  insert into office.office_gemini_quota_reservations(model,estimated_input_tokens,reserved_output_tokens,request_status)
    values(v_model,p_estimated_input_tokens,v_max_output,'reserved') returning id into v_reservation_id;
  return jsonb_build_object('reservation_id',v_reservation_id,'model',v_model,'max_output_tokens',v_max_output,
    'daily_used',v_daily_count+1,'daily_cap',v_daily_cap,'rpm_used',v_minute_count+1,'rpm_cap',v_rpm_cap,
    'tpm_reserved',v_minute_tokens+p_estimated_input_tokens+v_max_output,'tpm_cap',v_tpm_cap);
end;
$function$;

create or replace function public.office_gemini_reserve_fallback(p_user_id uuid,p_estimated_input_tokens integer)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_model text; v_primary_model text; v_daily_cap integer; v_rpm_cap integer; v_tpm_cap integer; v_max_output integer;
  v_daily_count integer; v_minute_count integer; v_minute_tokens bigint; v_day_start timestamptz; v_reservation_id uuid;
begin
  if p_user_id is null or not exists(select 1 from office.owner_allowlist oa where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner') then
    raise exception using errcode='42501',message='owner_access_denied'; end if;
  if p_estimated_input_tokens is null or p_estimated_input_tokens<1 or p_estimated_input_tokens>16000 then
    raise exception using errcode='22023',message='invalid_input_token_estimate'; end if;
  if coalesce((select setting_value='true'::jsonb from office.office_settings where setting_key='quota_guard_enabled'),false) is not true
     or coalesce((select setting_value='true'::jsonb from office.office_settings where setting_key='gemini_gateway_enabled'),false) is not true
     or coalesce((select setting_value='true'::jsonb from office.office_settings where setting_key='gemini_free_tier_confirmed'),false) is not true then
    raise exception using errcode='P0001',message='fallback_quota_guard_blocked'; end if;
  if (select setting_value from office.office_settings where setting_key='api_billing_mode') is distinct from '"free_tier_only"'::jsonb then raise exception using errcode='P0001',message='paid_billing_mode_forbidden'; end if;
  select setting_value #>> '{}' into v_primary_model from office.office_settings where setting_key='ai_model';
  select setting_value #>> '{}' into v_model from office.office_settings where setting_key='ai_fallback_model';
  if v_primary_model is distinct from 'gemini-3.5-flash-lite' or v_model is distinct from 'gemini-3.1-flash-lite' then raise exception using errcode='P0001',message='fallback_model_not_allowlisted'; end if;
  select nullif(setting_value #>> '{}','')::integer into v_daily_cap from office.office_settings where setting_key='gemini_daily_app_cap';
  select nullif(setting_value #>> '{}','')::integer into v_rpm_cap from office.office_settings where setting_key='gemini_rpm_app_cap';
  select nullif(setting_value #>> '{}','')::integer into v_tpm_cap from office.office_settings where setting_key='gemini_tpm_app_cap';
  select nullif(setting_value #>> '{}','')::integer into v_max_output from office.office_settings where setting_key='gemini_max_output_tokens';
  if coalesce(v_daily_cap,0)<1 or coalesce(v_rpm_cap,0)<1 or coalesce(v_tpm_cap,0)<1 or coalesce(v_max_output,0)<1 then raise exception using errcode='P0001',message='free_tier_caps_not_configured'; end if;
  if v_daily_cap>10000 or v_rpm_cap>100 or v_tpm_cap>250000 or v_max_output>2048 or p_estimated_input_tokens+v_max_output>v_tpm_cap then raise exception using errcode='P0001',message='fallback_quota_cap_blocked'; end if;
  perform pg_advisory_xact_lock(hashtext('office_gemini_quota:shared')::bigint);
  v_day_start:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  select count(*)::integer into v_daily_count from office.office_gemini_quota_reservations where model in (v_primary_model,v_model) and created_at>=v_day_start;
  if v_daily_count>=v_daily_cap then raise exception using errcode='P0001',message='daily_app_cap_reached'; end if;
  select count(*)::integer,coalesce(sum(estimated_input_tokens+reserved_output_tokens),0) into v_minute_count,v_minute_tokens
    from office.office_gemini_quota_reservations where model in (v_primary_model,v_model) and created_at>=now()-interval '1 minute';
  if v_minute_count>=v_rpm_cap then raise exception using errcode='P0001',message='rpm_app_cap_reached'; end if;
  if v_minute_tokens+p_estimated_input_tokens+v_max_output>v_tpm_cap then raise exception using errcode='P0001',message='tpm_app_cap_reached'; end if;
  insert into office.office_gemini_quota_reservations(model,estimated_input_tokens,reserved_output_tokens,request_status)
    values(v_model,p_estimated_input_tokens,v_max_output,'reserved') returning id into v_reservation_id;
  return jsonb_build_object('reservation_id',v_reservation_id,'model',v_model,'max_output_tokens',v_max_output,
    'daily_used',v_daily_count+1,'daily_cap',v_daily_cap,'rpm_used',v_minute_count+1,'rpm_cap',v_rpm_cap,
    'tpm_reserved',v_minute_tokens+p_estimated_input_tokens+v_max_output,'tpm_cap',v_tpm_cap);
end;
$function$;
revoke all on function public.office_gemini_reserve_fallback(uuid,integer) from public,anon,authenticated;
grant execute on function public.office_gemini_reserve_fallback(uuid,integer) to service_role;