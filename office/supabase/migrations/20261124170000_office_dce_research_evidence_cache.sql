create or replace function public.office_employee_research_evidence(
  p_user_id uuid,
  p_task_id uuid,
  p_action text,
  p_evidence jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_task office.office_tasks%rowtype;
  v_drafts jsonb;
  v_filtered jsonb;
  v_sources jsonb;
  v_saved_at timestamptz;
begin
  if p_user_id is null or not exists (
    select 1 from office.owner_allowlist oa
    where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner'
  ) then
    raise exception using errcode='42501', message='owner_access_denied';
  end if;
  if p_task_id is null or p_action not in ('get','begin','save') then
    raise exception using errcode='22023', message='invalid_research_evidence_request';
  end if;
  select * into v_task from office.office_tasks where id=p_task_id for update;
  if not found then raise exception using errcode='22023', message='task_not_found'; end if;
  if p_action in ('begin','save') and v_task.status <> 'queued' then
    raise exception using errcode='22023', message='task_must_be_queued';
  end if;
  if p_action='get' then
    return jsonb_build_object(
      'research_evidence', coalesce(v_task.result_payload->'research_evidence','null'::jsonb),
      'employee_drafts', coalesce(v_task.result_payload->'employee_drafts','[]'::jsonb)
    );
  end if;
  if p_action='begin' then
    v_drafts := coalesce(v_task.result_payload->'employee_drafts','[]'::jsonb);
    select coalesce(jsonb_agg(d.value),'[]'::jsonb) into v_filtered
    from jsonb_array_elements(v_drafts) d
    where d.value->>'role_key' not in ('data_collection_executive','quality_control_manager');
    update office.office_tasks
    set result_payload = jsonb_set(
          jsonb_set(coalesce(result_payload,'{}'::jsonb),'{employee_drafts}',v_filtered,true),
          '{research_evidence}',
          jsonb_build_object('status','running','started_at',now()),
          true
        ),
        updated_at=now()
    where id=p_task_id;
    return jsonb_build_object('status','running','started_at',now());
  end if;
  if p_evidence is null or jsonb_typeof(p_evidence)<>'object'
     or jsonb_typeof(p_evidence->'sources')<>'array'
     or jsonb_array_length(p_evidence->'sources')>6
     or exists (
       select 1 from jsonb_array_elements(p_evidence->'sources') s
       where coalesce(s.value->>'url','') !~ '^https://'
     ) then
    raise exception using errcode='22023', message='invalid_research_evidence';
  end if;
  v_sources := p_evidence->'sources';
  v_saved_at := now();
  update office.office_tasks
  set result_payload=jsonb_set(
        coalesce(result_payload,'{}'::jsonb),
        '{research_evidence}',
        jsonb_build_object(
          'status','completed','saved_at',v_saved_at,
          'query',left(coalesce(p_evidence->>'query',''),320),
          'extraction',left(coalesce(p_evidence->>'extraction','unknown'),60),
          'extraction_counts',coalesce(p_evidence->'extraction_counts','{}'::jsonb),
          'sources',v_sources
        ),true),
      updated_at=v_saved_at
  where id=p_task_id;
  return jsonb_build_object('status','completed','saved_at',v_saved_at,
    'source_count',jsonb_array_length(v_sources));
end;
$function$;
revoke all on function public.office_employee_research_evidence(uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.office_employee_research_evidence(uuid,uuid,text,jsonb) to service_role;