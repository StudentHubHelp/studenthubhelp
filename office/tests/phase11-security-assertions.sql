-- Phase 11 security assertions for StudentHubHelp AI Office.
-- Run in Supabase SQL Editor as a database administrator.
-- Read-only except the quota reserve negative check, which must fail before inserting a reservation.

do $phase11$
declare
  v_owner uuid;
  v_status jsonb;
  v_count integer;
begin
  if has_schema_privilege('anon','office','USAGE')
     or has_schema_privilege('authenticated','office','USAGE') then
    raise exception 'Office schema must not be exposed to anon/authenticated';
  end if;

  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='office' and c.relkind='r' and not c.relrowsecurity
  ) then raise exception 'Every Office table must have RLS enabled'; end if;

  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='office' and c.relkind='r'
      and (
        has_table_privilege('anon',c.oid,'SELECT') or has_table_privilege('anon',c.oid,'INSERT')
        or has_table_privilege('anon',c.oid,'UPDATE') or has_table_privilege('anon',c.oid,'DELETE')
        or has_table_privilege('authenticated',c.oid,'SELECT') or has_table_privilege('authenticated',c.oid,'INSERT')
        or has_table_privilege('authenticated',c.oid,'UPDATE') or has_table_privilege('authenticated',c.oid,'DELETE')
      )
  ) then raise exception 'Office tables must not grant direct anon/authenticated access'; end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'office_%'
      and (
        not p.prosecdef
        or coalesce(array_to_string(p.proconfig,','),'') not like '%search_path=""%'
        or has_function_privilege('anon',p.oid,'EXECUTE')
        or has_function_privilege('authenticated',p.oid,'EXECUTE')
        or not has_function_privilege('service_role',p.oid,'EXECUTE')
      )
  ) then raise exception 'Office RPCs must be SECURITY DEFINER, fixed-search-path and service_role-only'; end if;

  if exists(select 1 from office.office_integration_action_catalog where execution_enabled is true)
    then raise exception 'External integration execution must remain disabled before Phase 10 executor'; end if;

  if exists(select 1 from office.office_employees where status<>'planned')
    then raise exception 'No AI employee may be activated before launch approval'; end if;

  if coalesce((select setting_value #>> '{}' from office.office_settings where setting_key='gemini_gateway_enabled'),'false')='true'
     or coalesce((select setting_value #>> '{}' from office.office_settings where setting_key='gemini_free_tier_confirmed'),'false')='true'
     or (select setting_value from office.office_settings where setting_key='gemini_daily_app_cap') is distinct from 'null'::jsonb
     or (select setting_value from office.office_settings where setting_key='gemini_rpm_app_cap') is distinct from 'null'::jsonb
     or (select setting_value from office.office_settings where setting_key='gemini_tpm_app_cap') is distinct from 'null'::jsonb
  then raise exception 'Gemini must remain fail-closed until Free Tier limits and secret are verified'; end if;

  select user_id into v_owner from office.owner_allowlist
  where is_active=true and access_role='owner' limit 1;
  if v_owner is null then raise exception 'No active Owner allowlist entry exists'; end if;

  v_status:=public.office_gemini_quota_status(v_owner);
  if coalesce((v_status->>'ready')::boolean,false) then
    raise exception 'Gemini quota status must not be ready while configuration is incomplete';
  end if;

  begin
    perform public.office_gemini_reserve(v_owner,100);
    raise exception 'Gemini reserve unexpectedly succeeded while gateway is disabled';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'gemini_gateway_disabled' then raise; end if;
  end;
end;
$phase11$;

select
  (select count(*) from office.office_integrations) as integration_count,
  (select count(*) from office.office_integration_action_catalog) as action_count,
  (select count(*) from office.office_employees where status='planned') as planned_employee_count,
  (select count(*) from office.office_approvals where status='pending') as pending_approval_count;
