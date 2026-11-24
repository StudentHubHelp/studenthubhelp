create or replace function public.office_employee_prepare_draft(
  p_user_id uuid, p_task_id uuid, p_role_key text, p_step_index integer
) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_task office.office_tasks%rowtype; v_role office.office_employees%rowtype; v_step jsonb;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then raise exception using errcode='42501',message='owner_access_denied'; end if;
  if p_step_index is null or p_step_index<0 or p_step_index>7 then
    raise exception using errcode='22023',message='invalid_step_index'; end if;
  select * into v_task from office.office_tasks where id=p_task_id;
  if not found then raise exception using errcode='22023',message='task_not_found'; end if;
  if v_task.status<>'queued' then raise exception using errcode='22023',message='task_must_be_queued'; end if;
  if jsonb_typeof(v_task.result_payload->'general_manager_plan'->'steps')<>'array' then
    raise exception using errcode='22023',message='gm_plan_required'; end if;
  v_step:=v_task.result_payload->'general_manager_plan'->'steps'->p_step_index;
  if v_step is null or v_step->>'role_key' is distinct from p_role_key then
    raise exception using errcode='22023',message='role_step_mismatch'; end if;
  select * into v_role from office.office_employees where role_key=p_role_key;
  if not found or v_role.role_key='general_manager' or v_role.status<>'active' then
    raise exception using errcode='22023',message='employee_role_unavailable'; end if;
  return jsonb_build_object(
    'task',jsonb_build_object('id',v_task.id,'task_key',v_task.task_key,'title',v_task.title,
      'description',v_task.description,'priority',v_task.priority,'status',v_task.status),
    'step',v_step,
    'employee',jsonb_build_object('id',v_role.id,'role_key',v_role.role_key,'display_name',v_role.display_name,
      'job_title',v_role.job_title,'department',v_role.department,'capabilities',v_role.capabilities,
      'permission_scope',v_role.permission_scope,'status',v_role.status),
    'employee_drafts',coalesce(v_task.result_payload->'employee_drafts','[]'::jsonb)
  );
end; $function$;