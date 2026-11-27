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
    if (!body || !["overview", "propose"].includes(body.action)) {
      return respond({ ok: false, code: "invalid_request" }, 400, origin);
    }
    if (body.action === "overview") {
      const result = await rpc(supabaseUrl, serviceKey, "office_integration_overview", { p_user_id: user.id });
      if (!result.ok) return respond({ ok: false, code: "owner_access_denied" }, 403, origin);
      const data = result.data || {};
      data.integrations = await Promise.all((data.integrations || []).map(async (integration: any) => {
        const secret = integration.secret_reference ? Deno.env.get(integration.secret_reference) || "" : "";
        const base = {
          ...integration,
          secret_configured: integration.secret_reference ? Boolean(secret) : integration.provider_key === "supabase"
        };
        if (!["gemini", "brevo", "tavily"].includes(integration.provider_key)) return base;
        if (integration.connection_status !== "connected") return {
          ...base, credential_valid: null, credential_status: "disabled",
          free_plan_allowed: false, paygo_enabled: false
        };
        if (!secret) return {
          ...base, credential_valid: false, credential_status: "missing",
          free_plan_allowed: false, paygo_enabled: false
        };
        try {
          if (integration.provider_key === "gemini") {
            const quota = await rpc(supabaseUrl, serviceKey, "office_gemini_quota_status", { p_user_id: user.id });
            const state = quota.ok ? quota.data : null;
            const ready = state?.ready === true && state?.billing_mode === "free_tier_only" &&
              state?.free_tier_confirmed === true && state?.quota_guard_enabled === true &&
              state?.gateway_enabled === true;
            return {
              ...base, credential_valid: ready, credential_status: ready ? "valid_free" : "unavailable",
              free_plan_allowed: ready, provider_model: state?.model || null,
              quota_rpm_cap: state?.rpm_app_cap || null, quota_daily_cap: state?.daily_app_cap || null
            };
          }
          if (integration.provider_key === "brevo") {
            const check = await fetch("https://api.brevo.com/v3/account", {
              method: "GET", headers: { "api-key": secret, "Accept": "application/json" },
              signal: AbortSignal.timeout(10000)
            });
            return {
              ...base, credential_valid: check.ok,
              credential_status: check.ok ? "valid" : check.status === 401 || check.status === 403 ? "invalid" : "unavailable",
              provider_account_status: check.ok ? "reachable" : null
            };
          }
          const usageResponse = await fetch("https://api.tavily.com/usage", {
            method: "GET",
            headers: { Authorization: "Bearer " + secret },
            signal: AbortSignal.timeout(10000)
          });
          if (!usageResponse.ok) return {
            ...base,
            credential_valid: false,
            credential_status: usageResponse.status === 401 || usageResponse.status === 403 ? "invalid" : "unavailable",
            free_plan_allowed: false,
            paygo_enabled: false
          };
          const usage = await usageResponse.json();
          const plan = String(usage.account?.current_plan || "");
          const paygoLimit = Number(usage.account?.paygo_limit || 0);
          const freePlanAllowed = ["researcher", "free"].includes(plan.toLowerCase()) && paygoLimit === 0;
          return {
            ...base,
            credential_valid: true,
            credential_status: freePlanAllowed ? "valid_free" : "paid_plan_blocked",
            provider_plan: plan,
            free_plan_allowed: freePlanAllowed,
            paygo_enabled: paygoLimit > 0,
            provider_key_usage: Number(usage.key?.usage || 0),
            provider_key_limit: Number(usage.key?.limit || 0)
          };
        } catch {
          return {
            ...base, credential_valid: null, credential_status: "unavailable",
            free_plan_allowed: false, paygo_enabled: false
          };
        }
      }));
      return respond({ ok: true, data }, 200, origin);
    }

    const taskId = typeof body.task_id === "string" ? body.task_id : "";
    const providerKey = typeof body.provider_key === "string" ? body.provider_key : "";
    const actionKey = typeof body.action_key === "string" ? body.action_key : "";
    const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload) ? body.payload : {};
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(taskId) ||
        !/^[a-z0-9_]{2,64}$/.test(providerKey) || !/^[a-z0-9_]{2,64}$/.test(actionKey)) {
      return respond({ ok: false, code: "invalid_integration_request" }, 400, origin);
    }

    const result = await rpc(supabaseUrl, serviceKey, "office_integration_propose", {
      p_user_id: user.id, p_task_id: taskId, p_provider_key: providerKey,
      p_action_key: actionKey, p_payload: payload
    });
    if (!result.ok) {
      const code = result.message === "task_must_be_queued" ? "task_must_be_queued"
        : result.message === "task_not_found" ? "task_not_found"
        : result.message === "sensitive_payload_key_forbidden" ? "sensitive_payload_forbidden"
        : result.message === "integration_action_not_proposable" ? "integration_action_not_proposable"
        : result.message === "integration_provider_unknown" ? "integration_provider_unknown"
        : result.message === "invalid_integration_payload" ? "invalid_integration_payload"
        : "owner_access_denied";
      return respond({ ok: false, code }, result.message === "owner_access_denied" ? 403 : 409, origin);
    }
    return respond({ ok: true, data: result.data }, 200, origin);
  } catch {
    return respond({ ok: false, code: "integration_hub_unavailable" }, 503, origin);
  }
});
