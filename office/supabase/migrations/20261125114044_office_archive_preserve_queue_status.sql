CREATE OR REPLACE FUNCTION public.office_control_api(p_user_id uuid, p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_task office.office_tasks%rowtype;
  v_task_id uuid;
  v_target_status text;
  v_title text;
  v_description text;
  v_priority text;
  v_tasks jsonb;
  v_employees jsonb;
  v_counts jsonb;
  v_logs jsonb;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa
    where oa.user_id = p_user_id and oa.is_active = true and oa.access_role = 'owner'
  ) then
    raise exception using errcode = '42501', message = 'owner_access_denied';
  end if;

  if p_action is null or p_action not in (
    'overview', 'list_tasks', 'list_employees', 'create_task',
    'set_task_status', 'list_task_logs', 'archive_task', 'restore_task'
  ) then
    raise exception using errcode = '22023', message = 'unsupported_action';
  end if;
  if p_payload is not null and jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_payload';
  end if;

  if p_action = 'overview' then
    select jsonb_build_object(
      'total', count(*) filter (where archived_at is null),
      'queued', count(*) filter (where archived_at is null and status = 'queued'),
      'running', count(*) filter (where archived_at is null and status = 'running'),
      'waiting_approval', count(*) filter (where archived_at is null and status = 'waiting_approval'),
      'completed', count(*) filter (where archived_at is null and status = 'completed'),
      'failed', count(*) filter (where archived_at is null and status = 'failed'),
      'paused', count(*) filter (where archived_at is null and status = 'paused')
    ) into v_counts from office.office_tasks;

    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_tasks
    from (
      select id, task_key, title, description, priority, status, requires_approval,
             created_at, updated_at, started_at, completed_at, assigned_employee_id
      from office.office_tasks where archived_at is null
      order by
        case when status in ('running','waiting_approval') then 0
             when status in ('queued','paused','draft') then 1 else 2 end,
        updated_at desc
      limit 1
    ) x;

    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_employees
    from (
      select id, employee_code, display_name, job_title, department, role_key, status, capabilities
      from office.office_employees
      order by case when role_key = 'general_manager' then 0 else 1 end, display_name
    ) x;

    return jsonb_build_object(
      'task_counts', coalesce(v_counts, '{}'::jsonb),
      'current_task', coalesce(v_tasks->0, 'null'::jsonb),
      'employees', coalesce(v_employees, '[]'::jsonb)
    );

  elsif p_action = 'list_tasks' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_tasks
    from (
      select id, task_key, title, description, priority, status, requires_approval,
             created_at, updated_at, started_at, completed_at, assigned_employee_id,
             archived_at
      from office.office_tasks
      where (case when coalesce(p_payload->>'include_archived','false') = 'true'
                  then archived_at is not null else archived_at is null end)
      order by coalesce(archived_at, updated_at) desc
      limit 200
    ) x;
    return jsonb_build_object('tasks', coalesce(v_tasks, '[]'::jsonb));

  elsif p_action = 'list_employees' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_employees
    from (
      select id, employee_code, display_name, job_title, department, role_key, status, capabilities
      from office.office_employees
      order by case when role_key = 'general_manager' then 0 else 1 end, display_name
    ) x;
    return jsonb_build_object('employees', coalesce(v_employees, '[]'::jsonb));

  elsif p_action = 'create_task' then
    v_title := btrim(coalesce(p_payload->>'title', ''));
    v_description := nullif(btrim(coalesce(p_payload->>'description', '')), '');
    v_priority := coalesce(p_payload->>'priority', 'normal');
    if length(v_title) < 3 or length(v_title) > 160 then
      raise exception using errcode = '22023', message = 'title_must_be_3_to_160_characters';
    end if;
    if v_description is not null and length(v_description) > 2000 then
      raise exception using errcode = '22023', message = 'description_too_long';
    end if;
    if v_priority not in ('low', 'normal', 'high', 'urgent') then
      raise exception using errcode = '22023', message = 'invalid_priority';
    end if;
    insert into office.office_tasks (
      task_key, title, description, created_by, priority, status,
      input_payload, requires_approval, idempotency_key, max_attempts
    ) values (
      'SHH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
      v_title, v_description, p_user_id, v_priority, 'queued',
      jsonb_build_object('created_via', 'owner_control_center'), false, gen_random_uuid()::text, 1
    ) returning * into v_task;
    insert into office.office_task_logs (task_id,event_type,severity,message,details)
    values (v_task.id,'task_created','info','Task created by owner.',
      jsonb_build_object('priority',v_priority,'source','owner_control_center'));
    return jsonb_build_object('task',to_jsonb(v_task));

  elsif p_action = 'set_task_status' then
    if coalesce(p_payload->>'task_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
      raise exception using errcode = '22023', message = 'invalid_task_id';
    end if;
    v_task_id := (p_payload->>'task_id')::uuid;
    v_target_status := p_payload->>'status';
    if v_target_status not in ('queued','paused','cancelled') then
      raise exception using errcode = '22023', message = 'owner_can_only_queue_pause_or_cancel_tasks';
    end if;
    update office.office_tasks t set status=v_target_status, updated_at=now()
    where t.id=v_task_id and t.archived_at is null
      and t.status in ('draft','queued','paused')
      and v_target_status in ('queued','paused','cancelled')
    returning * into v_task;
    if not found then
      raise exception using errcode = '22023', message = 'task_not_found_or_transition_not_allowed';
    end if;
    insert into office.office_task_logs (task_id,event_type,severity,message,details)
    values (v_task.id,'task_status_changed','info','Task status changed by owner.',
      jsonb_build_object('new_status',v_target_status,'actor','owner'));
    return jsonb_build_object('task',to_jsonb(v_task));

  elsif p_action in ('archive_task','restore_task') then
    if coalesce(p_payload->>'task_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
      raise exception using errcode = '22023', message = 'invalid_task_id';
    end if;
    v_task_id := (p_payload->>'task_id')::uuid;
    if p_action = 'archive_task' then
      update office.office_tasks t set archived_previous_status=t.status, status='cancelled', archived_at=now(), archived_by=p_user_id, updated_at=now()
      where t.id=v_task_id and t.archived_at is null
        and t.status not in ('running','waiting_approval')
      returning * into v_task;
      if not found then
        raise exception using errcode = '22023', message = 'task_not_found_or_archive_blocked';
      end if;
      insert into office.office_task_logs (task_id,event_type,severity,message,details)
      values (v_task.id,'task_archived','info','Task archived by owner; task history retained.',
        jsonb_build_object('actor','owner','history_retained',true));
    else
      update office.office_tasks t set status=coalesce(t.archived_previous_status,'cancelled'), archived_previous_status=null, archived_at=null, archived_by=null, updated_at=now()
      where t.id=v_task_id and t.archived_at is not null
      returning * into v_task;
      if not found then
        raise exception using errcode = '22023', message = 'task_not_found_or_restore_blocked';
      end if;
      insert into office.office_task_logs (task_id,event_type,severity,message,details)
      values (v_task.id,'task_restored','info','Task restored by owner; task history retained.',
        jsonb_build_object('actor','owner'));
    end if;
    return jsonb_build_object('task',to_jsonb(v_task));

  elsif p_action = 'list_task_logs' then
    if coalesce(p_payload->>'task_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
      raise exception using errcode = '22023', message = 'invalid_task_id';
    end if;
    v_task_id := (p_payload->>'task_id')::uuid;
    if not exists (select 1 from office.office_tasks where id=v_task_id) then
      raise exception using errcode = '22023', message = 'task_not_found';
    end if;
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_logs
    from (
      select id,event_type,severity,message,details,created_at
      from office.office_task_logs where task_id=v_task_id
      order by created_at desc limit 50
    ) x;
    return jsonb_build_object('logs',coalesce(v_logs,'[]'::jsonb));
  end if;
  raise exception using errcode = '22023', message = 'unsupported_action';
end;
$function$;
