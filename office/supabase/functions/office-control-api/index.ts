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
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return new Response("Forbidden", { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return respond({ ok: false, code: "method_not_allowed" }, 405, origin);
  if (!isAllowedOrigin(origin)) return respond({ ok: false, code: "origin_not_allowed" }, 403, origin);

  const bearer = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return respond({ ok: false, code: "authentication_required" }, 401, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return respond({ ok: false, code: "server_configuration_error" }, 500, origin);
  }

  try {
    const token = bearer[1];
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!authResponse.ok) return respond({ ok: false, code: "invalid_session" }, 401, origin);
    const user = await authResponse.json();
    if (!user?.id) return respond({ ok: false, code: "invalid_session" }, 401, origin);

    const claims = readJwt(token);
    if (claims?.sub !== user.id || claims?.aal !== "aal2") {
      return respond({ ok: false, code: "mfa_required" }, 428, origin);
    }

    const body = await req.json().catch(() => null);
    const allowedActions = new Set([
      "overview", "list_tasks", "list_employees", "create_task",
      "set_task_status", "list_task_logs", "archive_task", "restore_task",
    ]);
    if (!body || typeof body.action !== "string" || !allowedActions.has(body.action)) {
      return respond({ ok: false, code: "invalid_request" }, 400, origin);
    }
    const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? body.payload : {};

    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/office_control_api`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Accept-Profile": "public",
        "Content-Profile": "public",
      },
      body: JSON.stringify({
        p_user_id: user.id,
        p_action: body.action,
        p_payload: payload,
      }),
    });
    const result = await rpcResponse.json().catch(() => null);
    if (!rpcResponse.ok) {
      const message = typeof result?.message === "string" ? result.message : "";
      const code = message === "owner_access_denied" ? "owner_access_denied"
        : message === "task_not_found_or_transition_not_allowed" ? "task_transition_not_allowed"
        : message === "task_not_found_or_archive_blocked" ? "task_archive_blocked"
        : message.startsWith("title_") || message === "description_too_long" ||
          message === "invalid_priority" || message.startsWith("invalid_") ||
          message.startsWith("owner_can_only") ? "invalid_input"
        : "office_request_failed";
      const status = rpcResponse.status === 403 || rpcResponse.status === 401 ? rpcResponse.status : 400;
      return respond({ ok: false, code }, status, origin);
    }
    return respond({ ok: true, data: result }, 200, origin);
  } catch {
    return respond({ ok: false, code: "office_service_unavailable" }, 503, origin);
  }
});
