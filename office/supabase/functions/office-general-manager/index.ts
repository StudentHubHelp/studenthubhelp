import { DAILY_ACTIVITY_REQUIRED_ROLES, isDailyWebsiteActivityTask } from "../_shared/task-intent.ts";
import { buildGeneralManagerPrompt, callOfficeGemini } from "../_shared/employee-intelligence.ts";
const allowedOrigins = new Set([
  "https://office.studenthubhelp.in",
  "http://localhost:5173",
]);
const isAllowedOrigin = (origin: string | null) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.studenthubhelp-office\.pages\.dev$/i.test(origin);
};
const corsHeaders = (origin: string | null) => ({
  ...(origin && isAllowedOrigin(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});
const respond = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
function readJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}
async function rpc(url: string, serviceKey: string, name: string, payload: Record<string, unknown>) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "Accept-Profile": "public",
      "Content-Profile": "public",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, data, message: typeof data?.message === "string" ? data.message : "" };
}
function redact(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/(?:\+?91[\s-]?)?[6-9]\d{9}/g, "[REDACTED_PHONE]")
    .replace(/\b\d{12}\b/g, "[REDACTED_ID]")
    .replace(/https?:\/\/\S+/gi, "[REDACTED_URL]");
}
function parsePlan(raw: string, allowedRoles: Set<string>) {
  const cleaned = raw.trim().replace(/^\u0060{3}(?:json)?\s*/i, "").replace(/\s*\u0060{3}$/i, "");
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid_plan");
  const objective = typeof parsed.objective === "string" ? parsed.objective.trim() : "";
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const risk = parsed.risk_level;
  if (!objective || objective.length > 300 || !summary || summary.length > 1200) throw new Error("invalid_plan");
  if (!["low", "medium", "high"].includes(risk)) throw new Error("invalid_plan");
  if (parsed.requires_owner_approval !== true || !Array.isArray(parsed.steps) || parsed.steps.length < 1 || parsed.steps.length > 8) {
    throw new Error("invalid_plan");
  }
  const steps = parsed.steps.map((step: any) => {
    if (!step || typeof step !== "object") throw new Error("invalid_plan_step");
    const title = typeof step.title === "string" ? step.title.trim() : "";
    const roleKey = typeof step.role_key === "string" ? step.role_key.trim() : "";
    const rationale = typeof step.rationale === "string" ? step.rationale.trim() : "";
    const expectedOutput = typeof step.expected_output === "string" ? step.expected_output.trim() : "";
    if (!title || title.length > 160 || !allowedRoles.has(roleKey) ||
        !rationale || rationale.length > 500 || !expectedOutput || expectedOutput.length > 500 ||
        step.requires_external_action !== false) throw new Error("invalid_plan_step");
    return {
      title: redact(title),
      role_key: roleKey,
      rationale: redact(rationale),
      expected_output: redact(expectedOutput),
      requires_external_action: step.requires_external_action
    };
  });
  if (new Set(steps.map((step: any) => step.role_key)).size !== steps.length) throw new Error("duplicate_plan_role");
  return {
    objective: redact(objective),
    summary: redact(summary),
    risk_level: risk,
    requires_owner_approval: true,
    plan_status: "proposal_only",
    steps,
    created_at: new Date().toISOString()
  };
}

const dailyActivityRoles = [...DAILY_ACTIVITY_REQUIRED_ROLES];

function isConsolidatedTeamQaTask(taskTitle: string, taskDescription: string): boolean {
  const value = (taskTitle + " " + taskDescription).toLowerCase();
  return /consolidated/.test(value) && /all\s+(?:8|eight)\s+employees/.test(value) &&
    /qc manager|quality control manager/.test(value) && /seo manager/.test(value);
}
const consolidatedQaRoles = [
  "data_listing_manager", "data_collection_executive", "customer_support_executive",
  "technical_support_engineer", "data_analyst_reporting_manager", "social_media_manager",
  "seo_marketing_manager", "quality_control_manager"
];

