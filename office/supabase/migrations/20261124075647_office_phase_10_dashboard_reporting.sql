-- Phase 10: aggregate dashboard reports and operations metrics.
-- Applied remotely as migration 20261124075647_office_phase_10_dashboard_reporting.

create or replace function public.office_dashboard_report(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_tasks jsonb; v_employees jsonb; v_usage jsonb; v_daily jsonb; v_providers jsonb; v_approvals jsonb; v_activity jsonb;
begin
  if p_user_id is null or not exists(select 1 from office.owner_allowlist oa where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner')
    then raise exception using errcode='42501',message='owner_access_denied'; end if;

  select jsonb_build_object(
    'total',count(*),'queued',count(*) filter(where status='queued'),
    'running',count(*) filter(where status='running'),'waiting_approval',count(*) filter(where status='waiting_approval'),
    'completed',count(*) filter(where status='completed'),'failed',count(*) filter(where status='failed'),
    'paused',count(*) filter(where status='paused'),'cancelled',count(*) filter(where status='cancelled')
  ) into v_tasks from office.office_tasks;

  select coalesce(jsonb_agg(jsonb_build_object('status',status,'count',cnt) order by status),'[]'::jsonb)
  into v_employees from (select status,count(*)::integer as cnt from office.office_employees group by status) x;

  select jsonb_build_object(
    'requests',coalesce(sum(request_count),0),'input_tokens',coalesce(sum(input_tokens),0),
    'output_tokens',coalesce(sum(output_tokens),0),'estimated_cost',coalesce(sum(estimated_cost),0),
    'success',count(*) filter(where request_status='success'),'errors',count(*) filter(where request_status<>'success')
  ) into v_usage from office.office_ai_usage where created_at>=now()-interval '7 days';

  select coalesce(jsonb_agg(jsonb_build_object('day',to_char(d.day,'Mon DD'),
    'requests',coalesce(u.requests,0),'tokens',coalesce(u.tokens,0)) order by d.day),'[]'::jsonb) into v_daily
  from generate_series(date_trunc('day',now() at time zone 'UTC')-interval '6 days',
    date_trunc('day',now() at time zone 'UTC'),interval '1 day') d(day)
  left join (
    select date_trunc('day',created_at at time zone 'UTC') as day,
      sum(request_count)::integer as requests,sum(input_tokens+output_tokens)::bigint as tokens
    from office.office_ai_usage
    where created_at>=((date_trunc('day',now() at time zone 'UTC')-interval '6 days') at time zone 'UTC')
    group by 1
  ) u on u.day=d.day;

  select coalesce(jsonb_agg(jsonb_build_object('provider',provider,'model',model,'requests',requests,
    'input_tokens',input_tokens,'output_tokens',output_tokens) order by requests desc),'[]'::jsonb) into v_providers
  from (select provider,model,sum(request_count)::integer as requests,sum(input_tokens)::bigint as input_tokens,
    sum(output_tokens)::bigint as output_tokens from office.office_ai_usage
    where created_at>=now()-interval '7 days' group by provider,model) x;

  select coalesce(jsonb_agg(jsonb_build_object('status',status,'count',cnt) order by status),'[]'::jsonb)
  into v_approvals from (select status,count(*)::integer as cnt from office.office_approvals group by status) a;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_activity
  from (select l.event_type,l.severity,l.message,l.created_at,t.task_key,t.title as task_title
    from office.office_task_logs l join office.office_tasks t on t.id=l.task_id
    order by l.created_at desc limit 12) x;

  return jsonb_build_object('task_counts',coalesce(v_tasks,'{}'::jsonb),'employee_status',coalesce(v_employees,'[]'::jsonb),
    'usage_7d',coalesce(v_usage,'{}'::jsonb),'daily_usage_7d',coalesce(v_daily,'[]'::jsonb),
    'provider_usage_7d',coalesce(v_providers,'[]'::jsonb),'approval_counts',coalesce(v_approvals,'[]'::jsonb),
    'recent_activity',coalesce(v_activity,'[]'::jsonb));
end;
$function$;

revoke all on function public.office_dashboard_report(uuid) from public,anon,authenticated;
grant execute on function public.office_dashboard_report(uuid) to service_role;
