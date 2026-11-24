-- Phase 8: integration registry, action catalog and proposal-only approval requests.
-- Applied remotely as migration 20261124075121_office_phase_8_integration_registry.

create table if not exists office.office_integrations (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  display_name text not null,
  connection_status text not null default 'not_connected' check(connection_status in ('connected','needs_secret','not_connected','disabled')),
  access_mode text not null default 'read_only' check(access_mode in ('read_only','draft_only','approval_required')),
  secret_reference text,
  allowed_scopes jsonb not null default '[]'::jsonb check(jsonb_typeof(allowed_scopes)='array'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists office.office_integration_action_catalog (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references office.office_integrations(provider_key) on delete cascade,
  action_key text not null,
  description text not null,
  execution_mode text not null check(execution_mode in ('read_only','draft_only','approval_required')),
  requires_approval boolean not null default false,
  proposal_enabled boolean not null default false,
  execution_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique(provider_key,action_key)
);
create table if not exists office.office_integration_events (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  action_key text,
  task_id uuid references office.office_tasks(id) on delete set null,
  approval_id uuid references office.office_approvals(id) on delete set null,
  event_type text not null,
  event_status text not null,
  details jsonb not null default '{}'::jsonb check(jsonb_typeof(details)='object'),
  created_at timestamptz not null default now()
);
create index if not exists office_integrations_provider_status_idx on office.office_integrations(connection_status,provider_key);
create index if not exists office_integration_events_created_idx on office.office_integration_events(created_at desc);
create index if not exists office_integration_events_provider_idx on office.office_integration_events(provider_key,created_at desc);
alter table office.office_integrations enable row level security;
alter table office.office_integration_action_catalog enable row level security;
alter table office.office_integration_events enable row level security;
revoke all on table office.office_integrations,office.office_integration_action_catalog,office.office_integration_events from public,anon,authenticated,service_role;

insert into office.office_integrations(provider_key,display_name,connection_status,access_mode,secret_reference,allowed_scopes,notes)
values
 ('supabase','Supabase','connected','read_only',null,'["office_schema_read","owner_task_control","aggregate_usage_read"]'::jsonb,'Office database access is server-side through Owner-checked service-role RPCs; no browser database access.'),
 ('gemini','Google Gemini API','needs_secret','draft_only','GEMINI_API_KEY','["text_generation_only","free_tier_quota_guard"]'::jsonb,'Gateway is deployed but disabled until key, Free Tier confirmation and project caps are configured.'),
 ('github','GitHub','needs_secret','approval_required','OFFICE_GITHUB_TOKEN','["repository_read","patch_proposal","pull_request_proposal"]'::jsonb,'ChatGPT GitHub connector does not automatically provide a runtime token to the Office.'),
 ('cloudflare','Cloudflare','needs_secret','approval_required','CLOUDFLARE_API_TOKEN','["pages_status_read","preview_deploy_proposal","production_deploy_proposal"]'::jsonb,'Office runtime needs a scoped Cloudflare API token; production actions must require Owner approval.'),
 ('brevo','Brevo','needs_secret','approval_required','BREVO_API_KEY','["campaign_metrics_read","email_template_draft","campaign_send_proposal"]'::jsonb,'Office runtime needs a Brevo API key; sending is approval-gated.'),
 ('instagram','Instagram / Meta','not_connected','approval_required','META_INSTAGRAM_ACCESS_TOKEN','["content_draft","publish_proposal"]'::jsonb,'No Meta Graph API token or Instagram publishing permission has been connected.'),
 ('openseo','OpenSEO','not_connected','read_only','OPENSEO_API_KEY','["keyword_research","site_audit","visibility_reporting"]'::jsonb,'ChatGPT connector access does not automatically create Office runtime credentials.')
on conflict(provider_key) do nothing;

insert into office.office_integration_action_catalog(provider_key,action_key,description,execution_mode,requires_approval,proposal_enabled,execution_enabled)
values
 ('supabase','read_office_metrics','Read aggregate Office metrics and usage summaries.','read_only',false,false,false),
 ('supabase','read_listing_aggregates','Read approved aggregate listing counts only.','read_only',false,false,false),
 ('github','create_patch_proposal','Prepare a code patch proposal for Owner review.','draft_only',false,true,false),
 ('github','create_pull_request','Create a GitHub pull request after explicit Owner approval.','approval_required',true,true,false),
 ('cloudflare','create_preview_deployment','Request a preview deployment for review.','approval_required',true,true,false),
 ('cloudflare','deploy_production','Deploy the approved Office build to production.','approval_required',true,true,false),
 ('brevo','create_email_draft','Prepare an email campaign draft; do not send.','draft_only',false,true,false),
 ('brevo','send_email_campaign','Send an approved email campaign to the selected audience.','approval_required',true,true,false),
 ('instagram','create_post_draft','Prepare an Instagram post/caption draft.','draft_only',false,true,false),
 ('instagram','publish_post','Publish an approved Instagram post.','approval_required',true,true,false),
 ('openseo','keyword_research','Prepare a keyword research request/report.','read_only',false,false,false),
 ('openseo','site_audit','Prepare a read-only SEO audit request/report.','read_only',false,false,false),
 ('openseo','publish_metadata','Publish approved SEO metadata changes.','approval_required',true,true,false)
on conflict(provider_key,action_key) do nothing;

create or replace function public.office_integration_overview(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_integrations jsonb; v_actions jsonb; v_pending integer;
begin
  if p_user_id is null or not exists(select 1 from office.owner_allowlist oa where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner')
    then raise exception using errcode='42501',message='owner_access_denied'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.display_name),'[]'::jsonb) into v_integrations
  from (select provider_key,display_name,connection_status,access_mode,secret_reference,allowed_scopes,notes,updated_at from office.office_integrations) x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.provider_key,x.action_key),'[]'::jsonb) into v_actions
  from (select provider_key,action_key,description,execution_mode,requires_approval,proposal_enabled,execution_enabled from office.office_integration_action_catalog) x;
  select count(*)::integer into v_pending from office.office_approvals where status='pending';
  return jsonb_build_object('integrations',v_integrations,'actions',v_actions,'pending_approvals',v_pending);
