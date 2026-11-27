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
    if (!body || !["list", "review"].includes(body.action)) {
      return respond({ ok: false, code: "invalid_request" }, 400, origin);
    }
    if (body.action === "list") {
      const status = typeof body.status === "string" ? body.status : "pending";
      const result = await rpc(supabaseUrl, serviceKey, "office_approval_list", {
        p_user_id: user.id, p_status: status
      });
      if (!result.ok) return respond({ ok: false, code: "approval_list_failed" }, 400, origin);
      return respond({ ok: true, data: result.data }, 200, origin);
    }

    const approvalId = typeof body.approval_id === "string" ? body.approval_id : "";
    const decision = body.decision;
    const reviewNote = typeof body.review_note === "string" ? body.review_note.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(approvalId) ||
        !["approved", "rejected"].includes(decision) || reviewNote.length > 1000) {
      return respond({ ok: false, code: "invalid_review_request" }, 400, origin);
    }
    if (decision === "rejected" && !reviewNote) {
      return respond({ ok: false, code: "rejection_note_required" }, 400, origin);
    }

    const result = await rpc(supabaseUrl, serviceKey, "office_approval_review", {
      p_user_id: user.id, p_approval_id: approvalId,
      p_decision: decision, p_review_note: reviewNote || null
    });
    if (!result.ok) {
      const code = result.message === "approval_already_reviewed" ? "approval_already_reviewed"
        : result.message === "approval_not_found" ? "approval_not_found"
        : result.message === "invalid_approval_decision" ? "invalid_approval_decision"
        : result.message === "review_note_too_long" ? "review_note_too_long"
        : "approval_review_failed";
      return respond({ ok: false, code }, 409, origin);
    }
    if (result.data?.ok === false) {
      return respond({ ok: false, code: result.data.code || "approval_review_failed" }, 409, origin);
    }
    return respond({ ok: true, data: result.data }, 200, origin);
  } catch {
    return respond({ ok: false, code: "approval_center_unavailable" }, 503, origin);
  }
});