function buildDeterministicPlan(taskTitle: string, taskDescription: string, roles: any[]) {
  const textValue = (taskTitle + " " + taskDescription).toLowerCase();
  const available = new Map(roles.map((role: any) => [String(role.role_key), role]));
  const selected: string[] = [];
  const add = (roleKey: string) => { if (available.has(roleKey) && !selected.includes(roleKey)) selected.push(roleKey); };
  const loginIssue = /login|log in|sign.?in|password|otp|authentication|auth issue|account access|लॉग.?इन|पासवर्ड|ओटीपी/.test(textValue);
  const customerIssue = /customer|student|user|visitor|complaint|ticket|support|grahak|chhatra|ग्राहक|छात्र|शिकायत/.test(textValue);
  const propertyIssue = /property|listing|hostel|\bpg\b|tiffin|mess|library|cafe|bookstore|प्रॉपर्टी|लिस्टिंग|होस्टल/.test(textValue);
  const popularityQuestion = /most searched|most search|highest search|popular property|top searched|search.*property|property.*search|(?:sabse|sbse|sabase)\s+(?:jyada|jyaada|adhik)\s+(?:search|seach|searched|dekhi)|search(?:ed)?\s+(?:ki|hui|gayi|gyi|h|hai)|popular listing|सबसे ज्यादा खोज|सबसे अधिक खोज/.test(textValue);
  const analyticsQuestion = /report|analytics|aggregate|count|metric|trend|dashboard|how many|kitne|कितने|कितनी|कौन.*ज्यादा|(?:sabse|sbse)\s+(?:jyada|adhik)|सबसे ज्यादा/.test(textValue);
  const fixRequest = /fix|resolve|repair|correct|thik|sahi karo|sudhar|ठीक करो|सुधार/.test(textValue);
  const consolidatedQaTask = isConsolidatedTeamQaTask(taskTitle, taskDescription);
  const dailyActivityTask = isDailyWebsiteActivityTask(taskTitle, taskDescription);
  const countTask = !consolidatedQaTask && !dailyActivityTask &&
    /(count|how many|total|number of|quantity|kitne|kitni|kitna|कितने|कितनी|कितना|कुल कितनी|कुल कितने)/i.test(textValue) &&
    /(property|properties|listing|hostel|\bpg\b|tiffin|mess|library|cafe|bookstore|प्रॉपर्टी|लिस्टिंग|होस्टल)/i.test(textValue);
  if (consolidatedQaTask) {
    for (const roleKey of consolidatedQaRoles) add(roleKey);
  } else if (dailyActivityTask) {
    for (const roleKey of dailyActivityRoles) add(roleKey);
  } else if (countTask) {
    add("data_analyst_reporting_manager");
    add("quality_control_manager");
  } else {
    if (loginIssue) { add("technical_support_engineer"); if (customerIssue) add("customer_support_executive"); }
    if (popularityQuestion || analyticsQuestion) add("data_analyst_reporting_manager");
    if (propertyIssue && !popularityQuestion) add("data_listing_manager");
    if (propertyIssue && /issue|problem|galat|missing|update|outdated|duplicate|kharab|दिक्कत|गलत|अपडेट|समस्या/.test(textValue)) add("data_listing_manager");
    if (customerIssue && !loginIssue) add("customer_support_executive");
    if (/bug|error|code|technical|deploy|build|function|api|crash|website|page|mobile|map|direction|not working|nahi chal|failed|failure|त्रुटि|एरर/.test(textValue)) add("technical_support_engineer");
    if (/research|source|public web|student support|official website|citation|website research/.test(textValue)) add("data_collection_executive");
    if (/seo|robots|sitemap|canonical|metadata|indexing|ranking|search visibility/.test(textValue)) add("seo_marketing_manager");
    if (/social|instagram|caption|post|content calendar|campaign/.test(textValue)) add("social_media_manager");
    if (/test|quality|verify|verification|acceptance criteria|regression/.test(textValue)) add("quality_control_manager");
    if (fixRequest && (loginIssue || propertyIssue || customerIssue)) add("quality_control_manager");
    if (popularityQuestion || analyticsQuestion) add("quality_control_manager");
    if ((loginIssue || customerIssue || (propertyIssue && /issue|problem|missing|update|outdated|duplicate|kharab|दिक्कत|गलत|अपडेट|समस्या/.test(textValue))) && !selected.includes("quality_control_manager")) add("quality_control_manager");
    if (selected.length === 0) add("quality_control_manager");
    if (selected.length > 1 && !selected.includes("quality_control_manager")) add("quality_control_manager");
  }

  const labels: Record<string, {title:string;rationale:string;expected:string}> = {
    data_collection_executive: {title:"Collect first-party StudentHubHelp evidence",rationale:"The task calls for source-backed public information; use approved first-party pages only in API-independent mode.",expected:"A source inventory with exact URLs, extracted facts and explicit unknowns."},
    data_listing_manager: dailyActivityTask
      ? {title:"Audit today's property additions, updates and removals",rationale:"The Owner requested a daily website activity report; inspect property creation/update timestamps and property audit events read-only.",expected:"Property-wise additions, timestamp-based updates, logged removals, event times and explicit evidence gaps; no listing changes."}
      : {title:"Inspect listing quality and property issues",rationale:"The request concerns property/listing popularity, completeness or reported defects; inspect safe listing fields and report evidence only.",expected:"Property-wise findings with confirmed defects, suspected issues and proposed updates; no listing changes."},
    data_analyst_reporting_manager: dailyActivityTask
      ? {title:"Verify bookings and prepare the Owner's daily activity summary",rationale:"The Owner requested a daily website activity report; verify booking records and consolidate counts/statuses from read-only evidence.",expected:"A simple Hindi Owner summary with booking statuses, exact date window, source coverage and unavailable data clearly labelled."}
      : {title:"Count city-wise properties and prepare Owner report",rationale:"The task explicitly requests category-wise property counts for a city; use exact city-filtered Supabase evidence and never substitute global totals or samples.",expected:"An Owner-facing total, six category counts, status breakdown, source tables and limitations."},
    technical_support_engineer: {title:"Diagnose technical or login issue",rationale:"The request concerns authentication, website behavior or a technical failure; inspect repository code and available safe diagnostics.",expected:"Reproduction steps, evidence-backed cause or hypotheses, minimal patch proposal and regression checklist; no production deploy."},
    seo_marketing_manager: {title:"Inspect public SEO and crawl signals",rationale:"The task concerns search visibility or technical SEO; review public crawl resources and page metadata.",expected:"An evidence-based SEO audit checklist with prioritized recommendations."},
    social_media_manager: {title:"Prepare social content draft",rationale:"The task concerns social content or campaigns; create draft-only copy from verified brand facts.",expected:"A content draft or calendar proposal, not published."},
    customer_support_executive: {title:"Triage customer issue and prepare reply",rationale:"The task includes a student/customer concern; classify it and draft a safe response without exposing account data or sending messages.",expected:"A support response draft, required non-sensitive details and escalation triggers; no account changes or message sending."},
    quality_control_manager: {title:"Verify findings and proposed resolution",rationale:"Independent review is required to check evidence, privacy and acceptance criteria before owner review.",expected:"A criterion-by-criterion PASS/FAIL/INCONCLUSIVE report; no release approval or production action."}
  };
  const steps = selected.slice(0,8).map(role_key => ({title:labels[role_key].title,role_key,rationale:labels[role_key].rationale,expected_output:labels[role_key].expected,requires_external_action:false}));
  return {objective:redact((taskTitle||"Office task").slice(0,240)),summary:"Deterministic intent routing with role-specific delegation. Metrics are reported only when telemetry exists; all steps are proposal-only and require owner approval for changes.",risk_level:selected.some(k=>["data_collection_executive","technical_support_engineer","customer_support_executive","data_listing_manager"].includes(k))?"medium":"low",requires_owner_approval:true,steps};
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return new Response("Forbidden", { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return respond({ ok: false, code: "method_not_allowed" }, 405, origin);
  if (!isAllowedOrigin(origin)) return respond({ ok: false, code: "origin_not_allowed" }, 403, origin);

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return respond({ ok: false, code: "authentication_required" }, 401, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return respond({ ok: false, code: "server_configuration_error" }, 500, origin);

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
    });
    if (!authResponse.ok) return respond({ ok: false, code: "invalid_session" }, 401, origin);
    const user = await authResponse.json();
    const claims = readJwt(token);
    if (!user?.id || claims?.sub !== user.id) return respond({ ok: false, code: "invalid_session" }, 401, origin);
    if (claims?.aal !== "aal2") return respond({ ok: false, code: "mfa_required" }, 428, origin);

    const body = await req.json().catch(() => null);
    if (!body || !["list_plans", "plan_task", "execute_plan"].includes(body.action)) {
      return respond({ ok: false, code: "invalid_request" }, 400, origin);
    }

    if (body.action === "list_plans") {
      const result = await rpc(supabaseUrl, serviceKey, "office_gm_list_plans", { p_user_id: user.id });
      if (!result.ok) return respond({ ok: false, code: "owner_access_denied" }, 403, origin);
      return respond({ ok: true, data: result.data }, 200, origin);
    }

    const taskId = typeof body.task_id === "string" ? body.task_id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(taskId)) {
      return respond({ ok: false, code: "invalid_task_id" }, 400, origin);
    }

    if (body.action === "execute_plan") {
      const preparedForRun = await rpc(supabaseUrl, serviceKey, "office_gm_prepare_task", {
        p_user_id: user.id, p_task_id: taskId
      });
      if (!preparedForRun.ok) {
        const code = preparedForRun.message === "task_must_be_queued" ? "task_must_be_queued"
          : preparedForRun.message === "task_not_found" ? "task_not_found" : "owner_access_denied";
        return respond({ ok: false, code }, preparedForRun.message === "owner_access_denied" ? 403 : 409, origin);
      }
      const plansResult = await rpc(supabaseUrl, serviceKey, "office_gm_list_plans", { p_user_id: user.id });
      if (!plansResult.ok) return respond({ ok: false, code: "gm_plan_unavailable" }, 503, origin);
      const planRow = (Array.isArray(plansResult.data?.plans) ? plansResult.data.plans : [])
        .find((item: any) => String(item.task_id) === taskId);
      const plan = planRow?.plan;
      const steps = Array.isArray(plan?.steps) ? plan.steps : [];
      const taskForPlan = preparedForRun.data?.task;
      const consolidatedQaTask = isConsolidatedTeamQaTask(
        String(taskForPlan?.title || ""), String(taskForPlan?.description || "")
      );
      const dailyActivityTask = isDailyWebsiteActivityTask(
        String(taskForPlan?.title || ""), String(taskForPlan?.description || "")
      );
      const planRoleKeys = steps.map((step: any) => String(step?.role_key || ""));
      const consolidatedPlanValid = !consolidatedQaTask || (
        steps.length === consolidatedQaRoles.length &&
        new Set(planRoleKeys).size === consolidatedQaRoles.length &&
        consolidatedQaRoles.every(roleKey => planRoleKeys.includes(roleKey))
      );
      const dailyActivityPlanValid = !dailyActivityTask || (
        steps.length === dailyActivityRoles.length &&
        new Set(planRoleKeys).size === dailyActivityRoles.length &&
        dailyActivityRoles.every(roleKey => planRoleKeys.includes(roleKey))
      );
      if (!plan || plan.plan_status !== "proposal_only" || plan.requires_owner_approval !== true ||
          steps.length < 1 || steps.length > 8 || !consolidatedPlanValid || !dailyActivityPlanValid ||
          steps.some((step: any) => !step || typeof step.role_key !== "string" ||
            step.role_key === "general_manager" || step.requires_external_action !== false)) {
        return respond({ ok: false, code: consolidatedQaTask ? "gm_consolidated_plan_incomplete" : "gm_plan_not_safe_to_run" }, 409, origin);
      }
      const completed: Array<{ role_key: string; step_index: number }> = [];
      for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
        const step = steps[stepIndex];
        const employeeResponse = await fetch(supabaseUrl + "/functions/v1/office-employee-agent", {
          method: "POST",
          headers: {
            apikey: anonKey,
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "generate_draft",
            task_id: taskId,
            role_key: step.role_key,
            step_index: stepIndex
          }),
          signal: AbortSignal.timeout(45000)
        });
        const employeeResult = await employeeResponse.json().catch(() => null);
        if (!employeeResponse.ok || employeeResult?.ok !== true) {
          return respond({
            ok: false,
            code: "employee_step_failed",
            data: {
              task_id: taskId,
              completed_steps: completed,
              failed_step: { role_key: step.role_key, step_index: stepIndex },
              employee_code: String(employeeResult?.code || "employee_agent_unavailable")
            }
          }, 424, origin);
        }
        completed.push({ role_key: step.role_key, step_index: stepIndex });
      }
      const draftsResult = await rpc(supabaseUrl, serviceKey, "office_employee_list_drafts", { p_user_id: user.id });
      const draftRows = Array.isArray(draftsResult.data?.items) ? draftsResult.data.items : [];
      const taskDraftRow = draftRows.find((item: any) => String(item.task_id) === taskId);
      const taskDrafts = Array.isArray(taskDraftRow?.drafts) ? taskDraftRow.drafts : [];
      const qcDraft = taskDrafts.find((item: any) => item.role_key === "quality_control_manager");
      const taskForCompletion = preparedForRun.data?.task;
      // Reuse the consolidatedQaTask flag validated earlier in this execute_plan scope.
      const completedRoleKeys = completed.map(item => item.role_key);
      const savedRoleKeys = taskDrafts.map((item: any) => String(item?.role_key || ""));
      const completedRolesValid = consolidatedQaTask
        ? completed.length === consolidatedQaRoles.length && new Set(completedRoleKeys).size === consolidatedQaRoles.length &&
          consolidatedQaRoles.every(roleKey => completedRoleKeys.includes(roleKey))
        : dailyActivityTask
          ? completed.length === dailyActivityRoles.length && new Set(completedRoleKeys).size === dailyActivityRoles.length &&
            dailyActivityRoles.every(roleKey => completedRoleKeys.includes(roleKey))
          : true;
      const savedDraftsValid = consolidatedQaTask
        ? taskDrafts.length === consolidatedQaRoles.length && new Set(savedRoleKeys).size === consolidatedQaRoles.length &&
          consolidatedQaRoles.every(roleKey => savedRoleKeys.includes(roleKey))
        : dailyActivityTask
          ? taskDrafts.length === dailyActivityRoles.length &&
            new Set(savedRoleKeys).size === dailyActivityRoles.length &&
            dailyActivityRoles.every(roleKey => savedRoleKeys.includes(roleKey))
          : true;
      const qcText = String(qcDraft?.draft_content || "");
      const qcVerdict = consolidatedQaTask
        ? (/(?:^|\n)## Overall QC verdict: PASS[ \t]*(?:\r?\n|$)/i.test(qcText) ? "PASS" : "FAIL_OR_INCONCLUSIVE")
        : dailyActivityTask
          ? (/(?:^|\n)## QC verdict: PASS WITH LIMITATIONS[ \t]*(?:\r?\n|$)/i.test(qcText) ? "PASS WITH LIMITATIONS"
            : /(?:^|\n)## QC verdict: PASS[ \t]*(?:\r?\n|$)/i.test(qcText) ? "PASS" : "FAIL_OR_INCONCLUSIVE")
          : (/(?:^|\n)(?:## )?QC verdict:[ \t]*PASS[ \t]*(?:\r?\n|$)/i.test(qcText) ? "PASS" : "FAIL_OR_INCONCLUSIVE");
      const qcPassed = qcVerdict === "PASS" || (dailyActivityTask && qcVerdict === "PASS WITH LIMITATIONS");
      const taskCompleted = (consolidatedQaTask || dailyActivityTask)
        ? completedRolesValid && savedDraftsValid && qcPassed
        : qcPassed;
      const taskText = String(taskForCompletion?.title || "") + " " + String(taskForCompletion?.description || "");
      const countTask = !consolidatedQaTask && !dailyActivityTask &&
        /(count|how many|total|number of|quantity|kitne|kitni|kitna|कितने|कितनी|कितना|कुल कितनी|कुल कितने)/i.test(taskText);
      const blockedReason = !draftsResult.ok ? "qc_drafts_unavailable"
        : consolidatedQaTask && !completedRolesValid ? "consolidated_employee_assignments_incomplete"
        : consolidatedQaTask && !savedDraftsValid ? "consolidated_employee_drafts_incomplete"
        : dailyActivityTask && !completedRolesValid ? "daily_activity_employee_assignments_incomplete"
        : dailyActivityTask && !savedDraftsValid ? "daily_activity_employee_drafts_incomplete"
        : !qcDraft ? "qc_draft_missing"
        : !qcPassed ? (countTask ? "counting_task_qc_failed" : "qc_pass_required") : null;
      return respond({
        ok: true,
        data: {
          task_id: taskId, completed_steps: completed, draft_only: true, external_actions_executed: false,
          task_completed: taskCompleted,
          completion_status: taskCompleted
            ? (qcVerdict === "PASS WITH LIMITATIONS" ? "qc_pass_with_limitations_owner_review_required" : "qc_pass_owner_review_required")
            : "blocked_qc",
          qc_status: qcDraft ? qcVerdict : "MISSING",
          completion_blocked_reason: blockedReason,
          message: taskCompleted ? (dailyActivityTask
            ? (qcVerdict === "PASS WITH LIMITATIONS"
              ? "Daily website activity report passed QC WITH LIMITATIONS. The three required employee drafts are saved; Owner review is required and no external action was executed."
              : "Daily website activity report passed QC. The three required employee drafts are saved; Owner review is required and no external action was executed.")
            : "QC passed and all required employee drafts are saved. Evidence-backed report is ready for Owner review; no external action was executed.")
            : "Employee drafts were generated, but the task is NOT complete. All required role drafts and an accepted QC verdict are mandatory."
        }
      }, 200, origin);
    }

    const prepared = await rpc(supabaseUrl, serviceKey, "office_gm_prepare_task", {
      p_user_id: user.id, p_task_id: taskId
    });
    if (!prepared.ok) {
      const code = prepared.message === "task_must_be_queued" ? "task_must_be_queued"
        : prepared.message === "task_not_found" ? "task_not_found"
        : "owner_access_denied";
      return respond({ ok: false, code }, prepared.message === "owner_access_denied" ? 403 : 409, origin);
    }

    const task = prepared.data?.task;
    const roles = Array.isArray(prepared.data?.roles) ? prepared.data.roles : [];
    if (!task || roles.length !== 8) return respond({ ok: false, code: "team_registry_unavailable" }, 503, origin);

    const taskTitle = redact(String(task.title || "").slice(0, 160));
    const taskDescription = redact(String(task.description || "").slice(0, 1800));
    let plan: any;
    let planningMode = "deterministic_fallback";
    let planningReason = "gemini_not_enabled_or_not_ready";
    try {
      const allowedRoles = new Set<string>(roles.map((role: any) => String(role.role_key)));
      const deterministic = buildDeterministicPlan(taskTitle, taskDescription, roles);
      plan = parsePlan(JSON.stringify(deterministic), allowedRoles);
      const prompt = buildGeneralManagerPrompt(taskTitle, taskDescription, roles);
      const ai = await callOfficeGemini(supabaseUrl, anonKey, token, prompt);
      if (ai.available && ai.text) {
        try {
          const aiPlan = parsePlan(ai.text, allowedRoles);
          plan = aiPlan;
          planningMode = "gemini_free_tier";
          planningReason = "quota_guarded_planning_succeeded";
        } catch {
          planningReason = "gemini_plan_failed_schema_or_role_validation";
        }
      } else if (ai.reason) {
        planningReason = ai.reason;
      }
      if (isConsolidatedTeamQaTask(taskTitle, taskDescription) &&
          (plan.steps.length !== consolidatedQaRoles.length ||
           new Set(plan.steps.map((step: any) => step.role_key)).size !== consolidatedQaRoles.length ||
           !consolidatedQaRoles.every(roleKey => plan.steps.some((step: any) => step.role_key === roleKey)))) {
        // Deterministic special-case routing is authoritative for mandatory workflow roles.
        plan = parsePlan(JSON.stringify(deterministic), allowedRoles);
        planningMode = "deterministic_required_workflow";
        planningReason = "mandatory_consolidated_qc_roles_enforced";
      }
      if (isDailyWebsiteActivityTask(taskTitle, taskDescription) &&
          (plan.steps.length !== dailyActivityRoles.length ||
           new Set(plan.steps.map((step: any) => step.role_key)).size !== dailyActivityRoles.length ||
           !dailyActivityRoles.every(roleKey => plan.steps.some((step: any) => step.role_key === roleKey)))) {
        plan = parsePlan(JSON.stringify(deterministic), allowedRoles);
        planningMode = "deterministic_required_workflow";
        planningReason = "mandatory_daily_activity_roles_enforced";
      }
    } catch {
      return respond({ ok: false, code: "gm_plan_validation_failed" }, 502, origin);
    }

    const saved = await rpc(supabaseUrl, serviceKey, "office_gm_save_plan", {
      p_user_id: user.id, p_task_id: taskId, p_plan: plan
    });
    if (!saved.ok) {
      const code = saved.message === "task_must_be_queued" ? "task_must_be_queued"
        : saved.message === "invalid_gm_plan" || saved.message === "invalid_gm_plan_step" ? "gm_plan_validation_failed"
        : "gm_plan_save_failed";
      return respond({ ok: false, code }, 409, origin);
    }
    return respond({ ok: true, data: { task_id: taskId, plan, planning_mode: planningMode, planning_reason: planningReason } }, 200, origin);
  } catch {
    return respond({ ok: false, code: "general_manager_unavailable" }, 503, origin);
  }
});
