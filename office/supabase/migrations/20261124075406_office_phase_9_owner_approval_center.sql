-- Phase 9: Owner-only approval center.
-- Applied remotely as migration 20261124075406_office_phase_9_owner_approval_center.

create or replace function public.office_approval_list(p_user_id uuid,p_status text default 'pending')
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_rows jsonb; v_pending integer;
begin
  if p_user_id is null or not exists(select 1 from office.owner_allowlist oa where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner')
    then raise exception using errcode='42501',message='owner_access_denied'; end if;
  if coalesce(p_status,'pending') not in ('pending','approved','rejected','expired','cancelled','all')
    then raise exception using errcode='22023',message='invalid_approval_filter'; end if;
  select count(*)::integer into v_pending from office.office_approvals where status='pending';
  select coalesce(jsonb_agg(to_jsonb(x) order by x.requested_at desc),'[]'::jsonb) into v_rows
  from (
    select a.id,a.task_id,a.action_type,a.action_summary,a.proposed_payload,a.status,a.requested_at,a.expires_at,a.reviewed_at,a.review_note,
      t.task_key,t.title as task_title,t.status as task_status
    from office.office_approvals a join office.office_tasks t on t.id=a.task_id
    where p_status='all' or a.status=coalesce(p_status,'pending')
    order by a.requested_at desc limit 100
  ) x;
  return jsonb_build_object('approvals',v_rows,'pending_count',v_pending);
end;
$function$;

create or replace function public.office_approval_review(p_user_id uuid,p_approval_id uuid,p_decision text,p_review_note text default null)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_approval office.office_approvals%rowtype; v_note text;
begin
  if p_user_id is null or not exists(select 1 from office.owner_allowlist oa where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner')
    then raise exception using errcode='42501',message='owner_access_denied'; end if;
  if coalesce(p_decision,'') not in ('approved','rejected') then raise exception using errcode='22023',message='invalid_approval_decision'; end if;
  v_note:=nullif(btrim(coalesce(p_review_note,'')),'');
  if v_note is not null and length(v_note)>1000 then raise exception using errcode='22023',message='review_note_too_long'; end if;
  if p_decision='rejected' and v_note is null then raise exception using errcode='22023',message='rejection_note_required'; end if;
  select * into v_approval from office.office_approvals where id=p_approval_id for update;
  if not found then raise exception using errcode='22023',message='approval_not_found'; end if;
  if v_approval.status<>'pending' then raise exception using errcode='22023',message='approval_already_reviewed'; end if;
  if v_approval.expires_at is not null and v_approval.expires_at<=now() then
    update office.office_approvals set status='expired',reviewed_by=p_user_id,reviewed_at=now(),
      review_note=coalesce(v_note,'Expired before Owner review.') where id=p_approval_id;
    insert into office.office_task_logs(task_id,event_type,severity,message,details)
    values(v_approval.task_id,'approval_expired','warning','Approval request expired before review.',jsonb_build_object('approval_id',p_approval_id));
    return jsonb_build_object('ok',false,'code','approval_expired','execution_performed',false);
  end if;
  update office.office_approvals set status=p_decision,reviewed_by=p_user_id,reviewed_at=now(),review_note=v_note where id=p_approval_id;
  insert into office.office_task_logs(task_id,event_type,severity,message,details)
  values(v_approval.task_id,'approval_'||p_decision,'info',
    case when p_decision='approved' then 'Owner approved the proposal; no action was executed.' else 'Owner rejected the proposal.' end,
    jsonb_build_object('approval_id',p_approval_id,'action_type',v_approval.action_type,'review_note',v_note));
  if v_approval.action_type like 'integration:%' then
    update office.office_integration_events set event_status=p_decision,
      details=details||jsonb_build_object('reviewed_by_owner',true,'reviewed_at',now()) where approval_id=p_approval_id;
  end if;
  return jsonb_build_object('ok',true,'approval_id',p_approval_id,'status',p_decision,'execution_performed',false,
    'message',case when p_decision='approved'
      then 'Owner approval recorded. No external action was executed; execution is a later phase.'
      else 'Proposal rejected. No external action was executed.' end);
end;
$function$;

revoke all on function public.office_approval_list(uuid,text) from public,anon,authenticated;
revoke all on function public.office_approval_review(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.office_approval_list(uuid,text) to service_role;
grant execute on function public.office_approval_review(uuid,uuid,text,text) to service_role;
