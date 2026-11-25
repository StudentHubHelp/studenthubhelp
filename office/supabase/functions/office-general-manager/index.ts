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
        typeof step.requires_external_action !== "boolean") throw new Error("invalid_plan_step");
    return {
      title: redact(title),
      role_key: roleKey,
      rationale: redact(rationale),
      expected_output: redact(expectedOutput),
      requires_external_action: step.requires_external_action
    };
  });
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

function buildDeterministicPlan(taskTitle: string, taskDescription: string, roles: any[]) {
  const textValue = (taskTitle + " " + taskDescription).toLowerCase();
  const available = new Map(roles.map((role: any) => [String(role.role_key), role]));
  const selected: string[] = [];
  const add = (roleKey: string) => { if (available.has(roleKey) && !selected.includes(roleKey)) selected.push(roleKey); };
  if (/research|source|public web|studenthubhelp|student support|official website|citation/.test(textValue)) add("data_collection_executive");
  if (/listing|hostel|\bpg\b|tiffin|mess|library|cafe|bookstore|duplicate|missing field|verification/.test(textValue)) add("data_listing_manager");
  if (/report|analytics|aggregate|count|metric|trend|dashboard/.test(textValue)) add("data_analyst_reporting_manager");
  if (/bug|error|code|technical|deploy|build|function|api|login|crash/.test(textValue)) add("technical_support_engineer");
  if (/seo|robots|sitemap|canonical|metadata|indexing|ranking|search visibility/.test(textValue)) add("seo_marketing_manager");
  if (/social|instagram|caption|post|content calendar|campaign/.test(textValue)) add("social_media_manager");
  if (/support|contact|privacy|ticket|complaint|student query|reply/.test(textValue)) add("customer_support_executive");
  if (/test|quality|verify|verification|acceptance criteria|regression/.test(textValue)) add("quality_control_manager");
  if (selected.length === 0) add("quality_control_manager");
  if (selected.length > 1 && !selected.includes("quality_control_manager")) add("quality_control_manager");
  const labels: Record<string, {title:string;rationale:string;expected:string}> = {
    data_collection_executive: {title:"Collect first-party StudentHubHelp evidence",rationale:"The task calls for research or source-backed public information; this role uses only approved first-party public pages in API-independent mode.",expected:"A source inventory with exact URLs, extracted facts and explicit unknowns."},
    data_listing_manager: {title:"Review listing data quality",rationale:"The task concerns listing completeness, consistency or verification; this role has read-only access to safe listing fields.",expected:"A sample-scoped issue report with confirmed defects separated from suspected issues."},
    data_analyst_reporting_manager: {title:"Prepare aggregate data analysis",rationale:"The task requests counts, metrics or reporting; this role uses aggregate data and avoids personal records.",expected:"A report with table sources, counts, calculation notes and limitations."},
    technical_support_engineer: {title:"Perform read-only technical triage",rationale:"The task concerns code, errors or technical behavior; this role prepares evidence-based diagnostics and patch proposals.",expected:"Reproduction steps, inspected evidence, root-cause hypotheses and regression checklist."},
    seo_marketing_manager: {title:"Inspect public SEO and crawl signals",rationale:"The task concerns search visibility or technical SEO; this role reviews public crawl resources and page metadata.",expected:"An evidence-based SEO audit checklist with prioritized recommendations."},
    social_media_manager: {title:"Prepare social content draft",rationale:"The task concerns social content or campaigns; this role creates draft-only copy from verified brand facts.",expected:"A content draft or calendar proposal, not published."},
    customer_support_executive: {title:"Prepare student-support response draft",rationale:"The task concerns a support request or policy information; this role drafts a reply using available official support context.",expected:"An empathetic reply draft, missing-information list and escalation triggers; not sent."},
    quality_control_manager: {title:"Review deliverable and acceptance criteria",rationale:"Independent quality review is required; this role reports PASS, FAIL or INCONCLUSIVE only when supported by evidence.",expected:"A criterion-by-criterion QC report; no release approval."}
  };
  const steps = selected.slice(0,8).map(role_key => ({
    title: labels[role_key].title,
    role_key,
    rationale: labels[role_key].rationale,
    expected_output: labels[role_key].expected,
    requires_external_action: false
  }));
  return {
    objective: redact((taskTitle || "Office task").slice(0,240)),
    summary: "Deterministic role routing based on task keywords. This is a proposal-only plan, not a claim that work has been executed.",
    risk_level: selected.some(k => ["data_collection_executive","technical_support_engineer","customer_support_executive"].includes(k)) ? "medium" : "low",
    requires_owner_approval: true,
    steps
  };
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
    if (!body || !["list_plans", "plan_task"].includes(body.action)) {
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
    let plan;
    try {
      const allowedRoles = new Set(roles.map((role: any) => role.role_key));
      const deterministic = buildDeterministicPlan(taskTitle, taskDescription, roles);
      plan = parsePlan(JSON.stringify(deterministic), allowedRoles);
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
    return respond({ ok: true, data: { task_id: taskId, plan } }, 200, origin);
  } catch {
    return respond({ ok: false, code: "general_manager_unavailable" }, 503, origin);
  }
});
