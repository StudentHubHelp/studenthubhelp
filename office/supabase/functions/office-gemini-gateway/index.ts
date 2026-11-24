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
function safeProviderError(value: unknown): string {
  if (typeof value !== "string") return "provider_error";
  const code = value.toLowerCase();
  if (code.includes("resource_exhausted") || code.includes("rate limit") || code.includes("quota")) return "provider_rate_limit";
  if (code.includes("permission_denied") || code.includes("billing")) return "provider_access_denied";
  if (code.includes("api_key_invalid") || code.includes("api key not valid") || code.includes("unauthenticated")) return "provider_key_invalid";
  if (code.includes("invalid_argument") || code.includes("bad_request") || code.includes("invalid request")) return "provider_invalid_request";
  if (code.includes("not_found")) return "provider_model_not_found";
  return "provider_error";
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
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return respond({ ok: false, code: "server_configuration_error" }, 500, origin);
  }

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!authResponse.ok) return respond({ ok: false, code: "invalid_session" }, 401, origin);
    const user = await authResponse.json();
    const claims = readJwt(token);
    if (!user?.id || claims?.sub !== user.id) return respond({ ok: false, code: "invalid_session" }, 401, origin);
    if (claims?.aal !== "aal2") return respond({ ok: false, code: "mfa_required" }, 428, origin);

    const body = await req.json().catch(() => null);
    if (!body || !["status", "generate"].includes(body.action)) {
      return respond({ ok: false, code: "invalid_request" }, 400, origin);
    }

    if (body.action === "status") {
      const result = await rpc(supabaseUrl, serviceKey, "office_gemini_quota_status", { p_user_id: user.id });
      if (!result.ok) return respond({ ok: false, code: "office_service_unavailable" }, 503, origin);
      return respond({
        ok: true,
        data: { ...result.data, api_key_configured: Boolean(Deno.env.get("GEMINI_API_KEY")) }
      }, 200, origin);
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > 6000) {
      return respond({ ok: false, code: "prompt_must_be_1_to_6000_characters" }, 400, origin);
    }
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return respond({ ok: false, code: "gemini_secret_not_configured" }, 503, origin);

    const estimatedInputTokens = Math.max(
      64,
      Math.ceil(prompt.length * 0.75) + 64,
      Math.ceil(new TextEncoder().encode(prompt).length / 2) + 64
    );
    const reservation = await rpc(supabaseUrl, serviceKey, "office_gemini_reserve", {
      p_user_id: user.id,
      p_estimated_input_tokens: estimatedInputTokens
    });
    if (!reservation.ok) {
      const msg = reservation.message;
      const code = msg === "owner_access_denied" ? "owner_access_denied"
        : msg === "daily_app_cap_reached" ? "daily_quota_guard_reached"
        : msg === "rpm_app_cap_reached" ? "minute_request_cap_reached"
        : msg === "tpm_app_cap_reached" || msg === "request_exceeds_tpm_app_cap" ? "minute_token_cap_reached"
        : msg === "free_tier_not_confirmed" ? "free_tier_confirmation_required"
        : msg === "free_tier_caps_not_configured" ? "free_tier_caps_not_configured"
        : msg === "gemini_gateway_disabled" ? "gemini_gateway_disabled"
        : msg === "quota_guard_disabled" ? "quota_guard_disabled"
        : msg === "paid_billing_mode_forbidden" ? "paid_billing_mode_forbidden"
        : msg === "model_not_allowlisted" ? "model_not_allowlisted"
        : "quota_guard_blocked";
      const quotaLimitReached = [
        "daily_app_cap_reached",
        "rpm_app_cap_reached",
        "tpm_app_cap_reached",
        "request_exceeds_tpm_app_cap"
      ].includes(msg);
      return respond({ ok: false, code },
        msg === "owner_access_denied" ? 403 : quotaLimitReached ? 429 : 503, origin);
    }

    const reservationId = reservation.data?.reservation_id;
    const model = reservation.data?.model;
    const maxOutputTokens = reservation.data?.max_output_tokens;
    if (!reservationId || model !== "gemini-3.5-flash-lite" || !Number.isInteger(maxOutputTokens)) {
      return respond({ ok: false, code: "quota_reservation_invalid" }, 503, origin);
    }

    let actualInputTokens = 0;
    let actualOutputTokens = 0;
    let activeReservationId = reservationId;
    let activeModel = model;
    try {
      let providerResponse: Response | null = null;
      let providerData: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        providerResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens, temperature: 0.2 }
            }),
            signal: AbortSignal.timeout(20000)
          }
        );
        if (providerResponse.ok || ![502, 503].includes(providerResponse.status) || attempt === 1) break;
        console.warn("Gemini primary transient upstream response; one bounded retry", JSON.stringify({
          model: activeModel, http_status: providerResponse.status, retry_in_ms: 2000
        }));
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      if (!providerResponse) throw new Error("gemini_provider_unavailable");
      providerData = await providerResponse.json().catch(() => null);

      if (!providerResponse.ok) {
        const primaryStatus = providerResponse.status;
        const primaryDiagnostic = [
          providerData?.error?.status,
          providerData?.error?.message,
          providerData?.error?.details?.map?.((item: any) => item?.reason || item?.["@type"]).filter(Boolean).join(" ")
        ].filter((item) => typeof item === "string").join(" ");
        const primaryCode = safeProviderError(primaryDiagnostic);
        console.error("Gemini primary model request failed", JSON.stringify({
          model: activeModel, http_status: primaryStatus, provider_code: primaryCode
        }));
        const primaryFinalized = await rpc(supabaseUrl, serviceKey, "office_gemini_finalize", {
          p_user_id: user.id, p_reservation_id: activeReservationId,
          p_request_status: primaryStatus === 429 ? "rate_limited" : "error",
          p_actual_input_tokens: 0, p_actual_output_tokens: 0, p_provider_error_code: primaryCode
        });
        if (!primaryFinalized.ok) return respond({ ok: false, code: "usage_recording_failed" }, 503, origin);

        if (![502, 503].includes(primaryStatus)) {
          return respond({ ok: false, code: `gemini_provider_http_${primaryStatus}_${primaryCode}` },
            primaryStatus === 429 ? 429 : 502, origin);
        }

        const fallbackReservation = await rpc(supabaseUrl, serviceKey, "office_gemini_reserve_fallback", {
          p_user_id: user.id, p_estimated_input_tokens: estimatedInputTokens
        });
        if (!fallbackReservation.ok ||
            fallbackReservation.data?.model !== "gemini-3.1-flash-lite" ||
            !fallbackReservation.data?.reservation_id ||
            !Number.isInteger(fallbackReservation.data?.max_output_tokens)) {
          const fallbackReason = fallbackReservation.message || "fallback_reservation_unavailable";
          const fallbackQuotaLimitReached = [
            "daily_app_cap_reached",
            "rpm_app_cap_reached",
            "tpm_app_cap_reached",
            "request_exceeds_tpm_app_cap",
            "fallback_quota_cap_blocked"
          ].includes(fallbackReason);
          console.warn("Gemini fallback not attempted because its Free Tier quota reservation was blocked", JSON.stringify({
            reason: fallbackReason
          }));
          return respond({
            ok: false,
            code: fallbackQuotaLimitReached ? "daily_quota_guard_reached" : "gemini_fallback_quota_guard_blocked"
          }, fallbackQuotaLimitReached ? 429 : 503, origin);
        }

        activeReservationId = fallbackReservation.data.reservation_id;
        activeModel = fallbackReservation.data.model;
        console.warn("Gemini primary exhausted bounded retries; using Free Tier fallback once", JSON.stringify({
          primary_model: model, fallback_model: activeModel, primary_http_status: primaryStatus
        }));
        for (let fallbackAttempt = 0; fallbackAttempt < 2; fallbackAttempt++) {
          providerResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  maxOutputTokens: fallbackReservation.data.max_output_tokens,
                  temperature: 0.2
                }
              }),
              signal: AbortSignal.timeout(20000)
            }
          );
          if (providerResponse.ok || ![502, 503].includes(providerResponse.status) || fallbackAttempt === 1) break;
          console.warn("Gemini fallback transient upstream response; one bounded retry", JSON.stringify({
            model: activeModel, http_status: providerResponse.status, retry_in_ms: 3000
          }));
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        providerData = await providerResponse.json().catch(() => null);
        if (!providerResponse.ok) {
          const fallbackDiagnostic = [
            providerData?.error?.status,
            providerData?.error?.message,
            providerData?.error?.details?.map?.((item: any) => item?.reason || item?.["@type"]).filter(Boolean).join(" ")
          ].filter((item) => typeof item === "string").join(" ");
          const fallbackCode = safeProviderError(fallbackDiagnostic);
          await rpc(supabaseUrl, serviceKey, "office_gemini_finalize", {
            p_user_id: user.id, p_reservation_id: activeReservationId,
            p_request_status: providerResponse.status === 429 ? "rate_limited" : "error",
            p_actual_input_tokens: 0, p_actual_output_tokens: 0, p_provider_error_code: fallbackCode
          });
          console.error("Gemini Free Tier fallback model failed", JSON.stringify({
            model: activeModel, http_status: providerResponse.status, provider_code: fallbackCode
          }));
          return respond({
            ok: false, code: `gemini_provider_http_${providerResponse.status}_${fallbackCode}_fallback`
          }, providerResponse.status === 429 ? 429 : 502, origin);
        }
      }

      actualInputTokens = Number(providerData?.usageMetadata?.promptTokenCount || 0);
      actualOutputTokens = Number(providerData?.usageMetadata?.candidatesTokenCount || 0);
      const textOutput = (providerData?.candidates?.[0]?.content?.parts || [])
        .map((part: any) => typeof part.text === "string" ? part.text : "")
        .join("")
        .trim();
      if (!textOutput) {
        await rpc(supabaseUrl, serviceKey, "office_gemini_finalize", {
          p_user_id: user.id, p_reservation_id: activeReservationId,
          p_request_status: "error", p_actual_input_tokens: actualInputTokens,
          p_actual_output_tokens: actualOutputTokens, p_provider_error_code: "empty_or_blocked_response"
        });
        return respond({ ok: false, code: "empty_or_blocked_response" }, 502, origin);
      }

      const finalized = await rpc(supabaseUrl, serviceKey, "office_gemini_finalize", {
        p_user_id: user.id, p_reservation_id: activeReservationId,
        p_request_status: "success", p_actual_input_tokens: actualInputTokens,
        p_actual_output_tokens: actualOutputTokens, p_provider_error_code: null
      });
      if (!finalized.ok) return respond({ ok: false, code: "usage_recording_failed" }, 503, origin);
      return respond({
        ok: true,
        data: { text: textOutput, model: activeModel, usage: { input_tokens: actualInputTokens, output_tokens: actualOutputTokens } }
      }, 200, origin);
    } catch {
      await rpc(supabaseUrl, serviceKey, "office_gemini_finalize", {
        p_user_id: user.id, p_reservation_id: activeReservationId,
        p_request_status: "error", p_actual_input_tokens: actualInputTokens,
        p_actual_output_tokens: actualOutputTokens, p_provider_error_code: "network_or_timeout"
      }).catch(() => null);
      return respond({ ok: false, code: "gemini_provider_unavailable" }, 503, origin);
    }
  } catch {
    return respond({ ok: false, code: "office_service_unavailable" }, 503, origin);
  }
});