end;
$function$;

create or replace function public.office_integration_propose(p_user_id uuid,p_task_id uuid,p_provider_key text,p_action_key text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_task office.office_tasks%rowtype; v_action office.office_integration_action_catalog%rowtype;
  v_provider office.office_integrations%rowtype; v_approval_id uuid; v_payload jsonb;
begin
  if p_user_id is null or not exists(select 1 from office.owner_allowlist oa where oa.user_id=p_user_id and oa.is_active=true and oa.access_role='owner')
    then raise exception using errcode='42501',message='owner_access_denied'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or length(p_payload::text)>6000
    then raise exception using errcode='22023',message='invalid_integration_payload'; end if;
  if p_payload::text ~* '"(api_?key|secret|client_secret|password|token|authorization|otp|access_?token|refresh_?token|private_?key)"[[:space:]]*:'
    then raise exception using errcode='22023',message='sensitive_payload_key_forbidden'; end if;
  select * into v_task from office.office_tasks where id=p_task_id;
  if not found then raise exception using errcode='22023',message='task_not_found'; end if;
  if v_task.status<>'queued' then raise exception using errcode='22023',message='task_must_be_queued'; end if;
  select * into v_action from office.office_integration_action_catalog where provider_key=p_provider_key and action_key=p_action_key;
  if not found or not v_action.proposal_enabled or not v_action.requires_approval
    then raise exception using errcode='22023',message='integration_action_not_proposable'; end if;
  select * into v_provider from office.office_integrations where provider_key=p_provider_key;
  if not found then raise exception using errcode='22023',message='integration_provider_unknown'; end if;
  v_payload:=p_payload||jsonb_build_object('provider_key',p_provider_key,'action_key',p_action_key,
    'provider_connection_status',v_provider.connection_status,'execution_enabled',v_action.execution_enabled,'proposal_only',true);
  insert into office.office_approvals(task_id,action_type,action_summary,proposed_payload,status,requested_by,expires_at)
  values(p_task_id,'integration:'||p_provider_key||':'||p_action_key,left(v_action.description,500),v_payload,'pending',p_user_id,now()+interval '7 days')
  returning id into v_approval_id;
  insert into office.office_integration_events(provider_key,action_key,task_id,approval_id,event_type,event_status,details)
  values(p_provider_key,p_action_key,p_task_id,v_approval_id,'action_proposed','pending',
    jsonb_build_object('provider_connection_status',v_provider.connection_status,'execution_enabled',v_action.execution_enabled));
  return jsonb_build_object('approval_id',v_approval_id,'status','pending','provider_connection_status',v_provider.connection_status,
    'execution_enabled',v_action.execution_enabled,'message','Proposal created only; no external integration action was executed.');
end;
$function$;

revoke all on function public.office_integration_overview(uuid) from public,anon,authenticated;
revoke all on function public.office_integration_propose(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.office_integration_overview(uuid) to service_role;
grant execute on function public.office_integration_propose(uuid,uuid,text,text,jsonb) to service_role;
