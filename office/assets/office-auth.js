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
  let isEnrollment = false;

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
    const { data: { totp }, error } = await client.auth.mfa.enroll({ factorType:"totp", friendlyName:"StudentHubHelp Office" });
    if (error) throw error;
    currentFactorId = totp.id;
    isEnrollment = true;
    $("mfa-title").textContent = "Set up your authenticator";
    $("mfa-copy").textContent = "Scan this QR code in Google Authenticator, Microsoft Authenticator or another TOTP app. Then enter its 6-digit code.";
    $("qr-image").src = totp.qr_code;
    $("secret-text").textContent = "Manual setup key: " + totp.secret;
    $("qr-wrap").hidden = false;
    $("mfa-panel").hidden = false;
    $("totp-code").focus();
  }

  async function challengeExistingFactor(factor) {
    const { data, error } = await client.auth.mfa.challenge({ factorId:factor.id });
    if (error) throw error;
    currentFactorId = factor.id;
    isEnrollment = false;
    $("mfa-title").textContent = "Verify your identity";
    $("mfa-copy").textContent = "Enter the current 6-digit code from your authenticator app.";
    $("qr-wrap").hidden = true;
    $("mfa-panel").hidden = false;
    $("totp-code").focus();
    return data.id;
  }

  $("login-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button=$("login-btn"); button.disabled=true; status("Checking your secure sign-in…");
    try {
      const { data, error } = await client.auth.signInWithPassword({ email:$("email").value.trim(), password:$("password").value });
      if (error) throw error;
      const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
      if (factorError) throw factorError;
      const verified = factors.totp.filter(f => f.status === "verified");
      if (verified.length) await challengeExistingFactor(verified[0]);
      else await startMfa();
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