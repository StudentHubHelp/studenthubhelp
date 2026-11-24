create or replace function public.office_employee_generation_lock(
  p_user_id uuid,
  p_task_id uuid,
  p_role_key text,
  p_step_index integer,
  p_action text
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_row office.office_employee_generation_locks%rowtype;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa
    where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then
    raise exception using errcode='42501', message='owner_access_denied';
  end if;
  if p_task_id is null or nullif(btrim(p_role_key),'') is null
     or p_step_index is null or p_step_index<0 or p_step_index>7
     or p_action not in ('acquire','release') then
    raise exception using errcode='22023', message='invalid_generation_lock_request';
  end if;

  if p_action='release' then
    delete from office.office_employee_generation_locks
    where task_id=p_task_id and role_key=p_role_key and step_index=p_step_index
      and owner_user_id=p_user_id;
    return jsonb_build_object('locked',false,'released',true);
  end if;

  if p_role_key in ('data_collection_executive','quality_control_manager') then
    perform pg_advisory_xact_lock(hashtext('office_employee_research_pipeline:'||p_task_id::text)::bigint);
    if exists (
      select 1 from office.office_employee_generation_locks l
      where l.task_id=p_task_id
        and l.role_key in ('data_collection_executive','quality_control_manager')
        and l.expires_at>now()
        and (l.role_key<>p_role_key or l.step_index<>p_step_index)
    ) then
      raise exception using errcode='P0001', message='employee_generation_in_progress';
    end if;
  end if;

  insert into office.office_employee_generation_locks
    (task_id,role_key,step_index,owner_user_id,locked_at,expires_at)
  values (p_task_id,p_role_key,p_step_index,p_user_id,now(),now()+interval '5 minutes')
  on conflict (task_id,role_key,step_index) do update
    set owner_user_id=excluded.owner_user_id,
        locked_at=excluded.locked_at,
        expires_at=excluded.expires_at
    where office.office_employee_generation_locks.expires_at < now()
  returning * into v_row;

  if not found then
    raise exception using errcode='P0001', message='employee_generation_in_progress';
  end if;
  return jsonb_build_object('locked',true,'expires_at',v_row.expires_at);
end;
$function$;

create or replace function public.office_employee_list_drafts(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_drafts jsonb;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa
    where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then
    raise exception using errcode='42501',message='owner_access_denied';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at desc),'[]'::jsonb)
  into v_drafts
  from (
    select id as task_id,task_key,title,updated_at,
      result_payload->'employee_drafts' as drafts,
      result_payload->'research_evidence' as research_evidence
    from office.office_tasks
    where jsonb_typeof(result_payload->'employee_drafts')='array'
       or result_payload ? 'research_evidence'
    order by updated_at desc limit 100
  ) x;
  return jsonb_build_object('items',v_drafts);
end;
$function$;
