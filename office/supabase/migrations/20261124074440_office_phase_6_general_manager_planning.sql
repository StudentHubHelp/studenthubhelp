-- Phase 6: General Manager proposal-only planning workflow.
-- Applied remotely as migration 20261124074440_office_phase_6_general_manager_planning.

create or replace function public.office_gm_prepare_task(p_user_id uuid,p_task_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_task office.office_tasks%rowtype; v_roles jsonb;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then raise exception using errcode='42501',message='owner_access_denied'; end if;
  select * into v_task from office.office_tasks where id=p_task_id;
  if not found then raise exception using errcode='22023',message='task_not_found'; end if;
  if v_task.status<>'queued' then raise exception using errcode='22023',message='task_must_be_queued'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'role_key',role_key,'display_name',display_name,'department',department,
    'capabilities',capabilities,'permission_scope',permission_scope,'status',status
  ) order by employee_code),'[]'::jsonb)
  into v_roles from office.office_employees where role_key<>'general_manager';
  return jsonb_build_object('task',jsonb_build_object('id',v_task.id,'task_key',v_task.task_key,
    'title',v_task.title,'description',v_task.description,'priority',v_task.priority,'status',v_task.status),
    'roles',v_roles);
end;
$function$;

create or replace function public.office_gm_save_plan(p_user_id uuid,p_task_id uuid,p_plan jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_task office.office_tasks%rowtype; v_step jsonb; v_step_count integer;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then raise exception using errcode='42501',message='owner_access_denied'; end if;
  v_step_count:=case when jsonb_typeof(p_plan->'steps')='array' then jsonb_array_length(p_plan->'steps') else 0 end;
  if p_plan is null or jsonb_typeof(p_plan)<>'object' or v_step_count<1 or v_step_count>8
     or nullif(btrim(p_plan->>'objective'),'') is null
     or nullif(btrim(p_plan->>'summary'),'') is null
     or coalesce(p_plan->>'risk_level','') not in ('low','medium','high')
     or p_plan->>'requires_owner_approval' is distinct from 'true' then
    raise exception using errcode='22023',message='invalid_gm_plan';
  end if;
  for v_step in select value from jsonb_array_elements(p_plan->'steps')
  loop
    if nullif(btrim(v_step->>'title'),'') is null or nullif(btrim(v_step->>'role_key'),'') is null
       or not exists(select 1 from office.office_employees e where e.role_key=v_step->>'role_key' and e.role_key<>'general_manager')
       or jsonb_typeof(v_step->'requires_external_action') is distinct from 'boolean' then
      raise exception using errcode='22023',message='invalid_gm_plan_step';
    end if;
  end loop;
  select * into v_task from office.office_tasks where id=p_task_id for update;
  if not found then raise exception using errcode='22023',message='task_not_found'; end if;
  if v_task.status<>'queued' then raise exception using errcode='22023',message='task_must_be_queued'; end if;
  update office.office_tasks set result_payload=jsonb_set(coalesce(result_payload,'{}'::jsonb),
    '{general_manager_plan}',p_plan,true),updated_at=now() where id=p_task_id;
  insert into office.office_task_logs(task_id,event_type,severity,message,details)
  values(p_task_id,'gm_plan_created','info','General Manager created a draft work plan.',
    jsonb_build_object('risk_level',p_plan->>'risk_level','step_count',v_step_count,'approval_required',true));
  return jsonb_build_object('ok',true,'task_id',p_task_id,'step_count',v_step_count,'plan',p_plan);
end;
$function$;

create or replace function public.office_gm_list_plans(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_plans jsonb;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then raise exception using errcode='42501',message='owner_access_denied'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at desc),'[]'::jsonb) into v_plans
  from (
    select id as task_id,task_key,title,result_payload->'general_manager_plan' as plan,updated_at
    from office.office_tasks where result_payload ? 'general_manager_plan'
    order by updated_at desc limit 100
  ) x;
  return jsonb_build_object('plans',v_plans);
end;
$function$;

revoke all on function public.office_gm_prepare_task(uuid,uuid) from public,anon,authenticated;
revoke all on function public.office_gm_save_plan(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.office_gm_list_plans(uuid) from public,anon,authenticated;
grant execute on function public.office_gm_prepare_task(uuid,uuid) to service_role;
grant execute on function public.office_gm_save_plan(uuid,uuid,jsonb) to service_role;
grant execute on function public.office_gm_list_plans(uuid) to service_role;
