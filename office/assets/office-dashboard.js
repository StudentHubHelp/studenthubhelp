(() => {
  const SUPABASE_URL = "https://idurlccrarznnnqixxsd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_JIRAAdzm97xMNN1jIS_idg_oHEObFhT";
  const CONTROL_API = SUPABASE_URL + "/functions/v1/office-control-api";
  const GM_API = SUPABASE_URL + "/functions/v1/office-general-manager";
  const EMPLOYEE_API = SUPABASE_URL + "/functions/v1/office-employee-agent";
  const INTEGRATION_API = SUPABASE_URL + "/functions/v1/office-integration-hub";
  const APPROVAL_API = SUPABASE_URL + "/functions/v1/office-approval-center";
  const REPORT_API = SUPABASE_URL + "/functions/v1/office-report-center";
  const QUOTA_API = SUPABASE_URL + "/functions/v1/office-gemini-gateway";
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const $ = id => document.getElementById(id);
  const employeeDraftRequests = new Set();
  const planExecutionRequests = new Set();
  let showingArchivedTasks = false;
  const status = (message, ok = false) => {
    $("dashboard-status").textContent = message;
    $("dashboard-status").className = "status" + (ok ? " success" : "");
  };
  const node = (tag, className, value) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (value !== undefined && value !== null) item.textContent = String(value);
    return item;
  };
  const dateText = value => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };
  const titleCase = value => String(value || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  async function api(action, payload = {}) {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("Your session has expired. Please sign in again.");
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") throw new Error("Two-step verification is required. Please sign in again.");

    const response = await fetch(CONTROL_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      const messages = {
        owner_access_denied: "This account is not authorized for Office access.",
        gm_plan_unavailable: "The General Manager plan could not be loaded.",
        gm_plan_not_safe_to_run: "This plan contains an external action or failed the draft-only safety checks.",
        employee_step_failed: "An employee workflow stopped before all drafts were generated.",
        invalid_input: "Please check the task details and try again.",
        task_transition_not_allowed: "This task can no longer be changed from its current status.",
        task_archive_blocked: "Running or approval-waiting tasks cannot be archived. Pause or finish them first.",
        authentication_required: "Please sign in again.",
        mfa_required: "Two-step verification is required. Please sign in again."
      };
      if (response.status === 401 || response.status === 428) {
        await client.auth.signOut();
        location.replace("./login.html");
      }
      throw new Error(messages[result.code] || "Office request failed. Please refresh and try again.");
    }
    return result.data || {};
  }

  async function gmApi(action, payload = {}) {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("Your session has expired. Please sign in again.");
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") throw new Error("Two-step verification is required. Please sign in again.");
    const response = await fetch(GM_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      const messages = {
        gemini_gateway_disabled: "Gemini is safely disabled until its Free Tier key and quota limits are configured.",
        gemini_secret_not_configured: "Gemini API key is not configured in Supabase Edge Function Secrets yet.",
        free_tier_confirmation_required: "Free Tier project confirmation is still pending.",
        free_tier_caps_not_configured: "Project-specific Gemini RPM, TPM and daily caps are not configured yet.",
        task_must_be_queued: "Only queued tasks can be planned by the General Manager.",
        gm_plan_validation_failed: "The proposed plan did not pass safety validation. No plan was saved.",
        owner_access_denied: "This account is not authorized for Office access.",
        gm_plan_unavailable: "The General Manager plan could not be loaded.",
        gm_plan_not_safe_to_run: "This plan contains an external action or failed the draft-only safety checks."
      };
      if (response.status === 401 || response.status === 428) {
        await client.auth.signOut();
        location.replace("./login.html");
      }
      if (result.code === "employee_step_failed") {
        const completed = Array.isArray(result.data?.completed_steps) ? result.data.completed_steps.length : 0;
        const failed = result.data?.failed_step?.role_key ? titleCase(result.data.failed_step.role_key) : "an employee";
        throw new Error("Workflow stopped at " + failed + ". " + completed + " employee draft(s) were saved; refresh to review them and retry the remaining step.");
      }
      throw new Error(messages[result.code] || "General Manager request failed. Please try again later.");
    }
    return result.data || {};
  }

  async function employeeApi(action, payload = {}) {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("Your session has expired. Please sign in again.");
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") throw new Error("Two-step verification is required. Please sign in again.");
    const response = await fetch(EMPLOYEE_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      const messages = {
        gemini_gateway_disabled: "Gemini is safely disabled until its Free Tier key and quota limits are configured.",
        gemini_secret_not_configured: "Gemini API key is not configured in Supabase Edge Function Secrets yet.",
        free_tier_confirmation_required: "Free Tier project confirmation is still pending.",
        free_tier_caps_not_configured: "Project-specific Gemini RPM, TPM and daily caps are not configured yet.",
        daily_quota_guard_reached: "Today's Gemini Free Tier safety cap has been reached. No new Gemini request was sent; saved DCE research is safe. Retry after the AI Office daily reset, or adjust the cap only after confirming the active limit in Google AI Studio.",
        minute_request_cap_reached: "The Gemini per-minute request safety cap has been reached. Wait briefly before retrying; no paid request was made.",
        minute_token_cap_reached: "The Gemini per-minute token safety cap has been reached. Wait briefly before retrying; saved research remains safe.",
        gemini_fallback_quota_guard_blocked: "The Free Tier fallback was blocked by the quota safety guard. No paid model was used; saved research remains safe.",
        quota_guard_disabled: "The Gemini quota guard is currently disabled.",
        paid_billing_mode_forbidden: "Only the Free Tier billing mode is permitted.",
        gm_plan_required: "The General Manager must create a draft plan before an employee can prepare work.",
        role_step_mismatch: "This employee role is not assigned to the selected General Manager step.",
        task_must_be_queued: "Only queued tasks can receive employee drafts.",
        employee_draft_validation_failed: "The employee draft did not pass safety validation. Nothing was saved.",
        employee_prompt_too_large: "The research context was too long for the AI request. The evidence remains saved; please retry.",
        prompt_must_be_1_to_6000_characters: "The employee request exceeded the Gemini prompt limit. The saved research evidence is safe; please retry.",
        qc_waiting_for_fresh_dce: "QC is waiting for a fresh DCE draft. Complete DCE first, then run QC.",
        employee_role_unavailable: "This employee role is paused or disabled."
      };
      if (response.status === 401 || response.status === 428) {
        await client.auth.signOut();
        location.replace("./login.html");
      }
      const providerCode = String(result.code || "");
      if (providerCode === "employee_step_failed") {
        const completed = Array.isArray(result.data?.completed_steps) ? result.data.completed_steps.length : 0;
        const failed = result.data?.failed_step?.role_key ? titleCase(result.data.failed_step.role_key) : "an employee";
        throw new Error("Workflow stopped at " + failed + ". " + completed + " employee draft(s) were saved; refresh to review them and retry the remaining step.");
      }
      const providerFailure = /^gemini_provider_http_\\d+_/.test(providerCode) || providerCode === "gemini_provider_unavailable";
      const providerRateLimited = /_429_/.test(providerCode);
      throw new Error(providerFailure
        ? (providerRateLimited
          ? "Gemini Free Tier rate limit was reached. Research evidence is saved; wait for the rate window to reset before retrying."
          : "Gemini Free Tier is temporarily unavailable after bounded retries (502/503). Research evidence is saved; wait briefly and retry. No paid model was used.")
        : messages[result.code] || "Employee request failed. Please try again later.");
    }
    return result.data || {};
  }

  async function integrationApi(action, payload = {}) {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("Your session has expired. Please sign in again.");
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") throw new Error("Two-step verification is required. Please sign in again.");
    const response = await fetch(INTEGRATION_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      if (response.status === 401 || response.status === 428) {
        await client.auth.signOut();
        location.replace("./login.html");
      }
      throw new Error("Unable to load the secure integration registry.");
    }
    return result.data || {};
  }

  async function quotaApi() {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("Your session has expired. Please sign in again.");
    const response = await fetch(QUOTA_API, {
      method: "POST",
      headers: { Authorization: "Bearer " + session.access_token, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status" })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) throw new Error("Unable to load Gemini quota status.");
    return result.data || {};
  }

  async function reportApi() {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("Your session has expired. Please sign in again.");
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") throw new Error("Two-step verification is required. Please sign in again.");
    const response = await fetch(REPORT_API, {
      method: "POST",
      headers: { Authorization: "Bearer " + session.access_token, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "overview" })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) throw new Error("Unable to load Office reports.");
    return result.data || {};
  }

  function renderQuota(data = {}) {
    const ready = data.ready === true && data.api_key_configured === true;
    $("quota-status-pill").textContent = ready ? "Ready · Free Tier" : "Locked safely";
    $("quota-status-pill").className = "pill " + (ready ? "quota-ready" : "quota-locked");
    const panel = $("quota-panel");
    panel.replaceChildren();
    const details = node("div", "quota-details");
    const model = node("div", "quota-model");
    model.append(node("strong", "", data.model || "Gemini model not selected"));
    model.append(node("small", "", "Billing mode: " + titleCase(data.billing_mode || "unknown")));
    details.append(model);
    const rows = [
      ["Gateway", data.gateway_enabled ? "Enabled" : "Disabled"],
      ["Quota guard", data.quota_guard_enabled ? "Enabled" : "Disabled"],
      ["Free Tier confirmation", data.free_tier_confirmed ? "Confirmed" : "Pending"],
      ["API key", data.api_key_configured ? "Present · validation pending" : "Missing"],
      ["Daily requests", (data.daily_used ?? 0) + " / " + (data.daily_app_cap ?? "Not configured")],
      ["Requests per minute", (data.rpm_used ?? 0) + " / " + (data.rpm_app_cap ?? "Not configured")],
      ["Tokens per minute reserved", (data.tpm_reserved ?? 0) + " / " + (data.tpm_app_cap ?? "Not configured")],
      ["Max output tokens", data.max_output_tokens ?? "Not configured"]
    ];
    rows.forEach(([label,value]) => {
      const row = node("div", "quota-row");
      row.append(node("span", "", label), node("strong", "", value));
      details.append(row);
    });
    panel.append(details);
    panel.append(node("p", "quota-safety-note", ready
      ? "Quota controls are configured. No employee worker is automatically running."
      : "Gemini requests are blocked until the server-side secret, Owner Free Tier confirmation and conservative project-specific RPM/TPM/RPD caps are all configured. No API request is sent while locked."));
  }

  function renderReport(data = {}) {
    const usage = data.usage_7d || {};
    const number = value => Number(value || 0).toLocaleString("en-IN");
    $("report-requests").textContent = number(usage.requests);
    $("report-input-tokens").textContent = number(usage.input_tokens);
    $("report-output-tokens").textContent = number(usage.output_tokens);
    $("report-estimated-cost").textContent = "$" + Number(usage.estimated_cost || 0).toFixed(4);

    const daily = data.daily_usage_7d || [];
    const maxRequests = Math.max(1, ...daily.map(item => Number(item.requests || 0)));
    const chart = $("daily-usage-chart");
    chart.replaceChildren();
    daily.forEach(item => {
      const row = node("div", "daily-bar-row");
      row.append(node("span", "daily-bar-label", item.day));
      const track = node("div", "daily-bar-track");
      const bar = node("div", "daily-bar-fill");
      bar.style.width = (Number(item.requests || 0) / maxRequests * 100) + "%";
      track.append(bar);
      row.append(track, node("strong", "daily-bar-value", number(item.requests)));
      chart.append(row);
    });
    if (!daily.length) chart.append(node("div", "empty-state", "No AI requests recorded in this period."));

    const renderRows = (targetId, rows, labelKey, valueKey) => {
      const target = $(targetId);
      target.replaceChildren();
      if (!rows?.length) {
        target.append(node("div", "report-empty", "No records yet."));
        return;
      }
      rows.forEach(item => {
        const row = node("div", "report-row");
        row.append(node("span", "", titleCase(item[labelKey])));
        row.append(node("strong", "", number(item[valueKey])));
        target.append(row);
      });
    };
    renderRows("employee-status-report", data.employee_status || [], "status", "count");
    renderRows("task-status-report", Object.entries(data.task_counts || {}).map(([status,count])=>({status,count})), "status", "count");

    const providers = $("provider-usage-report");
    providers.replaceChildren();
    if (!(data.provider_usage_7d || []).length) providers.append(node("div", "report-empty", "No AI provider usage recorded."));
    (data.provider_usage_7d || []).forEach(item => {
      const row = node("div", "report-row provider-report-row");
      const left = node("div", "");
      left.append(node("strong", "", item.provider + " · " + item.model));
      left.append(node("small", "", number(item.input_tokens) + " input · " + number(item.output_tokens) + " output tokens"));
      row.append(left,node("strong", "", number(item.requests) + " req"));
      providers.append(row);
    });

    const activity = $("recent-activity-report");
    activity.replaceChildren();
    if (!(data.recent_activity || []).length) activity.append(node("div", "report-empty", "No recent activity recorded."));
    (data.recent_activity || []).forEach(item => {
      const row = node("div", "activity-report-row");
      row.append(node("strong", "", item.message || titleCase(item.event_type)));
      row.append(node("small", "", (item.task_key || "") + " · " + dateText(item.created_at)));
      activity.append(row);
    });
  }

  async function approvalApi(action, payload = {}) {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("Your session has expired. Please sign in again.");
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") throw new Error("Two-step verification is required. Please sign in again.");
    const response = await fetch(APPROVAL_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      const messages = {
        rejection_note_required: "Add a short reason before rejecting this proposal.",
        approval_already_reviewed: "This approval has already been reviewed.",
        approval_expired: "This approval request has expired."
      };
      if (response.status === 401 || response.status === 428) {
        await client.auth.signOut();
        location.replace("./login.html");
      }
      throw new Error(messages[result.code] || "Approval request failed. Please refresh and try again.");
    }
    return result.data || {};
  }

  function renderApprovals(data = {}) {
    const list = $("approval-list");
    list.replaceChildren();
    const approvals = data.approvals || [];
    const pending = data.pending_count ?? approvals.filter(item => item.status === "pending").length;
    $("approval-count-pill").textContent = pending + " pending";
    if (!approvals.length) {
      list.append(node("div", "empty-state", "No approval requests in this view."));
      return;
    }
    approvals.forEach(approval => {
      const card = node("article", "approval-card");
      const top = node("div", "approval-card-top");
      const heading = node("div", "approval-card-heading");
      heading.append(node("strong", "", approval.action_summary));
      heading.append(node("small", "", approval.task_key + " · " + approval.task_title));
      top.append(heading, node("span", "approval-state approval-" + approval.status, titleCase(approval.status)));
      card.append(top);
      const meta = node("div", "approval-meta");
      meta.append(node("span", "", approval.action_type));
      meta.append(node("span", "", "Requested " + dateText(approval.requested_at)));
      if (approval.expires_at) meta.append(node("span", "", "Expires " + dateText(approval.expires_at)));
      card.append(meta);
      const payload = node("pre", "approval-payload", JSON.stringify(approval.proposed_payload || {}, null, 2));
      card.append(payload);
      if (approval.status === "pending") {
        const note = node("textarea", "approval-note-input");
        note.rows = 2;
        note.maxLength = 1000;
        note.placeholder = "Owner review note (required when rejecting)…";
        card.append(note);
        const actions = node("div", "approval-actions");
        addAction(actions, "Approve proposal", "small-action approval-approve", button =>
          reviewApproval(approval, "approved", note.value, button));
        addAction(actions, "Reject", "small-action approval-reject", button =>
          reviewApproval(approval, "rejected", note.value, button));
        card.append(actions);
      } else if (approval.status === "approved") {
        card.append(node("p", "approval-outcome", "Owner approved this proposal. No external action has been executed; Phase 10 execution remains separate."));
        if (approval.review_note) card.append(node("small", "approval-review-note", "Review note: " + approval.review_note));
      } else {
        if (approval.review_note) card.append(node("small", "approval-review-note", "Review note: " + approval.review_note));
      }
      list.append(card);
    });
  }

  async function reviewApproval(approval, decision, note, button) {
    if (decision === "rejected" && !String(note || "").trim()) {
      status("Add a short reason before rejecting this proposal.");
      return;
    }
    const prompt = decision === "approved"
      ? "Record Owner approval for this proposal? This will NOT execute the action."
      : "Reject this proposal? No external action will be executed.";
    if (!window.confirm(prompt)) return;
    button.disabled = true;
    try {
      const result = await approvalApi("review", {
        approval_id: approval.id, decision, review_note: note
      });
      status(result.message || "Owner decision recorded. No external action was executed.", true);
      await loadWorkspace();
    } catch (error) {
      status(error.message);
      button.disabled = false;
    }
  }

  async function loadApprovals() {
    try {
      const result = await approvalApi("list", { status: $("approval-filter").value });
      renderApprovals(result);
    } catch (error) { status(error.message); }
  }

  function renderIntegrations(data = {}) {
    const grid = $("integration-grid");
    grid.replaceChildren();
    const integrations = data.integrations || [];
    const actions = data.actions || [];
    $("integration-pending-pill").textContent = (data.pending_approvals ?? 0) + " pending approvals";
    if (!integrations.length) {
      grid.append(node("div", "empty-state", "No integrations are registered."));
      return;
    }
    const actionLabels = {
      read_office_metrics: "Read Office metrics",
      read_listing_aggregates: "Read listing aggregates",
      create_patch_proposal: "Create patch proposal",
      create_pull_request: "Create pull request",
      create_preview_deployment: "Preview deployment",
      deploy_production: "Production deployment",
      create_email_draft: "Email draft",
      send_email_campaign: "Send email campaign",
      create_post_draft: "Instagram post draft",
      publish_post: "Publish Instagram post",
      keyword_research: "Keyword research",
      site_audit: "SEO site audit",
      publish_metadata: "Publish metadata"
    };
    integrations.forEach(integration => {
      const card = node("article", "integration-card");
      const top = node("div", "integration-card-top");
      const heading = node("h3", "", integration.display_name);
      let stateClass = integration.connection_status;
      let stateLabel = titleCase(integration.connection_status).replace(/_/g, " ");
      if (integration.provider_key === "tavily") {
        if (!integration.secret_configured) {
          stateClass = "needs_secret";
          stateLabel = "Credential missing";
        } else if (integration.credential_status === "invalid") {
          stateClass = "needs_secret";
          stateLabel = "Invalid API key";
        } else if (integration.credential_status === "unavailable") {
          stateClass = "needs_secret";
          stateLabel = "Validation unavailable";
        } else if (integration.credential_valid && integration.free_plan_allowed) {
          stateClass = "connected";
          stateLabel = "Connected · Free plan";
        } else if (integration.credential_valid) {
          stateClass = "disabled";
          stateLabel = "Paid plan blocked";
        }
      }
      const state = node("span", "integration-state integration-" + stateClass, stateLabel);
      top.append(heading, state);
      card.append(top);
      card.append(node("p", "integration-note", integration.notes || ""));
      const meta = node("div", "integration-meta");
      meta.append(node("span", "", "Mode: " + titleCase(integration.access_mode)));
      if (integration.secret_reference) {
        meta.append(node("span", "", "Secret reference: " + integration.secret_reference));
        if (integration.provider_key === "tavily") {
          const credentialText = !integration.secret_configured ? "Credential missing"
            : integration.credential_status === "invalid" ? "API key invalid"
            : integration.credential_status === "unavailable" ? "Credential check unavailable"
            : integration.free_plan_allowed ? "API key valid · Free plan verified"
            : integration.credential_valid ? "API key valid · paid plan blocked" : "Credential check pending";
          meta.append(node("span", integration.free_plan_allowed ? "credential-present" : "credential-missing", credentialText));
          if (integration.provider_plan) meta.append(node("span", "", "Tavily plan: " + integration.provider_plan));
          if (integration.provider_key_limit) meta.append(node("span", "", "Tavily usage: " + Number(integration.provider_key_usage || 0) + " / " + Number(integration.provider_key_limit) + " credits"));
        } else {
          meta.append(node("span", integration.secret_configured ? "credential-present" : "credential-missing",
            integration.secret_configured ? "Credential present · validation pending" : "Credential missing"));
        }
      } else {
        meta.append(node("span", "credential-present", "Server-managed connection"));
      }
      card.append(meta);
      const scopes = node("div", "integration-scopes");
      (integration.allowed_scopes || []).forEach(scope => scopes.append(node("span", "integration-scope", titleCase(scope))));
      card.append(scopes);
      const providerActions = actions.filter(action => action.provider_key === integration.provider_key);
      if (providerActions.length) {
        const list = node("div", "integration-action-list");
        providerActions.forEach(action => {
          const line = node("div", "integration-action-row");
          line.append(node("span", "integration-action-name", actionLabels[action.action_key] || titleCase(action.action_key)));
          const mode = action.requires_approval ? "Owner approval" : titleCase(action.execution_mode);
          const stateText = action.execution_enabled ? "Enabled" : action.proposal_enabled ? mode + " · proposal only" : mode + " · not enabled";
          line.append(node("small", "integration-action-state", stateText));
          list.append(line);
        });
        card.append(list);
      }
      grid.append(card);
    });
  }

  function renderMetrics(counts = {}) {
    $("metric-total").textContent = counts.total ?? 0;
    $("metric-queued").textContent = counts.queued ?? 0;
    $("metric-running").textContent = counts.running ?? 0;
    $("metric-completed").textContent = counts.completed ?? 0;
    $("metric-waiting-approval").textContent = counts.waiting_approval ?? 0;
    $("metric-failed").textContent = counts.failed ?? 0;
  }

  function addAction(parent, label, className, handler) {
    const button = node("button", className, label);
    button.type = "button";
    button.addEventListener("click", () => handler(button));
    parent.append(button);
    return button;
  }

  function renderCurrentTask(task) {
    const target = $("current-task-card");
    target.replaceChildren();
    if (!task) { target.append(node("div", "empty-state", "No current task. Create a task from Tasks & Delegation to get started.")); return; }
    const card = node("article", "current-task-inner");
    const top = node("div", "task-card-top");
    top.append(node("span", "task-key", task.task_key), node("span", "task-status status-" + task.status, titleCase(task.status)));
    card.append(top, node("h3", "", task.title), node("p", "task-description", task.description || "No additional description provided."));
    const meta = node("div", "task-meta");
    meta.append(node("span", "", titleCase(task.priority) + " priority"), node("span", "", "Updated " + dateText(task.updated_at || task.created_at)));
    card.append(meta);
    addAction(card, "Open task workspace", "small-action gm-action", () => location.hash = "tasks");
    target.append(card);
  }

  function renderTasks(tasks = [], plans = [], employeeItems = []) {
    const planMap = new Map((plans || []).map(item => [item.task_id, item.plan]));
    const draftMap = new Map((employeeItems || []).map(item => [item.task_id, item.drafts || []]));
    const researchEvidenceMap = new Map((employeeItems || []).map(item => [item.task_id, item.research_evidence || null]));
    const list = $("task-list");
    list.replaceChildren();
    $("task-total-pill").textContent = tasks.length + (tasks.length === 1 ? " task" : " tasks");
    $("active-tasks-tab").classList.toggle("active", !showingArchivedTasks);
    $("archived-tasks-tab").classList.toggle("active", showingArchivedTasks);
    $("active-tasks-tab").setAttribute("aria-pressed", String(!showingArchivedTasks));
    $("archived-tasks-tab").setAttribute("aria-pressed", String(showingArchivedTasks));
    if (!tasks.length) {
      list.append(node("div", "empty-state", "No tasks yet. Create your first task to start building the work queue."));
      return;
    }
    tasks.forEach(task => {
      const card = node("article", "task-card");
      const top = node("div", "task-card-top");
      const key = node("span", "task-key", task.task_key);
      const state = node("span", "task-status status-" + task.status, titleCase(task.status));
      top.append(key, state);
      const heading = node("h4", "", task.title);
      const description = node("p", "task-description", task.description || "No additional description provided.");
      const meta = node("div", "task-meta");
      meta.append(node("span", "priority priority-" + task.priority, titleCase(task.priority) + " priority"));
      meta.append(node("span", "", "Created " + dateText(task.created_at)));
      const actions = node("div", "task-actions");
      const gmPlan = planMap.get(task.id);
      if (gmPlan) {
        const savedDrafts = draftMap.get(task.id) || [];
        const requiredSteps = Array.isArray(gmPlan.steps) ? gmPlan.steps.length : 0;
        const qcDraft = savedDrafts.find(item => item.role_key === "quality_control_manager");
        const qcText = String(qcDraft?.draft_content || "");
        const qcState = /QC verdict:\s*PASS WITH LIMITATIONS/i.test(qcText) ? "QC PASS WITH LIMITATIONS"
          : /QC verdict:\s*PASS/i.test(qcText) ? "QC PASS"
          : qcDraft ? "QC review pending/failed" : "QC pending";
        meta.append(node("span", "", "Employee drafts " + savedDrafts.length + "/" + requiredSteps + " · " + qcState));
      }
      if (task.status === "queued" && !gmPlan) {
        addAction(actions, "Plan with GM", "small-action gm-action", button => createGmPlan(task, button));
      } else if (task.status === "queued" && gmPlan) {
        const runButton = addAction(actions, "Generate all employee drafts", "small-action gm-action",
          button => runEmployeePlan(task, button));
        if (planExecutionRequests.has(task.id)) {
          runButton.disabled = true;
          runButton.textContent = "Running employee drafts…";
        }
      }
      if (task.archived_at) {
        addAction(actions, "Restore", "small-action gm-action", button => archiveTask(task, "restore_task", button));
      } else if (task.status === "queued" || task.status === "draft") {
        addAction(actions, "Pause", "small-action", () => changeTaskStatus(task.id, "paused"));
        addAction(actions, "Cancel", "small-action danger-action", () => changeTaskStatus(task.id, "cancelled"));
      } else if (task.status === "paused") {
        addAction(actions, "Resume", "small-action", () => changeTaskStatus(task.id, "queued"));
        addAction(actions, "Cancel", "small-action danger-action", () => changeTaskStatus(task.id, "cancelled"));
      }
      if (!task.archived_at && !["running", "waiting_approval"].includes(task.status)) {
        addAction(actions, "Delete", "small-action danger-action", button => archiveTask(task, "archive_task", button));
      }
      addAction(actions, "Activity", "small-action subtle-action", () => loadTaskLogs(task));
      card.append(top, heading, description, meta, actions);
      if (gmPlan) {
        const planBox = node("div", "gm-plan-box");
        const planTop = node("div", "gm-plan-top");
        planTop.append(node("strong", "gm-plan-heading", "General Manager · Draft plan"));
        planTop.append(node("span", "gm-risk risk-" + gmPlan.risk_level, titleCase(gmPlan.risk_level) + " risk"));
        planBox.append(planTop);
        planBox.append(node("p", "gm-plan-summary", gmPlan.summary));
        const steps = node("ol", "gm-plan-steps");
        const taskDrafts = draftMap.get(task.id) || [];
        const dceDraftForTask = taskDrafts.find(item => item.role_key === "data_collection_executive");
        const dceEvidenceForTask = researchEvidenceMap.get(task.id);
        const dceDraftTime = Date.parse(String(dceDraftForTask?.created_at || ""));
        const dceEvidenceTime = Date.parse(String(dceEvidenceForTask?.saved_at || ""));
        const dceDraftIsFresh = Boolean(dceDraftForTask) && dceEvidenceForTask?.status === "completed" &&
          Number.isFinite(dceDraftTime) && Number.isFinite(dceEvidenceTime) && dceDraftTime >= dceEvidenceTime &&
          Array.isArray(dceEvidenceForTask?.sources) && dceEvidenceForTask.sources.some(source => {
            try { return new URL(String(source.url || "")).protocol === "https:"; } catch { return false; }
          });
        const dceRequestKey = task.id + ":data_collection_executive:0";
        const requiresDceResearch = /research|public web|citation|official website|source collection|student support services/i.test(String(task.title || "") + " " + String(task.description || ""));
        (gmPlan.steps || []).forEach((step, stepIndex) => {
          const li = node("li", "gm-step-item");
          li.append(node("span", "gm-step-title", step.title + " · " + titleCase(step.role_key)));
          const draft = taskDrafts.find(item => item.role_key === step.role_key && item.step_index === stepIndex);
          if (draft) {
            const draftCard = node("div", "employee-draft-card");
            draftCard.append(node("strong", "employee-draft-title", draft.title));
            draftCard.append(node("p", "employee-draft-summary", draft.summary));
            const modeLabel = draft.generation_mode === "gemini_free_tier" ? "AI reasoning · Gemini Free Tier" : draft.generation_reason === "deterministic_evidence_contract_preserved" ? "Deterministic · evidence-critical workflow" : "Deterministic fallback · Gemini not ready";
            draftCard.append(node("small", "gm-approval-note", modeLabel));
            draftCard.append(node("div", "employee-draft-content", draft.draft_content));
            const checks = node("ul", "employee-draft-checks");
            (draft.checks || []).forEach(check => checks.append(node("li", "", check)));
            draftCard.append(checks);
            draftCard.append(node("small", "gm-approval-note", "Draft only · Owner approval required · Not executed"));
            li.append(draftCard);
          }
          if (task.status === "queued") {
            const requestKey = task.id + ":" + step.role_key + ":" + stepIndex;
            const employeeButton = addAction(li, draft ? "Regenerate employee draft" : "Generate employee draft",
              "small-action employee-action", button =>
                createEmployeeDraft(task, step.role_key, stepIndex, button, requestKey));
            if (employeeDraftRequests.has(requestKey)) {
              employeeButton.disabled = true;
              employeeButton.textContent = "Generating…";
            }
            if (step.role_key === "quality_control_manager" && requiresDceResearch &&
                (!dceDraftIsFresh || employeeDraftRequests.has(dceRequestKey))) {
              employeeButton.disabled = true;
              employeeButton.textContent = "Waiting for fresh DCE research";
              employeeButton.title = "Run DCE research successfully first. QC is blocked until its fresh draft and evidence are saved.";
            }
          }
          steps.append(li);
        });
        planBox.append(steps);
        const completedDrafts = (gmPlan.steps || []).map((step, stepIndex) =>
          taskDrafts.find(item => item.role_key === step.role_key && item.step_index === stepIndex)
        );
        const qcDraft = completedDrafts.find((draft, index) => (gmPlan.steps || [])[index]?.role_key === "quality_control_manager");
        const isDailyActivity = /daily|today|aaj|आज|website activity/i.test(String(task.title || "") + " " + String(task.description || ""));
        const qcText = String(qcDraft?.draft_content || "");
        const qcVerdict = isDailyActivity && /(?:^|\n)## QC verdict: PASS WITH LIMITATIONS[ \t]*(?:\r?\n|$)/i.test(qcText)
          ? "PASS WITH LIMITATIONS"
          : /(?:^|\n)(?:## )?QC verdict:[ \t]*PASS[ \t]*(?:\r?\n|$)/i.test(qcText) ? "PASS" : "FAIL_OR_INCONCLUSIVE";
        const qcPassed = qcVerdict === "PASS" || (isDailyActivity && qcVerdict === "PASS WITH LIMITATIONS");
        if (completedDrafts.length > 0 && completedDrafts.every(Boolean)) {
          const finalReport = node("div", "gm-final-report");
          finalReport.append(node("strong", "gm-final-report-title", qcPassed
            ? "General Manager · Final task report (QC " + qcVerdict + ")"
            : "Employee drafts generated · Task NOT complete"));
          finalReport.append(node("p", "", completedDrafts.length + "/" + (gmPlan.steps || []).length +
            " employee drafts generated. " + (qcPassed
              ? (qcVerdict === "PASS WITH LIMITATIONS" ? "QC passed with limitations; Owner review is still required." : "QC passed; Owner review is still required.")
              : "QC PASS is missing. Draft generation is not task completion.")));
          const analystDraft = completedDrafts.find((draft, index) =>
            (gmPlan.steps || [])[index]?.role_key === "data_analyst_reporting_manager");
          if (qcPassed && analystDraft) {
            finalReport.append(node("strong", "gm-owner-answer-title", isDailyActivity ? "आज की आसान वेबसाइट रिपोर्ट" : "Owner business answer"));
            finalReport.append(node("p", "gm-owner-answer", analystDraft.summary || analystDraft.title || "Verified report is available."));
          }
          completedDrafts.forEach((draft, index) => {
            const role = (gmPlan.steps || [])[index]?.role_key || "employee";
            if (qcPassed && role === "data_analyst_reporting_manager") return;
            finalReport.append(node("p", "", titleCase(role) + ": " + (draft.summary || draft.title || "Draft saved.")));
          });
          if (qcDraft) finalReport.append(node("small", "gm-approval-note", "QC review: " + (qcDraft.summary || "See the QC draft above.") + " Owner approval is still required."));
          planBox.append(finalReport);
        }
        planBox.append(node("small", "gm-approval-note", "Proposal only · Owner approval required · No actions executed"));
        card.append(planBox);
      }
      list.append(card);
    });
  }

  async function createGmPlan(task, button) {
    button.disabled = true;
    button.textContent = "Planning…";
    try {
      await gmApi("plan_task", { task_id: task.id });
      status("General Manager draft plan created. Nothing has been executed.", true);
      await loadWorkspace();
    } catch (error) {
      status(error.message);
      button.disabled = false;
      button.textContent = "Plan with GM";
    }
  }


  async function runEmployeePlan(task, button) {
    if (planExecutionRequests.has(task.id)) return;
    planExecutionRequests.add(task.id);
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Running employee drafts…";
    status("General Manager is running the planned employees one by one. Drafts only; no external actions will run.");
    let finalMessage = "";
    let succeeded = false;
    try {
      const result = await gmApi("execute_plan", { task_id: task.id });
      const count = Array.isArray(result.completed_steps) ? result.completed_steps.length : 0;
      const isDailyActivity = /daily|today|aaj|आज|website activity/i.test(String(task.title || "") + " " + String(task.description || ""));
      const qcAccepted = result.task_completed === true &&
        (result.qc_status === "PASS" || (isDailyActivity && result.qc_status === "PASS WITH LIMITATIONS"));
      finalMessage = qcAccepted
        ? count + " employee draft(s) generated and " + (result.qc_status === "PASS WITH LIMITATIONS" ? "QC PASS WITH LIMITATIONS" : "QC PASS") + ". Owner review is still required; no external actions were executed."
        : count + " employee draft(s) generated, but task remains INCOMPLETE: an accepted QC verdict is required. " + (result.completion_blocked_reason || "");
      succeeded = qcAccepted;
    } catch (error) {
      finalMessage = error.message || "Employee workflow failed.";
    } finally {
      planExecutionRequests.delete(task.id);
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
    await loadWorkspace();
    status(finalMessage, succeeded);
  }

  async function createEmployeeDraft(task, roleKey, stepIndex, button, requestKey) {
    if (employeeDraftRequests.has(requestKey)) return;
    employeeDraftRequests.add(requestKey);
    const originalLabel = button.textContent;
    const isRegeneration = originalLabel === "Regenerate employee draft";
    button.disabled = true;
    button.textContent = "Preparing…";
    try {
      await employeeApi("generate_draft", {
        task_id: task.id, role_key: roleKey, step_index: stepIndex
      });
      employeeDraftRequests.delete(requestKey);
      status(titleCase(roleKey) + (isRegeneration ? " draft regenerated." : " draft created.") + " No external action was performed.", true);
      await loadWorkspace();
    } catch (error) {
      employeeDraftRequests.delete(requestKey);
      if (roleKey === "data_collection_executive") {
        await loadWorkspace();
      }
      status(error.message);
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  async function archiveTask(task, action, button) {
    const restoring = action === "restore_task";
    const prompt = restoring
      ? "Restore this task to the active task list? Its activity and employee drafts will remain intact."
      : "Move this task to Archived? This is a reversible soft-delete. Task activity, approvals and employee drafts will be retained. Running or approval-waiting tasks cannot be archived.";
    if (!window.confirm(prompt)) return;
    if (button) { button.disabled = true; button.textContent = restoring ? "Restoring…" : "Archiving…"; }
    try {
      await api(action, { task_id: task.id });
      status(restoring ? "Task restored. Its history is intact." : "Task archived. Its history and drafts were retained.", true);
      await loadWorkspace();
    } catch (error) { status(error.message); if (button) { button.disabled = false; button.textContent = restoring ? "Restore" : "Delete"; } }
  }

  async function changeTaskStatus(taskId, nextStatus) {
    try {
      await api("set_task_status", { task_id: taskId, status: nextStatus });
      status("Task status updated.", true);
      await loadWorkspace();
    } catch (error) { status(error.message); }
  }

  async function loadTaskLogs(task) {
    try {
      const result = await api("list_task_logs", { task_id: task.id });
      $("task-logs-title").textContent = "Activity · " + task.task_key;
      const target = $("task-logs-list");
      target.replaceChildren();
      if (!result.logs?.length) target.append(node("div", "empty-state", "No activity recorded yet."));
      (result.logs || []).forEach(log => {
        const item = node("div", "log-entry");
        item.append(node("strong", "", log.message || titleCase(log.event_type)));
        item.append(node("small", "", dateText(log.created_at) + " · " + titleCase(log.severity)));
        target.append(item);
      });
      $("task-logs-panel").hidden = false;
      $("task-logs-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) { status(error.message); }
  }

  function renderTeam(employees = []) {
    const grid = $("team-grid");
    grid.replaceChildren();
    employees.forEach(employee => {
      const card = node("article", "team-card" + (employee.role_key === "general_manager" ? " manager" : ""));
      const avatar = node("div", "avatar", employee.employee_code);
      const details = node("div", "");
      details.append(node("strong", "", employee.display_name));
      details.append(node("p", "", employee.job_title + " · " + employee.department));
      const state = node("span", "state", titleCase(employee.status));
      card.append(avatar, details, state);
      grid.append(card);
    });
    if (!employees.length) grid.append(node("div", "empty-state", "Team directory is unavailable."));
  }

  const protectedAutoRunTaskKeys = new Set(["SHH-AEBE4B0698", "SHH-B1C4302C14"]);
  const autoRunAttemptedTasks = new Set();

  async function autoRunSavedPlans(tasks = [], plans = [], employeeItems = []) {
    const planMap = new Map((plans || []).map(item => [item.task_id, item.plan]));
    const draftsByTask = new Map((employeeItems || []).map(item => [item.task_id, item.drafts || []]));
    const pending = (tasks || []).filter(task => {
      if (task.status !== "queued" || protectedAutoRunTaskKeys.has(task.task_key) ||
          autoRunAttemptedTasks.has(task.id) || planExecutionRequests.has(task.id)) return false;
      const plan = planMap.get(task.id);
      const steps = Array.isArray(plan?.steps) ? plan.steps : [];
      const drafts = draftsByTask.get(task.id) || [];
      return plan?.plan_status === "proposal_only" && plan?.requires_owner_approval === true &&
        steps.length > 0 && steps.every(step => step?.requires_external_action === false) &&
        drafts.length === 0;
    });
    if (!pending.length) return;
    for (const task of pending) {
      autoRunAttemptedTasks.add(task.id);
      planExecutionRequests.add(task.id);
      status("General Manager is automatically resuming the saved employee workflow for " + task.task_key + "…");
      try {
        const result = await gmApi("execute_plan", { task_id: task.id });
        const count = Array.isArray(result.completed_steps) ? result.completed_steps.length : 0;
        status(result.task_completed === true
        ? "GM generated " + count + " drafts and QC passed for " + task.task_key + ". Owner review is still required."
        : "GM generated " + count + " drafts for " + task.task_key + ", but the task remains INCOMPLETE because QC did not PASS.");
      } catch (error) {
        status("Automatic workflow for " + task.task_key + " stopped: " + (error.message || "Unknown error") + ". Saved drafts remain available for review.");
      } finally {
        planExecutionRequests.delete(task.id);
      }
    }
    await loadWorkspace();
  }

  function renderReportUnavailable() {
    ["report-requests", "report-input-tokens", "report-output-tokens", "report-estimated-cost"].forEach(id => {
      $(id).textContent = "—";
    });
    ["daily-usage-chart", "employee-status-report", "task-status-report", "provider-usage-report", "recent-activity-report"].forEach(id => {
      const target = $(id);
      target.replaceChildren(node("div", "report-empty", "Reports are temporarily unavailable. The task queue is not affected."));
    });
  }

  async function loadWorkspace() {
    $("refresh-btn").disabled = true;
    try {
      const [overview, taskResult, planResult, employeeResult, integrationResult, approvalResult, quotaResult] = await Promise.all([
        api("overview"),
        api("list_tasks", { include_archived: showingArchivedTasks }),
        gmApi("list_plans"),
        employeeApi("list_drafts"),
        integrationApi("overview"),
        approvalApi("list", { status: $("approval-filter").value }),
        quotaApi()
      ]);
      renderMetrics(overview.task_counts);
      renderCurrentTask(overview.current_task || null);
      renderTasks(taskResult.tasks || [], planResult.plans || [], employeeResult.items || []);
      renderIntegrations(integrationResult);
      renderApprovals(approvalResult);
      renderQuota(quotaResult);
      renderTeam(overview.employees || []);
      status("Secure owner session verified. Task queue is connected.", true);
      void autoRunSavedPlans(taskResult.tasks || [], planResult.plans || [], employeeResult.items || []);

      // Reports are secondary analytics. A slow or unreachable report endpoint
      // must never prevent the task queue and employee drafts from rendering.
      void reportApi().then(renderReport).catch(error => {
        renderReportUnavailable();
        console.warn("Office reports could not be loaded independently:", error);
      });
    } catch (error) {
      status(error.message || "Unable to load the Office workspace.");
      if (/session has expired|sign in again|Two-step verification/i.test(error.message)) {
        await client.auth.signOut();
        location.replace("./login.html");
      }
    } finally { $("refresh-btn").disabled = false; }
  }

  $("task-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $("create-task-btn");
    const values = new FormData(form);
    button.disabled = true;
    let createdTask = null;
    try {
      const created = await api("create_task", {
        title: String(values.get("title") || "").trim(),
        description: String(values.get("description") || "").trim(),
        priority: String(values.get("priority") || "normal")
      });
      createdTask = created.task || null;
      form.reset();
      if (!createdTask?.id) throw new Error("Task was created, but its ID could not be confirmed. Refresh the queue before retrying.");
      status("Task created. General Manager is preparing the plan automatically…");
      await gmApi("plan_task", { task_id: createdTask.id });
      status("GM plan saved. Employees are now preparing their drafts sequentially…");
      const run = await gmApi("execute_plan", { task_id: createdTask.id });
      const completed = Array.isArray(run.completed_steps) ? run.completed_steps.length : 0;
      const isDailyActivity = /daily|today|aaj|आज|website activity/i.test(String(createdTask?.title || "") + " " + String(createdTask?.description || ""));
      const qcAccepted = run.task_completed === true &&
        (run.qc_status === "PASS" || (isDailyActivity && run.qc_status === "PASS WITH LIMITATIONS"));
      await loadWorkspace();
      status(qcAccepted
        ? "GM generated " + completed + " employee draft(s) and " + (run.qc_status === "PASS WITH LIMITATIONS" ? "QC PASS WITH LIMITATIONS" : "QC PASS") + ". Owner review is still required; no external actions were executed."
        : "GM generated " + completed + " employee draft(s), but the task is NOT complete because an accepted QC verdict is missing. " + (run.completion_blocked_reason || "Review the QC draft before treating this task as complete."),
        qcAccepted);
    } catch (error) {
      if (createdTask?.id) {
        await loadWorkspace();
        status("Task " + (createdTask.task_key || "") + " was created, but the automatic GM workflow stopped: " + (error.message || "Unknown error") + ". Refresh the task card to review saved drafts and retry the remaining work.");
      } else {
        status(error.message || "Unable to create the task.");
      }
    } finally { button.disabled = false; }
  });

  function setWorkspaceView() {
    const tasksView = location.hash === "#tasks";
    $("tasks").hidden = !tasksView;
    document.querySelector(".workspace-grid").hidden = !tasksView;
    document.querySelectorAll(".nav-item").forEach(link => {
      link.classList.toggle("active", link.getAttribute("href") === (tasksView ? "#tasks" : "#overview"));
    });
  }

  window.addEventListener("hashchange", setWorkspaceView);
  setWorkspaceView();
  $("refresh-btn").addEventListener("click", loadWorkspace);
  $("active-tasks-tab").addEventListener("click", () => { showingArchivedTasks = false; loadWorkspace(); });
  $("archived-tasks-tab").addEventListener("click", () => { showingArchivedTasks = true; loadWorkspace(); });
  $("approval-filter").addEventListener("change", loadApprovals);
  $("close-logs-btn").addEventListener("click", () => { $("task-logs-panel").hidden = true; });
  $("logout-btn").addEventListener("click", async () => {
    const button = $("logout-btn");
    button.disabled = true;
    await client.auth.signOut();
    location.replace("./login.html");
  });

  loadWorkspace();
})();
