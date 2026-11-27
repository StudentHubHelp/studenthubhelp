-- Employee role execution guard: only explicitly active employees may prepare/save work.
-- This does not grant external execution, email, publishing, or production-write permissions.

create or replace function public.office_employee_prepare_draft(
  p_user_id uuid, p_task_id uuid, p_role_key text, p_step_index integer
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_task office.office_tasks%rowtype;
  v_role office.office_employees%rowtype;
  v_step jsonb;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa
    where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then
    raise exception using errcode='42501',message='owner_access_denied';
  end if;
  if p_step_index is null or p_step_index<0 or p_step_index>7 then
    raise exception using errcode='22023',message='invalid_step_index';
  end if;

  select * into v_task from office.office_tasks where id=p_task_id;
  if not found then raise exception using errcode='22023',message='task_not_found'; end if;
  if v_task.status<>'queued' then
    raise exception using errcode='22023',message='task_must_be_queued';
  end if;
  if jsonb_typeof(v_task.result_payload->'general_manager_plan'->'steps')<>'array' then
    raise exception using errcode='22023',message='gm_plan_required';
  end if;

  v_step := v_task.result_payload->'general_manager_plan'->'steps'->p_step_index;
  if v_step is null or v_step->>'role_key' is distinct from p_role_key then
    raise exception using errcode='22023',message='role_step_mismatch';
  end if;

  select * into v_role from office.office_employees where role_key=p_role_key;
  if not found or v_role.role_key='general_manager' or v_role.status<>'active' then
    raise exception using errcode='22023',message='employee_role_unavailable';
  end if;

  return jsonb_build_object(
    'task',jsonb_build_object('id',v_task.id,'task_key',v_task.task_key,'title',v_task.title,
      'description',v_task.description,'priority',v_task.priority,'status',v_task.status),
    'step',v_step,
    'employee',jsonb_build_object('id',v_role.id,'role_key',v_role.role_key,
      'display_name',v_role.display_name,'job_title',v_role.job_title,'department',v_role.department,
      'capabilities',v_role.capabilities,'permission_scope',v_role.permission_scope,'status',v_role.status)
  );
end;
$function$;

create or replace function public.office_employee_save_draft(
  p_user_id uuid, p_task_id uuid, p_role_key text, p_step_index integer, p_draft jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_task office.office_tasks%rowtype;
  v_step jsonb;
  v_check jsonb;
  v_checks_count integer;
  v_existing jsonb;
  v_filtered jsonb;
  v_new jsonb;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa
    where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then
    raise exception using errcode='42501',message='owner_access_denied';
  end if;
  if p_step_index is null or p_step_index<0 or p_step_index>7 then
    raise exception using errcode='22023',message='invalid_step_index';
  end if;

  v_checks_count:=case when jsonb_typeof(p_draft->'checks')='array'
    then jsonb_array_length(p_draft->'checks') else -1 end;
  if p_draft is null or jsonb_typeof(p_draft)<>'object'
     or p_draft->>'role_key' is distinct from p_role_key
     or (p_draft->>'step_index')::integer is distinct from p_step_index
     or nullif(btrim(p_draft->>'title'),'') is null or length(p_draft->>'title')>160
     or nullif(btrim(p_draft->>'summary'),'') is null or length(p_draft->>'summary')>1000
     or nullif(btrim(p_draft->>'draft_content'),'') is null or length(p_draft->>'draft_content')>8000
     or v_checks_count<0 or v_checks_count>8
     or coalesce(p_draft->>'risk_level','') not in ('low','medium','high')
     or p_draft->>'requires_owner_approval' is distinct from 'true' then
    raise exception using errcode='22023',message='invalid_employee_draft';
  end if;

  for v_check in select value from jsonb_array_elements(p_draft->'checks')
  loop
    if jsonb_typeof(v_check) is distinct from 'string'
       or length(btrim(v_check #>> '{}'))<1 or length(v_check #>> '{}')>250 then
      raise exception using errcode='22023',message='invalid_employee_draft_check';
    end if;
  end loop;

  select * into v_task from office.office_tasks where id=p_task_id for update;
  if not found then raise exception using errcode='22023',message='task_not_found'; end if;
  if v_task.status<>'queued' then
    raise exception using errcode='22023',message='task_must_be_queued';
  end if;
  v_step:=v_task.result_payload->'general_manager_plan'->'steps'->p_step_index;
  if v_step is null or v_step->>'role_key' is distinct from p_role_key then
    raise exception using errcode='22023',message='role_step_mismatch';
  end if;
  if not exists(
    select 1 from office.office_employees
    where role_key=p_role_key and role_key<>'general_manager' and status='active'
  ) then
    raise exception using errcode='22023',message='employee_role_unavailable';
  end if;

  v_existing:=coalesce(v_task.result_payload->'employee_drafts','[]'::jsonb);
  select coalesce(jsonb_agg(value),'[]'::jsonb) into v_filtered
  from jsonb_array_elements(v_existing)
  where value->>'role_key' is distinct from p_role_key
     or coalesce((value->>'step_index')::integer,-1)<>p_step_index;
  v_new:=v_filtered||jsonb_build_array(p_draft);

  update office.office_tasks
  set result_payload=jsonb_set(coalesce(result_payload,'{}'::jsonb),'{employee_drafts}',v_new,true),
      updated_at=now()
  where id=p_task_id;

  insert into office.office_task_logs(task_id,event_type,severity,message,details)
  values(p_task_id,'employee_draft_created','info','A role-specific employee draft was created.',
    jsonb_build_object('role_key',p_role_key,'step_index',p_step_index,'approval_required',true));
  return jsonb_build_object('ok',true,'task_id',p_task_id,'role_key',p_role_key,
    'step_index',p_step_index,'draft',p_draft);
end;
$function$;

revoke all on function public.office_employee_prepare_draft(uuid,uuid,text,integer) from public, anon, authenticated;
grant execute on function public.office_employee_prepare_draft(uuid,uuid,text,integer) to service_role;
revoke all on function public.office_employee_save_draft(uuid,uuid,text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.office_employee_save_draft(uuid,uuid,text,integer,jsonb) to service_role;
