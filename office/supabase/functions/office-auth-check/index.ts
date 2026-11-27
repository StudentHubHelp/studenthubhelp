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
  "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : "https://office.studenthubhelp.in",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});
const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
function jwtPayload(token: string): Record<string, unknown> | null {
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
  if (req.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405, origin);
  if (!isAllowedOrigin(origin)) return json({ ok: false, code: "origin_not_allowed" }, 403, origin);
  const match = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ ok: false, code: "authentication_required" }, 401, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ ok: false, code: "server_configuration_error" }, 500, origin);

  try {
    const token = match[1];
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
    });
    if (!authResponse.ok) return json({ ok: false, code: "invalid_session" }, 401, origin);
    const user = await authResponse.json();
    if (!user?.id) return json({ ok: false, code: "invalid_session" }, 401, origin);
    const claims = jwtPayload(token);
    if (claims?.sub !== user.id) return json({ ok: false, code: "invalid_session" }, 401, origin);
    if (claims?.aal !== "aal2") return json({ ok: false, code: "mfa_required", required_assurance: "aal2" }, 428, origin);

    const ownerResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/office_is_active_owner`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_user_id: user.id })
    });
    if (!ownerResponse.ok) return json({ ok: false, code: "authorization_check_failed" }, 503, origin);
    if (await ownerResponse.json() !== true) return json({ ok: false, code: "owner_access_denied" }, 403, origin);
    return json({ ok: true, access: "owner", assurance: "aal2" }, 200, origin);
  } catch {
    return json({ ok: false, code: "verification_unavailable" }, 503, origin);
  }
});
