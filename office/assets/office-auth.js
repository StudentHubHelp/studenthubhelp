(() => {
  const SUPABASE_URL = "https://idurlccrarznnnqixxsd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_JIRAAdzm97xMNN1jIS_idg_oHEObFhT";
  const OFFICE_AUTH_FUNCTION = SUPABASE_URL + "/functions/v1/office-auth-check";
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const $ = id => document.getElementById(id);
  const status = (message, ok=false) => { $("status").textContent=message; $("status").className="status"+(ok?" success":""); };
  $("year").textContent = new Date().getFullYear();
  let currentFactorId = null;
  const isUuid = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  async function verifyOwnerSession() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return false;
    const { data: assurance, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || assurance?.currentLevel !== "aal2") return false;
    const response = await fetch(OFFICE_AUTH_FUNCTION, {
      method:"POST",
      headers:{ "Authorization":"Bearer "+session.access_token, "apikey":SUPABASE_KEY, "Content-Type":"application/json" },
      body:"{}"
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.ok === true && result.access === "owner";
  }

  async function startMfa() {
    // Best-effort cleanup of abandoned Office TOTP enrollments. Supabase may
    // retain an unverified factor even when the browser's factor list omits it.
    // A unique friendly name prevents that stale factor from blocking a new QR.
    const { data: listed, error: listError } = await client.auth.mfa.listFactors();
    if (!listError) {
      const factors = Array.isArray(listed?.all)
        ? listed.all
        : [...(Array.isArray(listed?.totp) ? listed.totp : []),
           ...(Array.isArray(listed?.phone) ? listed.phone : [])];
      const pendingOfficeFactors = factors.filter(f =>
        f?.factor_type === "totp" &&
        f?.status !== "verified" &&
        typeof f?.friendly_name === "string" &&
        f.friendly_name.startsWith("StudentHubHelp Office")
      );
      for (const pending of pendingOfficeFactors) {
        if (!isUuid(pending?.id)) continue;
        const { error: removeError } = await client.auth.mfa.unenroll({ factorId: pending.id });
        // Continue with a new unique label if Supabase refuses to remove a stale factor.
        if (removeError) console.warn("Could not clean an abandoned Office MFA factor:", removeError.message);
      }
    } else {
      console.warn("Could not inspect existing MFA factors before enrollment:", listError.message);
    }

    const friendlyName = "StudentHubHelp Office " + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const { data, error } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName
    });
    if (error) throw error;
    // Supabase returns the factor ID at data.id and the TOTP payload at data.totp.
    if (!isUuid(data?.id) || !data?.totp?.qr_code || !data?.totp?.secret) {
      throw new Error("Authenticator setup response was incomplete. Please retry sign-in.");
    }
    currentFactorId = data.id;
    const totp = data.totp;
    $("mfa-title").textContent = "Set up your authenticator";
    $("mfa-copy").textContent = "Scan this QR code in Google Authenticator, Microsoft Authenticator or another TOTP app. Then enter its 6-digit code.";
    $("qr-image").src = totp.qr_code;
    $("secret-text").textContent = "Manual setup key: " + totp.secret;
    $("qr-wrap").hidden = false;
    $("mfa-panel").hidden = false;
    $("totp-code").focus();
  }

  async function challengeExistingFactor(factor) {
    if (!isUuid(factor?.id)) throw new Error("Your authenticator factor ID is invalid. Please contact support before changing MFA settings.");
    currentFactorId = factor.id;
    $("mfa-title").textContent = "Verify your identity";
    $("mfa-copy").textContent = "Enter the current 6-digit code from your authenticator app.";
    $("qr-wrap").hidden = true;
    $("mfa-panel").hidden = false;
    $("totp-code").focus();
  }

  $("login-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button=$("login-btn"); button.disabled=true; status("Checking your secure sign-in…");
    try {
      const { data, error } = await client.auth.signInWithPassword({ email:$("email").value.trim(), password:$("password").value });
      if (error) throw error;
      const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
      if (factorError) throw factorError;
      // Supabase may return null data when no factor list is available.
      // Normalize it before reading TOTP factors; never assume factors is non-null.
      const totpFactors = Array.isArray(factors?.totp) ? factors.totp : [];
      const verified = totpFactors.filter(f => f.status === "verified");
      if (verified.length) {
        await challengeExistingFactor(verified[0]);
      } else {
        // Remove abandoned, unverified enrollments so repeated login attempts do not
        // accumulate unusable TOTP factors. A fresh QR is issued for this session.
        for (const pending of totpFactors.filter(f => f.status !== "verified")) {
          if (!isUuid(pending?.id)) continue;
          const { error: removeError } = await client.auth.mfa.unenroll({ factorId: pending.id });
          if (removeError) throw removeError;
        }
        await startMfa();
      }
      status("Password accepted. Complete authenticator verification to continue.", true);
      $("login-form").hidden=true;
    } catch (error) {
      status(error.message || "Sign-in could not be completed.");
    } finally { button.disabled=false; }
  });

  $("mfa-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button=$("mfa-form").querySelector("button"); button.disabled=true; status("Verifying authenticator code…");
    try {
      const code=$("totp-code").value.trim();
      if (!isUuid(currentFactorId)) throw new Error("Authenticator factor ID is missing or invalid. Please sign in again.");
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId:currentFactorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await client.auth.mfa.verify({ factorId:currentFactorId, challengeId:challenge.id, code });
      if (verifyError) throw verifyError;
      const { data: { session } } = await client.auth.getSession();
      const response=await fetch(OFFICE_AUTH_FUNCTION,{method:"POST",headers:{"Authorization":"Bearer "+session.access_token,"apikey":SUPABASE_KEY,"Content-Type":"application/json"},body:"{}"});
      const result=await response.json().catch(()=>({}));
      if (!response.ok || result.ok !== true) throw new Error(result.code==="owner_access_denied"?"This account is not authorized for Office access.":"Owner access verification failed. Please contact support.");
      location.replace("./");
    } catch(error) { status(error.message || "Verification failed. Check the code and try again."); }
    finally { button.disabled=false; }
  });

  verifyOwnerSession().then(ok=>{if(ok) location.replace("./");});
})();